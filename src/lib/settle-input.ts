// Strict input validation for the read-only settlement routes (/api/settle, /api/receipt).
// The expected values (value, minOut, quote, recipient, token) still come from the client, which sends them
// from the verified review. This validator rejects malformed or internally inconsistent expectations before any
// chain read, so a bad request can never be reported as a settlement. It does not make the client trusted:
// a server-side review store is still the stronger fix (see docs/CURRENT_STATE.md).
import { isAddress } from 'viem';

export interface SettleInput {
  txHash: string; token: `0x${string}`; recipient: `0x${string}`;
  valueWei: bigint; minOutWei: bigint; quotedOutWei?: bigint;
}
export type SettleInputResult = { ok: true; value: SettleInput } | { ok: false; error: string };

const UINT = /^\d+$/;

function uint(v: unknown, name: string, { allowZero = false } = {}): { ok: true; n: bigint } | { ok: false; error: string } {
  if (typeof v !== 'string' && typeof v !== 'number') return { ok: false, error: `${name} must be a decimal integer string` };
  const s = String(v);
  if (!UINT.test(s)) return { ok: false, error: `${name} must be a non-negative decimal integer` };
  const n = BigInt(s);
  if (!allowZero && n === 0n) return { ok: false, error: `${name} must be greater than zero` };
  return { ok: true, n };
}

export function parseSettleInput(body: unknown): SettleInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;
  if (typeof b.txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(b.txHash)) return { ok: false, error: 'txHash must be a 32-byte hash' };
  if (typeof b.token !== 'string' || !isAddress(b.token)) return { ok: false, error: 'token must be a valid address' };
  if (typeof b.recipient !== 'string' || !isAddress(b.recipient)) return { ok: false, error: 'recipient must be a valid address' };
  const value = uint(b.valueWei, 'valueWei'); if (!value.ok) return value;
  const minOut = uint(b.minOutWei, 'minOutWei'); if (!minOut.ok) return minOut;
  let quoted: bigint | undefined;
  if (b.quotedOutWei !== undefined && b.quotedOutWei !== null) {
    const q = uint(b.quotedOutWei, 'quotedOutWei'); if (!q.ok) return q;
    if (minOut.n > q.n) return { ok: false, error: 'minOutWei cannot exceed quotedOutWei' };
    quoted = q.n;
  }
  return { ok: true, value: { txHash: b.txHash, token: b.token as `0x${string}`, recipient: b.recipient as `0x${string}`,
    valueWei: value.n, minOutWei: minOut.n, quotedOutWei: quoted } };
}
