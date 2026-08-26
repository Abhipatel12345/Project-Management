import { NextRequest, NextResponse } from 'next/server';
import { taskDependencyStore } from '@/lib/server/task-dependency-store';
import taskService from '@/services/task.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { searchParams } = new URL(req.url);
    let projectId = searchParams.get('projectId') || searchParams.get('project');

    // If projectId not provided in query, fetch task to get project ID
    if (!projectId) {
      try {
        const task = await taskService.getTaskByName(taskId);
        projectId = task?.project || '';
      } catch {
        projectId = '';
      }
    }

    if (!projectId) {
      return NextResponse.json({
        data: {
          taskId,
          predecessors: [],
          successors: [],
          is_blocked: false,
          blocked_by: [],
        },
      });
    }

    // Fetch tasks for the project to compute statuses
    let allTasks: any[] = [];
    try {
      const taskListRes = await taskService.getTasks({ project: projectId, pageSize: 100 });
      allTasks = taskListRes.tasks || [];
    } catch {
      allTasks = [];
    }

    const info = taskDependencyStore.computeTaskDependencyInfo(taskId, projectId, allTasks);
    return NextResponse.json({ data: info });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch task dependencies' }, { status: 500 });
  }
}
