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
  ArrowRight
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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#070C14] text-slate-100 select-none">
      {/* 1. TOP HEADER BAR */}
      <header className="w-full border-b border-[#172538] bg-[#070C14] px-4 sm:px-6 py-2.5 flex items-center justify-between text-slate-100 z-10 shrink-0">
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
        {/* Left Hero / Brand Column with Refinery Dusk Visual */}
        <div className="lg:w-1/2 relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-[#172538] bg-[#070C14] min-h-[500px]">
          {/* Background Industrial Dusk Visual */}
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/refinery-dusk.jpg"
              alt="Industrial Refinery Plant"
              className="w-full h-full object-cover object-center brightness-90 contrast-105"
            />
            {/* Dark Gradient Vignette for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#070C14]/95 via-[#070C14]/75 to-[#070C14]/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070C14]/90 via-transparent to-[#070C14]/60 pointer-events-none" />

            {/* Blurry Transition on Right Edge */}
            <div 
              className="absolute inset-y-0 right-0 w-28 pointer-events-none backdrop-blur-md hidden lg:block"
              style={{
                maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
              }}
            />
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#070C14] to-transparent pointer-events-none hidden lg:block" />
          </div>

          {/* Top Brand Text Block */}
          <div className="max-w-xl z-10 relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-0.5 w-6 bg-[#E31B23] rounded-full inline-block"></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 font-mono">
                REFINERY PROCESS MANAGEMENT SYSTEM
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-[1.12] mb-4">
              Safe Operations.<br />
              Reliable Processes.<br />
              Consistent Quality.
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mb-8">
              Digital process recording, quality management and operational documentation for the Nisshin Deodorizer Refinery.
            </p>
          </div>

          {/* 3 Industrial Feature Badges */}
          <div className="space-y-3.5 max-w-md z-10 relative mt-6 lg:mt-0">
            {/* 1. Process Control */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-[#0F1726]/60 border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0 shadow-sm">
                <Factory className="h-5 w-5 text-slate-200" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-snug">Process Control</h3>
                <p className="text-xs text-slate-400">Record and monitor process parameters</p>
              </div>
            </div>

            {/* 2. Quality Management */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-[#0F1726]/60 border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-slate-200" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-snug">Quality Management</h3>
                <p className="text-xs text-slate-400">Ensure product quality and regulatory compliance</p>
              </div>
            </div>

            {/* 3. Digital Records */}
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-lg bg-[#0F1726]/60 border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0 shadow-sm">
                <FileText className="h-5 w-5 text-slate-200" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-snug">Digital Records</h3>
                <p className="text-xs text-slate-400">Centralized documentation for audit readiness</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign-In Form Column */}
        <div className="lg:w-1/2 bg-[#070C14] flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">
          <div className="w-full max-w-[460px] bg-[#0A1220]/95 rounded-2xl border border-[#1C2C40] p-6 sm:p-8 lg:p-9 shadow-2xl relative z-10 backdrop-blur-xl">
            {/* Card Header Info */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#1C2C40] mb-5">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-[#009FE3]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  REFINERY PROCESS MANAGEMENT SYSTEM
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                PRD-REF-001
              </span>
            </div>

            {/* Card Title */}
            <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white mb-2">
              Refinery System Sign In
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Sign in with your authorized employee credentials to access the Refinery Process Management System.
            </p>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-950/40 p-3 text-xs text-red-300 border border-red-800/60">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Employee ID / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Employee ID / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. OPR001, SUP001, QCS001, ADM001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-[#060A12] border border-[#1C2C40] rounded-lg pl-10 pr-3 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:bg-[#080E1A] focus:outline-none focus:border-[#009FE3] focus:ring-1 focus:ring-[#009FE3] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#060A12] border border-[#1C2C40] rounded-lg pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:bg-[#080E1A] focus:outline-none focus:border-[#009FE3] focus:ring-1 focus:ring-[#009FE3] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-[#1C2C40] bg-[#060A12] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    Remember this device
                    <Info className="h-3.5 w-3.5 text-slate-500 hover:text-slate-400" />
                  </span>
                </label>
                <span 
                  onClick={() => {
                    setErrorMessage(null);
                    alert('For security compliance (21 CFR Part 11), please contact your Plant System Administrator or Supervisor to reset your terminal credential.');
                  }}
                  className="text-[#0095FF] hover:text-[#38BDF8] hover:underline cursor-pointer font-medium transition-colors"
                >
                  Forgot password?
                </span>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#008AE6] hover:bg-[#007AC9] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-lg text-sm transition-all shadow-lg shadow-[#008AE6]/25 mt-4 cursor-pointer"
              >
                {isLoading ? (
                  <span>Authenticating Credentials...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2 font-medium">
                    Sign In to Refinery System
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>

            {/* Bottom Plant Notice Divider */}
            <div className="relative mt-7 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1C2C40]"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-[#0A1220] px-3 text-slate-400 font-medium uppercase tracking-widest font-mono">
                  Authorized Refinery Personnel Only
                </span>
              </div>
            </div>

            {/* 3 Compliance / Trust Badges */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-1 text-left">
              {/* Badge 1 */}
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#009FE3] shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="text-white font-semibold block text-[11px]">21 CFR Part 11</span>
                  <span className="text-slate-400 text-[10px]">Compliant</span>
                </div>
              </div>

              {/* Badge 2 */}
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#009FE3] shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="text-white font-semibold block text-[11px]">Secure</span>
                  <span className="text-slate-400 text-[10px]">Access Control</span>
                </div>
              </div>

              {/* Badge 3 */}
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#009FE3] shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="text-white font-semibold block text-[11px]">Audit-Ready</span>
                  <span className="text-slate-400 text-[10px]">Digital Records</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER BAR */}
      <footer className="w-full border-t border-[#172538] bg-[#070C14] py-2.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span>Lam Soon Edible Oils Sdn. Bhd.</span>
          <span className="text-slate-600">|</span>
          <span>Nisshin Deodorizer Refinery</span>
          <span className="text-slate-600">|</span>
          <span>DOC: PRD-REF-001</span>
          <span className="text-slate-600">|</span>
          <span>Version 1.0.0</span>
        </div>

        <div className="flex items-center gap-3 font-sans">
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Help & Support</span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 cursor-pointer transition-colors">Contact Administrator</span>
        </div>
      </footer>
    </div>
  );
}
