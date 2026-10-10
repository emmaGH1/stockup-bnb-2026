import type { OwnRequest } from '@/lib/own';
import { NextResponse } from 'next/server';
import { spendToOwn } from '@/lib/own';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';
export async function POST(req: Request) {
  try { return NextResponse.json(await spendToOwn((await readBounded(req)) as OwnRequest)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
