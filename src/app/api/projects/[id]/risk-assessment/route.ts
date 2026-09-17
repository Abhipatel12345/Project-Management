import { NextRequest, NextResponse } from 'next/server';
import { getProjectRiskAssessment, saveProjectRiskAssessment } from '@/lib/server/risk-assessment-store';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get('projectName') || undefined;
    const currentPhase = searchParams.get('currentPhase') || undefined;

    const assessment = getProjectRiskAssessment(id, projectName, currentPhase);
    return NextResponse.json(assessment);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch risk assessment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const user = await getSessionUser(req);
    const body = await req.json();

    const saved = saveProjectRiskAssessment(
      id,
      body,
      user?.fullName || user?.username || 'User'
    );
    return NextResponse.json(saved);
  } catch (error: any) {
    const isValidation = error.message && error.message.includes('Validation Error');
    return NextResponse.json(
      { error: error.message || 'Failed to save risk assessment' },
      { status: isValidation ? 400 : 500 }
    );
  }
}
