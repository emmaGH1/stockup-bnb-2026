import { describe, it, expect } from 'vitest';
import { computeReward, computeInvestment, usdToBnb } from '../src/lib/spend';
describe('spend to own', () => {
  it('computes reward and conversion split', () => {
    const r = computeReward('apple-store', 100, 5_000);
    expect(r.rewardUsd).toBe(2); expect(r.convertedUsd).toBe(1); expect(r.keptUsd).toBe(1);
    expect(r.merchant.symbol).toBe('AAPLon');
  });
  it('records a $100 Starbucks purchase', () => {
    const r = computeReward('starbucks', 100);
    expect(r.merchant.symbol).toBe('SBUXx'); expect(r.rewardUsd).toBe(3); expect(r.convertedUsd).toBe(3);
  });
  it('invests 5% of a $100 purchase from own funds, independent of reward', () => {
    const i = computeInvestment(100);
    expect(i.investUsd).toBe(5); expect(i.fundedBy).toBe('own_funds'); expect(i.investBps).toBe(500);
    expect(computeInvestment(100, 250).investUsd).toBe(2.5);
    expect(computeReward('starbucks', 100).rewardUsd).toBe(3);
  });
  it('rejects bad investment input', () => {
    expect(() => computeInvestment(0)).toThrow(); expect(() => computeInvestment(100, 0)).toThrow(); expect(() => computeInvestment(100, 5000)).toThrow();
  });
  it('rejects bad input', () => {
    expect(() => computeReward('nope', 10)).toThrow(/merchant/);
    expect(() => computeReward('apple-store', 0)).toThrow();
    expect(() => computeReward('apple-store', 10, 20_000)).toThrow();
  });
  it('converts usd to bnb', () => { expect(usdToBnb(300, 600)).toBe(0.5); expect(() => usdToBnb(1, 0)).toThrow(); });
});
