'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/providers/auth-context';
import {
  useGates,
  useUpdateGateCriterion,
  useApproveGateCriterion,
  useAddGateCriterion,
  useDeleteGateCriterion,
  useCreateGate,
} from '@/hooks/use-gates';
import { Gate, GateCriterion, GateDeliverable } from '@/types/gate.types';
import { Task } from '@/types/task.types';
import { INTEVA_GATE_CHOICES, BOARD_FUNCTIONS, BoardFunction } from '@/config/gate-choices.config';
import { isGateReviewer } from '@/utils/user-matcher';
import { useToast } from '@/providers/toast-context';
import { GateChecklistUploadDialog } from '@/components/gates/gate-checklist-upload-dialog';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Upload,
  FileText,
  Link2,
  Unlink,
  ExternalLink,
  Trash2,
  Paperclip,
  Check,
  X,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectGateCriteriaSectionProps {
  projectId: string;
  projectName: string;
  projectTasks: Task[];
  onViewTask?: (task: Task) => void;
}

const GATE_ORDER = ['1. PL', '2. VC', '3. TKO', '4. VL', '5. CPA', '6. CT'];

const GATE_COLOR_MAP: Record<
  string,
  { badge: string; border: string; bg: string; dot: string; text: string }
> = {
  '1. PL': {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    border: 'border-emerald-200',
    bg: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  '2. VC': {
    badge: 'bg-blue-50 text-blue-800 border-blue-300',
    border: 'border-blue-200',
    bg: 'bg-blue-500',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
  },
  '3. TKO': {
    badge: 'bg-purple-50 text-purple-800 border-purple-300',
    border: 'border-purple-200',
    bg: 'bg-purple-500',
    dot: 'bg-purple-500',
    text: 'text-purple-700',
  },
  '4. VL': {
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    border: 'border-amber-200',
    bg: 'bg-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  '5. CPA': {
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-300',
    border: 'border-cyan-200',
    bg: 'bg-cyan-500',
    dot: 'bg-cyan-500',
    text: 'text-cyan-700',
  },
  '6. CT': {
    badge: 'bg-rose-50 text-rose-800 border-rose-300',
    border: 'border-rose-200',
    bg: 'bg-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
  },
};

export function ProjectGateCriteriaSection({
  projectId,
  projectName,
  projectTasks,
  onViewTask,
}: ProjectGateCriteriaSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const canManage = user?.role === 'admin' || user?.role === 'projectmanager';

  // Authoritative Gate Records for THIS specific project (Strict Project Isolation)
  const {
    data: gateListData,
    isLoading: isGatesLoading,
    refetch: refetchGates,
  } = useGates({ project: projectId, pageSize: 100 });

  const rawGates: Gate[] = gateListData?.gates || [];

  // Filter gates strictly belonging to current project
  const projectGates = useMemo(() => {
    return rawGates
      .filter((g) => g.project === projectId)
      .sort((a, b) => {
        const idxA = GATE_ORDER.indexOf(a.gate_type as string);
        const idxB = GATE_ORDER.indexOf(b.gate_type as string);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.gate_type || '').localeCompare(b.gate_type || '');
      });
  }, [rawGates, projectId]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGateFilter, setSelectedGateFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Accordion state
  const [openGates, setOpenGates] = useState<Record<string, boolean>>({});

  // Dialog states
  const [isAddCriterionOpen, setIsAddCriterionOpen] = useState(false);
  const [targetGateForNewCriterion, setTargetGateForNewCriterion] = useState<Gate | null>(null);

  const [isLinkTaskOpen, setIsLinkTaskOpen] = useState(false);
  const [targetCriterionForLink, setTargetCriterionForLink] = useState<{
    gate: Gate;
    criterion: GateCriterion;
  } | null>(null);

  const [isAttachEvidenceOpen, setIsAttachEvidenceOpen] = useState(false);
  const [targetCriterionForEvidence, setTargetCriterionForEvidence] = useState<{
    gate: Gate;
    criterion: GateCriterion;
  } | null>(null);

  const [isUploadChecklistOpen, setIsUploadChecklistOpen] = useState(false);
  const [selectedGateForUpload, setSelectedGateForUpload] = useState<Gate | null>(null);

  // Mutations
  const updateCriterionMutation = useUpdateGateCriterion();
  const approveCriterionMutation = useApproveGateCriterion();
  const addCriterionMutation = useAddGateCriterion();
  const deleteCriterionMutation = useDeleteGateCriterion();
  const createGateMutation = useCreateGate();

  // New Criterion Form fields
  const [newCritName, setNewCritName] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritFunction, setNewCritFunction] = useState<string>('QA');
  const [newCritResponsible, setNewCritResponsible] = useState('');
  const [newCritDueDate, setNewCritDueDate] = useState('');
  const [newCritIsRequired, setNewCritIsRequired] = useState(true);

  // Link Task Search
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // Attach Evidence fields
  const [evidenceDocRef, setEvidenceDocRef] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');

  // Toggle accordion
  const toggleGate = (gateName: string) => {
    setOpenGates((prev) => ({
      ...prev,
      [gateName]: !(prev[gateName] ?? true),
    }));
  };

  // Overall metrics
  const metrics = useMemo(() => {
    let totalCriteria = 0;
    let completedCriteria = 0;
    let requiredCriteria = 0;
    let completedRequiredCriteria = 0;
    let totalDeliverables = 0;

    projectGates.forEach((g) => {
      (g.criteria || []).forEach((c) => {
        totalCriteria++;
        const isComp = c.status === 'Completed' || (c.status as any) === 'Approved';
        if (isComp) completedCriteria++;
        if (c.is_required && c.status !== 'Not Applicable') {
          requiredCriteria++;
          if (isComp) completedRequiredCriteria++;
        }
      });
      totalDeliverables += (g.deliverables || []).length;
    });

    const readinessPct =
      requiredCriteria > 0
        ? Math.round((completedRequiredCriteria / requiredCriteria) * 100)
        : totalCriteria > 0
        ? Math.round((completedCriteria / totalCriteria) * 100)
        : 100;

    return {
      totalCriteria,
      completedCriteria,
      requiredCriteria,
      totalDeliverables,
      readinessPct,
    };
  }, [projectGates]);

  // Handlers
  const handleStatusChange = async (
    gate: Gate,
    criterion: GateCriterion,
    newStatus: GateCriterion['status']
  ) => {
    try {
      const isReviewerOrAdmin = user?.role === 'admin' || isGateReviewer(gate, user);

      if (newStatus === 'Completed' && isReviewerOrAdmin) {
        await approveCriterionMutation.mutateAsync({
          gateName: gate.name,
          criterionId: criterion.id,
        });
        showToast(`Criterion ${criterion.id} approved & marked Completed!`, 'success');
      } else {
        await updateCriterionMutation.mutateAsync({
          gateName: gate.name,
          criterionId: criterion.id,
          data: {
            status: newStatus,
            completion_percentage: newStatus === 'Completed' ? 100 : newStatus === 'In Progress' ? 50 : 0,
          },
        });
        showToast(`Criterion status updated to ${newStatus}`, 'success');
      }
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to update criterion status', 'error');
    }
  };

  const handleApprove = async (gate: Gate, criterionId: string) => {
    try {
      await approveCriterionMutation.mutateAsync({
        gateName: gate.name,
        criterionId,
      });
      showToast('Gate Exit Criterion successfully approved!', 'success');
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve criterion', 'error');
    }
  };

  const handleDeleteCriterion = async (gate: Gate, criterionId: string) => {
    if (!confirm('Are you sure you want to remove this Exit Criterion?')) return;
    try {
      await deleteCriterionMutation.mutateAsync({
        gateName: gate.name,
        criterionId,
      });
      showToast('Criterion deleted successfully', 'success');
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete criterion', 'error');
    }
  };

  const handleSaveNewCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGateForNewCriterion) return;
    if (!newCritName.trim()) {
      showToast('Please enter a criterion title', 'error');
      return;
    }

    try {
      await addCriterionMutation.mutateAsync({
        gateName: targetGateForNewCriterion.name,
        criterion: {
          name: newCritName.trim(),
          description: newCritDesc.trim(),
          function: newCritFunction,
          responsible_person: newCritResponsible.trim() || targetGateForNewCriterion.gate_owner,
          due_date: newCritDueDate || targetGateForNewCriterion.planned_date,
          is_required: newCritIsRequired,
          status: 'In Progress',
          completion_percentage: 0,
        },
      });

      showToast(`Added criterion to ${targetGateForNewCriterion.gate_type}`, 'success');
      setIsAddCriterionOpen(false);
      setTargetGateForNewCriterion(null);
      setNewCritName('');
      setNewCritDesc('');
      setNewCritResponsible('');
      setNewCritDueDate('');
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to create criterion', 'error');
    }
  };

  const handleLinkTask = async (task: Task) => {
    if (!targetCriterionForLink) return;
    const { gate, criterion } = targetCriterionForLink;

    try {
      await updateCriterionMutation.mutateAsync({
        gateName: gate.name,
        criterionId: criterion.id,
        data: {
          related_task_id: task.name,
          related_task: task.subject,
          related_task_subject: task.subject,
          responsible_person: task.assigned_to || criterion.responsible_person,
          completion_percentage: task.progress ?? (task.status === 'Completed' ? 100 : 0),
        },
      });

      showToast(`Linked Task "${task.subject}" to Criterion ${criterion.id}!`, 'success');
      setIsLinkTaskOpen(false);
      setTargetCriterionForLink(null);
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to link task', 'error');
    }
  };

  const handleUnlinkTask = async (gate: Gate, criterion: GateCriterion) => {
    try {
      await updateCriterionMutation.mutateAsync({
        gateName: gate.name,
        criterionId: criterion.id,
        data: {
          related_task_id: '',
          related_task: '',
          related_task_subject: '',
        },
      });
      showToast(`Unlinked task from Criterion ${criterion.id}`, 'success');
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to unlink task', 'error');
    }
  };

  const handleSaveEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCriterionForEvidence) return;
    const { gate, criterion } = targetCriterionForEvidence;

    try {
      await updateCriterionMutation.mutateAsync({
        gateName: gate.name,
        criterionId: criterion.id,
        data: {
          document_reference: evidenceDocRef.trim() || undefined,
          source_file: evidenceFileName.trim() || undefined,
        },
      });

      showToast(`Evidence attached to Criterion ${criterion.id}!`, 'success');
      setIsAttachEvidenceOpen(false);
      setTargetCriterionForEvidence(null);
      setEvidenceDocRef('');
      setEvidenceFileName('');
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to attach evidence', 'error');
    }
  };

  // Helper to initialize default gates if none exist
  const handleInitializeProjectGates = async () => {
    try {
      for (const gateCode of INTEVA_GATE_CHOICES) {
        await createGateMutation.mutateAsync({
          project: projectId,
          gate_type: gateCode,
          gate_name: `Gate ${gateCode} Review for ${projectId}`,
          status: 'In Progress',
          planned_date: new Date().toISOString().split('T')[0],
          gate_owner: user?.fullName || 'Program Director',
          gate_reviewer: 'Sarah Jenkins',
          reviewer_user_id: 'sarahjenkins@gmail.com',
          criteria: [
            {
              id: `CRT-${Math.floor(100 + Math.random() * 900)}`,
              name: `${gateCode} Technical & Quality Sign-off`,
              description: `Mandatory APQP stage-gate sign-off for ${gateCode}`,
              is_required: true,
              status: 'In Progress',
              function: 'QA',
              responsible_person: 'Quality Lead',
              due_date: new Date().toISOString().split('T')[0],
            },
          ],
        });
      }
      showToast(`Initialized 6 standard APQP gates for ${projectId}!`, 'success');
      refetchGates();
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize gates', 'error');
    }
  };

  // Filter tasks for task linking dialog
  const filteredTasksForLink = useMemo(() => {
    if (!taskSearchQuery.trim()) return projectTasks;
    const q = taskSearchQuery.toLowerCase().trim();
    return projectTasks.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.assigned_to && t.assigned_to.toLowerCase().includes(q))
    );
  }, [projectTasks, taskSearchQuery]);

  return (
    <div className="space-y-4 font-sans mt-8 pt-6 border-t-2 border-slate-200/80">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                Authoritative APQP Exit Checklist
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Gate Management Source
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">
              GATE CRITERIA / GATE DELIVERABLES
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Live exit criteria and deliverables for <strong>{projectId}</strong>. Changes update Gate
              Management and Gate Readiness in real-time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white">
            <Layers className="h-3.5 w-3.5 text-indigo-300" />
            <span>{metrics.totalCriteria} Criteria</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>{metrics.completedCriteria} Completed</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs font-bold text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{metrics.readinessPct}% Readiness</span>
          </div>

          {canManage && projectGates.length === 0 && (
            <button
              onClick={handleInitializeProjectGates}
              disabled={createGateMutation.isPending}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Initialize Project Gates</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Gate criteria, description, responsible person..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* Gate Filter */}
          <div>
            <select
              value={selectedGateFilter}
              onChange={(e) => setSelectedGateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="ALL">All Gates ({projectGates.length})</option>
              {projectGates.map((g) => (
                <option key={g.name} value={g.gate_type}>
                  {g.gate_type} — {g.gate_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed / Approved</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Not Applicable">Not Applicable</option>
            </select>
          </div>
        </div>
      </div>

      {/* GATE-BY-GATE ACCORDION LIST */}
      {isGatesLoading ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
          <Loader2 className="h-7 w-7 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">
            Loading Gate Criteria for {projectId}...
          </p>
        </div>
      ) : projectGates.length === 0 ? (
        <div className="p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Stage Gates Recorded for this Project</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Stage-gate criteria are populated from the authoritative Gate Management records for{' '}
            <strong>{projectId}</strong>. Click below to initialize the standard Inteva gates.
          </p>
          {canManage && (
            <button
              onClick={handleInitializeProjectGates}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Initialize Standard 6 APQP Gates</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {projectGates
            .filter((g) => {
              if (selectedGateFilter === 'ALL') return true;
              return g.gate_type === selectedGateFilter;
            })
            .map((gate) => {
              const isOpen = openGates[gate.name] ?? true;
              const gateColors = GATE_COLOR_MAP[gate.gate_type] || {
                badge: 'bg-slate-100 text-slate-800 border-slate-300',
                border: 'border-slate-200',
                bg: 'bg-slate-500',
                dot: 'bg-slate-500',
                text: 'text-slate-700',
              };

              const allCriteria = gate.criteria || [];
              const filteredCriteria = allCriteria.filter((c) => {
                if (selectedStatusFilter !== 'ALL') {
                  const isComp = c.status === 'Completed' || (c.status as any) === 'Approved';
                  if (selectedStatusFilter === 'Completed' && !isComp) return false;
                  if (selectedStatusFilter !== 'Completed' && c.status !== selectedStatusFilter)
                    return false;
                }
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase().trim();
                  const matchName = c.name.toLowerCase().includes(q);
                  const matchDesc = (c.description || '').toLowerCase().includes(q);
                  const matchResp = (c.responsible_person || '').toLowerCase().includes(q);
                  const matchTask = (c.related_task || '').toLowerCase().includes(q);
                  return matchName || matchDesc || matchResp || matchTask;
                }
                return true;
              });

              const completedCritCount = allCriteria.filter(
                (c) => c.status === 'Completed' || (c.status as any) === 'Approved'
              ).length;
              const readiness =
                allCriteria.length > 0
                  ? Math.round((completedCritCount / allCriteria.length) * 100)
                  : 100;

              const isReviewerOrAdmin = user?.role === 'admin' || isGateReviewer(gate, user);

              return (
                <div
                  key={gate.name}
                  className={`rounded-3xl border ${gateColors.border} bg-white overflow-hidden shadow-xs transition duration-150`}
                >
                  {/* GATE ACCORDION HEADER */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleGate(gate.name)}
                        className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        title={isOpen ? 'Collapse Gate' : 'Expand Gate'}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-slate-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-700" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${gateColors.badge}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${gateColors.dot}`} />
                            <span>{gate.gate_type}</span>
                          </span>

                          <span className="font-bold text-xs text-slate-800">
                            {gate.gate_name}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-extrabold">
                            {allCriteria.length}{' '}
                            {allCriteria.length === 1 ? 'Criterion' : 'Criteria'}
                          </span>

                          <span className="text-[11px] text-slate-500 font-medium">
                            • {completedCritCount} of {allCriteria.length} Satisfied ({readiness}%)
                          </span>

                          {gate.planned_date && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium font-mono">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>Planned: {gate.planned_date}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-1">
                          <span>
                            Gate Reviewer:{' '}
                            <strong className="text-slate-700 font-bold">
                              {gate.gate_reviewer || gate.reviewer_user_id || 'Sarah Jenkins'}
                            </strong>
                          </span>
                          {gate.gate_owner && (
                            <span>
                              Gate Owner:{' '}
                              <strong className="text-slate-700 font-bold">{gate.gate_owner}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on gate header */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGateForUpload(gate);
                          setIsUploadChecklistOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
                        title="Upload Excel Exit Criteria Checklist"
                      >
                        <Upload className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Upload Checklist</span>
                      </button>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetGateForNewCriterion(gate);
                            setIsAddCriterionOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Criterion</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GATE ACCORDION CONTENT */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {filteredCriteria.length === 0 ? (
                          <div className="p-8 text-center bg-white space-y-2">
                            <p className="text-xs text-slate-400 font-medium">
                              No exit criteria recorded for {gate.gate_type} in this project.
                            </p>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetGateForNewCriterion(gate);
                                  setIsAddCriterionOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Create First Criterion for {gate.gate_type}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                  <th className="py-2.5 px-4 w-12 text-center">Status</th>
                                  <th className="py-2.5 px-4">Gate Exit Criterion</th>
                                  <th className="py-2.5 px-4">Function</th>
                                  <th className="py-2.5 px-4">Responsible & Due</th>
                                  <th className="py-2.5 px-4">Linked Project Task & Evidence</th>
                                  <th className="py-2.5 px-4 text-right">Approval & Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredCriteria.map((crt) => {
                                  const isApproved =
                                    crt.status === 'Completed' ||
                                    (crt.status as any) === 'Approved' ||
                                    (crt.status as any) === 'APPROVED';

                                  // Find linked task if associated
                                  const linkedTask = crt.related_task_id
                                    ? projectTasks.find((t) => t.name === crt.related_task_id)
                                    : crt.related_task
                                    ? projectTasks.find((t) => t.subject === crt.related_task)
                                    : null;

                                  const functionCode =
                                    crt.function || (gate.board_reviews?.[0]?.function as any) || 'QA';

                                  return (
                                    <tr
                                      key={crt.id}
                                      className={`hover:bg-slate-50/80 transition ${
                                        isApproved ? 'bg-emerald-50/20' : ''
                                      }`}
                                    >
                                      {/* Status Icon */}
                                      <td className="py-3 px-4 text-center align-top">
                                        <div className="pt-0.5">
                                          {isApproved ? (
                                            <div
                                              className="inline-flex p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200"
                                              title="Criterion Completed & Approved"
                                            >
                                              <CheckCircle2 className="h-4 w-4" />
                                            </div>
                                          ) : crt.status === 'In Progress' ? (
                                            <div
                                              className="inline-flex p-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200"
                                              title="In Progress"
                                            >
                                              <Clock className="h-4 w-4" />
                                            </div>
                                          ) : (
                                            <div
                                              className="inline-flex p-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-200"
                                              title="Pending Review"
                                            >
                                              <Clock className="h-4 w-4" />
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* Criterion Name & Description */}
                                      <td className="py-3 px-4 align-top space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {crt.id}
                                          </span>
                                          <span
                                            className={`font-black text-xs ${
                                              isApproved ? 'text-slate-800' : 'text-slate-900'
                                            }`}
                                          >
                                            {crt.name}
                                          </span>
                                          {crt.is_required && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 tracking-wider">
                                              Mandatory
                                            </span>
                                          )}
                                        </div>
                                        {crt.description && (
                                          <p className="text-[11px] text-slate-500 leading-snug">
                                            {crt.description}
                                          </p>
                                        )}
                                      </td>

                                      {/* Function Code */}
                                      <td className="py-3 px-4 align-top">
                                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          {functionCode}
                                        </span>
                                      </td>

                                      {/* Responsible & Due */}
                                      <td className="py-3 px-4 align-top space-y-0.5 text-[11px]">
                                        <div className="font-bold text-slate-700">
                                          {crt.responsible_person || gate.gate_owner || 'Gate Lead'}
                                        </div>
                                        {crt.due_date && (
                                          <div className="text-[10px] text-slate-400 font-mono">
                                            Due: {crt.due_date}
                                          </div>
                                        )}
                                      </td>

                                      {/* Linked Executable Task & Evidence Document */}
                                      <td className="py-3 px-4 align-top space-y-1.5">
                                        {/* Linked Task */}
                                        {linkedTask ? (
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => onViewTask && onViewTask(linkedTask)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold hover:bg-sky-100 transition cursor-pointer"
                                              title="Click to view linked Project Task details"
                                            >
                                              <FileText className="h-3 w-3 text-sky-600" />
                                              <span>{linkedTask.subject}</span>
                                              <ExternalLink className="h-2.5 w-2.5 text-sky-400" />
                                            </button>

                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                linkedTask.status === 'Completed'
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : 'bg-slate-100 text-slate-600'
                                              }`}
                                            >
                                              {linkedTask.status} ({linkedTask.progress || 0}%)
                                            </span>

                                            <button
                                              type="button"
                                              onClick={() => handleUnlinkTask(gate, crt)}
                                              className="p-0.5 text-slate-400 hover:text-rose-600 transition"
                                              title="Unlink Task"
                                            >
                                              <Unlink className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ) : crt.related_task ? (
                                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                            <span className="font-semibold text-slate-700">
                                              {crt.related_task}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleUnlinkTask(gate, crt)}
                                              className="p-0.5 text-slate-400 hover:text-rose-600 transition"
                                              title="Unlink Task"
                                            >
                                              <Unlink className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTargetCriterionForLink({ gate, criterion: crt });
                                              setIsLinkTaskOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-200 transition cursor-pointer"
                                          >
                                            <Link2 className="h-3 w-3" />
                                            <span>+ Link Project Task</span>
                                          </button>
                                        )}

                                        {/* Evidence / Document */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {crt.source_file ? (
                                            <span
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px]"
                                              title={`Checklist source: ${crt.source_file}`}
                                            >
                                              <FileText className="h-3 w-3 text-emerald-600" />
                                              <span>{crt.source_file}</span>
                                            </span>
                                          ) : null}

                                          {crt.document_reference ? (
                                            <span
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px]"
                                              title={`Document Evidence: ${crt.document_reference}`}
                                            >
                                              <Paperclip className="h-3 w-3 text-emerald-600" />
                                              <span>{crt.document_reference}</span>
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setTargetCriterionForEvidence({
                                                  gate,
                                                  criterion: crt,
                                                });
                                                setEvidenceDocRef(crt.document_reference || '');
                                                setIsAttachEvidenceOpen(true);
                                              }}
                                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                            >
                                              <Paperclip className="h-3 w-3 text-slate-400" />
                                              <span>Attach Evidence</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>

                                      {/* Status Dropdown, Approval & Actions */}
                                      <td className="py-3 px-4 align-top text-right space-y-1">
                                        <div className="flex items-center justify-end gap-2">
                                          {/* Status Selector */}
                                          <select
                                            value={crt.status}
                                            onChange={(e) =>
                                              handleStatusChange(
                                                gate,
                                                crt,
                                                e.target.value as GateCriterion['status']
                                              )
                                            }
                                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                                          >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Not Applicable">Not Applicable</option>
                                          </select>

                                          {/* Approve Button for Reviewer / Admin if not yet approved */}
                                          {!isApproved && isReviewerOrAdmin && (
                                            <button
                                              type="button"
                                              onClick={() => handleApprove(gate, crt.id)}
                                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-2xs transition cursor-pointer"
                                              title="Approve Exit Criterion"
                                            >
                                              <CheckCircle2 className="h-3 w-3" />
                                              <span>Approve</span>
                                            </button>
                                          )}

                                          {canManage && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCriterion(gate, crt.id)}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                              title="Delete Criterion"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>

                                        {/* Approval metadata badge */}
                                        {isApproved && (
                                          <div className="text-[10px] text-emerald-700 font-medium">
                                            ✓ Approved by{' '}
                                            <strong className="text-slate-800">
                                              {crt.approved_by ||
                                                gate.gate_reviewer ||
                                                'Gate Reviewer'}
                                            </strong>
                                            {crt.approved_at && (
                                              <span className="font-mono text-slate-400 ml-1">
                                                ({crt.approved_at})
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* GATE DELIVERABLES SUBSECTION (If deliverables exist) */}
                        {gate.deliverables && gate.deliverables.length > 0 && (
                          <div className="p-4 bg-slate-50/60 border-t border-slate-100 space-y-2">
                            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Key Deliverables for {gate.gate_type} ({gate.deliverables.length})</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {gate.deliverables.map((del) => (
                                <div
                                  key={del.id}
                                  className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 truncate">
                                      {del.name}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                        del.status === 'Approved' || del.status === 'Completed'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {del.status}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Owner: {del.responsible_person || 'Engineering Lead'}
                                  </div>
                                  {del.document_reference && (
                                    <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1">
                                      <Paperclip className="h-2.5 w-2.5" />
                                      <span>{del.document_reference}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>
      )}

      {/* DIALOG: ADD NEW GATE CRITERION */}
      {isAddCriterionOpen && targetGateForNewCriterion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Add Exit Criterion to {targetGateForNewCriterion.gate_type}
                </h3>
                <p className="text-xs text-slate-500">
                  Project: <strong>{projectId}</strong> • Gate:{' '}
                  <strong>{targetGateForNewCriterion.gate_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddCriterionOpen(false);
                  setTargetGateForNewCriterion(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCriterion} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Criterion Title *</label>
                <input
                  type="text"
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  placeholder="e.g. DFMEA Risk Analysis Complete"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={newCritDesc}
                  onChange={(e) => setNewCritDesc(e.target.value)}
                  placeholder="Detailed criteria requirements, ISO/APQP standards, or sign-off prerequisites..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Function</label>
                  <select
                    value={newCritFunction}
                    onChange={(e) => setNewCritFunction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:ring-1 focus:ring-indigo-500"
                  >
                    {BOARD_FUNCTIONS.map((fn) => (
                      <option key={fn} value={fn}>
                        {fn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Responsible Person</label>
                  <input
                    type="text"
                    value={newCritResponsible}
                    onChange={(e) => setNewCritResponsible(e.target.value)}
                    placeholder={targetGateForNewCriterion.gate_owner || 'e.g. Sarah Jenkins'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={newCritDueDate}
                    onChange={(e) => setNewCritDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chk-is-required"
                    checked={newCritIsRequired}
                    onChange={(e) => setNewCritIsRequired(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="chk-is-required"
                    className="text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Mandatory Exit Criterion
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCriterionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCriterionMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addCriterionMutation.isPending ? 'Saving...' : 'Save Criterion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: LINK PROJECT TASK TO GATE CRITERION */}
      {isLinkTaskOpen && targetCriterionForLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Link Project Task to Criterion</h3>
                <p className="text-xs text-slate-500">
                  Criterion: <strong>{targetCriterionForLink.criterion.name}</strong> (
                  {targetCriterionForLink.criterion.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLinkTaskOpen(false);
                  setTargetCriterionForLink(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Search project tasks to link..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredTasksForLink.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No matching project tasks found in {projectId}.
                  </p>
                ) : (
                  filteredTasksForLink.map((task) => (
                    <div
                      key={task.name}
                      onClick={() => handleLinkTask(task)}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{task.subject}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono">{task.name}</span>
                          <span>•</span>
                          <span>Phase: {task.phase || 'General'}</span>
                          <span>•</span>
                          <span>Assignee: {task.assigned_to || 'Unassigned'}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.status}
                        </span>
                        <Link2 className="h-4 w-4 text-indigo-600" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsLinkTaskOpen(false);
                  setTargetCriterionForLink(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: ATTACH EVIDENCE DOCUMENT */}
      {isAttachEvidenceOpen && targetCriterionForEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Attach Document Evidence</h3>
                <p className="text-xs text-slate-500">
                  Criterion: <strong>{targetCriterionForEvidence.criterion.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAttachEvidenceOpen(false);
                  setTargetCriterionForEvidence(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvidence} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Document Reference Number / Code
                </label>
                <input
                  type="text"
                  value={evidenceDocRef}
                  onChange={(e) => setEvidenceDocRef(e.target.value)}
                  placeholder="e.g. DOC-2026-0012 or DFMEA-REV-C"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  File Name / Attachment Title
                </label>
                <input
                  type="text"
                  value={evidenceFileName}
                  onChange={(e) => setEvidenceFileName(e.target.value)}
                  placeholder="e.g. DFMEA_Risk_Mitigation_Matrix.xlsx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAttachEvidenceOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCriterionMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {updateCriterionMutation.isPending ? 'Saving...' : 'Save Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSED GATE CHECKLIST UPLOAD DIALOG */}
      {isUploadChecklistOpen && selectedGateForUpload && (
        <GateChecklistUploadDialog
          isOpen={isUploadChecklistOpen}
          onClose={() => {
            setIsUploadChecklistOpen(false);
            setSelectedGateForUpload(null);
          }}
          gate={selectedGateForUpload}
          onSuccess={() => refetchGates()}
        />
      )}
    </div>
  );
}
