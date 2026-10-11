// Backend policy for the signed review token. Pure except for reading env.
//
// Issuance: /api/own attaches a token when a transaction is released and the server has REVIEW_HMAC_SECRET.
// Verification: /api/settle and /api/receipt check the signed expectation when the browser sends `reviewToken`.
//
// Compatibility: the current UI does not send `reviewToken`, so by default a request without one is still accepted
// with the browser's values (legacy). Setting REVIEW_TOKEN_REQUIRED=1 refuses those requests. Turn it on only after
// the UI agent ships the request-shape change (docs/UI_REQUEST_CONTRACT.md).
import { getAddress } from 'viem';
import { ROUTER_V2 } from './swap';
import { BSC_CHAIN_ID, REVIEW_TTL_SEC, getReviewSecret, resolveSignedExpectation, signReview, type ReviewFields } from './review-token';
import type { SettleInput } from './settle-input';

export type Env = Record<string, string | undefined>;

export function reviewTokenRequired(env: Env = process.env): boolean {
  return env.REVIEW_TOKEN_REQUIRED === '1';
}

export interface ExpectationValues { token: string; recipient: string; valueWei: bigint; minOutWei: bigint; quotedOutWei?: bigint }
export type Expectation =
  | { ok: true; mode: 'signed' | 'legacy'; expected: ExpectationValues }
  | { ok: false; error: string };

/**
 * The expectation the chain is checked against.
 *  - A `reviewToken` in the body: verified against the server secret. Browser values must match the signed ones.
 *    A signing-secret misconfiguration throws (the route turns it into a generic 500).
 *  - No token and REVIEW_TOKEN_REQUIRED=1: refused.
 *  - No token otherwise: legacy, the browser's values (the path the current UI uses).
 */
export function expectationFor(body: { reviewToken?: unknown }, input: SettleInput, env: Env = process.env): Expectation {
  const tok = body.reviewToken;
  if (tok !== undefined && tok !== null && tok !== '') {
    const r = resolveSignedExpectation(tok, input, getReviewSecret(env));
    return r.ok ? { ok: true, mode: 'signed', expected: r.expected } : { ok: false, error: r.error };
  }
  if (reviewTokenRequired(env)) return { ok: false, error: 'review token is required' };
  return { ok: true, mode: 'legacy', expected: {
    token: input.token, recipient: input.recipient, valueWei: input.valueWei, minOutWei: input.minOutWei, quotedOutWei: input.quotedOutWei } };
}

export interface ReleasedTrade {
  wallet: string; token: string; valueWei: string; minOutWei: string; quotedOutWei: string; slippageBps: number; calldataDigest: string;
}

/** Pure. Builds the bound fields from a released trade. The router and chain are fixed by the server, not the caller. */
export function reviewFieldsFor(t: ReleasedTrade): ReviewFields {
  return { wallet: getAddress(t.wallet), token: getAddress(t.token), router: ROUTER_V2, chainId: BSC_CHAIN_ID,
    valueWei: t.valueWei, minOutWei: t.minOutWei, quotedOutWei: t.quotedOutWei, slippageBps: t.slippageBps, calldataDigest: t.calldataDigest };
}

/** Issues a token for a released trade, or null when the server has no signing secret (the trade is then unbound). */
export function issueReviewToken(t: ReleasedTrade, nowSec: number, env: Env = process.env): { reviewToken: string; expiresAt: number } | null {
  let secret: string;
  try { secret = getReviewSecret(env); } catch { return null; }
  return { reviewToken: signReview(reviewFieldsFor(t), secret, nowSec), expiresAt: nowSec + REVIEW_TTL_SEC };
}

export interface ReviewBinding { reviewToken: string | null; reviewExpiresAt: number | null; reviewBound: boolean }

/**
 * Binds a released trade to a signed token for /api/own. When the server has no signing secret the trade is NOT bound:
 * the response says so (reviewBound: false, reviewToken: null) and no token is invented. Settle and receipt then run in
 * legacy mode until REVIEW_TOKEN_REQUIRED=1.
 */
export function bindReleasedTrade(t: ReleasedTrade, nowSec: number, env: Env = process.env): ReviewBinding {
  const issued = issueReviewToken(t, nowSec, env);
  return issued
    ? { reviewToken: issued.reviewToken, reviewExpiresAt: issued.expiresAt, reviewBound: true }
    : { reviewToken: null, reviewExpiresAt: null, reviewBound: false };
}
