import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userSession = getSessionFromRequest(req);

    if (!userSession) {
      return NextResponse.json({ message: 'Guest', user: null }, { status: 401 });
    }

    return NextResponse.json({
      message: userSession.email,
      user: userSession,
    });
  } catch {
    return NextResponse.json({ message: 'Guest', user: null }, { status: 401 });
  }
}
