'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CreditCard,
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
  const [currentShift, setCurrentShift] = useState<string>('Shift A · 06:00-14:00');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const updateShift = () => {
      const now = new Date();
      const hour = parseInt(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour12: false,
          hour: '2-digit',
        }),
        10
      );

      if (hour >= 6 && hour < 14) {
        setCurrentShift('Shift A · 06:00-14:00');
      } else if (hour >= 14 && hour < 22) {
        setCurrentShift('Shift B · 14:00-22:00');
      } else {
        setCurrentShift('Shift C · 22:00-06:00');
      }
    };
    updateShift();
    const interval = setInterval(updateShift, 60000);
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070A10] text-slate-100 select-none relative p-4 font-sans antialiased overflow-hidden">
      {/* Background Deep Vignette / Subtle Atmosphere */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0F1726]/40 via-[#070A10] to-[#04060A]" />

      {/* Centered Swiss Modern Workstation Card matching mockup 1:1 */}
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="relative rounded-2xl bg-[#111724]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] p-7 sm:p-8 transition-all overflow-hidden">
          {/* Subtle Top-left Specular Glass Sheen */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.07] via-transparent to-transparent pointer-events-none" />

          {/* Header Row: Title & Lam Soon Red Leaf Emblem */}
          <div className="relative flex items-start justify-between mb-6">
            <div>
              <div className="text-white font-extrabold text-[15px] sm:text-base tracking-wider leading-tight uppercase font-sans">
                LAM SOON EDIBLE OILS
              </div>
              <div className="text-white font-extrabold text-[15px] sm:text-base tracking-wider leading-tight uppercase font-sans mt-0.5">
                REFINERY MANAGEMENT SYSTEM
              </div>
            </div>

            {/* Lam Soon Red Leaf Emblem */}
            <div className="shrink-0 ml-3 pt-0.5" title="Lam Soon Edible Oils">
              <svg
                className="w-5 h-6 text-[#DC2626] fill-current drop-shadow-sm transform -rotate-6"
                viewBox="0 0 24 24"
              >
                <path d="M21 3C14.5 3.5 8 7.5 5.5 13C3.5 17.5 5 21 8.5 21C14 21 19.5 15.5 21 3Z" />
              </svg>
            </div>
          </div>

          {/* LOG IN Subtitle */}
          <div className="relative text-[11px] font-semibold text-slate-400/90 tracking-widest uppercase mb-4">
            LOG IN
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="relative mb-4 flex items-start gap-2.5 rounded-lg bg-red-950/50 p-2.5 text-xs text-red-300 border border-red-800/60 font-sans">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="relative space-y-4">
            {/* Field 1: REFINERY ID */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                REFINERY ID
              </label>
              <div className="relative flex items-center bg-[#151D2A] border border-slate-700/60 rounded-lg focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder=""
                  className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <div className="pr-3 flex items-center pointer-events-none select-none">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1E2838] text-slate-400 border border-slate-700/80">
                    ID
                  </span>
                </div>
              </div>
            </div>

            {/* Field 2: ACCESS KEY */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                ACCESS KEY
              </label>
              <div className="relative flex items-center bg-[#151D2A] border border-slate-700/60 rounded-lg focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <div className="pr-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide key' : 'Show key'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <span className="text-slate-500">
                    <CreditCard className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Telemetry Line: Shift A · 06:00-14:00 · Online */}
            <div className="text-xs text-slate-400 font-sans tracking-tight pt-1 pb-1 flex items-center gap-1.5">
              <span>{currentShift}</span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Online</span>
              </span>
            </div>

            {/* Submit Button: Solid Red ACCESS SYSTEM */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-[#C52227] hover:bg-[#B31B20] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-red-950/30 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>AUTHENTICATING...</span>
                </span>
              ) : (
                'ACCESS SYSTEM'
              )}
            </button>
          </form>
        </div>

        {/* Minimalist discreet utilities below the card */}
        <div className="mt-4 flex items-center justify-between px-2 text-[11px] text-slate-600 font-mono">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="hover:text-slate-400 transition-colors cursor-pointer"
          >
            System Help & Support
          </button>
          <div className="flex items-center gap-2">
            <span>Quick fill:</span>
            <button
              type="button"
              onClick={() => {
                setIdentifier('OPR001');
                setPassword('password123');
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer underline"
            >
              Operator
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setIdentifier('SUP001');
                setPassword('password123');
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer underline"
            >
              Supervisor
            </button>
          </div>
        </div>
      </div>

      {isHelpOpen && (
        <HelpSupportModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      )}
    </div>
  );
}
