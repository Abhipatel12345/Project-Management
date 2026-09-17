import { Task } from '@/types/task.types';
import {
  INTEVA_GATE_CHOICES,
  BOARD_FUNCTIONS,
  GATE_BOARD_TITLES,
  DEFAULT_BOARD_FUNCTION_MAPPING,
  GATE_DECISIONS,
  DELEGATION_CHOICES,
  IntevaGateCode,
  BoardFunction,
  GateDecision,
  DelegationChoice,
} from '@/config/gate-choices.config';

export interface PmoGateConfig {
  /**
   * X: Number of days current finish must be before target finish to qualify as GREEN indicator
   * (Default: 5 days)
   */
  kgdGreenDaysEarlyThreshold: number;
}

const PMO_CONFIG_STORAGE_KEY = 'pdm_pmo_gate_config';

export const DEFAULT_PMO_GATE_CONFIG: PmoGateConfig = {
  kgdGreenDaysEarlyThreshold: 5,
};

/**
 * Retrieve current PMO Gate Configuration (persisted in localStorage or default)
 */
export function getPmoGateConfig(): PmoGateConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_PMO_GATE_CONFIG;
  }
  try {
    const raw = localStorage.getItem(PMO_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.kgdGreenDaysEarlyThreshold === 'number' && parsed.kgdGreenDaysEarlyThreshold >= 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_PMO_GATE_CONFIG;
}

/**
 * Update PMO Gate Configuration
 */
export function setPmoGateConfig(config: Partial<PmoGateConfig>): PmoGateConfig {
  const current = getPmoGateConfig();
  const updated: PmoGateConfig = {
    ...current,
    ...config,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PMO_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}

/**
 * Canonical Gate Normalization
 * Maps various inputs ("1. PL", "PL", "Gate 1", "Phase 1: Concept") to one of the 6 INTEVA_GATE_CHOICES
 */
export function normalizeGateCode(rawGate?: string | null): IntevaGateCode | null {
  if (!rawGate) return null;
  const clean = rawGate.trim();

  for (const choice of INTEVA_GATE_CHOICES) {
    if (choice === clean) return choice;
  }

  const upper = clean.toUpperCase();
  if (upper.includes('PL') || upper.includes('CONCEPT') || upper.includes('PHASE 1') || upper === '1') return '1. PL';
  if (upper.includes('VC') || upper.includes('ARCHITECTURE') || upper.includes('PHASE 2') || upper === '2') return '2. VC';
  if (upper.includes('TKO') || upper.includes('TOOLING') || upper.includes('PHASE 3') || upper === '3') return '3. TKO';
  if (upper.includes('VL') || upper.includes('VALIDATION') || upper.includes('PHASE 4') || upper === '4') return '4. VL';
  if (upper.includes('CPA') || upper.includes('PRODUCTION') || upper.includes('PHASE 5') || upper === '5') return '5. CPA';
  if (upper.includes('CT') || upper.includes('LAUNCH') || upper.includes('PHASE 6') || upper === '6') return '6. CT';

  return null;
}

/**
 * Derive effective Gate for a task:
 * If the task has been retimed, its effective gate is the retimed gate.
 * Otherwise, its effective gate is its base gate.
 */
export function getEffectiveGate(task: Task): IntevaGateCode | null {
  const retimed = task.custom_retimed_to || task.retimed_to;
  if (retimed && retimed !== '-' && retimed.trim() !== '') {
    const normalizedRetimed = normalizeGateCode(retimed);
    if (normalizedRetimed) return normalizedRetimed;
  }

  const baseGate = task.custom_gate || task.gate || task.custom_phase || task.phase;
  return normalizeGateCode(baseGate);
}

/**
 * Determine the base (original) Gate for a task, regardless of retiming
 */
export function getBaseGate(task: Task): IntevaGateCode | null {
  const baseGate = task.custom_gate || task.gate || task.custom_phase || task.phase;
  return normalizeGateCode(baseGate);
}

/**
 * Filter tasks to ONLY return child tasks (hide parent and group tasks)
 * - Identifies tasks referenced as `parent_task` by other tasks
 * - Identifies tasks with `is_group === 1`
 */
export function filterChildTasks(tasks: Task[]): Task[] {
  const parentTaskIds = new Set<string>();

  for (const t of tasks) {
    if (t.parent_task && t.parent_task.trim() !== '') {
      parentTaskIds.add(t.parent_task.trim());
    }
  }

  return tasks.filter((t) => {
    if (parentTaskIds.has(t.name)) return false;
    if ((t as any).is_group === 1) return false;
    return true;
  });
}

/**
 * Determine if a task is skipped
 */
export function isTaskSkipped(task: Task): boolean {
  if (task.custom_is_skipped === 1 || task.is_skipped === true) return true;
  const status = (task.status || '').toLowerCase();
  return status === 'skipped' || status === 'cancelled';
}

/**
 * Determine if a task is a mandatory KGD deliverable
 */
export function isMandatoryKgdTask(task: Task): boolean {
  if (task.custom_is_mandatory_pdp === 1 || task.is_mandatory_pdp === true) return true;
  const subj = (task.subject || '').toLowerCase();
  const desc = (task.description || '').toLowerCase();
  if (subj.includes('[kgd]') || subj.includes('(kgd)') || subj.includes('key gate deliverable')) return true;
  if (desc.includes('mandatory_pdp') || desc.includes('key gate deliverable')) return true;
  return false;
}

/**
 * Return only future applicable Gates for retiming relative to a given original Gate.
 * E.g., for '1. PL' -> ['2. VC', '3. TKO', '4. VL', '5. CPA', '6. CT']
 * For '6. CT' -> []
 */
export function getApplicableRetimeGates(originalGate?: string | null): IntevaGateCode[] {
  const normalized = normalizeGateCode(originalGate);
  if (!normalized) return [...INTEVA_GATE_CHOICES];

  const idx = INTEVA_GATE_CHOICES.indexOf(normalized);
  if (idx < 0 || idx >= INTEVA_GATE_CHOICES.length - 1) {
    return [];
  }

  return INTEVA_GATE_CHOICES.slice(idx + 1);
}

/**
 * Calculate Gate-level and Function-level readiness percentage.
 * Rules:
 * - Skipped tasks are excluded from readiness calculation.
 * - Retimed tasks are excluded from original Gate, included in target Gate.
 */
export interface GateReadinessCalculationResult {
  gateCode: IntevaGateCode;
  totalChildTasks: number;
  activeTasksCount: number;
  skippedTasksCount: number;
  retimedOutTasksCount: number;
  retimedInTasksCount: number;
  readinessPercentage: number;
  functionBreakdown: Record<
    string,
    {
      functionName: string;
      totalTasks: number;
      activeTasks: number;
      skippedTasks: number;
      readinessPercentage: number;
      tasks: Task[];
    }
  >;
  tasksInGate: Task[];
}

export function calculateGateReadiness(
  allTasks: Task[],
  targetGate: IntevaGateCode
): GateReadinessCalculationResult {
  const childTasks = filterChildTasks(allTasks);

  // Collect tasks that effectively belong to this targetGate
  const tasksInGate: Task[] = [];
  let retimedInCount = 0;
  let retimedOutCount = 0;

  for (const t of childTasks) {
    const base = getBaseGate(t);
    const effective = getEffectiveGate(t);

    if (base === targetGate && effective !== targetGate) {
      retimedOutCount++;
    }

    if (effective === targetGate) {
      tasksInGate.push(t);
      if (base !== targetGate) {
        retimedInCount++;
      }
    }
  }

  let totalActiveProgress = 0;
  let activeCount = 0;
  let skippedCount = 0;

  const functionMap: Record<
    string,
    {
      functionName: string;
      totalTasks: number;
      activeTasks: number;
      skippedTasks: number;
      totalProgress: number;
      readinessPercentage: number;
      tasks: Task[];
    }
  > = {};

  for (const t of tasksInGate) {
    const rawFn = t.custom_function || t.function_name || 'PM';
    const fnName = (rawFn || 'PM').trim();

    if (!functionMap[fnName]) {
      functionMap[fnName] = {
        functionName: fnName,
        totalTasks: 0,
        activeTasks: 0,
        skippedTasks: 0,
        totalProgress: 0,
        readinessPercentage: 0,
        tasks: [],
      };
    }

    const fnEntry = functionMap[fnName];
    fnEntry.totalTasks++;
    fnEntry.tasks.push(t);

    if (isTaskSkipped(t)) {
      skippedCount++;
      fnEntry.skippedTasks++;
    } else {
      activeCount++;
      fnEntry.activeTasks++;
      const progress = typeof t.progress === 'number' ? Math.max(0, Math.min(100, t.progress)) : 0;
      totalActiveProgress += progress;
      fnEntry.totalProgress += progress;
    }
  }

  // Calculate Function-level readiness %
  for (const key of Object.keys(functionMap)) {
    const entry = functionMap[key];
    entry.readinessPercentage =
      entry.activeTasks > 0 ? Math.round(entry.totalProgress / entry.activeTasks) : 0;
  }

  // Calculate Gate-level readiness %
  const gateReadinessPercentage =
    activeCount > 0 ? Math.round(totalActiveProgress / activeCount) : 0;

  return {
    gateCode: targetGate,
    totalChildTasks: tasksInGate.length,
    activeTasksCount: activeCount,
    skippedTasksCount: skippedCount,
    retimedOutTasksCount: retimedOutCount,
    retimedInTasksCount: retimedInCount,
    readinessPercentage: gateReadinessPercentage,
    functionBreakdown: functionMap,
    tasksInGate,
  };
}

/**
 * KGD Indicator Definition:
 * - Green:
 *   completed earlier than planned OR current finish is more than PMO-defined X days before target finish.
 * - Yellow:
 *   task is not completed and current date is within 3–10 days of planned finish.
 * - Red:
 *   task is not completed and current date is 0–2 days before planned finish or beyond planned finish.
 */
export type KgdIndicatorColor = 'GREEN' | 'YELLOW' | 'RED' | 'SKIPPED';

export interface KgdIndicatorResult {
  color: KgdIndicatorColor;
  label: string;
  reason: string;
  daysDifference: number | null;
}

export function calculateKgdIndicator(
  task: Task,
  pmoConfig: PmoGateConfig = getPmoGateConfig(),
  now: Date = new Date()
): KgdIndicatorResult {
  if (isTaskSkipped(task)) {
    return {
      color: 'SKIPPED',
      label: 'Skipped',
      reason: 'Task is marked as skipped from gate deliverables',
      daysDifference: null,
    };
  }

  const progress = typeof task.progress === 'number' ? task.progress : 0;
  const isCompleted = progress >= 100 || (task.status || '').toLowerCase() === 'completed';

  const finishDateStr =
    task.actual_end_date ||
    task.exp_end_date ||
    task.custom_target_finish_date ||
    task.target_finish_date;

  const targetFinishDateStr =
    task.custom_target_finish_date ||
    task.target_finish_date ||
    task.exp_end_date;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (isCompleted) {
    if (finishDateStr && targetFinishDateStr) {
      const finish = new Date(finishDateStr);
      const target = new Date(targetFinishDateStr);
      const diffDays = Math.round((target.getTime() - finish.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        return {
          color: 'GREEN',
          label: 'Complete On Time',
          reason: `Task completed on/before target finish (${diffDays} days earlier)`,
          daysDifference: diffDays,
        };
      }
    }
    return {
      color: 'GREEN',
      label: 'Completed',
      reason: 'Task completed 100%',
      daysDifference: 0,
    };
  }

  // If not completed yet, check if current finish date is more than PMO-defined X days before target finish
  if (finishDateStr && targetFinishDateStr) {
    const currentFinish = new Date(finishDateStr);
    const targetFinish = new Date(targetFinishDateStr);
    const diffFromTargetDays = Math.round(
      (targetFinish.getTime() - currentFinish.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffFromTargetDays > pmoConfig.kgdGreenDaysEarlyThreshold) {
      return {
        color: 'GREEN',
        label: 'Ahead of Schedule',
        reason: `Current finish is ${diffFromTargetDays} days before target finish (PMO threshold > ${pmoConfig.kgdGreenDaysEarlyThreshold} days)`,
        daysDifference: diffFromTargetDays,
      };
    }
  }

  // Evaluate proximity to planned finish
  if (!finishDateStr) {
    return {
      color: 'YELLOW',
      label: 'No Finish Date',
      reason: 'Task has no planned finish date set',
      daysDifference: null,
    };
  }

  const plannedFinish = new Date(finishDateStr);
  const daysUntilPlannedFinish = Math.round(
    (plannedFinish.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Red: task is not completed and current date is 0–2 days before planned finish or beyond planned finish.
  if (daysUntilPlannedFinish <= 2) {
    const overdueStr =
      daysUntilPlannedFinish < 0
        ? `${Math.abs(daysUntilPlannedFinish)} days overdue`
        : daysUntilPlannedFinish === 0
        ? 'Due today'
        : `${daysUntilPlannedFinish} day(s) remaining`;
    return {
      color: 'RED',
      label: 'Critical / Overdue',
      reason: `Task incomplete and ${overdueStr} (0–2 days or overdue)`,
      daysDifference: daysUntilPlannedFinish,
    };
  }

  // Yellow: task is not completed and current date is within 3–10 days of planned finish.
  if (daysUntilPlannedFinish >= 3 && daysUntilPlannedFinish <= 10) {
    return {
      color: 'YELLOW',
      label: 'Due Soon',
      reason: `Task incomplete with ${daysUntilPlannedFinish} days remaining (3–10 days window)`,
      daysDifference: daysUntilPlannedFinish,
    };
  }

  // Otherwise: Green (more than 10 days before planned finish)
  return {
    color: 'GREEN',
    label: 'On Track',
    reason: `Task on track with ${daysUntilPlannedFinish} days remaining`,
    daysDifference: daysUntilPlannedFinish,
  };
}

/**
 * Derive Design Review Date from Gantt tasks for a specific Gate.
 * Uses the latest finish date among the tasks in that Gate, or designated milestone date.
 */
export function deriveDesignReviewDate(tasks: Task[], gateCode: IntevaGateCode): string {
  const childTasks = filterChildTasks(tasks);
  const gateTasks = childTasks.filter(
    (t) => getEffectiveGate(t) === gateCode && !isTaskSkipped(t)
  );

  if (gateTasks.length === 0) {
    return 'N/A';
  }

  // Look for any milestone task specifically referencing "Design Review" or "Gate Review"
  const drMilestone = gateTasks.find((t) => {
    const subj = (t.subject || '').toLowerCase();
    return subj.includes('design review') || subj.includes('gate review') || subj.includes('dr pass');
  });

  if (drMilestone) {
    const dt =
      drMilestone.actual_end_date ||
      drMilestone.exp_end_date ||
      drMilestone.custom_target_finish_date;
    if (dt) return dt;
  }

  // Fallback: max finish date among all tasks in that gate
  let maxDate = '';
  for (const t of gateTasks) {
    const d = t.actual_end_date || t.exp_end_date || t.custom_target_finish_date || t.target_finish_date;
    if (d && (!maxDate || d > maxDate)) {
      maxDate = d;
    }
  }

  return maxDate || 'N/A';
}
