'use client';

import React, { useState } from 'react';
import { 
  Flame, 
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#070B12] text-slate-100">
      {/* Top Branding Bar */}
      <header className="w-full border-b border-[#1F2E43] bg-[#0A1018] px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-11 items-center justify-center rounded-lg bg-white p-0.5 border border-slate-600/40 shadow-sm overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lam-soon-logo.png"
              alt="Lam Soon Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-semibold text-sm text-slate-100 block">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Nisshin Deodorizer Refinery</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-mono">DOC: PRD-REF-001</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-[#101927] px-3 py-1 rounded-md border border-[#1F2E43]">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span className="hidden sm:inline font-medium">System Online · 21 CFR Part 11 Compliant</span>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl border border-[#1F2E43] bg-[#101927] p-6 sm:p-7 shadow-2xl relative">
          {/* Header Tag */}
          <div className="flex items-center justify-between border-b border-[#1F2E43] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#009FE3]" />
              <span className="text-[12px] font-medium text-slate-300 font-mono uppercase tracking-wider">
                Workstation Terminal Access
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md border border-[#10B981]/30 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></span>
              <span>System Ready</span>
            </div>
          </div>

          <div className="text-left mb-5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight font-sans flex items-center gap-2">
              <span>Plant Personnel Sign In</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed font-sans">
              Please enter your Employee ID and password to access the refinery process control & QC laboratory systems.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-[#EF4444]/10 p-3 text-sm text-[#EF4444] border border-[#EF4444]/30">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Employee ID / Email:
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. OP-1042, SV-2014, QC-3201"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] focus:ring-1 focus:ring-[#009FE3]/30 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-300">
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
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-9 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] focus:ring-1 focus:ring-[#009FE3]/30 transition-colors"
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

            <div className="flex items-center justify-between text-sm text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#0A1018] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                />
                <span>Remember login session on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#009FE3] hover:bg-[#08B5F5] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all shadow-sm mt-2 cursor-pointer border border-[#009FE3]"
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
          <div className="mt-4 pt-3 border-t border-[#1F2E43] flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Authorized Plant Personnel Only</span>
            <span className="text-slate-500">PRD-REF-001</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1F2E43] bg-[#0A1018] py-3 px-6 text-center text-[11px] text-slate-500 font-sans">
        Lam Soon Edible Oils Sdn. Bhd. · Integrated Palm Oil Refinery Operations & Quality Management System
      </footer>
    </div>
  );
}
