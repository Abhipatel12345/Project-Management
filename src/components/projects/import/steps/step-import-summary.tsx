'use client';

import React from 'react';
import { BulkImportResult } from '@/types/excel-import.types';
import { excelImportService } from '@/services/excel-import.service';
import {
  CheckCircle2,
  FolderKanban,
  Download,
  ExternalLink,
  RotateCcw,
  Layers,
  ListTodo,
  Award,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface StepImportSummaryProps {
  result: BulkImportResult;
  onViewProjects: () => void;
  onImportAnother: () => void;
}

export function StepImportSummary({
  result,
  onViewProjects,
  onImportAnother,
}: StepImportSummaryProps) {
  const handleDownloadReport = () => {
    excelImportService.exportImportResultCSV(result);
  };

  const hasFailures = result.projectsFailed > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-sky-500/10 border border-emerald-200 text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-600 text-white shadow-xs">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">
            Bulk Project Import Completed!
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto leading-relaxed">
            Import Operation ID <span className="font-mono font-bold text-slate-800">{result.importId}</span> has executed. Audit logs have been registered in the system governance store.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onViewProjects}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FolderKanban className="h-4 w-4" />
            <span>View Projects Directory</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Download Import Report (CSV)</span>
          </button>

          <button
            type="button"
            onClick={onImportAnother}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Import Another File</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Projects Created
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {result.projectsCreated}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {result.projectsUpdated > 0 ? `+ ${result.projectsUpdated} updated` : 'New projects'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Phases Initialized
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {result.phasesCreated}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Phase List DocTypes
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Tasks Created
          </div>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {result.tasksCreated}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            With user assignments
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Deliverables
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {result.deliverablesCreated}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            APQP Gate deliverables
          </div>
        </div>
      </div>

      {/* Record-Level Results Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-sky-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Project Execution Details ({result.items.length})
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            File: {result.fileName}
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Project Name & Code</th>
                <th className="py-2.5 px-3 text-center">Phases</th>
                <th className="py-2.5 px-3 text-center">Tasks</th>
                <th className="py-2.5 px-3 text-center">Deliverables</th>
                <th className="py-2.5 px-3 text-right">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-3 text-center text-[10px] font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">
                      {item.projectName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.projectIdentifier} {item.createdProjectName && item.createdProjectName !== item.projectIdentifier ? `→ ${item.createdProjectName}` : ''}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-indigo-700">
                    {item.phasesCreated}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-sky-700">
                    {item.tasksCreated}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-amber-700">
                    {item.deliverablesCreated}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {(item.status === 'Created' || item.success) && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        Success
                      </span>
                    )}
                    {item.status === 'Updated' && !item.success && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                        Updated
                      </span>
                    )}
                    {item.status === 'Skipped' && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          Skipped
                        </span>
                        {item.errorReason && (
                          <span className="text-[10px] text-slate-500 max-w-xs text-right truncate" title={item.errorReason}>
                            {item.errorReason}
                          </span>
                        )}
                      </div>
                    )}
                    {item.status === 'Failed' && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                          Failed
                        </span>
                        <div className="text-[11px] text-rose-600 font-medium text-right max-w-xs break-words leading-tight">
                          <span className="font-bold">Reason:</span> {item.errorReason || item.error || 'Project creation failed'}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
