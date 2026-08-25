import { NextRequest, NextResponse } from 'next/server';
import { loadAllGates, saveOrUpdateGate } from '@/lib/server/gate-store';
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

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const project = searchParams.get('project') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const gate_type = searchParams.get('gate_type') || 'ALL';
    const approval_status = searchParams.get('approval_status') || 'ALL';
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

    let gates = loadAllGates();

    if (project !== 'ALL') {
      gates = gates.filter((g) => g.project === project);
    }
    if (status !== 'ALL') {
      gates = gates.filter((g) => g.status === status);
    }
    if (gate_type !== 'ALL') {
      gates = gates.filter((g) => g.gate_type === gate_type);
    }
    if (approval_status !== 'ALL') {
      gates = gates.filter((g) => g.approval_status === approval_status);
    }
    if (search) {
      gates = gates.filter(
        (g) =>
          g.gate_name.toLowerCase().includes(search) ||
          g.name.toLowerCase().includes(search) ||
          (g.description && g.description.toLowerCase().includes(search))
      );
    }

    const totalCount = gates.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedGates = gates.slice(startIndex, startIndex + pageSize);

    const summary = {
      totalGates: gates.length,
      notStartedGates: gates.filter((g) => g.status === 'Not Started').length,
      inProgressGates: gates.filter((g) => g.status === 'In Progress').length,
      readyForReviewGates: gates.filter((g) => g.status === 'Ready for Review').length,
      approvedGates: gates.filter((g) => g.status === 'Approved').length,
      blockedGates: gates.filter((g) => g.status === 'Blocked').length,
      upcomingGates: gates.filter((g) => g.planned_date && g.planned_date >= '2026-08-15').length,
      completedGates: gates.filter((g) => g.status === 'Approved' || g.status === 'Completed').length,
      requiringApprovalGates: gates.filter((g) => g.approval_status === 'Pending').length,
    };

    return NextResponse.json({
      success: true,
      gates: paginatedGates,
      totalCount,
      page,
      pageSize,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch gates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const created = saveOrUpdateGate(body);

    return NextResponse.json({
      success: true,
      gate: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create gate' },
      { status: 500 }
    );
  }
}
