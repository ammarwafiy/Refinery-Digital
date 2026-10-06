'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Droplets, Sparkles, Package } from 'lucide-react';

export interface ProductOption {
  id: string;
  name: string;
  grade?: string;
}

interface ProductOptionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: ProductOption[];
  disabled?: boolean;
  className?: string;
  label?: string;
}

export default function ProductOptionSelector({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
}: ProductOptionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = options.find((p) => p.id === value) || options[0];

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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(
    (p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 bg-[var(--bg)] border border-[var(--line)] hover:border-[#009fe3]/50 focus:border-[#009fe3] rounded-lg px-3.5 py-2 text-sm text-[var(--text)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Droplets className="h-4 w-4 text-[#009fe3] shrink-0" />
          <span className="font-medium text-xs sm:text-sm text-[var(--text)] truncate">
            {selectedProduct?.name || 'Select Product Specification'}
          </span>
          {selectedProduct?.id && (
            <span className="font-mono text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] shrink-0 hidden sm:inline-block">
              {selectedProduct.id}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#009fe3]' : ''
          }`}
        />
      </button>

      {/* Dropdown with Radio Option Animation (Transition/animation/Radio Option) */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="radio-option-container bg-[#0d1117] border border-[#30363d] p-1.5 shadow-2xl rounded-lg max-h-72 overflow-y-auto">
            {/* Quick search input */}
            <div className="p-1 mb-1 border-b border-[#21262d]">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search product specification..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#009fe3]"
              />
            </div>

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching product specifications found
              </div>
            ) : (
              <div role="listbox" className="space-y-0.5">
                {filteredOptions.map((opt) => {
                  const isSelected = opt.id === value;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={`radio-option-btn w-full ${isSelected ? 'active text-white' : 'text-slate-300'}`}
                    >
                      <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M8 1c-2.8 3.5-5 6.2-5 8.8 0 2.9 2.2 5.2 5 5.2s5-2.3 5-5.2C13 7.2 10.8 4.5 8 1zm0 12c-1.7 0-3-1.3-3-3.2 0-1.8 1.6-3.9 3-5.8 1.4 1.9 3 4 3 5.8 0 1.9-1.3 3.2-3 3.2z"
                        />
                      </svg>
                      <span className="flex-1 truncate font-medium text-xs">
                        {opt.name}
                      </span>
                      {opt.id && (
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {opt.id}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-[#009fe3] shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
