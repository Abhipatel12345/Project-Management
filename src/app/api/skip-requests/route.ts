import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { getSkipRequestsByProject } from '@/lib/server/skip-request-store';

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

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ _error_message: '401 Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project') || undefined;

    const allRequests = getSkipRequestsByProject(projectId);

    // If team member, only show their requested ones
    let filtered = allRequests;
    if (session.role === 'teammember') {
      filtered = allRequests.filter(
        (r) =>
          r.requested_by.toLowerCase() === session.email.toLowerCase() ||
          r.requested_by.toLowerCase() === session.username.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      requests: filtered,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch skip requests' },
      { status: 500 }
    );
  }
}
