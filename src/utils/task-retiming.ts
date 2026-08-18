import { Task } from '@/types/task.types';

/**
 * Calculates a new YYYY-MM-DD date string by adding a delta in days.
 */
export function addDaysToDateStr(dateStr?: string, daysDelta: number = 0): string {
  if (!dateStr || dateStr === 'N/A') {
    return new Date().toISOString().split('T')[0];
  }
  const clean = dateStr.split(' ')[0].split('T')[0];
  const d = new Date(clean);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  d.setDate(d.getDate() + daysDelta);
  return d.toISOString().split('T')[0];
}

/**
 * Retimes a target task and cascades date shifts downstream to dependent tasks.
 */
export function calculateRetimedTasks(
  allTasks: Task[],
  targetTaskId: string,
  daysDelta: number
): { task: Task; newStart: string; newEnd: string }[] {
  if (daysDelta === 0) return [];

  const updatesMap = new Map<string, { task: Task; newStart: string; newEnd: string }>();
  const visited = new Set<string>();

  const shiftTaskDates = (task: Task, delta: number) => {
    if (visited.has(task.name)) return;
    visited.add(task.name);

    const newStart = addDaysToDateStr(task.exp_start_date, delta);
    const newEnd = addDaysToDateStr(task.exp_end_date, delta);
    updatesMap.set(task.name, { task, newStart, newEnd });

    // Find downstream dependent tasks that specify task.name in parent_task or depends_on
    const downstream = allTasks.filter((t) => {
      if (t.name === task.name) return false;
      if (t.parent_task === task.name) return true;
      if (typeof t.depends_on === 'string' && t.depends_on.includes(task.name)) return true;
      if (Array.isArray(t.depends_on)) {
        return t.depends_on.some((dep) => dep.task_id === task.name);
      }
      return false;
    });

    downstream.forEach((child) => shiftTaskDates(child, delta));
  };

  const targetTask = allTasks.find((t) => t.name === targetTaskId);
  if (targetTask) {
    shiftTaskDates(targetTask, daysDelta);
  }

  return Array.from(updatesMap.values());
}
