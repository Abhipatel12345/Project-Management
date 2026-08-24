'use client';

import React, { useState } from 'react';
import {
  DesignReview,
  ReviewFinding,
  FindingSeverity,
  FindingStatus,
  DesignReviewStatus,
  DesignReviewApprovalStatus,
} from '@/types/design-review.types';
import { useAuth } from '@/providers/auth-context';
import { auditService } from '@/services/audit.service';
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
  FileText,
  Download,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Paperclip,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DesignReviewDetailModalProps {
  review: DesignReview;
  onClose: () => void;
  onEdit: (review: DesignReview) => void;
  onDelete: (reviewName: string) => void;
  onAddFinding: (finding: Partial<ReviewFinding>) => Promise<void>;
  onUpdateFindingStatus?: (findingId: string, status: FindingStatus) => Promise<void>;
  onUpdateReviewStatus?: (
    reviewName: string,
    status: DesignReviewStatus,
    approvalStatus: DesignReviewApprovalStatus,
    approvedBy?: string,
    comment?: string
  ) => Promise<void>;
}

export function DesignReviewDetailModal({
  review,
  onClose,
  onEdit,
  onDelete,
  onAddFinding,
  onUpdateFindingStatus,
  onUpdateReviewStatus,
}: DesignReviewDetailModalProps) {
  const { user, hasPermission } = useAuth();
  const canApproveDesign = hasPermission('approveDesign');

  const [isAddingFinding, setIsAddingFinding] = useState(false);
  const [findingDesc, setFindingDesc] = useState('');
  const [findingSeverity, setFindingSeverity] = useState<FindingSeverity>('Medium');
  const [findingAssignee, setFindingAssignee] = useState('Administrator');
  const [findingDueDate, setFindingDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [isSavingFinding, setIsSavingFinding] = useState(false);

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState('');

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
    } catch {} finally {
      setIsSavingFinding(false);
    }
  };

  const handleApprove = async () => {
    if (onUpdateReviewStatus) {
      await onUpdateReviewStatus(
        review.name,
        'Completed',
        'Approved',
        user?.fullName || 'Administrator',
        'Technical design criteria and CAD boundary conditions approved.'
      );
    }
    auditService.logAction(
      user?.fullName || 'Administrator',
      'Design Review Approved',
      'DesignReview',
      review.name,
      `Approved ${review.title} (${review.review_type}) with sign-off completed.`,
      review.approval_status,
      'Approved',
      user?.roleLabel,
      review.project
    );
  };

  const handleRejectConfirm = async () => {
    if (!rejectionComment.trim()) return;
    if (onUpdateReviewStatus) {
      await onUpdateReviewStatus(
        review.name,
        'In Progress',
        'Rejected',
        user?.fullName || 'Administrator',
        rejectionComment.trim()
      );
    }
    auditService.logAction(
      user?.fullName || 'Administrator',
      'Design Review Rejected',
      'DesignReview',
      review.name,
      `Rejected ${review.title}. Rejection reason: "${rejectionComment.trim()}"`,
      review.approval_status,
      'Rejected',
      user?.roleLabel,
      review.project
    );
    setIsRejectModalOpen(false);
    setRejectionComment('');
  };

  const handleReadyForReview = async () => {
    if (onUpdateReviewStatus) {
      await onUpdateReviewStatus(
        review.name,
        'In Progress',
        'Under Review',
        user?.fullName || 'Administrator'
      );
    }
  };

  const getSeverityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            Low
          </span>
        );
    }
  };

  const isApproved = review.approval_status === 'Approved';
  const isRejected = review.approval_status === 'Rejected';
  const isUnderReview = review.approval_status === 'Under Review';

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
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                    {review.review_type}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-800'
                        : isRejected
                        ? 'bg-rose-100 text-rose-800'
                        : isUnderReview
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {review.approval_status}
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900">{review.title}</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Governance Approval Workflow Action Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Engineering Governance Status
              </span>
              <div className="flex items-center gap-2 font-bold text-xs">
                <span className="text-slate-700">Review Execution: {review.status}</span>
                <span className="text-slate-300">|</span>
                <span className="text-indigo-700">Decision: {review.approval_status}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isUnderReview && !isApproved && (
                <button
                  onClick={handleReadyForReview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" /> Submit for Review
                </button>
              )}

              {!isApproved && (
                <>
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> Approve Design
                  </button>

                  <button
                    onClick={() => {
                      setIsRejectModalOpen(true);
                      setRejectionComment('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> Reject
                  </button>
                </>
              )}

              {isApproved && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Approved Sign-off Complete
                </span>
              )}
            </div>
          </div>

          {/* Approval details note */}
          {(review.approved_by || isApproved || isRejected) && (
            <div
              className={`p-3.5 rounded-2xl text-xs space-y-1 border ${
                isApproved
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>
                  {isApproved ? 'Approved by:' : 'Rejected by:'}{' '}
                  {review.approved_by || 'Administrator'}
                </span>
                {review.approved_at && (
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(review.approved_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {review.approval_comment && (
                <p className="text-[11px] font-medium italic mt-0.5">
                  &ldquo;{review.approval_comment}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Project</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                {review.project || 'General'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Review Lead</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {review.reviewer}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Review Date</span>
              <p className="font-bold text-slate-800 font-mono mt-0.5">
                {review.review_date || 'Unscheduled'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Execution Status</span>
              <p className="font-bold text-indigo-700 mt-0.5">{review.status}</p>
            </div>
          </div>

          {/* Associated Documents & Attachments Section */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-indigo-600" />
              Attached Design Documents & Specifications ({review.documents?.length || 0})
            </h3>

            {!review.documents || review.documents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                No CAD models or specifications attached to this review.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {review.documents.map((doc) => (
                  <div
                    key={doc.id || doc.name}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate">
                          {doc.file_name || doc.name}
                        </span>
                        {doc.uploaded_at && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={
                        doc.file_url ||
                        `/api/projects/${encodeURIComponent(
                          review.project || 'GLOBAL'
                        )}/documents/${encodeURIComponent(doc.id || doc.name)}/download`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1 transition shrink-0"
                    >
                      <Download className="h-3 w-3" /> View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Description & Technical Notes */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Technical Agenda & Scope
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {review.description || 'No detailed scope agenda provided.'}
            </p>
          </div>

          {/* Findings & Action Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-purple-600" />
                Findings & Action Items ({review.findings?.length || 0})
              </h3>

              {!isAddingFinding && (
                <button
                  onClick={() => setIsAddingFinding(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold text-xs transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Action Item
                </button>
              )}
            </div>

            {isAddingFinding && (
              <form
                onSubmit={handleCreateFinding}
                className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3 text-xs"
              >
                <h4 className="font-bold text-purple-900">Log New Design Action Item</h4>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Finding Description
                  </label>
                  <textarea
                    rows={2}
                    value={findingDesc}
                    onChange={(e) => setFindingDesc(e.target.value)}
                    placeholder="Specify design modification, tolerance stackup check, or CFD verification needed..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Severity</label>
                    <select
                      value={findingSeverity}
                      onChange={(e) => setFindingSeverity(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Assigned To
                    </label>
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
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
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
                        <span className="font-mono text-[10px] font-bold text-purple-700">
                          {f.id}
                        </span>
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
                      {f.comments && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Note: {f.comments}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">
                          Assigned
                        </span>
                        <span className="font-bold text-slate-700">{f.assigned_to}</span>
                      </div>

                      {f.due_date && (
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-slate-400">
                            Due
                          </span>
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

        {/* Rejection Reason Modal */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Reject Design Review</h3>
                  <p className="text-xs text-slate-500">{review.title}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Technical Reason for Rejection / Engineering Deficiencies
                </label>
                <textarea
                  rows={4}
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
                  placeholder="Explain why this design review cannot be approved (e.g., thermal boundary limits exceeded, missing FEA stress analysis)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={!rejectionComment.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
