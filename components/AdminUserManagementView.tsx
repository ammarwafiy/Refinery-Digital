'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  KeyRound, 
  Activity, 
  Layers, 
  FlaskConical, 
  Cpu, 
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  ShieldAlert
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import { 
  getProfiles, 
  addProfile, 
  generateNextEmployeeId, 
  getCurrentRole, 
  getCurrentProfile, 
  setCurrentRole,
  setAuthUser,
  toggleProfileActive,
  ROLE_ID_SERIES 
} from '@/lib/data-service';

export default function AdminUserManagementView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentRole, setCurrentRoleState] = useState<UserRole>('operator');
  const [currentProfile, setCurrentProfileState] = useState<Profile>(getCurrentProfile());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Add User Form State
  const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
  const [fullName, setFullName] = useState('');
  const [customPassword, setCustomPassword] = useState('password123');
  const [autoId, setAutoId] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const list = getProfiles();
    setProfiles(list);
    const r = getCurrentRole();
    setCurrentRoleState(r);
    setCurrentProfileState(getCurrentProfile());
    setAutoId(generateNextEmployeeId(selectedRole));
  };

  const handleRoleSelectChange = (role: UserRole) => {
    setSelectedRole(role);
    setAutoId(generateNextEmployeeId(role));
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan nama penuh kakitangan.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const created = addProfile({
        full_name: fullName.trim(),
        role: selectedRole,
        employee_no: autoId,
        password: customPassword.trim() || 'password123',
      });

      refreshData();
      setFullName('');
      setStatusMessage({ 
        type: 'success', 
        text: `Kakitangan ${created.full_name} (${created.employee_no}) berjaya didaftarkan ke dalam sistem loji!` 
      });
      setAutoId(generateNextEmployeeId(selectedRole));
    } catch {
      setStatusMessage({ type: 'error', text: 'Gagal mendaftar kakitangan. Sila cuba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (id: string, currentActive: boolean, name: string) => {
    if (id === currentProfile.id) {
      alert('Amaran: Anda tidak boleh menyahaktifkan akaun anda sendiri yang sedang digunakan.');
      return;
    }
    const confirmed = window.confirm(`Adakah anda pasti mahu ${currentActive ? 'menyahaktifkan' : 'mengaktifkan semula'} akaun kakitangan: ${name}?`);
    if (!confirmed) return;

    toggleProfileActive(id);
    refreshData();
    setStatusMessage({
      type: 'success',
      text: `Status akaun kakitangan "${name}" telah dikemaskini kepada: ${currentActive ? 'TIDAK AKTIF' : 'AKTIF'}.`
    });
  };

  const handleSwitchToAdmin = () => {
    const all = getProfiles();
    const adminUser = all.find(p => p.role === 'admin') || all[0];
    setCurrentRole('admin');
    setAuthUser(adminUser);
    setCurrentRoleState('admin');
    setCurrentProfileState(adminUser);
    setStatusMessage({
      type: 'success',
      text: `Sesi telah ditukar kepada Pentadbir Loji: ${adminUser.full_name} (${adminUser.employee_no}). Anda kini mempunyai kuasa pentadbiran penuh.`
    });
  };

  const isAdmin = currentRole === 'admin';

  // Filtered Profiles
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.employee_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Metrics
  const totalCount = profiles.length;
  const operatorCount = profiles.filter(p => p.role === 'operator').length;
  const supervisorCount = profiles.filter(p => p.role === 'supervisor').length;
  const qcCount = profiles.filter(p => p.role === 'qc_analyst' || p.role === 'qc_manager').length;
  const adminCount = profiles.filter(p => p.role === 'admin').length;

  const roleStyles: Record<UserRole, { bg: string; text: string; border: string }> = {
    operator: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-600/40' },
    supervisor: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-600/40' },
    qc_analyst: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-600/40' },
    qc_manager: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-600/40' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-600/40' },
    viewer: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0b1329] to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-950/50">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Pentadbiran Loji & Pengurusan Pengguna
              </h1>
              <span className="rounded-full bg-blue-950/80 px-2.5 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/30 font-semibold">
                ADMIN ACCESS ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Kawalan Keselamatan Akses Peranan (RBAC), Penjanaan ID Konsisten & Direktori Kakitangan Nisshin Deodorizer
            </p>
          </div>
        </div>

        {/* Current Admin Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Pengguna Semasa:</span>
            <span className="text-xs font-semibold text-white font-mono">
              {currentProfile.full_name} ({currentProfile.employee_no})
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${roleStyles[currentRole]?.bg} ${roleStyles[currentRole]?.text} ${roleStyles[currentRole]?.border}`}>
            {currentRole}
          </span>
        </div>
      </div>

      {/* RBAC Warning Banner if not Admin */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">MOD PAPARAN TERHAD:</span> Anda sedang log masuk sebagai peranan <span className="uppercase text-amber-300 font-bold">[{currentRole}]</span>. Fungsi mendaftar dan menyahaktifkan pengguna dihadkan kepada peranan Pentadbir Loji (*Admin*).
            </div>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap transition-colors shadow-md shadow-blue-950/50 cursor-pointer text-xs"
          >
            Tukar ke Profil Admin (AD-5010)
          </button>
        </div>
      )}

      {/* Notification Banner */}
      {statusMessage && (
        <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-mono ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-700 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Jumlah Kakitangan</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Berdaftar di loji</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-emerald-400 uppercase">Operator (OP)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{operatorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Siri OP-1xxx</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-amber-400 uppercase">Supervisor (SV)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{supervisorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Siri SV-2xxx</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-cyan-400 uppercase">Makmal QC (QC/QM)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{qcCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Siri QC-3xxx / QM-4xxx</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-blue-400 uppercase">Admin & Audit (AD/AU)</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">{adminCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Siri AD-5xxx / AU-9xxx</div>
        </div>
      </div>

      {/* Main Grid: Add User (Admin Exclusive) & ID Standards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Add User Form (Admin Exclusive) */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <UserPlus className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Daftar Kakitangan Baharu
              </h2>
              <span className="text-[10px] font-mono text-slate-500">
                Fungsi Eksklusif Pentadbir Loji (Admin)
              </span>
            </div>
          </div>

          <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs font-mono">
            {/* Role Select */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Peranan / Jabatan Bertugas:
              </label>
              <select
                disabled={!isAdmin}
                value={selectedRole}
                onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 cursor-pointer"
              >
                <option value="operator">Operator Loji (RF-FR-004 · Siri OP-1xxx)</option>
                <option value="supervisor">Penyelia Syif (Supervisor · Siri SV-2xxx)</option>
                <option value="qc_analyst">Juruanalisis Makmal QC (Siri QC-3xxx)</option>
                <option value="qc_manager">Pengurus Kawalan Kualiti (Siri QM-4xxx)</option>
                <option value="admin">Pentadbir Loji / Admin (Siri AD-5xxx)</option>
                <option value="viewer">Juruaudit Kualiti (ISO/HACCP · Siri AU-9xxx)</option>
              </select>
            </div>

            {/* Auto Generated Consistent ID Preview */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                ID Pekerja Auto-Konsisten (Piawai Loji):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={autoId}
                  className="w-full bg-slate-900 border border-cyan-500/60 rounded-xl px-3 py-2 text-cyan-300 font-bold tracking-wider cursor-not-allowed"
                />
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-2 rounded-xl border border-emerald-800 whitespace-nowrap">
                  Auto-Sequential
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Sistem mengesan ID tertinggi sedia ada dan menambah +1 secara automatik.
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Nama Penuh Kakitangan:
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                required
                placeholder="Contoh: Muhammad Faizal bin Roslan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-sm font-sans text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
            </div>

            {/* Temporary Initial Password */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Kata Laluan Permulaan:
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Standard awal: `password123`. Kakitangan boleh menukar selepas log masuk.
              </span>
            </div>

            <button
              type="submit"
              disabled={!isAdmin || isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-blue-950/60 mt-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftar Kakitangan & Jana Kredensial'}</span>
            </button>
          </form>

          {/* Standards Summary Card */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SKEMA PENOMBORAN KONSISTEN:</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[10px]">
              <li>• <b className="text-emerald-400">OP-1xxx</b>: Operator Loji Syif Pagi/Petang/Malam</li>
              <li>• <b className="text-amber-400">SV-2xxx</b>: Penyelia Syif (Pengesahan Lembaran)</li>
              <li>• <b className="text-cyan-400">QC-3xxx</b>: Analis Makmal (Ujian FFA/IV/Colour/SFC)</li>
              <li>• <b className="text-purple-400">QM-4xxx</b>: Pengurus Kualiti (Disposisi Produk)</li>
              <li>• <b className="text-blue-400">AD-5xxx</b>: Pentadbir Loji & Pengurusan Spesifikasi</li>
              <li>• <b className="text-slate-300">AU-9xxx</b>: Juruaudit Luar (Pemeriksaan Rekod ISO)</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Plant Staff Directory Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span>Direktori Kakitangan Aktif Loji ({filteredProfiles.length})</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500">
                  Data dipadankan bersama PostgreSQL Supabase & Simpanan Tempatan
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari ID atau nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#090d16] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-48 font-mono"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                >
                  <option value="all">Semua Peranan</option>
                  <option value="operator">Operator (OP)</option>
                  <option value="supervisor">Supervisor (SV)</option>
                  <option value="qc_analyst">QC Analyst (QC)</option>
                  <option value="qc_manager">QC Manager (QM)</option>
                  <option value="admin">Admin (AD)</option>
                  <option value="viewer">Viewer / Audit (AU)</option>
                </select>
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-900/40">
              <table className="w-full text-left text-xs font-mono min-w-[550px]">
                <thead className="bg-[#090d16] border-b border-slate-800 text-slate-400 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3.5">ID Pekerja</th>
                    <th className="py-2.5 px-3.5 font-sans font-semibold">Nama Kakitangan</th>
                    <th className="py-2.5 px-3.5">Peranan</th>
                    <th className="py-2.5 px-3.5">Status Akaun</th>
                    <th className="py-2.5 px-3.5 text-right">Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Tiada kakitangan dijumpai mengikut carian.
                      </td>
                    </tr>
                  ) : (
                    filteredProfiles.map((p) => {
                      const badge = roleStyles[p.role] || roleStyles.operator;
                      const isCurrent = p.id === currentProfile.id;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-cyan-400">
                            {p.employee_no}
                          </td>
                          <td className="py-2.5 px-3.5 text-white font-sans font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{p.full_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                                  Anda
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {p.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {p.active ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 text-[10px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                                Dinyahaktif
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {isAdmin ? (
                              <button
                                onClick={() => handleToggleStatus(p.id, p.active, p.full_name)}
                                disabled={isCurrent}
                                className={`text-[10px] px-2 py-1 rounded transition-colors font-semibold ${
                                  isCurrent
                                    ? 'opacity-30 cursor-not-allowed text-slate-500'
                                    : p.active
                                      ? 'text-rose-400 hover:bg-rose-950/60 hover:text-rose-200 border border-rose-800/40'
                                      : 'text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-200 border border-emerald-800/40'
                                }`}
                                title={isCurrent ? 'Tidak boleh menyahaktifkan diri sendiri' : undefined}
                              >
                                {p.active ? 'Nyahaktif' : 'Aktifkan Semula'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600">Admin Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Footer Note */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>21 CFR Part 11 Audit Trail: Sebarang penambahan atau penukaran status kakitangan direkodkan secara kekal.</span>
            <span className="text-slate-400">Nisshin Deodorizer · Lam Soon</span>
          </div>
        </div>

      </div>
    </div>
  );
}
