import { NextRequest, NextResponse } from 'next/server';
import {
  getBaselinesByProject,
  deleteBaseline,
} from '@/lib/server/baseline-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; baselineId: string }> }
) {
  try {
    const { id: projectId, baselineId } = await params;
    const baselines = getBaselinesByProject(projectId);
    const target = baselines.find((b) => b.baseline_id === baselineId);

    if (!target) {
      return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
    }

    return NextResponse.json({ baseline: target });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch baseline' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; baselineId: string }> }
) {
  try {
    const { id: projectId, baselineId } = await params;
    const success = deleteBaseline(projectId, baselineId);

    if (!success) {
      return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Baseline ${baselineId} deleted successfully` });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete baseline' },
      { status: 500 }
    );
  }
}
