'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Factory,
  ShieldCheck,
  FileText,
  Database,
  Info,
  ArrowRight,
  Clock,
  Wifi,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { loginUser, authenticateUser } from '@/lib/data-service';
import HelpSupportModal from '@/components/HelpSupportModal';

interface LoginViewProps {
  onLogin: (profile: Profile) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formattedTime, setFormattedTime] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<string>('Shift B · 14:00–22:00');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setFormattedTime(`${datePart} · ${timePart} MYT`);

      const hour = parseInt(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour12: false,
          hour: '2-digit',
        }),
        10
      );

      if (hour >= 6 && hour < 14) {
        setCurrentShift('Shift A · 06:00–14:00');
      } else if (hour >= 14 && hour < 22) {
        setCurrentShift('Shift B · 14:00–22:00');
      } else {
        setCurrentShift('Shift C · 22:00–06:00');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authenticateUser(identifier, password);
      setIsLoading(false);
      if (res.success && res.profile) {
        onLogin(res.profile);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    } catch {
      const res = loginUser(identifier, password);
      setIsLoading(false);
      if (res.success && res.profile) {
        onLogin(res.profile);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#080C14] text-slate-100 select-none relative overflow-x-hidden antialiased">
      {/* Background Subtle Ambience & Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Soft Industrial Backdrop with Deep Vignette */}
        <div 
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'url(/refinery-dusk.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(60%) contrast(120%)'
          }}
        />
        {/* Precision 40px Technical Grid */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        {/* Soft Radial Center Focus */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#080C14]/85 to-[#080C14]" />
      </div>

      {/* 1. TOP MINIMALIST STATUS HEADER */}
      <header className="relative z-10 w-full border-b border-[#182335]/70 bg-[#080C14]/80 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#E31B23] p-1 flex items-center justify-center shrink-0 shadow-xs border border-[#FF4D4D]/25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lam-soon-logo.png"
              alt="Lam Soon Logo"
              className="w-full h-full object-contain brightness-105"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-wider text-white uppercase font-sans">
                Lam Soon Edible Oils
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-[#E31B23]/15 text-[#FF6B6B] border border-[#E31B23]/30">
                PASIR GUDANG
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block leading-tight mt-0.5">
              Nisshin Deodorizer Plant · PRD-REF-001
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0E1524] border border-[#1A2536] text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span className="text-[#10B981] font-semibold text-[11px]">SYSTEM ONLINE</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{formattedTime || '28 Sept 2026 · 23:30:00 MYT'}</span>
          </div>
        </div>
      </header>

      {/* 2. CENTERED SWISS MODERN WORKSTATION CARD */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[460px]">
          {/* Main Card Chassis */}
          <div className="bg-[#0C121D]/95 rounded-2xl border border-[#1C2B40] shadow-2xl p-6 sm:p-8 relative backdrop-blur-xl transition-all">
            {/* Subtle Top Red Accent Edge */}
            <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#E31B23] to-transparent opacity-80" />

            {/* Header: Brand Mark + Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#E31B23]/10 border border-[#E31B23]/25 mb-3.5 text-[#E31B23]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/lam-soon-logo.png"
                  alt="Lam Soon"
                  className="h-7 w-7 object-contain"
                />
              </div>

              <div className="text-[10px] font-mono uppercase tracking-widest text-[#E31B23] font-bold mb-1">
                LAM SOON EDIBLE OILS
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                Refinery Management System
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 font-sans">
                Authorized workstation access for plant operators, QC analysts and supervisors.
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-950/40 p-3 text-xs text-red-300 border border-red-800/60 font-sans">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Field 1: Refinery ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 font-sans">
                    Refinery Employee ID
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    [SYS.USER_ID]
                  </span>
                </div>
                <div className="relative flex items-center rounded-lg bg-[#070B12] border border-[#1E2B40] focus-within:border-[#009FE3] focus-within:ring-1 focus-within:ring-[#009FE3] transition-all overflow-hidden">
                  <span className="px-3.5 py-3 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OPR001, SUP001, QCS001, ADM001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-transparent pr-3 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <span className="hidden sm:inline-block px-2 py-0.5 mr-2.5 rounded text-[9px] font-mono font-bold bg-[#111A29] text-slate-400 border border-[#1E2B40]">
                    ID
                  </span>
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 font-sans">
                    Security Access Key
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    [SYS.PASSKEY]
                  </span>
                </div>
                <div className="relative flex items-center rounded-lg bg-[#070B12] border border-[#1E2B40] focus-within:border-[#009FE3] focus-within:ring-1 focus-within:ring-[#009FE3] transition-all overflow-hidden">
                  <span className="px-3.5 py-3 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Utility Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-[#1E2B40] bg-[#070B12] text-[#E31B23] focus:ring-[#E31B23] cursor-pointer"
                  />
                  <span>Remember this workstation</span>
                </label>
                <span 
                  onClick={() => {
                    setErrorMessage(null);
                    alert('For security compliance (21 CFR Part 11), please contact your Plant System Administrator or Supervisor to reset your terminal credential.');
                  }}
                  className="text-slate-400 hover:text-white hover:underline cursor-pointer font-medium transition-colors"
                >
                  Forgot password?
                </span>
              </div>

              {/* Live Shift Status Pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#080E18] border border-[#192436] text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></span>
                  <span>{currentShift}</span>
                </span>
                <span className="text-[#009FE3] font-semibold">TERMINAL WS-04</span>
              </div>

              {/* Action Button: Lam Soon Brand Red with High Authority */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#E31B23] hover:bg-[#C9141B] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md shadow-[#E31B23]/20 cursor-pointer select-none"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    <span>Authorizing Credentials...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 font-medium tracking-wider">
                    Access System
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>

            {/* Industrial Compliance Badges */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-[#182335] text-center text-slate-400">
              <div className="p-2 rounded bg-[#080D17] border border-[#162132]">
                <div className="text-[10px] font-mono font-bold text-slate-200">ISO 22000</div>
                <div className="text-[9px] text-slate-400">Food Safety</div>
              </div>
              <div className="p-2 rounded bg-[#080D17] border border-[#162132]">
                <div className="text-[10px] font-mono font-bold text-slate-200">21 CFR P11</div>
                <div className="text-[9px] text-slate-400">Audit Ready</div>
              </div>
              <div className="p-2 rounded bg-[#080D17] border border-[#162132]">
                <div className="text-[10px] font-mono font-bold text-slate-200">HACCP</div>
                <div className="text-[9px] text-slate-400">Certified</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. MINIMALIST INDUSTRIAL FOOTER */}
      <footer className="relative z-10 w-full border-t border-[#182335]/70 bg-[#080C14]/80 backdrop-blur-md py-2.5 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-slate-300 font-semibold font-sans">Lam Soon Edible Oils Sdn. Bhd.</span>
          <span className="text-slate-600">|</span>
          <span>Nisshin Deodorizer Plant</span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="hidden md:inline">Continuous Physical Refinery</span>
          <span className="text-slate-600">|</span>
          <span>v1.0.4</span>
        </div>

        <div className="flex items-center gap-3 font-sans text-xs">
          <span 
            onClick={() => setIsHelpOpen(true)} 
            className="hover:text-slate-200 cursor-pointer transition-colors"
          >
            Help & Support
          </span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Plant SOP Guide</span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Contact IT Admin</span>
        </div>
      </footer>

      {isHelpOpen && (
        <HelpSupportModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      )}
    </div>
  );
}
