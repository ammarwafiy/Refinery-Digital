'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Droplets } from 'lucide-react';

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
      (p.grade && p.grade.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button - Clean Product Name without UUID */}
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
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#009fe3]' : ''
          }`}
        />
      </button>

      {/* Dropdown with Radio Option Animation and Smooth Scroll */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full z-[9999] animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#0b0f19] border border-[#21262d] p-2.5 shadow-2xl rounded-xl">
            {/* Pinned search input with Glowing Red Border from User Image */}
            <div className="mb-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search product specification..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#0d1117] border-[1.5px] border-[#d81f2c] rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none shadow-[0_0_10px_rgba(216,31,44,0.3)] transition-all"
              />
            </div>

            {/* Scrollable list of products (No IDs displayed) */}
            <div
              role="listbox"
              className="space-y-0.5 max-h-64 overflow-y-auto overscroll-contain pr-1 radio-option-scroll-list"
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#30363d transparent',
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  No matching product specifications found
                </div>
              ) : (
                filteredOptions.map((opt) => {
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
                      <Droplets className="h-4 w-4 text-[#00d2ff] shrink-0" />
                      <span className="flex-1 truncate font-medium text-xs sm:text-sm text-left">
                        {opt.name}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-[#00d2ff] shrink-0 ml-1" />
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
