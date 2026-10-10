import { describe, it, expect } from 'vitest';
import { priceFromReserves } from '../src/lib/price';
const e = (n: number) => BigInt(n) * 10n ** 18n;
describe('priceFromReserves', () => {
  it('computes quote per base for either token order', () => {
    expect(priceFromReserves(e(10), e(2500), 18, 18, true)?.priceQuotePerBase).toBe(250);
    expect(priceFromReserves(e(2500), e(10), 18, 18, false)?.priceQuotePerBase).toBe(250);
  });
  it('handles differing decimals', () => {
    const r = priceFromReserves(10n * 10n ** 18n, 2500n * 10n ** 6n, 18, 6, true);
    expect(r?.priceQuotePerBase).toBe(250);
  });
  it('returns null for empty pool and reports depth', () => {
    expect(priceFromReserves(0n, e(5), 18, 18, true)).toBeNull();
    expect(priceFromReserves(e(10), e(2500), 18, 18, true)?.quoteLiquidity).toBe(5000);
  });
});
