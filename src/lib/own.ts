import { computeReward, usdToBnb, ruleForSymbol } from './spend';
import { identifyCompany, type Identification } from './company';
import { bnbUsd } from './bnbprice';
import { buildPlan } from './plan';

export interface OwnRequest { merchant: string; spendUsd: number; convertShareBps?: number; recipient: string }

export async function spendToOwn(req: OwnRequest) {
  // Step 2: identify the publicly traded company behind the merchant string.
  const identification: Identification = identifyCompany(String(req.merchant ?? ''));
  if (identification.status !== 'identified') {
    return { identification, outcome: 'unidentified' as const, calc: null, plan: null,
      note: identification.status === 'ambiguous' ? 'More than one public company matched; pick one. Nothing was calculated or sent.' : 'No publicly traded company matched this merchant. Nothing was calculated or sent.' };
  }
  const { company } = identification;
  const rule = company.tokenSymbol ? ruleForSymbol(company.tokenSymbol) : undefined;
  if (!rule) {
    return { identification, outcome: 'no_token' as const, calc: null, plan: null,
      note: `${company.name} (${company.ticker}) is publicly traded, but Stockup has no registered token for it. Nothing was sent.` };
  }
  const calc = computeReward(rule.id, req.spendUsd, req.convertShareBps);
  const price = await bnbUsd();
  const bnb = usdToBnb(calc.convertedUsd, price);
  const bnbStr = bnb.toFixed(8);
  let plan;
  try { plan = await buildPlan({ symbol: calc.merchant.symbol, bnb: bnbStr, recipient: req.recipient }); }
  catch (e) {
    const why = e instanceof Error ? e.message : 'route unavailable';
    // Purchase and reward are still recorded; only the on-chain conversion is unavailable.
    return { identification, calc, bnbUsd: price, convertedBnb: bnbStr, plan: null, outcome: 'no_route' as const,
      note: `Purchase recorded and reward calculated. Conversion unavailable: ${why}. The reward stays as plain reward. Nothing was sent.` };
  }
  return { identification, calc, bnbUsd: price, convertedBnb: bnbStr, plan,
    outcome: plan.tx ? 'ready_to_sign' : 'held_reward',
    note: plan.tx ? 'Unsigned transaction ready for your wallet.' : 'Guard blocked the conversion; the reward stays as plain reward. Nothing was sent.' };
}
