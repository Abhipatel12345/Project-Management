import { NextRequest, NextResponse } from 'next/server';
import {
  activateBaseline,
  archiveBaseline,
} from '@/lib/server/baseline-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; baselineId: string; action: string }> }
) {
  try {
    const { id: projectId, baselineId, action } = await params;
    const body = await request.json().catch(() => ({}));
    const performedBy = body.performed_by || 'Administrator';

    if (action === 'activate') {
      const updated = activateBaseline(projectId, baselineId, performedBy);
      if (!updated) {
        return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
      }
      return NextResponse.json({ baseline: updated, message: `Baseline ${baselineId} activated` });
    }

    if (action === 'archive') {
      const updated = archiveBaseline(projectId, baselineId, performedBy);
      if (!updated) {
        return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
      }
      return NextResponse.json({ baseline: updated, message: `Baseline ${baselineId} archived` });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update baseline status' },
      { status: 500 }
    );
  }
}
