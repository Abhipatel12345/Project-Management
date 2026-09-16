'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Check, ChevronsUpDown, X, Search, AlertCircle } from 'lucide-react';
import { useCharterChoices } from '@/hooks/use-charter-choices';

interface ManufacturingPlantSelectProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function ManufacturingPlantSelect({
  label,
  value = '',
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
}: ManufacturingPlantSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: choicesData, isLoading } = useCharterChoices();
  const plants = choicesData?.manufacturing_plants || [];

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPlants = plants.filter((plant) =>
    plant.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelect = (plant: string) => {
    onChange(plant);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-1.5 font-sans" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="relative">
        {/* Trigger Button */}
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
          {value ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-slate-800 truncate">{value}</span>
            </div>
          ) : (
            <span className="text-slate-400 font-normal">Select automotive manufacturing plant...</span>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition"
                title="Clear plant"
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
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to filter plants..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              </div>
            </div>

            {/* Plants List */}
            <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50 text-xs">
              {isLoading ? (
                <div className="py-4 text-center text-slate-400 text-xs">Loading manufacturing plants...</div>
              ) : filteredPlants.length === 0 ? (
                <div className="py-6 px-4 text-center text-slate-400">
                  <Building2 className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                  <p className="font-medium text-[11px]">No manufacturing plant matches your search</p>
                </div>
              ) : (
                filteredPlants.map((plant) => {
                  const isSelected = value === plant;
                  return (
                    <div
                      key={plant}
                      onClick={() => handleSelect(plant)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="truncate">{plant}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />}
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
