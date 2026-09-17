'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Lock,
  History,
  AlertCircle,
  Users,
} from 'lucide-react';
import { PDPStageCode, PDP_STAGE_ORDER, StageMovementHistoryEntry } from '@/types/stage-mover.types';

const STAGE_LABELS: Record<PDPStageCode, { name: string; desc: string }> = {
  PL: { name: 'Concept / Launch', desc: 'Program Kickoff' },
  VC: { name: 'Concept Validation', desc: 'Feasibility & Engineering' },
  TKO: { name: 'Tooling Kick-Off', desc: 'Long-Lead Sourcing' },
  VL: { name: 'Tooling & Process Validation', desc: 'Pre-production Trials' },
  CPA: { name: 'Customer Process Approval', desc: 'PPAP & Signoff' },
  CT: { name: 'Customer Transformation', desc: 'SOP & Closeout' },
};

interface ProjectStageSummary {
  project_id: string;
  project_name: string;
  current_stage: PDPStageCode;
  next_stage: PDPStageCode | null;
  can_move: boolean;
  block_reason?: string;
  pd_decision: 'Pass' | 'Pass with Follow-up' | 'Escalate' | 'Pending';
  pd_name: string;
  board_summary: {
    total: number;
    pass: number;
    pass_with_followup: number;
    escalate: number;
    pending: number;
  };
  is_locked: boolean;
  workflow_triggered: boolean;
}

interface StageMoverDashboardData {
  total_projects: number;
  stage_distribution: Record<PDPStageCode, number>;
  decisions: {
    pass: number;
    pass_with_followup: number;
    escalate: number;
    pending: number;
  };
  movement_readiness: {
    can_move: number;
    blocked: number;
  };
  pmo_attention_count: number;
  recent_movements: StageMovementHistoryEntry[];
  projects: ProjectStageSummary[];
}

export default function StageMoverDashboardPage() {
  const [data, setData] = useState<StageMoverDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | PDPStageCode>('ALL');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stage-mover/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load stage mover dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const projects = data?.projects || [];
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      p.project_id.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesStage =
      stageFilter === 'ALL' || p.current_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#EEF2FF] border border-indigo-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-indigo-900">
              <GitCommit className="h-4 w-4 text-indigo-600" />
              <span>PDP LIFECYCLE & GATE GOVERNANCE</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              PDP Stage Mover Enterprise Dashboard
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Consolidated enterprise visibility across the 6 PDP lifecycle phases: 
              <strong className="text-slate-900 font-semibold"> PL → VC → TKO → VL → CPA → CT</strong>. 
              Tracks Gate Review Board sign-offs, Platform Director decisions, and historical transition locks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/stage-mover"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <GitCommit className="h-3.5 w-3.5" />
              <span>Stage Mover Screen</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Programs */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Total Programs</span>
            <GitCommit className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.total_projects || 0}
          </div>
          <p className="text-[11px] text-slate-500">
            Governed by Gate Review Results
          </p>
        </div>

        {/* Card 2: Ready to Advance */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider">
            <span>Ready to Advance</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {data?.movement_readiness?.can_move || 0}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium">
            Platform Director approved
          </p>
        </div>

        {/* Card 3: Transition Blocked */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Transitions Blocked</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.movement_readiness?.blocked || 0}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Awaiting decision or escalated
          </p>
        </div>

        {/* Card 4: PMO Attention Needed */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wider">
            <span>PMO Attention</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {data?.pmo_attention_count || 0}
          </div>
          <p className="text-[11px] text-rose-600/80 font-medium">
            Escalations requiring PMO governance
          </p>
        </div>
      </div>

      {/* PDP Stage Distribution Pipeline */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Active Projects by PDP Lifecycle Phase
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PDP_STAGE_ORDER.map((stg) => {
            const count = data?.stage_distribution?.[stg] || 0;
            return (
              <div
                key={stg}
                onClick={() => setStageFilter(stageFilter === stg ? 'ALL' : stg)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  stageFilter === stg
                    ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400/30'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    {stg}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {count}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 line-clamp-1">
                    {STAGE_LABELS[stg].name}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">
                    {STAGE_LABELS[stg].desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Stage Progression Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Project Stage Progression & Decision Status
            </h3>
            <p className="text-xs text-slate-500">
              Platform Director sign-offs and stage transition eligibility
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Stage Filter Indicator */}
            {stageFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setStageFilter('ALL')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
              >
                Clear Filter ({stageFilter})
              </button>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Loading project stage statuses...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            No projects match the current search or stage filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Target Next</th>
                  <th className="py-3 px-4">PD Decision</th>
                  <th className="py-3 px-4">Board Votes</th>
                  <th className="py-3 px-4">Transition Readiness</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.project_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{p.project_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md font-extrabold text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                        {p.current_stage}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.next_stage ? (
                        <span className="font-mono font-bold text-slate-700">
                          {p.next_stage}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Final Stage (CT)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {p.pd_decision === 'Pass' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Pass
                        </span>
                      )}
                      {p.pd_decision === 'Pass with Follow-up' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                          <CheckCircle2 className="h-3 w-3" /> Pass w/ Follow-up
                        </span>
                      )}
                      {p.pd_decision === 'Escalate' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          <AlertTriangle className="h-3 w-3" /> Escalate
                        </span>
                      )}
                      {p.pd_decision === 'Pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          <Clock className="h-3 w-3" /> Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      <span className="text-emerald-700 font-bold">{p.board_summary.pass} P</span> /{' '}
                      <span className="text-amber-700 font-bold">{p.board_summary.pass_with_followup} F</span> /{' '}
                      <span className="text-rose-700 font-bold">{p.board_summary.escalate} E</span>
                    </td>
                    <td className="py-3 px-4">
                      {p.can_move ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Eligible to Advance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500" title={p.block_reason}>
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {p.block_reason || 'Blocked'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/stage-mover?project=${encodeURIComponent(p.project_id)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition"
                      >
                        <span>Move</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Movements Audit Trail */}
      {data?.recent_movements && data.recent_movements.length > 0 && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Recent Stage Transitions Across Programs
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Program</th>
                  <th className="py-2.5 px-4">Transition</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Executed By</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_movements.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(entry.moved_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {entry.project_id}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      {entry.from_stage} → {entry.to_stage}
                    </td>
                    <td className="py-2.5 px-4">
                      {entry.trigger_type === 'PD_APPROVAL' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PD Approval
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          PMO Override
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">
                      {entry.moved_by}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Lock className="h-3 w-3" /> Historical Results Locked
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
