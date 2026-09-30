import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';
import {
  getProjectScorecard,
  saveProjectScorecard,
} from '@/lib/server/scorecard-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = decodeURIComponent(id || '');

  try {
    const scorecard = getProjectScorecard(projectId);
    return NextResponse.json({ scorecard }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { _error_message: err.message || 'Failed to retrieve project scorecard' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
  }

  // Non-PM / view-only roles cannot edit scorecard
  if (
    session.role === 'teammember' ||
    session.role === 'gate_reviewer' ||
    session.role === 'warehouse_user'
  ) {
    return NextResponse.json(
      { _error_message: '403 Forbidden: Read-only access to Imperative Scorecard' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const projectId = decodeURIComponent(id || '');

  try {
    const body = await req.json();
    const updated = saveProjectScorecard(projectId, body, session);
    return NextResponse.json({ scorecard: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { _error_message: err.message || 'Failed to update project scorecard' },
      { status: 500 }
    );
  }
}
