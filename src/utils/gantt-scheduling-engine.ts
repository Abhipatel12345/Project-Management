/**
 * Standard MSP Gantt Scheduling Engine
 *
 * Implements standard Microsoft Project scheduling algorithms:
 * - CPM (Critical Path Method) Forward and Backward Pass
 * - Total Float (Slack) computation and Critical Path identification
 * - Predecessor dependency logic: FS, SS, FF, SF with lag days
 * - Cycle / circular dependency detection
 * - Cascading schedule auto-recalculation
 * - Inteva RYG Delay Status calculation
 */

import { Task } from '@/types/task.types';
import { TaskRelationship, DependencyType } from '@/types/task-dependency.types';

export interface ScheduleCalculationResult {
  updatedTasks: Map<string, { exp_start_date: string; exp_end_date: string; duration: number }>;
  criticalPathTaskIds: Set<string>;
  taskFloatDays: Map<string, number>;
  rygStatus: Map<string, 'Green' | 'Yellow' | 'Red'>;
}

export interface ParsedDependencyLink {
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lagDays: number;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a clean midnight Date object
 */
export function parseDate(str?: string): Date {
  if (!str || str === 'N/A') return new Date();
  const clean = str.split(' ')[0].split('T')[0].trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 0, 0, 0, 0);
  }
  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Compute difference in calendar days between two dates inclusive
 */
export function getDurationDays(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays + 1); // 1-day task if start === end
}

/**
 * Check for cycles in a directed graph using DFS
 */
export function hasCircularDependency(
  dependencies: { predecessor_id: string; successor_id: string }[],
  candidatePred: string,
  candidateSucc: string
): boolean {
  if (candidatePred === candidateSucc) return true;

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = adj.get(dep.predecessor_id) || [];
    list.push(dep.successor_id);
    adj.set(dep.predecessor_id, list);
  }

  // Add the candidate edge
  const list = adj.get(candidatePred) || [];
  list.push(candidateSucc);
  adj.set(candidatePred, list);

  // Check if candidateSucc can reach candidatePred
  const visited = new Set<string>();
  const stack: string[] = [candidateSucc];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr === candidatePred) return true;
    if (!visited.has(curr)) {
      visited.add(curr);
      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (n === candidatePred) return true;
        if (!visited.has(n)) stack.push(n);
      }
    }
  }

  return false;
}

/**
 * Calculate RYG status for a task
 * Refer to KGD / Choices specifications:
 * - Red: Delayed (exp_end_date < today AND progress < 100%) OR current finish > target finish
 * - Yellow: At Risk (exp_end_date within 7 days AND progress < 60%)
 * - Green: On Track / Completed
 */
export function computeTaskRYG(task: Task, targetEndDate?: string): 'Green' | 'Yellow' | 'Red' {
  if (task.status === 'Completed' || (task.progress || 0) >= 100) {
    return 'Green';
  }
  if (task.status === 'Skipped') {
    return 'Green';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = parseDate(task.exp_end_date);
  end.setHours(0, 0, 0, 0);

  // If target date is defined and current schedule is past target finish -> Red
  if (targetEndDate) {
    const target = parseDate(targetEndDate);
    target.setHours(0, 0, 0, 0);
    if (end > target) return 'Red';
  }

  // Past finish date and not completed -> Red
  if (end < today) {
    return 'Red';
  }

  // Due within next 7 days and progress < 60% -> Yellow
  const sevenDaysAhead = addDays(today, 7);
  if (end <= sevenDaysAhead && (task.progress || 0) < 60) {
    return 'Yellow';
  }

  return 'Green';
}

/**
 * Recalculate full project schedule using standard MSP dependency relationships
 */
export function recalculateSchedule(
  tasks: Task[],
  dependencies: TaskRelationship[]
): ScheduleCalculationResult {
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.name, { ...t }));

  // In-degree for topological sorting
  const inDegree = new Map<string, number>();
  const successorsMap = new Map<string, TaskRelationship[]>();
  const predecessorsMap = new Map<string, TaskRelationship[]>();

  tasks.forEach((t) => {
    inDegree.set(t.name, 0);
    successorsMap.set(t.name, []);
    predecessorsMap.set(t.name, []);
  });

  for (const dep of dependencies) {
    if (taskMap.has(dep.predecessor_id) && taskMap.has(dep.successor_id)) {
      inDegree.set(dep.successor_id, (inDegree.get(dep.successor_id) || 0) + 1);
      successorsMap.get(dep.predecessor_id)?.push(dep);
      predecessorsMap.get(dep.successor_id)?.push(dep);
    }
  }

  // Topological sort (Kahn's algorithm)
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    topoOrder.push(curr);
    const succs = successorsMap.get(curr) || [];
    for (const dep of succs) {
      const nextId = dep.successor_id;
      const deg = (inDegree.get(nextId) || 1) - 1;
      inDegree.set(nextId, deg);
      if (deg === 0) queue.push(nextId);
    }
  }

  // Include any remaining tasks (in case of isolated nodes or unreached tasks)
  tasks.forEach((t) => {
    if (!topoOrder.includes(t.name)) topoOrder.push(t.name);
  });

  // 1. FORWARD PASS: Compute Early Start (ES) and Early Finish (EF)
  const earlyStart = new Map<string, Date>();
  const earlyFinish = new Map<string, Date>();
  const durations = new Map<string, number>();

  for (const taskId of topoOrder) {
    const task = taskMap.get(taskId)!;
    const origStart = parseDate(task.exp_start_date);
    const origEnd = parseDate(task.exp_end_date);
    const dur = Math.max(1, getDurationDays(origStart, origEnd));
    durations.set(taskId, dur);

    let es = new Date(origStart);

    // Apply predecessor constraints
    const preds = predecessorsMap.get(taskId) || [];
    for (const dep of preds) {
      const pEf = earlyFinish.get(dep.predecessor_id) || parseDate(taskMap.get(dep.predecessor_id)?.exp_end_date);
      const pEs = earlyStart.get(dep.predecessor_id) || parseDate(taskMap.get(dep.predecessor_id)?.exp_start_date);
      const lag = dep.lag_days || 0;

      switch (dep.dependency_type) {
        case 'FS': {
          // Successor start >= Predecessor finish + 1 + lag
          const minStart = addDays(pEf, 1 + lag);
          if (minStart > es) es = minStart;
          break;
        }
        case 'SS': {
          // Successor start >= Predecessor start + lag
          const minStart = addDays(pEs, lag);
          if (minStart > es) es = minStart;
          break;
        }
        case 'FF': {
          // Successor finish >= Predecessor finish + lag -> Successor start >= Predecessor finish + lag - dur + 1
          const minFinish = addDays(pEf, lag);
          const minStart = addDays(minFinish, -(dur - 1));
          if (minStart > es) es = minStart;
          break;
        }
        case 'SF': {
          // Successor finish >= Predecessor start + lag
          const minFinish = addDays(pEs, lag);
          const minStart = addDays(minFinish, -(dur - 1));
          if (minStart > es) es = minStart;
          break;
        }
      }
    }

    const ef = addDays(es, dur - 1);
    earlyStart.set(taskId, es);
    earlyFinish.set(taskId, ef);
  }

  // 2. BACKWARD PASS: Compute Late Start (LS) and Late Finish (LF)
  let maxProjectFinish = new Date(0);
  earlyFinish.forEach((ef) => {
    if (ef > maxProjectFinish) maxProjectFinish = new Date(ef);
  });

  const lateFinish = new Map<string, Date>();
  const lateStart = new Map<string, Date>();

  // Reverse topological order
  const revOrder = [...topoOrder].reverse();
  for (const taskId of revOrder) {
    const dur = durations.get(taskId) || 1;
    let lf = new Date(maxProjectFinish);

    const succs = successorsMap.get(taskId) || [];
    if (succs.length > 0) {
      for (const dep of succs) {
        const sLs = lateStart.get(dep.successor_id) || earlyStart.get(dep.successor_id)!;
        const sLf = lateFinish.get(dep.successor_id) || earlyFinish.get(dep.successor_id)!;
        const lag = dep.lag_days || 0;

        switch (dep.dependency_type) {
          case 'FS': {
            // Predecessor finish <= Successor start - 1 - lag
            const maxEf = addDays(sLs, -(1 + lag));
            if (maxEf < lf) lf = maxEf;
            break;
          }
          case 'SS': {
            // Predecessor start <= Successor start - lag -> finish <= start - lag + dur - 1
            const maxEs = addDays(sLs, -lag);
            const maxEf = addDays(maxEs, dur - 1);
            if (maxEf < lf) lf = maxEf;
            break;
          }
          case 'FF': {
            // Predecessor finish <= Successor finish - lag
            const maxEf = addDays(sLf, -lag);
            if (maxEf < lf) lf = maxEf;
            break;
          }
          case 'SF': {
            // Predecessor start <= Successor finish - lag
            const maxEs = addDays(sLf, -lag);
            const maxEf = addDays(maxEs, dur - 1);
            if (maxEf < lf) lf = maxEf;
            break;
          }
        }
      }
    }

    const ls = addDays(lf, -(dur - 1));
    lateFinish.set(taskId, lf);
    lateStart.set(taskId, ls);
  }

  // 3. FLOAT & CRITICAL PATH
  const criticalPathTaskIds = new Set<string>();
  const taskFloatDays = new Map<string, number>();
  const updatedTasks = new Map<string, { exp_start_date: string; exp_end_date: string; duration: number }>();
  const rygStatus = new Map<string, 'Green' | 'Yellow' | 'Red'>();

  for (const taskId of topoOrder) {
    const es = earlyStart.get(taskId)!;
    const ef = earlyFinish.get(taskId)!;
    const ls = lateStart.get(taskId) || es;
    const lf = lateFinish.get(taskId) || ef;
    const dur = durations.get(taskId) || 1;

    // Total Float in days = Late Finish - Early Finish
    const floatMs = lf.getTime() - ef.getTime();
    const floatDays = Math.max(0, Math.round(floatMs / (1000 * 60 * 60 * 24)));
    taskFloatDays.set(taskId, floatDays);

    if (floatDays === 0) {
      criticalPathTaskIds.add(taskId);
    }

    const newStartStr = formatDate(es);
    const newEndStr = formatDate(ef);
    updatedTasks.set(taskId, {
      exp_start_date: newStartStr,
      exp_end_date: newEndStr,
      duration: dur,
    });

    const task = taskMap.get(taskId)!;
    rygStatus.set(taskId, computeTaskRYG({ ...task, exp_start_date: newStartStr, exp_end_date: newEndStr }));
  }

    return {
    updatedTasks,
    criticalPathTaskIds,
    taskFloatDays,
    rygStatus,
  };
}

/**
 * Calculate schedule variance between current task dates and baseline snapshot
 */
export function calculateVariance(
  current: { exp_start_date?: string; exp_end_date?: string; start_date?: string; end_date?: string },
  baseline: { exp_start_date?: string; exp_end_date?: string; start_date?: string; end_date?: string }
): { startVarianceDays: number; finishVarianceDays: number } {
  const cStart = parseDate(current.exp_start_date || current.start_date);
  const cEnd = parseDate(current.exp_end_date || current.end_date);
  const bStart = parseDate(baseline.exp_start_date || baseline.start_date);
  const bEnd = parseDate(baseline.exp_end_date || baseline.end_date);

  const startDiff = Math.round((cStart.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24));
  const finishDiff = Math.round((cEnd.getTime() - bEnd.getTime()) / (1000 * 60 * 60 * 24));

  return {
    startVarianceDays: startDiff,
    finishVarianceDays: finishDiff,
  };
}

