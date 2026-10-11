import { describe, it, expect } from 'vitest';
import {
  reviewErrorText, reviewTokenFor, isAuthorizationExpired, GENERIC_UI_FAILURE, EXPIRED_AUTHORIZATION,
} from '../src/lib/review-messages';

describe('reviewErrorText (UI_REQUEST_CONTRACT section 2, step 3)', () => {
  it('maps the three review errors to the plain-language copy', () => {
    expect(reviewErrorText('review token is required')).toBe('This check is out of date. Run the check again.');
    expect(reviewErrorText('review token is invalid')).toBe('This check could not be confirmed. Run the check again.');
    expect(reviewErrorText('request does not match the signed review: minimum output differs'))
      .toBe('The details differ from the check. Run the check again.');
  });
  it('maps the generic server failure to the contract text', () => {
    expect(reviewErrorText('The server could not complete this request. Nothing was sent.')).toBe(GENERIC_UI_FAILURE);
    expect(GENERIC_UI_FAILURE).toBe('Stockup could not check this right now. Nothing was sent.');
  });
  it('never shows internal or unlisted server text', () => {
    const leaks = ['ECONNREFUSED 10.0.0.5:8545', 'review signing is not configured on the server',
      'SyntaxError: Unexpected token < in JSON', 'spend must be >0 and <= 10000 USD', '', 42, undefined, null, {}];
    for (const raw of leaks) {
      const shown = reviewErrorText(raw);
      expect(shown).toBe(GENERIC_UI_FAILURE);
      if (typeof raw === 'string' && raw) expect(shown).not.toContain(raw);
    }
  });
  it('matches the whole server message, not a phrase inside it', () => {
    expect(reviewErrorText('upstream said: review token is invalid')).toBe(GENERIC_UI_FAILURE);
    expect(reviewErrorText('review token is invalid, retry later')).toBe(GENERIC_UI_FAILURE);
  });
});

describe('reviewTokenFor (token is sent only when present)', () => {
  it('returns the token only for a non-empty string', () => {
    expect(reviewTokenFor({ reviewToken: 'abc.def' })).toBe('abc.def');
  });
  it('returns null for missing, null, empty or non-string values (legacy mode, field omitted)', () => {
    expect(reviewTokenFor(null)).toBeNull();
    expect(reviewTokenFor(undefined)).toBeNull();
    expect(reviewTokenFor({})).toBeNull();
    expect(reviewTokenFor({ reviewToken: null })).toBeNull();
    expect(reviewTokenFor({ reviewToken: '' })).toBeNull();
    expect(reviewTokenFor({ reviewToken: 7 })).toBeNull();
  });
});

describe('isAuthorizationExpired (window gates new authorization only)', () => {
  const EXP = 1_800_000_900;
  it('no window (legacy, reviewExpiresAt null or missing) never expires', () => {
    expect(isAuthorizationExpired(null, 9e15)).toBe(false);
    expect(isAuthorizationExpired(undefined, 9e15)).toBe(false);
  });
  it('allowed strictly before reviewExpiresAt', () => {
    expect(isAuthorizationExpired(EXP, (EXP - 1) * 1000)).toBe(false);
  });
  it('refused at and after reviewExpiresAt', () => {
    expect(isAuthorizationExpired(EXP, EXP * 1000)).toBe(true);
    expect(isAuthorizationExpired(EXP, (EXP + 3600) * 1000)).toBe(true);
  });
  it('the expiry copy is the contract copy', () => {
    expect(EXPIRED_AUTHORIZATION).toBe('This check has expired. Run the check again.');
  });
});
