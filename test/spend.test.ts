import { describe, it, expect } from 'vitest';
import { computeInvestment, usdToBnb } from '../src/lib/spend';

describe('own-funds investment', () => {
  it('invests 5% of a manually entered $100 spend from own funds', () => {
    const i = computeInvestment(100);
    expect(i.investUsd).toBe(5); expect(i.fundedBy).toBe('own_funds'); expect(i.spendSource).toBe('manual_entry'); expect(i.investBps).toBe(500);
    expect(computeInvestment(100, 250).investUsd).toBe(2.5);
  });
  it('has no reward or cashback concept', () => { expect(Object.keys(computeInvestment(100))).not.toContain('rewardUsd'); });
  it('rejects bad input', () => {
    expect(() => computeInvestment(0)).toThrow(); expect(() => computeInvestment(100, 0)).toThrow(); expect(() => computeInvestment(100, 5000)).toThrow(); expect(() => computeInvestment(20_000)).toThrow();
  });
  it('converts usd to bnb', () => { expect(usdToBnb(300, 600)).toBe(0.5); expect(() => usdToBnb(1, 0)).toThrow(); });
});
