'use client';

import React, { useState } from 'react';
import {
  useProjectTeam,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
  useToggleBoardStatus,
} from '@/hooks/use-project-team';
import { ProjectTeamMember, TeamMemberFormData } from '@/types/team.types';
import { TeamMemberDialog } from './team-member-dialog';
import {
  Users,
  UserPlus,
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
  // Filters & State
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [boardFilter, setBoardFilter] = useState<'ALL' | 'BOARD' | 'CORE'>('ALL');

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // TanStack Query Hooks
  const { data: members = [], isLoading, isError, refetch } = useProjectTeam(projectId);
  const addMutation = useAddTeamMember(projectId);
  const updateMutation = useUpdateTeamMember(projectId);
  const toggleBoardMutation = useToggleBoardStatus(projectId);
  const removeMutation = useRemoveTeamMember(projectId);

  // Sync external header trigger
  React.useEffect(() => {
    if (isCreateOpenExternal) {
      setIsAddOpen(true);
    }
  }, [isCreateOpenExternal]);

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
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Total Team Size
            </div>
            <div className="text-xl font-bold text-slate-100">{totalMembers} Engineers</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Steering Board
            </div>
            <div className="text-xl font-bold text-slate-100">{boardMembersCount} Members</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Active Resource Rate
            </div>
            <div className="text-xl font-bold text-slate-100">
              {totalMembers > 0 ? Math.round((activeMembersCount / totalMembers) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Cross-Departments
            </div>
            <div className="text-xl font-bold text-slate-100">{departments.length} Units</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Add Button */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team by employee name or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-400">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">
                All Departments
              </option>
              {departments.map((d: string) => (
                <option key={d} value={d} className="bg-slate-900 text-slate-200">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">
                All Roles
              </option>
              {roles.map((r: string) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Board Member Segmented Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <button
              onClick={() => setBoardFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                boardFilter === 'ALL'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setBoardFilter('BOARD')}
              className={`px-2.5 py-1 rounded-lg transition ${
                boardFilter === 'BOARD'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setBoardFilter('CORE')}
              className={`px-2.5 py-1 rounded-lg transition ${
                boardFilter === 'CORE'
                  ? 'bg-slate-800 text-slate-200 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Core
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Team Table View */}
      {isLoading ? (
        <div className="p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading project team members...</p>
        </div>
      ) : isError ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">Failed to load Team Members</h3>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Users className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Team Members Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No engineering team members match your current filter criteria.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium hover:bg-cyan-500/30 transition"
          >
            <UserPlus className="h-4 w-4" />
            Add First Team Member
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee & Contact</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Function</th>
                  <th className="py-3.5 px-4">Program Role</th>
                  <th className="py-3.5 px-4">Board Status</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {filteredMembers.map((member: ProjectTeamMember) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Avatar & Employee Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 text-xs shrink-0 shadow-sm">
                          {member.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-sm">
                            {member.employee_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{member.user_email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
                        <Building className="h-3 w-3 text-slate-500" />
                        {member.department}
                      </span>
                    </td>

                    {/* Function */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
                        <Briefcase className="h-3 w-3 text-slate-500" />
                        {member.function_name}
                      </span>
                    </td>

                    {/* Program Role */}
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {member.role}
                    </td>

                    {/* Board Member Toggle Badge */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleBoard(member.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                          member.is_board_member
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                        title="Click to toggle Steering Board Member status"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {member.is_board_member ? 'Board Member' : 'Core Member'}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          member.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : member.status === 'On Leave'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {member.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 transition"
                          title="Edit Member Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setDeletingMemberId(member.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition"
                          title="Remove Member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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

      {/* Remove Confirmation Dialog */}
      {deletingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100">Remove Team Member?</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to remove this employee from the project team?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingMemberId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removeMutation.isPending}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20"
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
