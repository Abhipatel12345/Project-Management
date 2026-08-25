'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import {
  useGates,
  useUpdateGate,
  useDeleteGate,
  useAddGateCriterion,
  useUpdateGateCriterion,
  useDeleteGateCriterion,
  useAddGateDeliverable,
  useUpdateGateDeliverable,
  useDeleteGateDeliverable,
  useAddGateReview,
} from '@/hooks/use-gates';
import { useProjects } from '@/hooks/use-projects';
import { useDocuments } from '@/hooks/use-documents';
import { Gate, GateDeliverable, GateCriterion } from '@/types/gate.types';
import { DocumentItem } from '@/types/document.types';
import { isGateReviewer } from '@/utils/user-matcher';
import { GateDetailModal } from '@/components/gates/gate-detail-modal';
import { GateFormDialog } from '@/components/gates/gate-form-dialog';
import { DocumentViewerModal } from '@/components/documents/document-viewer-modal';
import { documentService } from '@/services/document.service';
import { auditService, AuditLogEntry } from '@/services/audit.service';
import { useToast } from '@/providers/toast-context';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  FileText,
  Eye,
  Download,
  ArrowRight,
  RefreshCw,
  Layers,
  CheckSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Calendar,
  Filter,
  User,
  ChevronRight,
  Sparkles,
  Inbox,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GateReviewerDashboardProps {
  assignedGates?: Gate[];
}

export function GateReviewerDashboard({ assignedGates: propsAssignedGates }: GateReviewerDashboardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const { data: gatesData, isLoading: isGatesLoading, refetch: refetchGates } = useGates({ pageSize: 100 });
  const { data: projectsData } = useProjects({ pageSize: 100 });
  const { data: docsData } = useDocuments({ pageSize: 100 });

  const updateGateMutation = useUpdateGate();
  const deleteGateMutation = useDeleteGate();
  const addCriterionMutation = useAddGateCriterion();
  const updateCriterionMutation = useUpdateGateCriterion();
  const deleteCriterionMutation = useDeleteGateCriterion();
  const addDeliverableMutation = useAddGateDeliverable();
  const updateDeliverableMutation = useUpdateGateDeliverable();
  const deleteDeliverableMutation = useDeleteGateDeliverable();
  const addGateReviewMutation = useAddGateReview();

  // Modals state
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'ready' | 'completed'>('all');

  const allGates: Gate[] = gatesData?.gates || [];
  const allProjects = projectsData?.projects || [];
  const allDocs: DocumentItem[] = docsData?.documents || [];

  // Strictly filter gates where current logged-in user is the assigned Gate Reviewer
  const myAssignedGates = useMemo(() => {
    if (propsAssignedGates && propsAssignedGates.length > 0) {
      return propsAssignedGates;
    }
    if (!user) return [];
    return allGates.filter((g) => isGateReviewer(g, user));
  }, [allGates, propsAssignedGates, user]);

  // Aggregate pending deliverables across assigned gates
  const pendingDeliverables = useMemo(() => {
    const list: { gate: Gate; deliverable: GateDeliverable }[] = [];
    myAssignedGates.forEach((gate) => {
      (gate.deliverables || []).forEach((del) => {
        if (del.status !== 'Approved') {
          list.push({ gate, deliverable: del });
        }
      });
    });
    return list;
  }, [myAssignedGates]);

  // Aggregate all deliverables across assigned gates
  const allAssignedDeliverables = useMemo(() => {
    const list: { gate: Gate; deliverable: GateDeliverable }[] = [];
    myAssignedGates.forEach((gate) => {
      (gate.deliverables || []).forEach((del) => {
        list.push({ gate, deliverable: del });
      });
    });
    return list;
  }, [myAssignedGates]);

  // Metrics Calculations
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalAssigned = myAssignedGates.length;

    let pendingReviewsCount = 0;
    let awaitingApprovalCount = 0;
    let readyForReviewCount = 0;
    let overdueCount = 0;
    let approvedDeliverablesCount = 0;
    let rejectedDeliverablesCount = 0;

    myAssignedGates.forEach((g) => {
      const isReady = (g.readiness_percentage || 0) >= 100 || g.status === 'Ready for Review';
      if (isReady && g.status !== 'Approved') readyForReviewCount++;

      if (g.planned_date && g.planned_date < today && g.status !== 'Approved') {
        overdueCount++;
      }

      (g.deliverables || []).forEach((d) => {
        if (d.status === 'Approved') {
          approvedDeliverablesCount++;
        } else if (d.status === 'Rejected') {
          rejectedDeliverablesCount++;
        } else {
          pendingReviewsCount++;
          if (d.is_required) awaitingApprovalCount++;
        }
      });
    });

    return {
      totalAssigned,
      pendingReviewsCount,
      awaitingApprovalCount,
      readyForReviewCount,
      overdueCount,
      approvedDeliverablesCount,
      rejectedDeliverablesCount,
      completedReviewsCount: approvedDeliverablesCount + rejectedDeliverablesCount,
    };
  }, [myAssignedGates]);

  // Priority Attention Items
  const attentionItems = useMemo(() => {
    const items: {
      type: 'overdue' | 'ready' | 'pending' | 'rejected';
      gate: Gate;
      deliverable?: GateDeliverable;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeColor: string;
    }[] = [];

    const today = new Date().toISOString().split('T')[0];

    myAssignedGates.forEach((g) => {
      // 1. Ready for formal sign-off
      if ((g.readiness_percentage || 0) >= 100 && g.status !== 'Approved') {
        items.push({
          type: 'ready',
          gate: g,
          title: `${g.gate_name} (100% Ready)`,
          subtitle: `Project: ${g.project || 'General'} • All required deliverables & exit criteria satisfied`,
          badgeText: 'Ready for Review',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        });
      }

      // 2. Overdue Gate
      if (g.planned_date && g.planned_date < today && g.status !== 'Approved') {
        items.push({
          type: 'overdue',
          gate: g,
          title: `${g.gate_name} (Overdue Target)`,
          subtitle: `Project: ${g.project || 'General'} • Planned date was ${g.planned_date}`,
          badgeText: 'Overdue',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        });
      }

      // 3. Pending Deliverables
      const unapprovedDels = (g.deliverables || []).filter((d) => d.status !== 'Approved');
      if (unapprovedDels.length > 0) {
        items.push({
          type: 'pending',
          gate: g,
          deliverable: unapprovedDels[0],
          title: `${g.gate_name} (${unapprovedDels.length} Pending Items)`,
          subtitle: `Latest: "${unapprovedDels[0].name}" awaiting reviewer evaluation`,
          badgeText: `${unapprovedDels.length} Pending`,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        });
      }
    });

    return items;
  }, [myAssignedGates]);

  // Upcoming Gate Reviews
  const upcomingReviews = useMemo(() => {
    return [...myAssignedGates]
      .filter((g) => g.status !== 'Approved')
      .sort((a, b) => (a.planned_date || '9999').localeCompare(b.planned_date || '9999'));
  }, [myAssignedGates]);

  // Audit Logs for Reviewer Activities
  const recentAuditLogs = useMemo(() => {
    const logs = auditService.getLogs();
    const reviewerName = (user?.fullName || user?.username || '').toLowerCase();
    return logs
      .filter(
        (l) =>
          l.entityType === 'Gate' ||
          l.entityType === 'GateDeliverable' ||
          l.entityType === 'GateCriterion' ||
          l.action.toLowerCase().includes('gate') ||
          l.action.toLowerCase().includes('deliverable') ||
          (l.user && l.user.toLowerCase().includes(reviewerName))
      )
      .slice(0, 8);
  }, [user]);

  // Document Helpers
  const handleDownloadDoc = async (gate: Gate, del: GateDeliverable) => {
    try {
      const docId = del.linked_document_id || del.document_reference || '';
      const docName = del.linked_document_name || del.document_reference || 'document.pdf';

      auditService.logAction(
        user?.fullName || 'Sarah Jenkins',
        'Downloaded Document',
        'GateDeliverable',
        del.id,
        `Downloaded document "${docName}" attached to Gate Deliverable "${del.name}" (Gate: ${gate.name})`,
        undefined,
        undefined,
        user?.roleLabel,
        gate.project
      );

      await documentService.downloadDocument(gate.project, docId, docName);
      showToast(`Downloading ${docName}...`, 'info');
    } catch (err: any) {
      alert(err.message || 'Document unavailable. The original file could not be found.');
    }
  };

  const handleViewDoc = (gate: Gate, del: GateDeliverable) => {
    const docId = del.linked_document_id || del.document_reference || del.id;
    const docName = del.linked_document_name || del.document_reference || del.name;

    const matchedDoc = allDocs.find((d) => d.name === docId || d.file_name === docName || d.title === docName);
    if (matchedDoc) {
      setViewingDoc(matchedDoc);
    } else {
      setViewingDoc({
        name: docId,
        title: docName,
        document_type: 'Engineering',
        project: gate.project || 'General',
        status: del.status === 'Approved' ? 'Approved' : 'Under Review',
        review_status: del.status === 'Approved' ? 'Approved' : 'In Review',
        version: 'v1.0',
        uploaded_by: del.responsible_person || 'Administrator',
        upload_date: del.created_at || new Date().toISOString(),
        file_name: docName,
        file_url: `/api/projects/${encodeURIComponent(gate.project || 'ALL')}/documents/${encodeURIComponent(docId)}/download`,
      });
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Gate Review Workbench
              </span>
              <span className="text-xs text-slate-300">Governance & Quality Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gate Review Dashboard
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              Welcome back, <strong>{user?.fullName || 'Sarah Jenkins'}</strong>. Review your assigned stage-gates,
              verify technical deliverables, inspect validation documents, and sign off governance milestones.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetchGates()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition backdrop-blur-xs border border-white/10 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <Link
              href="/gates"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-md cursor-pointer"
            >
              <FolderKanban className="h-3.5 w-3.5" /> All Gates
            </Link>
          </div>
        </div>

        {/* Decorative Background Glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top 5 KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Assigned Gates */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assigned Gates</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{metrics.totalAssigned}</p>
          <p className="text-[10px] text-slate-500">Active assigned milestones</p>
        </div>

        {/* KPI 2: Pending Reviews */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Reviews</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{metrics.pendingReviewsCount}</p>
          <p className="text-[10px] text-slate-500">Deliverables under review</p>
        </div>

        {/* KPI 3: Awaiting Approval */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Approval</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-700 font-mono">{metrics.awaitingApprovalCount}</p>
          <p className="text-[10px] text-slate-500">Required items pending</p>
        </div>

        {/* KPI 4: Ready for Review */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ready for Review</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">{metrics.readyForReviewCount}</p>
          <p className="text-[10px] text-slate-500">100% readiness reached</p>
        </div>

        {/* KPI 5: Overdue Reviews */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{metrics.overdueCount}</p>
          <p className="text-[10px] text-slate-500">Past target planned date</p>
        </div>
      </div>

      {/* Main Content Layout: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Priority Attention, Assigned Gates, Pending Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority / Action Center ("Needs Your Attention") */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Needs Your Attention ({attentionItems.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-bold">Sorted by Priority</span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-slate-800">You&apos;re all caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  There are no overdue gates or deliverables currently requiring your urgent attention.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.slice(0, 4).map((item, idx) => (
                  <div
                    key={`${item.gate.name}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-200 transition gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${item.badgeColor}`}>
                          {item.badgeText}
                        </span>
                        <p className="font-bold text-slate-900 text-xs">{item.title}</p>
                      </div>
                      <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                    </div>

                    <button
                      onClick={() => setSelectedGate(item.gate)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
                    >
                      <span>Review Gate</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Deliverable Reviews Section */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Pending Deliverable Reviews ({pendingDeliverables.length})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Deliverables submitted for your assigned gates awaiting verification and approval
                </p>
              </div>
            </div>

            {pendingDeliverables.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                <Inbox className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="font-bold text-slate-700">No Pending Deliverable Reviews</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All submitted deliverables have been verified.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDeliverables.map(({ gate, deliverable }) => {
                  const docName = deliverable.linked_document_name || deliverable.document_reference;
                  return (
                    <div
                      key={`${gate.name}-${deliverable.id}`}
                      className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {deliverable.id}
                            </span>
                            <span className="font-bold text-slate-500 text-xs">• {gate.gate_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({gate.project})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                deliverable.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {deliverable.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs">{deliverable.name}</p>
                        </div>

                        {/* Direct Review Button */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedGate(gate)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review Deliverable
                          </button>
                        </div>
                      </div>

                      {/* Metadata Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-500">Responsible Person: </span>
                          <strong className="text-slate-800">{deliverable.responsible_person || 'Administrator'}</strong>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Related Task: </span>
                          <strong className="text-sky-800">{deliverable.related_task_subject || deliverable.related_task || 'None'}</strong>
                        </div>

                        {/* Supporting Document */}
                        <div className="sm:col-span-2 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100/80">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-500">Supporting Document: </span>
                            {docName ? (
                              <span className="font-bold text-emerald-800 flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{docName}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No document attached</span>
                            )}
                          </div>

                          {docName && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewDoc(gate, deliverable)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-sky-700 text-[11px] font-bold border border-sky-200 transition cursor-pointer"
                              >
                                <Eye className="h-3 w-3" /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(gate, deliverable)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition cursor-pointer"
                              >
                                <Download className="h-3 w-3" /> Download
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Assigned Gates Section */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>My Assigned Gates ({myAssignedGates.length})</span>
                </h2>
                <p className="text-xs text-slate-500">Stage-gates where you are assigned as the authorized reviewer</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  All ({myAssignedGates.length})
                </button>
                <button
                  onClick={() => setActiveFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeFilter === 'pending' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setActiveFilter('ready')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeFilter === 'ready' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Ready
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    activeFilter === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Approved
                </button>
              </div>
            </div>

            {myAssignedGates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <ShieldCheck className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No Gates Assigned</p>
                <p>You currently have no stage-gates assigned for review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAssignedGates
                  .filter((g) => {
                    if (activeFilter === 'pending') return g.status === 'In Progress';
                    if (activeFilter === 'ready') return g.status === 'Ready for Review' || (g.readiness_percentage || 0) >= 100;
                    if (activeFilter === 'completed') return g.status === 'Approved';
                    return true;
                  })
                  .map((g) => {
                    const unapprovedDels = (g.deliverables || []).filter((d) => d.status !== 'Approved').length;
                    const readiness = g.readiness_percentage || 0;

                    return (
                      <div
                        key={g.name}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {g.name}
                              </span>
                              <span className="text-xs font-bold text-slate-700">• {g.gate_type}</span>
                              <span className="text-xs text-slate-400 font-mono">({g.project || 'General'})</span>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  g.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : g.status === 'Ready for Review'
                                    ? 'bg-sky-100 text-sky-800'
                                    : g.status === 'Blocked'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {g.status}
                              </span>
                            </div>
                            <h3 className="text-sm font-black text-slate-900">{g.gate_name}</h3>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Readiness</span>
                              <p className="font-bold text-emerald-700 font-mono text-xs">{readiness}%</p>
                            </div>

                            <button
                              onClick={() => setSelectedGate(g)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                            >
                              <span>Open Gate</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Gate Meta & Progress Bar */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                readiness >= 100 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${readiness}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                            <span>Gate Owner: <strong className="text-slate-700">{g.gate_owner}</strong></span>
                            {g.planned_date && <span>Planned Target: <strong className="font-mono text-slate-700">{g.planned_date}</strong></span>}
                            <span>Pending Reviews: <strong className="text-amber-700">{unapprovedDels}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Gate Readiness Breakdown, Upcoming Reviews, Performance, Recent Activity */}
        <div className="space-y-6">
          {/* Review Performance Summary Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span>Review Performance</span>
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Reviews Done</span>
                <p className="text-xl font-black text-slate-900 font-mono">{metrics.completedReviewsCount}</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Approved</span>
                <p className="text-xl font-black text-emerald-800 font-mono">{metrics.approvedDeliverablesCount}</p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-0.5">
                <span className="text-[10px] font-bold text-rose-700 uppercase">Rejected</span>
                <p className="text-xl font-black text-rose-800 font-mono">{metrics.rejectedDeliverablesCount}</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-0.5">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Pending</span>
                <p className="text-xl font-black text-amber-800 font-mono">{metrics.pendingReviewsCount}</p>
              </div>
            </div>
          </div>

          {/* Gate Readiness Overview */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <span>Gate Readiness Overview</span>
            </h2>

            {myAssignedGates.length === 0 ? (
              <p className="text-xs text-slate-400">No assigned gates available.</p>
            ) : (
              <div className="space-y-3">
                {myAssignedGates.slice(0, 4).map((g) => {
                  const reqDel = (g.deliverables || []).filter((d) => d.is_required);
                  const compDel = reqDel.filter((d) => d.status === 'Approved').length;
                  const reqCrt = (g.criteria || []).filter((c) => c.is_required);
                  const compCrt = reqCrt.filter((c) => c.status === 'Completed').length;
                  const readiness = g.readiness_percentage || 0;

                  return (
                    <div key={g.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{g.gate_name}</span>
                        <span className="font-black text-emerald-700 font-mono">{readiness}% Ready</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full ${readiness >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                          style={{ width: `${readiness}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Req. Deliverables: {compDel}/{reqDel.length}</span>
                        <span>Req. Criteria: {compCrt}/{reqCrt.length}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Gate Reviews */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-sky-600" />
              <span>Upcoming Gate Reviews</span>
            </h2>

            {upcomingReviews.length === 0 ? (
              <p className="text-xs text-slate-400">No upcoming reviews scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingReviews.slice(0, 4).map((g) => (
                  <div
                    key={g.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <p className="font-bold text-slate-800 truncate">{g.gate_name}</p>
                      <p className="text-[10px] text-slate-400">Target: {g.planned_date || 'N/A'}</p>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-700 shrink-0">
                      {g.readiness_percentage || 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Review Activity */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>Recent Review Activity</span>
            </h2>

            {recentAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No recent review activity recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.split(' ')[0]}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{log.details || log.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Stage-Gate Detail Modal for Reviewer Actions */}
      {selectedGate && (
        <GateDetailModal
          gate={selectedGate}
          onClose={() => {
            setSelectedGate(null);
            refetchGates();
          }}
          onEdit={(g) => {
            setEditingGate(g);
            setSelectedGate(null);
          }}
          onDelete={async (gateName) => {
            if (confirm(`Delete stage-gate ${gateName}?`)) {
              await deleteGateMutation.mutateAsync(gateName);
              showToast(`Gate ${gateName} deleted`, 'success');
              setSelectedGate(null);
              refetchGates();
            }
          }}
          onAddCriterion={async (crt) => {
            const updated = await addCriterionMutation.mutateAsync({
              gateName: selectedGate.name,
              criterion: crt,
            });
            setSelectedGate(updated);
            refetchGates();
          }}
          onUpdateCriterion={async (crtId, data) => {
            const updated = await updateCriterionMutation.mutateAsync({
              gateName: selectedGate.name,
              criterionId: crtId,
              data,
            });
            setSelectedGate(updated);
            refetchGates();
          }}
          onDeleteCriterion={async (crtId) => {
            const updated = await deleteCriterionMutation.mutateAsync({
              gateName: selectedGate.name,
              criterionId: crtId,
            });
            setSelectedGate(updated);
            refetchGates();
          }}
          onAddDeliverable={async (del) => {
            const updated = await addDeliverableMutation.mutateAsync({
              gateName: selectedGate.name,
              deliverable: del,
            });
            setSelectedGate(updated);
            refetchGates();
          }}
          onUpdateDeliverable={async (delId, data) => {
            const updated = await updateDeliverableMutation.mutateAsync({
              gateName: selectedGate.name,
              deliverableId: delId,
              data,
            });
            setSelectedGate(updated);
            refetchGates();
          }}
          onDeleteDeliverable={async (delId) => {
            const updated = await deleteDeliverableMutation.mutateAsync({
              gateName: selectedGate.name,
              deliverableId: delId,
            });
            setSelectedGate(updated);
            refetchGates();
          }}
          onAddGateReview={async (rev) => {
            const updated = await addGateReviewMutation.mutateAsync({
              gateName: selectedGate.name,
              review: rev,
            });
            showToast(`Gate review decision recorded: ${rev.decision}!`, 'success');
            setSelectedGate(updated);
            refetchGates();
          }}
        />
      )}

      {/* Edit Gate Dialog */}
      {editingGate && (
        <GateFormDialog
          initialData={editingGate}
          isOpen={!!editingGate}
          onClose={() => setEditingGate(null)}
          onSubmit={async (values) => {
            try {
              await updateGateMutation.mutateAsync({
                name: editingGate.name,
                data: values as any,
              });
              showToast(`Gate ${editingGate.name} updated!`, 'success');
              setEditingGate(null);
              refetchGates();
            } catch (err: any) {
              showToast(err.message || 'Failed to update gate', 'error');
            }
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          document={viewingDoc}
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
