'use client';

import React, { useState } from 'react';
import {
  useProjectStageMover,
  useTriggerStageWorkflow,
  useAdvanceStage,
  usePmoOverride,
} from '@/hooks/use-stage-mover';
import { useAuth } from '@/providers/auth-context';
import { PDP_STAGE_ORDER, PDPStageCode } from '@/types/stage-mover.types';
import {
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Send,
  Lock,
  History,
  AlertCircle,
  Users,
  Check,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

const STAGE_LABELS: Record<PDPStageCode, { name: string; desc: string }> = {
  PL: { name: 'Concept / Launch', desc: 'Project Launch & Program Kickoff' },
  VC: { name: 'Concept Validation', desc: 'Feasibility & Engineering Concept' },
  TKO: { name: 'Tooling Kick-Off', desc: 'Long-Lead Tooling & Sourcing' },
  VL: { name: 'Tooling & Process Validation', desc: 'Pre-production Trials & Verification' },
  CPA: { name: 'Customer Process Approval', desc: 'PPAP & Customer Process Signoff' },
  CT: { name: 'Customer Transformation', desc: 'SOP, Ramp-up & Project Closure' },
};

interface ProjectStageMoverViewProps {
  projectId: string;
  projectName?: string;
  currentPhase?: string;
}

export function ProjectStageMoverView({
  projectId,
  projectName,
  currentPhase = 'PL',
}: ProjectStageMoverViewProps) {
  const { user } = useAuth();
  const isPmoAdmin = user?.role === 'admin' || !!user?.permissions?.manageProjects;
  const isPm = user?.role === 'projectmanager' || isPmoAdmin;

  const { data: status, isLoading, refetch } = useProjectStageMover(
    projectId,
    projectName,
    currentPhase
  );

  const triggerWorkflowMutation = useTriggerStageWorkflow();
  const advanceStageMutation = useAdvanceStage();
  const pmoOverrideMutation = usePmoOverride();

  const [confirmAdvanceOpen, setConfirmAdvanceOpen] = useState(false);
  const [pmoModalOpen, setPmoModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<PDPStageCode>('VC');
  const [overrideReason, setOverrideReason] = useState('');
  const [isRollback, setIsRollback] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-xs font-bold text-slate-600">Loading Stage Mover & Governance Status...</p>
      </div>
    );
  }

  const currentStage = status?.current_stage || 'PL';
  const currentIdx = PDP_STAGE_ORDER.indexOf(currentStage);
  const nextStage = status?.next_stage;
  const pdDecision = status?.platform_director_decision || 'Pending';

  const handleTriggerWorkflow = async () => {
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    try {
      const res = await triggerWorkflowMutation.mutateAsync(projectId);
      setActionSuccessMsg(res.message);
      refetch();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to trigger approval workflow.');
    }
  };

  const handleAdvanceStage = async () => {
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    try {
      const res = await advanceStageMutation.mutateAsync(projectId);
      setConfirmAdvanceOpen(false);
      setActionSuccessMsg(
        `Project successfully advanced from ${res.historyEntry.from_stage} to ${res.historyEntry.to_stage}! Historical review records are locked.`
      );
      refetch();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to advance project stage.');
    }
  };

  const handleExecutePmoOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    if (!overrideReason || overrideReason.trim().length < 5) {
      setActionErrorMsg('A valid justification of at least 5 characters is mandatory.');
      return;
    }

    try {
      const res = await pmoOverrideMutation.mutateAsync({
        projectId,
        targetStage,
        reason: overrideReason,
        isRollback,
      });
      setPmoModalOpen(false);
      setOverrideReason('');
      setActionSuccessMsg(
        `PMO Action complete: Stage updated to ${res.entry.to_stage}. Reason logged in immutable governance history.`
      );
      refetch();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'PMO Override failed.');
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#EEF2FF] border border-indigo-200/90 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-indigo-900">
              <GitCommit className="h-4 w-4 text-indigo-600" />
              <span>PDP STAGE MOVER & GATE GOVERNANCE</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              PDP Lifecycle Stage Transitions
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Stage movement is governed strictly by Gate Review Approval results. 
              The <strong className="text-slate-900 font-semibold">Platform Director / Product Group Director</strong> decision 
              is authoritative. When a project moves forward, all historical gate review results are permanently locked.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isPmoAdmin && (
              <button
                type="button"
                onClick={() => {
                  setTargetStage(nextStage || 'PL');
                  setIsRollback(false);
                  setPmoModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors shadow-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                PMO Override / Rollback
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}
      </div>

      {/* Lifecycle Stage Progress Bar */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-500">
            PDP Phase Pipeline Progression (PL → VC → TKO → VL → CPA → CT)
          </h3>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
            Active Phase: {currentStage}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PDP_STAGE_ORDER.map((stg, idx) => {
            const isCurrent = idx === currentIdx;
            const isCompleted = idx < currentIdx;
            const isUpcoming = idx > currentIdx;

            return (
              <div
                key={stg}
                className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400/30'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50/60 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-md ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {stg}
                  </span>
                  {isCompleted && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  {isCurrent && (
                    <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                  )}
                  {isUpcoming && (
                    <Clock className="h-4 w-4 text-slate-400" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 line-clamp-1">
                    {STAGE_LABELS[stg].name}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    {STAGE_LABELS[stg].desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-semibold">
                  {isCurrent && (
                    <span className="text-indigo-700 font-bold">● Active Stage</span>
                  )}
                  {isCompleted && (
                    <span className="text-emerald-700">Completed & Locked</span>
                  )}
                  {isUpcoming && (
                    <span className="text-slate-400">Upcoming Stage</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Summary & Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PD Decision & Prerequisite Card */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gate Review Prerequisite & Platform Director Sign-off
              </h3>
              <p className="text-xs text-slate-500">
                Gate: {status?.current_gate?.gate_name || `${currentStage} Review`}
              </p>
            </div>
            {status?.is_locked && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <Lock className="h-3 w-3" /> Historical Results Locked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PD Card */}
            <div
              className={`p-4 rounded-xl border ${
                pdDecision === 'Pass' || pdDecision === 'Pass with Follow-up'
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : pdDecision === 'Escalate'
                  ? 'border-rose-300 bg-rose-50/60'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Platform Director Signoff
                </span>
                {pdDecision === 'Pass' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                {pdDecision === 'Pass with Follow-up' && (
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                )}
                {pdDecision === 'Escalate' && (
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                )}
              </div>
              <p className="text-lg font-black text-slate-900 mb-1">
                {pdDecision}
              </p>
              <p className="text-xs text-slate-600">
                Reviewer: <span className="font-semibold text-slate-800">{status?.platform_director_name}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                * Authoritative decision determining stage movement eligibility.
              </p>
            </div>

            {/* Board Decisions Summary */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">
                  Steering Board Votes
                </span>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center my-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold text-slate-500">Total</div>
                  <div className="text-base font-black text-slate-900">
                    {status?.board_decisions_summary.total || 0}
                  </div>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-700">Pass</div>
                  <div className="text-base font-black text-emerald-900">
                    {status?.board_decisions_summary.pass || 0}
                  </div>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <div className="text-xs font-bold text-amber-700">Follow-up</div>
                  <div className="text-base font-black text-amber-900">
                    {status?.board_decisions_summary.pass_with_followup || 0}
                  </div>
                </div>
                <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                  <div className="text-xs font-bold text-rose-700">Escalate</div>
                  <div className="text-base font-black text-rose-900">
                    {status?.board_decisions_summary.escalate || 0}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Pending Reviews: <span className="font-semibold text-slate-700">{status?.board_decisions_summary.pending || 0}</span>
              </div>
            </div>
          </div>

          {/* Workflow Trigger Section */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">Gate Review Approval Workflow</span>
                {status?.approval_workflow_triggered ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Dispatched
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Not Triggered
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {status?.approval_workflow_triggered
                  ? `Workflow triggered on ${new Date(status.approval_workflow_triggered_at || '').toLocaleDateString()}. Board members notified.`
                  : 'Triggering notifies all Gate Board Members to submit their review decision.'}
              </p>
            </div>

            {isPm && !status?.approval_workflow_triggered && (
              <button
                type="button"
                onClick={handleTriggerWorkflow}
                disabled={triggerWorkflowMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                {triggerWorkflowMutation.isPending ? 'Sending...' : 'Trigger Workflow'}
              </button>
            )}
          </div>
        </div>

        {/* Action / Next Stage Card */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-extrabold tracking-wider uppercase text-slate-500">
              Stage Transition Action
            </span>

            {nextStage ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Target Next Stage</div>
                  <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{currentStage}</span>
                    <ArrowRight className="h-5 w-5 text-indigo-600" />
                    <span className="text-indigo-600">{nextStage}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {STAGE_LABELS[nextStage].name}
                  </p>
                </div>

                {status?.can_move ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Eligible to advance. Platform Director approved.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Stage Transition Blocked</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-900">
                      {status?.block_reason || 'Gate approval prerequisites are incomplete.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1">
                <p className="font-bold">Final Stage Reached (CT)</p>
                <p className="text-[11px] text-slate-500">
                  This project has completed all 6 PDP lifecycle phases.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            {nextStage && (
              <button
                type="button"
                onClick={() => setConfirmAdvanceOpen(true)}
                disabled={!status?.can_move || advanceStageMutation.isPending}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                {advanceStageMutation.isPending ? 'Advancing...' : `Advance to Stage ${nextStage}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historical Movement Log */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              PDP Stage Movement & Governance Audit Trail
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {status?.history?.length || 0} recorded transition(s)
          </span>
        </div>

        {(!status?.history || status.history.length === 0) ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            No stage transitions recorded yet. Project is in its initial stage ({currentStage}).
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Transition</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Executed By</th>
                  <th className="py-2.5 px-4">Decision / Justification</th>
                  <th className="py-2.5 px-4">Gate Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {status.history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {new Date(entry.moved_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono">{entry.from_stage}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-mono">{entry.to_stage}</span>
                    </td>
                    <td className="py-3 px-4">
                      {entry.trigger_type === 'PD_APPROVAL' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PD Gate Approval
                        </span>
                      )}
                      {entry.trigger_type === 'PMO_OVERRIDE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          PMO Override
                        </span>
                      )}
                      {entry.trigger_type === 'PMO_ROLLBACK' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          PMO Rollback
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {entry.moved_by}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={entry.reason || entry.pd_decision}>
                      {entry.pd_decision && (
                        <span className="font-semibold text-slate-800">{entry.pd_decision} — </span>
                      )}
                      {entry.reason || 'Standard Gate Movement'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advance Stage Confirmation Modal */}
      {confirmAdvanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Confirm Stage Advancement</h4>
                <p className="text-xs text-slate-500">
                  Moving from <strong className="text-slate-800">{currentStage}</strong> to <strong className="text-indigo-600">{nextStage}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Permanent Historical Lock
              </p>
              <p className="text-[11px] leading-relaxed">
                Advancing the stage will permanently lock all Gate Review Results and voting data for stage <strong>{currentStage}</strong>. 
                They will become read-only and cannot be altered.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAdvanceOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdvanceStage}
                disabled={advanceStageMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                {advanceStageMutation.isPending ? 'Advancing...' : `Yes, Advance to ${nextStage}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PMO Override Modal */}
      {pmoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <form
            onSubmit={handleExecutePmoOverride}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-purple-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">PMO Governance Override / Rollback</h4>
                <p className="text-xs text-slate-500">
                  Universal administrative stage control for Project: {projectId}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target PDP Lifecycle Stage
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as PDPStageCode)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                >
                  {PDP_STAGE_ORDER.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg} — {STAGE_LABELS[stg].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRollback}
                    onChange={(e) => setIsRollback(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-400"
                  />
                  <span>Mark as Stage Rollback (e.g. project returning to previous gate for re-work)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Governance Justification & Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Provide detailed justification for this PMO stage adjustment..."
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPmoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pmoOverrideMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs"
              >
                {pmoOverrideMutation.isPending ? 'Executing...' : 'Apply PMO Override'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
