import { NextRequest, NextResponse } from 'next/server';
import { getGateByName, saveOrUpdateGate } from '@/lib/server/gate-store';
import { isGateReviewer } from '@/utils/user-matcher';
import { PDMUserSession } from '@/types/auth.types';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (!cookie) return null;
    const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const gate = getGateByName(gateName);

    if (!gate) {
      return NextResponse.json(
        { _error_message: `Gate ${gateName} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      gate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch gate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const body = await req.json();

    const existingGate = getGateByName(gateName);
    if (existingGate && body.criteria) {
      const hasApprovalChange = body.criteria.some((c: any) => {
        const oldC = (existingGate.criteria || []).find((oc) => oc.id === c.id);
        const isNewApproved = c.status === 'Completed' || c.status === 'Approved';
        const wasApproved = oldC?.status === 'Completed' || (oldC?.status as any) === 'Approved';
        return isNewApproved && !wasApproved;
      });

      if (hasApprovalChange && !isGateReviewer(existingGate, session)) {
        const assignedReviewer =
          existingGate.gate_reviewer ||
          existingGate.reviewer_user_id ||
          existingGate.gate_reviewer_user_id ||
          'Assigned Gate Reviewer';
        return NextResponse.json(
          {
            _error_message: `403 Forbidden: Only the assigned Gate Reviewer (${assignedReviewer}) is authorized to approve exit criteria on gate ${existingGate.name}.`,
          },
          { status: 403 }
        );
      }
    }

    const updated = saveOrUpdateGate({
      ...body,
      name: gateName,
    });

    return NextResponse.json({
      success: true,
      gate: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to update gate' },
      { status: 500 }
    );
  }
}
