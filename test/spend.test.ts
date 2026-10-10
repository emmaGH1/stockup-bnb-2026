import { describe, it, expect } from 'vitest';
import { computeReward, usdToBnb } from '../src/lib/spend';
describe('spend to own', () => {
  it('computes reward and conversion split', () => {
    const r = computeReward('apple-store', 100, 5_000);
    expect(r.rewardUsd).toBe(2); expect(r.convertedUsd).toBe(1); expect(r.keptUsd).toBe(1);
    expect(r.merchant.symbol).toBe('AAPLon');
  });
  it('rejects bad input', () => {
    expect(() => computeReward('nope', 10)).toThrow(/merchant/);
    expect(() => computeReward('apple-store', 0)).toThrow();
    expect(() => computeReward('apple-store', 10, 20_000)).toThrow();
  });
  it('converts usd to bnb', () => { expect(usdToBnb(300, 600)).toBe(0.5); expect(() => usdToBnb(1, 0)).toThrow(); });
});
