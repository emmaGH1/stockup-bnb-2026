import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import { expectationFor, issueReviewToken, reviewFieldsFor, reviewTokenRequired, type ReleasedTrade } from '../src/lib/review-policy';
import { verifyReviewToken, REVIEW_TTL_SEC } from '../src/lib/review-token';
import { ROUTER_V2 } from '../src/lib/swap';
import type { SettleInput } from '../src/lib/settle-input';

const SECRET = 'x'.repeat(48);
const ENV_OK = { REVIEW_HMAC_SECRET: SECRET };
const WALLET = getAddress('0x000000000000000000000000000000000000bEEF');
const TOKEN = getAddress('0x4553cfe1c09f37f38b12dC509F676964e392F8Fc');
const NOW = 1_800_000_000;
const HASH = '0x' + 'ab'.repeat(32);

const trade: ReleasedTrade = {
  wallet: WALLET, token: TOKEN, valueWei: '6664450000000000', minOutWei: '18838418115464810',
  quotedOutWei: '19028705167136172', slippageBps: 100, calldataDigest: '0x6174590262be57b5',
};
const input = (over: Partial<SettleInput> = {}): SettleInput => ({
  txHash: HASH, token: TOKEN, recipient: WALLET, valueWei: 6664450000000000n,
  minOutWei: 18838418115464810n, quotedOutWei: 19028705167136172n, ...over,
});

describe('review policy: when a token is required', () => {
  it('only REVIEW_TOKEN_REQUIRED=1 turns the requirement on', () => {
    expect(reviewTokenRequired({ REVIEW_TOKEN_REQUIRED: '1' })).toBe(true);
    expect(reviewTokenRequired({ REVIEW_TOKEN_REQUIRED: 'true' })).toBe(false);
    expect(reviewTokenRequired({ REVIEW_TOKEN_REQUIRED: '0' })).toBe(false);
    expect(reviewTokenRequired({})).toBe(false);
  });
});

describe('review policy: expectationFor', () => {
  it('no token and no requirement: legacy mode uses the browser values (current UI path)', () => {
    const r = expectationFor({}, input(), {});
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.mode).toBe('legacy'); expect(r.expected.minOutWei).toBe(18838418115464810n); expect(r.expected.recipient).toBe(WALLET); }
  });
  it('no token and REVIEW_TOKEN_REQUIRED=1: refused', () => {
    const r = expectationFor({}, input(), { REVIEW_TOKEN_REQUIRED: '1' });
    expect(r).toEqual({ ok: false, error: 'review token is required' });
  });
  it('null or empty-string token counts as absent', () => {
    expect(expectationFor({ reviewToken: null }, input(), {}).ok).toBe(true);
    expect(expectationFor({ reviewToken: '' }, input(), { REVIEW_TOKEN_REQUIRED: '1' })).toEqual({ ok: false, error: 'review token is required' });
  });
  it('a valid token with matching values: signed mode, expectation comes from the token', () => {
    const issued = issueReviewToken(trade, NOW, ENV_OK);
    expect(issued).not.toBeNull();
    const r = expectationFor({ reviewToken: issued!.reviewToken }, input(), ENV_OK);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.mode).toBe('signed'); expect(r.expected.minOutWei).toBe(18838418115464810n); }
  });
  it('a valid token with a weaker browser minimum is refused in signed mode', () => {
    const issued = issueReviewToken(trade, NOW, ENV_OK);
    const r = expectationFor({ reviewToken: issued!.reviewToken }, input({ minOutWei: 1n }), ENV_OK);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/minimum output differs/) } as never);
    expect(r.ok).toBe(false);
  });
  it('a token presented without a signing secret on the server throws (route returns a generic 500)', () => {
    const issued = issueReviewToken(trade, NOW, ENV_OK);
    expect(() => expectationFor({ reviewToken: issued!.reviewToken }, input(), {})).toThrow(/not configured/);
  });
  it('a token signed with a different secret is refused as invalid', () => {
    const forged = issueReviewToken(trade, NOW, { REVIEW_HMAC_SECRET: 'y'.repeat(48) });
    const r = expectationFor({ reviewToken: forged!.reviewToken }, input(), ENV_OK);
    expect(r).toEqual({ ok: false, error: 'review token is invalid' });
  });
});

describe('review policy: reviewFieldsFor and issueReviewToken', () => {
  it('fixes the router and chain on the server, and normalises addresses', () => {
    const f = reviewFieldsFor({ ...trade, wallet: WALLET.toLowerCase() as `0x${string}` });
    expect(f.router).toBe(ROUTER_V2);
    expect(f.chainId).toBe(56);
    expect(f.wallet).toBe(WALLET);
  });
  it('issues nothing when the server has no signing secret (trade stays unbound, no fake token)', () => {
    expect(issueReviewToken(trade, NOW, {})).toBeNull();
    expect(issueReviewToken(trade, NOW, { REVIEW_HMAC_SECRET: 'short' })).toBeNull();
  });
  it('an issued token verifies, binds the released trade, and expires after the review window', () => {
    const issued = issueReviewToken(trade, NOW, ENV_OK)!;
    expect(issued.expiresAt).toBe(NOW + REVIEW_TTL_SEC);
    const v = verifyReviewToken(issued.reviewToken, SECRET);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payload.wallet).toBe(WALLET);
      expect(v.payload.token).toBe(TOKEN);
      expect(v.payload.minOutWei).toBe(trade.minOutWei);
      expect(v.payload.calldataDigest).toBe(trade.calldataDigest);
      expect(v.payload.expiresAt).toBe(NOW + REVIEW_TTL_SEC);
    }
  });
});
