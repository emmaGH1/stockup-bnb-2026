import { readToken } from './bsc';

export interface AssetRow {
  symbol: string; address: string; standard: string;
  onChain: { symbol: string; decimals: number; totalSupply: string } | null;
  status: 'ok' | 'symbol_mismatch' | 'read_failed';
}

type Reader = typeof readToken;

/** Live-reads each registry entry and reports whether on-chain data still matches. Never throws per-asset. */
export async function readAssets(
  assets: readonly { symbol: string; address: string; standard: string }[],
  read: Reader = readToken,
): Promise<AssetRow[]> {
  return Promise.all(assets.map(async (a): Promise<AssetRow> => {
    try {
      const t = await read(a.address);
      return { ...a, onChain: { symbol: t.symbol, decimals: t.decimals, totalSupply: t.totalSupply },
        status: t.symbol === a.symbol ? 'ok' : 'symbol_mismatch' };
    } catch {
      return { ...a, onChain: null, status: 'read_failed' };
    }
  }));
}
