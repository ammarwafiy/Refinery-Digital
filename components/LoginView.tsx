'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  ShieldCheck, 
  User, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Cpu
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { loginUser } from '@/lib/data-service';

interface LoginViewProps {
  onLogin: (profile: Profile) => void;
}

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


  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#070b12] text-slate-200">
      {/* Top SCADA Branding Bar */}
      <header className="w-full border-b border-[#1e2d42] bg-[#0b111b] px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0f1724] border border-[#1e2d42]">
            <Flame className="h-4 w-4 text-[#009fe3]" />
          </div>
          <div>
            <span className="font-bold text-xs tracking-wider uppercase text-slate-200 block">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-[10px] font-mono text-[#08b5f5] flex items-center gap-1">
              <span>NISSHIN DEODORIZER REFINERY</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">DOC: PRD-REF-001</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-[#0f1724] px-3 py-1 rounded border border-[#1e2d42]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:inline font-medium">TERMINAL SCADA-01 · 21 CFR PART 11 COMPLIANT</span>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-lg border border-[#1e2d42] bg-[#0f1724] p-6 sm:p-7 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.03)] relative">
          {/* Hardware Header Tag */}
          <div className="flex items-center justify-between border-b border-[#1e2d42] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#009fe3]" />
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-200">
                Workstation Terminal Access
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-700/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>SYSTEM READY</span>
            </div>
          </div>

          <div className="text-left mb-5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight font-sans flex items-center gap-2">
              <span>Plant Personnel Sign In</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed font-sans">
              Please enter your Employee ID and password to access the refinery process control & QC laboratory systems.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded bg-red-950/30 p-3 text-xs text-red-300 border border-red-800/40 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1">
                Employee ID / Email:
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. OP-1042, SV-2014, QC-3201"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#0b111b] border border-[#1e2d42] rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009fe3] focus:ring-1 focus:ring-[#009fe3]/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-medium text-slate-300">
                  Password:
                </label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b111b] border border-[#1e2d42] rounded pl-9 pr-9 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009fe3] focus:ring-1 focus:ring-[#009fe3]/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
                  className="h-3.5 w-3.5 rounded border-[#1e2d42] bg-[#0b111b] text-[#009fe3] focus:ring-[#009fe3] cursor-pointer"
                />
                <span>Remember login session on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#009fe3] hover:bg-[#08b5f5] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded text-xs transition-all shadow-[0_1px_3px_rgba(0,0,0,0.3)] font-mono mt-2 cursor-pointer border border-[#08b5f5] tracking-wider uppercase"
            >
              {isLoading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Plant System</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice Footer on Login Card */}
          <div className="mt-4 pt-3 border-t border-[#1e2d42] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Authorized Plant Personnel Only</span>
            <span className="text-slate-400">PRD-REF-001</span>
          </div>
        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="w-full border-t border-[#1e2d42] bg-[#070b12] py-3 px-6 text-center text-[11px] text-slate-400 font-mono">
        Lam Soon Edible Oils Sdn. Bhd. · Integrated Palm Oil Refinery Operations & Quality Management System
      </footer>
    </div>
  );
}
