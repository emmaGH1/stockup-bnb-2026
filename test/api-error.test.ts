import { describe, it, expect } from 'vitest';
import { errorResponseBody, GENERIC_SERVER_ERROR, isInputError } from '../src/lib/api-error';

const err = (m: string) => errorResponseBody(new Error(m));

describe('API error classification', () => {
  it('returns input errors as 400 with the message (the UI shows this text)', () => {
    expect(err('spend must be >0 and <= 10000 USD')).toEqual({ status: 400, body: { error: 'spend must be >0 and <= 10000 USD' } });
    expect(err('invest share must be 0.01%-20%').status).toBe(400);
    expect(err('recipient must be a valid BSC address').status).toBe(400);
    expect(err('amount must be >0 and <= 0.05 BNB').status).toBe(400);
    expect(err('request body too large').status).toBe(400);
    expect(err('txHash must be a 32-byte hash').status).toBe(400);
    expect(err('minOutWei cannot exceed quotedOutWei').status).toBe(400);
  });
  it('returns upstream and system faults as a generic 500 with no internal detail', () => {
    for (const m of ['HTTP 503', 'unexpected list response', 'invalid BNB price', 'BNB price source too thin', 'W3W credentials not configured',
      'Error: connect ECONNREFUSED 10.0.0.5:8545', 'SyntaxError: Unexpected token < in JSON at position 0']) {
      const r = err(m);
      expect(r.status).toBe(500);
      expect(r.body.error).toBe(GENERIC_SERVER_ERROR);
      expect(JSON.stringify(r.body)).not.toMatch(/10\.0\.0\.5|ECONNREFUSED|SyntaxError|W3W|HTTP 503/);
    }
  });
  it('non-Error throws and empty messages are generic 500', () => {
    expect(errorResponseBody('boom').status).toBe(500);
    expect(errorResponseBody(undefined).status).toBe(500);
    expect(errorResponseBody(new Error('')).status).toBe(500);
  });
  it('the allow-list is prefix-based and does not match a message that merely contains an input phrase', () => {
    expect(isInputError('upstream said: invalid address')).toBe(false);
    expect(isInputError('invalid address')).toBe(true);
    expect(isInputError('invalid address: 0xabc (rpc returned HTTP 500 at https://internal)')).toBe(true);
  });
  it('documents a known limit: a parameterised input message that embeds upstream text is still returned', () => {
    // The prefix match keeps the caller's own wording. If an input message ever interpolated upstream text, it
    // would be returned. Keep input messages free of interpolated upstream data.
    const r = err('amount must be >0 and <= 0.05 BNB');
    expect(r.status).toBe(400);
  });
});
