import { NextResponse } from 'next/server';
import { verifySettlement } from '@/lib/settle';
import { parseSettleInput } from '@/lib/settle-input';
import { expectationFor } from '@/lib/review-policy';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';
import { errorResponseBody } from '@/lib/api-error';

// Read-only. Never sends anything; only reads receipts from BSC.
// The chain is checked against the server-signed expectation when a reviewToken is sent; otherwise legacy mode (see review-policy.ts).
export async function POST(req: Request) {
  try {
    const raw = await readBounded(req);
    const p = parseSettleInput(raw);
    if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
    const x = expectationFor(raw as { reviewToken?: unknown }, p.value);
    if (!x.ok) return NextResponse.json({ error: x.error }, { status: 400 });
    const s = await verifySettlement(p.value.txHash, x.expected);
    return NextResponse.json(s);
  } catch (e) { const f = errorResponseBody(e); return NextResponse.json(f.body, { status: f.status }); }
}
