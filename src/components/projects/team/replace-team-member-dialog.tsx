import React, { useState } from 'react';
import { ProjectTeamMember, TeamMemberFormData, EmployeeOption } from '@/types/team.types';
import { useAvailableEmployees } from '@/hooks/use-project-team';
import { UserCheck, UserX, UserPlus, Loader2, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReplaceTeamMemberDialogProps {
  isOpen: boolean;
  outgoingMember: ProjectTeamMember | null;
  onClose: () => void;
  onSubmitReplace: (
    outgoingMemberId: string,
    replacementData: TeamMemberFormData,
    reassignOpenTasks: boolean
  ) => Promise<void>;
  isLoading?: boolean;
}

export function ReplaceTeamMemberDialog({
  isOpen,
  outgoingMember,
  onClose,
  onSubmitReplace,
  isLoading = false,
}: ReplaceTeamMemberDialogProps) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [role, setRole] = useState('');
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [reassignTasks, setReassignTasks] = useState(true);

  const { data: availableEmployees = [] } = useAvailableEmployees(employeeSearch);

  React.useEffect(() => {
    if (outgoingMember) {
      setDepartment(outgoingMember.department || 'Engineering');
      setFunctionName(outgoingMember.function_name || 'Engineering Release');
      setRole(outgoingMember.role || 'Program Specialist');
      setIsBoardMember(outgoingMember.is_board_member || false);
      setSelectedUserEmail('');
      setEmployeeName('');
    }
  }, [outgoingMember]);

  if (!isOpen || !outgoingMember) return null;

  const handleSelectEmployee = (email: string) => {
    setSelectedUserEmail(email);
    const emp = availableEmployees.find((e: EmployeeOption) => e.email === email || e.name === email);
    if (emp) {
      setEmployeeName(emp.full_name);
      if (emp.department) setDepartment(emp.department);
      if (emp.designation) setRole(emp.designation);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail || !employeeName) return;

    const replacementData: TeamMemberFormData = {
      user_email: selectedUserEmail,
      employee_name: employeeName,
      department,
      function_name: functionName,
      role,
      is_board_member: isBoardMember,
      status: 'Active',
    };

    await onSubmitReplace(outgoingMember.id, replacementData, reassignTasks);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-sky-50/80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Replace Team Member</h3>
                <p className="text-xs text-sky-800 font-medium">
                  Transfer project responsibilities & reassign open tasks with audit tracking.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Outgoing vs Incoming Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-rose-500 flex items-center gap-1">
                  <UserX className="h-3 w-3" /> Outgoing Member
                </span>
                <div className="font-extrabold text-slate-900">{outgoingMember.employee_name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{outgoingMember.user_email}</div>
              </div>

              <ArrowRight className="h-5 w-5 text-slate-400 shrink-0" />

              <div className="space-y-0.5 text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center justify-end gap-1">
                  <UserPlus className="h-3 w-3" /> Replacement Candidate
                </span>
                <div className="font-extrabold text-slate-900">
                  {employeeName || 'Select Replacement below'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{selectedUserEmail || 'N/A'}</div>
              </div>
            </div>

            {/* Select Available Replacement Employee */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Replacement Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedUserEmail}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
              >
                <option value="">-- Choose Replacement Employee --</option>
                {availableEmployees
                  .filter((e: EmployeeOption) => e.email !== outgoingMember.user_email)
                  .map((emp: EmployeeOption) => (
                    <option key={emp.email} value={emp.email}>
                      {emp.full_name} ({emp.email}) — {emp.designation || 'Specialist'}
                    </option>
                  ))}
              </select>
            </div>

            {/* Role & Function Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Program Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold"
                />
              </div>
            </div>

            {/* Task Reassignment Toggle */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-black text-amber-950">Bulk Reassign Open Tasks</div>
                <div className="text-[11px] text-amber-800 font-medium">
                  Automatically transfer all active work packages assigned to {outgoingMember.employee_name} to the replacement engineer and log audit comments.
                </div>
              </div>
              <input
                type="checkbox"
                checked={reassignTasks}
                onChange={(e) => setReassignTasks(e.target.checked)}
                className="h-4 w-4 accent-amber-600 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Form Triggers */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedUserEmail}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Replacement
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
