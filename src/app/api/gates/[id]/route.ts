import { NextRequest, NextResponse } from 'next/server';
import { getGateByName, saveOrUpdateGate } from '@/lib/server/gate-store';
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const gate = getGateByName(gateName);

    if (!gate) {
      return NextResponse.json(
        { _error_message: `Gate ${gateName} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      gate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch gate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const gateName = decodeURIComponent(id || '');
    const body = await req.json();

    const updated = saveOrUpdateGate({
      ...body,
      name: gateName,
    });

    return NextResponse.json({
      success: true,
      gate: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to update gate' },
      { status: 500 }
    );
  }
}
