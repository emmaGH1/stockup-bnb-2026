import type { PlanRequest } from '@/lib/plan';
import { NextResponse } from 'next/server';
import { buildPlan } from '@/lib/plan';
export const dynamic = 'force-dynamic';
import { readBounded } from '@/lib/http';
import { errorResponseBody } from '@/lib/api-error';
export async function POST(req: Request) {
  try { return NextResponse.json(await buildPlan((await readBounded(req)) as PlanRequest)); }
  catch (e) { const f = errorResponseBody(e); return NextResponse.json(f.body, { status: f.status }); }
}
