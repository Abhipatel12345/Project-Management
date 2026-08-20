import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    message: 'Logged out from PDM successfully',
  });

  // Clear ONLY PDM session cookie, leaving ERPNext sid cookie untouched
  response.cookies.set({
    name: 'pdm_session',
    value: '',
    httpOnly: false,
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function GET() {
  return POST();
}
