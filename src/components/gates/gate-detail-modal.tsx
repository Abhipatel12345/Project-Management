import React, { useState } from 'react';
import { Gate, GateDeliverable, GateApprovalStatus } from '@/types/gate.types';
import {
  X,
  Lock,
  FolderKanban,
  User,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldCheck,
  FileCheck,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GateDetailModalProps {
  gate: Gate;
  onClose: () => void;
  onEdit: (gate: Gate) => void;
  onDelete: (gateName: string) => void;
  onAddDeliverable: (deliverable: Partial<GateDeliverable>) => Promise<void>;
  onUpdateGateStatus: (status: string, approvalStatus: GateApprovalStatus) => Promise<void>;
}

export function GateDetailModal({
  gate,
  onClose,
  onEdit,
  onDelete,
  onAddDeliverable,
  onUpdateGateStatus,
}: GateDetailModalProps) {
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [delName, setDelName] = useState('');
  const [delDesc, setDelDesc] = useState('');
  const [delPerson, setDelPerson] = useState(gate.gate_owner || 'Administrator');
  const [delDueDate, setDelDueDate] = useState(gate.planned_date || new Date().toISOString().split('T')[0]);
  const [delRequired, setDelRequired] = useState(true);
  const [isSavingDeliverable, setIsSavingDeliverable] = useState(false);
  const [overridePermission, setOverridePermission] = useState(false);

  const deliverables = gate.deliverables || [];
  const requiredDeliverables = deliverables.filter((d) => d.is_required);
  const completedRequired = requiredDeliverables.filter(
    (d) => d.status === 'Completed' || (d.completion_percentage || 0) >= 100
  ).length;
  const openDeliverables = deliverables.filter(
    (d) => d.status !== 'Completed' && (d.completion_percentage || 0) < 100
  ).length;

  const readinessPct =
    requiredDeliverables.length > 0
      ? Math.round((completedRequired / requiredDeliverables.length) * 100)
      : 100;

  const canApprove = readinessPct >= 100 || overridePermission;

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delName.trim()) return;
    setIsSavingDeliverable(true);
    try {
      await onAddDeliverable({
        name: delName,
        description: delDesc,
        responsible_person: delPerson,
        due_date: delDueDate,
        is_required: delRequired,
        status: 'Pending',
        completion_percentage: 0,
      });
      setDelName('');
      setDelDesc('');
      setIsAddingDeliverable(false);
    } catch {
      // error
    } finally {
      setIsSavingDeliverable(false);
    }
  };

  const handleApproveGate = async () => {
    if (!canApprove) {
      alert('Cannot approve stage-gate: Required deliverables are incomplete. Check the permission override to bypass.');
      return;
    }
    await onUpdateGateStatus('Approved', 'Approved');
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
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700">{gate.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    {gate.gate_type}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">{gate.gate_name}</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Gate Readiness Dashboard Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-black text-sm text-white">APQP Gate Readiness Assessment</h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black font-mono ${
                  readinessPct >= 100
                    ? 'bg-emerald-500 text-white'
                    : readinessPct >= 60
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {readinessPct}% Readiness Score
              </span>
            </div>

            {/* Readiness Progress Bar */}
            <div className="space-y-1">
              <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(readinessPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Required Deliverables</span>
                <p className="font-mono font-black text-sm text-white">{requiredDeliverables.length}</p>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Completed Required</span>
                <p className="font-mono font-black text-sm text-emerald-400">{completedRequired}</p>
              </div>

              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase">Open Deliverables</span>
                <p className="font-mono font-black text-sm text-amber-400">{openDeliverables}</p>
              </div>

              <div>
                <span className="text-[10px] text-sky-400 font-bold uppercase">Overall Completion</span>
                <p className="font-mono font-black text-sm text-sky-400">{gate.completion_percentage || 0}%</p>
              </div>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Project</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                {gate.project || 'General'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Gate Owner</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {gate.gate_owner}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Execution Status</span>
              <p className="font-bold text-emerald-700 mt-0.5">{gate.status}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sign-off Decision</span>
              <p className="font-bold text-sky-700 mt-0.5">{gate.approval_status}</p>
            </div>
          </div>

          {/* Gate Deliverables Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm">Gate Deliverables & Sign-off Checklist</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  {deliverables.length} Items
                </span>
              </div>

              {!isAddingDeliverable && (
                <button
                  onClick={() => setIsAddingDeliverable(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Deliverable</span>
                </button>
              )}
            </div>

            {/* Inline Add Deliverable Form */}
            {isAddingDeliverable && (
              <form onSubmit={handleCreateDeliverable} className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3 text-xs">
                <h4 className="font-bold text-emerald-900">New Stage-Gate Deliverable</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Deliverable Name</label>
                    <input
                      type="text"
                      value={delName}
                      onChange={(e) => setDelName(e.target.value)}
                      placeholder="e.g. System DFMEA & Control Plan"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Responsible Person</label>
                    <input
                      type="text"
                      value={delPerson}
                      onChange={(e) => setDelPerson(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={delDueDate}
                      onChange={(e) => setDelDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="isReq"
                      checked={delRequired}
                      onChange={(e) => setDelRequired(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="isReq" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Required for Gate Sign-off
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingDeliverable(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDeliverable}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-xs"
                  >
                    {isSavingDeliverable ? 'Saving...' : 'Add Deliverable'}
                  </button>
                </div>
              </form>
            )}

            {/* Deliverables List */}
            <div className="space-y-2">
              {deliverables.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No deliverables specified for this stage-gate yet.
                </div>
              ) : (
                deliverables.map((del) => (
                  <div
                    key={del.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-emerald-700">{del.id}</span>
                        {del.is_required ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Required
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            Optional
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            del.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {del.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{del.name}</p>
                      {del.description && <p className="text-[11px] text-slate-500">{del.description}</p>}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Responsible</span>
                        <span className="font-bold text-slate-700">{del.responsible_person || 'N/A'}</span>
                      </div>

                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Progress</span>
                        <span className="font-mono font-bold text-emerald-700">{del.completion_percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sign-off & Governance Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Executive Stage-Gate Approval Controls
            </h4>

            {readinessPct < 100 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="space-y-0.5 text-[11px]">
                  <p className="font-bold">Required deliverables incomplete ({completedRequired}/{requiredDeliverables.length} complete)</p>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 mt-1">
                    <input
                      type="checkbox"
                      checked={overridePermission}
                      onChange={(e) => setOverridePermission(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    Enable Executive Manager Permission Override to approve
                  </label>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={() => onUpdateGateStatus('Rejected', 'Rejected')}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold border border-rose-200 transition cursor-pointer"
              >
                Reject Stage-Gate
              </button>

              <button
                onClick={handleApproveGate}
                disabled={!canApprove}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Approve Stage-Gate Sign-off
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => onDelete(gate.name)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Stage-Gate</span>
            </button>

            <button
              onClick={() => onEdit(gate)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit Gate Details</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
