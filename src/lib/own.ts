import { computeReward, usdToBnb } from './spend';
import { bnbUsd } from './bnbprice';
import { buildPlan } from './plan';

export interface OwnRequest { merchantId: string; spendUsd: number; convertShareBps?: number; recipient: string }

export async function spendToOwn(req: OwnRequest) {
  const calc = computeReward(req.merchantId, req.spendUsd, req.convertShareBps);
  const price = await bnbUsd();
  const bnb = usdToBnb(calc.convertedUsd, price);
  const bnbStr = bnb.toFixed(8);
  const plan = await buildPlan({ symbol: calc.merchant.symbol, bnb: bnbStr, recipient: req.recipient });
  return { calc, bnbUsd: price, convertedBnb: bnbStr, plan,
    outcome: plan.tx ? 'ready_to_sign' : 'held_reward',
    note: plan.tx ? 'Unsigned transaction ready for your wallet.' : 'Guard blocked the conversion; the reward stays as plain reward. Nothing was sent.' };
}
