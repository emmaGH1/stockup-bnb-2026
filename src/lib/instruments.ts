// Step 4: find a GENUINELY SUPPORTED tokenized-stock instrument for a company ticker.
// Source of truth: Binance Web3 public RWA endpoints (Ondo tokens), per binance/binance-skills-hub. No API key required.
import { getAddress } from 'viem';
import { readToken } from './bsc';

const BASE = 'https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa';
const HEADERS = { 'Accept-Encoding': 'identity', 'User-Agent': 'binance-web3/1.1 (Skill)' };
export const BSC_CHAIN = '56';

export interface ListedToken { chainId: string; contractAddress: string; symbol: string; ticker: string; multiplier: string; decimals?: number }
export interface Instrument extends ListedToken { address: `0x${string}`; verifiedOnChain: boolean; source: 'binance-web3-rwa-list' }
export type Discovery =
  | { status: 'supported'; instrument: Instrument; alternatives: Instrument[] }
  | { status: 'not_listed'; ticker: string; reason: string }
  | { status: 'unavailable'; ticker: string; reason: string };

async function getJson(url: string, fetchImpl: typeof fetch): Promise<{ code?: string; data?: unknown }> {
  const res = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTokenList(fetchImpl: typeof fetch = fetch): Promise<ListedToken[]> {
  const j = await getJson(`${BASE}/stock/detail/list/ai?type=1`, fetchImpl);
  if (j.code !== '000000' || !Array.isArray(j.data)) throw new Error('unexpected list response');
  return (j.data as Record<string, unknown>[]).map(r => ({
    chainId: String(r.chainId), contractAddress: String(r.contractAddress), symbol: String(r.symbol),
    ticker: String(r.ticker), multiplier: String(r.multiplier ?? '1'), decimals: typeof r.d === 'number' ? r.d : undefined,
  }));
}

/** Pure: pick BSC tokens for a ticker from a fetched list. */
export function selectBsc(list: ListedToken[], ticker: string): ListedToken[] {
  const t = ticker.trim().toUpperCase();
  return list.filter(x => x.chainId === BSC_CHAIN && x.ticker.toUpperCase() === t);
}

export interface DiscoverDeps { list?: () => Promise<ListedToken[]>; verify?: typeof readToken }

/** Finds a supported BSC instrument and cross-checks it against on-chain symbol(). A mismatch is NOT returned as supported. */
export async function findInstrument(ticker: string, deps: DiscoverDeps = {}): Promise<Discovery> {
  let list: ListedToken[];
  try { list = await (deps.list ?? fetchTokenList)(); }
  catch (e) { return { status: 'unavailable', ticker, reason: `Binance list unreachable: ${e instanceof Error ? e.message : 'error'}` }; }
  const matches = selectBsc(list, ticker);
  if (matches.length === 0) return { status: 'not_listed', ticker, reason: `No BSC tokenized instrument for ${ticker} on Binance's Ondo list (${list.length} entries checked).` };
  const verify = deps.verify ?? readToken;
  const out: Instrument[] = [];
  for (const m of matches) {
    let ok = false;
    try { ok = (await verify(m.contractAddress)).symbol === m.symbol; } catch { ok = false; }
    out.push({ ...m, address: getAddress(m.contractAddress), verifiedOnChain: ok, source: 'binance-web3-rwa-list' });
  }
  const good = out.filter(o => o.verifiedOnChain);
  if (good.length === 0) return { status: 'unavailable', ticker, reason: 'Listed, but on-chain symbol() check failed; not treated as supported.' };
  return { status: 'supported', instrument: good[0], alternatives: good.slice(1) };
}

export interface AssetStatus { openState: boolean; marketStatus: string; reasonCode: string; reasonMsg: string | null; nextOpenTime?: number; source: 'binance-web3-rwa-status' }

/** Live per-asset trading status (public endpoint). Returns null if unreachable; callers must treat null as NOT tradable. */
export async function fetchAssetStatus(address: string, fetchImpl: typeof fetch = fetch): Promise<AssetStatus | null> {
  try {
    const j = await getJson(`${BASE}/asset/market/status/ai?chainId=${BSC_CHAIN}&contractAddress=${address}`, fetchImpl);
    const d = j.data as Record<string, unknown> | undefined;
    if (j.code !== '000000' || !d) return null;
    return { openState: d.openState === true, marketStatus: String(d.marketStatus ?? ''), reasonCode: String(d.reasonCode ?? ''),
      reasonMsg: (d.reasonMsg as string | null) ?? null, nextOpenTime: typeof d.nextOpenTime === 'number' ? d.nextOpenTime : undefined, source: 'binance-web3-rwa-status' };
  } catch { return null; }
}
