import type { OwnRequest } from '@/lib/own';
import { NextResponse } from 'next/server';
import { spendToOwn } from '@/lib/own';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';
import { errorResponseBody } from '@/lib/api-error';
export async function POST(req: Request) {
  try { return NextResponse.json(await spendToOwn((await readBounded(req)) as OwnRequest)); }
  catch (e) { const f = errorResponseBody(e); return NextResponse.json(f.body, { status: f.status }); }
}
