'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PRODUCT_GROUPS } from '@/types/project.types';
import { Search, ChevronDown, Check, X, Layers } from 'lucide-react';

export interface ProductGroupSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function ProductGroupSearchSelect({
  value,
  onChange,
  disabled = false,
  error,
  placeholder = 'Select Product Group...',
  className = '',
  id = 'custom_product_group',
}: ProductGroupSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PRODUCT_GROUPS;
    return PRODUCT_GROUPS.filter((group) => group.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleSelect = (group: string) => {
    onChange(group);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left border ${
          error
            ? 'bg-rose-50/70 border-2 border-rose-500 text-rose-900 focus:ring-1 focus:ring-rose-500'
            : isOpen
            ? 'bg-white border-sky-500 ring-2 ring-sky-500/20 text-slate-900 shadow-xs'
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-800'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <Layers className={`h-3.5 w-3.5 shrink-0 ${value ? 'text-sky-600' : 'text-slate-400'}`} />
          {value ? (
            <span className="truncate text-slate-900 font-bold">{value}</span>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange('');
                }
              }}
              className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </div>
      </button>

      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search product group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-semibold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 bg-white divide-y-0">
            {filteredGroups.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs font-bold text-slate-500">No product groups found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  No matches for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isSelected = value === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => handleSelect(group)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-sky-50 text-sky-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">{group}</span>
                    {isSelected && <Check className="h-4 w-4 text-sky-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
