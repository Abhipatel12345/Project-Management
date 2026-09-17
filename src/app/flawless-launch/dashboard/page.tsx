'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  ChevronRight,
  RefreshCw,
  Award,
  Layers,
  Calendar,
  Percent,
} from 'lucide-react';

interface ProjectFLMSummary {
  project_id: string;
  project_name: string;
  current_gate: string;
  overall_flm_status: 'GREEN' | 'RED';
  overall_green_count: number;
  overall_total_metrics: number;
  oi_is_green: boolean;
  indicators: {
    ppap: boolean;
    rebill: boolean;
    oee: boolean;
    otd: boolean;
    oi: boolean;
  };
  last_evaluated: string;
}

interface FLMDashboardData {
  total_projects: number;
  green_projects: number;
  red_projects: number;
  ppap_green_pct: number;
  rebill_green_pct: number;
  oee_green_pct: number;
  otd_green_pct: number;
  oi_green_pct: number;
  projects: ProjectFLMSummary[];
}

export default function FlawlessLaunchDashboardPage() {
  const [data, setData] = useState<FLMDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GREEN' | 'RED'>('ALL');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/flawless-launch/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load FLM dashboard data', err);
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
    const matchesFilter =
      statusFilter === 'ALL' || p.overall_flm_status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const total = data?.total_projects || 0;
  const greenCount = data?.green_projects || 0;
  const overallRate = total > 0 ? Math.round((greenCount / total) * 100) : 0;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#F0FDF4] border border-emerald-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-emerald-800">
              <Rocket className="h-4 w-4 text-emerald-600" />
              <span>FLAWLESS LAUNCH MANAGEMENT (FLM)</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Flawless Launch Enterprise Dashboard
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Real-time enterprise visibility across all 5 controlled launch indicators. 
              Enforces the authoritative rule: <strong className="text-slate-900 font-semibold">OI% MUST be Green AND at least 4 of 5 indicators Green</strong> for Final FLM Green.
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
              href="/flawless-launch"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Launch Trackers</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Evaluated */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Programs Evaluated</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {total}
          </div>
          <p className="text-[11px] text-slate-500">
            Across all active PDP gate stages
          </p>
        </div>

        {/* Card 2: Final FLM Green */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider">
            <span>Final FLM Green</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {greenCount}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium">
            Satisfying OI% Green + ≥4/5 rule
          </p>
        </div>

        {/* Card 3: Final FLM Red */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold uppercase tracking-wider">
            <span>Final FLM Red</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800">
            {data?.red_projects || 0}
          </div>
          <p className="text-[11px] text-rose-700/80 font-medium">
            Requires corrective action review
          </p>
        </div>

        {/* Card 4: Enterprise Launch Success Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Enterprise Launch Health</span>
            <Award className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {overallRate}%
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Overall Green compliance rate
          </p>
        </div>
      </div>

      {/* 5 Indicators Enterprise Compliance Bar */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          5 Controlled Indicators Compliance (% Green)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">1. PPAP Timing</div>
            <div className="text-xl font-extrabold text-slate-900">
              {data?.ppap_green_pct ?? 0}%
            </div>
            <p className="text-[10px] text-slate-500">On-Time vs Baseline</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">2. Rebill Timing</div>
            <div className="text-xl font-extrabold text-slate-900">
              {data?.rebill_green_pct ?? 0}%
            </div>
            <p className="text-[10px] text-slate-500">On-Time vs Baseline</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">3. OEE Status</div>
            <div className="text-xl font-extrabold text-slate-900">
              {data?.oee_green_pct ?? 0}%
            </div>
            <p className="text-[10px] text-slate-500">Target ≥ 85%</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">4. OTD Status</div>
            <div className="text-xl font-extrabold text-slate-900">
              {data?.otd_green_pct ?? 0}%
            </div>
            <p className="text-[10px] text-slate-500">Target = 100%</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-1 ring-1 ring-emerald-400/40">
            <div className="text-[11px] font-extrabold text-emerald-800 uppercase flex items-center gap-1">
              <span>5. OI% Status</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200 text-emerald-900 font-black">MANDATORY</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-900">
              {data?.oi_green_pct ?? 0}%
            </div>
            <p className="text-[10px] text-emerald-700">Target ≥ 95%</p>
          </div>
        </div>
      </div>

      {/* Project-Wise FLM Performance Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Project Flawless Launch Performance
            </h3>
            <p className="text-xs text-slate-500">
              Indicator evaluations and calculated final status
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Buttons */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-bold">
              {(['ALL', 'GREEN', 'RED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg transition ${
                    statusFilter === s
                      ? s === 'GREEN'
                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                        : s === 'RED'
                        ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                        : 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s === 'GREEN' ? 'Final Green' : 'Final Red'}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Evaluating project launch performance...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            No projects match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Gate</th>
                  <th className="py-3 px-4 text-center">PPAP</th>
                  <th className="py-3 px-4 text-center">Rebill</th>
                  <th className="py-3 px-4 text-center">OEE</th>
                  <th className="py-3 px-4 text-center">OTD</th>
                  <th className="py-3 px-4 text-center">OI % (Req)</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4">Final FLM</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const isFinalGreen = p.overall_flm_status === 'GREEN';
                  return (
                    <tr key={p.project_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.project_name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{p.project_id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                          {p.current_gate}
                        </span>
                      </td>

                      {/* PPAP Indicator */}
                      <td className="py-3 px-4 text-center">
                        {p.indicators.ppap ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" title="PPAP: Green" />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-rose-500" title="PPAP: Red" />
                        )}
                      </td>

                      {/* Rebill Indicator */}
                      <td className="py-3 px-4 text-center">
                        {p.indicators.rebill ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" title="Rebill: Green" />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-rose-500" title="Rebill: Red" />
                        )}
                      </td>

                      {/* OEE Indicator */}
                      <td className="py-3 px-4 text-center">
                        {p.indicators.oee ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" title="OEE: Green (≥85%)" />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-rose-500" title="OEE: Red (<85%)" />
                        )}
                      </td>

                      {/* OTD Indicator */}
                      <td className="py-3 px-4 text-center">
                        {p.indicators.otd ? (
                          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" title="OTD: Green (100%)" />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-rose-500" title="OTD: Red (<100%)" />
                        )}
                      </td>

                      {/* OI% Mandatory Indicator */}
                      <td className="py-3 px-4 text-center bg-slate-50/50 font-bold">
                        {p.indicators.oi ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Green
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <XCircle className="h-3 w-3 text-rose-600" /> Red
                          </span>
                        )}
                      </td>

                      {/* Green Count */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={p.overall_green_count >= 4 ? 'text-emerald-700' : 'text-slate-600'}>
                          {p.overall_green_count}/5
                        </span>
                      </td>

                      {/* Final FLM */}
                      <td className="py-3 px-4">
                        {isFinalGreen ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle2 className="h-3 w-3" />
                            GREEN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-rose-600 text-white shadow-2xs">
                            <XCircle className="h-3 w-3" />
                            RED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/flawless-launch?project=${encodeURIComponent(p.project_id)}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                        >
                          <span>Tracker</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
