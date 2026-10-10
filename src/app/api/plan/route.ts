import { NextResponse } from 'next/server';
import { buildPlan } from '@/lib/plan';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try { return NextResponse.json(await buildPlan(await req.json())); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
