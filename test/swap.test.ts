import { describe, it, expect } from 'vitest';
import { applySlippage, impactBps } from '../src/lib/swap';
describe('swap math', () => {
  it('applies slippage', () => { expect(applySlippage(10_000n, 100)).toBe(9_900n); expect(() => applySlippage(1n, 9999)).toThrow(); });
  it('impact grows with size', () => {
    const small = impactBps(10n, 1000n, 1000n), big = impactBps(500n, 1000n, 1000n);
    expect(small).toBeLessThan(big); expect(big).toBeGreaterThan(3000); expect(small).toBe(99);
    expect(impactBps(1n, 0n, 5n)).toBe(10_000);
  });
});
