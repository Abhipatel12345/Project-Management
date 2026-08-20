import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import documentService from '@/services/document.service';

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

    // Fetch documents linked to project
    const res = await documentService.getDocuments({ project: projectId, pageSize: 100 });

    return NextResponse.json({
      success: true,
      projectId,
      documents: res.documents,
      totalCount: res.totalCount,
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
    const doc = await documentService.uploadDocument({
      ...body,
      project: projectId,
      uploaded_by: session.fullName,
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
