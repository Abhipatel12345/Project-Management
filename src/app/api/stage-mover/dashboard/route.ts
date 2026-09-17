import { NextResponse } from 'next/server';
import { getStageMoverDashboard } from '@/lib/server/stage-mover-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getStageMoverDashboard();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stage mover dashboard' },
      { status: 500 }
    );
  }
}
