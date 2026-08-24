'use client';

import React, { useState } from 'react';
import {
  Gate,
  GateCriterion,
  GateDeliverable,
  GateApprovalStatus,
  CriterionStatus,
  DeliverableStatus,
} from '@/types/gate.types';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useDocuments } from '@/hooks/use-documents';
import { useAvailableEmployees } from '@/hooks/use-project-team';
import { useAuth } from '@/providers/auth-context';
import { auditService } from '@/services/audit.service';
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
  Layers,
  Activity,
  FileText,
  ChevronRight,
  Info,
  RotateCcw,
  Check,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GateDetailModalProps {
  gate: Gate;
  onClose: () => void;
  onEdit: (gate: Gate) => void;
  onDelete: (gateName: string) => void;
  onAddCriterion: (criterion: Partial<GateCriterion>) => Promise<void>;
  onUpdateCriterion: (criterionId: string, data: Partial<GateCriterion>) => Promise<void>;
  onDeleteCriterion: (criterionId: string) => Promise<void>;
  onAddDeliverable: (deliverable: Partial<GateDeliverable>) => Promise<void>;
  onUpdateDeliverable: (deliverableId: string, data: Partial<GateDeliverable>) => Promise<void>;
  onDeleteDeliverable: (deliverableId: string) => Promise<void>;
  onAddGateReview: (review: {
    reviewer: string;
    decision: 'Approved' | 'Approved with Conditions' | 'Rejected';
    comments?: string;
  }) => Promise<void>;
}

export function GateDetailModal({
  gate,
  onClose,
  onEdit,
  onDelete,
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
  onAddDeliverable,
  onUpdateDeliverable,
  onDeleteDeliverable,
  onAddGateReview,
}: GateDetailModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'criteria' | 'deliverables' | 'review' | 'workflow' | 'activity'
  >('overview');

  // Related Task & Document options
  const { data: tasksData } = useTasks({ project: gate.project, pageSize: 50 });
  const { data: docsData } = useDocuments({ project: gate.project, pageSize: 100 });
  const { data: employees = [] } = useAvailableEmployees('');

  const projectTasks = tasksData?.tasks || [];
  const projectDocs = docsData?.documents || [];

  // Criterion Form state
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [crtName, setCrtName] = useState('');
  const [crtDesc, setCrtDesc] = useState('');
  const [crtPerson, setCrtPerson] = useState(
    gate.gate_owner || (employees[0] ? employees[0].full_name || employees[0].name : 'Sarah Jenkins')
  );
  const [crtDueDate, setCrtDueDate] = useState(
    gate.planned_date || new Date().toISOString().split('T')[0]
  );
  const [crtRequired, setCrtRequired] = useState(true);
  const [crtComments, setCrtComments] = useState('');

  // Deliverable Form state
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [delName, setDelName] = useState('');
  const [delDesc, setDelDesc] = useState('');
  const [delPerson, setDelPerson] = useState(
    gate.gate_owner || (employees[0] ? employees[0].full_name || employees[0].name : 'Sarah Jenkins')
  );
  const [delDueDate, setDelDueDate] = useState(
    gate.planned_date || new Date().toISOString().split('T')[0]
  );
  const [delRequired, setDelRequired] = useState(true);
  const [delTaskRef, setDelTaskRef] = useState('');
  const [delDocRef, setDelDocRef] = useState('');

  // Deliverable Rejection Modal state
  const [rejectingDeliverable, setRejectingDeliverable] = useState<GateDeliverable | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Review Form state
  const [reviewerName, setReviewerName] = useState(
    gate.gate_owner || user?.fullName || 'Administrator'
  );
  const [reviewDecision, setReviewDecision] = useState<
    'Approved' | 'Approved with Conditions' | 'Rejected'
  >('Approved');
  const [reviewComments, setReviewComments] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [overridePermission, setOverridePermission] = useState(false);

  // Calculations
  const criteria = gate.criteria || [];
  const deliverables = gate.deliverables || [];
  const requiredCriteria = criteria.filter((c) => c.is_required && c.status !== 'Not Applicable');
  const requiredDeliverables = deliverables.filter((d) => d.is_required);

  const completedRequiredCriteria = requiredCriteria.filter((c) => c.status === 'Completed').length;
  const completedRequiredDeliverables = requiredDeliverables.filter(
    (d) => d.status === 'Approved' || d.status === 'Completed' || (d.completion_percentage || 0) >= 100
  ).length;

  const totalRequiredCount = requiredCriteria.length + requiredDeliverables.length;
  const completedRequiredCount = completedRequiredCriteria + completedRequiredDeliverables;
  const openRequiredCount = totalRequiredCount - completedRequiredCount;

  // Real, dynamic Gate Readiness score (no mock percentage)
  const readinessPct =
    totalRequiredCount > 0
      ? Math.round((completedRequiredCount / totalRequiredCount) * 100)
      : criteria.length > 0 || deliverables.length > 0
      ? 100
      : 0;

  const canApprove = readinessPct >= 100 || overridePermission;

  // Contextual Document Filtering for Gate Deliverables (Task documents)
  const contextualDocs = React.useMemo(() => {
    if (delTaskRef) {
      // Filter strictly by the chosen related task
      const taskFiltered = projectDocs.filter(
        (d: any) =>
          d.task === delTaskRef ||
          (d.entity_type === 'Task' && d.entity_id === delTaskRef) ||
          (d.description && d.description.includes(delTaskRef))
      );
      if (taskFiltered.length > 0) return taskFiltered;
    }
    // Fallback: Documents tagged with any task or entity_type = Task, or all project documents
    const taskDocs = projectDocs.filter((d: any) => d.task || d.entity_type === 'Task');
    return taskDocs.length > 0 ? taskDocs : projectDocs;
  }, [projectDocs, delTaskRef]);

  // Handlers
  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crtName.trim()) return;
    try {
      await onAddCriterion({
        name: crtName,
        description: crtDesc,
        responsible_person: crtPerson,
        due_date: crtDueDate,
        is_required: crtRequired,
        status: 'Pending',
        comments: crtComments,
      });

      auditService.logAction(
        user?.fullName || 'Administrator',
        'Gate Criteria Added',
        'GateCriterion',
        crtName,
        `Added criterion "${crtName}" (Responsible: ${crtPerson}) to ${gate.name}.`,
        undefined,
        undefined,
        user?.roleLabel,
        gate.project
      );

      setCrtName('');
      setCrtDesc('');
      setCrtComments('');
      setIsAddingCriterion(false);
    } catch {}
  };

  const handleSaveDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delName.trim()) return;
    try {
      await onAddDeliverable({
        name: delName,
        description: delDesc,
        responsible_person: delPerson,
        project: gate.project,
        due_date: delDueDate,
        is_required: delRequired,
        status: 'Not Started',
        approval_status: 'Not Started',
        completion_percentage: 0,
        related_task: delTaskRef || undefined,
        document_reference: delDocRef || undefined,
      });

      auditService.logAction(
        user?.fullName || 'Administrator',
        'Gate Deliverable Added',
        'GateDeliverable',
        delName,
        `Added deliverable "${delName}" (Linked Doc: ${delDocRef || 'None'}) to ${gate.name}.`,
        undefined,
        undefined,
        user?.roleLabel,
        gate.project
      );

      setDelName('');
      setDelDesc('');
      setDelDocRef('');
      setDelTaskRef('');
      setIsAddingDeliverable(false);
    } catch {}
  };

  // Deliverable Review / Approval Handlers
  const handleDeliverableStatusChange = async (
    del: GateDeliverable,
    newStatus: DeliverableStatus,
    comment?: string
  ) => {
    try {
      const isApproved = newStatus === 'Approved';
      const isRejected = newStatus === 'Rejected';

      await onUpdateDeliverable(del.id, {
        status: newStatus,
        approval_status: newStatus,
        completion_percentage: isApproved ? 100 : del.completion_percentage || 0,
        approved_by: isApproved || isRejected ? user?.fullName || 'Administrator' : undefined,
        approved_at: isApproved || isRejected ? new Date().toISOString() : undefined,
        approval_comment: comment,
      });

      auditService.logAction(
        user?.fullName || 'Administrator',
        isApproved
          ? 'Gate Deliverable Approved'
          : isRejected
          ? 'Gate Deliverable Rejected'
          : 'Gate Deliverable Status Changed',
        'GateDeliverable',
        del.id,
        `${del.name}: Status changed to ${newStatus}${comment ? ` (Reason: ${comment})` : ''}`,
        del.status,
        newStatus,
        user?.roleLabel,
        gate.project
      );
    } catch (err) {
      console.error('Failed to update deliverable status:', err);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectingDeliverable || !rejectionReason.trim()) return;
    await handleDeliverableStatusChange(rejectingDeliverable, 'Rejected', rejectionReason.trim());
    setRejectingDeliverable(null);
    setRejectionReason('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (reviewDecision === 'Approved' && readinessPct < 100 && !overridePermission) {
      setValidationError(
        `Approval Blocked: ${openRequiredCount} required item(s) are incomplete. Complete all required criteria and deliverables before sign-off, or enable Executive Override.`
      );
      return;
    }

    setIsSubmittingReview(true);
    try {
      await onAddGateReview({
        reviewer: reviewerName,
        decision: reviewDecision,
        comments: reviewComments,
      });

      auditService.logAction(
        reviewerName,
        'Gate Governance Sign-off Completed',
        'Gate',
        gate.name,
        `Executive governance review decision: ${reviewDecision}. Notes: ${
          reviewComments || 'Approved'
        }`,
        gate.approval_status,
        reviewDecision,
        user?.roleLabel,
        gate.project
      );

      setReviewComments('');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to record review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8 space-y-6 max-h-[92vh] overflow-y-auto"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {gate.name}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                  {gate.gate_type}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                    gate.approval_status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : gate.approval_status === 'Rejected'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  Governance: {gate.approval_status}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900">{gate.gate_name}</h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Real Gate Readiness Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Live Gate Readiness Score
              </span>
              <div className="flex items-center gap-3 font-bold">
                <span className="text-slate-600">
                  {completedRequiredCount} / {totalRequiredCount} Required Items Done
                </span>
                {openRequiredCount > 0 ? (
                  <span className="text-amber-700 font-extrabold">
                    ({openRequiredCount} Required Open)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-extrabold">(All Requirements Met)</span>
                )}
                <span className="text-base font-black text-emerald-700">{readinessPct}%</span>
              </div>
            </div>

            <div className="h-2.5 w-full bg-emerald-200/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(readinessPct, 100)}%` }}
              />
            </div>
          </div>

          {/* 6 Modal Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <FileText className="h-4 w-4" /> Overview & Tasks ({projectTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('criteria')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'criteria'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="h-4 w-4" /> Criteria Checklist ({criteria.length})
            </button>

            <button
              onClick={() => setActiveTab('deliverables')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'deliverables'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Layers className="h-4 w-4" /> Key Deliverables ({deliverables.length})
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'review'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Executive Sign-off ({gate.reviews?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'workflow'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <ChevronRight className="h-4 w-4" /> Lifecycle
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Activity className="h-4 w-4" /> Audit History
            </button>
          </div>

          {/* TAB A: OVERVIEW & AUTO-POPULATED RELATED TASKS */}
          {activeTab === 'overview' && (
            <div className="space-y-5 text-xs font-sans">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Project ID</span>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Planned Target Date
                  </span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">
                    {gate.planned_date || 'N/A'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Actual Completion Date
                  </span>
                  <p className="font-bold text-emerald-700 font-mono mt-0.5">
                    {gate.actual_date || 'Not Yet Completed'}
                  </p>
                </div>
              </div>

              {/* Auto-Populated Related Tasks Section */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-sky-600" />
                    Auto-Populated Related Tasks ({projectTasks.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Live tasks driving gate readiness
                  </span>
                </div>

                {projectTasks.length === 0 ? (
                  <p className="text-slate-400 italic py-2">
                    No work package tasks logged for this project yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {projectTasks.slice(0, 6).map((t: any) => (
                      <div
                        key={t.name}
                        className="p-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                              {t.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : t.status === 'Submitted'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : t.status === 'Working'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : t.status === 'Skipped'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800">{t.subject}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24 text-right">
                            <div className="text-[10px] font-bold text-sky-700">
                              {t.progress || 0}% Complete
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-sky-600 rounded-full"
                                style={{ width: `${Math.min(t.progress || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {t.assigned_employee_name || t.assigned_to || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {gate.description && (
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-700 uppercase text-[10px]">
                    Exit Criteria Scope & Description
                  </h3>
                  <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                    {gate.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB B: GATE CRITERIA */}
          {activeTab === 'criteria' && (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-emerald-600" /> Checklist Criteria (
                  {criteria.length})
                </h3>

                {!isAddingCriterion && (
                  <button
                    onClick={() => setIsAddingCriterion(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Criterion
                  </button>
                )}
              </div>

              {isAddingCriterion && (
                <form
                  onSubmit={handleSaveCriterion}
                  className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3"
                >
                  <h4 className="font-bold text-emerald-900">Add New Gate Criterion</h4>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Criterion Name
                    </label>
                    <input
                      type="text"
                      value={crtName}
                      onChange={(e) => setCrtName(e.target.value)}
                      placeholder="e.g. System DFMEA Sign-off & Risk Mitigation"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Responsible Person
                      </label>
                      <select
                        value={crtPerson}
                        onChange={(e) => setCrtPerson(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer"
                      >
                        {employees.length > 0 ? (
                          employees.map((emp: any) => (
                            <option key={emp.name || emp.email} value={emp.full_name || emp.name}>
                              {emp.full_name || emp.name} ({emp.designation || 'Team Lead'})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Sarah Jenkins">Sarah Jenkins (Project Manager)</option>
                            <option value="Yash">Yash (Team Member)</option>
                            <option value="Administrator">Administrator (PMO)</option>
                            <option value="Quality Manager">Quality Manager</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Due Date</label>
                      <input
                        type="date"
                        value={crtDueDate}
                        onChange={(e) => setCrtDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs cursor-pointer font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="crtReq"
                      checked={crtRequired}
                      onChange={(e) => setCrtRequired(e.target.checked)}
                      className="rounded text-emerald-600 cursor-pointer"
                    />
                    <label
                      htmlFor="crtReq"
                      className="text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      Required for Gate Sign-off
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCriterion(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer shadow-xs"
                    >
                      Save Criterion
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {criteria.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    No criteria defined for this stage-gate yet.
                  </div>
                ) : (
                  criteria.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-emerald-700">
                            {c.id}
                          </span>
                          {c.is_required ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Required
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Optional
                            </span>
                          )}
                          <select
                            value={c.status}
                            onChange={(e) =>
                              onUpdateCriterion(c.id, {
                                status: e.target.value as CriterionStatus,
                              })
                            }
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 cursor-pointer"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Not Applicable">Not Applicable</option>
                          </select>
                        </div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        {c.comments && (
                          <p className="text-[11px] text-slate-500 font-medium">{c.comments}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                          {c.responsible_person}
                        </span>
                        <button
                          onClick={() => onDeleteCriterion(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB C: KEY GATE DELIVERABLES WITH CONTEXTUAL TASK DOCS & APPROVAL */}
          {activeTab === 'deliverables' && (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-600" /> Key Gate Deliverables (KGD) (
                  {deliverables.length})
                </h3>

                {!isAddingDeliverable && (
                  <button
                    onClick={() => setIsAddingDeliverable(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Deliverable
                  </button>
                )}
              </div>

              {isAddingDeliverable && (
                <form
                  onSubmit={handleSaveDeliverable}
                  className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3"
                >
                  <h4 className="font-bold text-emerald-900">Add Stage-Gate Deliverable</h4>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Deliverable Name
                    </label>
                    <input
                      type="text"
                      value={delName}
                      onChange={(e) => setDelName(e.target.value)}
                      placeholder="e.g. PPAP Level 3 Quality Submission & Dimensional CMM Report"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Responsible Person
                      </label>
                      <select
                        value={delPerson}
                        onChange={(e) => setDelPerson(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer"
                      >
                        {employees.length > 0 ? (
                          employees.map((emp: any) => (
                            <option key={emp.name || emp.email} value={emp.full_name || emp.name}>
                              {emp.full_name || emp.name}
                            </option>
                          ))
                        ) : (
                          <option value="Sarah Jenkins">Sarah Jenkins</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Link Related Task
                      </label>
                      <select
                        value={delTaskRef}
                        onChange={(e) => setDelTaskRef(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium cursor-pointer"
                      >
                        <option value="">No Related Task</option>
                        {projectTasks.map((t: any) => (
                          <option key={t.name} value={t.name}>
                            {t.subject} ({t.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Link Task Document
                      </label>
                      <select
                        value={delDocRef}
                        onChange={(e) => setDelDocRef(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium cursor-pointer"
                      >
                        <option value="">No Linked Document</option>
                        {contextualDocs.map((d: any) => (
                          <option key={d.name} value={d.file_name || d.title}>
                            {d.file_name || d.title} {d.task ? `[Task: ${d.task}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDeliverable(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer shadow-xs"
                    >
                      Save Deliverable
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {deliverables.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    No deliverables logged for this gate yet.
                  </div>
                ) : (
                  deliverables.map((del) => {
                    const isApproved = del.status === 'Approved';
                    const isRejected = del.status === 'Rejected';
                    const isUnderReview = del.status === 'Under Review';

                    return (
                      <div
                        key={del.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {del.id}
                              </span>
                              {del.is_required && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Required
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  isApproved
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isRejected
                                    ? 'bg-rose-100 text-rose-800'
                                    : isUnderReview
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                Status: {del.status}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 text-xs">{del.name}</p>
                          </div>

                          {/* Approval Actions Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {!isApproved && (
                              <>
                                <button
                                  onClick={() =>
                                    handleDeliverableStatusChange(del, 'Under Review')
                                  }
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Review
                                </button>

                                <button
                                  onClick={() => handleDeliverableStatusChange(del, 'Approved')}
                                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" /> Approve
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectingDeliverable(del);
                                    setRejectionReason('');
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" /> Reject
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="h-4 w-4" /> Approved
                              </span>
                            )}

                            <button
                              onClick={() => onDeleteDeliverable(del.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          {del.responsible_person && (
                            <span className="font-medium">
                              Responsible:{' '}
                              <strong className="text-slate-700">{del.responsible_person}</strong>
                            </span>
                          )}
                          {del.related_task && (
                            <span className="font-medium">
                              Task Ref:{' '}
                              <strong className="text-sky-700 font-mono">
                                {del.related_task}
                              </strong>
                            </span>
                          )}
                          {del.document_reference && (
                            <span className="font-medium flex items-center gap-1 text-emerald-700 font-mono">
                              <FileText className="h-3 w-3" /> {del.document_reference}
                            </span>
                          )}
                        </div>

                        {/* Approval Info Box */}
                        {(del.approved_by || isApproved || isRejected) && (
                          <div
                            className={`p-3 rounded-xl text-xs space-y-0.5 border ${
                              isApproved
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/70 border-rose-200 text-rose-900'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>
                                {isApproved ? 'Approved by:' : 'Rejected by:'}{' '}
                                {del.approved_by || 'Sarah Jenkins'}
                              </span>
                              {del.approved_at && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  {new Date(del.approved_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {del.approval_comment && (
                              <p className="text-[11px] font-medium italic mt-1">
                                &ldquo;{del.approval_comment}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB D: EXECUTIVE REVIEW */}
          {activeTab === 'review' && (
            <div className="space-y-4 text-xs font-sans">
              <form
                onSubmit={handleSubmitReview}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Executive Stage-Gate Review
                  Form
                </h3>

                {validationError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Reviewer Name
                    </label>
                    <select
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer"
                    >
                      {employees.map((emp: any) => (
                        <option key={emp.name || emp.email} value={emp.full_name || emp.name}>
                          {emp.full_name || emp.name} ({emp.designation || 'Reviewer'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Review Decision
                    </label>
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Approved with Conditions">Approved with Conditions</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Executive Review Comments & Sign-off Notes
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter official sign-off notes, conditions, or rejection reasons..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                  />
                </div>

                {readinessPct < 100 && (
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={overridePermission}
                      onChange={(e) => setOverridePermission(e.target.checked)}
                      className="rounded text-emerald-600 cursor-pointer"
                    />
                    <span>
                      Executive Manager Permission Override (Bypass incomplete criteria block)
                    </span>
                  </label>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    Submit Gate Review
                  </button>
                </div>
              </form>

              {/* Review History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">Review Sign-off History</h4>
                {!gate.reviews || gate.reviews.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    No review history recorded yet.
                  </div>
                ) : (
                  gate.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{rev.reviewer}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {rev.review_date}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-emerald-700">
                        Decision: {rev.decision}
                      </p>
                      {rev.comments && (
                        <p className="text-[11px] text-slate-600">{rev.comments}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB E: WORKFLOW STATUS */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 text-xs font-sans">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900">APQP Gate Progression Lifecycle</h3>

                {/* Workflow Stepper Bar */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                  {['Not Started', 'In Progress', 'Ready for Review', 'Approved'].map((st, idx) => {
                    const isCurrent = gate.status === st;
                    const isDone =
                      (st === 'Not Started' && gate.status !== 'Not Started') ||
                      (st === 'In Progress' &&
                        (gate.status === 'Ready for Review' || gate.status === 'Approved')) ||
                      (st === 'Ready for Review' && gate.status === 'Approved');

                    return (
                      <React.Fragment key={st}>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isCurrent
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                : isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <span
                            className={`text-[11px] font-bold ${
                              isCurrent ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {st}
                          </span>
                        </div>

                        {idx < 3 && (
                          <div
                            className={`h-1 flex-1 rounded-full ${
                              isDone ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB F: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-2 text-xs font-sans">
              <h3 className="font-bold text-slate-900">Gate Audit Trail & Activity Log</h3>
              {!gate.activity_log || gate.activity_log.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No activity logged yet.
                </div>
              ) : (
                gate.activity_log.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{act.action}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{act.user}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{act.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => onDelete(gate.name)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> Delete Gate
            </button>

            <button
              onClick={() => onEdit(gate)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Edit2 className="h-4 w-4" /> Edit Gate Details
            </button>
          </div>
        </motion.div>

        {/* Deliverable Rejection Reason Dialog */}
        {rejectingDeliverable && (
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
                  <h3 className="text-sm font-black text-slate-900">Reject Gate Deliverable</h3>
                  <p className="text-xs text-slate-500">{rejectingDeliverable.name}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mandatory Rejection Reason / Engineering Findings
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify why this deliverable is rejected (e.g. Missing dimensional validation, failed thermal cycling test)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingDeliverable(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  disabled={!rejectionReason.trim()}
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
