import { readToken } from '@/lib/bsc';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get('address') ?? '';
  try { return NextResponse.json(await readToken(address)); }
  catch { return NextResponse.json({ error: 'invalid address or read failed' }, { status: 400 }); }
}
