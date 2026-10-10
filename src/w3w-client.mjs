// Minimal signed client for Binance Web3 Wallet API.
// Signing format per search-grounded docs summary (UNVERIFIED against live API until keys exist):
// sign = base64(HMAC_SHA256(secret, timestamp + METHOD + pathWithQuery(incl. /build) + body))
import crypto from 'node:crypto';

export function sign({ secret, timestamp, method, path, body = '' }) {
  return crypto.createHmac('sha256', secret).update(timestamp + method.toUpperCase() + path + body, 'utf8').digest('base64');
}

export async function w3w(method, path, body, env = process.env) {
  const key = env.W3W_API_KEY, secret = env.W3W_API_SECRET;
  if (!key || !secret) throw new Error('W3W_API_KEY / W3W_API_SECRET not set');
  const base = new URL(env.W3W_API_BASE || 'https://web3.binance.com/build');
  const fullPath = base.pathname.replace(/\/$/, '') + path; // keeps /build prefix
  const raw = body ? JSON.stringify(body) : '';
  const timestamp = new Date().toISOString();
  const res = await fetch(base.origin + fullPath, {
    method, body: raw || undefined, signal: AbortSignal.timeout(10000),
    headers: {
      'content-type': 'application/json',
      'X-OC-APIKEY': key, 'X-OC-TIMESTAMP': timestamp, 'X-OC-RECV-WINDOW': '5000',
      'X-OC-NONCE': crypto.randomUUID(),
      'X-OC-SIGN': sign({ secret, timestamp, method, path: fullPath, body: raw }),
    },
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { status: res.status, json };
}
