'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Gate, GateBoardReviewDecision, GateReviewSummaryItem } from '@/types/gate.types';
import { Task } from '@/types/task.types';
import { useAuth } from '@/providers/auth-context';
import { useToast } from '@/providers/toast-context';
import { gateService } from '@/services/gate.service';
import { userManagementService, UserRecord } from '@/services/user-management.service';
import {
  useProjectStageMover,
  useAdvanceStage,
  usePmoOverride,
} from '@/hooks/use-stage-mover';
import {
  GATE_BOARD_TITLES,
  DEFAULT_BOARD_FUNCTION_MAPPING,
  INTEVA_GATE_CHOICES,
  GATE_DECISIONS,
  DELEGATION_CHOICES,
  GateBoardTitle,
  IntevaGateCode,
} from '@/config/gate-choices.config';
import { deriveDesignReviewDate } from '@/services/gate-readiness.service';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Calendar,
  Save,
  RotateCcw,
  Sliders,
  Lock,
  User,
  Check,
  Building,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface GateReviewResultSummaryTabProps {
  projectId: string;
  projectName?: string;
  tasks: Task[];
  gates: Gate[];
  activeGateCode: IntevaGateCode;
  onGateChange: (gate: IntevaGateCode) => void;
  canEdit?: boolean;
  onRefresh?: () => void;
}

export function GateReviewResultSummaryTab({
  projectId,
  projectName,
  tasks,
  gates,
  activeGateCode,
  onGateChange,
  canEdit = true,
  onRefresh,
}: GateReviewResultSummaryTabProps) {
  const { user, role } = useAuth();
  const { showToast } = useToast();

  // Users for searchable autocomplete
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Stage Mover integration
  const {
    data: stageMoverStatus,
    isLoading: isLoadingStageMover,
    refetch: refetchStageMover,
  } = useProjectStageMover(projectId, projectName);

  const advanceStageMutation = useAdvanceStage();
  const pmoOverrideMutation = usePmoOverride();

  // PMO Override Modal
  const [isPmoModalOpen, setIsPmoModalOpen] = useState(false);
  const [overrideTargetStage, setOverrideTargetStage] = useState<string>('2. VC');
  const [overrideReason, setOverrideReason] = useState('');
  const isPmoAdmin = role === 'admin' || !!user?.permissions?.manageProjects;

  // Selected Gate for Section 1 (Results)
  const currentGateRecord = useMemo(() => {
    return (
      gates.find((g) => {
        const code = (g.gate_type || g.gate_name || '').toUpperCase();
        return code.includes(activeGateCode.replace(/^\d+\.\s*/, ''));
      }) || gates[0]
    );
  }, [gates, activeGateCode]);

  // Section 1 State: Board Reviews (7 Rows)
  const [boardReviewsState, setBoardReviewsState] = useState<GateBoardReviewDecision[]>([]);
  const [isSavingBoardReviews, setIsSavingBoardReviews] = useState(false);

  // Section 2 State: Fixed 6-Row Gate Summaries
  const [summariesState, setSummariesState] = useState<GateReviewSummaryItem[]>([]);
  const [isSavingSummaries, setIsSavingSummaries] = useState(false);

  // Load registered users for searchable member selection
  useEffect(() => {
    async function fetchUsers() {
      setIsLoadingUsers(true);
      try {
        const data = await userManagementService.getUsers();
        setUsersList(data);
      } catch (err) {
        console.warn('Failed to load users for board members:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  // Initialize Section 1 Board Review Rows whenever the active gate changes
  useEffect(() => {
    if (!currentGateRecord) return;

    if (currentGateRecord.board_reviews && currentGateRecord.board_reviews.length > 0) {
      setBoardReviewsState(currentGateRecord.board_reviews);
    } else {
      // Seed default rows according to configured GATE_BOARD_TITLES
      const seeded: GateBoardReviewDecision[] = GATE_BOARD_TITLES.map((title) => ({
        board_title: title,
        function: DEFAULT_BOARD_FUNCTION_MAPPING[title] || 'QA',
        name: currentGateRecord.gate_reviewer || 'Assigned Reviewer',
        delegation: 'Not Applicable',
        gate_decision:
          currentGateRecord.approval_status === 'Approved' || currentGateRecord.approval_status === 'Pass'
            ? 'Pass'
            : 'Pass',
        remarks: '',
      }));
      setBoardReviewsState(seeded);
    }
  }, [currentGateRecord]);

  // Initialize Section 2 Summary Rows across standard Inteva Gates (1. PL to 6. CT)
  useEffect(() => {
    const defaultSummaries: GateReviewSummaryItem[] = INTEVA_GATE_CHOICES.map((code) => {
      // Check if existing gate has recorded summary
      const matchedGate = gates.find((g) => (g.gate_type || '').includes(code.replace(/^\d+\.\s*/, '')));
      const drDate = deriveDesignReviewDate(tasks, code);

      return {
        gate_name: code,
        function: 'ALL',
        chairman: matchedGate?.gate_reviewer || 'Sarah Jenkins',
        pdt_recommendation:
          matchedGate?.approval_status === 'Approved' || matchedGate?.approval_status === 'Pass'
            ? 'Pass'
            : 'Pass with Follow-up',
        board_recommendation:
          matchedGate?.approval_status === 'Approved' || matchedGate?.approval_status === 'Pass'
            ? 'Pass'
            : 'Pass with Follow-up',
        design_review_date: drDate !== 'N/A' ? drDate : matchedGate?.planned_date || '',
        second_review_date: '',
        second_review_notes: '',
        third_review_date: '',
        third_review_notes: '',
        dr_pass_date: matchedGate?.actual_date || '',
      };
    });

    setSummariesState(defaultSummaries);
  }, [gates, tasks]);

  // Check if current gate results are locked
  const isLocked =
    currentGateRecord?.status === 'Completed' ||
    (currentGateRecord as any)?.is_locked === true;

  // Platform Director Decision analysis
  const platformDirectorRow = useMemo(() => {
    return boardReviewsState.find((r) => {
      const title = (r.board_title || '').toLowerCase();
      return title.includes('platform director') || title.includes('product group director');
    });
  }, [boardReviewsState]);

  const pdDecision = platformDirectorRow?.gate_decision || 'Pending';
  const isPdApproved = pdDecision === 'Pass' || pdDecision === 'Pass with Follow-up' || pdDecision === 'Pass with Follow up';
  const isPdEscalated = pdDecision === 'Escalate';

  // Save Board Review Decisions to single source of truth
  const handleSaveBoardReviews = async () => {
    if (!currentGateRecord) return;
    setIsSavingBoardReviews(true);
    try {
      await gateService.updateGate(currentGateRecord.name, {
        board_reviews: boardReviewsState,
        approval_status: isPdApproved ? 'Approved' : isPdEscalated ? 'Rejected' : 'Pending',
      });
      showToast('Gate Review Board decisions saved successfully!', 'success');
      refetchStageMover();
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to save board reviews', 'error');
    } finally {
      setIsSavingBoardReviews(false);
    }
  };

  // Save Gate Review Summaries
  const handleSaveSummaries = async () => {
    if (!currentGateRecord) return;
    setIsSavingSummaries(true);
    try {
      await gateService.updateGate(currentGateRecord.name, {
        review_summaries: summariesState,
      });
      showToast('Gate Review Summaries saved successfully!', 'success');
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to save summaries', 'error');
    } finally {
      setIsSavingSummaries(false);
    }
  };

  // Execute Stage Advance directly from Gate Review Results
  const handleAdvanceStage = async () => {
    if (!stageMoverStatus?.can_move) {
      showToast(stageMoverStatus?.block_reason || 'Stage movement is not permitted.', 'warning');
      return;
    }

    if (
      !confirm(
        `Advance project from ${stageMoverStatus.current_stage} to ${stageMoverStatus.next_stage}?\n\nThis will lock current Gate Review decisions and transition the project lifecycle.`
      )
    ) {
      return;
    }

    try {
      await advanceStageMutation.mutateAsync(projectId);
      showToast(
        `Success: Project advanced to ${stageMoverStatus.next_stage}. Historical Gate decisions locked.`,
        'success'
      );
      refetchStageMover();
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to advance project stage', 'error');
    }
  };

  // Execute PMO Override
  const handleExecutePmoOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      showToast('Mandatory governance justification required.', 'warning');
      return;
    }
    try {
      const cleanTarget = overrideTargetStage.replace(/^\d+\.\s*/, '') as any;
      await pmoOverrideMutation.mutateAsync({
        projectId,
        targetStage: cleanTarget,
        reason: overrideReason,
        isRollback: false,
      });
      showToast(`PMO Override executed: Project moved to ${cleanTarget}`, 'success');
      setIsPmoModalOpen(false);
      setOverrideReason('');
      refetchStageMover();
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'PMO Override failed', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* STAGE MOVER INTEGRATION BANNER */}
      <div
        className={cn(
          'rounded-3xl p-6 border transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4',
          isPdApproved
            ? 'bg-emerald-50/70 border-emerald-200'
            : isPdEscalated
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-amber-50/70 border-amber-200'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs',
              isPdApproved
                ? 'bg-emerald-600 text-white border-emerald-500'
                : isPdEscalated
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-amber-500 text-white border-amber-400'
            )}
          >
            {isPdApproved ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : isPdEscalated ? (
              <XCircle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stage Mover Lifecycle Gate Status
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-white border border-slate-200 text-slate-800">
                Current Stage: {stageMoverStatus?.current_stage || activeGateCode}
              </span>
              {isLocked && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                  <Lock className="h-3 w-3" />
                  Historical Locked
                </span>
              )}
            </div>

            <h3 className="text-sm font-black text-slate-900 mt-1">
              Platform Director Decision:{' '}
              <span
                className={cn(
                  isPdApproved
                    ? 'text-emerald-700'
                    : isPdEscalated
                    ? 'text-rose-700'
                    : 'text-amber-700'
                )}
              >
                {pdDecision.toUpperCase()}
              </span>
            </h3>

            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              {isPdApproved
                ? `Platform Director / Product Group Director has approved (${pdDecision}). Stage Mover is authorized to advance the project to ${stageMoverStatus?.next_stage || 'the next PDP stage'}.`
                : isPdEscalated
                ? 'Platform Director decision is ESCALATE. Stage movement is blocked. Project must remain in current stage until re-review.'
                : 'Awaiting formal voting decision from Platform Director / Product Group Director to authorize Stage Movement.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isPdApproved && stageMoverStatus?.next_stage && (
            <button
              type="button"
              onClick={handleAdvanceStage}
              disabled={advanceStageMutation.isPending || isLocked}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {advanceStageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>Advance to {stageMoverStatus.next_stage}</span>
            </button>
          )}

          {isPmoAdmin && (
            <button
              type="button"
              onClick={() => setIsPmoModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <span>PMO Override</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* SECTION 1: GATE REVIEW RESULTS                     */}
      {/* -------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Gate Review Results — Board Member Decisions
              </h2>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Gate {activeGateCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Formal voting decisions for the 7 standard Inteva Board Member titles for{' '}
              <strong className="text-slate-800">{projectId}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Gate Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Select Gate:</span>
              <select
                value={activeGateCode}
                onChange={(e) => onGateChange(e.target.value as IntevaGateCode)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
              >
                {INTEVA_GATE_CHOICES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {canEdit && !isLocked && (
              <button
                type="button"
                onClick={handleSaveBoardReviews}
                disabled={isSavingBoardReviews}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingBoardReviews ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save Board Decisions</span>
              </button>
            )}
          </div>
        </div>

        {/* Board Rows Table (Exactly 7 rows generated from GATE_BOARD_TITLES) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Board Title</th>
                <th className="py-3 px-4">Function</th>
                <th className="py-3 px-4">Board Member Name</th>
                <th className="py-3 px-4">Delegation</th>
                <th className="py-3 px-4">Gate Decision</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boardReviewsState.map((row, idx) => {
                const isPD =
                  row.board_title.includes('Platform Director') ||
                  row.board_title.includes('Product Group Director');

                return (
                  <tr
                    key={row.board_title}
                    className={cn(
                      'hover:bg-slate-50/50 transition',
                      isPD && 'bg-emerald-50/20 font-semibold'
                    )}
                  >
                    {/* Board Title */}
                    <td className="py-3 px-4 font-bold text-slate-800 max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        {isPD && <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        <span>{row.board_title}</span>
                      </div>
                      {isPD && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          Stage Movement Decision Authority
                        </div>
                      )}
                    </td>

                    {/* Function */}
                    <td className="py-3 px-4">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {row.function}
                      </span>
                    </td>

                    {/* Board Member Name (Searchable / editable autocomplete) */}
                    <td className="py-3 px-4 min-w-[180px]">
                      <input
                        type="text"
                        disabled={!canEdit || isLocked}
                        value={row.name}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].name = e.target.value;
                          setBoardReviewsState(updated);
                        }}
                        list={`user-options-${idx}`}
                        placeholder="Board Member Name..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
                      />
                      <datalist id={`user-options-${idx}`}>
                        {usersList.map((u) => (
                          <option key={u.email} value={u.fullName || u.username} />
                        ))}
                      </datalist>
                    </td>

                    {/* Delegation */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        disabled={!canEdit || isLocked}
                        value={row.delegation}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].delegation = e.target.value as any;
                          setBoardReviewsState(updated);
                        }}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-medium cursor-pointer"
                      >
                        {DELEGATION_CHOICES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Gate Decision */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        disabled={!canEdit || isLocked}
                        value={
                          row.gate_decision === 'Pass with Follow up'
                            ? 'Pass with Follow-up'
                            : row.gate_decision
                        }
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].gate_decision = e.target.value as any;
                          setBoardReviewsState(updated);
                        }}
                        className={cn(
                          'px-2.5 py-1.5 text-xs rounded-lg border font-bold focus:outline-none cursor-pointer',
                          row.gate_decision === 'Pass'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : row.gate_decision === 'Pass with Follow-up' ||
                              row.gate_decision === 'Pass with Follow up'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : row.gate_decision === 'Escalate'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        )}
                      >
                        <option value="Pass">Pass</option>
                        <option value="Pass with Follow-up">Pass with Follow-up</option>
                        <option value="Escalate">Escalate</option>
                      </select>
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <input
                        type="text"
                        disabled={!canEdit || isLocked}
                        value={row.remarks || ''}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].remarks = e.target.value;
                          setBoardReviewsState(updated);
                        }}
                        placeholder="Review remarks / follow-up action items..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-medium"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* SECTION 2: GATE REVIEW SUMMARY                     */}
      {/* -------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Gate Review Summary — Lifecycle Outcomes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fixed summary across standard Inteva Gates (1. PL through 6. CT). Design Review Date is derived directly from Gantt tasks.
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleSaveSummaries}
              disabled={isSavingSummaries}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSavingSummaries ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save Summaries</span>
            </button>
          )}
        </div>

        {/* Fixed 6-Row Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Gate Review</th>
                <th className="py-3 px-3">Function</th>
                <th className="py-3 px-3">Chairman</th>
                <th className="py-3 px-3 text-center">PDT Rec.</th>
                <th className="py-3 px-3 text-center">Board Rec.</th>
                <th className="py-3 px-3">Design Review Date</th>
                <th className="py-3 px-3">2nd Review Date</th>
                <th className="py-3 px-3">2nd Review Notes</th>
                <th className="py-3 px-3">3rd Review Date</th>
                <th className="py-3 px-3">3rd Review Notes</th>
                <th className="py-3 px-3">DR Pass Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summariesState.map((row, idx) => {
                return (
                  <tr key={row.gate_name} className="hover:bg-slate-50/50 transition">
                    {/* Gate Review */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.gate_name}
                    </td>

                    {/* Function */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {row.function || 'ALL'}
                      </span>
                    </td>

                    {/* Chairman (Searchable selection) */}
                    <td className="py-3 px-3 min-w-[140px]">
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={row.chairman}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].chairman = e.target.value;
                          setSummariesState(updated);
                        }}
                        list={`chairman-options-${idx}`}
                        placeholder="Chairman..."
                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-medium"
                      />
                      <datalist id={`chairman-options-${idx}`}>
                        {usersList.map((u) => (
                          <option key={u.email} value={u.fullName || u.username} />
                        ))}
                      </datalist>
                    </td>

                    {/* PDT Recommendation */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <select
                        disabled={!canEdit}
                        value={row.pdt_recommendation}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].pdt_recommendation = e.target.value;
                          setSummariesState(updated);
                        }}
                        className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 focus:outline-none cursor-pointer"
                      >
                        <option value="Pass">Pass</option>
                        <option value="Pass with Follow-up">Pass with Follow-up</option>
                        <option value="Escalate">Escalate</option>
                      </select>
                    </td>

                    {/* Board Recommendation */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <select
                        disabled={!canEdit}
                        value={row.board_recommendation}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].board_recommendation = e.target.value;
                          setSummariesState(updated);
                        }}
                        className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 focus:outline-none cursor-pointer"
                      >
                        <option value="Pass">Pass</option>
                        <option value="Pass with Follow-up">Pass with Follow-up</option>
                        <option value="Escalate">Escalate</option>
                      </select>
                    </td>

                    {/* Design Review Date (Derived from Gantt) */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100">
                        {row.design_review_date || 'N/A'}
                      </span>
                    </td>

                    {/* 2nd Review Date */}
                    <td className="py-3 px-3 min-w-[110px]">
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={row.second_review_date || ''}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].second_review_date = e.target.value;
                          setSummariesState(updated);
                        }}
                        className="w-full px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                      />
                    </td>

                    {/* 2nd Review Notes */}
                    <td className="py-3 px-3 min-w-[130px]">
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={row.second_review_notes || ''}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].second_review_notes = e.target.value;
                          setSummariesState(updated);
                        }}
                        placeholder="Notes..."
                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                      />
                    </td>

                    {/* 3rd Review Date */}
                    <td className="py-3 px-3 min-w-[110px]">
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={row.third_review_date || ''}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].third_review_date = e.target.value;
                          setSummariesState(updated);
                        }}
                        className="w-full px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                      />
                    </td>

                    {/* 3rd Review Notes */}
                    <td className="py-3 px-3 min-w-[130px]">
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={row.third_review_notes || ''}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].third_review_notes = e.target.value;
                          setSummariesState(updated);
                        }}
                        placeholder="Notes..."
                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                      />
                    </td>

                    {/* DR Pass Date */}
                    <td className="py-3 px-3 min-w-[110px]">
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={row.dr_pass_date || ''}
                        onChange={(e) => {
                          const updated = [...summariesState];
                          updated[idx].dr_pass_date = e.target.value;
                          setSummariesState(updated);
                        }}
                        className="w-full px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PMO Override Modal */}
      {isPmoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sliders className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">PMO Stage Override / Rollback</h3>
            </div>

            <form onSubmit={handleExecutePmoOverride} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Target Lifecycle Stage:</label>
                <select
                  value={overrideTargetStage}
                  onChange={(e) => setOverrideTargetStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white font-bold cursor-pointer"
                >
                  {INTEVA_GATE_CHOICES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Governance Justification:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mandatory PMO override audit rationale..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPmoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pmoOverrideMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {pmoOverrideMutation.isPending ? 'Executing...' : 'Apply PMO Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
