import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import documentService from '@/services/document.service';

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
 * GET /api/projects/:projectId/documents/:docId/download
 * Verify authorization and serve document attachment download.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { id, docId } = await props.params;
    const projectId = decodeURIComponent(id || '');
    const documentId = decodeURIComponent(docId || '');

    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to download project document.' },
        { status: 401 }
      );
    }

    // Verify Project Level Authorization
    const access = accessControlService.canAccessProject(session, projectId);
    if (!access.allowed) {
      return NextResponse.json(
        { _error_message: `403 Forbidden: ${access.reason || 'You are not authorized to download documents from this project.'}` },
        { status: 403 }
      );
    }

    const res = await documentService.getDocuments({ project: projectId, pageSize: 500 });
    const targetDoc = res.documents.find((d) => d.name === documentId || d.file_name === documentId);

    if (!targetDoc) {
      return NextResponse.json(
        { _error_message: `404 Not Found: Document "${documentId}" does not exist under project "${projectId}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document: targetDoc,
      downloadUrl: targetDoc.file_url || null,
      fileName: targetDoc.file_name || targetDoc.title,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to process document download' },
      { status: 500 }
    );
  }
}
