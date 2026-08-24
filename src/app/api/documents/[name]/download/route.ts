import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';
import { getDocumentBinary, readDocumentsFile } from '@/lib/server/document-store';

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
 * GET /api/documents/:name/download
 * Global document download endpoint
 */
export async function GET(req: NextRequest, props: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await props.params;
    const documentId = decodeURIComponent(name || '').trim();

    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to download document.' },
        { status: 401 }
      );
    }

    const allDocs = readDocumentsFile();
    const doc = allDocs.find((d) => d.name === documentId || d.file_name === documentId);
    if (!doc) {
      return NextResponse.json(
        { _error_message: `404 Not Found: Document "${documentId}" does not exist.` },
        { status: 404 }
      );
    }

    // Verify Project Level Authorization if linked to a project
    if (doc.project && doc.project !== 'Global Vault') {
      const access = accessControlService.canAccessProject(session, doc.project);
      if (!access.allowed) {
        return NextResponse.json(
          { _error_message: `403 Forbidden: ${access.reason || 'You are not authorized to download documents from this project.'}` },
          { status: 403 }
        );
      }
    }

    const result = await getDocumentBinary(doc.project || 'Global Vault', documentId);
    if (!result) {
      return NextResponse.json(
        { _error_message: 'Document file not found in storage.' },
        { status: 404 }
      );
    }

    const { buffer, fileName, mimeType } = result;
    const cleanFileName = fileName.replace(/["\r\n]/g, '_');
    const safeUtf8Name = encodeURIComponent(cleanFileName);

    const headers = new Headers();
    headers.set('Content-Type', mimeType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${cleanFileName}"; filename*=UTF-8''${safeUtf8Name}`);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error in global document download:', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to download document' },
      { status: 500 }
    );
  }
}
