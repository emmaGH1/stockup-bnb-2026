import { computeReward, usdToBnb } from './spend';
import { bnbUsd } from './bnbprice';
import { buildPlan } from './plan';

export interface OwnRequest { merchantId: string; spendUsd: number; convertShareBps?: number; recipient: string }

export async function spendToOwn(req: OwnRequest) {
  const calc = computeReward(req.merchantId, req.spendUsd, req.convertShareBps);
  const price = await bnbUsd();
  const bnb = usdToBnb(calc.convertedUsd, price);
  const bnbStr = bnb.toFixed(8);
  let plan;
  try { plan = await buildPlan({ symbol: calc.merchant.symbol, bnb: bnbStr, recipient: req.recipient }); }
  catch (e) {
    const why = e instanceof Error ? e.message : 'route unavailable';
    // Purchase and reward are still recorded; only the on-chain conversion is unavailable.
    return { calc, bnbUsd: price, convertedBnb: bnbStr, plan: null, outcome: 'no_route' as const,
      note: `Purchase recorded and reward calculated. Conversion unavailable: ${why}. The reward stays as plain reward. Nothing was sent.` };
  }
  return { calc, bnbUsd: price, convertedBnb: bnbStr, plan,
    outcome: plan.tx ? 'ready_to_sign' : 'held_reward',
    note: plan.tx ? 'Unsigned transaction ready for your wallet.' : 'Guard blocked the conversion; the reward stays as plain reward. Nothing was sent.' };
}
