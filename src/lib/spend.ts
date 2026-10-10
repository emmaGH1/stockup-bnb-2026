// Spend to Own. The purchase is a MANUALLY ENTERED / SIMULATED spending event: Stockup does not see a card, bank or merchant.
// The investment is the USER'S OWN MONEY. There is no merchant cashback or reward anywhere in this product.
export const MAX_SPEND_USD = 10_000;

export interface Investment { spendUsd: number; investBps: number; investUsd: number; fundedBy: 'own_funds'; spendSource: 'manual_entry' }

/** Pure. The user's OWN money: investBps of the manually entered spend (500 = 5%). Not a merchant payment and not a merchant benefit. */
export function computeInvestment(spendUsd: number, investBps = 500): Investment {
  if (!(spendUsd > 0) || spendUsd > 10_000) throw new Error('spend must be >0 and <= 10000 USD');
  if (!Number.isInteger(investBps) || investBps < 1 || investBps > 2_000) throw new Error('invest share must be 0.01%-20%');
  return { spendUsd, investBps, investUsd: (spendUsd * investBps) / 10_000, fundedBy: 'own_funds', spendSource: 'manual_entry' };
}

export function usdToBnb(usd: number, bnbUsd: number): number {
  if (!(bnbUsd > 0)) throw new Error('invalid BNB price');
  return usd / bnbUsd;
}
