'use client';

import React from 'react';
import {
  X,
  FileEdit,
  FileSpreadsheet,
  ArrowRight,
  FolderPlus,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface ProjectCreationChoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectImport: () => void;
}

export function ProjectCreationChoiceDialog({
  isOpen,
  onClose,
  onSelectManual,
  onSelectImport,
}: ProjectCreationChoiceDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-600 text-white shadow-xs">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Create New Project
              </h3>
              <p className="text-xs text-slate-500">
                Select your preferred project creation method
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Choice Options Body */}
        <div className="p-6 space-y-4">
          {/* Option A: Manual Creation */}
          <div
            onClick={onSelectManual}
            className="group relative p-5 rounded-2xl border-2 border-slate-200 hover:border-sky-500 bg-white hover:bg-sky-50/20 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex items-start gap-4"
          >
            <div className="p-3.5 rounded-2xl bg-slate-100 group-hover:bg-sky-600 group-hover:text-white text-slate-700 transition-all shrink-0">
              <FileEdit className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition">
                  Create Project Manually
                </h4>
                <span className="p-1 rounded-full bg-slate-100 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-700 transition">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Initialize a single project charter manually with custom product group, milestones, budget costing, and team setup.
              </p>
            </div>
          </div>

          {/* Option B: Import from Excel */}
          <div
            onClick={onSelectImport}
            className="group relative p-5 rounded-2xl border-2 border-sky-300 hover:border-sky-600 bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 hover:bg-sky-50/50 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex items-start gap-4"
          >
            <div className="p-3.5 rounded-2xl bg-sky-600 text-white shadow-xs group-hover:scale-105 transition-all shrink-0">
              <FileSpreadsheet className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition">
                    Import Project(s) from Excel
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold uppercase tracking-wide">
                    Multi-Project
                  </span>
                </div>
                <span className="p-1 rounded-full bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Upload a spreadsheet to bulk-create <strong>1, 5, 20, or 100+ projects</strong> in one operation with phases, milestones, tasks, deliverables, and assignments.
              </p>

              <div className="flex items-center gap-2 mt-2.5 text-[11px] font-bold text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Inteva APQP template support & ERP column auto-mapping</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>No blank project required prior to Excel import</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
