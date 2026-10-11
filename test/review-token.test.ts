import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import {
  signReview, signRaw, verifyReviewToken, isAuthorizable, bindingProblems, resolveSignedExpectation,
  getReviewSecret, REVIEW_TTL_SEC, type ReviewFields, type ReviewPayload,
} from '../src/lib/review-token';
import { ROUTER_V2 } from '../src/lib/swap';
import type { SettleInput } from '../src/lib/settle-input';

const SECRET = 'x'.repeat(48);
const OTHER = 'y'.repeat(48);
const WALLET = getAddress('0x000000000000000000000000000000000000bEEF');
const OTHER_WALLET = getAddress('0x0000000000000000000000000000000000000abc');
const TOKEN = getAddress('0x4553cfe1c09f37f38b12dC509F676964e392F8Fc');
const WRONG_TOKEN = getAddress('0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4');
const NOW = 1_800_000_000;
const HASH = '0x' + 'ab'.repeat(32);

const fields: ReviewFields = {
  wallet: WALLET, token: TOKEN, router: ROUTER_V2, chainId: 56,
  valueWei: '6664450000000000', minOutWei: '18838418115464810', quotedOutWei: '19028705167136172',
  slippageBps: 100, calldataDigest: '0x6174590262be57b5',
};
const input = (over: Partial<SettleInput> = {}): SettleInput => ({
  txHash: HASH, token: TOKEN, recipient: WALLET, valueWei: 6664450000000000n,
  minOutWei: 18838418115464810n, quotedOutWei: 19028705167136172n, ...over,
});
const token = (over: Partial<ReviewFields> = {}, now = NOW) => signReview({ ...fields, ...over }, SECRET, now);

describe('review token: signature and tampering', () => {
  it('a freshly signed token verifies and returns the bound fields', () => {
    const r = verifyReviewToken(token(), SECRET);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.payload.wallet).toBe(WALLET); expect(r.payload.minOutWei).toBe(fields.minOutWei); }
  });
  it('a body edited after signing (lower minimum) fails the signature', () => {
    const good = token();
    const [, sig] = good.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, ...fields, minOutWei: '1', issuedAt: NOW, expiresAt: NOW + REVIEW_TTL_SEC }), 'utf8').toString('base64url');
    expect(verifyReviewToken(`${forged}.${sig}`, SECRET)).toEqual({ ok: false, reason: 'bad_signature' });
  });
  it('a token signed with a different secret is rejected', () => {
    expect(verifyReviewToken(signReview(fields, OTHER, NOW), SECRET)).toEqual({ ok: false, reason: 'bad_signature' });
  });
  it('a truncated or altered signature is rejected', () => {
    const t = token();
    expect(verifyReviewToken(t.slice(0, -2), SECRET).ok).toBe(false);
    expect(verifyReviewToken(t.slice(0, -1) + 'A', SECRET).ok).toBe(false);
  });
  it('malformed inputs are refused without throwing', () => {
    for (const bad of [undefined, null, 42, '', 'no-dot', 'a.b.c', 'bad base64!.sig', {}]) {
      expect(verifyReviewToken(bad, SECRET)).toEqual({ ok: false, reason: 'malformed' });
    }
  });
  it('a correctly signed payload with a wrong version or shape is refused', () => {
    expect(verifyReviewToken(signRaw({ ...fields, v: 2, issuedAt: NOW, expiresAt: NOW + 60 }, SECRET), SECRET)).toEqual({ ok: false, reason: 'wrong_version' });
    expect(verifyReviewToken(signRaw({ v: 1, ...fields, chainId: 1, issuedAt: NOW, expiresAt: NOW + 60 }, SECRET), SECRET)).toEqual({ ok: false, reason: 'bad_payload' });
    expect(verifyReviewToken(signRaw({ v: 1, ...fields, router: WRONG_TOKEN, issuedAt: NOW, expiresAt: NOW + 60 }, SECRET), SECRET)).toEqual({ ok: false, reason: 'bad_payload' });
    expect(verifyReviewToken(signRaw({ v: 1, ...fields, valueWei: '-1', issuedAt: NOW, expiresAt: NOW + 60 }, SECRET), SECRET)).toEqual({ ok: false, reason: 'bad_payload' });
  });
});

describe('review token: expiry gates new authorization only', () => {
  it('verification still succeeds long after the review window (settled transactions stay checkable)', () => {
    const t = token({}, NOW);
    const verified = verifyReviewToken(t, SECRET);
    expect(verified.ok).toBe(true);
    // Verification has no clock, so a day later the same token still verifies.
    expect(verifyReviewToken(t, SECRET).ok).toBe(true);
    expect(resolveSignedExpectation(t, input(), SECRET).ok).toBe(true);
  });
  it('authorization is allowed inside the window and refused at and after expiry', () => {
    const p = (verifyReviewToken(token({}, NOW), SECRET) as { ok: true; payload: ReviewPayload }).payload;
    expect(isAuthorizable(p, NOW)).toBe(true);
    expect(isAuthorizable(p, NOW + REVIEW_TTL_SEC - 1)).toBe(true);
    expect(isAuthorizable(p, NOW + REVIEW_TTL_SEC)).toBe(false);
    expect(isAuthorizable(p, NOW - 1)).toBe(false);
  });
  it('the review window is the proposed 15 minutes', () => {
    expect(REVIEW_TTL_SEC).toBe(15 * 60);
  });
});

describe('review token: binding to wallet, asset, amounts', () => {
  const sealed = token();
  it('an identical request resolves to the signed expectation', () => {
    const r = resolveSignedExpectation(sealed, input(), SECRET);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.expected.recipient).toBe(WALLET); expect(r.expected.token).toBe(TOKEN); expect(r.expected.minOutWei).toBe(18838418115464810n); }
  });
  it('a different wallet is refused', () => {
    const r = resolveSignedExpectation(sealed, input({ recipient: OTHER_WALLET }), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toMatch(/wallet differs/);
  });
  it('a different asset (token contract) is refused', () => {
    const r = resolveSignedExpectation(sealed, input({ token: WRONG_TOKEN }), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toMatch(/token contract differs/);
  });
  it('a weaker browser minimum is refused, even though the signed token is valid', () => {
    const r = resolveSignedExpectation(sealed, input({ minOutWei: 1n }), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toMatch(/minimum output differs/);
  });
  it('a different input value is refused', () => {
    const r = resolveSignedExpectation(sealed, input({ valueWei: 1n }), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toMatch(/value differs/);
  });
  it('a different quote is refused when the browser supplies one', () => {
    const r = resolveSignedExpectation(sealed, input({ quotedOutWei: 1n }), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toMatch(/quoted output differs/);
  });
  it('a missing quote from the browser is allowed (the signed quote is used)', () => {
    const r = resolveSignedExpectation(sealed, input({ quotedOutWei: undefined }), SECRET);
    expect(r.ok).toBe(true);
  });
  it('bindingProblems lists every mismatch at once', () => {
    const p = (verifyReviewToken(sealed, SECRET) as { ok: true; payload: ReviewPayload }).payload;
    expect(bindingProblems(p, input({ recipient: OTHER_WALLET, minOutWei: 1n, valueWei: 2n })).length).toBe(3);
  });
  it('a missing token is refused with a clear message', () => {
    const r = resolveSignedExpectation(undefined, input(), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toBe('review token is required');
  });
  it('a tampered token is reported as invalid, not as a binding mismatch', () => {
    const r = resolveSignedExpectation(sealed.slice(0, -1) + 'A', input(), SECRET);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.error).toBe('review token is invalid');
  });
});

describe('review token: repeated verification and secret handling', () => {
  it('the same token and request give the same answer every time (no replay state)', () => {
    const t = token();
    const results = [1, 2, 3].map(() => resolveSignedExpectation(t, input(), SECRET).ok);
    expect(results).toEqual([true, true, true]);
  });
  it('a failed binding does not poison a later valid request', () => {
    const t = token();
    expect(resolveSignedExpectation(t, input({ minOutWei: 1n }), SECRET).ok).toBe(false);
    expect(resolveSignedExpectation(t, input(), SECRET).ok).toBe(true);
  });
  it('a missing or short secret fails closed and the error never echoes the value', () => {
    expect(() => getReviewSecret({})).toThrow(/not configured/);
    const short = 'shortvalue';
    try { getReviewSecret({ REVIEW_HMAC_SECRET: short }); throw new Error('no throw'); }
    catch (e) { expect(String(e)).not.toContain(short); expect(String(e)).toMatch(/not configured/); }
  });
  it('a configured secret of sufficient length is returned', () => {
    expect(getReviewSecret({ REVIEW_HMAC_SECRET: SECRET })).toBe(SECRET);
  });
});
