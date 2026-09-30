'use client';

import React, { useMemo } from 'react';
import { useProject } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useProjectStageMover } from '@/hooks/use-stage-mover';
import { useIssues } from '@/hooks/use-issues';
import { useDesignReviews } from '@/hooks/use-design-reviews';
import { useProjectFLM } from '@/hooks/use-flawless-launch';
import {
  calculateGateReadiness,
  isMandatoryKgdTask,
  filterChildTasks,
  getEffectiveGate,
  calculateKgdIndicator,
} from '@/services/gate-readiness.service';
import { IntevaGateCode, INTEVA_GATE_CHOICES } from '@/config/gate-choices.config';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import {
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  FileCheck,
  ListTodo,
  Rocket,
  Target,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProjectStatusViewProps {
  projectId: string;
  onNavigateTab: (tab: string) => void;
}

export function ProjectStatusView({
  projectId,
  onNavigateTab,
}: ProjectStatusViewProps) {
  const { data: project } = useProject(projectId);
  const { data: tasksData } = useTasks({ project: projectId, pageSize: 1000 });
  const tasks = tasksData?.tasks || [];

  const { data: stageMover } = useProjectStageMover(projectId);
  const currentStageCode = stageMover?.current_stage || project?.current_phase || 'PL';
  const currentGateCode = (INTEVA_GATE_CHOICES.find((g) => g.includes(currentStageCode)) ||
    '1. PL') as IntevaGateCode;

  const { data: issuesData } = useIssues({ project: projectId, pageSize: 200 });
  const issues = issuesData?.issues || [];

  const { data: designReviewsData } = useDesignReviews({ project: projectId });
  const designReviews = designReviewsData?.reviews || [];

  const { data: flmData } = useProjectFLM(projectId, currentStageCode as any);

  // 1. Schedule & Dates
  const plannedFinish = project?.expected_end_date || 'N/A';
  const currentFinish = project?.actual_end_date || project?.expected_end_date || 'N/A';
  const isOverallScheduleGreen =
    plannedFinish === 'N/A' || currentFinish === 'N/A' || currentFinish <= plannedFinish;

  // Current Gate tasks
  const childTasks = useMemo(() => filterChildTasks(tasks), [tasks]);
  const gateTasks = useMemo(() => {
    return childTasks.filter((t) => {
      const eg = getEffectiveGate(t) || '1. PL';
      return eg === currentGateCode || (currentStageCode && eg.includes(currentStageCode));
    });
  }, [childTasks, currentGateCode, currentStageCode]);

  const gateDueDates = gateTasks
    .map((t) => t.exp_end_date || t.target_finish_date || t.actual_end_date || t.planned_date)
    .filter(Boolean) as string[];
  const plannedGateFinish = gateDueDates.length > 0 ? [...gateDueDates].sort().reverse()[0] : 'N/A';
  const currentGateFinish = plannedGateFinish; // on-track unless overdue
  const hasOverdueGateTask = gateTasks.some(
    (t) => t.is_overdue && t.status !== 'Completed'
  );
  const isGateScheduleGreen = !hasOverdueGateTask;

  // 2. Gate Readiness
  const readinessResult = useMemo(() => {
    return calculateGateReadiness(tasks, currentGateCode);
  }, [tasks, currentGateCode]);
  const gateReadinessPct = readinessResult.readinessPercentage;
  const gateReadinessColor =
    gateReadinessPct >= 90 ? 'GREEN' : gateReadinessPct >= 50 ? 'YELLOW' : 'RED';

  // 3. KGD Status
  const gateKgdTasks = useMemo(() => {
    return gateTasks.filter(isMandatoryKgdTask);
  }, [gateTasks]);

  const completedKgdCount = useMemo(() => {
    return gateKgdTasks.filter(
      (t) => (t.status || '').toLowerCase() === 'completed' || (t.progress || 0) >= 100
    ).length;
  }, [gateKgdTasks]);

  const totalKgdCount = gateKgdTasks.length;

  const kgdIndicators = useMemo(() => {
    return gateKgdTasks.map((t) => calculateKgdIndicator(t));
  }, [gateKgdTasks]);

  const greenKgdCount = kgdIndicators.filter((i) => i.color === 'GREEN').length;
  const yellowKgdCount = kgdIndicators.filter((i) => i.color === 'YELLOW').length;
  const redKgdCount = kgdIndicators.filter((i) => i.color === 'RED').length;

  const kgdColor =
    redKgdCount > 0
      ? 'RED'
      : yellowKgdCount > 0
        ? 'YELLOW'
        : 'GREEN';

  const kgdOnTrackPct =
    totalKgdCount > 0 ? Math.round((greenKgdCount / totalKgdCount) * 100) : 100;

  // 4. Gate Review Status
  const pdDecision = stageMover?.platform_director_decision || 'Pending';
  const gateReviewStatus = pdDecision;

  // 5. Design Reviews
  const completedDrCount = designReviews.filter(
    (dr: any) => dr.status === 'Approved' || dr.review_status === 'Approved'
  ).length;
  const totalDrCount = designReviews.length;

  // 6. OIL (Open Issues)
  const openIssuesCount = issues.filter(
    (i: any) => (i.status || '').toLowerCase() !== 'closed'
  ).length;
  const lateIssuesCount = issues.filter(
    (i: any) =>
      (i.status || '').toLowerCase() !== 'closed' &&
      (i.priority === 'Critical' ||
        i.priority === 'High' ||
        (i.due_date && new Date(i.due_date) < new Date()))
  ).length;

  // 7. Flawless Launch Status
  const flmStatus = flmData?.overall_flm_status || 'GREEN';

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Overview Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                Consolidated Program Health
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Live aggregation from all integrated modules
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-sky-600" />
              <span>Project Status Summary</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">Project Manager:</span>
              <span className="font-bold text-slate-800">
                {project?.custom_project_manager || project?.owner || 'Administrator'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">Current Gate:</span>
              <span className="font-bold text-indigo-700 font-mono">{currentGateCode}</span>
            </div>
            <ProjectStatusBadge status={project?.status || 'Open'} />
          </div>
        </div>

        {/* Schedule & Timing Comparison Bar */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Overall Planned Finish
            </div>
            <div className="font-mono font-bold text-slate-900 mt-1">{plannedFinish}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Overall Current Finish</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[9px] font-black',
                  isOverallScheduleGreen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                )}
              >
                {isOverallScheduleGreen ? 'On Track (Green)' : 'Delayed (Red)'}
              </span>
            </div>
            <div className="font-mono font-bold text-slate-900 mt-1">{currentFinish}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Gate Planned Finish ({currentStageCode})
            </div>
            <div className="font-mono font-bold text-slate-900 mt-1">{plannedGateFinish}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Gate Current Finish</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[9px] font-black',
                  isGateScheduleGreen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                )}
              >
                {isGateScheduleGreen ? 'Green' : 'Red'}
              </span>
            </div>
            <div className="font-mono font-bold text-slate-900 mt-1">{currentGateFinish}</div>
          </div>
        </div>
      </div>

      {/* Interactive Drill-down Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Gate Readiness Card */}
        <div
          onClick={() => onNavigateTab('gates')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Gate Readiness</h4>
                <p className="text-[11px] text-slate-400">Gate {currentStageCode} task readiness</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {gateReadinessPct}%
            </div>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold',
                gateReadinessColor === 'GREEN'
                  ? 'bg-emerald-100 text-emerald-800'
                  : gateReadinessColor === 'YELLOW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
              )}
            >
              {gateReadinessColor} (≥90% Green)
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            {readinessResult.activeTasksCount} active tasks in gate • {readinessResult.skippedTasksCount} skipped
          </p>
        </div>

        {/* 2. Key Gate Deliverables (KGD) Card */}
        <div
          onClick={() => onNavigateTab('gates')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Key Gate Deliverables</h4>
                <p className="text-[11px] text-slate-400">KGD completion & evidence</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {completedKgdCount} / {totalKgdCount}
            </div>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold',
                kgdColor === 'GREEN'
                  ? 'bg-emerald-100 text-emerald-800'
                  : kgdColor === 'YELLOW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
              )}
            >
              {kgdColor} ({kgdOnTrackPct}%)
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            {totalKgdCount > 0
              ? `${completedKgdCount} completed • ${greenKgdCount} on track`
              : 'Only authoritative gate deliverables counted'}
          </p>
        </div>

        {/* 3. Gate Review Decision Card */}
        <div
          onClick={() => onNavigateTab('stage-mover')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Gate Review Result</h4>
                <p className="text-[11px] text-slate-400">Board decision & Stage Mover</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-lg font-black text-slate-900">
              {gateReviewStatus}
            </div>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold',
                gateReviewStatus === 'Pass'
                  ? 'bg-emerald-100 text-emerald-800'
                  : gateReviewStatus === 'Pass with Follow-up'
                    ? 'bg-amber-100 text-amber-800'
                    : gateReviewStatus === 'Escalate'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-600'
              )}
            >
              {gateReviewStatus === 'Pass' ? 'Stage Move Approved' : 'Review Required'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Platform Director: {stageMover?.platform_director_name || 'Assigned Director'}
          </p>
        </div>

        {/* 4. Flawless Launch (FLM) Card */}
        <div
          onClick={() => onNavigateTab('flawless-launch')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Flawless Launch</h4>
                <p className="text-[11px] text-slate-400">Gate execution & OI% mandatory rule</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-xl font-black text-slate-900 font-mono">
              {flmData?.overall_green_count || 5} / {flmData?.overall_total_metrics || 5} Green
            </div>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold',
                flmStatus === 'GREEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              )}
            >
              {flmStatus}
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            4 of 5 indicators required with mandatory OI%
          </p>
        </div>

        {/* 5. Design Reviews Card */}
        <div
          onClick={() => onNavigateTab('reviews')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Design Reviews</h4>
                <p className="text-[11px] text-slate-400">Gate design sign-offs & checklist</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {completedDrCount} / {totalDrCount}
            </div>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold',
                completedDrCount === totalDrCount && totalDrCount > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              )}
            >
              {completedDrCount === totalDrCount && totalDrCount > 0 ? 'Completed' : 'Pending'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Product Group design checklists
          </p>
        </div>

        {/* 6. Open Issue List (OIL) Card */}
        <div
          onClick={() => onNavigateTab('issues')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md transition cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Open Issue List (OIL)</h4>
                <p className="text-[11px] text-slate-400">Project risk & issue tracking</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {openIssuesCount} Total
            </div>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold',
                lateIssuesCount === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : lateIssuesCount <= 2
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
              )}
            >
              {lateIssuesCount} Late / In Danger
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Linked to tasks and gate deliverables
          </p>
        </div>
      </div>
    </div>
  );
}
