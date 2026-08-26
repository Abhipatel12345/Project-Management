'use client';

import React, { useState, useEffect } from 'react';
import { userManagementService, UserRecord, UpdateERPNextUserInput } from '@/services/user-management.service';
import { useToast } from '@/providers/toast-context';
import { PDMRole } from '@/types/auth.types';
import {
  X,
  UserCheck,
  Loader2,
  Mail,
  User,
  Shield,
  Info,
  Sliders,
  AlertCircle,
  Globe,
  Clock,
  Phone,
  Smartphone,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface EditUserModalProps {
  user: UserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabKey = 'details' | 'roles' | 'more' | 'settings';

export function EditUserModal({ user, isOpen, onClose, onSuccess }: EditUserModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [language, setLanguage] = useState('en');
  const [timeZone, setTimeZone] = useState('UTC');
  const [role, setRole] = useState<PDMRole>('teammember');

  // More Info
  const [phone, setPhone] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');

  // Settings
  const [deskTheme, setDeskTheme] = useState('Light');
  const [muteSounds, setMuteSounds] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || user.fullName?.split(' ')[0] || '');
      setMiddleName(user.middle_name || '');
      setLastName(user.last_name || user.fullName?.split(' ').slice(1).join(' ') || '');
      setEnabled(user.isActive);
      setLanguage(user.language || 'en');
      setTimeZone(user.time_zone || 'UTC');
      setRole(user.role || 'teammember');
      setPhone(user.phone || '');
      setMobileNo(user.mobile_no || '');
      setGender(user.gender || '');
      setBio(user.bio || '');
      setDeskTheme(user.desk_theme || 'Light');
      setMuteSounds(Boolean(user.mute_sounds));
      setErrorMessage(null);
      setActiveTab('details');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim()) {
      setErrorMessage('First Name is required.');
      setActiveTab('details');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UpdateERPNextUserInput = {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        enabled,
        language,
        time_zone: timeZone,
        role,
        phone: phone.trim() || undefined,
        mobile_no: mobileNo.trim() || undefined,
        gender: gender || undefined,
        bio: bio.trim() || undefined,
        desk_theme: deskTheme,
        mute_sounds: muteSounds,
      };

      await userManagementService.updateUser(user.email || user.username, payload);
      showToast(`User ${user.fullName} updated successfully in ERPNext!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user in ERPNext.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { key: 'details', label: 'User Details', icon: User },
    { key: 'roles', label: 'Roles & Permissions', icon: Shield },
    { key: 'more', label: 'More Information', icon: Info },
    { key: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-6"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EBF5FF] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{user.fullName}</h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    )}
                  >
                    {user.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {user.email} • ID: {user.username}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Tabs */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50/60 px-6 gap-2 shrink-0 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key as TabKey)}
                  className={cn(
                    'flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap',
                    isActive
                      ? 'border-sky-600 text-sky-700 bg-white shadow-2xs rounded-t-xl'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-sky-600' : 'text-slate-400')} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {/* Inline Error Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: USER DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800">Account Enabled Status</span>
                    <p className="text-[11px] text-slate-500">Allow or disable user access to PDM</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Email (System Key)</label>
                    <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
                      {user.email}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Username</label>
                    <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
                      {user.username}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>First Name</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Middle Name"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      <span>Language</span>
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    >
                      <option value="en">English (United States)</option>
                      <option value="en-GB">English (United Kingdom)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="fr">French (Français)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="hi">Hindi (हिंदी)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Time Zone</span>
                    </label>
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                      <option value="America/New_York">America/New_York (EST -5:00)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST -8:00)</option>
                      <option value="Europe/London">Europe/London (GMT +0:00)</option>
                      <option value="Europe/Berlin">Europe/Berlin (CET +1:00)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ROLES & PERMISSIONS */}
            {activeTab === 'roles' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 block">
                    Modify Application Role & Authority
                  </label>
                  <p className="text-xs text-slate-500">
                    Controls the user's dashboard persona and access permissions in PDM.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'it_admin',
                      title: 'IT Admin',
                      desc: 'User & identity management, security credentials, system accounts.',
                      badge: 'IT Admin Authority',
                    },
                    {
                      id: 'admin',
                      title: 'Administrator',
                      desc: 'PMO / Enterprise Governance, project creation, executive controls.',
                      badge: 'Full Executive Governance',
                    },
                    {
                      id: 'projectmanager',
                      title: 'Project Manager',
                      desc: 'Project planning, tasks, team allocation, and stage gate reviews.',
                      badge: 'PM Workspace Access',
                    },
                    {
                      id: 'teammember',
                      title: 'Team Member',
                      desc: 'Task execution, deliverable submissions, technical engineering issues.',
                      badge: 'Execution Desk',
                    },
                    {
                      id: 'gate_reviewer',
                      title: 'Gate Reviewer / Quality Manager',
                      desc: 'Dedicated review board member with stage-gate exit criteria sign-off.',
                      badge: 'Gate Approval Authority',
                    },
                    {
                      id: 'warehouse_user',
                      title: 'Warehouse Manager',
                      desc: 'Material requests review, inventory movement, and BOM tracking.',
                      badge: 'Warehouse & Materials',
                    },
                  ].map((r) => {
                    const isSelected = role === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setRole(r.id as PDMRole)}
                        className={cn(
                          'p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3',
                          isSelected
                            ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{r.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                              {r.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{r.desc}</p>
                        </div>
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                            isSelected
                              ? 'border-sky-600 bg-sky-600 text-white'
                              : 'border-slate-300 bg-white'
                          )}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: MORE INFORMATION */}
            {activeTab === 'more' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>Phone</span>
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                      <span>Mobile No</span>
                    </label>
                    <input
                      type="text"
                      value={mobileNo}
                      onChange={(e) => setMobileNo(e.target.value)}
                      placeholder="+1 (555) 111-2222"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    >
                      <option value="">Not Specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Bio / Notes</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Add background notes..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Desk Theme</label>
                    <select
                      value={deskTheme}
                      onChange={(e) => setDeskTheme(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                    >
                      <option value="Light">Light (Standard)</option>
                      <option value="Dark">Dark Mode</option>
                      <option value="Automatic">Automatic (System)</option>
                    </select>
                  </div>

                  <div className="space-y-1 flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 sm:col-span-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800">Mute Sounds</span>
                      <p className="text-[11px] text-slate-500">Mute notification audio feedback</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={muteSounds}
                        onChange={(e) => setMuteSounds(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
