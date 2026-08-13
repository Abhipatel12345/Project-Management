import React, { useState } from 'react';
import { ProjectBaseline } from '@/types/baseline.types';
import { Task } from '@/types/task.types';
import {
  X,
  Plus,
  BookmarkPlus,
  CheckCircle2,
  Archive,
  Trash2,
  Eye,
  SlidersHorizontal,
  Clock,
  User,
  Layers,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BaselineManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  baselines: ProjectBaseline[];
  activeBaseline: ProjectBaseline | null;
  selectedBaselineId?: string;
  projectName?: string;
  onOpenCreateDialog: () => void;
  onActivateBaseline: (baselineId: string) => Promise<void>;
  onArchiveBaseline: (baselineId: string) => Promise<void>;
  onDeleteBaseline: (baselineId: string) => Promise<void>;
  onSelectCompareBaseline: (baselineId: string) => void;
}

export function BaselineManagementModal({
  isOpen,
  onClose,
  baselines,
  activeBaseline,
  selectedBaselineId,
  projectName,
  onOpenCreateDialog,
  onActivateBaseline,
  onArchiveBaseline,
  onDeleteBaseline,
  onSelectCompareBaseline,
}: BaselineManagementModalProps) {
  const [expandedBaselineId, setExpandedBaselineId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActivate = async (id: string) => {
    try {
      setActionLoadingId(id);
      await onActivateBaseline(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      setActionLoadingId(id);
      await onArchiveBaseline(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete baseline "${name}"? Historical snapshots will be permanently removed.`)) return;
    try {
      setActionLoadingId(id);
      await onDeleteBaseline(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompareClick = (id: string) => {
    onSelectCompareBaseline(id);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5 shrink-0 pr-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
                <BookmarkPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Project Baselines & Schedule History
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Project: <strong className="text-slate-900 font-bold">{projectName || 'Automotive PDM'}</strong> • Multiple Baseline Version Control
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCreateDialog}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Create Baseline</span>
            </button>
          </div>

          {/* Main Baselines Content List */}
          <div className="overflow-y-auto space-y-4 pr-1 flex-1">
            {baselines.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <BookmarkPlus className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">No baselines created for this project yet.</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Create a baseline to freeze your project schedule dates (Baseline 1, Baseline 2, Baseline 3...) and track plan vs actual schedule variance.
                  </p>
                </div>
                <button
                  onClick={onOpenCreateDialog}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Create Baseline 1
                </button>
              </div>
            ) : (
              baselines.map((b) => {
                const isActive = b.status === 'Active';
                const isSelectedForCompare = selectedBaselineId === b.baseline_id;
                const isExpanded = expandedBaselineId === b.baseline_id;

                return (
                  <div
                    key={b.baseline_id}
                    className={`rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-sky-50/40 border-sky-200 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left Baseline Summary Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
                            Baseline #{b.baseline_number}
                          </span>
                          <h3 className="text-sm font-black text-slate-900">{b.baseline_name}</h3>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> ACTIVE
                            </span>
                          )}
                          {b.status === 'Archived' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              ARCHIVED
                            </span>
                          )}
                        </div>

                        {b.description && (
                          <p className="text-xs text-slate-600 font-medium line-clamp-1">{b.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            Created: <strong className="text-slate-800 font-bold">{b.snapshot_date || b.created_at.split('T')[0]}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            By: <strong className="text-slate-800 font-bold">{b.created_by}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-slate-400" />
                            Captured: <strong className="text-slate-800 font-bold">{b.task_count} Tasks</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                        <button
                          onClick={() => handleCompareClick(b.baseline_id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            isSelectedForCompare
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                          }`}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          <span>{isSelectedForCompare ? 'Comparing' : 'Compare'}</span>
                        </button>

                        {!isActive && (
                          <button
                            onClick={() => handleActivate(b.baseline_id)}
                            disabled={actionLoadingId === b.baseline_id}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}

                        {isActive ? (
                          <button
                            onClick={() => handleArchive(b.baseline_id)}
                            disabled={actionLoadingId === b.baseline_id}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                          >
                            Archive
                          </button>
                        ) : null}

                        <button
                          onClick={() => setExpandedBaselineId(isExpanded ? null : b.baseline_id)}
                          className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs transition cursor-pointer"
                          title="View Snapshot Tasks"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => handleDelete(b.baseline_id, b.baseline_name)}
                          disabled={actionLoadingId === b.baseline_id}
                          className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs transition cursor-pointer"
                          title="Delete Baseline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Task Snapshot Drawer */}
                    {isExpanded && (
                      <div className="border-t border-slate-200/80 p-4 bg-slate-50/60 rounded-b-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Frozen Task Schedule Snapshot ({b.tasks.length} Tasks)
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            Snapshot ID: {b.baseline_id}
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                                <th className="py-2 px-3">Task ID & Subject</th>
                                <th className="py-2 px-3">Planned Start</th>
                                <th className="py-2 px-3">Planned End</th>
                                <th className="py-2 px-3 text-center">Duration</th>
                                <th className="py-2 px-3">Priority</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {b.tasks.map((bt) => (
                                <tr key={bt.task_id} className="hover:bg-slate-50">
                                  <td className="py-2 px-3">
                                    <div className="font-bold text-slate-900 line-clamp-1">{bt.task_subject}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{bt.task_id}</div>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[11px]">{bt.planned_start_date}</td>
                                  <td className="py-2 px-3 font-mono text-[11px]">{bt.planned_end_date}</td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-700">{bt.duration}d</td>
                                  <td className="py-2 px-3 text-[11px]">{bt.priority || 'Medium'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span>Historical baseline records are preserved for audit & schedule variance tracking.</span>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
