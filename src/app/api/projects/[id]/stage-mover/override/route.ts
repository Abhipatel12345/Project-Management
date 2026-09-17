import { NextRequest, NextResponse } from 'next/server';
import { executePMOOverride } from '@/lib/server/stage-mover-store';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

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

    // RBAC: Strictly restricted to PMO / Administrator
    const isPmoAdmin = user.role === 'admin' || !!user.permissions?.manageProjects;
    if (!isPmoAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Stage Mover override and rollback is strictly restricted to PMO Administrators.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetStage, reason, isRollback } = body;

    if (!targetStage) {
      return NextResponse.json({ error: 'Target stage is required' }, { status: 400 });
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A justification reason of at least 5 characters is required for PMO override.' },
        { status: 400 }
      );
    }

    const entry = executePMOOverride(id, targetStage, reason, user, !!isRollback);
    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute PMO override' },
      { status: 400 }
    );
  }
}
