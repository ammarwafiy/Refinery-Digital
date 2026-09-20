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
  Info,
  CheckCircle2
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
  const [showDirectoryHelp, setShowDirectoryHelp] = useState(false);

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
        setErrorMessage(res.error || 'Pengesahan gagal. Sila semak ID Pekerja atau kata laluan anda.');
      }
    }, 450);
  };

  const sampleStaff = [
    { role: 'Lead Operator', id: 'OP-1042', name: 'Ahmad Razak', target: 'RF-FR-004 Log 24 Jam' },
    { role: 'Shift Supervisor', id: 'SV-2014', name: 'Chong Wei Lun', target: 'Papan Pemantauan Langsung' },
    { role: 'QC Lab Analyst', id: 'QC-3201', name: 'Siti Nurhaliza', target: 'RF-FR-001 Makmal QC' },
    { role: 'QC Manager', id: 'QM-4502', name: 'Dr. Tan Keng Boon', target: 'Keputusan QC & Disposisi' },
    { role: 'Plant Admin', id: 'AD-5010', name: 'Haris Iskandar', target: 'Pentadbiran Loji & Spesifikasi' },
    { role: 'ISO Auditor', id: 'AU-9901', name: 'Auditor (Viewer)', target: 'Borang Rasmi & Audit Trail' },
  ];

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
        <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-[#0f172a]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 mb-3 shadow-lg shadow-cyan-950/50">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Log Masuk Kakitangan
            </h1>
            <p className="mt-1.5 text-xs text-slate-400 font-sans">
              Sila masukkan ID Pekerja dan kata laluan untuk mengakses sistem kawalan loji & makmal QC.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                ID Pekerja (Employee ID) / Email:
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: OP-1042, SV-2014, QC-3201"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Kata Laluan:
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  title={showPassword ? 'Sembunyi kata laluan' : 'Papar kata laluan'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span>Ingat sesi di peranti ini</span>
              </label>

              <button
                type="button"
                onClick={() => setShowDirectoryHelp(!showDirectoryHelp)}
                className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Info className="h-3 w-3" />
                <span>ID Bertugas?</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-cyan-950/60 font-mono mt-2 cursor-pointer"
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

          {/* Directory Reference Popover */}
          {showDirectoryHelp && (
            <div className="mt-5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 mb-2 border-b border-slate-800 pb-1.5">
                <span>PANDUAN ID PEKERJA LOJI:</span>
                <span className="text-[10px] text-slate-500">Klik ID untuk auto-isi</span>
              </div>
              <div className="space-y-1.5">
                {sampleStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setIdentifier(s.id);
                      setPassword('password123');
                      setShowDirectoryHelp(false);
                    }}
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-slate-800 text-left transition-colors text-[11px]"
                  >
                    <div>
                      <span className="text-white font-semibold">{s.name}</span>
                      <span className="text-slate-500 block text-[10px]">{s.role}</span>
                    </div>
                    <span className="bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                      {s.id}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[10px] text-slate-400">
                <span className="text-amber-400 font-bold block mb-0.5">KAWALAN KESELAMATAN LOJI:</span>
                Pendaftaran akaun kakitangan baharu dikawal ketat dan hanya boleh didaftarkan oleh <b>Pentadbir Loji (Admin · AD-5010)</b> di panel dalam sistem.
              </div>
            </div>
          )}

          {/* Security Notice Footer on Login Card */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Akses Terhad Kakitangan Loji</span>
            <span className="text-slate-400">PRD-REF-001</span>
          </div>
        </div>
      </div>

      {/* Industrial Footer */}
      <div className="w-full border-t border-slate-800/80 bg-[#070a10] py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Lam Soon Edible Oils Sdn. Bhd. · Sistem Pengurusan Operasi & Kualiti Minyak Sawit Bersepadu
      </div>
    </div>
  );
}
