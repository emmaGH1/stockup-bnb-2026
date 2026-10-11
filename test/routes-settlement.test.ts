import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAddress } from 'viem';

// The routes call the chain through these two modules. They are mocked so the tests check what the routes
// send to the chain check, with no network access.
const verifySettlement = vi.fn();
const issueReceipt = vi.fn();
vi.mock('@/lib/settle', () => ({ verifySettlement: (...a: unknown[]) => verifySettlement(...a) }));
vi.mock('@/lib/receipt', () => ({ issueReceipt: (...a: unknown[]) => issueReceipt(...a) }));

import { POST as settlePOST } from '../src/app/api/settle/route';
import { POST as receiptPOST } from '../src/app/api/receipt/route';
import { signReview, verifyReviewToken } from '../src/lib/review-token';
import { ROUTER_V2 } from '../src/lib/swap';

const SECRET = 'x'.repeat(48);
const NOW = Math.floor(Date.now() / 1000);
const WALLET = getAddress('0x000000000000000000000000000000000000bEEF');
const OTHER = getAddress('0x0000000000000000000000000000000000000abc');
const TOKEN = getAddress('0x4553cfe1c09f37f38b12dC509F676964e392F8Fc');
const HASH = '0x' + 'ab'.repeat(32);
const SIGNED = { valueWei: '6664450000000000', minOutWei: '18838418115464810', quotedOutWei: '19028705167136172' };
const reviewToken = (over: Record<string, unknown> = {}) => signReview({
  wallet: WALLET, token: TOKEN, router: ROUTER_V2, chainId: 56, ...SIGNED, slippageBps: 100, calldataDigest: '0x6174590262be57b5', ...over,
} as never, SECRET, NOW);

const body = (over: Record<string, unknown> = {}) => ({
  txHash: HASH, token: TOKEN, recipient: WALLET, ...SIGNED, ...over,
});
const req = (b: unknown) => new Request('http://local/api/settle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
const rreq = (b: unknown) => new Request('http://local/api/receipt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

let oldSecret: string | undefined;
beforeEach(() => {
  oldSecret = process.env.REVIEW_HMAC_SECRET; process.env.REVIEW_HMAC_SECRET = SECRET; delete process.env.REVIEW_TOKEN_REQUIRED;
  verifySettlement.mockReset(); issueReceipt.mockReset();
  verifySettlement.mockResolvedValue({ state: 'settled', txHash: HASH, confirmations: 5 });
  issueReceipt.mockResolvedValue({ ok: true, receipt: { receiptId: 'SU-TEST' } });
});
afterEach(() => { if (oldSecret === undefined) delete process.env.REVIEW_HMAC_SECRET; else process.env.REVIEW_HMAC_SECRET = oldSecret; delete process.env.REVIEW_TOKEN_REQUIRED; });

describe('/api/settle with a signed review token', () => {
  it('checks the chain against the SIGNED minimum, not a weaker browser value', async () => {
    const r = await settlePOST(req(body({ minOutWei: '1', reviewToken: reviewToken() })));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/minimum output differs/);
    expect(verifySettlement).not.toHaveBeenCalled();
  });
  it('a matching request is checked against the signed values', async () => {
    const r = await settlePOST(req(body({ reviewToken: reviewToken() })));
    expect(r.status).toBe(200);
    const exp = verifySettlement.mock.calls[0][1];
    expect(exp.minOutWei).toBe(18838418115464810n);
    expect(exp.recipient).toBe(WALLET);
    expect(exp.token).toBe(TOKEN);
  });
  it('a token for another wallet is refused before any chain read', async () => {
    const r = await settlePOST(req(body({ recipient: OTHER, reviewToken: reviewToken() })));
    expect(r.status).toBe(400);
    expect(verifySettlement).not.toHaveBeenCalled();
  });
  it('a forged or tampered token is refused before any chain read', async () => {
    const t = reviewToken();
    const r = await settlePOST(req(body({ reviewToken: t.slice(0, -2) + 'AA' })));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe('review token is invalid');
    expect(verifySettlement).not.toHaveBeenCalled();
  });
  it('a token signed with a different secret is refused', async () => {
    const forged = signReview({ wallet: WALLET, token: TOKEN, router: ROUTER_V2, chainId: 56, ...SIGNED, slippageBps: 100, calldataDigest: 'x' } as never, 'y'.repeat(48), NOW);
    const r = await settlePOST(req(body({ reviewToken: forged })));
    expect(r.status).toBe(400);
    expect(verifySettlement).not.toHaveBeenCalled();
  });
  it('an expired token still verifies a settled transaction (verification has no clock)', async () => {
    const old = signReview({ wallet: WALLET, token: TOKEN, router: ROUTER_V2, chainId: 56, ...SIGNED, slippageBps: 100, calldataDigest: 'x' } as never, SECRET, NOW - 86_400);
    expect(verifyReviewToken(old, SECRET).ok).toBe(true);
    const r = await settlePOST(req(body({ reviewToken: old })));
    expect(r.status).toBe(200);
    expect(verifySettlement).toHaveBeenCalledTimes(1);
  });
  it('legacy mode (no token) still works while REVIEW_TOKEN_REQUIRED is unset', async () => {
    const r = await settlePOST(req(body()));
    expect(r.status).toBe(200);
    expect(verifySettlement.mock.calls[0][1].minOutWei).toBe(18838418115464810n);
  });
  it('REVIEW_TOKEN_REQUIRED=1 refuses a request with no token', async () => {
    process.env.REVIEW_TOKEN_REQUIRED = '1';
    const r = await settlePOST(req(body()));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe('review token is required');
    expect(verifySettlement).not.toHaveBeenCalled();
  });
  it('a token sent with no server secret returns a generic 500 and reveals no config detail', async () => {
    delete process.env.REVIEW_HMAC_SECRET;
    const r = await settlePOST(req(body({ reviewToken: 'a.b' })));
    expect(r.status).toBe(500);
    const text = await r.text();
    expect(text).not.toMatch(/REVIEW_HMAC_SECRET|not configured/);
    expect(verifySettlement).not.toHaveBeenCalled();
  });
  it('a malformed body is a 400 and never reaches the chain', async () => {
    const r = await settlePOST(req([1]));
    expect(r.status).toBe(400);
    expect(verifySettlement).not.toHaveBeenCalled();
  });
});

describe('/api/receipt with a signed review token', () => {
  it('issues the receipt for the signed token contract, after a signed check', async () => {
    const r = await receiptPOST(rreq(body({ reviewToken: reviewToken(), context: { merchantInput: 'AMAZON' } })));
    expect(r.status).toBe(200);
    expect(issueReceipt.mock.calls[0][1]).toBe(TOKEN);
    expect(verifySettlement.mock.calls[0][1].minOutWei).toBe(18838418115464810n);
  });
  it('a weaker browser minimum blocks the receipt entirely (no chain read, no receipt)', async () => {
    const r = await receiptPOST(rreq(body({ minOutWei: '1', reviewToken: reviewToken() })));
    expect(r.status).toBe(400);
    expect(verifySettlement).not.toHaveBeenCalled();
    expect(issueReceipt).not.toHaveBeenCalled();
  });
  it('a non-settled transaction gets no receipt, even with a valid token', async () => {
    verifySettlement.mockResolvedValue({ state: 'pending', detail: 'x' });
    issueReceipt.mockResolvedValue({ ok: false, reason: 'No receipt: settlement state is "pending", not settled.' });
    const r = await receiptPOST(rreq(body({ reviewToken: reviewToken() })));
    const j = await r.json();
    expect(j.ok).toBe(false);
  });
  it('an expired token still yields a receipt for a settled transaction', async () => {
    const old = signReview({ wallet: WALLET, token: TOKEN, router: ROUTER_V2, chainId: 56, ...SIGNED, slippageBps: 100, calldataDigest: 'x' } as never, SECRET, NOW - 86_400);
    const r = await receiptPOST(rreq(body({ reviewToken: old })));
    expect(r.status).toBe(200);
    expect(issueReceipt).toHaveBeenCalledTimes(1);
  });
});
