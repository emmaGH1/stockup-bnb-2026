import { NextResponse } from 'next/server';
import { verifySettlement } from '@/lib/settle';
import { parseSettleInput } from '@/lib/settle-input';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';

// Read-only. Never sends anything; only reads receipts from BSC.
export async function POST(req: Request) {
  try {
    const p = parseSettleInput(await readBounded(req));
    if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
    const i = p.value;
    const s = await verifySettlement(i.txHash, { token: i.token, recipient: i.recipient, valueWei: i.valueWei, minOutWei: i.minOutWei, quotedOutWei: i.quotedOutWei });
    return NextResponse.json(s);
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
