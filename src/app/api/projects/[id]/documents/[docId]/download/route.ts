import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import { getDocumentBinary } from '@/lib/server/document-store';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (cookie) {
      const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
      return JSON.parse(jsonStr);
    }
    const userCookie = req.cookies.get('pdm_user')?.value;
    if (userCookie) {
      return JSON.parse(decodeURIComponent(userCookie));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/projects/:projectId/documents/:docId/download
 * Verify authorization, resolve the actual stored binary file, and stream it to the client.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { id, docId } = await props.params;
    const projectId = decodeURIComponent(id || '').trim();
    const documentId = decodeURIComponent(docId || '').trim();

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

    // Retrieve the actual binary file from disk
    const result = getDocumentBinary(projectId, documentId);

    if (!result) {
      return NextResponse.json(
        { _error_message: `404 Not Found: Document file not found in storage for "${documentId}" in project "${projectId}".` },
        { status: 404 }
      );
    }

    const { buffer, fileName, mimeType } = result;

    // Sanitize filename for header
    const cleanFileName = fileName.replace(/["\r\n]/g, '_');
    const safeUtf8Name = encodeURIComponent(cleanFileName);

    const headers = new Headers();
    headers.set('Content-Type', mimeType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${cleanFileName}"; filename*=UTF-8''${safeUtf8Name}`);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error serving document download:', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to process document download' },
      { status: 500 }
    );
  }
}
