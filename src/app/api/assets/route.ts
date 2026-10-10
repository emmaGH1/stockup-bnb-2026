import { NextResponse } from 'next/server';
import { VERIFIED_ASSETS } from '@/lib/assets';
import { readAssets } from '@/lib/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await readAssets(VERIFIED_ASSETS);
  return NextResponse.json({ checkedAt: new Date().toISOString(), assets: rows });
}
