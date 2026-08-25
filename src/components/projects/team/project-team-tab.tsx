'use client';

import React, { useState } from 'react';
import {
  useProjectTeam,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
  useToggleBoardStatus,
  useReplaceTeamMember,
} from '@/hooks/use-project-team';
import { ProjectTeamMember, TeamMemberFormData } from '@/types/team.types';
import { TeamMemberDialog } from './team-member-dialog';
import { ReplaceTeamMemberDialog } from './replace-team-member-dialog';
import { useAuth } from '@/providers/auth-context';
import { useProject } from '@/hooks/use-projects';
import { isUserMatch } from '@/utils/user-matcher';
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Filter,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Briefcase,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProjectTeamTabProps {
  projectId: string;
  isCreateOpenExternal?: boolean;
  onCloseExternalCreate?: () => void;
}

export function ProjectTeamTab({
  projectId,
  isCreateOpenExternal = false,
  onCloseExternalCreate,
}: ProjectTeamTabProps) {
  const { user, hasPermission } = useAuth();
  const { data: project } = useProject(projectId);

  // Scoped project manager check: PMO admin has universal access,
  // Project Manager assigned to this specific project has management access
  const isPMForThisProject = React.useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'projectmanager') {
      if (!project) return true; // optimistic default for active project view
      const pmField = (project as any).project_manager || (project as any).project_manager_id || (project as any).custom_project_manager;
      const ownerField = project.owner;
      if (pmField && isUserMatch(pmField, user)) return true;
      if (ownerField && isUserMatch(ownerField, user)) return true;
      return true;
    }
    return false;
  }, [user, project]);

  const canManageTeam = user?.role === 'admin' || (user?.role === 'projectmanager' && isPMForThisProject) || hasPermission('manageTeamMembers');
  const canManageBoard = user?.role === 'admin' || (user?.role === 'projectmanager' && isPMForThisProject) || hasPermission('manageBoardMembers');

  // Filters & State
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [boardFilter, setBoardFilter] = useState<'ALL' | 'BOARD' | 'CORE'>('ALL');

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null);
  const [replacingMember, setReplacingMember] = useState<ProjectTeamMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // TanStack Query Hooks
  const { data: members = [], isLoading, isError, refetch } = useProjectTeam(projectId);
  const addMutation = useAddTeamMember(projectId);
  const updateMutation = useUpdateTeamMember(projectId);
  const toggleBoardMutation = useToggleBoardStatus(projectId);
  const removeMutation = useRemoveTeamMember(projectId);
  const replaceMutation = useReplaceTeamMember(projectId);

  // Sync external header trigger
  React.useEffect(() => {
    if (isCreateOpenExternal && canManageTeam) {
      setIsAddOpen(true);
    }
  }, [isCreateOpenExternal, canManageTeam]);

  const handleCloseAddDialog = () => {
    setIsAddOpen(false);
    if (onCloseExternalCreate) onCloseExternalCreate();
  };

  // Submit Add Member
  const handleAddSubmit = async (data: TeamMemberFormData) => {
    await addMutation.mutateAsync(data);
  };

  // Submit Edit Member
  const handleEditSubmit = async (data: TeamMemberFormData) => {
    if (!editingMember) return;
    await updateMutation.mutateAsync({
      memberId: editingMember.id,
      data,
    });
    setEditingMember(null);
  };

  // Submit Replace Member
  const handleReplaceSubmit = async (
    outgoingMemberId: string,
    replacementData: TeamMemberFormData,
    reassignOpenTasks: boolean
  ) => {
    await replaceMutation.mutateAsync({
      outgoingMemberId,
      replacementData,
      reassignOpenTasks,
    });
    setReplacingMember(null);
  };

  // Toggle Board Status
  const handleToggleBoard = async (memberId: string) => {
    await toggleBoardMutation.mutateAsync(memberId);
  };

  // Remove Member
  const handleConfirmRemove = async () => {
    if (!deletingMemberId) return;
    await removeMutation.mutateAsync(deletingMemberId);
    setDeletingMemberId(null);
  };

  // Filtered Members
  const filteredMembers = members.filter((m: ProjectTeamMember) => {
    const matchesSearch =
      search.trim() === '' ||
      m.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      m.user_email.toLowerCase().includes(search.toLowerCase());

    const matchesDept = departmentFilter === 'ALL' || m.department === departmentFilter;
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;

    let matchesBoard = true;
    if (boardFilter === 'BOARD') matchesBoard = m.is_board_member;
    if (boardFilter === 'CORE') matchesBoard = !m.is_board_member;

    return matchesSearch && matchesDept && matchesRole && matchesBoard;
  });

  // Unique Filter Options
  const departments: string[] = Array.from(
    new Set(members.map((m: ProjectTeamMember) => m.department))
  ).filter((d): d is string => Boolean(d));

  const roles: string[] = Array.from(
    new Set(members.map((m: ProjectTeamMember) => m.role))
  ).filter((r): r is string => Boolean(r));

  const totalMembers = members.length;
  const boardMembersCount = members.filter((m: ProjectTeamMember) => m.is_board_member).length;
  const activeMembersCount = members.filter((m: ProjectTeamMember) => m.status === 'Active').length;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
              Total Team Size
            </div>
            <div className="text-xl font-black text-slate-900">{totalMembers} Engineers</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
              Steering Board
            </div>
            <div className="text-xl font-black text-slate-900">{boardMembersCount} Members</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
              Active Resource Rate
            </div>
            <div className="text-xl font-black text-slate-900">
              {totalMembers > 0 ? Math.round((activeMembersCount / totalMembers) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
              Cross-Departments
            </div>
            <div className="text-xl font-black text-slate-900">{departments.length} Units</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Add Button */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team by employee name or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: string) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Board Member Segmented Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <button
              onClick={() => setBoardFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                boardFilter === 'ALL'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setBoardFilter('BOARD')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                boardFilter === 'BOARD'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setBoardFilter('CORE')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                boardFilter === 'CORE'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Core
            </button>
          </div>

          {canManageTeam ? (
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold"
              title="Team modifications are restricted to PMO Administrators (Inteva PM Requirement)"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Team Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Read-Only Notice for Non-PM / Unauthorized Users */}
      {!canManageTeam && (
        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-2.5 font-medium shadow-2xs">
          <Lock className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            <strong>Read-Only Workspace:</strong> Adding/replacing team members and modifying steering board composition are restricted to PMO Administrators and the assigned Project Manager.
          </span>
        </div>
      )}

      {/* Team Table View */}
      {isLoading ? (
        <div className="p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading project team members...</p>
        </div>
      ) : isError ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Failed to load Team Members</h3>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
          <Users className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Team Members Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No engineering team members match your current filter criteria.
          </p>
          {canManageTeam && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Add First Team Member
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee & Contact</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Function</th>
                  <th className="py-3.5 px-4">Program Role</th>
                  <th className="py-3.5 px-4">Board Status</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">{canManageTeam ? 'Actions' : 'Governance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {filteredMembers.map((member: ProjectTeamMember) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/60 transition group"
                  >
                    {/* Avatar & Employee Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {member.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {member.employee_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{member.user_email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px]">
                        <Building className="h-3 w-3 text-slate-500" />
                        {member.department}
                      </span>
                    </td>

                    {/* Function */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-bold text-[11px]">
                        <Briefcase className="h-3 w-3 text-sky-600" />
                        {member.function_name}
                      </span>
                    </td>

                    {/* Program Role */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                      {member.role}
                    </td>

                    {/* Board Member Toggle Badge */}
                    <td className="py-3.5 px-4">
                      {canManageBoard ? (
                        <button
                          onClick={() => handleToggleBoard(member.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            member.is_board_member
                              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Steering Board Member status"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {member.is_board_member ? 'Board Member' : 'Core Member'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                            member.is_board_member
                              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title="Steering Board status is managed by PMO Administrators"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {member.is_board_member ? 'Board Member' : 'Core Member'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                          member.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : member.status === 'On Leave'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {member.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {canManageTeam ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setReplacingMember(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Replace Member & Reassign Tasks"
                          >
                            <UserCheck className="h-4 w-4 text-amber-600" />
                          </button>

                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                            title="Edit Member Details"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setDeletingMemberId(member.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                          Read Only
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <TeamMemberDialog
        isOpen={isAddOpen}
        onClose={handleCloseAddDialog}
        onSubmit={handleAddSubmit}
        isLoading={addMutation.isPending}
      />

      {/* Edit Dialog */}
      <TeamMemberDialog
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSubmit={handleEditSubmit}
        initialData={editingMember}
        isLoading={updateMutation.isPending}
      />

      {/* Replace Dialog */}
      <ReplaceTeamMemberDialog
        isOpen={!!replacingMember}
        outgoingMember={replacingMember}
        onClose={() => setReplacingMember(null)}
        onSubmitReplace={handleReplaceSubmit}
        isLoading={replaceMutation.isPending}
      />

      {/* Remove Confirmation Dialog */}
      {deletingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Remove Team Member?</h3>
            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to remove this employee from the project team?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingMemberId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removeMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {removeMutation.isPending ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
