import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    message: 'Logged out from PDM successfully',
  });

  // Clear PDM session cookie securely
  response.cookies.set({
    name: 'pdm_session',
    value: '',
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
