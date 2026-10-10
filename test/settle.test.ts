import { describe, it, expect } from 'vitest';
import { encodeFunctionData, encodeAbiParameters, parseAbi, getAddress, pad, type PublicClient } from 'viem';
import { verifySettlement, isFinal } from '../src/lib/settle';
import { ROUTER_V2, WBNB } from '../src/lib/swap';

const abi = parseAbi(['function swapExactETHForTokens(uint256,address[],address,uint256) payable returns (uint256[])']);
const TOKEN = getAddress('0x4553cfe1c09f37f38b12dc509f676964e392f8fc'), ME = getAddress('0x1234567890123456789012345678901234567890');
const VALUE = 5n * 10n ** 15n, MIN = 1000n;
const input = encodeFunctionData({ abi, functionName: 'swapExactETHForTokens', args: [MIN, [WBNB, TOKEN], ME, 9_999_999_999n] });
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const log = (to: string, amount: bigint, addr = TOKEN) => ({ address: addr, topics: [TRANSFER, pad('0x0000000000000000000000000000000000000001'), pad(to as `0x${string}`)], data: encodeAbiParameters([{ type: 'uint256' }], [amount]) });

function fake(o: { tx?: object | null; receipt?: object | null; latest?: bigint } = {}) {
  const tx = o.tx === undefined ? { to: ROUTER_V2, value: VALUE, input, from: ME } : o.tx;
  const receipt = o.receipt === undefined ? { status: 'success', blockNumber: 100n, gasUsed: 100_000n, effectiveGasPrice: 1_000_000_000n, logs: [log(ME, 1500n)] } : o.receipt;
  return { getTransaction: async () => { if (!tx) throw new Error('nf'); return tx; }, getTransactionReceipt: async () => { if (!receipt) throw new Error('nf'); return receipt; },
    getBlockNumber: async () => o.latest ?? 105n } as unknown as PublicClient;
}
const exp = { token: TOKEN, recipient: ME, valueWei: VALUE, minOutWei: MIN, quotedOutWei: 1600n };
const H = '0x' + 'ab'.repeat(32);

describe('verifySettlement', () => {
  it('settled: success, matches, credited >= minOut, reports slippage vs quote', async () => {
    const s = await verifySettlement(H, exp, fake());
    expect(s.state).toBe('settled');
    if (s.state === 'settled') { expect(s.receivedTokens).toBe('0.0000000000000015'); expect(s.confirmations).toBe(6); expect(s.vsQuotedBps).toBe(625); expect(isFinal(s)).toBe(true); }
  });
  it('not final until enough confirmations', async () => {
    expect(isFinal(await verifySettlement(H, exp, fake({ latest: 100n })))).toBe(false);
  });
  it('pending when mined receipt is missing; not_found when tx is unknown; invalid hash', async () => {
    expect((await verifySettlement(H, exp, fake({ receipt: null }))).state).toBe('pending');
    expect((await verifySettlement(H, exp, fake({ tx: null }))).state).toBe('not_found');
    expect((await verifySettlement('0x12', exp, fake())).state).toBe('not_found');
  });
  it('reverted: says no tokens were received', async () => {
    const s = await verifySettlement(H, exp, fake({ receipt: { status: 'reverted', blockNumber: 100n, logs: [], gasUsed: 1n, effectiveGasPrice: 1n } }));
    expect(s.state).toBe('reverted'); if (s.state === 'reverted') expect(s.detail).toMatch(/No tokens/);
  });
  it('mismatch: received less than minimum, wrong token logs, wrong target, no credit', async () => {
    const m = async (o: Parameters<typeof fake>[0]) => { const s = await verifySettlement(H, exp, fake(o)); return s.state === 'mismatch' ? s.problems.join() : s.state; };
    expect(await m({ receipt: { status: 'success', blockNumber: 1n, gasUsed: 1n, effectiveGasPrice: 1n, logs: [log(ME, 999n)] } })).toMatch(/less than the authorized minimum/);
    expect(await m({ receipt: { status: 'success', blockNumber: 1n, gasUsed: 1n, effectiveGasPrice: 1n, logs: [log(ME, 5000n, getAddress('0x390a684ef9cade28a7ad0dfa61ab1eb3842618c4'))] } })).toMatch(/no token Transfer/);
    expect(await m({ receipt: { status: 'success', blockNumber: 1n, gasUsed: 1n, effectiveGasPrice: 1n, logs: [log('0x000000000000000000000000000000000000dEaD', 5000n)] } })).toMatch(/no token Transfer/);
    expect(await m({ tx: { to: '0x000000000000000000000000000000000000dEaD', value: VALUE, input, from: ME } })).toMatch(/router/);
    expect(await m({ tx: { to: ROUTER_V2, value: 1n, input, from: ME } })).toMatch(/differs from the authorized/);
  });
});
