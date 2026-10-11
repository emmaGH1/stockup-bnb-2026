// Read-only revalidation of one quoted trade. Never signs, never broadcasts.
// Checks: Binance-listed contract, on-chain identity, calldata (decoded independently), pool reserves and price impact,
// expiry, estimated gas, and an eth_call simulation. Usage: SERVER=http://localhost:3240 npx tsx scripts/revalidate-trade.ts
export {};
import { getAddress, parseAbi, parseEther, formatUnits, decodeFunctionData, erc20Abi } from 'viem';
import { client } from '../src/lib/bsc';
import { fetchTokenList } from '../src/lib/instruments';
import { fetchMarketData } from '../src/lib/marketdata';

const SERVER = process.env.SERVER ?? 'http://localhost:3240';
const RECIPIENT = getAddress('0x1234567890123456789012345678901234567890');
const ROUTER = getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E');
const WBNB = getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
const FACTORY = getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73');
const c = client();
const swapAbi = parseAbi(['function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[])']);
const routerAbi = parseAbi(['function getAmountsOut(uint256,address[]) view returns (uint256[])']);
const factoryAbi = parseAbi(['function getPair(address,address) view returns (address)']);
const pairAbi = parseAbi(['function getReserves() view returns (uint112,uint112,uint32)', 'function token0() view returns (address)']);

async function main() {
  const out: Record<string, unknown> = {};
  // 1. Binance listing (live public endpoint)
  const list = await fetchTokenList();
  const hit = list.find(t => t.chainId === '56' && t.ticker === 'AMZN');
  if (!hit) throw new Error('AMZN is not on the Binance BSC list');
  const token = getAddress(hit.contractAddress);
  out.binanceList = { symbol: hit.symbol, address: token, multiplier: hit.multiplier, entriesChecked: list.length };

  // 2. On-chain identity of that exact address
  const [sym, dec, supply, code] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
    c.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    c.readContract({ address: token, abi: erc20Abi, functionName: 'totalSupply' }),
    c.getCode({ address: token }),
  ]);
  out.onChain = { symbol: sym, decimals: dec, totalSupply: formatUnits(supply, dec), symbolMatchesListing: sym === hit.symbol, codeBytes: ((code?.length ?? 2) - 2) / 2 };

  // 3. The quote the local server produced (no state change)
  const r = await fetch(`${SERVER}/api/own`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ merchant: 'AMAZON.COM*2K4', spendUsd: 100, recipient: RECIPIENT }) });
  const j: any = await r.json();
  out.server = { http: r.status, outcome: j.outcome, eligible: j.eligibility?.eligible, blockedBy: j.eligibility?.blockedBy, unknown: j.eligibility?.unknown, instrumentAddress: j.instrument?.address };
  if (!j.plan?.tx) { out.note = 'no transaction released; nothing further to revalidate'; console.log(JSON.stringify(out, null, 1)); return; }

  // 4. Calldata decoded here, independently of the server
  const txTo = getAddress(j.plan.tx.to), data = j.plan.tx.data as `0x${string}`, value = BigInt(j.plan.tx.value);
  const [amountOutMin, path, to, deadline] = decodeFunctionData({ abi: swapAbi, data }).args;
  const now = Math.floor(Date.now() / 1000);
  out.calldata = { targetIsPancakeV2Router: txTo === ROUTER, chainId: j.plan.tx.chainId, function: 'swapExactETHForTokens',
    valueBNB: formatUnits(value, 18), amountOutMinTokens: formatUnits(amountOutMin, 18),
    pathIsWBNBThenListedToken: path.length === 2 && getAddress(path[0]) === WBNB && getAddress(path[1]) === token,
    recipientIsUser: getAddress(to) === RECIPIENT, selector: data.slice(0, 10), bytes: (data.length - 2) / 2 };

  // 5. Expiry
  const secondsLeft = Number(deadline) - now;
  out.expiry = { deadlineUtc: new Date(Number(deadline) * 1000).toISOString(), secondsLeftNow: secondsLeft,
    windowMatchesPolicy: Number(deadline) - now <= 125, policyWindowSeconds: 120, reviewReportedSecondsLeft: j.review?.secondsLeft };

  // 6. Pool and price impact, recomputed from chain reserves
  const pair = await c.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'getPair', args: [WBNB, token] });
  const [[r0, r1], t0] = await Promise.all([
    c.readContract({ address: pair, abi: pairAbi, functionName: 'getReserves' }),
    c.readContract({ address: pair, abi: pairAbi, functionName: 'token0' })]);
  const bnbIsToken0 = t0 === WBNB;
  const poolBNB = bnbIsToken0 ? r0 : r1, poolTok = bnbIsToken0 ? r1 : r0;
  const amountIn = parseEther(j.convertedBnb);
  const [, routerOut] = await c.readContract({ address: ROUTER, abi: routerAbi, functionName: 'getAmountsOut', args: [amountIn, [WBNB, token]] });
  const spotOut = (amountIn * poolTok) / poolBNB;
  out.priceImpact = { poolBNB: formatUnits(poolBNB, 18), tradeBNB: formatUnits(amountIn, 18),
    routerQuotedTokens: formatUnits(routerOut, 18), spotTokensNoFee: formatUnits(spotOut, 18),
    impactIncludingFeeBps: Number(((spotOut - routerOut) * 10000n) / spotOut),
    appReportedImpactBps: j.plan.impactBps, appFormulaIsExFee: 'amountIn/(reserveIn+amountIn)',
    poolAtLeast20xTrade: poolBNB >= amountIn * 20n };

  // 7. Reference price cross-check (Binance dynamic data)
  const md = await fetchMarketData(token);
  if (md?.tokenPriceUsd) {
    const investUsd = Number(j.investment?.investUsd ?? 5);
    const refTokens = investUsd / md.tokenPriceUsd;
    const got = Number(formatUnits(routerOut, 18));
    out.referencePrice = { binanceTokenPriceUsd: md.tokenPriceUsd, fetchedAt: md.fetchedAt,
      deviationVsReferenceBps: Math.round(((refTokens - got) / refTokens) * 10000) };
  }

  // 8. Estimated gas and gas price (read-only)
  const [gasUnits, gasPrice] = await Promise.all([
    c.estimateGas({ account: RECIPIENT, to: txTo, data, value, stateOverride: [{ address: RECIPIENT, balance: value + 10n ** 18n }] }),
    c.getGasPrice()]);
  out.gas = { estimatedUnits: gasUnits.toString(), gasPriceGwei: Number(gasPrice) / 1e9,
    costBNB: formatUnits(gasUnits * gasPrice, 18), serverEstimateUnits: j.plan.gasUnits ?? null };

  // 9. Simulation (eth_call only)
  const sim = await c.call({ account: RECIPIENT, to: txTo, data, value, stateOverride: [{ address: RECIPIENT, balance: value + 10n ** 18n }] });
  const amounts = decodeFunctionData({ abi: swapAbi, data }); void amounts;
  out.simulation = { ok: typeof sim.data === 'string' && sim.data.length > 2, returnBytes: ((sim.data?.length ?? 2) - 2) / 2 };

  console.log(JSON.stringify(out, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 1));
}
main().catch(e => { console.error('REVALIDATION ERROR:', String(e).slice(0, 300)); process.exit(1); });
