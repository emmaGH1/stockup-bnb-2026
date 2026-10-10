import { describe, it, expect } from 'vitest';
import { readAssets } from '../src/lib/registry';

const a = (symbol: string) => ({ symbol, address: '0x0000000000000000000000000000000000000001', standard: 'ondo' });
const tok = (symbol: string) => ({ address: '0x0000000000000000000000000000000000000001' as `0x${string}`, symbol, decimals: 18, totalSupply: '1' });

describe('readAssets', () => {
  it('flags ok, mismatch and failure independently', async () => {
    const reader = async (addr: string) => { void addr; return tok('X'); };
    const rows = await readAssets([a('X'), a('Y')], reader);
    expect(rows.map(r => r.status)).toEqual(['ok', 'symbol_mismatch']);
    const failing = await readAssets([a('X')], async () => { throw new Error('rpc'); });
    expect(failing[0].status).toBe('read_failed');
    expect(failing[0].onChain).toBeNull();
  });
});
