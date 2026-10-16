'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Task } from '@/types/task.types';
import { Gate } from '@/types/gate.types';
import { Project } from '@/types/project.types';
import { TaskRelationship } from '@/types/task-dependency.types';
import { parseDate, recalculateSchedule } from '@/utils/gantt-scheduling-engine';
import {
  formatTimelineDate,
  formatReportHeaderDate,
  exportTimelineToPng,
  exportTimelineToPdf,
} from '@/utils/development-time-plan-exporter';
import {
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  Move,
} from 'lucide-react';

interface DevelopmentTimePlanViewProps {
  projectId: string;
  projectName: string;
  project?: Project | null;
  tasks: Task[];
  dependencies?: TaskRelationship[];
  gates?: Gate[];
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
}

interface MilestoneCallout {
  id: string;
  subject: string;
  dateStr: string;
  secondaryDateStr?: string;
  date: Date;
  x: number;
  labelX: number;
  labelWidth: number;
  type: 'customer' | 'internal' | 'gate';
  tier?: number;
  task?: Task;
  gate?: Gate;
}

interface TaskBarItem {
  task: Task;
  name: string;
  subject: string;
  startDate: Date;
  endDate: Date;
  startX: number;
  endX: number;
  width: number;
  laneIndex: number;
  isCritical: boolean;
  color: { fill: string; stroke: string; text: string; subText: string };
}

// Curated automotive color themes matching the reference chart
const TASK_BAR_PALETTES = [
  { fill: '#B0BEC5', stroke: '#78909C', text: '#263238', subText: '#37474F' }, // Slate Grey (Motor Assembly)
  { fill: '#9CCC65', stroke: '#7CB342', text: '#1B5E20', subText: '#2E7D32' }, // Lime Green (GBX Dev)
  { fill: '#29B6F6', stroke: '#0288D1', text: '#01579B', subText: '#0277BD' }, // Cyan Blue (Rotor Dev)
  { fill: '#FFEE58', stroke: '#FBC02D', text: '#F57F17', subText: '#E65100' }, // Warm Yellow (CBA Dev)
  { fill: '#FFA726', stroke: '#F57C00', text: '#E65100', subText: '#BF360C' }, // Amber Orange (PV Validation)
  { fill: '#90CAF9', stroke: '#5C6BC0', text: '#1A237E', subText: '#283593' }, // Periwinkle / Blue-Grey
  { fill: '#80CBC4', stroke: '#00897B', text: '#004D40', subText: '#00695C' }, // Teal
  { fill: '#CE93D8', stroke: '#8E24AA', text: '#4A148C', subText: '#6A1B9A' }, // Lavender
];

export function DevelopmentTimePlanView({
  projectId,
  projectName,
  project,
  tasks,
  dependencies = [],
  gates = [],
  onViewTask,
  onEditTask,
}: DevelopmentTimePlanViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showAllGateReview, setShowAllGateReview] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [zoomMode, setZoomMode] = useState<'fit' | '100%'>('fit');
  const [hoveredItem, setHoveredItem] = useState<{
    title: string;
    type: string;
    date: string;
    status?: string;
    progress?: number;
    isCritical?: boolean;
    x: number;
    y: number;
  } | null>(null);

  // 1. Calculate CPM Schedule & Critical Path
  const scheduleCalc = useMemo(() => {
    return recalculateSchedule(tasks, dependencies);
  }, [tasks, dependencies]);

  const criticalPathIds = scheduleCalc.criticalPathTaskIds;

  // 2. Identify and Filter Milestones & Tasks
  const { normalTasks, milestoneCallouts, projectStartDate, projectFinishDate } = useMemo(() => {
    const normTasks: Task[] = [];
    const rawMilestones: MilestoneCallout[] = [];

    const checkIsMilestone = (t: Task): boolean => {
      if (t.is_milestone || (t as any).custom_is_milestone === 1) return true;
      if (t.milestone_type && t.milestone_type !== 'None') return true;
      if ((t as any).custom_milestone_type && (t as any).custom_milestone_type !== 'None') return true;
      if (t.duration === 0) return true;
      if (t.description && t.description.includes('<!-- MILESTONE_META:')) {
        try {
          const match = t.description.match(/<!-- MILESTONE_META: (.*?) -->/);
          if (match && match[1]) {
            const meta = JSON.parse(match[1]);
            if (meta.is_milestone) return true;
          }
        } catch {}
      }
      if (t.exp_start_date && t.exp_end_date && t.exp_start_date === t.exp_end_date) return true;
      return false;
    };

    const checkIsCustomerMilestone = (t: Task): boolean => {
      if (t.is_customer_milestone || (t as any).custom_is_customer_milestone === 1) return true;
      if (t.milestone_type === 'Customer Milestone' || (t as any).custom_milestone_type === 'Customer Milestone') return true;
      if (t.description && t.description.includes('"is_customer_milestone":true')) return true;
      const sub = (t.subject || '').toLowerCase();
      return sub.includes('customer') || sub.includes('ppap') || sub.includes('psw') || sub.includes('tata');
    };

    tasks.forEach((t) => {
      if (checkIsMilestone(t)) {
        const isCustomer = checkIsCustomerMilestone(t);
        const dStr = t.planned_date || t.exp_start_date || t.exp_end_date || '';
        const d = parseDate(dStr);
        const labelW = Math.max(85, Math.min(180, (t.subject || '').length * 6.2));

        rawMilestones.push({
          id: t.name,
          subject: t.subject,
          dateStr: formatTimelineDate(d),
          secondaryDateStr:
            t.exp_end_date && t.exp_start_date && t.exp_start_date !== t.exp_end_date
              ? `${formatTimelineDate(t.exp_start_date)} - ${formatTimelineDate(t.exp_end_date)}`
              : undefined,
          date: d,
          x: 0,
          labelX: 0,
          labelWidth: labelW,
          type: isCustomer ? 'customer' : 'internal',
          task: t,
        });
      } else {
        normTasks.push(t);
      }
    });

    gates.forEach((g) => {
      const gDateStr = g.planned_date || g.target_date || g.actual_date || '';
      if (!gDateStr) return;
      const gDate = parseDate(gDateStr);
      const sub = g.gate_name || `${g.gate_type || 'Gate'} Review`;
      const labelW = Math.max(90, Math.min(180, sub.length * 6.2));

      rawMilestones.push({
        id: g.name,
        subject: sub,
        dateStr: formatTimelineDate(gDate),
        date: gDate,
        x: 0,
        labelX: 0,
        labelWidth: labelW,
        type: 'gate',
        gate: g,
      });
    });

    // Boundaries
    let pStart = project?.expected_start_date ? parseDate(project.expected_start_date) : null;
    let pFinish = project?.expected_end_date ? parseDate(project.expected_end_date) : null;

    tasks.forEach((t) => {
      const s = t.exp_start_date ? parseDate(t.exp_start_date) : null;
      const e = t.exp_end_date ? parseDate(t.exp_end_date) : s;
      if (s && (!pStart || s.getTime() < pStart.getTime())) pStart = s;
      if (e && (!pFinish || e.getTime() > pFinish.getTime())) pFinish = e;
    });

    gates.forEach((g) => {
      const gd = g.planned_date || g.target_date || g.actual_date;
      if (gd) {
        const d = parseDate(gd);
        if (!pStart || d.getTime() < pStart.getTime()) pStart = d;
        if (!pFinish || d.getTime() > pFinish.getTime()) pFinish = d;
      }
    });

    if (!pStart) pStart = parseDate('2024-04-01');
    if (!pFinish) pFinish = parseDate('2026-05-07');

    return {
      normalTasks: normTasks,
      milestoneCallouts: rawMilestones,
      projectStartDate: pStart,
      projectFinishDate: pFinish,
    };
  }, [tasks, gates, project]);

  // 3. Time Scale & Dimension Calculation
  const {
    svgWidth,
    svgHeight,
    baselineY,
    taskLanesBottomY,
    timeToX,
    minTime,
    maxTime,
    quarters,
    todayX,
    placedAboveCallouts,
    placedBelowCallouts,
    placedTaskBars,
  } = useMemo(() => {
    // Left boundary starts cleanly at project start without awkward empty offset
    const minT = projectStartDate.getTime();
    const maxT = projectFinishDate.getTime();
    const totalDuration = Math.max(86400000 * 30, maxT - minT);

    const leftMargin = 85;
    const rightMargin = 85;
    const chartContentWidth = 1430;
    const width = chartContentWidth + leftMargin + rightMargin;

    const timeX = (d: Date): number => {
      const pct = (d.getTime() - minT) / totalDuration;
      return leftMargin + Math.max(0, Math.min(1, pct)) * chartContentWidth;
    };

    // Calculate Quarters & Years along baseline
    const qList: { label: string; yearStr: string; startX: number; midX: number; endX: number }[] = [];
    const curYear = new Date(minT).getFullYear();
    const endYear = new Date(maxT).getFullYear();

    for (let y = curYear; y <= endYear; y++) {
      const qDates = [
        { q: '1st Quarter', start: new Date(y, 0, 1), end: new Date(y, 2, 31, 23, 59, 59) },
        { q: '2nd Quarter', start: new Date(y, 3, 1), end: new Date(y, 5, 30, 23, 59, 59) },
        { q: '3rd Quarter', start: new Date(y, 6, 1), end: new Date(y, 8, 30, 23, 59, 59) },
        { q: '4th Quarter', start: new Date(y, 9, 1), end: new Date(y, 11, 31, 23, 59, 59) },
      ];

      qDates.forEach(({ q, start, end }) => {
        if (end.getTime() >= minT && start.getTime() <= maxT) {
          const clampedStart = Math.max(minT, start.getTime());
          const clampedEnd = Math.min(maxT, end.getTime());
          const sx = timeX(new Date(clampedStart));
          const ex = timeX(new Date(clampedEnd));
          const midX = sx + (ex - sx) / 2;
          const yearStr = `'${String(y).slice(-2)}`;
          qList.push({ label: q, yearStr, startX: sx, midX, endX: ex });
        }
      });
    }

    // Today marker position
    const today = new Date();
    const tX = today.getTime() >= minT && today.getTime() <= maxT ? timeX(today) : null;

    // Distribute Milestones Above and Below the baseline
    const aboveItems: MilestoneCallout[] = [];
    const belowItems: MilestoneCallout[] = [];

    milestoneCallouts.forEach((m) => {
      const x = timeX(m.date);
      const mWithX = { ...m, x, labelX: x };

      if (m.type === 'customer') {
        aboveItems.push(mWithX);
      } else if (m.type === 'gate') {
        belowItems.push(mWithX);
      } else {
        const sub = m.subject.toLowerCase();
        if (
          sub.includes('design') ||
          sub.includes('validation') ||
          sub.includes('dispatch') ||
          sub.includes('supplier') ||
          sub.includes('build @ tata')
        ) {
          aboveItems.push(mWithX);
        } else {
          belowItems.push(mWithX);
        }
      }
    });

    // Multi-tier collision avoidance algorithm for Above Callouts
    aboveItems.sort((a, b) => a.x - b.x);
    const tierLastEndAbove: number[] = [0, 0, 0, 0];
    const minSpacing = 115; // Minimum px spacing between callout centerpoints on the same tier

    aboveItems.forEach((item) => {
      let chosenTier = 0;
      let minGap = -Infinity;

      for (let t = 0; t < 4; t++) {
        const gap = item.x - tierLastEndAbove[t];
        if (gap >= minSpacing) {
          chosenTier = t;
          break;
        }
        if (gap > minGap) {
          minGap = gap;
          chosenTier = t;
        }
      }

      item.tier = chosenTier;
      // Auto-reposition label horizontally if too close to previous item on same tier
      let adjX = item.x;
      if (tierLastEndAbove[chosenTier] > 0 && adjX - tierLastEndAbove[chosenTier] < minSpacing) {
        adjX = tierLastEndAbove[chosenTier] + minSpacing;
      }
      item.labelX = adjX;
      tierLastEndAbove[chosenTier] = adjX;
    });

    const maxAboveTier = aboveItems.length > 0 ? Math.max(...aboveItems.map((a) => a.tier || 0)) : 1;
    const aboveCalloutHeight = Math.max(130, 40 + (maxAboveTier + 1) * 44);
    // On-screen: baseline starts directly below above-callouts without duplicate 125px header offset
    const bY = 28 + aboveCalloutHeight;

    // Pack Normal Tasks into horizontal lanes
    const sortedTasks = [...normalTasks].sort((a, b) => {
      const sa = a.exp_start_date || '';
      const sb = b.exp_start_date || '';
      return sa.localeCompare(sb);
    });

    const lanes: { endX: number }[] = [];
    const taskBars: TaskBarItem[] = [];

    sortedTasks.forEach((t, idx) => {
      const s = parseDate(t.exp_start_date || '2024-04-01');
      const e = parseDate(t.exp_end_date || t.exp_start_date || '2024-08-15');
      const sx = timeX(s);
      const ex = timeX(e);
      const w = Math.max(48, ex - sx);

      // First available lane
      let laneIdx = 0;
      let placed = false;
      for (let l = 0; l < lanes.length; l++) {
        if (lanes[l].endX + 6 <= sx) {
          laneIdx = l;
          lanes[l].endX = sx + w;
          placed = true;
          break;
        }
      }
      if (!placed) {
        laneIdx = lanes.length;
        lanes.push({ endX: sx + w });
      }

      const isCrit = criticalPathIds.has(t.name);
      const color = TASK_BAR_PALETTES[(laneIdx + idx) % TASK_BAR_PALETTES.length];

      taskBars.push({
        task: t,
        name: t.name,
        subject: t.subject,
        startDate: s,
        endDate: e,
        startX: sx,
        endX: sx + w,
        width: w,
        laneIndex: laneIdx,
        isCritical: isCrit,
        color,
      });
    });

    const totalLanes = Math.max(1, lanes.length);
    const laneHeight = totalLanes <= 4 ? 32 : 28;
    const barHeight = totalLanes <= 4 ? 24 : 22;
    const taskLanesBottom = bY + 20 + totalLanes * laneHeight;

    // Multi-tier collision avoidance algorithm for Below Callouts
    belowItems.sort((a, b) => a.x - b.x);
    const tierLastEndBelow: number[] = [0, 0, 0, 0];

    belowItems.forEach((item) => {
      let chosenTier = 0;
      let minGap = -Infinity;

      for (let t = 0; t < 4; t++) {
        const gap = item.x - tierLastEndBelow[t];
        if (gap >= minSpacing) {
          chosenTier = t;
          break;
        }
        if (gap > minGap) {
          minGap = gap;
          chosenTier = t;
        }
      }

      item.tier = chosenTier;
      let adjX = item.x;
      if (tierLastEndBelow[chosenTier] > 0 && adjX - tierLastEndBelow[chosenTier] < minSpacing) {
        adjX = tierLastEndBelow[chosenTier] + minSpacing;
      }
      item.labelX = adjX;
      tierLastEndBelow[chosenTier] = adjX;
    });

    const maxBelowTier = belowItems.length > 0 ? Math.max(...belowItems.map((b) => b.tier || 0)) : 1;
    const belowCalloutsHeight = Math.max(120, 35 + (maxBelowTier + 1) * 44);
    const legendHeight = 44;
    const height = taskLanesBottom + belowCalloutsHeight + legendHeight + 20;

    return {
      svgWidth: width,
      svgHeight: height,
      baselineY: bY,
      taskLanesBottomY: taskLanesBottom,
      timeToX: timeX,
      minTime: minT,
      maxTime: maxT,
      quarters: qList,
      todayX: tX,
      placedAboveCallouts: aboveItems,
      placedBelowCallouts: belowItems,
      placedTaskBars: taskBars,
    };
  }, [projectStartDate, projectFinishDate, milestoneCallouts, normalTasks, criticalPathIds]);

  // Compute Task Dependencies connectors
  const placedDependencies = useMemo(() => {
    if (!dependencies || dependencies.length === 0) return [];
    const barMap = new Map<string, TaskBarItem>();
    placedTaskBars.forEach((b) => barMap.set(b.name, b));

    const result: {
      id: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      isCritical: boolean;
    }[] = [];

    dependencies.forEach((dep, idx) => {
      const predId = dep.predecessor_id || (dep as any).predecessor_task;
      const succId = dep.successor_id || (dep as any).successor_task;
      const pred = barMap.get(predId);
      const succ = barMap.get(succId);
      if (pred && succ) {
        const predY = baselineY + 20 + pred.laneIndex * 32 + 12;
        const succY = baselineY + 20 + succ.laneIndex * 32 + 12;
        result.push({
          id: `dep-${predId}-${succId}-${idx}`,
          fromX: pred.endX,
          fromY: predY,
          toX: succ.startX,
          toY: succY,
          isCritical: pred.isCritical && succ.isCritical,
        });
      }
    });

    return result;
  }, [dependencies, placedTaskBars, baselineY]);

  // Export handlers
  const handleDownloadPng = async () => {
    if (!svgRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      await exportTimelineToPng(svgRef.current, projectId, projectName);
    } catch (err: any) {
      console.error('PNG Export failed:', err);
      setExportError(err.message || 'Failed to generate PNG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!svgRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      await exportTimelineToPdf(svgRef.current, projectId, projectName);
    } catch (err: any) {
      console.error('PDF Export failed:', err);
      setExportError(err.message || 'Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const criticalPathSubtitle =
    criticalPathIds.size > 0
      ? `Critical Path: ${criticalPathIds.size} tasks identified`
      : 'Critical Path to be identified';

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-md font-sans transition-all duration-300 ${
        isExpanded
          ? 'fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden rounded-none border-none'
          : 'w-full overflow-hidden'
      }`}
    >
      {/* 1. Sleek Compact Header (Appears Exactly ONCE) */}
      <div className="bg-white px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Cyan Accent Bar + Bold Italic Title + Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-[#00A3C4] rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black italic tracking-tight text-[#007791]">
                Development Time Plan &amp; Customer Milestones
              </h1>
              {projectName && (
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                  • {projectName} ({projectId})
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-600 leading-none">
              {criticalPathSubtitle}
            </p>
          </div>
        </div>

        {/* Right: Date + Glossy 'Show at All gate review' + View Controls + Export Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-xs font-semibold text-slate-500 mr-1 hidden lg:inline">
            {formatReportHeaderDate(new Date())}
          </div>

          {/* Glossy 3D Blue Button Matching Reference Image */}
          <button
            type="button"
            onClick={() => setShowAllGateReview(!showAllGateReview)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold text-white transition-all cursor-pointer border select-none ${
              showAllGateReview
                ? 'bg-gradient-to-b from-[#6BA5DE] via-[#2572C4] to-[#174F8B] border-[#134377] ring-2 ring-sky-300 shadow-xs'
                : 'bg-gradient-to-b from-[#99C5F0] via-[#4D8DD4] to-[#2B6DBA] border-[#2562A8] hover:from-[#A8D0F5] hover:to-[#3577C3] shadow-xs'
            }`}
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
            title="Highlight all Gate Review events across the timeline"
          >
            Show at All gate review
          </button>

          {/* Fit to Screen / 100% Zoom Toggle (Shown prominently in fullscreen) */}
          {isExpanded && (
            <button
              type="button"
              onClick={() => setZoomMode(zoomMode === 'fit' ? '100%' : 'fit')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              title={zoomMode === 'fit' ? 'Switch to 100% Scrollable View' : 'Fit Entire Timeline on One Screen'}
            >
              {zoomMode === 'fit' ? <Move className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
              <span>{zoomMode === 'fit' ? 'Fit Screen' : '100% Size'}</span>
            </button>
          )}

          {/* PNG Download */}
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Download high-resolution image of the timeline"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" /> : <Download className="h-3.5 w-3.5 text-slate-600" />}
            <span className="hidden sm:inline">PNG</span>
          </button>

          {/* PDF Download */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Download landscape PDF document of the timeline"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" /> : <FileText className="h-3.5 w-3.5 text-rose-600" />}
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Obvious Fullscreen / Exit Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer border ${
              isExpanded
                ? 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Timeline Fullscreen'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-sky-700" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mx-4 mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {exportError}
        </div>
      )}

      {/* 2. Visual Timeline Viewport: Fits Entire Timeline on Screen in Fullscreen */}
      <div
        className={`relative bg-white ${
          isExpanded
            ? zoomMode === 'fit'
              ? 'flex-1 w-full h-[calc(100vh-56px)] flex items-center justify-center p-2 overflow-hidden'
              : 'flex-1 w-full h-[calc(100vh-56px)] overflow-auto p-4 custom-scrollbar'
            : 'overflow-x-auto p-3 custom-scrollbar'
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className={`select-none ${
            isExpanded && zoomMode === 'fit'
              ? 'w-full h-full max-w-full max-h-full'
              : 'min-w-[1400px]'
          }`}
          style={
            !isExpanded || zoomMode === '100%'
              ? { width: `${svgWidth}px`, height: `${svgHeight}px`, minWidth: `${svgWidth}px` }
              : undefined
          }
        >
          {/* Definitions: Arrow markers & filters */}
          <defs>
            <marker
              id="dependency-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748B" />
            </marker>
            <marker
              id="dependency-arrow-crit"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#DC2626" />
            </marker>
            <linearGradient id="glossy-gate-btn-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#99C5F0" />
              <stop offset="35%" stopColor="#6BA5DE" />
              <stop offset="70%" stopColor="#2F78CC" />
              <stop offset="100%" stopColor="#1E60B0" />
            </linearGradient>
            <linearGradient id="glossy-gate-btn-grad-active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6BA5DE" />
              <stop offset="35%" stopColor="#2572C4" />
              <stop offset="100%" stopColor="#174F8B" />
            </linearGradient>
            <filter id="btn-drop-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background */}
          <rect width={svgWidth} height={svgHeight} fill="#FFFFFF" />

          {/* ========================================================================= */}
          {/* DEDICATED EXPORT HEADER (HIDDEN ON-SCREEN TO PREVENT DUPLICATES)           */}
          {/* Unhidden automatically only during PNG and PDF generation by the exporter */}
          {/* ========================================================================= */}
          <g id="svg-export-header" style={{ display: 'none' }} transform="translate(0, -85)">
            <rect x="0" y="0" width={svgWidth} height="85" fill="#FFFFFF" />
            <rect x="48" y="16" width="4.5" height="46" rx="1.5" fill="#00A3C4" />
            <text
              x="64"
              y="43"
              fill="#007791"
              fontSize="26"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="-0.5"
              fontFamily="sans-serif, system-ui"
            >
              Development Time Plan &amp; Customer Milestones
            </text>
            <text
              x="64"
              y="64"
              fill="#0F172A"
              fontSize="13"
              fontWeight="600"
              fontFamily="sans-serif, system-ui"
            >
              {criticalPathSubtitle}
            </text>
            <text
              x={svgWidth - 48}
              y="32"
              textAnchor="end"
              fill="#64748B"
              fontSize="12"
              fontWeight="600"
              fontFamily="sans-serif, system-ui"
            >
              {formatReportHeaderDate(new Date())}
            </text>
            <g transform={`translate(${svgWidth - 250}, 38)`}>
              <rect
                x="0"
                y="0"
                width="202"
                height="28"
                rx="4"
                fill="url(#glossy-gate-btn-grad)"
                stroke="#2562A8"
                strokeWidth="1.2"
              />
              <text
                x="101"
                y="18"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="11.5"
                fontWeight="700"
                fontFamily="sans-serif, system-ui"
              >
                Show at All gate review
              </text>
            </g>
          </g>

          {/* Quarter & Year Bands Background (Subtle Alternating Vertical Strips) */}
          {quarters.map((q, idx) => (
            <rect
              key={`q-bg-${idx}`}
              x={q.startX}
              y={baselineY - 14}
              width={q.endX - q.startX}
              height={taskLanesBottomY - (baselineY - 14) + 10}
              fill={idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF'}
              opacity={0.8}
            />
          ))}

          {/* ======================================================== */}
          {/* PRIMARY HORIZONTAL TIMELINE BASELINE                      */}
          {/* Starts cleanly at left boundary without empty gap         */}
          {/* ======================================================== */}
          <line
            x1={timeToX(projectStartDate)}
            y1={baselineY}
            x2={timeToX(projectFinishDate)}
            y2={baselineY}
            stroke="#94A3B8"
            strokeWidth="1.75"
          />

          {/* Quarter Labels & Ticks on Baseline */}
          {quarters.map((q, idx) => (
            <g key={`q-tick-${idx}`}>
              {/* Vertical Tick on Baseline */}
              <line
                x1={q.startX}
                y1={baselineY - 6}
                x2={q.startX}
                y2={baselineY + 6}
                stroke="#64748B"
                strokeWidth="1.2"
              />
              {/* Quarter Title (e.g. 2nd Quarter) */}
              <text
                x={q.midX}
                y={baselineY - 5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill="#475569"
                fontFamily="sans-serif"
              >
                {q.label}
              </text>
              {/* Year Stamp (e.g. '24) */}
              <text
                x={q.startX + 6}
                y={baselineY + 11}
                fontSize="8.5"
                fontWeight="500"
                fill="#94A3B8"
                fontFamily="sans-serif"
              >
                {q.yearStr}
              </text>
            </g>
          ))}

          {/* ======================================================== */}
          {/* PROJECT START & FINISH BOUNDARY MARKERS                  */}
          {/* Positioned cleanly at the left and right boundaries       */}
          {/* ======================================================== */}
          {projectStartDate && (
            <g
              transform={`translate(${timeToX(projectStartDate)}, ${baselineY})`}
              className="cursor-default"
            >
              <line x1="0" y1="-26" x2="0" y2="8" stroke="#1E293B" strokeWidth="1.75" />
              <text
                x="-8"
                y="-16"
                textAnchor="end"
                fontSize="10"
                fontWeight="800"
                fill="#1E293B"
                fontFamily="sans-serif"
              >
                Start
              </text>
              <text
                x="-8"
                y="-5"
                textAnchor="end"
                fontSize="8.5"
                fontWeight="600"
                fill="#64748B"
                fontFamily="sans-serif"
              >
                {formatTimelineDate(projectStartDate)}
              </text>
            </g>
          )}

          {projectFinishDate && (
            <g
              transform={`translate(${timeToX(projectFinishDate)}, ${baselineY})`}
              className="cursor-default"
            >
              <line x1="0" y1="-26" x2="0" y2="8" stroke="#1E293B" strokeWidth="1.75" />
              <text
                x="8"
                y="-16"
                textAnchor="start"
                fontSize="10"
                fontWeight="800"
                fill="#1E293B"
                fontFamily="sans-serif"
              >
                Finish
              </text>
              <text
                x="8"
                y="-5"
                textAnchor="start"
                fontSize="8.5"
                fontWeight="600"
                fill="#64748B"
                fontFamily="sans-serif"
              >
                {formatTimelineDate(projectFinishDate)}
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* TODAY MARKER                                             */}
          {/* ======================================================== */}
          {todayX !== null && (
            <g transform={`translate(${todayX}, ${baselineY})`} className="cursor-default">
              <line
                x1="0"
                y1="-36"
                x2="0"
                y2={taskLanesBottomY - baselineY}
                stroke="#16A34A"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <rect
                x="-19"
                y="-46"
                width="38"
                height="15"
                rx="3"
                fill="#15803D"
                filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.2))"
              />
              <text
                x="0"
                y="-35"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="#FFFFFF"
                fontFamily="sans-serif"
              >
                Today
              </text>
            </g>
          )}

          {/* ======================================================== */}
          {/* MILESTONE CALLOUTS ABOVE TIMELINE (CUSTOMER MILESTONES)  */}
          {/* Collision-avoidance with dynamic angled leader lines      */}
          {/* ======================================================== */}
          {placedAboveCallouts.map((item, idx) => {
            const tier = item.tier || 0;
            const labelBottomY = baselineY - (36 + tier * 44);
            const diamondSize = 5.5;
            const isCustomer = item.type === 'customer';
            const hasOffset = Math.abs(item.labelX - item.x) > 2;

            return (
              <g
                key={`above-ms-${item.id}-${idx}`}
                className="cursor-pointer group"
                onMouseEnter={() =>
                  setHoveredItem({
                    title: item.subject,
                    type: isCustomer ? 'Customer Milestone' : 'Milestone',
                    date: item.secondaryDateStr || item.dateStr,
                    x: item.labelX,
                    y: labelBottomY,
                  })
                }
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (item.task && onViewTask) onViewTask(item.task);
                }}
              >
                {/* Dynamic Leader Line (Angled if offset to prevent overlap) */}
                {hasOffset ? (
                  <path
                    d={`M ${item.x} ${baselineY} L ${item.x} ${baselineY - 10} L ${item.labelX} ${labelBottomY + 22} L ${item.labelX} ${labelBottomY + 12}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.1"
                  />
                ) : (
                  <line
                    x1={item.x}
                    y1={baselineY}
                    x2={item.x}
                    y2={labelBottomY + 12}
                    stroke="#475569"
                    strokeWidth="1.1"
                  />
                )}

                {/* Diamond Marker at Actual Date on Baseline */}
                <rect
                  x={item.x - diamondSize}
                  y={baselineY - diamondSize}
                  width={diamondSize * 2}
                  height={diamondSize * 2}
                  transform={`rotate(45, ${item.x}, ${baselineY})`}
                  fill={isCustomer ? '#0284C7' : '#475569'}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />

                {/* Text Label Block (Centered at collision-free labelX) */}
                <g transform={`translate(${item.labelX}, ${labelBottomY})`}>
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#0F172A"
                    fontFamily="sans-serif"
                  >
                    {item.subject}
                  </text>
                  <text
                    x="0"
                    y="10"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="500"
                    fill="#64748B"
                    fontFamily="sans-serif"
                  >
                    {item.secondaryDateStr || item.dateStr}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* TASK DEPENDENCY CONNECTORS (CURVES & ARROWS)             */}
          {/* ======================================================== */}
          {placedDependencies.map((dep) => {
            const dx = Math.max(14, (dep.toX - dep.fromX) / 2);
            return (
              <g key={dep.id} className="pointer-events-none">
                <path
                  d={`M ${dep.fromX} ${dep.fromY} C ${dep.fromX + dx} ${dep.fromY}, ${dep.toX - dx} ${dep.toY}, ${dep.toX} ${dep.toY}`}
                  fill="none"
                  stroke={dep.isCritical ? '#DC2626' : '#64748B'}
                  strokeWidth={dep.isCritical ? '2' : '1.2'}
                  strokeDasharray={dep.isCritical ? undefined : '3 2'}
                  markerEnd={dep.isCritical ? 'url(#dependency-arrow-crit)' : 'url(#dependency-arrow)'}
                  opacity={0.8}
                />
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* NORMAL TASK BARS IN HORIZONTAL LANES                     */}
          {/* Full Task Names Visible Without Destructive Clipping      */}
          {/* ======================================================== */}
          {placedTaskBars.map((bar, idx) => {
            const laneY = baselineY + 20 + bar.laneIndex * 32;
            const barHeight = 24;
            const isCrit = bar.isCritical;
            const isHovered = hoveredItem?.title === bar.subject;
            const isWide = bar.width >= 110;

            return (
              <g
                key={`task-bar-${bar.name}-${idx}`}
                className="cursor-pointer group"
                onMouseEnter={() =>
                  setHoveredItem({
                    title: bar.subject,
                    type: isCrit ? 'Critical Path Task' : 'Task',
                    date: `${formatTimelineDate(bar.startDate)} - ${formatTimelineDate(bar.endDate)}`,
                    status: String(bar.task.status),
                    progress: bar.task.progress || 0,
                    isCritical: isCrit,
                    x: bar.startX + bar.width / 2,
                    y: laneY,
                  })
                }
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (onViewTask) onViewTask(bar.task);
                }}
              >
                {/* Task Duration Bar */}
                <rect
                  x={bar.startX}
                  y={laneY}
                  width={bar.width}
                  height={barHeight}
                  rx="3"
                  ry="3"
                  fill={bar.color.fill}
                  stroke={isCrit ? '#DC2626' : bar.color.stroke}
                  strokeWidth={isCrit ? '2.5' : '1'}
                  filter={isHovered ? 'brightness(1.05)' : undefined}
                />

                {/* Progress bar */}
                {bar.task.progress !== undefined && bar.task.progress > 0 && (
                  <rect
                    x={bar.startX}
                    y={laneY + barHeight - 2.5}
                    width={Math.max(2, (bar.width * bar.task.progress) / 100)}
                    height="2.5"
                    rx="1"
                    fill="#15803D"
                  />
                )}

                {/* Task Label */}
                {isWide ? (
                  <>
                    <text
                      x={bar.startX + bar.width / 2}
                      y={laneY + 11}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={bar.color.text}
                      fontFamily="sans-serif"
                    >
                      {bar.subject}
                    </text>
                    <text
                      x={bar.startX + bar.width / 2}
                      y={laneY + 20}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="600"
                      fill={bar.color.subText}
                      fontFamily="sans-serif"
                    >
                      {formatTimelineDate(bar.startDate)} - {formatTimelineDate(bar.endDate)}
                    </text>
                  </>
                ) : (
                  <text
                    x={bar.startX + 6}
                    y={laneY + 15}
                    textAnchor="start"
                    fontSize="8.5"
                    fontWeight="700"
                    fill={bar.color.text}
                    fontFamily="sans-serif"
                    style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                  >
                    {bar.subject}
                  </text>
                )}

                {/* Critical Path Flame Badge */}
                {isCrit && (
                  <circle
                    cx={bar.startX + 7}
                    cy={laneY + 7}
                    r="3.5"
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* MILESTONE & GATE CALLOUTS BELOW TIMELINE                 */}
          {/* Collision-avoidance with dynamic angled leader lines      */}
          {/* ======================================================== */}
          {placedBelowCallouts.map((item, idx) => {
            const tier = item.tier || 0;
            const labelTopY = taskLanesBottomY + 26 + tier * 44;
            const diamondSize = 5.5;
            const isGate = item.type === 'gate';
            const isHighlightedGate = isGate && showAllGateReview;
            const hasOffset = Math.abs(item.labelX - item.x) > 2;

            return (
              <g
                key={`below-ms-${item.id}-${idx}`}
                className="cursor-pointer group"
                onMouseEnter={() =>
                  setHoveredItem({
                    title: item.subject,
                    type: isGate ? 'Gate Review' : 'Internal Milestone',
                    date: item.secondaryDateStr || item.dateStr,
                    status: item.gate?.status || (item.task?.status as string),
                    x: item.labelX,
                    y: labelTopY,
                  })
                }
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (item.task && onViewTask) onViewTask(item.task);
                }}
              >
                {/* Dynamic Leader Line */}
                {hasOffset ? (
                  <path
                    d={`M ${item.x} ${baselineY} L ${item.x} ${taskLanesBottomY + 10} L ${item.labelX} ${labelTopY - 14} L ${item.labelX} ${labelTopY - 6}`}
                    fill="none"
                    stroke={isHighlightedGate ? '#7C3AED' : '#475569'}
                    strokeWidth={isHighlightedGate ? '1.8' : '1.1'}
                    opacity={isHighlightedGate ? 1 : 0.85}
                  />
                ) : (
                  <line
                    x1={item.x}
                    y1={baselineY}
                    x2={item.x}
                    y2={labelTopY - 6}
                    stroke={isHighlightedGate ? '#7C3AED' : '#475569'}
                    strokeWidth={isHighlightedGate ? '1.8' : '1.1'}
                    opacity={isHighlightedGate ? 1 : 0.85}
                  />
                )}

                {/* Diamond Marker at Baseline */}
                <rect
                  x={item.x - diamondSize}
                  y={baselineY - diamondSize}
                  width={diamondSize * 2}
                  height={diamondSize * 2}
                  transform={`rotate(45, ${item.x}, ${baselineY})`}
                  fill={isGate ? '#7C3AED' : '#334155'}
                  stroke={isHighlightedGate ? '#C084FC' : '#FFFFFF'}
                  strokeWidth={isHighlightedGate ? '2' : '1.2'}
                />

                {/* Text Label Block */}
                <g transform={`translate(${item.labelX}, ${labelTopY})`}>
                  {isHighlightedGate && (
                    <rect
                      x="-55"
                      y="-4"
                      width="110"
                      height="24"
                      rx="4"
                      fill="#F5F3FF"
                      stroke="#8B5CF6"
                      strokeWidth="1"
                    />
                  )}

                  <text
                    x="0"
                    y="6"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill={isGate ? '#4C1D95' : '#0F172A'}
                    fontFamily="sans-serif"
                  >
                    {item.subject}
                  </text>
                  <text
                    x="0"
                    y="16"
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="500"
                    fill="#64748B"
                    fontFamily="sans-serif"
                  >
                    {item.secondaryDateStr || item.dateStr}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ======================================================== */}
          {/* COMPACT BOTTOM LEGEND                                    */}
          {/* Positioned safely at the bottom without covering content */}
          {/* ======================================================== */}
          <g
            transform={`translate(${svgWidth / 2}, ${svgHeight - 26})`}
            className="cursor-default"
          >
            <rect
              x="-350"
              y="-14"
              width="700"
              height="28"
              rx="6"
              fill="#F8FAFC"
              stroke="#E2E8F0"
              strokeWidth="1"
            />

            {/* Task Bar */}
            <g transform="translate(-320, 0)">
              <rect x="0" y="-5" width="14" height="10" rx="2" fill="#94A3B8" stroke="#64748B" />
              <text x="18" y="3" fontSize="9" fontWeight="600" fill="#334155">
                Task Bar
              </text>
            </g>

            {/* Critical Path */}
            <g transform="translate(-225, 0)">
              <rect x="0" y="-5" width="14" height="10" rx="2" fill="#FCA5A5" stroke="#DC2626" strokeWidth="2" />
              <text x="18" y="3" fontSize="9" fontWeight="700" fill="#DC2626">
                Critical Path (🔥)
              </text>
            </g>

            {/* Customer Milestone */}
            <g transform="translate(-85, 0)">
              <rect x="0" y="-4" width="7" height="7" transform="rotate(45, 3.5, -0.5)" fill="#0284C7" stroke="#FFFFFF" />
              <text x="16" y="3" fontSize="9" fontWeight="600" fill="#0369A1">
                Customer Milestone
              </text>
            </g>

            {/* Internal Milestone */}
            <g transform="translate(65, 0)">
              <rect x="0" y="-4" width="7" height="7" transform="rotate(45, 3.5, -0.5)" fill="#334155" stroke="#FFFFFF" />
              <text x="16" y="3" fontSize="9" fontWeight="600" fill="#334155">
                Internal Milestone
              </text>
            </g>

            {/* Gate Review */}
            <g transform="translate(195, 0)">
              <rect x="0" y="-4" width="7" height="7" transform="rotate(45, 3.5, -0.5)" fill="#7C3AED" stroke="#FFFFFF" />
              <text x="16" y="3" fontSize="9" fontWeight="700" fill="#6D28D9">
                Gate Review
              </text>
            </g>

            {/* Today */}
            <g transform="translate(285, 0)">
              <rect x="0" y="-5" width="22" height="10" rx="2" fill="#15803D" />
              <text x="11" y="2" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FFFFFF">
                Today
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Tooltip */}
        {hoveredItem && (
          <div
            className="absolute z-30 pointer-events-none p-3 rounded-xl bg-slate-900/95 text-white text-xs shadow-2xl backdrop-blur-xs border border-slate-700 min-w-[180px] max-w-[280px]"
            style={{
              left: `${Math.min(svgWidth - 220, Math.max(20, hoveredItem.x - 90))}px`,
              top: `${Math.max(10, hoveredItem.y - 45)}px`,
            }}
          >
            <div className="font-bold text-slate-100 flex items-center justify-between gap-2">
              <span className="truncate">{hoveredItem.title}</span>
              {hoveredItem.isCritical && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-black">
                  CRITICAL
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
              <span>{hoveredItem.type}</span>
              <span>•</span>
              <span className="font-mono text-slate-300">{hoveredItem.date}</span>
            </div>
            {hoveredItem.status && (
              <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                <span>Status: {hoveredItem.status}</span>
                {hoveredItem.progress !== undefined && (
                  <span className="font-bold text-emerald-400">{hoveredItem.progress}%</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
