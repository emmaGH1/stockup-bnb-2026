import { describe, it, expect } from 'vitest';
import { parseSettleInput } from '../src/lib/settle-input';

const HASH = '0x' + 'ab'.repeat(32);
const TOKEN = '0x4553cfe1c09f37f38b12dc509f676964e392f8fc';
const ME = '0x000000000000000000000000000000000000bEEF';
const good = { txHash: HASH, token: TOKEN, recipient: ME, valueWei: '5000000000000000', minOutWei: '1000', quotedOutWei: '1600' };
const err = (b: unknown) => { const r = parseSettleInput(b); expect(r.ok).toBe(false); return r.ok ? '' : r.error; };

describe('parseSettleInput (settlement route input)', () => {
  it('accepts a well-formed request and returns bigints', () => {
    const r = parseSettleInput(good);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.valueWei).toBe(5n * 10n ** 15n); expect(r.value.minOutWei).toBe(1000n); expect(r.value.quotedOutWei).toBe(1600n); }
  });
  it('quotedOutWei is optional; minOut equal to quote is allowed', () => {
    expect(parseSettleInput({ ...good, quotedOutWei: undefined }).ok).toBe(true);
    expect(parseSettleInput({ ...good, minOutWei: '1600', quotedOutWei: '1600' }).ok).toBe(true);
  });
  it('rejects non-object bodies and arrays', () => {
    expect(err(null)).toMatch(/JSON object/);
    expect(err([good])).toMatch(/JSON object/);
    expect(err('x')).toMatch(/JSON object/);
  });
  it('rejects a malformed transaction hash', () => {
    expect(err({ ...good, txHash: '0x12' })).toMatch(/txHash/);
    expect(err({ ...good, txHash: 'ab'.repeat(32) })).toMatch(/txHash/);
  });
  it('rejects invalid token or recipient addresses', () => {
    expect(err({ ...good, token: '0x123' })).toMatch(/token/);
    expect(err({ ...good, recipient: 'nope' })).toMatch(/recipient/);
    expect(err({ ...good, recipient: undefined })).toMatch(/recipient/);
  });
  it('rejects non-integer, negative, signed, hex or fractional amounts', () => {
    for (const bad of ['1.5', '-1', '+5', '0x10', '1e3', '', ' 5', 5.5, true, {}]) {
      expect(err({ ...good, valueWei: bad })).toMatch(/valueWei/);
    }
    expect(err({ ...good, minOutWei: '-1' })).toMatch(/minOutWei/);
  });
  it('rejects zero value and zero minOut (the caller cannot weaken the expectation to nothing)', () => {
    expect(err({ ...good, valueWei: '0' })).toMatch(/greater than zero/);
    expect(err({ ...good, minOutWei: '0' })).toMatch(/greater than zero/);
  });
  it('rejects a minimum above the quote (internally inconsistent expectation)', () => {
    expect(err({ ...good, minOutWei: '1700', quotedOutWei: '1600' })).toMatch(/cannot exceed/);
  });
  it('rejects a quote that is malformed, even though it is optional', () => {
    expect(err({ ...good, quotedOutWei: 'abc' })).toMatch(/quotedOutWei/);
  });
  it('does not coerce a number that exceeds safe integer range silently; keeps full precision', () => {
    const big = '123456789012345678901234567890';
    const r = parseSettleInput({ ...good, valueWei: big, minOutWei: '1', quotedOutWei: big });
    expect(r.ok && r.value.valueWei).toBe(BigInt(big));
  });
});
