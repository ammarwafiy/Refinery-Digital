'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Droplets, Plus, X, Database, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { addProduct, getProducts } from '@/lib/data-service';
import { Product } from '@/types/refinery';

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
  onProductCreated?: (newProduct: Product) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'specialty', label: 'Specialty Fats' },
  { value: 'olein', label: 'Palm Olein' },
  { value: 'stearin', label: 'Palm Stearin' },
  { value: 'blend', label: 'Blended Oil' },
  { value: 'kernel', label: 'Palm Kernel' },
  { value: 'shortening', label: 'Shortening' },
  { value: 'consumer', label: 'Consumer Pack' },
  { value: 'by-product', label: 'By-Product (PFAD)' },
];

export default function ProductOptionSelector({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  onProductCreated,
}: ProductOptionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [localOptions, setLocalOptions] = useState<ProductOption[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCode, setNewProductCode] = useState('');
  const [isCodeCustomized, setIsCodeCustomized] = useState(false);
  const [newProductCategory, setNewProductCategory] = useState('specialty');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize options prop with localOptions without dropping newly created options
  useEffect(() => {
    if (options && options.length > 0) {
      setLocalOptions((prev) => {
        const map = new Map<string, ProductOption>();
        for (const opt of options) {
          map.set(opt.id, opt);
        }
        for (const opt of prev) {
          if (!map.has(opt.id)) {
            map.set(opt.id, opt);
          }
        }
        return Array.from(map.values());
      });
    }
  }, [options]);

  // Listen for realtime Supabase product updates & cross-tab synchronization
  useEffect(() => {
    const handleSync = (e: any) => {
      const live = e.detail || getProducts();
      if (Array.isArray(live) && live.length > 0) {
        setLocalOptions((prev) => {
          const map = new Map<string, ProductOption>();
          for (const p of live) {
            map.set(p.id, {
              id: p.id,
              name: p.name,
              grade: p.category || (p as any).grade,
            });
          }
          for (const opt of prev) {
            if (!map.has(opt.id)) {
              map.set(opt.id, opt);
            }
          }
          return Array.from(map.values());
        });
      }
    };

    window.addEventListener('refinery_products_synced', handleSync);
    return () => {
      window.removeEventListener('refinery_products_synced', handleSync);
    };
  }, []);

  const selectedProduct = localOptions.find((p) => p.id === value) || localOptions[0];

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

  const filteredOptions = localOptions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.grade && p.grade.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  // Auto-generate code from product name if operator hasn't manually customized code
  const handleNameChange = (val: string) => {
    setNewProductName(val);
    setFormError(null);
    if (!isCodeCustomized) {
      const generated = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setNewProductCode(generated);
    }
  };

  const handleOpenAddModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewProductName('');
    setNewProductCode('');
    setIsCodeCustomized(false);
    setNewProductCategory('specialty');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProductName.trim();
    if (!cleanName) {
      setFormError('Please enter a product specification name.');
      return;
    }

    // Check for duplicate name
    if (localOptions.some((o) => o.name.toLowerCase() === cleanName.toLowerCase())) {
      setFormError('A product specification with this name already exists.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const code = newProductCode.trim() || cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const created = await addProduct({
        name: cleanName,
        code: code,
        category: newProductCategory,
        active: true,
      });

      // Update local state immediately
      const newOpt: ProductOption = {
        id: created.id,
        name: created.name,
        grade: created.category,
      };
      setLocalOptions((prev) => [newOpt, ...prev]);

      // Trigger selection of newly added product
      onChange(created.id);
      if (onProductCreated) {
        onProductCreated(created);
      }

      // Close modal and dropdown
      setIsAddModalOpen(false);
      setIsOpen(false);
      setSearchFilter('');
    } catch (err: any) {
      console.error('[ProductOptionSelector] Failed to add product:', err);
      setFormError(err?.message || 'Failed to save product to Supabase. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Dropdown with Radio Option Animation, Search Input, and Add Product Action */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full z-[9999] animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#0b0f19] border border-[#21262d] p-2.5 shadow-2xl rounded-xl">
            {/* Pinned search input with Glowing Red Border from User Image */}
            <div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search product specification..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#0d1117] border-[1.5px] border-[#d81f2c] rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none shadow-[0_0_10px_rgba(216,31,44,0.3)] transition-all"
              />
            </div>

            {/* Operator Add Product Button directly under Search */}
            <div className="pt-2 pb-1">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-[#009fe3]/15 to-[#00d2ff]/10 hover:from-[#009fe3]/30 hover:to-[#00d2ff]/25 border border-[#009fe3]/40 hover:border-[#009fe3] text-[#00d2ff] hover:text-white text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(0,159,227,0.3)] active:scale-[0.99] group"
              >
                <Plus className="h-3.5 w-3.5 text-[#00d2ff] group-hover:scale-110 transition-transform" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Scrollable list of products (No IDs displayed) */}
            <div
              role="listbox"
              className="space-y-0.5 max-h-64 overflow-y-auto overscroll-contain pr-1 radio-option-scroll-list mt-1"
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

      {/* Operator Add Product Modal Dialog with Direct Supabase Sync */}
      {mounted && isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-[#0b0f19] border border-[#21262d] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,159,227,0.15)] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#21262d] bg-[#0d1322]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#009fe3]/15 border border-[#009fe3]/30 text-[#00d2ff] shadow-[0_0_12px_rgba(0,159,227,0.2)]">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    Add New Product
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#009fe3]/20 text-[#00d2ff] border border-[#009fe3]/40">
                      Sync to Supabase
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Registers product across Process Logs, QC Lab, and all connected plant tablets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4.5">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. RBD Palm Olein CP8 or Chocohi 400"
                  value={newProductName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#009fe3] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#009fe3] transition-all"
                />
              </div>

              {/* Product Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Product Code
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Auto-generated from name
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. RBD_PALM_OLEIN_CP8"
                  value={newProductCode}
                  onChange={(e) => {
                    setIsCodeCustomized(true);
                    setNewProductCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
                  }}
                  className="w-full font-mono bg-[#0d1117] border border-[#30363d] focus:border-[#009fe3] rounded-lg px-3.5 py-2.5 text-sm text-cyan-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#009fe3] transition-all uppercase"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Category / Oil Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = newProductCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNewProductCategory(cat.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                          isSelected
                            ? 'bg-[#009fe3]/20 border-[#009fe3] text-[#00d2ff] shadow-[0_0_10px_rgba(0,159,227,0.2)]'
                            : 'bg-[#0d1117] border-[#21262d] text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#21262d]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-[#30363d] text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newProductName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#009fe3] to-[#00b4d8] hover:from-[#008cc9] hover:to-[#009fe3] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(0,159,227,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Syncing to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      <span>Add & Sync Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
