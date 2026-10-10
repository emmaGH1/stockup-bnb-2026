import { NextResponse } from 'next/server';
import { spendToOwn } from '@/lib/own';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try { return NextResponse.json(await spendToOwn(await req.json())); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
