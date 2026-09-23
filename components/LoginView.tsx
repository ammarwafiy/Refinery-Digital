'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Cpu,
  BadgeCheck
} from 'lucide-react';
import { Profile, UserRole } from '@/types/refinery';
import { loginUser } from '@/lib/data-service';

interface LoginViewProps {
  onLogin: (profile: Profile) => void;
}

const QUICK_ROLE_PRESETS: { role: UserRole; label: string; code: string; defaultPass: string }[] = [
  { role: 'operator', label: 'Operator', code: 'OP-1042', defaultPass: 'operator123' },
  { role: 'supervisor', label: 'Supervisor', code: 'SV-2014', defaultPass: 'super123' },
  { role: 'qc_analyst', label: 'QC Analyst', code: 'QC-3201', defaultPass: 'qcpass123' },
  { role: 'qc_manager', label: 'QC Manager', code: 'QM-4503', defaultPass: 'qmpass123' },
  { role: 'admin', label: 'Plant Admin', code: 'AD-5011', defaultPass: 'admin123' },
];

export default function LoginView({ onLogin }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(identifier, password);
      setIsLoading(false);
      if (res.success && res.profile) {
        onLogin(res.profile);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    }, 350);
  };

  const handleApplyPreset = (code: string, pass: string) => {
    setIdentifier(code);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#080b12] text-slate-200 selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top SCADA Branding Bar */}
      <header className="w-full border-b border-[#182236] bg-[#0b0f1a] px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/15 border border-amber-500/40 shadow-sm">
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <span className="font-bold text-xs tracking-wider uppercase text-slate-100 block">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
              <span>NISSHIN DEODORIZER REFINERY</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">DOC: PRD-REF-001</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-[#070a12] px-3 py-1 rounded border border-[#1e2a42]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="hidden sm:inline font-medium">TERMINAL SCADA-01 · 21 CFR PART 11 COMPLIANT</span>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl border border-[#1d273e] bg-[#0c101c] p-6 sm:p-7 shadow-2xl relative">
          {/* Hardware Header Tag */}
          <div className="flex items-center justify-between border-b border-[#182338] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-sky-400" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Workstation Terminal Access
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>SYSTEM READY</span>
            </div>
          </div>

          <div className="text-left mb-5">
            <h1 className="text-lg font-bold text-white tracking-tight font-sans flex items-center gap-2">
              <span>Operator & Personnel Sign In</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed font-sans">
              Enter authorized employee credentials to access refinery process log, supervisor live board, or QC laboratory records.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-300 mb-1">
                Employee ID / Workstation Email:
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. OP-1042, SV-2014, QC-3201"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#070a12] border border-[#1e2a40] rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-semibold text-slate-300">
                  Password:
                </label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#070a12] border border-[#1e2a40] rounded-lg pl-9 pr-9 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-[#070a12] text-sky-500 focus:ring-0 cursor-pointer"
                />
                <span>Retain workstation session on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all shadow-md font-mono mt-2 cursor-pointer border border-sky-400/30 active:scale-[0.99] tracking-wider uppercase"
            >
              {isLoading ? (
                <span>Validating Plant Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Station Presets for Field Work */}
          <div className="mt-5 pt-3.5 border-t border-[#182338]">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Role Presets (Testing & Shifts):</span>
              <span className="text-slate-600">Tap to Autofill</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {QUICK_ROLE_PRESETS.map((p) => {
                const isSelected = identifier === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleApplyPreset(p.code, p.defaultPass)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-mono transition-all border text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#18263e] text-sky-300 border-sky-500/60 font-bold'
                        : 'bg-[#090d16] text-slate-400 border-[#182338] hover:bg-[#101726] hover:text-slate-200'
                    }`}
                  >
                    <span className="text-sky-400 font-bold">{p.code}</span>
                    <span className="text-slate-500 text-[9px] truncate">({p.label})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Notice Footer on Login Card */}
          <div className="mt-4 pt-3 border-t border-[#182338] flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>ISO 22000 / HACCP Protected</span>
            </span>
            <span className="text-slate-600">TERMINAL: WS-DEOD-01</span>
          </div>
        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="w-full border-t border-[#182236] bg-[#0b0f1a] py-3 px-6 text-center text-[11px] text-slate-500 font-mono">
        Lam Soon Edible Oils Sdn. Bhd. · Integrated Palm Oil Refinery Process & Quality Management System
      </footer>
    </div>
  );
}
