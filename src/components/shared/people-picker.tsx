'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Check, ChevronsUpDown, X, Loader2, AlertCircle } from 'lucide-react';
import teamService from '@/services/team.service';
import { EmployeeOption } from '@/types/team.types';

interface PeoplePickerProps {
  label: string;
  value?: string;
  onChange: (value: string, userOption?: EmployeeOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function PeoplePicker({
  label,
  value = '',
  onChange,
  placeholder = 'Search users by name or email...',
  disabled = false,
  required = false,
  error,
  helperText,
}: PeoplePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EmployeeOption | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load available users from system directory
  useEffect(() => {
    let isMounted = true;
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const list = await teamService.getAvailableEmployees(searchQuery);
        if (isMounted) {
          setUsers(list);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchUsers, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Sync selected user details with current value
  useEffect(() => {
    if (!value) {
      setSelectedUser(null);
      return;
    }

    // Try finding in current user list
    const found = users.find(
      (u) =>
        u.email?.toLowerCase() === value.toLowerCase() ||
        u.name?.toLowerCase() === value.toLowerCase() ||
        u.full_name?.toLowerCase() === value.toLowerCase()
    );

    if (found) {
      setSelectedUser(found);
    } else if (!selectedUser) {
      // Fallback display if not yet loaded in current page of users
      setSelectedUser({
        name: value,
        email: value.includes('@') ? value : value,
        full_name: value,
      });
    }
  }, [value, users]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (user: EmployeeOption) => {
    setSelectedUser(user);
    onChange(user.email || user.name, user);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(null);
    onChange('', null);
    setSearchQuery('');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-1.5 font-sans" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="relative">
        {/* Closed / Trigger Button */}
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl border transition cursor-pointer select-none min-h-[38px] ${
            disabled
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              : error
              ? 'bg-white border-rose-300 hover:border-rose-400 shadow-2xs'
              : isOpen
              ? 'bg-white border-sky-500 ring-2 ring-sky-100 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          {selectedUser ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-sky-200">
                {getInitials(selectedUser.full_name)}
              </div>
              <div className="truncate flex items-baseline gap-1.5">
                <span className="font-bold text-slate-800">{selectedUser.full_name}</span>
                {selectedUser.email && (
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    ({selectedUser.email})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedUser && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition"
                title="Clear user"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to filter system users..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
                {isLoading && (
                  <Loader2 className="absolute right-2.5 h-3.5 w-3.5 text-sky-600 animate-spin" />
                )}
              </div>
            </div>

            {/* Users List */}
            <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50 text-xs">
              {users.length === 0 && !isLoading ? (
                <div className="py-6 px-4 text-center text-slate-400">
                  <UserIcon className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                  <p className="font-medium text-[11px]">No system users found</p>
                  <p className="text-[10px] text-slate-400">Try refining your search</p>
                </div>
              ) : (
                users.map((u) => {
                  const isSelected =
                    selectedUser?.email === u.email || selectedUser?.name === u.name;
                  return (
                    <div
                      key={u.name}
                      onClick={() => handleSelect(u)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'bg-sky-50 text-sky-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-6 w-6 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {getInitials(u.full_name)}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {u.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono leading-tight">
                            {u.email || u.name}
                          </p>
                        </div>
                      </div>

                      {isSelected && <Check className="h-4 w-4 text-sky-600 shrink-0 ml-2" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
