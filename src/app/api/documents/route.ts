import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { getDocumentsByProject, saveDocument, deleteDocument } from '@/lib/server/document-store';

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
    const search = searchParams.get('search') || undefined;
    const document_type = searchParams.get('document_type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);

    const res = await getDocumentsByProject(project, {
      search,
      document_type,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch documents' },
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
    const doc = await saveDocument({
      ...body,
      uploaded_by: session.fullName || body.uploaded_by || 'Administrator',
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create document' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json({ _error_message: 'Document name is required.' }, { status: 400 });
    }

    await deleteDocument(name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
