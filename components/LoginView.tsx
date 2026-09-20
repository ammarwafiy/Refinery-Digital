'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  UserCheck, 
  Building2, 
  AlertCircle, 
  Cpu, 
  FileText,
  Activity,
  Layers,
  FlaskConical
} from 'lucide-react';
import { Profile, UserRole } from '@/types/refinery';
import { loginUser, setAuthUser, getProfiles } from '@/lib/data-service';

interface LoginViewProps {
  onLogin: (profile: Profile) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'quick' | 'form'>('quick');

  const profiles = getProfiles();

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
        setErrorMessage(res.error || 'Authentication failed. Please check credentials.');
      }
    }, 400);
  };

  const handleQuickSelect = (profile: Profile) => {
    setAuthUser(profile);
    onLogin(profile);
  };

  const roleMeta: Record<UserRole, { color: string; border: string; bg: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
    operator: {
      color: 'text-emerald-400',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      bg: 'bg-emerald-950/40',
      icon: Layers,
      desc: 'Borang RF-FR-004: Catatan bacaan loji setiap jam, copy previous hour, semakan sisihan.',
    },
    supervisor: {
      color: 'text-amber-400',
      border: 'border-amber-500/40 hover:border-amber-400',
      bg: 'bg-amber-950/40',
      icon: Activity,
      desc: 'Papan Pemantauan Langsung: Kad KPI masa-nyata, slot tertinggal, perakuan tindakan sisihan.',
    },
    qc_analyst: {
      color: 'text-cyan-400',
      border: 'border-cyan-500/40 hover:border-cyan-400',
      bg: 'bg-cyan-950/40',
      icon: FlaskConical,
      desc: 'Borang RF-FR-001: Ujian parameter makmal, matriks SFC 9-suhu, perbandingan spesifikasi.',
    },
    qc_manager: {
      color: 'text-purple-400',
      border: 'border-purple-500/40 hover:border-purple-400',
      bg: 'bg-purple-950/40',
      icon: ShieldCheck,
      desc: 'Keputusan QC Mutlak: Penentuan pelupusan lot (rework/reprocess/scrap) & pembatalan keputusan.',
    },
    admin: {
      color: 'text-blue-400',
      border: 'border-blue-500/40 hover:border-blue-400',
      bg: 'bg-blue-950/40',
      icon: Cpu,
      desc: 'Pengurusan Penuh: Pentadbiran 44 produk, tangki suapan/nyahcas, had toleransi parameter.',
    },
    viewer: {
      color: 'text-slate-400',
      border: 'border-slate-700 hover:border-slate-500',
      bg: 'bg-slate-900/60',
      icon: FileText,
      desc: 'Juruaudit Kualiti (ISO/HACCP): Pemeriksaan jejak audit kekal & salinan cetakan borang rasmi.',
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#070a12] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top SCADA Branding Bar */}
      <div className="w-full border-b border-slate-800/80 bg-[#090d16]/90 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-xs tracking-wider uppercase text-slate-200 block">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              NISSHIN DEODORIZER PLANT · PRD-REF-001
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline">21 CFR PART 11 / ISO 22000 AUDIT ACTIVE</span>
        </div>
      </div>

      {/* Main Login Card Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-800/80 bg-[#0f172a]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header Title */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Refinery Process Management System
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 font-sans">
              Sila pilih peranan bertugas atau masukkan ID Pekerja anda untuk mengakses sistem pengurusan loji dan makmal QC.
            </p>
          </div>

          {/* Mode Selector Switcher */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveMode('quick')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeMode === 'quick'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Akses Pantas Peranan (1-Click FYP Access)
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('form')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeMode === 'form'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Log Masuk Kredensial (ID & Password)
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 max-w-lg mx-auto flex items-center gap-2.5 rounded-xl bg-rose-950/60 p-3.5 text-xs text-rose-300 border border-rose-800/60 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: 1-Click Role Profiles (Recommended for Presentation & Ease of Testing) */}
          {activeMode === 'quick' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 border-b border-slate-800 pb-2">
                <span>PILIH PERANAN KAKITANGAN BERTUGAS:</span>
                <span className="text-cyan-400">Klik untuk masuk serta-merta</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {profiles.map((p) => {
                  const meta = roleMeta[p.role];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleQuickSelect(p)}
                      className={`text-left p-4 rounded-xl border ${meta.border} ${meta.bg} transition-all hover:scale-[1.01] hover:shadow-xl group relative overflow-hidden`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-slate-900/80 border border-slate-800 ${meta.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${meta.color}`}>
                              {p.role.replace('_', ' ')}
                            </span>
                            <h3 className="text-sm font-bold text-white font-sans">
                              {p.full_name}
                            </h3>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                          {p.employee_no}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {meta.desc}
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                        <span>Akses Loji</span>
                        <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Standard ID / Password Form */}
          {activeMode === 'form' && (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Employee ID atau Email Bertugas:
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. OP-1042, SV-0814, QC-2201"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    Petunjuk: Boleh guna nama atau ID pekerja (Contoh: OP-1042 untuk Ahmad Razak).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Kata Laluan Akaun:
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                    <span>Ingat sesi di tablet loji</span>
                  </label>
                  <span className="text-cyan-400/80 hover:underline cursor-pointer">
                    Lupa ID?
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-cyan-950/60 font-mono mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Mengesahkan Kredensial...</span>
                  ) : (
                    <>
                      <span>Sahkan & Masuk ke Sistem Loji</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Industrial Footer */}
      <div className="w-full border-t border-slate-800/80 bg-[#070a10] py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Lam Soon Edible Oils Sdn. Bhd. · Sistem Pengurusan Operasi & Kualiti Minyak Sawit Bersepadu
      </div>
    </div>
  );
}
