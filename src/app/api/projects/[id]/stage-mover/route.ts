import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectStageMoverStatus,
  triggerApprovalWorkflow,
  executeStageMovement,
} from '@/lib/server/stage-mover-store';
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

    const status = getProjectStageMoverStatus(id, projectName, currentPhase);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stage mover status' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'trigger_workflow') {
      const result = triggerApprovalWorkflow(id, user);
      return NextResponse.json(result);
    } else if (action === 'advance_stage') {
      const historyEntry = executeStageMovement(id, user);
      return NextResponse.json({ success: true, historyEntry });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: trigger_workflow, advance_stage' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute stage mover action' },
      { status: 400 }
    );
  }
}
