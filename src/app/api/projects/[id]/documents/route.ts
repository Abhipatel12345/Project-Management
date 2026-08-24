import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import { getDocumentsByProject, saveDocument } from '@/lib/server/document-store';

/**
 * Safely extract authenticated PDM user session from cookie
 */
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

/**
 * GET /api/projects/:projectId/documents
 * List all documents associated with a project after verifying project authorization.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const projectId = decodeURIComponent(id || '');

    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to access project documents.' },
        { status: 401 }
      );
    }

    // Verify Project Level Authorization
    const access = accessControlService.canAccessProject(session, projectId);
    if (!access.allowed) {
      return NextResponse.json(
        { _error_message: `403 Forbidden: ${access.reason || 'You are not authorized to view documents for this project.'}` },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const document_type = searchParams.get('document_type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

    // Fetch documents linked to project from persistent server store
    const res = getDocumentsByProject(projectId, {
      search,
      document_type,
      status,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      projectId,
      documents: res.documents,
      totalCount: res.totalCount,
      summary: res.summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch project documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/:projectId/documents
 * Upload & attach a document to a project after verifying project authorization.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const projectId = decodeURIComponent(id || '');

    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    // Verify Project Level Authorization
    const access = accessControlService.canAccessProject(session, projectId);
    if (!access.allowed) {
      return NextResponse.json(
        { _error_message: `403 Forbidden: ${access.reason || 'Unauthorized to attach documents to this project.'}` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const doc = saveDocument({
      ...body,
      project: projectId,
      uploaded_by: session.fullName || body.uploaded_by || 'Administrator',
    });

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to upload project document' },
      { status: 500 }
    );
  }
}
