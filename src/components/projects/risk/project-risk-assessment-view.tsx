'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useProjectRiskAssessment,
  useUpdateProjectRiskAssessment,
} from '@/hooks/use-risk-assessment';
import { ProjectRiskAssessment, RiskArea, RiskItem, RiskRating } from '@/types/risk.types';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  ShieldCheck,
  Building,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  HelpCircle,
  Info,
} from 'lucide-react';
import { SearchableSelect } from '@/components/shared/searchable-select';

interface ProjectRiskAssessmentViewProps {
  projectId: string;
  projectName?: string;
  currentPhase?: string;
}

export function ProjectRiskAssessmentView({
  projectId,
  projectName,
  currentPhase = 'PL',
}: ProjectRiskAssessmentViewProps) {
  const { data: assessment, isLoading, error, refetch } = useProjectRiskAssessment(
    projectId,
    projectName,
    currentPhase
  );

  const updateMutation = useUpdateProjectRiskAssessment();

  const [localAreas, setLocalAreas] = useState<RiskArea[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>(currentPhase);
  const [expandedArea, setExpandedArea] = useState<string | 'ALL'>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (assessment?.areas) {
      setLocalAreas(JSON.parse(JSON.stringify(assessment.areas)));
      setSelectedPhase(assessment.current_pdp_phase || currentPhase);
    }
  }, [assessment, currentPhase]);

  // Compute live metrics from local edits
  const { liveHighCount, liveOverallRisk, liveEscalation } = useMemo(() => {
    let high = 0;
    let low = 0;
    for (const area of localAreas) {
      for (const item of area.items) {
        if (item.rating === 'H') high++;
        else if (item.rating === 'L') low++;
      }
    }
    const overall: RiskRating = high > 0 ? 'H' : low > 0 ? 'L' : 'OK';
    const esc: 'Y' | 'N' = high > 0 ? 'Y' : 'N';
    return { liveHighCount: high, liveOverallRisk: overall, liveEscalation: esc };
  }, [localAreas]);

  const handleOptionChange = (areaId: string, itemId: string, value: string) => {
    setLocalAreas((prev) =>
      prev.map((area) => {
        if (area.id !== areaId) return area;
        return {
          ...area,
          items: area.items.map((item) => {
            if (item.id !== itemId) return item;
            // Default risk rating assignment based on template logic
            let rating: RiskRating = item.rating;
            if (value === 'Yes' && (item.question.includes('New Customer') || item.question.includes('Competitor'))) {
              rating = 'H';
            } else if (value.includes('No Plan') || value === 'Difficult' || value === 'Not Used' || value === 'Not Available') {
              rating = 'H';
            } else if (value.includes('Have Plan') || value === 'Compressed' || value === 'Weak' || value === 'New application' || value === '3 or More') {
              rating = 'L';
            } else if (value === 'No' || value === 'Normal' || value === 'Solid' || value === 'Available' || value === 'Easy' || value === 'Existing application' || value === 'None' || value === '1') {
              rating = 'OK';
            }
            return {
              ...item,
              selected_value: value,
              rating,
            };
          }),
        };
      })
    );
  };

  const handleRatingChange = (areaId: string, itemId: string, rating: RiskRating) => {
    setLocalAreas((prev) =>
      prev.map((area) => {
        if (area.id !== areaId) return area;
        return {
          ...area,
          items: area.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, rating };
          }),
        };
      })
    );
  };

  const handleFieldChange = (
    areaId: string,
    itemId: string,
    field: keyof RiskItem,
    val: string
  ) => {
    setLocalAreas((prev) =>
      prev.map((area) => {
        if (area.id !== areaId) return area;
        return {
          ...area,
          items: area.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, [field]: val };
          }),
        };
      })
    );
  };

  const handleSave = async () => {
    setStatusMessage(null);

    // Rule enforcement: "A Risk Resolution Plan is Required for all High Risk Items"
    for (const area of localAreas) {
      for (const item of area.items) {
        if (item.rating === 'H') {
          const plan = (item.risk_resolution_plan || '').trim();
          if (!plan) {
            setStatusMessage({
              type: 'error',
              text: `A Risk Resolution Plan is Required for all High Risk Items! Please provide a plan for "${item.question}" in ${area.name}.`,
            });
            return;
          }
        }
      }
    }

    try {
      await updateMutation.mutateAsync({
        projectId,
        data: {
          project_name: projectName || assessment?.project_name || projectId,
          current_pdp_phase: selectedPhase,
          areas: localAreas,
        },
      });
      setStatusMessage({ type: 'success', text: 'Project Risk Assessment saved successfully!' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save Risk Assessment. Please verify inputs.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto" />
        <p className="text-xs font-bold text-slate-600">Loading Project Risk Assessment...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner & KPI Cards */}
      <div className="p-6 rounded-2xl bg-[#EBF5FF] border border-sky-200/90 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>PROJECT RISK ASSESSMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {projectName || assessment?.project_name || projectId}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
              <span>Project ID: <strong className="font-mono text-slate-900">{projectId}</strong></span>
              <span>•</span>
              <span>Quote Phase: <strong className="text-slate-900">{assessment?.quote_phase || 'Quote'}</strong></span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>Current PDP Phase:</span>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="px-2 py-0.5 rounded-md bg-white border border-sky-300 font-bold text-sky-800 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="PL">PL</option>
                  <option value="VC">VC</option>
                  <option value="TKO">TKO</option>
                  <option value="VL">VL</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Assessment'}</span>
            </button>
          </div>
        </div>

        {/* 3 Core Header Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Overall Risk Assessment */}
          <div className="p-4 rounded-xl bg-white border border-sky-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Project Overall Risk
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-black px-2.5 py-0.5 rounded-lg border ${
                  liveOverallRisk === 'H'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : liveOverallRisk === 'L'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {liveOverallRisk === 'H' ? 'High (H)' : liveOverallRisk === 'L' ? 'Low (L)' : 'OK'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Aggregated across all 6 project risk areas
            </p>
          </div>

          {/* 2. Number of High Risk Items */}
          <div className="p-4 rounded-xl bg-white border border-sky-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              High Risk Items
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xl font-black ${
                  liveHighCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {liveHighCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {liveHighCount === 1 ? 'item requires plan' : 'items require plan'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Resolution plan mandatory for each high risk
            </p>
          </div>

          {/* 3. Escalation Recommendation */}
          <div className="p-4 rounded-xl bg-white border border-sky-200/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Escalation Recommendation
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-black px-2.5 py-0.5 rounded-lg border ${
                  liveEscalation === 'Y'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {liveEscalation === 'Y' ? 'YES (Escalate)' : 'NO (Normal)'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Triggered automatically if any high risk is present
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Notification Box */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Authoritative Rule from Source Template:</strong>
          <p className="mt-0.5 text-amber-800">
            &ldquo;A Risk Resolution Plan is Required for all High Risk Items&rdquo;. When an item is rated as <strong className="text-rose-700">High (H)</strong>, you must fill out the Description of Risk and a Specific Risk Resolution Plan before saving.
          </p>
        </div>
      </div>

      {/* Feedback Toast Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 6 Risk Areas Sections */}
      <div className="space-y-6">
        {localAreas.map((area, areaIdx) => {
          const isExpanded = expandedArea === 'ALL' || expandedArea === area.id;
          const areaHighCount = area.items.filter((i) => i.rating === 'H').length;

          return (
            <div
              key={area.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <div
                onClick={() =>
                  setExpandedArea((prev) => (prev === area.id ? 'NONE' : area.id))
                }
                className="p-4 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer border-b border-slate-200 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
                    {String.fromCharCode(65 + areaIdx)}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    {area.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      area.overall_risk === 'H'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : area.overall_risk === 'L'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    Risk: {area.overall_risk}
                  </span>
                  {areaHighCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {areaHighCount} High
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-semibold text-slate-500">
                    {area.items.length} criteria
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Items Table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/60 text-slate-600 text-[11px] font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 w-44">Category / Item</th>
                        <th className="py-2.5 px-3 w-48">Selected Value</th>
                        <th className="py-2.5 px-3 w-28 text-center">Rating</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Description of Risk</th>
                        <th className="py-2.5 px-3 min-w-[240px]">
                          Risk Resolution Plan <span className="text-rose-500">*</span>
                        </th>
                        <th className="py-2.5 px-3 w-32">Owner</th>
                        <th className="py-2.5 px-3 w-32">Target Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {area.items.map((item, idx) => {
                        const isHigh = item.rating === 'H';
                        const hasPlanError = isHigh && !(item.risk_resolution_plan || '').trim();

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/70 transition ${
                              isHigh ? 'bg-rose-50/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              {item.category && (
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {item.category}
                                </span>
                              )}
                              <span className="font-bold text-slate-900">{item.question}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.selected_value || item.allowed_options[0]}
                                onChange={(e) =>
                                  handleOptionChange(area.id, item.id, e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                              >
                                {item.allowed_options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <select
                                value={item.rating}
                                onChange={(e) =>
                                  handleRatingChange(area.id, item.id, e.target.value as RiskRating)
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-black border cursor-pointer ${
                                  item.rating === 'H'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                                    : item.rating === 'L'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                }`}
                              >
                                <option value="OK">OK</option>
                                <option value="L">Low (L)</option>
                                <option value="H">High (H)</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.description_of_risk || ''}
                                onChange={(e) =>
                                  handleFieldChange(area.id, item.id, 'description_of_risk', e.target.value)
                                }
                                placeholder="Describe risk..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              >
                              </input>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.risk_resolution_plan || ''}
                                onChange={(e) =>
                                  handleFieldChange(area.id, item.id, 'risk_resolution_plan', e.target.value)
                                }
                                placeholder={isHigh ? 'Required resolution plan...' : 'Action to reduce risk...'}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 ${
                                  hasPlanError
                                    ? 'bg-rose-50 border-2 border-rose-500 focus:ring-rose-500'
                                    : 'bg-white border border-slate-200 focus:ring-sky-500'
                                }`}
                              />
                              {hasPlanError && (
                                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                  Plan required for High risk
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.owner || ''}
                                onChange={(e) =>
                                  handleFieldChange(area.id, item.id, 'owner', e.target.value)
                                }
                                placeholder="Owner..."
                                className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                value={item.target_completion_date || ''}
                                onChange={(e) =>
                                  handleFieldChange(area.id, item.id, 'target_completion_date', e.target.value)
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
