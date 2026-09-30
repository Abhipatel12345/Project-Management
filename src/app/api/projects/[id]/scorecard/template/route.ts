import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';
import {
  getProjectScorecard,
  generateScorecardExcel,
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
    const excelBuffer = generateScorecardExcel(scorecard);

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Imperative_Scorecard_${projectId}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { _error_message: err.message || 'Failed to export scorecard template' },
      { status: 500 }
    );
  }
}
