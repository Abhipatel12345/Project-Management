'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useErpItems } from '@/hooks/use-project-connections';
import {
  Search,
  Package,
  X,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface ERPItem {
  name: string;
  item_name: string;
  item_group?: string;
  stock_uom?: string;
  description?: string | null;
}

interface ItemSearchSelectProps {
  value: string;
  onChange: (itemCode: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

export function ItemSearchSelect({
  value,
  onChange,
  placeholder = 'Search item by code or name (e.g. lub, PDM-ITEM-020)...',
  required = false,
  className,
  error,
}: ItemSearchSelectProps) {
  const { data: erpItems = [], isLoading } = useErpItems();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the currently selected item object
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return erpItems.find((item) => item.name === value) || null;
  }, [value, erpItems]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items matching both Item Code and Item Name/Description
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return erpItems.slice(0, 20); // Initial 20 items
    }

    const matches = erpItems.filter((item) => {
      const code = (item.name || '').toLowerCase();
      const name = (item.item_name || '').toLowerCase();
      const group = (item.item_group || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();

      return (
        code.includes(query) ||
        name.includes(query) ||
        group.includes(query) ||
        desc.includes(query)
      );
    });

    return matches.slice(0, 20); // Limit to top 20 results for performance
  }, [erpItems, searchQuery]);

  const handleSelect = (item: ERPItem) => {
    onChange(item.name);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleOpenSearch = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className={cn('relative font-sans text-xs', className)} ref={containerRef}>
      {/* Selected Item View vs Search Input View */}
      {selectedItem && !isOpen ? (
        <div
          onClick={handleOpenSearch}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-sky-400 hover:bg-sky-50/30 transition flex items-center justify-between gap-3 cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-lg bg-sky-100 text-sky-700 shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono font-bold text-slate-900 truncate">
                  {selectedItem.name}
                </span>
                <span className="text-slate-600 font-semibold truncate">
                  — {selectedItem.item_name || selectedItem.name}
                </span>
                {selectedItem.stock_uom && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-500 border border-slate-200 shrink-0">
                    {selectedItem.stock_uom}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600 transition" />
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              'w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs transition',
              error ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200'
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 flex flex-col"
          >
            {/* Header info */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
              <span>
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-sky-600 font-semibold">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching items...
                  </span>
                ) : (
                  <span>
                    Showing {filteredItems.length} matching item{filteredItems.length === 1 ? '' : 's'}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400">ERPNext Item Master</span>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 custom-scrollbar">
              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <Loader2 className="h-5 w-5 text-sky-600 animate-spin" />
                  <span className="text-xs font-semibold">Searching items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-8 px-4 text-center space-y-1 text-slate-500">
                  <AlertCircle className="h-5 w-5 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No matching items found</p>
                  <p className="text-[11px] text-slate-400">
                    Try searching with another item code, part name or description.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.name === value;

                  return (
                    <div
                      key={item.name}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'p-3 hover:bg-sky-50/70 transition cursor-pointer flex items-center justify-between gap-3',
                        isSelected ? 'bg-sky-50/90 font-bold' : ''
                      )}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {item.name}
                          </span>
                          {item.stock_uom && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              UOM: {item.stock_uom}
                            </span>
                          )}
                          {item.item_group && item.item_group !== 'All Item Groups' && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {item.item_group}
                            </span>
                          )}
                        </div>

                        {item.item_name && item.item_name !== item.name && (
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {item.item_name}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
