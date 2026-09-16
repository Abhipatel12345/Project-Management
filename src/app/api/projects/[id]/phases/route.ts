import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectPhasesFromERP,
  createPhaseInERPNext,
} from '@/lib/server/project-phase-store';
import { PDMUserSession } from '@/types/auth.types';

export const dynamic = 'force-dynamic';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  const sessionHeader = req.headers.get('x-pdm-user');
  if (sessionHeader) {
    try {
      return JSON.parse(decodeURIComponent(sessionHeader));
    } catch {
      try {
        return JSON.parse(sessionHeader);
      } catch {
        // ignore
      }
    }
  }

  const cookie = req.cookies.get('pdm_session')?.value;
  if (cookie) {
    try {
      const decoded = Buffer.from(cookie, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      try {
        return JSON.parse(decodeURIComponent(cookie));
      } catch {
        try {
          return JSON.parse(cookie);
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

/**
 * GET /api/projects/:id/phases
 * Retrieve all phases for a project from ERPNext Phase List DocType
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const projectId = decodeURIComponent(id || '').trim();

    const phases = await getProjectPhasesFromERP(projectId);
    return NextResponse.json({ success: true, data: phases, phases }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/projects/[id]/phases] Error:', error?.message);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch project phases from ERPNext' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/:id/phases
 * Create a new Phase List record in ERPNext backend for the project
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const projectId = decodeURIComponent(id || '').trim();

    // Verify user session if provided
    const session = getSessionFromRequest(req);

    const body = await req.json();
    const {
      name,
      phase_name,
      target_project,
      phase_scope_and_objectives,
      description = '',
    } = body || {};

    const targetProject = (target_project || projectId || '').trim();
    const targetName = (phase_name || name || '').trim();
    const targetScope = (phase_scope_and_objectives || description || '').trim();

    if (!targetProject) {
      return NextResponse.json(
        { _error_message: 'Target Project is required to create a project phase in ERPNext' },
        { status: 400 }
      );
    }

    if (!targetName) {
      return NextResponse.json(
        { _error_message: 'Phase Name is required' },
        { status: 400 }
      );
    }

    const newPhase = await createPhaseInERPNext(targetProject, targetName, targetScope);

    return NextResponse.json({ success: true, data: newPhase, phase: newPhase }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/projects/[id]/phases] Error:', error?.message);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create Phase in ERPNext' },
      { status: 500 }
    );
  }
}
