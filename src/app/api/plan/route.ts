import type { PlanRequest } from '@/lib/plan';
import { NextResponse } from 'next/server';
import { buildPlan } from '@/lib/plan';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';
export async function POST(req: Request) {
  try { return NextResponse.json(await buildPlan((await readBounded(req)) as PlanRequest)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'bad request' }, { status: 400 }); }
}
