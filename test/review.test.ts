import { describe, it, expect } from 'vitest';
import { encodeFunctionData, parseAbi, getAddress } from 'viem';
import { verifyAndDescribe } from '../src/lib/review';
import { ROUTER_V2, WBNB } from '../src/lib/swap';

const abi = parseAbi(['function swapExactETHForTokens(uint256,address[],address,uint256) payable returns (uint256[])']);
const TOKEN = '0x4553cfe1c09f37f38b12dc509f676964e392f8fc', ME = '0x1234567890123456789012345678901234567890', NOW = 1_800_000_000;
const mk = (o: { min?: bigint; path?: string[]; to?: string; dl?: number } = {}) => encodeFunctionData({ abi, functionName: 'swapExactETHForTokens',
  args: [o.min ?? 1000n, (o.path ?? [WBNB, getAddress(TOKEN)]) as `0x${string}`[], getAddress(o.to ?? ME), BigInt(o.dl ?? NOW + 120)] });
const exp = { token: TOKEN, recipient: ME, valueWei: 5n * 10n ** 15n, minOutWei: 1000n, nowSec: NOW, maxTtlSec: 120 };
const tx = (data: string, to: string = ROUTER_V2, value = '0x' + (5n * 10n ** 15n).toString(16)) => ({ to, data, value, chainId: 56 });

describe('verifyAndDescribe', () => {
  it('accepts matching calldata and describes it from the calldata', () => {
    const r = verifyAndDescribe(tx(mk()), exp);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.review.sendsBnb).toBe('0.005'); expect(r.review.secondsLeft).toBe(120); expect(r.review.receivesToken).toBe(getAddress(TOKEN)); expect(r.review.calldataDigest).toMatch(/^0x[0-9a-f]{16}$/); }
  });
  it('rejects every kind of tampering', () => {
    const bad = (r: ReturnType<typeof verifyAndDescribe>, re: RegExp) => { expect(r.ok).toBe(false); if (!r.ok) expect(r.problems.join()).toMatch(re); };
    bad(verifyAndDescribe(tx(mk({ to: '0x000000000000000000000000000000000000dEaD' })), exp), /different address/);
    bad(verifyAndDescribe(tx(mk({ min: 1n })), exp), /minimum output/);
    bad(verifyAndDescribe(tx(mk({ path: [WBNB, getAddress('0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4')] })), exp), /swap path/);
    bad(verifyAndDescribe(tx(mk(), '0x000000000000000000000000000000000000dEaD'), exp), /router/);
    bad(verifyAndDescribe(tx(mk(), ROUTER_V2, '0x1'), exp), /value differs/);
    bad(verifyAndDescribe(tx(mk({ dl: NOW - 1 })), exp), /deadline already passed/);
    bad(verifyAndDescribe(tx(mk({ dl: NOW + 9999 })), exp), /further out/);
    bad(verifyAndDescribe(tx('0xdeadbeef'), exp), /not swapExactETHForTokens/);
    bad(verifyAndDescribe({ ...tx(mk()), chainId: 1 }, exp), /chainId/);
  });
});
