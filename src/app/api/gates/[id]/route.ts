import { NextRequest, NextResponse } from 'next/server';
import { getGateByName, saveOrUpdateGate, deleteGateFromStore } from '@/lib/server/gate-store';
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
    if (!existingGate) {
      return NextResponse.json(
        { _error_message: `Gate ${gateName} not found.` },
        { status: 404 }
      );
    }

    // 1. Strict RBAC Check: Approval Status or Gate Status change to Approved/Pass
    const isAttemptingApproval =
      (body.approval_status &&
        body.approval_status !== existingGate.approval_status &&
        ['Approved', 'Pass', 'Approved with Conditions', 'Pass with Follow up'].includes(body.approval_status)) ||
      (body.status === 'Approved' && existingGate.status !== 'Approved');

    if (isAttemptingApproval) {
      const isAuthorized =
        session.role === 'admin' ||
        session.role === 'gate_reviewer' ||
        isGateReviewer(existingGate, session);

      if (!isAuthorized) {
        return NextResponse.json(
          {
            _error_message:
              '403 Forbidden: Only designated Gate Reviewers or PMO Administrators are authorized to approve Gates.',
          },
          { status: 403 }
        );
      }
    }

    // 2. Strict RBAC Check: Criterion status change to Approved/Completed
    if (body.criteria) {
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

    // 3. Strict RBAC Check: Recording a new Gate Review Record
    if (body.reviews && body.reviews.length > (existingGate.reviews?.length || 0)) {
      const latestReview = body.reviews[0];
      if (
        latestReview &&
        ['Approved', 'Approved with Conditions', 'Pass', 'Pass with Follow up'].includes(latestReview.decision)
      ) {
        const isAuthorized =
          session.role === 'admin' ||
          session.role === 'gate_reviewer' ||
          isGateReviewer(existingGate, session);

        if (!isAuthorized) {
          return NextResponse.json(
            {
              _error_message:
                '403 Forbidden: Only designated Gate Reviewers or PMO Administrators are authorized to record gate approval reviews.',
            },
            { status: 403 }
          );
        }
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

export async function DELETE(
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

    if (session.role === 'teammember') {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Team members cannot delete stage-gates.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const deleted = deleteGateFromStore(gateName, session);

    if (!deleted) {
      return NextResponse.json(
        { _error_message: `Gate ${gateName} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Gate ${gateName} deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to delete gate' },
      { status: 500 }
    );
  }
}

