import { NextRequest, NextResponse } from 'next/server';
import { taskDependencyStore } from '@/lib/server/task-dependency-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const dependencies = taskDependencyStore.getProjectDependencies(projectId);
    return NextResponse.json({ data: dependencies, count: dependencies.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch dependencies' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();

    const predecessor_id = body.predecessor_id || body.predecessor;
    const successor_id = body.successor_id || body.successor;
    const dependency_type = body.dependency_type || 'FS';
    const lag_days = body.lag_days || 0;

    if (!predecessor_id || !successor_id) {
      return NextResponse.json(
        { error: 'Predecessor Task and Successor Task are required' },
        { status: 400 }
      );
    }

    const created = taskDependencyStore.addDependency({
      project: projectId,
      predecessor_id,
      successor_id,
      dependency_type,
      lag_days,
    });

    return NextResponse.json({
      message: 'Task dependency created successfully',
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create task dependency' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const dependencyId = searchParams.get('dependencyId') || searchParams.get('id');

    if (!dependencyId) {
      return NextResponse.json({ error: 'Dependency ID is required' }, { status: 400 });
    }

    const deleted = taskDependencyStore.deleteDependency(projectId, dependencyId);
    if (!deleted) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Dependency deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete task dependency' },
      { status: 500 }
    );
  }
}
