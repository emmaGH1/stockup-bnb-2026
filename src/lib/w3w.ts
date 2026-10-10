// Signed client for Binance Web3 Wallet API. Signing scheme is from a search summary
// and is UNVERIFIED against the live API until credentials exist.
import crypto from 'node:crypto';

export function sign(p: { secret: string; timestamp: string; method: string; path: string; body?: string }): string {
  return crypto.createHmac('sha256', p.secret).update(p.timestamp + p.method.toUpperCase() + p.path + (p.body ?? ''), 'utf8').digest('base64');
}

export interface W3WEnv { W3W_API_KEY?: string; W3W_API_SECRET?: string; W3W_API_BASE?: string }

export async function w3w(method: 'GET' | 'POST', path: string, body?: unknown, env: W3WEnv = process.env as W3WEnv, fetchImpl: typeof fetch = fetch) {
  const key = env.W3W_API_KEY, secret = env.W3W_API_SECRET;
  if (!key || !secret) throw new Error('W3W credentials not configured');
  const base = new URL(env.W3W_API_BASE || 'https://web3.binance.com/build');
  const fullPath = base.pathname.replace(/\/$/, '') + path; // must keep /build prefix
  const raw = body ? JSON.stringify(body) : '';
  const timestamp = new Date().toISOString();
  const res = await fetchImpl(base.origin + fullPath, {
    method, body: raw || undefined, signal: AbortSignal.timeout(10_000),
    headers: {
      'content-type': 'application/json', 'X-OC-APIKEY': key, 'X-OC-TIMESTAMP': timestamp,
      'X-OC-RECV-WINDOW': '5000', 'X-OC-NONCE': crypto.randomUUID(),
      'X-OC-SIGN': sign({ secret, timestamp, method, path: fullPath, body: raw }),
    },
  });
  const text = await res.text();
  let json: unknown; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { status: res.status, json };
}
