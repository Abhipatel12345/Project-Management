'use client';

import React, { useState } from 'react';
import { useProjectFLM } from '@/hooks/use-flawless-launch';
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  Info,
  TrendingUp,
  Percent,
  RefreshCw,
  Award,
} from 'lucide-react';

interface ProjectFlawlessLaunchViewProps {
  projectId: string;
  projectName?: string;
  currentGate?: string;
}

export function ProjectFlawlessLaunchView({
  projectId,
  projectName,
  currentGate = 'PL',
}: ProjectFlawlessLaunchViewProps) {
  const { data: flmData, isLoading, refetch } = useProjectFLM(
    projectId,
    projectName,
    currentGate
  );

  const [activeGateTab, setActiveGateTab] = useState<string>(currentGate);

  if (isLoading) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mx-auto" />
        <p className="text-xs font-bold text-slate-600">Evaluating Flawless Launch Metrics...</p>
      </div>
    );
  }

  const gates = flmData?.gates || [];
  const selectedGateEval = gates.find((g) => g.gate_code === activeGateTab) || gates[0];
  const isFinalGreen = flmData?.overall_flm_status === 'GREEN';

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#F0FDF4] border border-emerald-200/90 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-emerald-800">
              <Rocket className="h-4 w-4 text-emerald-600" />
              <span>FLAWLESS LAUNCH MANAGEMENT (FLM)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {flmData?.project_name || projectName || projectId}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
              <span>Project ID: <strong className="font-mono text-slate-900">{projectId}</strong></span>
              <span>•</span>
              <span>
                Current PDP Gate:{' '}
                <strong className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black">
                  {flmData?.current_gate || currentGate}
                </strong>
              </span>
              <span>•</span>
              <span className="text-slate-400">
                Auto-calculated from Gantt & Imperative Scorecard
              </span>
            </div>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl border border-emerald-200 transition shadow-xs cursor-pointer self-start lg:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Re-evaluate</span>
          </button>
        </div>

        {/* Final FLM Indicator Status Banner */}
        <div
          className={`p-5 rounded-xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isFinalGreen
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          <div className="flex items-center gap-3.5">
            {isFinalGreen ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-100 shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-rose-100 shrink-0" />
            )}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100/90 block">
                Overall Gate Evaluation Status
              </span>
              <h2 className="text-xl font-black tracking-tight">
                {isFinalGreen
                  ? 'FINAL FLM: GREEN — Ready for Flawless Launch'
                  : 'FINAL FLM: RED — Critical Criteria Not Met'}
              </h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {flmData?.overall_green_count} of 5 FLM Indicators are Green • Mandatory OI%:{' '}
                {flmData?.oi_is_green ? 'Achieved (Green)' : 'Not Achieved (Red)'}
              </p>
            </div>
          </div>

          <div className="px-4 py-2 rounded-lg bg-black/15 text-xs font-mono font-bold text-center shrink-0">
            Rule: OI% Mandatory + ≥ 4/5 Green
          </div>
        </div>
      </div>

      {/* Authoritative Business Rule Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs">
        <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-slate-900">Authoritative FLM Decision Rule:</strong>
          <p className="mt-0.5 text-slate-600">
            &ldquo;4 out of 5 FLM Indicator should be Green for final FLM to be green out of which OI% Should be mandatory&rdquo;.
            PMs cannot manually edit these indicators; all values are computed live from Gantt schedule baselines and the Imperative Scorecard.
          </p>
        </div>
      </div>

      {/* PDP Gate Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold scrollbar-none">
        <span className="text-slate-400 uppercase text-[11px] pr-2 shrink-0">Evaluate Gate:</span>
        {gates.map((g) => {
          const isSelected = activeGateTab === g.gate_code;
          const isCurrent = g.is_current;

          return (
            <button
              key={g.gate_code}
              type="button"
              onClick={() => setActiveGateTab(g.gate_code)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition whitespace-nowrap shrink-0 border cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{g.gate_code}</span>
              {isCurrent && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold uppercase">
                  Current
                </span>
              )}
              <span
                className={`w-2 h-2 rounded-full ${
                  g.final_flm_status === 'GREEN' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* 5 FLM Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedGateEval?.metrics.map((metric, idx) => {
          const isGreen = metric.indicator === 'GREEN';

          return (
            <div
              key={metric.id}
              className={`p-5 rounded-2xl border shadow-xs transition flex flex-col justify-between space-y-4 ${
                isGreen
                  ? 'bg-white border-slate-200 hover:border-emerald-300'
                  : 'bg-rose-50/30 border-rose-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    METRIC #{idx + 1} {metric.is_mandatory && '• MANDATORY'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      isGreen
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {isGreen ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-rose-600" />
                    )}
                    <span>{metric.indicator}</span>
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  {metric.name}
                </h3>
                <p className="text-xs text-slate-500">{metric.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                {metric.target_date && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Target Finish:
                    </span>
                    <strong className="font-mono text-slate-900">{metric.target_date}</strong>
                  </div>
                )}
                {metric.current_date && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Current Finish:
                    </span>
                    <strong className="font-mono text-slate-900">{metric.current_date}</strong>
                  </div>
                )}
                {metric.target_value && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Target:</span>
                    <strong className="font-mono text-slate-900">{metric.target_value}</strong>
                  </div>
                )}
                {metric.current_value && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Current / Actual:</span>
                    <strong className="font-mono text-slate-900">{metric.current_value}</strong>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Source:</span>
                  <span className="font-semibold text-slate-600">{metric.source}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
