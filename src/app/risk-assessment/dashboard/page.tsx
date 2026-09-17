'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  ChevronRight,
  Filter,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ProjectRiskSummary {
  project_id: string;
  project_name: string;
  current_phase: string;
  high_risk_count: number;
  overall_risk_assessment: 'OK' | 'M' | 'H';
  escalation_recommendation: string;
  total_items: number;
  open_plans_needed: number;
  plans_completed: number;
  last_updated: string;
  updated_by: string;
}

interface RiskDashboardData {
  total_projects: number;
  assessed_projects: number;
  high_risk_items: number;
  escalated_projects: number;
  risk_distribution: {
    ok: number;
    medium: number;
    high: number;
  };
  mitigation_status: {
    plans_needed: number;
    plans_completed: number;
    completion_rate: number;
  };
  projects: ProjectRiskSummary[];
}

export default function RiskAssessmentDashboardPage() {
  const [data, setData] = useState<RiskDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'OK' | 'M' | 'H'>('ALL');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/risk-assessment/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load risk dashboard data', err);
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
      riskFilter === 'ALL' || p.overall_risk_assessment === riskFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#FFFBEB] border border-amber-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>PROJECT RISK VISIBILITY & GOVERNANCE</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Risk Assessment Enterprise Dashboard
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Consolidated enterprise visibility into technical, manufacturing, financial, timing, and customer risks. 
              Provides live tracking of high-risk items and mandatory risk resolution mitigation plans.
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
              href="/risk-assessment"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Project Assessments</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Projects Assessed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Projects Evaluated</span>
            <ShieldCheck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {data?.assessed_projects || 0}
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              / {data?.total_projects || 0} total
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            6 core risk areas tracked per project
          </p>
        </div>

        {/* Card 2: High Risk Items */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between text-xs text-rose-700 font-bold uppercase tracking-wider">
            <span>High Risk Items</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {data?.high_risk_items || 0}
          </div>
          <p className="text-[11px] text-rose-600/80 font-medium">
            Strict resolution plans required
          </p>
        </div>

        {/* Card 3: Escalation Recommendations */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1 bg-amber-50/20">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wider">
            <span>Escalation Triggered</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">
            {data?.escalated_projects || 0}
          </div>
          <p className="text-[11px] text-amber-700/80 font-medium">
            Projects requiring executive escalation
          </p>
        </div>

        {/* Card 4: Mitigation Plan Completion Rate */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider">
            <span>Mitigation Compliance</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {data?.mitigation_status?.completion_rate ?? 100}%
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium">
            {data?.mitigation_status?.plans_completed || 0} of {data?.mitigation_status?.plans_needed || 0} plans documented
          </p>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Enterprise Risk Distribution
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-800">Low Risk (OK)</div>
              <div className="text-xl font-extrabold text-emerald-900 mt-0.5">
                {data?.risk_distribution?.ok || 0} Projects
              </div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-800">Medium Risk (M)</div>
              <div className="text-xl font-extrabold text-amber-900 mt-0.5">
                {data?.risk_distribution?.medium || 0} Projects
              </div>
            </div>
            <Clock className="h-6 w-6 text-amber-600" />
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-800">High Risk (H)</div>
              <div className="text-xl font-extrabold text-rose-900 mt-0.5">
                {data?.risk_distribution?.high || 0} Projects
              </div>
            </div>
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Project-Wise Risk Summary Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Project-Wise Risk Summary
            </h3>
            <p className="text-xs text-slate-500">
              Live status across all monitored programs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Risk Filter Buttons */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-bold">
              {(['ALL', 'OK', 'M', 'H'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskFilter(r)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    riskFilter === r
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {r === 'ALL' ? 'All' : r === 'OK' ? 'Low' : r === 'M' ? 'Medium' : 'High'}
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
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
            Loading project risk summaries...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            No projects match the current search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Program / Project</th>
                  <th className="py-3 px-4">Phase</th>
                  <th className="py-3 px-4">Overall Risk</th>
                  <th className="py-3 px-4">High Risks</th>
                  <th className="py-3 px-4">PDT Recommendation</th>
                  <th className="py-3 px-4">Resolution Plans</th>
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
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                        {p.current_phase}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.overall_risk_assessment === 'OK' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Low Risk (OK)
                        </span>
                      )}
                      {p.overall_risk_assessment === 'M' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Medium Risk (M)
                        </span>
                      )}
                      {p.overall_risk_assessment === 'H' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          High Risk (H)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-black text-xs ${
                          p.high_risk_count > 0 ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {p.high_risk_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          p.escalation_recommendation === 'Escalate'
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : p.escalation_recommendation.includes('Follow-up')
                            ? 'bg-amber-100 text-amber-800 font-bold'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.escalation_recommendation}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.open_plans_needed > 0 ? (
                        <span className="text-rose-600 font-bold text-[11px]">
                          {p.open_plans_needed} plan(s) required
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[11px]">
                          All plans resolved
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/risk-assessment?project=${encodeURIComponent(p.project_id)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition"
                      >
                        <span>Assess</span>
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
    </div>
  );
}
