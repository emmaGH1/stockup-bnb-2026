import { describe, it, expect } from 'vitest';
import { getAddress } from 'viem';
import { bindReleasedTrade, type ReleasedTrade } from '../src/lib/review-policy';
import { verifyReviewToken, REVIEW_TTL_SEC } from '../src/lib/review-token';

const SECRET = 'x'.repeat(48);
const NOW = 1_800_000_000;
const trade: ReleasedTrade = {
  wallet: getAddress('0x000000000000000000000000000000000000bEEF'),
  token: getAddress('0x4553cfe1c09f37f38b12dC509F676964e392F8Fc'),
  valueWei: '6664450000000000', minOutWei: '18838418115464810', quotedOutWei: '19028705167136172',
  slippageBps: 100, calldataDigest: '0x6174590262be57b5',
};

describe('released trade binding (/api/own)', () => {
  it('with a secret: bound, token verifies, expiry is the review window, fields come from the released trade', () => {
    const b = bindReleasedTrade(trade, NOW, { REVIEW_HMAC_SECRET: SECRET });
    expect(b.reviewBound).toBe(true);
    expect(b.reviewExpiresAt).toBe(NOW + REVIEW_TTL_SEC);
    const v = verifyReviewToken(b.reviewToken, SECRET);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payload.wallet).toBe(trade.wallet);
      expect(v.payload.minOutWei).toBe(trade.minOutWei);
      expect(v.payload.calldataDigest).toBe(trade.calldataDigest);
    }
  });
  it('without a secret: not bound, no token invented, nothing thrown', () => {
    expect(bindReleasedTrade(trade, NOW, {})).toEqual({ reviewToken: null, reviewExpiresAt: null, reviewBound: false });
  });
  it('a token from the binding is refused by a different secret', () => {
    const b = bindReleasedTrade(trade, NOW, { REVIEW_HMAC_SECRET: SECRET });
    expect(verifyReviewToken(b.reviewToken, 'y'.repeat(48)).ok).toBe(false);
  });
});
