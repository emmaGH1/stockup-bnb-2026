// Step 5: live market information from Binance Web3 public RWA "dynamic" endpoint (no API key).
const URL_DYN = 'https://www.binance.com/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai';
const HEADERS = { 'Accept-Encoding': 'identity', 'User-Agent': 'binance-web3/1.1 (Skill)' };

export interface MarketData {
  symbol: string; ticker: string;
  tokenPriceUsd: number | null; stockPriceUsd: number | null; changePct24h: number | null;
  sharesPerToken: number | null; holders: number | null;
  high52w: number | null; low52w: number | null; pe: number | null; dividendYieldPct: number | null;
  maxActiveNotionalUsd: number | null; fetchedAt: string; source: 'binance-web3-rwa-dynamic';
}

const num = (v: unknown): number | null => { const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN; return Number.isFinite(n) ? n : null; };

/** Pure parser so it is testable without network. Returns null when the payload is not usable. */
export function parseMarketData(j: unknown, now = new Date()): MarketData | null {
  const root = j as { code?: string; data?: Record<string, Record<string, unknown> & { symbol?: string }> & { symbol?: string; ticker?: string } };
  if (!root || root.code !== '000000' || !root.data) return null;
  const d = root.data, t = (d.tokenInfo ?? {}) as Record<string, unknown>, s = (d.stockInfo ?? {}) as Record<string, unknown>, l = (d.limitInfo ?? {}) as Record<string, unknown>;
  if (num(t.price) === null) return null;
  return { symbol: String(d.symbol ?? ''), ticker: String(d.ticker ?? ''), tokenPriceUsd: num(t.price), stockPriceUsd: num(s.price),
    changePct24h: num(t.priceChangePct24h), sharesPerToken: num(t.sharesMultiplier), holders: num(t.totalHolders),
    high52w: num(s.priceHigh52w), low52w: num(s.priceLow52w), pe: num(s.priceToEarnings), dividendYieldPct: num(s.dividendYield),
    maxActiveNotionalUsd: num(l.maxActiveNotionalValue), fetchedAt: now.toISOString(), source: 'binance-web3-rwa-dynamic' };
}

export async function fetchMarketData(address: string, fetchImpl: typeof fetch = fetch): Promise<MarketData | null> {
  try {
    const res = await fetchImpl(`${URL_DYN}?chainId=56&contractAddress=${address}`, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
    return res.ok ? parseMarketData(await res.json()) : null;
  } catch { return null; }
}

/** Compare our on-chain DEX quote to Binance's reference token price. Positive = DEX gives fewer tokens than reference (worse for buyer). */
export function dexVsReferenceBps(investUsd: number, tokensOut: number, tokenPriceUsd: number): number | null {
  if (!(investUsd > 0) || !(tokensOut > 0) || !(tokenPriceUsd > 0)) return null;
  const refTokens = investUsd / tokenPriceUsd;
  return Math.round(((refTokens - tokensOut) / refTokens) * 10_000);
}
