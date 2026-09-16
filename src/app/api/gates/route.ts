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
    const gate_owner = searchParams.get('gate_owner') || 'ALL';
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

    const allGates = loadAllGates();

    // 1. Project-Scoped Gates for accurate Dashboard counts
    const projectScopedGates = project !== 'ALL'
      ? allGates.filter((g) => g.project === project)
      : allGates;

    const summary = {
      totalGates: projectScopedGates.length,
      notStartedGates: projectScopedGates.filter((g) => g.status === 'Not Started').length,
      inProgressGates: projectScopedGates.filter((g) => g.status === 'In Progress').length,
      readyForReviewGates: projectScopedGates.filter((g) => g.status === 'Ready for Review').length,
      approvedGates: projectScopedGates.filter((g) => g.status === 'Approved').length,
      blockedGates: projectScopedGates.filter((g) => g.status === 'Blocked').length,
      upcomingGates: projectScopedGates.filter((g) => g.planned_date && g.planned_date >= '2026-08-15').length,
      completedGates: projectScopedGates.filter((g) => g.status === 'Approved' || g.status === 'Completed').length,
      requiringApprovalGates: projectScopedGates.filter((g) => g.approval_status === 'Pending').length,
    };

    // 2. Multi-Filter Composition for Table Records
    let filteredGates = [...projectScopedGates];

    if (status !== 'ALL') {
      filteredGates = filteredGates.filter((g) => g.status === status);
    }
    if (gate_type !== 'ALL') {
      filteredGates = filteredGates.filter((g) => g.gate_type === gate_type);
    }
    if (approval_status !== 'ALL') {
      filteredGates = filteredGates.filter((g) => g.approval_status === approval_status);
    }
    if (gate_owner !== 'ALL') {
      filteredGates = filteredGates.filter((g) => g.gate_owner === gate_owner || g.gate_owner_id === gate_owner);
    }
    if (search) {
      filteredGates = filteredGates.filter(
        (g) =>
          g.gate_name.toLowerCase().includes(search) ||
          g.name.toLowerCase().includes(search) ||
          (g.project && g.project.toLowerCase().includes(search)) ||
          (g.gate_owner && g.gate_owner.toLowerCase().includes(search)) ||
          (g.description && g.description.toLowerCase().includes(search))
      );
    }

    const totalCount = filteredGates.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedGates = filteredGates.slice(startIndex, startIndex + pageSize);

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

    // Validation for required fields
    if (!body.gate_name || typeof body.gate_name !== 'string' || !body.gate_name.trim()) {
      return NextResponse.json(
        { _error_message: 'Gate Name is required and cannot be empty.' },
        { status: 400 }
      );
    }
    if (!body.project || typeof body.project !== 'string' || !body.project.trim()) {
      return NextResponse.json(
        { _error_message: 'Associated Project is required.' },
        { status: 400 }
      );
    }
    if (!body.gate_type || typeof body.gate_type !== 'string') {
      return NextResponse.json(
        { _error_message: 'Gate Type is required.' },
        { status: 400 }
      );
    }
    if (!body.gate_owner || typeof body.gate_owner !== 'string') {
      return NextResponse.json(
        { _error_message: 'Gate Owner is required.' },
        { status: 400 }
      );
    }
    if (!body.planned_date || typeof body.planned_date !== 'string') {
      return NextResponse.json(
        { _error_message: 'Planned Date is required.' },
        { status: 400 }
      );
    }
    if (!body.status || typeof body.status !== 'string') {
      return NextResponse.json(
        { _error_message: 'Gate Status is required.' },
        { status: 400 }
      );
    }

    const created = saveOrUpdateGate(body);

    return NextResponse.json({
      success: true,
      gate: created,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create gate' },
      { status }
    );
  }
}
