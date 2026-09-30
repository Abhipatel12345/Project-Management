import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';
import { importScorecardExcel } from '@/lib/server/scorecard-store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
  }

  if (
    session.role === 'teammember' ||
    session.role === 'gate_reviewer' ||
    session.role === 'warehouse_user'
  ) {
    return NextResponse.json(
      { _error_message: '403 Forbidden: PM or Administrator role required to import scorecard' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const projectId = decodeURIComponent(id || '');

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { _error_message: 'No Excel file provided for import' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const updated = importScorecardExcel(projectId, buffer, session);
    return NextResponse.json(
      {
        message: 'Scorecard imported and synchronized successfully',
        scorecard: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { _error_message: err.message || 'Failed to import scorecard Excel' },
      { status: 500 }
    );
  }
}
