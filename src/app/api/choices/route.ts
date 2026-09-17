import { NextRequest, NextResponse } from 'next/server';
import { getMasterChoices, saveMasterChoices } from '@/lib/server/choices-store';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const choices = getMasterChoices();
    return NextResponse.json(choices);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load master choices' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || (user.role !== 'admin' && !user.permissions?.manageProjects)) {
      return NextResponse.json(
        { error: '403 Forbidden: Only Administrators or PMO can update system master choices' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = saveMasterChoices(body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update master choices' },
      { status: 500 }
    );
  }
}
