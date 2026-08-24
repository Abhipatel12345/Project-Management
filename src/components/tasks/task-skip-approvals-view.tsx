import React, { useState } from 'react';
import { TaskSkipRequest, SkipRequestStatus } from '@/types/skip-request.types';
import {
  useSkipRequests,
  useApproveSkipRequest,
  useRejectSkipRequest,
} from '@/hooks/use-skip-requests';
import { useAuth } from '@/providers/auth-context';
import { useToast } from '@/providers/toast-context';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Send,
  User,
  Calendar,
  X,
  Filter,
  RefreshCw,
  FolderKanban,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskSkipApprovalsViewProps {
  projectId?: string;
  onRefreshTasks?: () => void;
}

export function TaskSkipApprovalsView({ projectId, onRefreshTasks }: TaskSkipApprovalsViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: requests = [], isLoading, refetch } = useSkipRequests(projectId);

  const approveMutation = useApproveSkipRequest();
  const rejectMutation = useRejectSkipRequest();

  const [activeTab, setActiveTab] = useState<SkipRequestStatus | 'ALL'>('PENDING');
  const [rejectingRequest, setRejectingRequest] = useState<TaskSkipRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);

  const isPMorAdmin = user?.role === 'projectmanager' || user?.role === 'admin';

  const filteredRequests = requests.filter((r: TaskSkipRequest) => {
    if (activeTab === 'ALL') return true;
    return r.status === activeTab;
  });

  const pendingCount = requests.filter((r: TaskSkipRequest) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r: TaskSkipRequest) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r: TaskSkipRequest) => r.status === 'REJECTED').length;

  const handleApprove = async (req: TaskSkipRequest) => {
    if (!confirm(`Are you sure you want to approve skipping task "${req.task_subject}" (${req.task_id})?`)) {
      return;
    }

    try {
      setApprovingRequestId(req.id);
      await approveMutation.mutateAsync({
        projectId: req.project_id,
        requestId: req.id,
      });
      showToast(`Skip request approved. Task ${req.task_id} is now Skipped.`, 'success');
      refetch();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve skip request', 'error');
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest || !rejectionReason.trim()) return;

    try {
      await rejectMutation.mutateAsync({
        projectId: rejectingRequest.project_id,
        requestId: rejectingRequest.id,
        rejectionReason: rejectionReason.trim(),
      });
      showToast(`Skip request rejected for task ${rejectingRequest.task_id}. Task remains active.`, 'info');
      setRejectingRequest(null);
      setRejectionReason('');
      refetch();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject skip request', 'error');
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Task Skip Approval Requests</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Review team member skip requests with engineering justification.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PENDING'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'APPROVED'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Approved</span>
              {approvedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                  {approvedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'REJECTED'
                  ? 'bg-white text-rose-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Rejected</span>
              {rejectedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {rejectedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({requests.length})
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Requests"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading skip requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No {activeTab.toLowerCase()} skip requests found</p>
          <p className="text-xs text-slate-500">
            When team members request to skip a work package with justification, requests will appear here for Project Manager review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req: TaskSkipRequest) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Task & Justification Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {req.task_id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" /> {req.project_id}
                      </span>

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="h-3 w-3 text-amber-600" /> PENDING REVIEW
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> APPROVED & SKIPPED
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="h-3 w-3 text-rose-600" /> REJECTED (TASK ACTIVE)
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-900">{req.task_subject}</h4>

                    {/* Skip Reason Box */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="text-[10px] uppercase font-extrabold text-slate-500">Skip Justification:</div>
                      <p className="text-slate-800 font-medium leading-relaxed">{req.skip_reason}</p>
                      {req.additional_comment && (
                        <p className="text-[11px] text-slate-500 italic mt-1">Note: {req.additional_comment}</p>
                      )}
                    </div>

                    {/* Rejection Reason (if rejected) */}
                    {isRejected && req.rejection_reason && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                        <div className="text-[10px] uppercase font-extrabold text-rose-700">Rejection Reason:</div>
                        <p className="text-rose-900 font-medium leading-relaxed">{req.rejection_reason}</p>
                      </div>
                    )}

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        Requested By: <strong className="text-slate-800 font-bold">{req.requested_by_name || req.requested_by}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Date: <strong className="text-slate-800 font-bold">{new Date(req.requested_at).toLocaleDateString()}</strong>
                      </span>

                      {(req.reviewed_by || req.reviewed_by_name) && (
                        <>
                          <span>•</span>
                          <span>
                            Reviewed By: <strong className="text-slate-800 font-bold">{req.reviewed_by_name || req.reviewed_by}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons for PM/Admin */}
                  {isPending && isPMorAdmin && (
                    <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={approvingRequestId === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {approvingRequestId === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Approve Skip</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectionReason('');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectingRequest && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                  <XCircle className="h-5 w-5" />
                  <span>Reject Skip Request</span>
                </div>
                <button
                  onClick={() => setRejectingRequest(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600">
                Rejecting the skip request for <strong>{rejectingRequest.task_subject}</strong> ({rejectingRequest.task_id}) will keep the task active and assigned in its original status.
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Task is mandatory for Gate 3 Design Verification and cannot be bypassed..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectingRequest(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!rejectionReason.trim() || rejectMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {rejectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
