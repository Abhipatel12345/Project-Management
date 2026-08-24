'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { teamService } from '@/services/team.service';
import { Project } from '@/types/project.types';
import { ProjectTeamMember, TeamMemberFormData } from '@/types/team.types';
import { Task } from '@/types/task.types';
import { TeamAllocationSummary } from '@/components/projects/team/team-allocation-summary';
import { TeamAllocationTable, ProjectAllocationData } from '@/components/projects/team/team-allocation-table';
import { TeamAllocationDetailModal } from '@/components/projects/team/team-allocation-detail-modal';
import { TeamMemberDialog } from '@/components/projects/team/team-member-dialog';
import { useToast } from '@/providers/toast-context';
import { useAuth } from '@/providers/auth-context';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  Filter,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';

export default function ProjectTeamPage() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canManageTeam = hasPermission('manageTeamMembers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'team' | 'progress' | 'date' | 'name'>('team');

  // Modals State
  const [viewingAllocation, setViewingAllocation] = useState<ProjectAllocationData | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Projects & Tasks from ERPNext
  const { data: projectsData, isLoading: isProjectsLoading, refetch: refetchProjects } = useProjects({
    page: 1,
    pageSize: 100,
  });
  const projects = projectsData?.projects || [];

  const { data: tasksData, isLoading: isTasksLoading, refetch: refetchTasks } = useTasks({
    page: 1,
    pageSize: 300,
  });
  const tasks = tasksData?.tasks || [];

  // Local state for team members cache mapped by project ID
  const [teamsMap, setTeamsMap] = useState<Record<string, ProjectTeamMember[]>>({});
  const [isTeamsLoading, setIsTeamsLoading] = useState(true);

  const loadTeams = async () => {
    setIsTeamsLoading(true);
    const map: Record<string, ProjectTeamMember[]> = {};
    for (const p of projects) {
      try {
        map[p.name] = await teamService.getTeamMembers(p.name);
      } catch {
        map[p.name] = [];
      }
    }
    setTeamsMap(map);
    setIsTeamsLoading(false);
  };

  useEffect(() => {
    if (projects.length > 0) {
      loadTeams();
    } else if (!isProjectsLoading) {
      setIsTeamsLoading(false);
    }
  }, [projects, isProjectsLoading]);

  const handleRefresh = async () => {
    showToast('Refetching team allocations & tasks from ERPNext...', 'info');
    await Promise.all([refetchProjects(), refetchTasks()]);
    await loadTeams();
    showToast('Team allocation dashboard updated!', 'success');
  };

  // Compute Project Allocation Data array
  const allocations: ProjectAllocationData[] = useMemo(() => {
    return projects.map((project: Project) => {
      const members = teamsMap[project.name] || [];
      const projectTasks = tasks.filter((t: Task) => t.project === project.name);

      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter((t: Task) => t.status === 'Completed').length;
      const inProgressTasks = projectTasks.filter((t: Task) => t.status === 'Working' || t.status === 'In Progress').length;
      const pendingTasks = projectTasks.filter((t: Task) => t.status === 'Open').length;
      
      const progressRate =
        totalTasks > 0
          ? Math.round(
              projectTasks.reduce((acc: number, t: Task) => acc + (t.progress || 0), 0) / totalTasks
            )
          : project.percent_complete || 0;

      return {
        project,
        members,
        tasks: projectTasks,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        progressRate,
      };
    });
  }, [projects, teamsMap, tasks]);

  // Compute Global Resource Utilization Summary Metrics
  const summary = useMemo(() => {
    const totalProjects = allocations.length;
    const projectsWithTeams = allocations.filter((a) => a.members.length > 0).length;
    const projectsWithoutTeams = allocations.filter((a) => a.members.length === 0).length;

    const allMembers = allocations.flatMap((a) => a.members);
    const uniqueEmails = new Set(allMembers.map((m) => m.user_email));
    const totalTeamMembers = uniqueEmails.size;
    const activeTeamMembers = allMembers.filter((m) => m.status === 'Active').length;

    const totalAssignedTasks = tasks.length;
    const avgUtilization =
      allocations.length > 0
        ? Math.round(allocations.reduce((acc, a) => acc + a.progressRate, 0) / allocations.length)
        : 0;

    return {
      totalProjects,
      projectsWithTeams,
      projectsWithoutTeams,
      totalTeamMembers: totalTeamMembers || allMembers.length,
      activeTeamMembers,
      totalAssignedTasks,
      avgUtilization,
    };
  }, [allocations, tasks]);

  // Filter & Sort allocations list
  const filteredAllocations = useMemo(() => {
    let result = [...allocations];

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.project.project_name?.toLowerCase().includes(q) ||
          a.project.name.toLowerCase().includes(q) ||
          a.project.owner?.toLowerCase().includes(q)
      );
    }

    // Status Filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((a) => a.project.status === selectedStatus);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'team') return b.members.length - a.members.length;
      if (sortBy === 'progress') return b.progressRate - a.progressRate;
      if (sortBy === 'date') return (a.project.expected_end_date || '').localeCompare(b.project.expected_end_date || '');
      return (a.project.project_name || a.project.name).localeCompare(b.project.project_name || b.project.name);
    });

    return result;
  }, [allocations, searchQuery, selectedStatus, sortBy]);

  // Handler for adding a team member
  const handleAddMemberSubmit = async (formData: TeamMemberFormData, targetId?: string) => {
    const projId = targetId || targetProjectId || (projects.length > 0 ? projects[0].name : '');
    if (!projId) {
      showToast('Please select a valid project for allocation', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await teamService.addTeamMember(projId, formData);
      showToast(`Added ${formData.employee_name} to project ${projId}!`, 'success');
      await loadTeams();
      setIsAddMemberOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to allocate team member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddMemberModal = (projectId?: string) => {
    setTargetProjectId(projectId);
    setIsAddMemberOpen(true);
  };

  const isLoading = isProjectsLoading || isTasksLoading || isTeamsLoading;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
              RESOURCE ALLOCATION ENGINE
            </span>
            <span className="text-[10px] font-bold text-slate-400">• Cross-Functional Team Utilization</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Project Team & Resource Allocation
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage program team staffing, engineering role assignments, and workload distribution across all active automotive projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh ERPNext Team Allocations"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canManageTeam && (
            <button
              onClick={() => openAddMemberModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Resource Utilization Summary */}
      <TeamAllocationSummary
        totalProjects={summary.totalProjects}
        projectsWithTeams={summary.projectsWithTeams}
        projectsWithoutTeams={summary.projectsWithoutTeams}
        totalTeamMembers={summary.totalTeamMembers}
        activeTeamMembers={summary.activeTeamMembers}
        totalAssignedTasks={summary.totalAssignedTasks}
        avgUtilization={summary.avgUtilization}
      />

      {/* Toolbar: Search, Filters, Sort */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project name or project ID..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>

          {/* Project Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
            >
              <option value="ALL">All Project Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
            >
              <option value="team">Sort by Team Size</option>
              <option value="progress">Sort by Progress Rate</option>
              <option value="date">Sort by Target Date</option>
              <option value="name">Sort by Project Name</option>
            </select>
          </div>

          {/* Count Badge */}
          <div className="flex items-center justify-end font-mono text-xs font-bold text-slate-500">
            <span>Showing {filteredAllocations.length} Programs</span>
          </div>
        </div>
      </div>

      {/* Main Table / Loading State */}
      {isLoading ? (
        <div className="p-16 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs font-sans">
          <Loader2 className="h-8 w-8 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Fetching Project Team Allocations from ERPNext...</p>
        </div>
      ) : (
        <TeamAllocationTable
          allocations={filteredAllocations}
          onViewTeam={(alloc) => setViewingAllocation(alloc)}
          onAddMember={(projId) => openAddMemberModal(projId)}
        />
      )}

      {/* Team Allocation Inspection Modal */}
      <TeamAllocationDetailModal
        allocation={viewingAllocation}
        onClose={() => setViewingAllocation(null)}
        onAddMember={(projId) => openAddMemberModal(projId)}
      />

      {/* Add Team Member Modal */}
      <TeamMemberDialog
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={handleAddMemberSubmit}
        defaultProjectId={targetProjectId}
        projects={projects.map((p: Project) => ({ name: p.name, project_name: p.project_name || p.name }))}
        isLoading={isSubmitting}
      />
    </div>
  );
}
