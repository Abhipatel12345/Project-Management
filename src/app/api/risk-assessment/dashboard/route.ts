import { NextResponse } from 'next/server';
import { getRiskAssessmentDashboard } from '@/lib/server/risk-assessment-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getRiskAssessmentDashboard();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch risk assessment dashboard' },
      { status: 500 }
    );
  }
}
