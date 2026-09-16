'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project } from '@/types/project.types';
import {
  ProjectStatusTimingChart,
  ProjectStatusTimingLineItem,
  TimingStatusSummaryKPIs,
} from '@/types/timing-status.types';
import {
  TIMING_STATUS_CONFIG,
  TimingStatusChoice,
  TIMING_STATUS_CHOICES,
  PRODUCT_GROUP_BENCHMARK_WEEKS,
} from '@/config/timing-benchmark.config';
import { timingStatusService } from '@/services/timing-status.service';
import { useAuth } from '@/providers/auth-context';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Download,
  Save,
  ShieldCheck,
  ShieldAlert,
  Info,
  Layers,
  ArrowUpDown,
  Car,
  User,
  Activity,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ProjectTimingStatusViewProps {
  project: Project;
  onRefreshProject?: () => void;
}

export function ProjectTimingStatusView({
  project,
  onRefreshProject,
}: ProjectTimingStatusViewProps) {
  const { user } = useAuth();

  // RBAC: Check if current user is PMO Admin OR assigned Project Manager
  const isPmoAdmin = user?.role === 'admin' || !!user?.permissions?.manageProjects;
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userFullName = (user?.fullName || '').toLowerCase().trim();
  const assignedPm = (project.custom_project_manager || project.owner || '').toLowerCase().trim();

  const isAssignedPm =
    isPmoAdmin ||
    (assignedPm &&
      (assignedPm === userEmail ||
        assignedPm.includes(userEmail) ||
        (userFullName && assignedPm.includes(userFullName))));

  // Local state
  const [chart, setChart] = useState<ProjectStatusTimingChart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable local copies of items & overall comments
  const [editedItems, setEditedItems] = useState<
    Record<string, { status: TimingStatusChoice; comments: string }>
  >({});
  const [overallComments, setOverallComments] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Fetch / Sync timing status
  const loadTimingStatus = useCallback(
    async (showSyncIndicator = false) => {
      try {
        if (showSyncIndicator) {
          setIsSyncing(true);
        } else {
          setIsLoading(true);
        }
        setErrorMessage(null);

        const data = await timingStatusService.getTimingStatus(project.name);
        setChart(data);
        setOverallComments(data.comments || '');

        // Initialize editable map
        const initialMap: Record<string, { status: TimingStatusChoice; comments: string }> = {};
        (data.timing_line_items || []).forEach((item) => {
          initialMap[item.reference_code] = {
            status: item.status,
            comments: item.comments || '',
          };
        });
        setEditedItems(initialMap);
        setIsDirty(false);
      } catch (err: unknown) {
        console.error('Error loading timing status:', err);
        const error = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          error.response?.data?.message || 'Failed to load project timing status chart.'
        );
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [project.name]
  );

  useEffect(() => {
    loadTimingStatus();
  }, [loadTimingStatus]);

  // Handle status changes for a line item
  const handleStatusChange = (referenceCode: string, newStatus: TimingStatusChoice) => {
    if (!isAssignedPm) return;
    setEditedItems((prev) => ({
      ...prev,
      [referenceCode]: {
        ...prev[referenceCode],
        status: newStatus,
      },
    }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  // Handle comments change for a line item
  const handleItemCommentsChange = (referenceCode: string, newComments: string) => {
    if (!isAssignedPm) return;
    setEditedItems((prev) => ({
      ...prev,
      [referenceCode]: {
        ...prev[referenceCode],
        comments: newComments,
      },
    }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  // Handle overall comments change
  const handleOverallCommentsChange = (val: string) => {
    if (!isAssignedPm) return;
    setOverallComments(val);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  // Save changes to ERPNext MariaDB
  const handleSaveChanges = async () => {
    if (!isAssignedPm || !chart) return;
    try {
      setIsSaving(true);
      setErrorMessage(null);

      const itemsToUpdate = (chart.timing_line_items || []).map((item) => {
        const edited = editedItems[item.reference_code] || {
          status: item.status,
          comments: item.comments || '',
        };
        return {
          name: item.name,
          reference_code: item.reference_code,
          status: edited.status,
          comments: edited.comments,
        };
      });

      const updated = await timingStatusService.updateTimingStatus(project.name, {
        comments: overallComments,
        timing_line_items: itemsToUpdate,
      });

      setChart(updated);
      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      console.error('Error saving timing status changes:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        error.response?.data?.message || 'Failed to save changes. Authorization denied or server error.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!chart) return;
    timingStatusService.exportToExcel(
      project.project_name || project.name,
      project.name,
      chart
    );
  };

  // KPI Calculations
  const summaryKPIs: TimingStatusSummaryKPIs = useMemo(() => {
    const items = chart?.timing_line_items || [];
    let completedOnTime = 0;
    let completedLate = 0;
    let atRisk = 0;
    let critical = 0;
    let notApplicable = 0;

    items.forEach((item) => {
      const currentStatus = editedItems[item.reference_code]?.status || item.status;
      switch (currentStatus) {
        case 'C':
          completedOnTime++;
          break;
        case 'C Late':
          completedLate++;
          break;
        case 'Y':
          atRisk++;
          break;
        case 'R':
          critical++;
          break;
        case 'N/A':
        default:
          notApplicable++;
          break;
      }
    });

    return {
      totalMilestones: items.length,
      completedOnTime,
      completedLate,
      atRisk,
      critical,
      notApplicable,
    };
  }, [chart, editedItems]);

  const productGroup = project.custom_product_group || 'Latches';
  const benchmarkProfile =
    PRODUCT_GROUP_BENCHMARK_WEEKS[productGroup] || PRODUCT_GROUP_BENCHMARK_WEEKS['DEFAULT'];
  const totalBenchmarkWeeks = benchmarkProfile?.['SOP'] || 88;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* 1. Header & Governance Status Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-black font-mono">
                {project.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                Product Group: {productGroup}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                Category: {project.custom_project_category || 'Category A'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                Type: {project.project_type || 'A'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-sky-600" />
              <span>Project Timing Status Chart</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Automotive Inteva PDP Milestone schedule, dynamic Gantt synchronization, and corporate benchmark variance tracking.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => loadTimingStatus(true)}
              disabled={isLoading || isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Synchronize milestone dates directly from active Gantt chart"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
              <span>{isSyncing ? 'Syncing Gantt...' : 'Sync with Gantt'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isLoading || !chart}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Export Timing Status report as formatted Excel (.xlsx)"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export to Excel</span>
            </button>

            {isAssignedPm && (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving || !isDirty}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer ${
                  isDirty
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md animate-pulse'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Timing Updates'}</span>
              </button>
            )}
          </div>
        </div>

        {/* RBAC Authorization Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 font-medium">Assigned Program Manager:</span>
            <span className="font-bold text-slate-800">
              {project.custom_project_manager || project.owner || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAssignedPm ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                PM Edit Authorization Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                Read-Only View (PM or PMO Admin Required to Edit)
              </span>
            )}
          </div>
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in duration-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Project Timing Status and comments saved successfully to ERPNext.</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Milestones */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Milestones</span>
            <Layers className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {summaryKPIs.totalMilestones}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Inteva PDP Phases</div>
        </div>

        {/* Completed On-Time */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Completed (C)</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {summaryKPIs.completedOnTime}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">On-Time Milestones</div>
        </div>

        {/* Completed Late */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>C Late</span>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {summaryKPIs.completedLate}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">Closed with Delay</div>
        </div>

        {/* At Risk */}
        <div className="p-4 rounded-2xl bg-white border border-yellow-300 shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-800 flex items-center justify-between">
            <span>At Risk (Y)</span>
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
          </div>
          <div className="text-2xl font-black text-yellow-700 font-mono">
            {summaryKPIs.atRisk}
          </div>
          <div className="text-[11px] text-yellow-700 font-medium">Attention Required</div>
        </div>

        {/* Critical Delays */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Critical (R)</span>
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {summaryKPIs.critical}
          </div>
          <div className="text-[11px] text-rose-600 font-medium">Off Track & Escalated</div>
        </div>

        {/* Pending / N/A */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Pending (N/A)</span>
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 font-mono">
            {summaryKPIs.notApplicable}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Future Gate Tasks</div>
        </div>
      </div>

      {/* 3. Benchmark Corporate Standard Banner */}
      <div className="rounded-xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-200 p-4 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/90 border border-sky-200 text-sky-700 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900">
              Inteva Corporate Benchmark Standard: <span className="text-indigo-700 font-extrabold">{productGroup}</span> ({totalBenchmarkWeeks} Weeks SOP)
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Benchmark finish dates are automatically calculated from the project start date and governed by corporate master data. Normal project managers cannot modify benchmark weeks.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-700 font-mono font-bold text-[11px]">
            Start: {project.expected_start_date || 'N/A'}
          </span>
          <span className="px-3 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-700 font-mono font-bold text-[11px]">
            SOP: {project.custom_sop_date || project.expected_end_date || 'N/A'}
          </span>
        </div>
      </div>

      {/* 4. Main Timing Status Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">
              PDP Timing Status Line Items & Schedule Variance
            </h2>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {chart?.timing_line_items?.length || 0} Standard Inteva Milestones
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 select-none">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[130px]">Category</th>
                <th className="py-3 px-4 min-w-[200px]">PDP Line Item</th>
                <th className="py-3 px-3 w-20 text-center">Ref</th>
                <th className="py-3 px-3 min-w-[110px]">Base Plan</th>
                <th className="py-3 px-3 min-w-[120px] bg-sky-50/60 text-sky-900 border-x border-sky-100">
                  Current Plan
                </th>
                <th className="py-3 px-3 w-20 text-center bg-sky-50/60 text-sky-900">
                  Wks
                </th>
                <th className="py-3 px-3 min-w-[110px] bg-purple-50/50 text-purple-900 border-l border-purple-100">
                  Benchmark
                </th>
                <th className="py-3 px-3 w-20 text-center bg-purple-50/50 text-purple-900 border-r border-purple-100">
                  B-Wks
                </th>
                <th className="py-3 px-3 w-24 text-center">Variance</th>
                <th className="py-3 px-3 w-32 text-center">Status</th>
                <th className="py-3 px-4 min-w-[240px]">Comments / Mitigation Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-sky-600 mb-2" />
                    <span className="font-semibold text-xs">Loading timing status and syncing with Gantt...</span>
                  </td>
                </tr>
              ) : !chart || !chart.timing_line_items || chart.timing_line_items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                    No timing status line items found for this project.
                  </td>
                </tr>
              ) : (
                chart.timing_line_items.map((item, index) => {
                  const currentStatus =
                    editedItems[item.reference_code]?.status || item.status || 'N/A';
                  const currentComments =
                    editedItems[item.reference_code]?.comments !== undefined
                      ? editedItems[item.reference_code].comments
                      : item.comments || '';

                  // Variance presentation
                  const variance = item.week_variance;
                  let varianceBadge = null;
                  if (variance === undefined || variance === null) {
                    varianceBadge = <span className="text-slate-400 font-mono">-</span>;
                  } else if (variance < 0) {
                    varianceBadge = (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {variance} wks
                      </span>
                    );
                  } else if (variance === 0) {
                    varianceBadge = (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        0 wks
                      </span>
                    );
                  } else {
                    varianceBadge = (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-50 text-rose-700 border border-rose-200">
                        +{variance} wks
                      </span>
                    );
                  }

                  const statusConfig = TIMING_STATUS_CONFIG[currentStatus] || TIMING_STATUS_CONFIG['N/A'];

                  return (
                    <tr
                      key={item.reference_code || index}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {item.category}
                        </span>
                      </td>

                      {/* PDP Line Item */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.pdp_line_item}</span>
                        </div>
                        {item.task_id && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Task: {item.task_id}
                          </div>
                        )}
                      </td>

                      {/* Ref Code */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.reference_code}
                        </span>
                      </td>

                      {/* Base Plan */}
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {item.base_plan_finish_date ? (
                          <span>{item.base_plan_finish_date}</span>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-[11px]">Pending baseline</span>
                        )}
                      </td>

                      {/* Current Plan (Gantt Synced) */}
                      <td className="py-3 px-3 font-mono font-bold text-sky-950 text-[11px] bg-sky-50/30 border-x border-sky-100">
                        {item.current_plan_finish_date ? (
                          <span className="flex items-center gap-1">
                            {item.current_plan_finish_date}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-[11px]">Not scheduled</span>
                        )}
                      </td>

                      {/* Current Plan Weeks */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-sky-900 bg-sky-50/30">
                        {item.current_plan_weeks !== undefined ? item.current_plan_weeks : '-'}
                      </td>

                      {/* Benchmark Finish Date */}
                      <td className="py-3 px-3 font-mono text-purple-950 text-[11px] bg-purple-50/20 border-l border-purple-100">
                        {item.benchmark_plan_finish_date || '-'}
                      </td>

                      {/* Benchmark Weeks */}
                      <td className="py-3 px-3 text-center font-mono text-purple-800 bg-purple-50/20 border-r border-purple-100">
                        {item.benchmark_weeks !== undefined ? item.benchmark_weeks : '-'}
                      </td>

                      {/* Variance */}
                      <td className="py-3 px-3 text-center">
                        {varianceBadge}
                      </td>

                      {/* Status Dropdown (PM) or Badge (Viewer) */}
                      <td className="py-3 px-3 text-center">
                        {isAssignedPm ? (
                          <div className="relative">
                            <select
                              aria-label={`Status for ${item.pdp_line_item}`}
                              value={currentStatus}
                              onChange={(e) =>
                                handleStatusChange(
                                  item.reference_code,
                                  e.target.value as TimingStatusChoice
                                )
                              }
                              className={`w-full py-1 px-2 rounded-lg text-xs font-black border cursor-pointer focus:outline-none transition ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} hover:border-slate-300`}
                            >
                              {TIMING_STATUS_CHOICES.map((choice) => (
                                <option
                                  key={choice}
                                  value={choice}
                                  className="bg-white text-slate-800 font-bold"
                                >
                                  {choice} - {TIMING_STATUS_CONFIG[choice]?.label || choice}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                          >
                            {currentStatus}
                          </span>
                        )}
                      </td>

                      {/* Comments */}
                      <td className="py-3 px-4">
                        {isAssignedPm ? (
                          <input
                            type="text"
                            value={currentComments}
                            onChange={(e) =>
                              handleItemCommentsChange(item.reference_code, e.target.value)
                            }
                            placeholder="Add timing notes / mitigation..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition text-slate-800"
                          />
                        ) : (
                          <span className="text-slate-600 text-xs font-medium">
                            {currentComments || (
                              <span className="text-slate-400 italic">No notes recorded</span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Overall Program Manager Timing Comments Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Program Timing Overview & Executive Mitigation Notes
            </h3>
          </div>
          {isAssignedPm && isDirty && (
            <span className="text-[11px] font-bold text-amber-600 animate-pulse">
              ● Unsaved timing changes
            </span>
          )}
        </div>

        {isAssignedPm ? (
          <textarea
            rows={3}
            value={overallComments}
            onChange={(e) => handleOverallCommentsChange(e.target.value)}
            placeholder="Document overall program milestone health, critical path risk mitigations, supplier delivery dependencies, or launch readiness updates..."
            className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition text-slate-800 leading-relaxed font-medium"
          />
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
            {overallComments ||
              'No executive timing status comments recorded for this program.'}
          </div>
        )}

        {isAssignedPm && isDirty && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isSaving ? 'Saving Updates...' : 'Save All Timing Updates'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
