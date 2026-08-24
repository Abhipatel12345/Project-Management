import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import { approveSkipRequest, getSkipRequestById } from '@/lib/server/skip-request-store';

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

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: projectId, requestId } = await props.params;
    const session = getSessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
    }

    // Only Project Manager or PMO Administrator can approve skip requests
    if (session.role !== 'projectmanager' && session.role !== 'admin') {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Only Project Managers or PMO Administrators can approve task skip requests.' },
        { status: 403 }
      );
    }

    const existingReq = getSkipRequestById(requestId);
    if (!existingReq) {
      return NextResponse.json({ _error_message: 'Skip request not found.' }, { status: 404 });
    }

    // Team Members cannot approve their own requests
    if (existingReq.requested_by.toLowerCase() === (session.email || '').toLowerCase() && (session.role as string) === 'teammember') {
      return NextResponse.json(
        { _error_message: '403 Forbidden: You cannot approve your own skip request.' },
        { status: 403 }
      );
    }

    // Mark request as APPROVED
    const approved = approveSkipRequest(requestId, session.email || session.username, session.fullName);

    // Update Task in ERPNext to Skipped / Cancelled
    try {
      const erpUrl = getErpUrl();
      const skipMeta = `<!-- SKIP_REASON: ${JSON.stringify(approved.skip_reason)} -->`;
      
      // Fetch current task description to preserve it
      const taskFetch = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(approved.task_id)}`, {
        headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
        cache: 'no-store',
      });
      let desc = '';
      if (taskFetch.ok) {
        const tData = (await taskFetch.json()).data;
        desc = (tData.description || '').replace(/<!-- SKIP_REASON: .*? -->/, '').trim();
      }

      const updatedDesc = desc ? `${desc}\n${skipMeta}` : skipMeta;

      await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(approved.task_id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${getApiKey()}:${getApiSecret()}`,
        },
        body: JSON.stringify({
          status: 'Cancelled', // Standard ERPNext DocType maps Skipped to Cancelled
          description: updatedDesc,
        }),
      });
    } catch (erpErr) {
      console.warn('[ERPNext Task Update Warning on Skip]', erpErr);
    }

    return NextResponse.json({
      success: true,
      request: approved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to approve skip request' },
      { status: 400 }
    );
  }
}
