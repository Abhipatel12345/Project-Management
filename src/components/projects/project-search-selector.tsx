'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project } from '@/types/project.types';
import { FolderKanban, Search, ChevronDown, Check, X, Building } from 'lucide-react';

export interface ProjectSearchSelectorProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
}

export function ProjectSearchSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  isLoading = false,
  placeholder = 'Search project...',
  includeAllOption = true,
  allOptionLabel = 'All Projects',
  className = '',
}: ProjectSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus search input when opening
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Find currently selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'ALL') return null;
    return projects.find((p) => p.name === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filter projects by Name or ID/Code case-insensitively
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((p) => {
      const nameMatch = (p.project_name || '').toLowerCase().includes(q);
      const codeMatch = (p.name || '').toLowerCase().includes(q);
      return nameMatch || codeMatch;
    });
  }, [projects, searchQuery]);

  const handleSelect = (projectId: string) => {
    onSelectProject(projectId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProject('ALL');
    setSearchQuery('');
  };

  const displayText = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'ALL') {
      return allOptionLabel;
    }
    if (selectedProject) {
      return selectedProject.project_name?.trim() || selectedProject.name;
    }
    return selectedProjectId;
  }, [selectedProjectId, selectedProject, allOptionLabel]);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Control */}
      <div className="flex items-center rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 shadow-2xs focus-within:ring-2 focus-within:ring-sky-500 min-w-[240px] max-w-full transition">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex-1 flex items-center gap-2 px-3.5 py-2.5 text-slate-800 text-xs font-bold truncate text-left cursor-pointer min-w-0"
          title={displayText}
        >
          <FolderKanban className="h-4 w-4 text-sky-600 shrink-0" />
          <span className="truncate text-slate-900 font-black tracking-tight">{displayText}</span>
        </button>

        <div className="flex items-center gap-1 pr-2.5 shrink-0">
          {includeAllOption && selectedProjectId !== 'ALL' && selectedProjectId !== '' && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Reset to All Projects"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 font-sans">
            {/* All Projects Option */}
            {includeAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition cursor-pointer ${
                  selectedProjectId === 'ALL' || !selectedProjectId
                    ? 'bg-sky-50 text-sky-800 font-black'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>{allOptionLabel}</span>
                </div>
                {(selectedProjectId === 'ALL' || !selectedProjectId) && (
                  <Check className="h-4 w-4 text-sky-600" />
                )}
              </button>
            )}

            {/* Filtered Project Items */}
            {filteredProjects.map((p) => {
              const isSelected = selectedProjectId === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelect(p.name)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-900 font-black'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate text-slate-900">
                      {p.project_name || p.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-600">
                        {p.name}
                      </span>
                      {p.status && (
                        <span className="text-[10px] font-sans capitalize text-slate-400">
                          • {p.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-sky-600 shrink-0 ml-1" />}
                </button>
              );
            })}

            {/* No Projects Found */}
            {filteredProjects.length === 0 && (
              <div className="py-6 px-4 text-center">
                <p className="text-xs font-bold text-slate-500">No projects found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  No matches for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
