import { NextRequest, NextResponse } from 'next/server';
import { evaluateProjectFLM } from '@/lib/server/flawless-launch-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get('projectName') || undefined;
    const currentGate = (searchParams.get('currentGate') as any) || undefined;

    const data = evaluateProjectFLM(id, projectName, currentGate);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate Flawless Launch status' },
      { status: 500 }
    );
  }
}
