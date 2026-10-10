// Spend to Own: a purchase at a merchant earns a reward; part of it converts into the merchant's tokenized stock.
// Merchant rules are PRODUCT CONFIG (our own mapping), not data from any merchant or card network.
export interface MerchantRule { id: string; name: string; symbol: string; rewardBps: number }
export const MERCHANTS: MerchantRule[] = [
  { id: 'apple-store', name: 'Apple Store', symbol: 'AAPLon', rewardBps: 200 },
  { id: 'starbucks', name: 'Starbucks', symbol: 'SBUXx', rewardBps: 300 },
  { id: 'pharmacy', name: 'Neighborhood Pharmacy', symbol: 'JNJon', rewardBps: 150 },
];

export interface RewardCalc { merchant: MerchantRule; spendUsd: number; rewardUsd: number; convertedUsd: number; keptUsd: number }

/** Pure. convertShareBps = share of the reward converted to stock (rest stays as plain reward). */
export function computeReward(merchantId: string, spendUsd: number, convertShareBps = 10_000): RewardCalc {
  const merchant = MERCHANTS.find(m => m.id === merchantId);
  if (!merchant) throw new Error('unknown merchant');
  if (!(spendUsd > 0) || spendUsd > 10_000) throw new Error('spend must be >0 and <= 10000 USD');
  if (!Number.isInteger(convertShareBps) || convertShareBps < 0 || convertShareBps > 10_000) throw new Error('convert share out of range');
  const rewardUsd = (spendUsd * merchant.rewardBps) / 10_000;
  const convertedUsd = (rewardUsd * convertShareBps) / 10_000;
  return { merchant, spendUsd, rewardUsd, convertedUsd, keptUsd: rewardUsd - convertedUsd };
}

/** Reward rate comes from the identified company's token symbol; placeholder product config. */
export function ruleForSymbol(symbol: string): MerchantRule | undefined { return MERCHANTS.find(m => m.symbol === symbol); }

export function usdToBnb(usd: number, bnbUsd: number): number {
  if (!(bnbUsd > 0)) throw new Error('invalid BNB price');
  return usd / bnbUsd;
}
