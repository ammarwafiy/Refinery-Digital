'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  BadgeCheck, 
  CheckCircle2, 
  Layers, 
  Activity, 
  FlaskConical, 
  Cpu, 
  FileText,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import { 
  getProfiles, 
  addProfile, 
  generateNextEmployeeId, 
  ROLE_ID_SERIES 
} from '@/lib/data-service';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAdded?: (newProfile: Profile) => void;
}

export default function StaffManagementModal({ isOpen, onClose, onStaffAdded }: StaffManagementModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
  const [fullName, setFullName] = useState('');
  const [autoId, setAutoId] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfiles(getProfiles());
      setAutoId(generateNextEmployeeId(selectedRole));
      setSuccessMessage(null);
    }
  }, [isOpen, selectedRole]);

  if (!isOpen) return null;

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setAutoId(generateNextEmployeeId(role));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const created = addProfile({
      full_name: fullName.trim(),
      role: selectedRole,
      employee_no: autoId,
    });

    setProfiles(getProfiles());
    setFullName('');
    setSuccessMessage(`Kakitangan ${created.full_name} (${created.employee_no}) telah berjaya didaftarkan!`);
    setAutoId(generateNextEmployeeId(selectedRole));

    if (onStaffAdded) {
      onStaffAdded(created);
    }
  };

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    operator: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-600/40' },
    supervisor: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-600/40' },
    qc_analyst: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-600/40' },
    qc_manager: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-600/40' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-600/40' },
    viewer: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#090d16] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Direktori & Pengurusan Kakitangan Loji
              </h2>
              <span className="text-[11px] font-mono text-cyan-400">
                NISSHIN DEODORIZER PLANT · SISTEM ID KONSISTEN (PRD-REF-001)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Format ID Konsisten Info Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-slate-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>SKEMA FORMAT ID PEKERJA KONSISTEN LOJI:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block">OP-1xxx</span>
                <span className="text-slate-400 text-[10px]">Operator Loji (0700-0600)</span>
              </div>
              <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                <span className="text-amber-400 font-bold block">SV-2xxx</span>
                <span className="text-slate-400 text-[10px]">Penyelia Syif (Supervisor)</span>
              </div>
              <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                <span className="text-cyan-400 font-bold block">QC-3xxx</span>
                <span className="text-slate-400 text-[10px]">Analis Makmal QC</span>
              </div>
              <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                <span className="text-purple-400 font-bold block">QM-4xxx</span>
                <span className="text-slate-400 text-[10px]">Pengurus Kawalan Kualiti</span>
              </div>
              <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                <span className="text-blue-400 font-bold block">AD-5xxx</span>
                <span className="text-slate-400 text-[10px]">Pentadbir Loji & Had</span>
              </div>
              <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                <span className="text-slate-400 font-bold block">AU-9xxx</span>
                <span className="text-slate-400 text-[10px]">Juruaudit (ISO/HACCP)</span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-xs font-mono text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form Tambah User Baharu */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-cyan-400" />
              <span>Daftar Kakitangan Baharu</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pilih Peranan */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Peranan / Jawatan Bertugas:
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="operator">Operator Loji (RF-FR-004)</option>
                    <option value="supervisor">Penyelia Syif (Supervisor)</option>
                    <option value="qc_analyst">Juruanalisis Makmal QC (RF-FR-001)</option>
                    <option value="qc_manager">Pengurus QC (Keputusan Kualiti)</option>
                    <option value="admin">Pentadbir Loji (Admin)</option>
                    <option value="viewer">Juruaudit Luar (Viewer / ISO)</option>
                  </select>
                </div>

                {/* ID Automatik Konsisten */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    ID Pekerja Auto-Konsisten:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={autoId}
                      className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 font-bold tracking-wider cursor-not-allowed"
                    />
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-2 rounded-lg border border-emerald-800 whitespace-nowrap">
                      Auto-Generated
                    </span>
                  </div>
                </div>
              </div>

              {/* Nama Kakitangan */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Nama Penuh Kakitangan:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Faizal bin Roslan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs font-mono transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Daftar Kakitangan & Jana ID</span>
                </button>
              </div>
            </form>
          </div>

          {/* Senarai Kakitangan Sedia Ada */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Senarai Kakitangan Loji Sedia Ada ({profiles.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Disinkronkan bersama PostgreSQL Supabase
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#090d16] border-b border-slate-800 text-slate-400 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">ID Pekerja</th>
                    <th className="py-2.5 px-4 font-sans font-semibold">Nama Penuh</th>
                    <th className="py-2.5 px-4">Peranan</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {profiles.map((p) => {
                    const badge = roleColors[p.role] || roleColors.operator;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-cyan-400">
                          {p.employee_no}
                        </td>
                        <td className="py-2.5 px-4 text-white font-sans font-medium">
                          {p.full_name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {p.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                            Aktif
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 bg-[#090d16] px-6 py-3 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Kakitangan baharu boleh terus log masuk menggunakan ID Pekerja yang dijana di atas.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
