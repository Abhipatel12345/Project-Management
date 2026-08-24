import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const pdmCookie = req.cookies.get('pdm_session')?.value;

    if (!pdmCookie) {
      return NextResponse.json({ message: 'Guest', user: null }, { status: 401 });
    }

    const decodedStr = Buffer.from(pdmCookie, 'base64').toString('utf-8');
    const userSession: PDMUserSession = JSON.parse(decodedStr);

    return NextResponse.json({
      message: userSession.email,
      user: userSession,
    });
  } catch {
    return NextResponse.json({ message: 'Guest', user: null }, { status: 401 });
  }
}
