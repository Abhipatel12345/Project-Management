'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-context';
import { useProjects } from '@/hooks/use-projects';
import { gateService } from '@/services/gate.service';
import { auditService } from '@/services/audit.service';
import { Gate, GateListResponse, GateBoardReviewDecision, GateReviewSummaryItem } from '@/types/gate.types';
import { Project } from '@/types/project.types';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  GATE_BOARD_TITLES,
  BOARD_FUNCTIONS,
  DEFAULT_BOARD_FUNCTION_MAPPING,
  GATE_DECISIONS,
  DELEGATION_CHOICES,
  INTEVA_GATE_CHOICES,
  GateBoardTitle,
  BoardFunction,
  GateDecision,
  DelegationChoice,
} from '@/config/gate-choices.config';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  ShieldCheck,
  FileText,
  User,
  Calendar,
  Layers,
  ArrowRight,
  MessageSquare,
  RotateCcw,
  Check,
  Loader2,
  RefreshCw,
  FolderKanban,
  ChevronDown,
  Table,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { isGateReviewer } from '@/utils/user-matcher';

function GateReviewContent() {
  const { user, role } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectParam = searchParams.get('project') || 'ALL';

  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 200 });
  const projects: Project[] = projectsData?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectParam);
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Review Board Tab View: 'inspection' | 'board_results' | 'summaries'
  const [activeBoardTab, setActiveBoardTab] = useState<'inspection' | 'board_results' | 'summaries'>('inspection');

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [decision, setDecision] = useState<'Pass' | 'Pass with Follow up' | 'Escalate' | 'Approved' | 'Approved with Conditions' | 'Rejected' | 'Returned'>('Pass');
  const [reviewComments, setReviewComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Board Results State for selected Gate
  const [boardReviewsState, setBoardReviewsState] = useState<GateBoardReviewDecision[]>([]);
  const [isSavingBoardReviews, setIsSavingBoardReviews] = useState(false);

  const loadGates = async () => {
    setIsLoading(true);
    try {
      const res: GateListResponse = await gateService.getGateReviews({
        project: selectedProjectId === 'ALL' ? undefined : selectedProjectId,
      });
      const loadedGates = res.gates || [];
      setGates(loadedGates);
      if (loadedGates.length > 0) {
        // Keep currently selected gate if in new list, else select first
        const currentStillExists = loadedGates.find((g) => g.name === selectedGate?.name);
        const newSelected = currentStillExists || loadedGates[0];
        setSelectedGate(newSelected);
        initBoardReviewsForGate(newSelected);
      } else {
        setSelectedGate(null);
        setBoardReviewsState([]);
      }
    } catch (err) {
      console.error('Error loading gates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initBoardReviewsForGate = (gate: Gate) => {
    if (gate.board_reviews && gate.board_reviews.length > 0) {
      setBoardReviewsState(gate.board_reviews);
    } else {
      // Seed default 7 board titles from manager choices
      const defaults: GateBoardReviewDecision[] = GATE_BOARD_TITLES.map((title) => ({
        board_title: title,
        function: DEFAULT_BOARD_FUNCTION_MAPPING[title] || 'QA',
        name: gate.gate_reviewer || 'Assigned Reviewer',
        delegation: 'Not Applicable',
        gate_decision: gate.approval_status === 'Approved' ? 'Pass' : 'Pending',
        remarks: '',
      }));
      setBoardReviewsState(defaults);
    }
  };

  useEffect(() => {
    loadGates();
  }, [selectedProjectId]);

  const handleProjectChange = (newProj: string) => {
    setSelectedProjectId(newProj);
    if (newProj === 'ALL') {
      router.replace('/gates/review');
    } else {
      router.replace(`/gates/review?project=${encodeURIComponent(newProj)}`);
    }
  };

  const handleSelectGate = (gate: Gate) => {
    setSelectedGate(gate);
    initBoardReviewsForGate(gate);
  };

  const filteredGates = gates.filter((g) => {
    const matchesSearch =
      g.gate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.project || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && (g.approval_status === 'Pending' || g.approval_status === 'Pass with Follow up');
    if (statusFilter === 'APPROVED') return matchesSearch && (g.status === 'Approved' || g.approval_status === 'Approved' || g.approval_status === 'Pass');
    if (statusFilter === 'READY') return matchesSearch && g.status === 'Ready for Review';
    return matchesSearch;
  });

  // Check if current user is authorized to perform approval decisions
  const isAuthorizedReviewer =
    role === 'admin' || role === 'gate_reviewer' || (selectedGate ? isGateReviewer(selectedGate, user) : false);

  const handleSaveBoardReviews = async () => {
    if (!selectedGate) return;
    if (!isAuthorizedReviewer) {
      alert('403 Forbidden: Only designated Gate Reviewers or Administrators are authorized to update Board Review decisions.');
      return;
    }

    setIsSavingBoardReviews(true);
    try {
      const updated = await gateService.updateGate(selectedGate.name, {
        board_reviews: boardReviewsState,
      });

      auditService.logAction(
        user?.fullName || 'Gate Reviewer',
        'Updated Gate Board Review Decisions',
        'Gate',
        selectedGate.name,
        `Updated ${boardReviewsState.length} board member decisions for ${selectedGate.name}.`,
        undefined,
        undefined,
        user?.roleLabel,
        selectedGate.project
      );

      setSelectedGate(updated);
      alert('Gate Review Board decisions saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save board reviews');
    } finally {
      setIsSavingBoardReviews(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!selectedGate) return;

    if (!isAuthorizedReviewer) {
      alert('403 Forbidden: Only designated Gate Reviewers or Administrators are authorized to approve Gates.');
      return;
    }

    const isNegativeDecision = decision === 'Rejected' || decision === 'Returned' || decision === 'Escalate';
    if (isNegativeDecision && !reviewComments.trim()) {
      alert('Mandatory review comments required when escalating, returning or rejecting a Gate.');
      return;
    }

    setActionLoading(true);
    try {
      const isApprovedDecision = decision === 'Approved' || decision === 'Pass' || decision === 'Approved with Conditions' || decision === 'Pass with Follow up';
      const normalizedStatus = isApprovedDecision ? 'Approved' : isNegativeDecision ? 'Rejected' : 'In Progress';
      const todayStr = new Date().toISOString().split('T')[0];

      if (decision === 'Returned') {
        const updated = await gateService.updateGate(selectedGate.name, {
          status: 'In Progress',
          approval_status: 'Pending',
        });
        await gateService.addGateReview(selectedGate.name, {
          reviewer: user?.fullName || 'Gate Board Chair',
          decision: 'Rejected',
          comments: `RETURNED FOR CORRECTION: ${reviewComments}`,
        });
        setSelectedGate(updated);
      } else {
        const updated = await gateService.updateGate(selectedGate.name, {
          status: normalizedStatus as any,
          approval_status: decision as any,
          actual_date: isApprovedDecision ? todayStr : selectedGate.actual_date,
        });
        await gateService.addGateReview(selectedGate.name, {
          reviewer: user?.fullName || 'Gate Board Chair',
          decision: (decision === 'Pass' ? 'Approved' : decision === 'Pass with Follow up' ? 'Approved with Conditions' : decision === 'Escalate' ? 'Rejected' : decision) as any,
          comments: reviewComments,
        });
        setSelectedGate(updated);
      }

      auditService.logAction(
        user?.fullName || 'Gate Reviewer',
        `Gate Decision: ${decision}`,
        'Gate',
        selectedGate.name,
        `Recorded executive committee gate decision: "${decision}". Notes: ${reviewComments || 'None'}`,
        selectedGate.approval_status,
        decision,
        user?.roleLabel,
        selectedGate.project
      );

      setApprovalModalOpen(false);
      setReviewComments('');
      await loadGates();
      alert(`Gate decision "${decision}" recorded successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit gate decision');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner with Project Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xl shadow-xs">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Gate Review Board</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Phase Passage Governance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Review APQP Gate Readiness, evaluate KGD criteria & critical open issues, and record formal executive committee decisions.
            </p>
          </div>
        </div>

        {/* Project Selector & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="relative min-w-[240px]">
            <SearchableSelect
              id="review-project-selector"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              searchPlaceholder="Search project..."
              className="w-full pl-3.5 pr-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Automotive Projects</option>
              {projects.map((p) => {
                const displayName = p.project_name?.trim() || p.name;
                return (
                  <option
                    key={p.name}
                    value={p.name}
                    data-sublabel={displayName !== p.name ? p.name : undefined}
                  >
                    {displayName}
                  </option>
                );
              })}
            </SearchableSelect>
          </div>

          <button
            onClick={loadGates}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          <Link
            href={selectedProjectId !== 'ALL' ? `/gates?project=${encodeURIComponent(selectedProjectId)}` : '/gates'}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Connected Gate Flow</span>
          </Link>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveBoardTab('inspection')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer',
            activeBoardTab === 'inspection'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          )}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Gate Inspection & Readiness Sign-off</span>
        </button>

        <button
          onClick={() => setActiveBoardTab('board_results')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer',
            activeBoardTab === 'board_results'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          )}
        >
          <Table className="h-3.5 w-3.5" />
          <span>Section 1: Board Review Decisions (By Function)</span>
        </button>

        <button
          onClick={() => setActiveBoardTab('summaries')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer',
            activeBoardTab === 'summaries'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Section 2: Gate Review Summaries</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE GATE INSPECTION */}
      {activeBoardTab === 'inspection' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Gate Milestones List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Gate ID, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {['ALL', 'READY', 'PENDING', 'APPROVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap cursor-pointer',
                      statusFilter === st
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredGates.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {selectedProjectId !== 'ALL'
                    ? `No Gate Milestones found for project ${selectedProjectId}.`
                    : 'No Gate Milestones found matching filters.'}
                </div>
              ) : (
                filteredGates.map((gate) => {
                  const isSelected = selectedGate?.name === gate.name;
                  const isApproved = gate.status === 'Approved' || gate.approval_status === 'Approved' || gate.approval_status === 'Pass';
                  const isReady = gate.status === 'Ready for Review' || gate.readiness_percentage >= 90;

                  return (
                    <div
                      key={gate.name}
                      onClick={() => handleSelectGate(gate)}
                      className={cn(
                        'p-4 rounded-2xl border transition cursor-pointer space-y-2',
                        isSelected
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                          : 'bg-slate-50/50 border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-sky-700">{gate.name}</span>
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isReady
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}
                        >
                          {gate.status}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 truncate">{gate.gate_name}</h3>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/80">
                        <span className="font-mono">{gate.project}</span>
                        <span className="font-bold text-slate-700">
                          Readiness: <strong className="text-emerald-600 font-black">{gate.readiness_percentage}%</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Gate Inspection & Committee Approval Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
            {selectedGate ? (
              <>
                {/* Gate Details Header */}
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-sky-700">{selectedGate.name}</span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {selectedGate.gate_type}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{selectedGate.gate_name}</h2>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Project: <strong className="font-mono text-slate-800">{selectedGate.project}</strong></span>
                    <span>Reviewer: <strong className="text-emerald-700">{selectedGate.gate_reviewer || 'Sarah Jenkins'}</strong></span>
                  </div>
                </div>

                {/* Readiness Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">Readiness Audit</div>
                    <div className="text-2xl font-black text-emerald-700">{selectedGate.readiness_percentage}%</div>
                    <div className="text-[10px] text-slate-500">
                      Criteria: {selectedGate.completed_criteria_count || 0}/{selectedGate.total_criteria_count || 0}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200 space-y-1">
                    <div className="text-[10px] font-bold text-sky-800 uppercase">Deliverables Satisfied</div>
                    <div className="text-2xl font-black text-sky-700">
                      {selectedGate.completed_deliverables_count || 0}/{selectedGate.total_deliverables_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {selectedGate.blocking_items_count ? (
                        <span className="text-rose-600 font-bold">{selectedGate.blocking_items_count} items blocking</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">All items ready</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Criteria Checklist */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Mandatory Gate Criteria & KGDs</span>
                    <span className="text-[11px] text-slate-500 font-medium">{selectedGate.criteria?.length || 0} Criteria</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {(selectedGate.criteria || []).map((crit) => (
                      <div key={crit.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[200px]">
                          <div className="font-bold text-slate-800 truncate">{crit.name}</div>
                          <div className="text-[10px] text-slate-500">{crit.responsible_person}</div>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-bold rounded-md',
                            crit.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}
                        >
                          {crit.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Executive Board Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800">Executive Committee Sign-off</div>
                  {isAuthorizedReviewer ? (
                    <button
                      onClick={() => setApprovalModalOpen(true)}
                      className="w-full py-3 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Award className="h-4 w-4" />
                      <span>Record Committee Gate Decision</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
                      <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Gate Approval restricted to Gate Reviewer / Executive Board.</span>
                    </div>
                  )}
                </div>

                {/* Past Review Records */}
                {(selectedGate.reviews || []).length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-800">Past Board Decisions</div>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {selectedGate.reviews.map((rev) => (
                        <div key={rev.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-700">{rev.decision}</span>
                            <span className="text-[10px] text-slate-400">{rev.review_date}</span>
                          </div>
                          <div className="text-slate-700 font-medium">{rev.comments}</div>
                          <div className="text-[10px] text-slate-400">By: {rev.reviewer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                Select a Gate milestone to inspect readiness and record committee decisions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SECTION 1 - BOARD REVIEW DECISIONS (BY FUNCTION) */}
      {activeBoardTab === 'board_results' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gate Review Results — Board Member Decisions
              </h2>
              <p className="text-xs text-slate-500">
                Formal voting decisions by the 7 predefined Board Member titles for{' '}
                <strong className="text-emerald-700">{selectedGate?.name || 'Selected Gate'}</strong> ({selectedGate?.gate_name || 'N/A'}).
              </p>
            </div>

            {isAuthorizedReviewer && (
              <button
                onClick={handleSaveBoardReviews}
                disabled={isSavingBoardReviews}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingBoardReviews && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Board Decisions</span>
              </button>
            )}
          </div>

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
                {boardReviewsState.map((row, idx) => (
                  <tr key={row.board_title} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800 max-w-[220px]">
                      {row.board_title}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {row.function}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        disabled={!isAuthorizedReviewer}
                        value={row.name}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].name = e.target.value;
                          setBoardReviewsState(updated);
                        }}
                        placeholder="Board Member Name..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        disabled={!isAuthorizedReviewer}
                        value={row.delegation}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].delegation = e.target.value;
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
                    <td className="py-3 px-4">
                      <select
                        disabled={!isAuthorizedReviewer}
                        value={row.gate_decision}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].gate_decision = e.target.value;
                          setBoardReviewsState(updated);
                        }}
                        className={cn(
                          'px-2.5 py-1.5 text-xs rounded-lg border font-bold focus:outline-none cursor-pointer',
                          row.gate_decision === 'Pass'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : row.gate_decision === 'Pass with Follow up'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : row.gate_decision === 'Escalate'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        )}
                      >
                        <option value="Pending">Pending</option>
                        {GATE_DECISIONS.map((dec) => (
                          <option key={dec} value={dec}>
                            {dec}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        disabled={!isAuthorizedReviewer}
                        value={row.remarks || ''}
                        onChange={(e) => {
                          const updated = [...boardReviewsState];
                          updated[idx].remarks = e.target.value;
                          setBoardReviewsState(updated);
                        }}
                        placeholder="Review comments..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white font-medium"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SECTION 2 - GATE REVIEW SUMMARIES */}
      {activeBoardTab === 'summaries' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Gate Review Summaries</h2>
            <p className="text-xs text-slate-500">
              Consolidated lifecycle outcome across standard Inteva Gates (1. PL to 6. CT) for{' '}
              <strong className="text-emerald-700">{selectedProjectId !== 'ALL' ? selectedProjectId : 'All Projects'}</strong>.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Gate Review</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Chairman</th>
                  <th className="py-3.5 px-4 text-center">Readiness %</th>
                  <th className="py-3.5 px-4 text-center">PDT Rec.</th>
                  <th className="py-3.5 px-4 text-center">Board Decision</th>
                  <th className="py-3.5 px-4">Design Review Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No gate milestones found for this selection.
                    </td>
                  </tr>
                ) : (
                  gates.map((g) => {
                    const isApproved = g.status === 'Approved' || g.approval_status === 'Approved' || g.approval_status === 'Pass';
                    return (
                      <tr key={g.name} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{g.gate_type}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{g.gate_name}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {g.project}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {g.gate_reviewer || 'Sarah Jenkins'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[11px] font-mono font-bold',
                              g.readiness_percentage >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : g.readiness_percentage >= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            )}
                          >
                            {g.readiness_percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {g.readiness_percentage >= 100 ? 'Pass' : 'Follow up'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-md text-[10px] font-bold',
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}
                          >
                            {g.approval_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {g.planned_date || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-bold',
                              g.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Committee Decision Modal */}
      {approvalModalOpen && selectedGate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Award className="h-5 w-5 text-emerald-600" />
              <span>Record Executive Gate Decision ({selectedGate.name})</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Select Gate Decision</label>
                <SearchableSelect
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                  searchPlaceholder="Search decision..."
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Pass">Pass (Phase Passage Granted)</option>
                  <option value="Pass with Follow up">Pass with Follow up (Conditional Approval)</option>
                  <option value="Escalate">Escalate to Executive Steering</option>
                  <option value="Returned">Return to PM for Correction</option>
                  <option value="Rejected">Rejected</option>
                </SearchableSelect>
              </div>

              <div>
                <label className="font-bold text-slate-700">Review Comments & Board Directives</label>
                <textarea
                  rows={4}
                  required={decision === 'Returned' || decision === 'Rejected' || decision === 'Escalate'}
                  placeholder="Enter executive committee feedback, required action items, or approval conditions..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDecisionSubmit}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GateReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32 space-x-3 text-slate-500 font-sans">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-sm font-bold">Loading Gate Review Board...</span>
        </div>
      }
    >
      <GateReviewContent />
    </Suspense>
  );
}
