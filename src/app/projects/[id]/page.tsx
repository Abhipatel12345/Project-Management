'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useGates } from '@/hooks/use-gates';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectPriorityBadge } from '@/components/projects/project-priority-badge';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { ProjectDeleteDialog } from '@/components/projects/project-delete-dialog';
import { ProjectTeamTab } from '@/components/projects/team/project-team-tab';
import { ProjectTasksTab } from '@/components/projects/tasks/project-tasks-tab';
import { ProjectIssuesTab } from '@/components/projects/issues/project-issues-tab';
import { ProjectDocumentsTab } from '@/components/projects/documents/project-documents-tab';
import { ProjectDesignReviewsTab } from '@/components/projects/design-review/project-design-reviews-tab';
import { ProjectGatesTab } from '@/components/projects/gates/project-gates-tab';
import { ProjectPlanningTab } from '@/components/projects/planning/project-planning-tab';
import { ProjectConnectionsTab } from '@/components/projects/connections/project-connections-tab';
import { ProjectActivityTab } from '@/components/projects/activity/project-activity-tab';
import { AccessDenied } from '@/components/shared/access-denied';
import { useAuth } from '@/providers/auth-context';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit2,
  FolderKanban,
  Trash2,
  User,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  UserPlus,
  Layers,
  CalendarDays,
  Folder,
  Activity,
  ShieldAlert,
  Network,
  Boxes,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = decodeURIComponent((params.id as string) || '');
  const { user, hasPermission } = useAuth();
  const canManageTeam = hasPermission('manageTeamMembers');
  const canManageProjectSettings = hasPermission('manageProjectSettings');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

  // Workspace Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'team' | 'tasks' | 'planning' | 'documents' | 'reviews' | 'gates' | 'issues' | 'activity' | 'connections'
  >('overview');

  // Horizontal Tab Scroll & Overflow Management
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  // Automatically scroll active tab into view if needed
  React.useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    const container = tabsContainerRef.current;
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();

      if (tabRect.left < containerRect.left + 35 || tabRect.right > containerRect.right - 35) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
    const timer = setTimeout(updateScrollState, 350);
    return () => clearTimeout(timer);
  }, [activeTab, updateScrollState]);

  const handleScrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
      setTimeout(updateScrollState, 350);
    }
  };

  const handleScrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      setTimeout(updateScrollState, 350);
    }
  };

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);
  const { data: tasksData } = useTasks({ project: projectId, pageSize: 100 });
  const { data: gatesData } = useGates({ project: projectId });

  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const projectTasks = tasksData?.tasks || [];
  const projectGates = gatesData?.gates || [];

  // Separate calculations:
  // 1. Task Completion %
  const completedTasksCount = projectTasks.filter((t: any) => t.status === 'Completed').length;
  const taskCompletionPct =
    projectTasks.length > 0 ? Math.round((completedTasksCount / projectTasks.length) * 100) : 0;

  // 2. Gate Readiness % (aggregate across project gates)
  let totalRequiredGateItems = 0;
  let completedRequiredGateItems = 0;
  projectGates.forEach((g: any) => {
    const reqCrit = (g.criteria || []).filter((c: any) => c.is_required && c.status !== 'Not Applicable');
    const reqDel = (g.deliverables || []).filter((d: any) => d.is_required);
    totalRequiredGateItems += reqCrit.length + reqDel.length;
    completedRequiredGateItems +=
      reqCrit.filter((c: any) => c.status === 'Completed').length +
      reqDel.filter((d: any) => d.status === 'Approved' || d.status === 'Completed').length;
  });
  const gateReadinessPct =
    totalRequiredGateItems > 0
      ? Math.round((completedRequiredGateItems / totalRequiredGateItems) * 100)
      : projectGates.length > 0
      ? 100
      : 0;

  // 3. Charter Completion % (based on charter fields and setup)
  let charterPoints = 0;
  if (project?.project_name) charterPoints += 20;
  if (project?.notes && project.notes.length > 10) charterPoints += 25;
  if (project?.expected_start_date && project?.expected_end_date) charterPoints += 25;
  if (project?.estimated_cost && project.estimated_cost > 0) charterPoints += 15;
  if (project?.project_type) charterPoints += 15;
  const charterCompletionPct = Math.min(charterPoints, 100);

  // 4. Overall Project Progress
  const overallProjectProgress =
    typeof project?.percent_complete === 'number' && project.percent_complete > 0
      ? project.percent_complete
      : taskCompletionPct;

  const handleCreateTeamClick = () => {
    setActiveTab('team');
    setIsAddTeamModalOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    try {
      await updateProjectMutation.mutateAsync({
        name: projectId,
        data: values,
      });
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      router.push('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 font-sans">
        <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Project Workspace from ERPNext...</p>
      </div>
    );
  }

  if (isError || !project) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg.includes('403') || errMsg.includes('Forbidden') || errMsg.includes('Access Denied')) {
      return (
        <AccessDenied
          title="403 Forbidden — Project Access Restricted"
          reason={errMsg || `You are not authorized to view Project "${projectId}" under your current ERPNext role.`}
          returnUrl="/projects"
        />
      );
    }

    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-xs font-sans">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">
          {errMsg || `Could not retrieve details for project "${projectId}".`}
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-sky-600 transition"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
          <span>Back to Projects Directory</span>
        </Link>

        {/* Header Action Triggers */}
        <div className="flex items-center gap-2">
          {/* Create Team / Add Team Member Button */}
          {canManageTeam && (
            <button
              onClick={handleCreateTeamClick}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create Team</span>
            </button>
          )}

          {canManageProjectSettings && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5 text-sky-600" />
              <span>Edit Charter</span>
            </button>
          )}

          {canManageProjectSettings && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Header Banner - Screenshot Styled Ice Blue Container */}
      <div className="p-6 rounded-2xl bg-[#EBF5FF] border border-sky-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-mono font-bold">
                {project.name}
              </span>
              <ProjectStatusBadge status={project.status} />
              <ProjectPriorityBadge priority={project.priority} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {project.project_name || project.name}
            </h1>

            <p className="text-xs text-slate-500">
              Program Type:{' '}
              <span className="text-slate-800 font-bold">
                {project.project_type || 'Internal Automotive Program'}
              </span>
            </p>
          </div>

          {/* Metrics Progression Cards: Project Progress, Gate Readiness & Charter Completion */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[320px]">
            {/* Overall Project Progress */}
            <div className="p-3.5 rounded-xl bg-white border border-sky-200/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">Project Progress</span>
                <span className="text-xs font-black text-sky-700">{overallProjectProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(overallProjectProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Stage Gate Readiness */}
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">Gate Readiness</span>
                <span className="text-xs font-black text-emerald-700">{gateReadinessPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(gateReadinessPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Charter Definition */}
            <div className="p-3.5 rounded-xl bg-white border border-indigo-200/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">Charter Setup</span>
                <span className="text-xs font-black text-indigo-700">{charterCompletionPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(charterCompletionPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Bar with Horizontal Overflow Navigation */}
      <div className="relative group/tabs flex items-center bg-white p-1 rounded-xl shadow-2xs border border-slate-200">
        {/* Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={handleScrollLeft}
            className="absolute left-1.5 z-20 flex items-center justify-center h-8 w-8 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md text-slate-700 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer shrink-0"
            aria-label="Scroll tabs left"
            title="Scroll tabs left"
          >
            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
          </button>
        )}

        {/* Scrollable Tabs Row */}
        <div
          ref={tabsContainerRef}
          className={`flex items-center gap-2 overflow-x-auto text-xs font-semibold scrollbar-none scroll-smooth w-full transition-all ${
            canScrollLeft ? 'pl-9' : 'pl-1'
          } ${canScrollRight ? 'pr-9' : 'pr-1'}`}
        >
          {/* Tab 1: Overview */}
          <button
            ref={(el) => {
              tabRefs.current['overview'] = el;
            }}
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Overview</span>
          </button>

          {/* Tab 2: Team */}
          <button
            ref={(el) => {
              tabRefs.current['team'] = el;
            }}
            onClick={() => setActiveTab('team')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'team'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team</span>
          </button>

          {/* Tab 3: Tasks */}
          <button
            ref={(el) => {
              tabRefs.current['tasks'] = el;
            }}
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Tasks</span>
          </button>

          {/* Tab 4: Planning */}
          <button
            ref={(el) => {
              tabRefs.current['planning'] = el;
            }}
            onClick={() => setActiveTab('planning')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'planning'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Planning</span>
          </button>

          {/* Tab 5: Documents */}
          <button
            ref={(el) => {
              tabRefs.current['documents'] = el;
            }}
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'documents'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Folder className="h-4 w-4" />
            <span>Documents</span>
          </button>

          {/* Tab 6: Design Reviews */}
          <button
            ref={(el) => {
              tabRefs.current['reviews'] = el;
            }}
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'reviews'
                ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Design Reviews</span>
          </button>

          {/* Tab 7: Stage Gates */}
          <button
            ref={(el) => {
              tabRefs.current['gates'] = el;
            }}
            onClick={() => setActiveTab('gates')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'gates'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Stage Gates</span>
          </button>

          {/* Tab 8: Issues */}
          <button
            ref={(el) => {
              tabRefs.current['issues'] = el;
            }}
            onClick={() => setActiveTab('issues')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'issues'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Issues</span>
          </button>

          {/* Tab 9: Activity */}
          <button
            ref={(el) => {
              tabRefs.current['activity'] = el;
            }}
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'activity'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Activity Log</span>
          </button>

          {/* Tab 10: Connections */}
          <button
            ref={(el) => {
              tabRefs.current['connections'] = el;
            }}
            onClick={() => setActiveTab('connections')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'connections'
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Network className="h-4 w-4" />
            <span>Connections</span>
          </button>
        </div>

        {/* Right Scroll Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={handleScrollRight}
            className="absolute right-1.5 z-20 flex items-center justify-center h-8 w-8 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md text-slate-700 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer shrink-0"
            aria-label="Scroll tabs right"
            title="Scroll tabs right"
          >
            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Expected Timeline
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                  {project.expected_start_date || 'N/A'} — {project.expected_end_date || 'N/A'}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Estimated Budget
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                  ${(project.estimated_cost || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Company & Unit
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {project.company || 'Global Automotive Group'}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  Program Owner
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 truncate max-w-[140px]">
                  {project.owner || 'Administrator'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-600" />
                  <span>Charter Scope & Objectives</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {project.notes ||
                    'No charter description or engineering scope notes specified for this program record.'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Execution & Product Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Project Category:</span>
                    <div className="font-bold text-sky-700 mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold">
                        {project.custom_project_category || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Product Group:</span>
                    <div className="font-bold text-indigo-700 mt-1 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                        {project.custom_product_group || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Actual Start Date:</span>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {project.actual_start_date || 'Pending commencement'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Actual End Date:</span>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {project.actual_end_date || 'In Progress'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Department:</span>
                    <div className="font-bold text-slate-900 mt-1">
                      {project.department || 'Vehicle Development'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">System Metadata</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">ERPNext DocType:</span>
                    <span className="font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Project</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Created:</span>
                    <span className="text-slate-800 font-bold font-mono">
                      {project.creation ? new Date(project.creation).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Last Modified:</span>
                    <span className="text-slate-800 font-bold font-mono">
                      {project.modified ? new Date(project.modified).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Modified By:</span>
                    <span className="text-slate-800 font-bold">{project.modified_by || 'Administrator'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: TEAM */}
      {activeTab === 'team' && (
        <ProjectTeamTab
          projectId={projectId}
          isCreateOpenExternal={isAddTeamModalOpen}
          onCloseExternalCreate={() => setIsAddTeamModalOpen(false)}
        />
      )}

      {/* Tab 3: TASKS */}
      {activeTab === 'tasks' && (
        <ProjectTasksTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 4: PLANNING */}
      {activeTab === 'planning' && (
        <ProjectPlanningTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 5: DOCUMENTS */}
      {activeTab === 'documents' && (
        <ProjectDocumentsTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 6: DESIGN REVIEWS */}
      {activeTab === 'reviews' && (
        <ProjectDesignReviewsTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 7: STAGE GATES */}
      {activeTab === 'gates' && (
        <ProjectGatesTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 6: ISSUES */}
      {activeTab === 'issues' && (
        <ProjectIssuesTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 7: ACTIVITY */}
      {activeTab === 'activity' && (
        <ProjectActivityTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Tab 8: CONNECTIONS */}
      {activeTab === 'connections' && (
        <ProjectConnectionsTab
          projectId={projectId}
          projectName={project.project_name || project.name}
        />
      )}

      {/* Edit Form Modal */}
      <ProjectFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={project}
        isLoading={updateProjectMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ProjectDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        projectName={project.project_name || project.name}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
}
