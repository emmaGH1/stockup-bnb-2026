import { getAddress, isAddress, parseEther, parseAbi, formatUnits } from 'viem';
import { client } from './bsc';
import { VERIFIED_ASSETS } from './assets';
import { getStatuses } from './status';
import { evaluateGuard } from './guard';
import { planBnbBuy, simulate, impactBps, WBNB } from './swap';

export const MAX_BNB_PER_TRADE = 0.05; // hard server-side cap
const FACTORY = getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73');
const fAbi = parseAbi(['function getPair(address,address) view returns (address)']);
const pAbi = parseAbi(['function getReserves() view returns (uint112,uint112,uint32)', 'function token0() view returns (address)']);

export interface PlanRequest { symbol: string; bnb: string; recipient: string; slippageBps?: number; maxImpactBps?: number }

export async function buildPlan(req: PlanRequest) {
  const asset = VERIFIED_ASSETS.find(a => a.symbol === req.symbol && a.symbol !== 'USDon');
  if (!asset) throw new Error('unsupported asset');
  if (!isAddress(req.recipient)) throw new Error('invalid recipient');
  const amount = Number(req.bnb);
  if (!(amount > 0) || amount > MAX_BNB_PER_TRADE) throw new Error(`amount must be >0 and <= ${MAX_BNB_PER_TRADE} BNB`);
  const bnbIn = parseEther(req.bnb);
  const c = client();
  const pair = await c.readContract({ address: FACTORY, abi: fAbi, functionName: 'getPair', args: [WBNB, getAddress(asset.address)] });
  if (/^0x0+$/.test(pair)) throw new Error('no WBNB pool');
  const [[r0, r1], t0] = await Promise.all([
    c.readContract({ address: pair, abi: pAbi, functionName: 'getReserves' }),
    c.readContract({ address: pair, abi: pAbi, functionName: 'token0' }),
  ]);
  const reserveBnb = t0 === WBNB ? r0 : r1, reserveTok = t0 === WBNB ? r1 : r0;
  const plan = await planBnbBuy(asset.address, bnbIn, req.recipient, req.slippageBps ?? 100, 120, c);
  const impact = impactBps(bnbIn, reserveBnb, reserveTok);
  const status = getStatuses().statuses.find(s => s.symbol === asset.symbol);
  const guard = evaluateGuard({ status, impactBps: impact, maxImpactBps: req.maxImpactBps ?? 300, quotedOut: plan.quotedOut,
    poolDepthBnb: Number(formatUnits(reserveBnb, 18)), amountBnb: amount });
  let simulation: { ok: boolean; error?: string } = { ok: false, error: 'skipped: guard blocked' };
  if (guard.allowed) {
    try { await simulate(plan, req.recipient, c); simulation = { ok: true }; }
    catch (e) { simulation = { ok: false, error: String(e).slice(0, 200) }; }
  }
  return {
    asset: asset.symbol, tokenAddress: asset.address, pair, pairLiquidityBnb: Number(formatUnits(reserveBnb, 18)),
    quotedOut: formatUnits(plan.quotedOut, 18), minOut: formatUnits(plan.minOut, 18), impactBps: impact, slippageBps: plan.slippageBps,
    guard, simulation,
    // Unsigned tx for the USER'S wallet to sign. Only offered when guard passed and simulation succeeded.
    tx: guard.allowed && simulation.ok ? { to: plan.to, data: plan.data, value: '0x' + plan.value.toString(16), chainId: 56 } : null,
    notes: ['Session status is development fixture data, not Binance.', 'Server holds no key and never sends transactions.'],
  };
}
