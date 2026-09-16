import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userSession = getSessionFromRequest(req, false);

    if (!userSession) {
      return NextResponse.json({ message: 'Guest', user: null }, { status: 401 });
    }

    const response = NextResponse.json({
      message: userSession.email,
      user: userSession,
    });

    // Ensure pdm_session cookie is set if not already present
    const existingCookie = req.cookies.get('pdm_session')?.value;
    if (!existingCookie) {
      const sessionToken = Buffer.from(JSON.stringify(userSession)).toString('base64');
      response.cookies.set({
        name: 'pdm_session',
        value: sessionToken,
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch {
    return NextResponse.json({ message: 'Guest', user: null }, { status: 401 });
  }
}
