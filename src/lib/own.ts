import { computeRewardByTicker, computeInvestment, usdToBnb } from './spend';
import { findInstrument, fetchAssetStatus } from './instruments';
import { fetchMarketData, dexVsReferenceBps } from './marketdata';
import { client } from './bsc';
import { verifyAndDescribe } from './review';
import { getAddress } from 'viem';
import { checkMarketStatus, estimateFees, checkFees, checkQuoteValidity, checkWalletFunds, executionEligibility, type Check } from './checks';
import type { SecurityStatus } from './fixtures/w3w';
import { identifyCompany, type Identification } from './company';
import { bnbUsd } from './bnbprice';
import { buildPlan } from './plan';

export interface OwnRequest { merchant: string; spendUsd: number; investBps?: number; recipient: string }

export async function spendToOwn(req: OwnRequest) {
  // Step 2: identify the publicly traded company behind the merchant string.
  const identification: Identification = identifyCompany(String(req.merchant ?? ''));
  if (identification.status !== 'identified') {
    return { identification, outcome: 'unidentified' as const, calc: null, plan: null,
      note: identification.status === 'ambiguous' ? 'More than one public company matched; pick one. Nothing was calculated or sent.' : 'No publicly traded company matched this merchant. Nothing was calculated or sent.' };
  }
  const { company } = identification;
  // Step 4: search for a genuinely supported tokenized instrument for this company.
  const discovery = await findInstrument(company.ticker);
  if (discovery.status !== 'supported') {
    return { identification, discovery, outcome: 'no_token' as const, calc: null, plan: null,
      note: `${company.name} (${company.ticker}): no supported tokenized instrument. ${discovery.reason} Nothing was sent.` };
  }
  const inst = discovery.instrument;
  const calc = computeRewardByTicker(company.ticker, company.name, inst.symbol, req.spendUsd);
  const investment = computeInvestment(req.spendUsd, req.investBps);
  const price = await bnbUsd();
  const bnb = usdToBnb(investment.investUsd, price);
  const bnbStr = bnb.toFixed(8);
  const [live, market] = await Promise.all([fetchAssetStatus(inst.address), fetchMarketData(inst.address)]);
  const status: SecurityStatus | undefined = live ? {
    symbol: inst.symbol, source: 'live',
    session: live.reasonCode === 'ASSET_PAUSED' || live.reasonCode === 'MARKET_PAUSED' ? 'halted' : live.openState ? 'open' : 'closed',
  } : undefined;
  let plan;
  try { plan = await buildPlan({ symbol: inst.symbol, tokenAddress: inst.address, status, bnb: bnbStr, recipient: req.recipient }); }
  catch (e) {
    const why = e instanceof Error ? e.message : 'route unavailable';
    // Purchase and reward are still recorded; only the on-chain conversion is unavailable.
    const checks: Check[] = [
      checkMarketStatus({ asset: live, market: null }),
      { id: 'route', label: 'Execution route', state: 'fail', detail: `No PancakeSwap route: ${why}.`, source: 'On-chain PancakeSwap V2 factory', required: true },
    ];
    return { identification, discovery, instrument: inst, liveStatus: live, market, quote: null, checks, eligibility: executionEligibility(checks), calc, investment, bnbUsd: price, convertedBnb: bnbStr, plan: null, outcome: 'no_route' as const,
      note: `Purchase recorded and reward calculated. Investment unavailable: ${why}. Your own funds were not touched. Nothing was sent.` };
  }
  const quote = {
    // Executable quote = PancakeSwap V2 router getAmountsOut + eth_call simulation, computed by US from BSC mainnet.
    dex: { source: 'pancakeswap-v2-onchain', tokensOut: Number(plan.quotedOut), minOut: Number(plan.minOut), simulated: plan.simulation.ok },
    vsReferenceBps: market?.tokenPriceUsd ? dexVsReferenceBps(investment.investUsd, Number(plan.quotedOut), market.tokenPriceUsd) : null,
    // Binance's own executable quote (baw market-order quote) exists but requires a signed-in Binance Agentic Wallet session (human action).
    binance: { available: false as const, reason: 'Requires Binance Agentic Wallet sign-in (baw auth signin); returned NOT_LOGGED_IN. Not attempted on your behalf.' },
  };
  // Step 6: checklist from real data. Anything unobtainable is 'unknown', which blocks execution.
  const c = client();
  const [gasPrice, balance] = await Promise.all([
    c.getGasPrice().catch(() => null),
    c.getBalance({ address: getAddress(req.recipient) }).then(b => Number(b) / 1e18).catch(() => null),
  ]);
  const fees = estimateFees({ investUsd: investment.investUsd, bnbUsd: price, gasUnits: plan.gasUnits ? BigInt(plan.gasUnits) : null, gasPriceWei: gasPrice });
  const checks: Check[] = [
    checkMarketStatus({ asset: live, market: null }),
    checkFees(fees, investment.investUsd),
    checkQuoteValidity({ quotedAtMs: plan.quotedAtMs, nowMs: Date.now(), simulated: plan.simulation.ok, skipped: !plan.simulation.ok && (plan.simulation.error ?? '').startsWith('skipped'), minOut: Number(plan.minOut), quotedOut: Number(plan.quotedOut) }),
    { id: 'guard', label: 'Price impact and pool depth guard', state: plan.guard.allowed ? 'pass' : 'fail', detail: plan.guard.allowed ? 'Within limits.' : plan.guard.reasons.join('; '), source: 'On-chain PancakeSwap V2 reserves', required: true },
    checkWalletFunds({ balanceBnb: balance, tradeBnb: Number(bnbStr), gasBnb: fees.gasBnb }),
  ];
  const eligibility = executionEligibility(checks);
  // Step 7: decode the calldata ourselves and compare to the quote. The tx is released ONLY if eligible AND the review verifies.
  const verified = eligibility.eligible && plan.tx
    ? verifyAndDescribe(plan.tx, { token: inst.address, recipient: req.recipient, valueWei: BigInt(plan.valueWei), minOutWei: BigInt(plan.minOutWei), nowSec: Math.floor(Date.now() / 1000), maxTtlSec: 120 })
    : null;
  const review = verified?.ok ? verified.review : null;
  const reviewProblems = verified && !verified.ok ? verified.problems : [];
  const safePlan = { ...plan, tx: review ? plan.tx : null };
  return { identification, discovery, instrument: inst, liveStatus: live, market, quote, checks, fees, eligibility, review, reviewProblems, settleParams: review ? { token: inst.address, recipient: req.recipient, valueWei: plan.valueWei, minOutWei: plan.minOutWei, quotedOutWei: plan.quotedOutWei } : null, calc, investment, bnbUsd: price, convertedBnb: bnbStr, plan: safePlan,
    outcome: review ? 'ready_to_sign' as const : reviewProblems.length ? 'not_eligible' as const : plan.guard.allowed ? 'not_eligible' as const : 'held' as const,
    note: review ? 'All checks passed and the transaction was decoded and verified. Review it, then authorize in your wallet.'
      : reviewProblems.length ? `Transaction failed verification: ${reviewProblems.join('; ')}. Nothing was sent.`
      : plan.guard.allowed ? `Blocked by checks: ${[...eligibility.blockedBy, ...eligibility.unknown.map(u => `${u} (unknown)`)].join(', ')}. Nothing was sent.`
      : 'Guard blocked the investment. Your own funds were not touched. Nothing was sent.' };
}
