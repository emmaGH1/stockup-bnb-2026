import { NextResponse } from 'next/server';
import { verifySettlement } from '@/lib/settle';
import { parseSettleInput } from '@/lib/settle-input';
import { issueReceipt } from '@/lib/receipt';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';

// Read-only. Re-verifies settlement from the chain on every call; a receipt is never built from client claims alone.
export async function POST(req: Request) {
  try {
    const raw = (await readBounded(req)) as Record<string, any>;
    const p = parseSettleInput(raw);
    if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
    const i = p.value;
    const s = await verifySettlement(i.txHash, { token: i.token, recipient: i.recipient, valueWei: i.valueWei, minOutWei: i.minOutWei, quotedOutWei: i.quotedOutWei });
    const c = raw.context ?? {};
    const out = await issueReceipt(s, i.token, {
      merchantInput: String(c.merchantInput ?? ''), companyName: String(c.companyName ?? ''), ticker: String(c.ticker ?? ''),
      spendUsd: Number(c.spendUsd) || 0, investUsd: Number(c.investUsd) || 0,
      sharesPerToken: c.sharesPerToken == null ? null : Number(c.sharesPerToken) });
    return NextResponse.json({ settlement: s, ...out });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
