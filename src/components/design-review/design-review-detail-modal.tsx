import React, { useState } from 'react';
import {
  DesignReview,
  ReviewFinding,
  FindingSeverity,
  FindingStatus,
} from '@/types/design-review.types';
import {
  X,
  ClipboardList,
  FolderKanban,
  User,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  Plus,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DesignReviewDetailModalProps {
  review: DesignReview;
  onClose: () => void;
  onEdit: (review: DesignReview) => void;
  onDelete: (reviewName: string) => void;
  onAddFinding: (finding: Partial<ReviewFinding>) => Promise<void>;
  onUpdateFindingStatus?: (findingId: string, status: FindingStatus) => Promise<void>;
}

export function DesignReviewDetailModal({
  review,
  onClose,
  onEdit,
  onDelete,
  onAddFinding,
  onUpdateFindingStatus,
}: DesignReviewDetailModalProps) {
  const [isAddingFinding, setIsAddingFinding] = useState(false);
  const [findingDesc, setFindingDesc] = useState('');
  const [findingSeverity, setFindingSeverity] = useState<FindingSeverity>('Medium');
  const [findingAssignee, setFindingAssignee] = useState('Administrator');
  const [findingDueDate, setFindingDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [isSavingFinding, setIsSavingFinding] = useState(false);

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingDesc.trim()) return;
    setIsSavingFinding(true);
    try {
      await onAddFinding({
        description: findingDesc,
        severity: findingSeverity,
        assigned_to: findingAssignee,
        due_date: findingDueDate,
        status: 'Open',
      });
      setFindingDesc('');
      setIsAddingFinding(false);
    } catch {
      // error handling
    } finally {
      setIsSavingFinding(false);
    }
  };

  const getSeverityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Low</span>;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8 space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700">{review.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[10px] font-bold">
                    {review.review_type}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">{review.title}</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Project</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                {review.project || 'General'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Owner / Lead</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {review.reviewer}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              <p className="font-bold text-indigo-700 mt-0.5">{review.status}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Approval Status</span>
              <p className="font-bold text-emerald-700 mt-0.5">{review.approval_status}</p>
            </div>
          </div>

          {/* Description */}
          {review.description && (
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-slate-700 uppercase text-[10px]">Technical Scope & Objectives</h3>
              <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                {review.description}
              </p>
            </div>
          )}

          {/* Review Findings / Action Items Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-purple-600" />
                <h3 className="font-black text-slate-900 text-sm">Review Findings & Action Items</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                  {review.findings?.length || 0}
                </span>
              </div>

              {!isAddingFinding && (
                <button
                  onClick={() => setIsAddingFinding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Finding</span>
                </button>
              )}
            </div>

            {/* Inline Add Finding Form */}
            {isAddingFinding && (
              <form onSubmit={handleCreateFinding} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3 text-xs">
                <h4 className="font-bold text-purple-900">New Finding / Action Item</h4>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">Finding Description</label>
                  <input
                    type="text"
                    value={findingDesc}
                    onChange={(e) => setFindingDesc(e.target.value)}
                    placeholder="e.g. Seal gasket clearance insufficient at -30C thermal cycle."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Severity</label>
                    <select
                      value={findingSeverity}
                      onChange={(e) => setFindingSeverity(e.target.value as FindingSeverity)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Assigned To</label>
                    <input
                      type="text"
                      value={findingAssignee}
                      onChange={(e) => setFindingAssignee(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={findingDueDate}
                      onChange={(e) => setFindingDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingFinding(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingFinding}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 shadow-xs"
                  >
                    {isSavingFinding ? 'Saving...' : 'Save Finding'}
                  </button>
                </div>
              </form>
            )}

            {/* Findings List */}
            <div className="space-y-2">
              {!review.findings || review.findings.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No action items or findings logged for this review yet.
                </div>
              ) : (
                review.findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-purple-700">{f.id}</span>
                        {getSeverityBadge(f.severity)}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.status === 'Resolved' || f.status === 'Closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{f.description}</p>
                      {f.comments && <p className="text-[11px] text-slate-500 font-medium">Note: {f.comments}</p>}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Assigned</span>
                        <span className="font-bold text-slate-700">{f.assigned_to}</span>
                      </div>

                      {f.due_date && (
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-slate-400">Due</span>
                          <span className="font-mono text-slate-700">{f.due_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => onDelete(review.name)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Review</span>
            </button>

            <button
              onClick={() => onEdit(review)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit Review Details</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
