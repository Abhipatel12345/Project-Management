import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';
import { getCharterChoices, saveCharterChoices } from '@/lib/server/choices-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const choices = getCharterChoices();
    return NextResponse.json({ success: true, data: choices });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, _error_message: error.message || 'Failed to retrieve charter choices' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req, false);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to modify charter choices.' },
        { status: 401 }
      );
    }

    const isPmo = session.role === 'admin' || !!session.permissions?.manageProjects;
    if (!isPmo) {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Only PMO Administrators are authorized to maintain choices.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = saveCharterChoices(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, _error_message: error.message || 'Failed to update charter choices' },
      { status: 500 }
    );
  }
}
