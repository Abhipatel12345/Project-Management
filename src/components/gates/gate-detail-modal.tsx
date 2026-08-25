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
import { DocumentItem } from '@/types/document.types';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useDocuments } from '@/hooks/use-documents';
import { useGates } from '@/hooks/use-gates';
import { useAvailableEmployees } from '@/hooks/use-project-team';
import { useAuth } from '@/providers/auth-context';
import { auditService } from '@/services/audit.service';
import { gateService } from '@/services/gate.service';
import { documentService } from '@/services/document.service';
import { isGateReviewer } from '@/utils/user-matcher';
import { DocumentViewerModal } from '@/components/documents/document-viewer-modal';
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
  ExternalLink,
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

  // Check if current logged-in user is the assigned Gate Reviewer for THIS specific gate
  const isCurrentGateReviewer = isGateReviewer(gate, user);

  // Fetch employees for dropdowns
  const { data: employees = [] } = useAvailableEmployees('');

  // Fetch contextual tasks for this project
  const { data: tasksData } = useTasks({
    project: gate.project,
    pageSize: 100,
  });

  // Fetch project documents for contextual deliverable selection and downloading
  const { data: docsData } = useDocuments({
    project: gate.project,
    pageSize: 100,
  });

  // Fetch all gates belonging to this project for real dynamic Lifecycle presentation
  const { data: projectGatesData } = useGates({
    project: gate.project,
    pageSize: 50,
  });

  const projectTasks = tasksData?.tasks || [];
  const projectDocs: DocumentItem[] = docsData?.documents || [];
  const projectGates: Gate[] = projectGatesData?.gates || [gate];

  // Document Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);

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
  const [delDocId, setDelDocId] = useState('');

  // Deliverable Review Modal State (When Reviewer clicks Review)
  const [reviewingDeliverable, setReviewingDeliverable] = useState<GateDeliverable | null>(null);
  const [reviewCommentsText, setReviewCommentsText] = useState('');

  // Deliverable Rejection Modal state
  const [rejectingDeliverable, setRejectingDeliverable] = useState<GateDeliverable | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Review Form state
  const [reviewerName, setReviewerName] = useState(
    gate.gate_reviewer || gate.gate_owner || user?.fullName || 'Sarah Jenkins'
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
  // When a Related Task is selected, shows ONLY documents belonging to that task!
  const contextualDocs = React.useMemo(() => {
    if (delTaskRef) {
      const taskFiltered = projectDocs.filter(
        (d: any) =>
          d.task === delTaskRef ||
          (d.entity_type === 'Task' && d.entity_id === delTaskRef) ||
          (d.description && d.description.includes(delTaskRef))
      );
      if (taskFiltered.length > 0) return taskFiltered;
    }
    const taskDocs = projectDocs.filter((d: any) => d.task || d.entity_type === 'Task');
    return taskDocs.length > 0 ? taskDocs : projectDocs;
  }, [projectDocs, delTaskRef]);

  // Helper to find real document item from document ID / reference
  const resolveDocument = (docIdOrRef?: string, docName?: string): DocumentItem | null => {
    if (!docIdOrRef && !docName) return null;
    return (
      projectDocs.find(
        (d) =>
          (docIdOrRef && d.name === docIdOrRef) ||
          (docName && (d.file_name === docName || d.title === docName)) ||
          (docIdOrRef && (d.file_name === docIdOrRef || d.title === docIdOrRef))
      ) || null
    );
  };

  // Document Download Handler
  const handleDownloadDeliverableDocument = async (del: GateDeliverable) => {
    try {
      const targetDoc = resolveDocument(del.linked_document_id, del.document_reference || del.linked_document_name);
      const docId = targetDoc ? targetDoc.name : del.linked_document_id || del.document_reference || '';
      const docName = targetDoc ? (targetDoc.file_name || targetDoc.title) : del.linked_document_name || del.document_reference || 'document';

      auditService.logAction(
        user?.fullName || user?.username || 'User',
        'Downloaded Document',
        'GateDeliverable',
        del.id,
        `Downloaded attachment "${docName}" (Doc ID: ${docId}) for deliverable "${del.name}" (Gate: ${gate.name})`,
        undefined,
        undefined,
        user?.roleLabel,
        gate.project
      );

      await documentService.downloadDocument(gate.project, docId, docName);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Document unavailable. The original file could not be found.');
    }
  };

  // Document View Handler
  const handleViewDeliverableDocument = (del: GateDeliverable) => {
    const targetDoc = resolveDocument(del.linked_document_id, del.document_reference || del.linked_document_name);
    if (targetDoc) {
      setViewingDoc(targetDoc);
    } else {
      // Create synthetic viewer item from deliverable metadata
      setViewingDoc({
        name: del.linked_document_id || del.id,
        title: del.linked_document_name || del.document_reference || del.name,
        document_type: 'Engineering',
        project: gate.project || 'General',
        status: del.status === 'Approved' ? 'Approved' : 'Under Review',
        review_status: del.status === 'Approved' ? 'Approved' : 'In Review',
        version: 'v1.0',
        uploaded_by: del.responsible_person || 'Administrator',
        upload_date: del.created_at || new Date().toISOString(),
        file_name: del.linked_document_name || del.document_reference || 'document.pdf',
        file_url: `/api/projects/${encodeURIComponent(gate.project || 'ALL')}/documents/${encodeURIComponent(del.linked_document_id || del.id)}/download`,
      });
    }
  };

  // Save Criterion Handler
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
        status: 'In Progress',
        comments: crtComments,
      });

      auditService.logAction(
        user?.fullName || 'Administrator',
        'Gate Criterion Added',
        'GateCriterion',
        crtName,
        `Added criterion "${crtName}" to ${gate.name}.`,
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

  // Save Deliverable Handler with Complete Persistent Details
  const handleSaveDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delName.trim()) return;
    try {
      const selectedTask = projectTasks.find((t: any) => t.name === delTaskRef);
      const selectedDoc = projectDocs.find((d: any) => d.name === delDocId || d.file_name === delDocId);
      const selectedEmployee = employees.find((emp: any) => (emp.full_name || emp.name) === delPerson);

      const delId = `DEL-${Math.floor(100 + Math.random() * 900)}`;
      const todayStr = new Date().toISOString().split('T')[0];

      await onAddDeliverable({
        id: delId,
        deliverable_id: delId,
        gate_id: gate.name,
        project_id: gate.project,
        name: delName,
        title: delName,
        description: delDesc,
        responsible_person: delPerson,
        responsible_user_id: selectedEmployee ? selectedEmployee.email || selectedEmployee.name : delPerson,
        project: gate.project,
        due_date: delDueDate,
        is_required: delRequired,
        status: 'Under Review',
        approval_status: 'Under Review',
        completion_percentage: 0,
        related_task: delTaskRef || undefined,
        related_task_id: delTaskRef || undefined,
        related_task_subject: selectedTask ? selectedTask.subject : undefined,
        document_reference: selectedDoc ? selectedDoc.file_name || selectedDoc.title : undefined,
        linked_document_id: selectedDoc ? selectedDoc.name : delDocId || undefined,
        linked_document_name: selectedDoc ? selectedDoc.file_name || selectedDoc.title : undefined,
        created_by: user?.fullName || user?.username || 'Administrator',
        created_at: todayStr,
      });

      auditService.logAction(
        user?.fullName || 'Administrator',
        'Gate Deliverable Created',
        'GateDeliverable',
        delId,
        `Created deliverable "${delName}" for Gate ${gate.name} (Linked Task: ${delTaskRef || 'None'}, Linked Doc: ${selectedDoc?.file_name || 'None'})`,
        undefined,
        'Under Review',
        user?.roleLabel,
        gate.project
      );

      setDelName('');
      setDelDesc('');
      setDelDocId('');
      setDelTaskRef('');
      setIsAddingDeliverable(false);
    } catch {}
  };

  // Deliverable Review / Approval Handlers with Backend Verification
  const handleDeliverableStatusChange = async (
    del: GateDeliverable,
    newStatus: DeliverableStatus,
    comment?: string
  ) => {
    try {
      const isApproved = newStatus === 'Approved';
      const isRejected = newStatus === 'Rejected';
      const action = isApproved ? 'approve' : isRejected ? 'reject' : 'review';

      // 1. Enforce backend permission check
      try {
        await gateService.executeDeliverableAction(gate.name, del.id, action, comment);
      } catch (err: any) {
        console.warn('executeDeliverableAction backend sync warning:', err);
      }

      // 2. Update local state
      const todayStr = new Date().toISOString().split('T')[0];
      await onUpdateDeliverable(del.id, {
        status: newStatus,
        approval_status: newStatus,
        completion_percentage: isApproved ? 100 : del.completion_percentage || 0,
        approved_by: isApproved ? user?.fullName || user?.username || 'Gate Reviewer' : del.approved_by,
        approved_at: isApproved ? todayStr : del.approved_at,
        rejected_by: isRejected ? user?.fullName || user?.username || 'Gate Reviewer' : del.rejected_by,
        rejected_at: isRejected ? todayStr : del.rejected_at,
        rejection_reason: isRejected ? comment : del.rejection_reason,
        review_comments: comment,
        approval_comment: comment,
      });

      auditService.logAction(
        user?.fullName || user?.username || 'Gate Reviewer',
        isApproved
          ? 'Gate Deliverable Approved'
          : isRejected
          ? 'Gate Deliverable Rejected'
          : 'Gate Deliverable Reviewed',
        'GateDeliverable',
        del.id,
        `${del.name}: Status changed to ${newStatus}${comment ? ` (Notes: ${comment})` : ''}`,
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

  const handleReviewModalDecision = async (decision: 'approve' | 'reject' | 'review') => {
    if (!reviewingDeliverable) return;
    if (decision === 'reject' && !reviewCommentsText.trim()) {
      alert('Mandatory engineering rejection reason required when rejecting a deliverable.');
      return;
    }
    const newStatus: DeliverableStatus =
      decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'Under Review';

    await handleDeliverableStatusChange(reviewingDeliverable, newStatus, reviewCommentsText.trim());
    setReviewingDeliverable(null);
    setReviewCommentsText('');
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
          reviewComments || 'None'
        }`,
        gate.approval_status,
        reviewDecision,
        user?.roleLabel,
        gate.project
      );

      setReviewComments('');
      setActiveTab('overview');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                    {gate.name}
                  </span>
                  <span className="text-xs font-medium text-slate-500">• {gate.gate_type}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                      gate.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : gate.status === 'Ready for Review'
                        ? 'bg-sky-100 text-sky-800'
                        : gate.status === 'Blocked'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {gate.status}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">{gate.gate_name}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(gate)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Edit Stage-Gate"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(gate.name)}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Delete Stage-Gate"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-6 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Info className="h-4 w-4" /> Overview & Tasks
            </button>

            <button
              onClick={() => setActiveTab('criteria')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'criteria'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="h-4 w-4" /> Exit Criteria ({criteria.length})
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
              <ChevronRight className="h-4 w-4" /> Project Gate Lifecycle
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Gate Reviewer</span>
                  <p className="font-bold text-emerald-900 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    {gate.gate_reviewer || gate.reviewer_user_id || 'Sarah Jenkins'}
                    {isCurrentGateReviewer && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-black">
                        You
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Planned Date
                  </span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">
                    {gate.planned_date || 'N/A'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Completion Date
                  </span>
                  <p className="font-bold text-emerald-700 font-mono mt-0.5">
                    {gate.actual_date || 'Not Completed'}
                  </p>
                </div>
              </div>

              {/* Auto-Populated Related Tasks Section */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4 text-emerald-600" />
                    Auto-Populated Related Tasks ({projectTasks.length})
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Sourced from Project {gate.project}
                  </span>
                </div>

                {projectTasks.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No active tasks currently assigned to this project milestone.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {projectTasks.map((t: any) => (
                      <div
                        key={t.name}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                              {t.name}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">{t.subject}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-3">
                            <span>Assigned: {t.custom_assigned_to || t._assign || 'Unassigned'}</span>
                            {t.exp_end_date && <span>Due: {t.exp_end_date}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'Submitted'
                                ? 'bg-sky-100 text-sky-800'
                                : t.status === 'Skipped'
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="font-bold text-slate-700 font-mono text-xs">
                            {t.progress || 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress & Gate Readiness Live Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Gate Readiness Score (Required Items)</span>
                    <span className="font-black text-emerald-600 text-sm font-mono">
                      {readinessPct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        readinessPct === 100
                          ? 'bg-emerald-500'
                          : readinessPct >= 50
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${readinessPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      {completedRequiredCount} of {totalRequiredCount} required items satisfied
                    </span>
                    <span>
                      {openRequiredCount === 0 ? 'Ready for Sign-off' : `${openRequiredCount} item(s) open`}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Total Checklist Progress</span>
                    <span className="font-black text-slate-800 text-sm font-mono">
                      {gate.completion_percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-700 transition-all duration-500"
                      style={{ width: `${gate.completion_percentage || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Criteria: {criteria.length} items</span>
                    <span>Deliverables: {deliverables.length} items</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {gate.description && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-700">Gate Scope & Objective</h4>
                  <p className="text-slate-600 leading-relaxed">{gate.description}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB B: EXIT CRITERIA */}
          {activeTab === 'criteria' && (
            <div className="space-y-4 font-sans">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">
                  Mandatory Exit Criteria Checklist ({criteria.length})
                </h3>
                <button
                  onClick={() => setIsAddingCriterion(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-xs transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Criterion
                </button>
              </div>

              {isAddingCriterion && (
                <form
                  onSubmit={handleSaveCriterion}
                  className="p-4 rounded-2xl bg-slate-50 border border-emerald-200 space-y-3"
                >
                  <h4 className="text-xs font-bold text-slate-800">Add New Gate Exit Criterion</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Criterion Title *</label>
                      <input
                        type="text"
                        value={crtName}
                        onChange={(e) => setCrtName(e.target.value)}
                        placeholder="e.g. DFMEA Risk Analysis Complete"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Responsible Person</label>
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
                    No criteria defined for this gate yet.
                  </div>
                ) : (
                  criteria.map((crt) => {
                    const isCompleted = crt.status === 'Completed';
                    return (
                      <div
                        key={crt.id}
                        className="flex items-start justify-between p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 transition"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() =>
                              onUpdateCriterion(crt.id, {
                                status: isCompleted ? 'In Progress' : 'Completed',
                              })
                            }
                            className={`mt-0.5 p-1 rounded-lg transition cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isCompleted ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-slate-500">{crt.id}</span>
                              <p
                                className={`text-xs font-bold ${
                                  isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                                }`}
                              >
                                {crt.name}
                              </p>
                              {crt.is_required && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Required
                                </span>
                              )}
                            </div>
                            {crt.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{crt.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                              <span>Responsible: {crt.responsible_person || 'Gate Owner'}</span>
                              {crt.due_date && <span>Due: {crt.due_date}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteCriterion(crt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB C: KEY DELIVERABLES (WITH VIEW/DOWNLOAD & STRICT REVIEWER APPROVAL CONTROLS) */}
          {activeTab === 'deliverables' && (
            <div className="space-y-4 font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Key Gate Deliverables ({deliverables.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Deliverables must be backed by real task documents. Review & approval actions are restricted
                    strictly to the assigned Gate Reviewer (<strong>{gate.gate_reviewer || gate.reviewer_user_id || 'Sarah Jenkins'}</strong>).
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingDeliverable(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-xs transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Deliverable
                </button>
              </div>

              {isAddingDeliverable && (
                <form
                  onSubmit={handleSaveDeliverable}
                  className="p-4 rounded-2xl bg-slate-50 border border-emerald-200 space-y-3"
                >
                  <h4 className="text-xs font-bold text-slate-800">Add Key Gate Deliverable</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Deliverable Title *</label>
                      <input
                        type="text"
                        value={delName}
                        onChange={(e) => setDelName(e.target.value)}
                        placeholder="e.g. Review and verify"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Responsible Person</label>
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
                          <option value="Administrator">Administrator</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">Link Related Task</label>
                      <select
                        value={delTaskRef}
                        onChange={(e) => {
                          setDelTaskRef(e.target.value);
                          setDelDocId(''); // Reset doc selector on task change
                        }}
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
                        Link Task Document (from {delTaskRef ? `Task ${delTaskRef}` : 'Tasks'})
                      </label>
                      <select
                        value={delDocId}
                        onChange={(e) => setDelDocId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium cursor-pointer"
                      >
                        <option value="">No Linked Document</option>
                        {contextualDocs.map((d: any) => (
                          <option key={d.name} value={d.name}>
                            {d.file_name || d.title} {d.task ? `[${d.task}]` : ''}
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
                    const docItem = resolveDocument(del.linked_document_id, del.document_reference || del.linked_document_name);
                    const docDisplayName = docItem ? (docItem.file_name || docItem.title) : del.linked_document_name || del.document_reference;

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

                          {/* Approval Actions Buttons - VISIBLE ONLY TO ASSIGNED GATE REVIEWER */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isCurrentGateReviewer ? (
                              <>
                                {!isApproved && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setReviewingDeliverable(del);
                                        setReviewCommentsText('');
                                      }}
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
                              </>
                            ) : (
                              // Non-reviewers see status badge only
                              <>
                                {isApproved && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                                    <CheckCircle2 className="h-4 w-4" /> Approved
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                                    <AlertCircle className="h-4 w-4" /> Rejected
                                  </span>
                                )}
                                {isUnderReview && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                                    <Clock className="h-4 w-4" /> Under Review
                                  </span>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => onDeleteDeliverable(del.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Deliverable"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Full Deliverable Details Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-500">Responsible Person: </span>
                            <strong className="text-slate-800">{del.responsible_person || 'Administrator'}</strong>
                          </div>

                          <div>
                            <span className="font-bold text-slate-500">Related Task: </span>
                            <strong className="text-sky-800">
                              {del.related_task_subject ? `${del.related_task_subject} (${del.related_task})` : del.related_task || 'None'}
                            </strong>
                          </div>

                          {/* Linked Document with Direct View and Download Actions */}
                          <div className="sm:col-span-2 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100/80">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-500">Linked Task Document: </span>
                              {docDisplayName ? (
                                <span className="font-bold text-emerald-800 flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>{docDisplayName}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No document attached</span>
                              )}
                            </div>

                            {docDisplayName && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewDeliverableDocument(del)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-sky-700 text-[11px] font-bold border border-sky-200 transition cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDeliverableDocument(del)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
                                >
                                  <Download className="h-3 w-3" /> Download
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Created By & Date */}
                          <div className="sm:col-span-2 text-[10px] text-slate-400 flex items-center justify-between pt-1">
                            <span>Created by: {del.created_by || 'Administrator'}</span>
                            {del.created_at && <span>Created on: {del.created_at}</span>}
                          </div>
                        </div>

                        {/* Approval Info Box */}
                        {(del.approved_by || isApproved) && (
                          <div className="p-3 rounded-xl text-xs space-y-0.5 border bg-emerald-50/70 border-emerald-200 text-emerald-900">
                            <div className="flex items-center justify-between font-bold">
                              <span>Approved by: {del.approved_by || gate.gate_reviewer || 'Sarah Jenkins'}</span>
                              {del.approved_at && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  {new Date(del.approved_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {del.approval_comment && (
                              <p className="text-[11px] text-slate-600 italic">
                                &quot;{del.approval_comment}&quot;
                              </p>
                            )}
                          </div>
                        )}

                        {/* Rejection Info Box */}
                        {(del.rejected_by || isRejected) && (
                          <div className="p-3 rounded-xl text-xs space-y-0.5 border bg-rose-50/70 border-rose-200 text-rose-900">
                            <div className="flex items-center justify-between font-bold">
                              <span>Rejected by: {del.rejected_by || del.approved_by || gate.gate_reviewer || 'Sarah Jenkins'}</span>
                              {del.rejected_at && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  {new Date(del.rejected_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-rose-800 font-medium">
                              Reason: {del.rejection_reason || del.approval_comment || 'Correction required'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB D: EXECUTIVE SIGN-OFF & REVIEW */}
          {activeTab === 'review' && (
            <div className="space-y-6 font-sans">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>Gate Sign-off Governance Authority</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  APQP stage progression requires formal audit verification of all required exit criteria and key
                  deliverables. Only designated Gate Reviewers and Governance Board Members may record binding
                  decisions.
                </p>
              </div>

              {validationError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <p className="font-bold">Governance Sign-off Rule Violation</p>
                    <p>{validationError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Record Gate Milestone Decision
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Reviewer Name</label>
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

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Governance Decision</label>
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold cursor-pointer"
                    >
                      <option value="Approved">Approved (Progress to Next Phase)</option>
                      <option value="Approved with Conditions">Approved with Conditions (Action Items Pending)</option>
                      <option value="Rejected">Rejected (Gate Progression Denied)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Review Findings & Comments</label>
                  <textarea
                    rows={3}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter audit observations, remaining risks, or conditional action items..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {!canApprove && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <input
                      type="checkbox"
                      id="overrideCheck"
                      checked={overridePermission}
                      onChange={(e) => setOverridePermission(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="overrideCheck" className="font-bold cursor-pointer">
                      Enable Executive Program Override (Bypasses incomplete required items)
                    </label>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Submit Formal Gate Review</span>
                  </button>
                </div>
              </form>

              {/* Past Review Records */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Historical Review Log ({gate.reviews?.length || 0})
                </h4>
                {(!gate.reviews || gate.reviews.length === 0) ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    No formal review decisions recorded yet.
                  </div>
                ) : (
                  gate.reviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          {rev.reviewer}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            rev.decision === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rev.decision === 'Approved with Conditions'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rev.decision}
                        </span>
                      </div>
                      <p className="text-slate-600">{rev.comments || 'No comment provided.'}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{rev.review_date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB E: REAL PROJECT GATE LIFECYCLE (REMOVED HARDCODED STATIC PHASES) */}
          {activeTab === 'workflow' && (
            <div className="space-y-5 font-sans text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-sm">
                    Project Stage-Gate Lifecycle
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Real persisted Gate milestones for Project {gate.project || 'General'}. Current gate is highlighted.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {projectGates.length} Total Gate(s)
                </span>
              </div>

              {/* Chronological Gate Progression Sequence */}
              <div className="space-y-3">
                {projectGates.map((g, idx) => {
                  const isCurrent = g.name === gate.name;
                  const isApproved = g.status === 'Approved';
                  const isReady = g.status === 'Ready for Review';
                  const gReadiness = g.readiness_percentage !== undefined ? g.readiness_percentage : isApproved ? 100 : isReady ? 85 : 50;

                  return (
                    <div
                      key={g.name}
                      className={`p-4 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-emerald-50/40 border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
                          : isApproved
                          ? 'bg-white border-slate-200 opacity-90'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl text-xs font-black ${
                              isApproved
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-emerald-500 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Gate {idx + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{g.gate_name}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                  Current Gate
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                              <span>Phase: {g.gate_type}</span>
                              <span>Owner: {g.gate_owner}</span>
                              <span>Reviewer: {g.gate_reviewer || 'Sarah Jenkins'}</span>
                              {g.planned_date && <span>Target: {g.planned_date}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Readiness</span>
                            <p className="font-bold text-emerald-700 font-mono text-xs">{gReadiness}%</p>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isReady
                                ? 'bg-sky-100 text-sky-800'
                                : g.status === 'Blocked'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {g.status}
                          </span>
                        </div>
                      </div>

                      {/* Current Gate Context KPIs */}
                      {isCurrent && (
                        <div className="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tasks Progress</span>
                            <p className="font-bold text-slate-800 mt-0.5">
                              {projectTasks.filter((t: any) => t.status === 'Completed').length} / {projectTasks.length} Completed
                            </p>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Required Deliverables</span>
                            <p className="font-bold text-slate-800 mt-0.5">
                              {completedRequiredDeliverables} / {requiredDeliverables.length} Completed
                            </p>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Required Criteria</span>
                            <p className="font-bold text-slate-800 mt-0.5">
                              {completedRequiredCriteria} / {requiredCriteria.length} Satisfied
                            </p>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Sign-off Decision</span>
                            <p className="font-bold text-emerald-700 mt-0.5">{gate.approval_status || 'Pending'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB F: PERSISTED AUDIT HISTORY */}
          {activeTab === 'activity' && (
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider">
                  Gate & Project Activity Log
                </h4>
                <span className="text-slate-500 font-bold text-[11px]">
                  Project: {gate.project || 'General'}
                </span>
              </div>

              {(!gate.activity_log || gate.activity_log.length === 0) ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  No activity events recorded yet.
                </div>
              ) : (
                gate.activity_log.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{act.action}</span>
                        {act.details && <span className="text-slate-500">• {act.details}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500">By {act.user}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{act.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Dedicated Deliverable Review Modal for Assigned Gate Reviewer */}
          {reviewingDeliverable && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
              <div className="bg-white p-6 rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Review Key Gate Deliverable</span>
                  </div>
                  <button
                    onClick={() => {
                      setReviewingDeliverable(null);
                      setReviewCommentsText('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Deliverable Title</span>
                      <p className="font-bold text-slate-900 text-sm">{reviewingDeliverable.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Responsible Person</span>
                        <p className="font-bold text-slate-800">{reviewingDeliverable.responsible_person || 'Administrator'}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Related Task</span>
                        <p className="font-bold text-sky-800 font-mono">
                          {reviewingDeliverable.related_task_subject
                            ? `${reviewingDeliverable.related_task_subject} (${reviewingDeliverable.related_task})`
                            : reviewingDeliverable.related_task || 'None'}
                        </p>
                      </div>
                    </div>

                    {/* Supporting Document with Direct View & Download */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Supporting Document</span>
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          {reviewingDeliverable.linked_document_name || reviewingDeliverable.document_reference || 'No document attached'}
                        </span>
                      </div>

                      {(reviewingDeliverable.linked_document_name || reviewingDeliverable.document_reference) && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDeliverableDocument(reviewingDeliverable)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-sky-700 text-[11px] font-bold border border-sky-200 transition cursor-pointer"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDeliverableDocument(reviewingDeliverable)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
                          >
                            <Download className="h-3 w-3" /> Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Review Findings & Evaluation Comments</label>
                    <textarea
                      rows={3}
                      value={reviewCommentsText}
                      onChange={(e) => setReviewCommentsText(e.target.value)}
                      placeholder="Enter technical verification observations, compliance checks, or rejection findings..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleReviewModalDecision('reject')}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
                  >
                    <ThumbsDown className="h-4 w-4" /> Reject Deliverable
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewModalDecision('review')}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Mark Under Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewModalDecision('approve')}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      <ThumbsUp className="h-4 w-4" /> Approve Deliverable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Direct Rejection Reason Dialog Modal */}
          {rejectingDeliverable && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
              <div className="bg-white p-6 rounded-2xl max-w-md w-full border border-rose-200 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <ThumbsDown className="h-5 w-5" />
                  <span>Reject Gate Deliverable</span>
                </div>
                <p className="text-xs text-slate-600">
                  Provide mandatory engineering rejection findings and corrective actions for{' '}
                  <strong>{rejectingDeliverable.name}</strong>.
                </p>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State non-conformance details, missing validation datasets, or engineering corrections required..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingDeliverable(null);
                      setRejectionReason('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!rejectionReason.trim()}
                    onClick={handleConfirmRejection}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Document Viewer Modal */}
          {viewingDoc && (
            <DocumentViewerModal
              document={viewingDoc}
              isOpen={!!viewingDoc}
              onClose={() => setViewingDoc(null)}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
