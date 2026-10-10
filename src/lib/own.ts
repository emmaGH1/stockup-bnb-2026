import { computeRewardByTicker, computeInvestment, usdToBnb } from './spend';
import { findInstrument, fetchAssetStatus } from './instruments';
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
  const live = await fetchAssetStatus(inst.address);
  const status: SecurityStatus | undefined = live ? {
    symbol: inst.symbol, source: 'live',
    session: live.reasonCode === 'ASSET_PAUSED' || live.reasonCode === 'MARKET_PAUSED' ? 'halted' : live.openState ? 'open' : 'closed',
  } : undefined;
  let plan;
  try { plan = await buildPlan({ symbol: inst.symbol, tokenAddress: inst.address, status, bnb: bnbStr, recipient: req.recipient }); }
  catch (e) {
    const why = e instanceof Error ? e.message : 'route unavailable';
    // Purchase and reward are still recorded; only the on-chain conversion is unavailable.
    return { identification, discovery, instrument: inst, liveStatus: live, calc, investment, bnbUsd: price, convertedBnb: bnbStr, plan: null, outcome: 'no_route' as const,
      note: `Purchase recorded and reward calculated. Investment unavailable: ${why}. Your own funds were not touched. Nothing was sent.` };
  }
  return { identification, discovery, instrument: inst, liveStatus: live, calc, investment, bnbUsd: price, convertedBnb: bnbStr, plan,
    outcome: plan.tx ? 'ready_to_sign' : 'held',
    note: plan.tx ? 'Unsigned transaction ready for your wallet.' : 'Guard blocked the investment. Your own funds were not touched. Nothing was sent.' };
}
