'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: any) => void;
  onValueChange?: (value: string) => void;
  onBlur?: (e: any) => void;
  options?: (SearchableOption | string)[];
  children?: React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownClassName?: string;
  error?: boolean | string;
  'aria-label'?: string;
  title?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
}

/**
 * Universal Searchable Select Component
 * Can be used as a drop-in replacement for native <select> elements across the PDM application.
 * Supports both `options` prop and standard `<option>` child elements.
 */
export const SearchableSelect = forwardRef<HTMLSelectElement, SearchableSelectProps>(
  function SearchableSelect(
    {
      id,
      name,
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      onBlur,
      options: propOptions,
      children,
      placeholder = 'Select an option...',
      searchPlaceholder = 'Search...',
      disabled = false,
      required = false,
      className = '',
      dropdownClassName = '',
      error,
      'aria-label': ariaLabel,
      title,
      allowClear = false,
      style,
    },
    ref
  ) {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      isControlled ? controlledValue : defaultValue || ''
    );
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement>(null);

    // Expose the hidden select ref to parent (e.g. for React Hook Form register)
    useImperativeHandle(ref, () => hiddenSelectRef.current as HTMLSelectElement);

    // Sync controlled value changes
    useEffect(() => {
      if (isControlled) {
        setInternalValue(controlledValue);
      }
    }, [isControlled, controlledValue]);

    // Parse options from either `options` prop or `children`
    const parsedOptions = useMemo<SearchableOption[]>(() => {
      if (propOptions && propOptions.length > 0) {
        return propOptions.map((opt) => {
          if (typeof opt === 'string') {
            return { value: opt, label: opt };
          }
          return opt;
        });
      }

      if (children) {
        const result: SearchableOption[] = [];
        React.Children.forEach(children, (child) => {
          if (!React.isValidElement(child)) return;

          // Handle <optgroup>
          if (child.type === 'optgroup') {
            const groupProps = child.props as any;
            if (groupProps.label) {
              result.push({
                value: `__OPTGROUP_HEADER_${groupProps.label}__`,
                label: groupProps.label,
                disabled: true,
              });
            }
            if (groupProps.children) {
              React.Children.forEach(groupProps.children, (groupChild) => {
                if (!React.isValidElement(groupChild)) return;
                const optProps = groupChild.props as any;
                const optVal = optProps.value !== undefined ? String(optProps.value) : '';
                const optLabel =
                  typeof optProps.children === 'string'
                    ? optProps.children
                    : optVal;
                result.push({
                  value: optVal,
                  label: optLabel,
                  disabled: !!optProps.disabled,
                });
              });
            }
            return;
          }

          // Handle <option>
          const optProps = child.props as any;
          const optVal = optProps.value !== undefined ? String(optProps.value) : '';
          const optLabel =
            typeof optProps.children === 'string'
              ? optProps.children
              : optVal || (optProps.children ? String(optProps.children) : '');

          result.push({
            value: optVal,
            label: optLabel,
            disabled: !!optProps.disabled,
          });
        });
        return result;
      }

      return [];
    }, [propOptions, children]);

    const activeValue = isControlled ? controlledValue : internalValue;

    // Find current selected option
    const selectedOption = useMemo(() => {
      return parsedOptions.find((opt) => opt.value === activeValue);
    }, [parsedOptions, activeValue]);

    // Filter options case-insensitively
    const filteredOptions = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return parsedOptions;

      return parsedOptions.filter((opt) => {
        // Always include group headers if they have matching children, or filter by text
        if (opt.value.startsWith('__OPTGROUP_HEADER_')) {
          return true;
        }
        const labelMatch = (opt.label || '').toLowerCase().includes(q);
        const valueMatch = (opt.value || '').toLowerCase().includes(q);
        const subMatch = (opt.subLabel || '').toLowerCase().includes(q);
        return labelMatch || valueMatch || subMatch;
      });
    }, [parsedOptions, searchQuery]);

    // Close on outside click or Escape
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
          onBlur?.({ target: { name: name || id || '', value: activeValue } });
        }
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
          setSearchQuery('');
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        setTimeout(() => searchInputRef.current?.focus(), 40);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onBlur, name, id, activeValue]);

    // Handle selection
    const handleSelect = (option: SearchableOption) => {
      if (option.disabled || option.value.startsWith('__OPTGROUP_HEADER_')) return;

      if (!isControlled) {
        setInternalValue(option.value);
      }

      // Update native hidden select to keep standard form data and RHF in sync
      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = option.value;
        const nativeEvent = new Event('change', { bubbles: true });
        hiddenSelectRef.current.dispatchEvent(nativeEvent);
      }

      // Call onValueChange if consumer passed it
      onValueChange?.(option.value);

      // Call standard onChange with synthetic event (compatible with e.target.value)
      if (onChange) {
        const syntheticEvent = {
          target: { name: name || id || '', value: option.value },
          currentTarget: { name: name || id || '', value: option.value },
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        onChange(syntheticEvent);
      }

      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    };

    // Clear selection
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      const emptyOpt = parsedOptions.find((opt) => opt.value === '') || { value: '', label: '' };
      handleSelect(emptyOpt);
    };

    // Keyboard navigation within the dropdown
    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      const selectableOptions = filteredOptions.filter(
        (o) => !o.disabled && !o.value.startsWith('__OPTGROUP_HEADER_')
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < selectableOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : selectableOptions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < selectableOptions.length) {
          handleSelect(selectableOptions[highlightedIndex]);
        } else if (selectableOptions.length === 1) {
          handleSelect(selectableOptions[0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    // Determine display label
    const displayLabel = useMemo(() => {
      if (selectedOption) {
        return selectedOption.label || selectedOption.value;
      }
      if (activeValue) {
        return activeValue;
      }
      return placeholder;
    }, [selectedOption, activeValue, placeholder]);

    const isPlaceholder = !selectedOption?.value && !activeValue;

    return (
      <div
        ref={containerRef}
        className={`relative inline-block w-full text-left font-sans select-none ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
        style={style}
      >
        {/* Hidden native select for form submissions & React Hook Form integration */}
        <select
          ref={hiddenSelectRef}
          id={id ? `${id}-native` : undefined}
          name={name}
          value={activeValue || ''}
          onChange={(e) => {
            // Already handled via handleSelect
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        >
          {parsedOptions.map((opt, i) => (
            <option key={`${opt.value}-${i}`} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Trigger Button */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          title={title || displayLabel}
          aria-label={ariaLabel || placeholder}
          aria-expanded={isOpen}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          onKeyDown={handleTriggerKeyDown}
          className={`flex items-center justify-between text-left transition cursor-pointer ${className}`}
        >
          <span className={`truncate mr-2 ${isPlaceholder ? 'text-slate-400 font-normal' : ''}`}>
            {displayLabel}
          </span>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {allowClear && activeValue && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-0.5 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-sky-600' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div
            className={`absolute left-0 mt-1.5 w-full min-w-[220px] rounded-2xl bg-white border border-slate-200 shadow-2xl z-[80] overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}
          >
            {/* Search Input Box */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-semibold"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div ref={listRef} className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 bg-white divide-y-0">
              {filteredOptions.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-xs font-bold text-slate-500">No options found</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    No matches for &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                filteredOptions.map((option, idx) => {
                  if (option.value.startsWith('__OPTGROUP_HEADER_')) {
                    return (
                      <div
                        key={`group-${option.label}-${idx}`}
                        className="px-3 py-1.5 text-[10px] font-black tracking-wider uppercase text-slate-400 bg-slate-50/50 rounded-lg mt-1"
                      >
                        {option.label}
                      </div>
                    );
                  }

                  const isSelected = activeValue === option.value;
                  const isHighlighted = highlightedIndex === idx;

                  return (
                    <button
                      key={`opt-${option.value}-${idx}`}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition cursor-pointer ${
                        option.disabled
                          ? 'opacity-40 cursor-not-allowed bg-transparent text-slate-400'
                          : isSelected
                          ? 'bg-sky-50 text-sky-900 font-bold'
                          : isHighlighted
                          ? 'bg-slate-100/90 text-slate-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="min-w-0 flex-1 truncate mr-2">
                        <div className="truncate">{option.label}</div>
                        {option.subLabel && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {option.subLabel}
                          </div>
                        )}
                      </div>
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
);

SearchableSelect.displayName = 'SearchableSelect';
