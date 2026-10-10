import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { verifySettlement } from '@/lib/settle';
import { issueReceipt } from '@/lib/receipt';
export const dynamic = 'force-dynamic';

// Read-only. Re-verifies settlement from the chain on every call; a receipt is never built from client claims alone.
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!isAddress(b.token) || !isAddress(b.recipient)) throw new Error('invalid token or recipient');
    const s = await verifySettlement(String(b.txHash), { token: b.token, recipient: b.recipient,
      valueWei: BigInt(b.valueWei), minOutWei: BigInt(b.minOutWei), quotedOutWei: b.quotedOutWei ? BigInt(b.quotedOutWei) : undefined });
    const c = b.context ?? {};
    const out = await issueReceipt(s, b.token, {
      merchantInput: String(c.merchantInput ?? ''), companyName: String(c.companyName ?? ''), ticker: String(c.ticker ?? ''),
      spendUsd: Number(c.spendUsd) || 0, investUsd: Number(c.investUsd) || 0, rewardUsd: c.rewardUsd == null ? null : Number(c.rewardUsd),
      sharesPerToken: c.sharesPerToken == null ? null : Number(c.sharesPerToken) });
    return NextResponse.json({ settlement: s, ...out });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
