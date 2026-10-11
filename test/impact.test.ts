import { describe, it, expect } from 'vitest';
import { impactBps, impactIncludingFeeBps } from '../src/lib/swap';

const e = (n: number) => BigInt(n) * 10n ** 18n;
describe('price impact', () => {
  it('fee-free impact is unchanged (guard input)', () => {
    expect(impactBps(e(1), e(1), e(1))).toBe(5000);
  });
  it('fee-inclusive impact is always at least the fee-free impact and includes the 0.25% fee', () => {
    const a = impactBps(e(1), e(1000), e(1000));
    const b = impactIncludingFeeBps(e(1), e(1000), e(1000));
    expect(b).toBeGreaterThanOrEqual(a);
    // Tiny trade: impact ~ 10 bps, fee 25 bps -> fee-inclusive ~ 35 bps
    expect(b).toBeGreaterThanOrEqual(a + 20);
    expect(b).toBeLessThanOrEqual(a + 30);
  });
  it('matches the live pool scale: 0.00666 BNB into a 4.36 BNB pool is ~15 bps fee-free, ~40 bps with fee', () => {
    const amt = 6_664_450_000_000_000n; // 0.00666445 BNB
    const pool = 4_358_834_471_766_541_180n; // 4.358834 BNB
    const token = 230_000n * 10n ** 18n; // placeholder token reserve (only the ratio BNB:token is used for impact)
    const fee = impactBps(amt, pool, token);
    const incl = impactIncludingFeeBps(amt, pool, token);
    expect(fee).toBeGreaterThanOrEqual(10);
    expect(fee).toBeLessThanOrEqual(20);
    expect(incl - fee).toBeGreaterThanOrEqual(20);
    expect(incl - fee).toBeLessThanOrEqual(30);
  });
  it('refuses degenerate inputs as 100%', () => {
    expect(impactIncludingFeeBps(0n, e(1), e(1))).toBe(10_000);
    expect(impactIncludingFeeBps(e(1), 0n, e(1))).toBe(10_000);
  });
});
