import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { verifySettlement } from '@/lib/settle';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';

// Read-only. Never sends anything; only reads receipts from BSC.
export async function POST(req: Request) {
  try {
    const b = (await readBounded(req)) as Record<string, any>;
    if (!isAddress(b.token) || !isAddress(b.recipient)) throw new Error('invalid token or recipient');
    const s = await verifySettlement(String(b.txHash), { token: b.token, recipient: b.recipient,
      valueWei: BigInt(b.valueWei), minOutWei: BigInt(b.minOutWei), quotedOutWei: b.quotedOutWei ? BigInt(b.quotedOutWei) : undefined });
    return NextResponse.json(s);
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
