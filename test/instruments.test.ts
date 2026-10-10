import { describe, it, expect } from 'vitest';
import { findInstrument, selectBsc, fetchAssetStatus, type ListedToken } from '../src/lib/instruments';

const t = (chainId: string, symbol: string, ticker: string, addr: string): ListedToken => ({ chainId, contractAddress: addr, symbol, ticker, multiplier: '1' });
const A = '0x94d7754541b829a87321d56121bc544167ac490d', B = '0x0000000000000000000000000000000000000002';
const list = [t('1', 'SBUXon', 'SBUX', B), t('56', 'SBUXon', 'SBUX', A), t('56', 'AAPLon', 'AAPL', B)];
const tok = (symbol: string) => async () => ({ address: A as `0x${string}`, symbol, decimals: 18, totalSupply: '1' });

describe('instrument discovery', () => {
  it('selects only BSC tokens for a ticker, case-insensitive', () => {
    expect(selectBsc(list, 'sbux').map(x => x.contractAddress)).toEqual([A]);
  });
  it('returns supported when listed and on-chain symbol matches', async () => {
    const r = await findInstrument('SBUX', { list: async () => list, verify: tok('SBUXon') });
    expect(r.status).toBe('supported');
    if (r.status === 'supported') { expect(r.instrument.symbol).toBe('SBUXon'); expect(r.instrument.verifiedOnChain).toBe(true); expect(r.instrument.address).toMatch(/^0x94d7/i); }
  });
  it('refuses when on-chain symbol mismatches the list', async () => {
    expect((await findInstrument('SBUX', { list: async () => list, verify: tok('WRONG') })).status).toBe('unavailable');
  });
  it('reports not_listed for a ticker with no BSC token', async () => {
    const r = await findInstrument('XYZ', { list: async () => list, verify: tok('X') });
    expect(r.status).toBe('not_listed');
  });
  it('reports unavailable (never supported) when the list is unreachable', async () => {
    const r = await findInstrument('SBUX', { list: async () => { throw new Error('boom'); } });
    expect(r.status).toBe('unavailable');
  });
  it('asset status: parses open/closed and treats failures as null', async () => {
    const ok = async () => new Response(JSON.stringify({ code: '000000', data: { openState: false, marketStatus: 'closed', reasonCode: 'MARKET_CLOSED', reasonMsg: 'Weekend or Holiday' } }));
    expect((await fetchAssetStatus(A, ok as unknown as typeof fetch))?.reasonCode).toBe('MARKET_CLOSED');
    expect(await fetchAssetStatus(A, (async () => new Response('x', { status: 500 })) as unknown as typeof fetch)).toBeNull();
  });
});
