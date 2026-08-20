'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-context';
import { gateService } from '@/services/gate.service';
import { auditService } from '@/services/audit.service';
import { Gate, GateListResponse } from '@/types/gate.types';
import {
  Lock,
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
} from 'lucide-react';
import { cn } from '@/utils/cn';

export default function GateReviewPage() {
  const { user, role } = useAuth();
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [decision, setDecision] = useState<'Approved' | 'Approved with Conditions' | 'Rejected' | 'Returned'>('Approved');
  const [reviewComments, setReviewComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadGates = async () => {
    setIsLoading(true);
    try {
      const res: GateListResponse = await gateService.getGateReviews();
      setGates(res.gates || []);
      if (res.gates && res.gates.length > 0 && !selectedGate) {
        setSelectedGate(res.gates[0]);
      }
    } catch (err) {
      console.error('Error loading gates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGates();
  }, []);

  const filteredGates = gates.filter((g) => {
    const matchesSearch =
      g.gate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.project || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && g.approval_status === 'Pending';
    if (statusFilter === 'APPROVED') return matchesSearch && (g.status === 'Approved' || g.approval_status === 'Approved');
    if (statusFilter === 'READY') return matchesSearch && g.status === 'Ready for Review';
    return matchesSearch;
  });

  const handleDecisionSubmit = async () => {
    if (!selectedGate) return;

    if ((decision === 'Rejected' || decision === 'Returned') && !reviewComments.trim()) {
      alert('Mandatory review comments required when returning or rejecting a Gate.');
      return;
    }

    setActionLoading(true);
    try {
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
        auditService.logAction(
          user?.fullName || 'Gate Reviewer',
          'Returned Gate for Correction',
          'Gate',
          selectedGate.name,
          `Returned ${selectedGate.gate_name} for correction: ${reviewComments}`,
          'Ready for Review',
          'In Progress',
          user?.roleLabel
        );
        setSelectedGate(updated);
      } else {
        const updated = await gateService.addGateReview(selectedGate.name, {
          reviewer: user?.fullName || 'Gate Board Chair',
          decision: decision === 'Approved with Conditions' ? 'Approved with Conditions' : decision === 'Approved' ? 'Approved' : 'Rejected',
          comments: reviewComments,
        });
        auditService.logAction(
          user?.fullName || 'Gate Reviewer',
          `Gate Decision: ${decision}`,
          'Gate',
          selectedGate.name,
          `Set decision "${decision}" for ${selectedGate.gate_name}. Comments: ${reviewComments}`,
          selectedGate.approval_status,
          decision,
          user?.roleLabel
        );
        setSelectedGate(updated);
      }

      setApprovalModalOpen(false);
      setReviewComments('');
      await loadGates();
      alert(`Gate decision "${decision}" processed successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit gate decision');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/10">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Executive Gate Review Board</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase Passage Governance
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review APQP Gate Readiness, evaluate KGD criteria & critical open issues, and record executive committee decisions.
            </p>
          </div>
        </div>
        <button
          onClick={loadGates}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          <span>Refresh Gates</span>
        </button>
      </div>

      {/* Main Grid: Gate List (7 cols) + Review Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Gate Milestones List */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search Gate, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'READY', 'PENDING', 'APPROVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap',
                    statusFilter === st
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
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
              <div className="p-8 text-center text-slate-500 text-xs">No Gate Milestones found.</div>
            ) : (
              filteredGates.map((gate) => {
                const isSelected = selectedGate?.name === gate.name;
                const isApproved = gate.status === 'Approved' || gate.approval_status === 'Approved';
                const isReady = gate.status === 'Ready for Review' || gate.readiness_percentage >= 90;

                return (
                  <div
                    key={gate.name}
                    onClick={() => setSelectedGate(gate)}
                    className={cn(
                      'p-4 rounded-2xl border transition cursor-pointer space-y-2',
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-sky-400">{gate.name}</span>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                          isApproved
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isReady
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        )}
                      >
                        {gate.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white truncate">{gate.gate_name}</h3>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50">
                      <span className="font-mono">{gate.project}</span>
                      <span className="font-bold text-slate-200">
                        Readiness: <strong className="text-emerald-400">{gate.readiness_percentage}%</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Gate Inspection & Committee Approval Panel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          {selectedGate ? (
            <>
              {/* Gate Details Header */}
              <div className="space-y-2 pb-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-sky-400">{selectedGate.name}</span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {selectedGate.gate_type}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white leading-tight">{selectedGate.gate_name}</h2>
                <div className="text-xs text-slate-400">Project: <span className="font-mono text-slate-200 font-bold">{selectedGate.project}</span></div>
              </div>

              {/* Readiness Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Readiness Audit</div>
                  <div className="text-2xl font-black text-emerald-400">{selectedGate.readiness_percentage}%</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Task Completion</div>
                  <div className="text-2xl font-black text-sky-400">{selectedGate.completion_percentage}%</div>
                </div>
              </div>

              {/* Criteria Checklist */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Mandatory Gate Criteria & KGDs</span>
                  <span className="text-[11px] text-slate-500">{selectedGate.criteria?.length || 0} Criteria</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {(selectedGate.criteria || []).map((crit) => (
                    <div key={crit.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <div className="space-y-0.5 max-w-[200px]">
                        <div className="font-bold text-slate-200 truncate">{crit.name}</div>
                        <div className="text-[10px] text-slate-500">{crit.responsible_person}</div>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 text-[10px] font-bold rounded-md',
                        crit.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      )}>
                        {crit.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Executive Board Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">Executive Committee Decision</div>
                {(role === 'gate_reviewer' || role === 'admin') ? (
                  <button
                    onClick={() => setApprovalModalOpen(true)}
                    className="w-full py-3 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Award className="h-4 w-4" />
                    <span>Record Committee Gate Decision</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Gate Approval restricted to Gate Reviewer / Executive Board.</span>
                  </div>
                )}
              </div>

              {/* Past Review Records */}
              {(selectedGate.reviews || []).length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-300">Past Board Decisions</div>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {selectedGate.reviews.map((rev) => (
                      <div key={rev.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400">{rev.decision}</span>
                          <span className="text-[10px] text-slate-500">{rev.review_date}</span>
                        </div>
                        <div className="text-slate-300">{rev.comments}</div>
                        <div className="text-[10px] text-slate-500">By: {rev.reviewer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">Select a Gate milestone to inspect readiness and record committee decision.</div>
          )}
        </div>
      </div>

      {/* Committee Decision Modal */}
      {approvalModalOpen && selectedGate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Award className="h-5 w-5 text-emerald-400" />
              <span>Record Executive Gate Decision</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300">Select Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-sky-500"
                >
                  <option value="Approved">Approved (Phase Passage Granted)</option>
                  <option value="Approved with Conditions">Approved with Conditions</option>
                  <option value="Returned">Return to PM for Correction</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300">Review Comments & Board Directives</label>
                <textarea
                  rows={4}
                  required={decision === 'Returned' || decision === 'Rejected'}
                  placeholder="Enter executive committee feedback, required action items, or approval conditions..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDecisionSubmit}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
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
