'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ProjectTeamMember, TeamMemberFormData, EmployeeOption } from '@/types/team.types';
import { useAvailableEmployees } from '@/hooks/use-project-team';
import { X, UserPlus, Edit3, Loader2, Search, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TeamMemberFormData) => Promise<void>;
  initialData?: ProjectTeamMember | null;
  isLoading?: boolean;
}

const DEPARTMENTS = [
  'Vehicle Integration',
  'Powertrain',
  'Battery Systems',
  'Chassis & Dynamics',
  'Electrical & E/E',
  'Body & Trim',
  'Quality Assurance',
  'Manufacturing Engineering',
];

const FUNCTIONS = [
  'Lead Engineering',
  'R&D Architecture',
  'Validation & Testing',
  'Design Release',
  'Compliance & APQP',
  'Systems Engineering',
  'Program Management',
];

const ROLES = [
  'Chief Program Engineer',
  'Program Lead',
  'Lead Architect',
  'Validation Lead',
  'Systems Lead',
  'Design Engineer',
  'Quality Lead (APQP)',
  'Technical Specialist',
];

export function TeamMemberDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: TeamMemberDialogProps) {
  const isEditing = !!initialData;
  const [employeeSearch, setEmployeeSearch] = useState('');
  const { data: employees = [] } = useAvailableEmployees(employeeSearch);
  const [selectedEmpEmail, setSelectedEmpEmail] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
  } = useForm<TeamMemberFormData>({
    defaultValues: {
      user_email: '',
      employee_name: '',
      department: 'Vehicle Integration',
      function_name: 'Lead Engineering',
      role: 'Program Lead',
      is_board_member: false,
      status: 'Active',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        user_email: initialData.user_email,
        employee_name: initialData.employee_name,
        department: initialData.department || 'Vehicle Integration',
        function_name: initialData.function_name || 'Lead Engineering',
        role: initialData.role || 'Program Lead',
        is_board_member: !!initialData.is_board_member,
        status: initialData.status || 'Active',
      });
      setSelectedEmpEmail(initialData.user_email);
    } else {
      reset({
        user_email: '',
        employee_name: '',
        department: 'Vehicle Integration',
        function_name: 'Lead Engineering',
        role: 'Program Lead',
        is_board_member: false,
        status: 'Active',
      });
      setSelectedEmpEmail('');
      setEmployeeSearch('');
    }
  }, [initialData, reset, isOpen]);

  const handleSelectEmployee = (emp: EmployeeOption) => {
    setSelectedEmpEmail(emp.email);
    setValue('user_email' as any, emp.email);
    setValue('employee_name' as any, emp.full_name);
    if (emp.department) setValue('department' as any, emp.department);
    if (emp.designation) setValue('role' as any, emp.designation);
  };

  const onFormSubmit = async (data: TeamMemberFormData) => {
    if (!data.user_email || !data.employee_name) return;
    await onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Dialog Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {isEditing ? <Edit3 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  {isEditing ? `Edit Team Member: ${initialData.employee_name}` : 'Add Project Team Member'}
                </h3>
                <p className="text-xs text-slate-400">
                  Assign engineering roles, function responsibility, and board membership.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Dialog Form Body */}
          <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Employee Selector Search (when adding new member) */}
            {!isEditing && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Select Employee / User <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search by employee name or email..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                  />
                </div>

                {/* Employee Pick List */}
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/40 divide-y divide-slate-800/50 text-xs">
                  {employees.length === 0 ? (
                    <div className="p-3 text-slate-500 text-center">No matching employees found</div>
                  ) : (
                    employees.map((emp: EmployeeOption) => {
                      const isSelected = selectedEmpEmail === emp.email;
                      return (
                        <div
                          key={emp.email}
                          onClick={() => handleSelectEmployee(emp)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                            isSelected ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400">
                              {emp.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200">{emp.full_name}</div>
                              <div className="text-[10px] text-slate-500">{emp.email}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-cyan-400" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Employee Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Employee Name <span className="text-rose-400">*</span>
                </label>
                <input
                  {...register('employee_name', { required: true })}
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  User Email <span className="text-rose-400">*</span>
                </label>
                <input
                  {...register('user_email', { required: true })}
                  type="email"
                  placeholder="e.g. s.jenkins@autopdm.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Department & Function */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Department <span className="text-rose-400">*</span>
                </label>
                <select
                  {...register('department')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-slate-100">
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Engineering Function <span className="text-rose-400">*</span>
                </label>
                <select
                  {...register('function_name')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                >
                  {FUNCTIONS.map((f) => (
                    <option key={f} value={f} className="bg-slate-900 text-slate-100">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Program Role <span className="text-rose-400">*</span>
                </label>
                <select
                  {...register('role')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="bg-slate-900 text-slate-100">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Member Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                >
                  <option value="Active" className="bg-slate-900 text-slate-100">Active</option>
                  <option value="On Leave" className="bg-slate-900 text-slate-100">On Leave</option>
                  <option value="Inactive" className="bg-slate-900 text-slate-100">Inactive</option>
                </select>
              </div>
            </div>

            {/* Board Member Toggle Switch */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Steering Board Member</div>
                  <div className="text-[11px] text-slate-400">
                    Grant voting sign-off rights for APQP gate reviews.
                  </div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_board_member')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-yellow-500"></div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800/60 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditing ? 'Save Member Changes' : 'Add to Team'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
