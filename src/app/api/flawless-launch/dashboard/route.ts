import { NextResponse } from 'next/server';
import { getFlawlessLaunchDashboard } from '@/lib/server/flawless-launch-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getFlawlessLaunchDashboard();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch flawless launch dashboard' },
      { status: 500 }
    );
  }
}
