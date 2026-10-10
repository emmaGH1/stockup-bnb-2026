import { describe, it, expect } from 'vitest';
import { parseMarketData, fetchMarketData, dexVsReferenceBps } from '../src/lib/marketdata';
const payload = { code: '000000', data: { symbol: 'AMZNon', ticker: 'AMZN',
  tokenInfo: { price: '262.37', priceChangePct24h: '0.82', totalHolders: '3154', sharesMultiplier: '1' },
  stockInfo: { price: null, priceHigh52w: '287.2', priceLow52w: '196', priceToEarnings: '20.26', dividendYield: '0' },
  limitInfo: { maxActiveNotionalValue: '1000000' } } };
describe('market data', () => {
  it('parses a real-shaped payload and keeps null for missing fields', () => {
    const m = parseMarketData(payload)!;
    expect(m.tokenPriceUsd).toBe(262.37); expect(m.stockPriceUsd).toBeNull(); expect(m.holders).toBe(3154); expect(m.pe).toBe(20.26);
    expect(m.source).toBe('binance-web3-rwa-dynamic');
  });
  it('rejects bad payloads', () => {
    expect(parseMarketData({ code: '1', data: {} })).toBeNull();
    expect(parseMarketData({ code: '000000', data: { tokenInfo: { price: 'abc' } } })).toBeNull();
    expect(parseMarketData(null)).toBeNull();
  });
  it('fetch failure returns null, never throws', async () => {
    expect(await fetchMarketData('0x1', (async () => { throw new Error('x'); }) as unknown as typeof fetch)).toBeNull();
    expect(await fetchMarketData('0x1', (async () => new Response('', { status: 500 })) as unknown as typeof fetch)).toBeNull();
  });
  it('dex vs reference', () => {
    expect(dexVsReferenceBps(100, 0.38, 262.37)).toBe(Math.round(((100 / 262.37 - 0.38) / (100 / 262.37)) * 10000));
    expect(dexVsReferenceBps(100, 100 / 262.37, 262.37)).toBe(0);
    expect(dexVsReferenceBps(0, 1, 1)).toBeNull();
  });
});
