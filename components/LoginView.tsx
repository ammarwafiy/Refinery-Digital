'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { loginUser, authenticateUser } from '@/lib/data-service';

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
        hour12: true,
      });
      setFormattedTime(`${datePart}  ${timePart}`);
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#0F1722] text-slate-100 select-none">
      {/* 1. TOP HEADER BAR */}
      <header className="w-full border-b border-[#1F2E43]/60 bg-[#0F1722] px-4 sm:px-6 py-2.5 flex items-center justify-between text-slate-100 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#E31B23] p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lam-soon-logo.png"
              alt="Lam Soon Logo"
              className="w-full h-full object-contain brightness-105"
            />
          </div>
          <div className="text-left">
            <span className="font-semibold text-sm text-white block leading-tight">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-[11px] text-slate-400 font-mono block leading-tight mt-0.5">
              Nisshin Deodorizer Refinery
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Online</span>
          </div>
          <span className="text-slate-600">|</span>
          <span>{formattedTime || '25 Sept 2026  08:55 AM'}</span>
        </div>
      </header>

      {/* 2. SPLIT-SCREEN MAIN CANVAS */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-y-auto">
        {/* Left Hero / Brand Column */}
        <div className="lg:w-1/2 flex flex-col justify-between bg-[#F8FAFC] relative overflow-hidden p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-200">
          {/* Top text block */}
          <div className="max-w-xl z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1 w-7 bg-[#E31B23] rounded-full inline-block"></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                REFINERY PROCESS MANAGEMENT SYSTEM
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0F172A] tracking-tight leading-[1.15] mb-4">
              Safe Process.<br />
              Consistent Quality.
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
              Integrated process control, quality management and digital records for efficient and compliant refinery operations.
            </p>
          </div>

          {/* Bottom Refinery Plant Visual */}
          <div className="relative mt-8 sm:mt-12 -mx-6 sm:-mx-10 lg:-mx-12 -mb-6 sm:-mb-10 lg:-mb-12 h-64 sm:h-80 lg:h-[420px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/refinery-daylight.jpg"
              alt="Industrial Refinery Plant"
              className="w-full h-full object-cover object-center contrast-105 saturate-105"
            />
            {/* Subtle top gradient overlay to fade seamlessly into white background */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F8FAFC] to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Right Sign-In Form Column */}
        <div className="lg:w-1/2 bg-[#ECEFF4] flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-[440px] bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-[#0F172A]">
            {/* Card Title */}
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Plant Personnel Sign In
            </h2>
            <div className="h-px bg-slate-200 w-full mt-3 mb-4" />

            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Enter your employee ID and password to access the Refinery Process Management System.
            </p>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Employee ID / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employee ID / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. OP-1042, SV-2014, QC-3201"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#009FE3] focus:ring-1 focus:ring-[#009FE3] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg pl-9 pr-9 py-2.5 text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#009FE3] focus:ring-1 focus:ring-[#009FE3] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-[#0A1B2E] focus:ring-[#0A1B2E] cursor-pointer"
                  />
                  <span>Remember this device</span>
                </label>
                <span 
                  onClick={() => {
                    setErrorMessage(null);
                    alert('For security compliance (21 CFR Part 11), please contact your Plant System Administrator or Supervisor to reset your terminal credential.');
                  }}
                  className="text-[#1D8CF8] hover:underline cursor-pointer font-medium"
                >
                  Forgot password?
                </span>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#0A1B2E] hover:bg-[#122A47] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-all shadow-sm mt-3 cursor-pointer"
              >
                {isLoading ? (
                  <span>Authenticating Credentials...</span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Bottom Plant Notice */}
            <div className="relative mt-7 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Authorized Plant Personnel Only
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER BAR */}
      <footer className="w-full border-t border-[#1F2E43]/60 bg-[#0F1722] py-2.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span>21 CFR Part 11 Compliant</span>
          <span className="text-slate-600">|</span>
          <span>DOC: PRD-REF-001</span>
          <span className="text-slate-600">|</span>
          <span>Version 1.0.0</span>
        </div>

        <div className="flex items-center gap-3 font-sans">
          <span>Lam Soon Edible Oils Sdn. Bhd.</span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Help & Support</span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
        </div>
      </footer>
    </div>
  );
}
