// Server-signed review token (HMAC-SHA256). Issued when a transaction is released. It binds the wallet, token
// contract, router, chain ID, input value, minimum output, quote and calldata digest.
//
// Two different uses, with different clock rules:
//  - VERIFICATION (/api/settle, /api/receipt): signature and shape only. No clock. A transaction that is already on
//    chain stays verifiable however long after the review it was signed. Expiry must never block this.
//  - AUTHORIZATION (new trades): isAuthorizable() applies the review window. The on-chain deadline (120 s) remains
//    the hard limit on the swap itself.
// The on-chain checks in settle.ts run unchanged after the signed expectation has been checked.
// The secret is read from REVIEW_HMAC_SECRET on the server only. It is never returned, logged, or bundled.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAddress, isAddress } from 'viem';
import { ROUTER_V2 } from './swap';
import type { SettleInput } from './settle-input';

export const TOKEN_VERSION = 1;
// Proposed review window (docs/PROPOSAL_SERVER_REVIEW_STORE.md). Governs new authorization only.
export const REVIEW_TTL_SEC = 15 * 60;
export const MIN_SECRET_LENGTH = 32;
export const BSC_CHAIN_ID = 56;

export interface ReviewFields {
  wallet: `0x${string}`; token: `0x${string}`; router: `0x${string}`; chainId: number;
  valueWei: string; minOutWei: string; quotedOutWei: string; slippageBps: number; calldataDigest: string;
}
export interface ReviewPayload extends ReviewFields { v: number; issuedAt: number; expiresAt: number }

export type VerifyReason = 'malformed' | 'bad_signature' | 'bad_payload' | 'wrong_version';
export type TokenCheck = { ok: true; payload: ReviewPayload } | { ok: false; reason: VerifyReason };

/** Reads the signing secret. Fails closed. The error text never echoes the value. */
export function getReviewSecret(env: Record<string, string | undefined> = process.env): string {
  const s = env.REVIEW_HMAC_SECRET;
  if (!s || s.length < MIN_SECRET_LENGTH) throw new Error('review signing is not configured on the server');
  return s;
}

function mac(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/** Signs an arbitrary payload. Exported so tests can build tokens with chosen fields. */
export function signRaw(payload: unknown, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${mac(secret, body)}`;
}

/** Issues a token whose review window starts at nowSec. */
export function signReview(fields: ReviewFields, secret: string, nowSec: number): string {
  return signRaw({ v: TOKEN_VERSION, ...fields, issuedAt: nowSec, expiresAt: nowSec + REVIEW_TTL_SEC }, secret);
}

const B64URL = /^[A-Za-z0-9_-]+$/;
const UINT = /^\d+$/;

function payloadShapeOk(p: Record<string, unknown>): boolean {
  return typeof p.wallet === 'string' && isAddress(p.wallet)
    && typeof p.token === 'string' && isAddress(p.token)
    && typeof p.router === 'string' && isAddress(p.router) && getAddress(p.router) === ROUTER_V2
    && p.chainId === BSC_CHAIN_ID
    && typeof p.valueWei === 'string' && UINT.test(p.valueWei)
    && typeof p.minOutWei === 'string' && UINT.test(p.minOutWei)
    && typeof p.quotedOutWei === 'string' && UINT.test(p.quotedOutWei)
    && typeof p.slippageBps === 'number' && Number.isInteger(p.slippageBps)
    && typeof p.calldataDigest === 'string' && p.calldataDigest.length > 0
    && typeof p.issuedAt === 'number' && typeof p.expiresAt === 'number' && p.expiresAt > p.issuedAt;
}

/** Signature first, then shape. No clock: verification of a settled transaction must not depend on time. */
export function verifyReviewToken(token: unknown, secret: string): TokenCheck {
  if (typeof token !== 'string') return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2 || !B64URL.test(parts[0]) || !B64URL.test(parts[1])) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts;
  const want = Buffer.from(mac(secret, body));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return { ok: false, reason: 'bad_signature' };
  let raw: unknown;
  try { raw = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return { ok: false, reason: 'bad_payload' }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'bad_payload' };
  const p = raw as Record<string, unknown>;
  if (p.v !== TOKEN_VERSION) return { ok: false, reason: 'wrong_version' };
  if (!payloadShapeOk(p)) return { ok: false, reason: 'bad_payload' };
  return { ok: true, payload: p as unknown as ReviewPayload };
}

/** Expiry gates NEW authorization only. Never call this from settle or receipt. */
export function isAuthorizable(p: ReviewPayload, nowSec: number): boolean {
  return nowSec >= p.issuedAt && nowSec < p.expiresAt;
}

/** Pure. Lists every request field that differs from the signed review. Addresses compare normalised. */
export function bindingProblems(p: ReviewPayload, i: SettleInput): string[] {
  const problems: string[] = [];
  if (getAddress(i.token) !== getAddress(p.token)) problems.push('token contract differs');
  if (getAddress(i.recipient) !== getAddress(p.wallet)) problems.push('wallet differs');
  if (i.valueWei !== BigInt(p.valueWei)) problems.push('value differs');
  if (i.minOutWei !== BigInt(p.minOutWei)) problems.push('minimum output differs');
  if (i.quotedOutWei !== undefined && i.quotedOutWei !== BigInt(p.quotedOutWei)) problems.push('quoted output differs');
  return problems;
}

export interface SignedExpectation { token: `0x${string}`; recipient: `0x${string}`; valueWei: bigint; minOutWei: bigint; quotedOutWei: bigint }
export type ResolveResult = { ok: true; expected: SignedExpectation; payload: ReviewPayload } | { ok: false; error: string };

/**
 * The expectation the settle and receipt routes check the chain against. It comes only from the signed token.
 * Browser-supplied amounts are compared with the signed values and must match exactly. Pure: no clock, no state,
 * so repeated calls with the same token give the same answer.
 */
export function resolveSignedExpectation(tokenField: unknown, input: SettleInput, secret: string): ResolveResult {
  if (tokenField === undefined || tokenField === null || tokenField === '') return { ok: false, error: 'review token is required' };
  const c = verifyReviewToken(tokenField, secret);
  if (!c.ok) return { ok: false, error: 'review token is invalid' };
  const p = c.payload;
  const problems = bindingProblems(p, input);
  if (problems.length) return { ok: false, error: `request does not match the signed review: ${problems.join('; ')}` };
  return { ok: true, payload: p, expected: {
    token: getAddress(p.token), recipient: getAddress(p.wallet),
    valueWei: BigInt(p.valueWei), minOutWei: BigInt(p.minOutWei), quotedOutWei: BigInt(p.quotedOutWei) } };
}
