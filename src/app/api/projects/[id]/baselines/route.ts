import { NextRequest, NextResponse } from 'next/server';
import {
  getBaselinesByProject,
  saveBaseline,
} from '@/lib/server/baseline-store';
import { ProjectBaseline } from '@/types/baseline.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const baselines = getBaselinesByProject(projectId);
    return NextResponse.json({
      baselines,
      totalCount: baselines.length,
      activeBaseline: baselines.find((b) => b.status === 'Active') || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project baselines' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { baseline_name, description, created_by, tasks } = body;

    if (!baseline_name) {
      return NextResponse.json({ error: 'Baseline name is required' }, { status: 400 });
    }

    const existingBaselines = getBaselinesByProject(projectId);
    const nextNumber = existingBaselines.length > 0
      ? Math.max(...existingBaselines.map((b) => b.baseline_number)) + 1
      : 1;

    const baselineId = `BL-${projectId}-${String(nextNumber).padStart(2, '0')}`;
    const timestamp = new Date().toISOString();
    const snapshotDate = timestamp.split('T')[0];

    const taskSnapshots = Array.isArray(tasks)
      ? tasks.map((t: any) => ({
          baseline_id: baselineId,
          task_id: t.name || t.task_id,
          task_subject: t.subject || t.task_subject || 'Untitled Task',
          planned_start_date: t.exp_start_date || t.planned_start_date || snapshotDate,
          planned_end_date: t.exp_end_date || t.planned_end_date || snapshotDate,
          duration: Number(t.duration) || calculateDurationDays(t.exp_start_date || t.planned_start_date, t.exp_end_date || t.planned_end_date),
          assigned_to: t.assigned_to,
          priority: t.priority,
          status: t.status,
          progress: t.progress || 0,
          parent_task: t.parent_task,
          depends_on: t.depends_on,
          milestone: t.milestone || false,
        }))
      : [];

    const newBaseline: ProjectBaseline = {
      baseline_id: baselineId,
      project_id: projectId,
      baseline_name,
      baseline_number: nextNumber,
      description: description || '',
      created_by: created_by || 'Administrator',
      created_at: timestamp,
      status: 'Active',
      snapshot_date: snapshotDate,
      task_count: taskSnapshots.length,
      tasks: taskSnapshots,
      audit_trail: [
        {
          action: `Created Baseline ${nextNumber}`,
          performed_by: created_by || 'Administrator',
          timestamp,
          details: `Captured snapshot of ${taskSnapshots.length} tasks`,
        },
      ],
    };

    const saved = saveBaseline(newBaseline);
    return NextResponse.json({ baseline: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create project baseline' },
      { status: 500 }
    );
  }
}

function calculateDurationDays(startStr?: string, endStr?: string): number {
  if (!startStr || !endStr) return 1;
  try {
    const s = new Date(startStr.split(' ')[0].split('T')[0]);
    const e = new Date(endStr.split(' ')[0].split('T')[0]);
    const diff = Math.max(0, e.getTime() - s.getTime());
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}
