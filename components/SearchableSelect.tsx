'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Droplet } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showSearch?: boolean;
  icon?: 'droplet' | 'none';
  required?: boolean;
  id?: string;
  'aria-label'?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  style,
  showSearch = true,
  icon = 'droplet',
  id,
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
      style={style}
    >
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2.5 bg-[var(--bg,#0a1018)] border border-[var(--line,#1f2e43)] hover:border-[#009fe3]/50 focus:border-[#009fe3] rounded-lg px-3 py-2 text-xs sm:text-sm text-[var(--text,#e2e8f0)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs select-none min-h-[38px]"
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {icon === 'droplet' && (
            <Droplet className="h-4 w-4 text-[#00d2ff] shrink-0" strokeWidth={2} />
          )}
          <span className="font-medium text-xs sm:text-sm text-[var(--text,#e2e8f0)] truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted,#64748b)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#009fe3]' : ''
          }`}
        />
      </button>

      {/* Dropdown Container Matching User Reference Design */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full min-w-[240px] z-[9999] animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#0b0f19] border border-[#21262d] p-2.5 shadow-2xl rounded-xl">
            {/* Top Search Input with Glowing Red Border from User Image */}
            {showSearch && (
              <div className="mb-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#0d1117] border-[1.5px] border-[#d81f2c] rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none shadow-[0_0_10px_rgba(216,31,44,0.3)] transition-all"
                />
              </div>
            )}

            {/* Scrollable List with Cyan Droplets */}
            <div
              role="listbox"
              className="space-y-0.5 max-h-60 overflow-y-auto overscroll-contain pr-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#30363d transparent',
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer select-none text-xs sm:text-sm ${
                        isSelected
                          ? 'bg-[rgba(0,159,227,0.18)] text-white font-medium border border-[#009fe3]/30'
                          : 'text-slate-200 hover:bg-[#161b22] hover:text-white'
                      } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {icon === 'droplet' && (
                        <Droplet
                          className="h-3.5 w-3.5 text-[#00d2ff] shrink-0"
                          strokeWidth={2}
                        />
                      )}
                      <span className="flex-1 truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                          {opt.sublabel}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-[#00d2ff] shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
