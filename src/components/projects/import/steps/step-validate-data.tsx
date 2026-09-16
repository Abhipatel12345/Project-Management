'use client';

import React, { useState } from 'react';
import {
  DuplicateHandlingMode,
  ImportValidationSummary,
  ParsedProjectItem,
} from '@/types/excel-import.types';
import { excelImportService } from '@/services/excel-import.service';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  FileSpreadsheet,
  RefreshCw,
  ArrowRight,
  UserX,
  CalendarX,
  AlertCircle,
} from 'lucide-react';

interface StepValidateDataProps {
  summary: ImportValidationSummary;
  projects: ParsedProjectItem[];
  duplicateMode: DuplicateHandlingMode;
  onDuplicateModeChange: (mode: DuplicateHandlingMode) => void;
  onBackToMapping: () => void;
  onReupload: () => void;
  onProceedToPreview: () => void;
}

export function StepValidateData({
  summary,
  projects,
  duplicateMode,
  onDuplicateModeChange,
  onBackToMapping,
  onReupload,
  onProceedToPreview,
}: StepValidateDataProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(
    projects.find((p) => !p.isValid)?.projectIdentifier || projects[0]?.projectIdentifier || null
  );

  const isBlocked = summary.status === 'IMPORT_BLOCKED';
  const invalidProjects = projects.filter((p) => !p.isValid);
  const validProjects = projects.filter((p) => p.isValid);

  const handleDownloadErrors = () => {
    excelImportService.exportValidationErrorsCSV(summary.errors, summary.warnings);
  };

  return (
    <div className="space-y-6">
      {/* High-Level Status Banner */}
      {isBlocked ? (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-xs shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-rose-900">
                  IMPORT VALIDATION BLOCKED
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black uppercase tracking-wide">
                  {summary.totalErrors} Critical Error{summary.totalErrors !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Atomic safety lock: No projects will be created until all critical validation errors are resolved. Review the row-level error breakdown below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadErrors}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-rose-600" />
              <span>Download Error Report</span>
            </button>
          </div>
        </div>
      ) : summary.totalWarnings > 0 ? (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-600 text-white shadow-xs shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-amber-900">
                  READY TO IMPORT (WITH WARNINGS)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wide">
                  {summary.totalWarnings} Warning{summary.totalWarnings !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                All {summary.validProjectsCount} projects passed strict validation. Review non-blocking warnings (such as duplicate project keys) before proceeding.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadErrors}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-amber-600" />
              <span>Download Warnings</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-emerald-900">
                  DATA VALIDATION PASSED
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase tracking-wide">
                  100% Valid
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                All {summary.validProjectsCount} projects, {summary.totalPhases} phases, and {summary.totalTasks} tasks are validated and ready for bulk creation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Projects Found
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {summary.projectsDetected}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
            Valid Projects
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {summary.validProjectsCount}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
            Invalid Projects
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">
            {summary.invalidProjectsCount}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Total Tasks
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {summary.totalTasks}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Phases / Gates
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {summary.totalPhases}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Deliverables
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {summary.totalDeliverables}
          </div>
        </div>
      </div>

      {/* Duplicate Project Handling Settings */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Duplicate Project ID / Name Resolution
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure system behavior if an imported Project ID or Project Name matches an existing PDM project.
            </p>
          </div>
          {summary.duplicateProjectsCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold shrink-0">
              {summary.duplicateProjectsCount} Duplicate{summary.duplicateProjectsCount !== 1 ? 's' : ''} Detected
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {[
            {
              id: 'skip' as DuplicateHandlingMode,
              label: 'Skip Existing Projects',
              desc: 'Only import new projects. Existing projects remain untouched.',
              recommended: true,
            },
            {
              id: 'update' as DuplicateHandlingMode,
              label: 'Update Existing Projects',
              desc: 'Add new phases and tasks into the existing matching projects.',
            },
            {
              id: 'stop' as DuplicateHandlingMode,
              label: 'Stop Import on Duplicate',
              desc: 'Strict lock: Halt entire import if any duplicates exist.',
            },
            {
              id: 'create_new_only' as DuplicateHandlingMode,
              label: 'Create As New (Add Suffix)',
              desc: 'Append unique identifier suffix and create as new projects.',
            },
          ].map((mode) => (
            <label
              key={mode.id}
              onClick={() => onDuplicateModeChange(mode.id)}
              className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                duplicateMode === mode.id
                  ? 'border-sky-600 bg-white shadow-xs ring-2 ring-sky-600/20'
                  : 'border-slate-200 bg-white/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  {mode.label}
                </span>
                <input
                  type="radio"
                  name="duplicateMode"
                  checked={duplicateMode === mode.id}
                  onChange={() => onDuplicateModeChange(mode.id)}
                  className="text-sky-600 focus:ring-sky-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                {mode.desc}
              </p>
              {mode.recommended && (
                <span className="mt-2 text-[9px] font-black text-sky-600 uppercase">
                  (Recommended)
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Grouped Project Error & Validation Accordion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
            Project-by-Project Validation Results ({projects.length})
          </h4>
          <span className="text-[11px] text-slate-500">
            Click on any project to inspect row-level error details
          </span>
        </div>

        <div className="space-y-2">
          {projects.map((proj) => {
            const isExpanded = expandedProject === proj.projectIdentifier;
            const hasErrors = proj.errors.length > 0;
            const hasWarnings = proj.warnings.length > 0;

            return (
              <div
                key={proj.projectIdentifier}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  hasErrors
                    ? 'border-rose-300 bg-rose-50/30'
                    : hasWarnings
                    ? 'border-amber-200 bg-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div
                  onClick={() =>
                    setExpandedProject(isExpanded ? null : proj.projectIdentifier)
                  }
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        hasErrors
                          ? 'bg-rose-100 text-rose-700'
                          : hasWarnings
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {hasErrors ? (
                        <XCircle className="h-4 w-4" />
                      ) : hasWarnings ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-black text-slate-900 truncate">
                          {proj.projectName}
                        </h5>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-extrabold">
                          {proj.projectIdentifier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PM: {proj.projectManager || 'Unassigned'} • {proj.allTasks.length} tasks • {proj.phases.length} phases
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {hasErrors && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                        {proj.errors.length} Error{proj.errors.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {hasWarnings && !hasErrors && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                        {proj.warnings.length} Warning{proj.warnings.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {!hasErrors && !hasWarnings && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        Valid
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 bg-white space-y-3 text-xs">
                    {/* Project Errors */}
                    {proj.errors.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                          Critical Validation Errors:
                        </div>
                        {proj.errors.map((err, errIdx) => (
                          <div
                            key={errIdx}
                            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5"
                          >
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-extrabold">
                                Row {err.rowNumber} [{err.field}]:{' '}
                              </span>
                              <span>{err.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Project Warnings */}
                    {proj.warnings.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                          Non-Blocking Warnings:
                        </div>
                        {proj.warnings.map((warn, warnIdx) => (
                          <div
                            key={warnIdx}
                            className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-extrabold">
                                Row {warn.rowNumber} [{warn.field}]:{' '}
                              </span>
                              <span>{warn.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* All Valid Info */}
                    {proj.isValid && proj.warnings.length === 0 && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>All rows for this project are structured and validated cleanly.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
