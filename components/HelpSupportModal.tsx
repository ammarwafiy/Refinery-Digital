'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  BookOpen, 
  FileText, 
  PhoneCall, 
  Activity, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Radio, 
  ExternalLink,
  ChevronRight,
  Database,
  Building2,
  Send,
  Sparkles,
  Info
} from 'lucide-react';
import { Profile } from '@/types/refinery';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: Profile | null;
}

export default function HelpSupportModal({ isOpen, onClose, currentUser }: HelpSupportModalProps) {
  const [activeTab, setActiveTab] = useState<'sop' | 'specs' | 'directory' | 'diagnostics'>('sop');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('process');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccessMessage, setTicketSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      const ticketId = `TCK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      setTicketSuccessMessage(`Tiket berjaya dihantar ke Bahagian Sokongan Kejuruteraan Loji! ID Rujukan: [${ticketId}]. Jurutera bertugas akan mengambil tindakan segera.`);
      setTicketSubject('');
      setTicketDescription('');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0A101D] border border-[#1F2E43] rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2E43] bg-[#0E1726]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#009FE3]/15 border border-[#009FE3]/30 text-[#009FE3] shadow-inner">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Refinery Support & Knowledge Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#101927] text-[#009FE3] border border-[#009FE3]/30">
                  REF-SOP-V1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lam Soon Edible Oils · Digital Operations Manual, Traceability Directory & Technical Helpdesk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A283C] transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#1F2E43] bg-[#080D18]/90 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('sop')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sop'
                ? 'border-[#009FE3] text-[#009FE3] bg-[#009FE3]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101927]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>1. Modul & Aliran Kerja SOP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-[#009FE3] text-[#009FE3] bg-[#009FE3]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101927]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>2. Kamus Kod & Had PORAM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-[#009FE3] text-[#009FE3] bg-[#009FE3]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101927]'
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            <span>3. Talian Bilik Kawalan Loji</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-[#009FE3] text-[#009FE3] bg-[#009FE3]/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#101927]'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>4. Status Sistem & Laporan Isu</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SOP & MODULE WORKFLOW */}
          {activeTab === 'sop' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-[#009FE3]" />
                  <span>Gambaran Keseluruhan Aliran Kerja Operasi Kilang</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sistem Refinery Digital mengintegrasikan operasi kilang penapisan minyak kelapa sawit secara menyeluruh—bermula dari kemasukan log operasi fizikal setiap jam (Shift Handover), pengesahan kualiti makmal (QC Testing), kelulusan berperingkat penyelia, hingga ke pensijilan rasmi ISO dan rekod jejak audit kekal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Module 1 */}
                <div className="bg-[#0B1320] border border-[#1F2E43] hover:border-[#009FE3]/50 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      OPERATOR (OPR001)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">BORANG: RF-FR-004</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">1. Shift Handover & Log Sejam (PL / PR)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Operator memasukkan parameter operasi setiap jam (Suhu Deodorizer 240–265°C, Vakum, Dos Bleaching Earth). Selepas jam ke-8, tandatangan e-signature dan serah tugas shif seterusnya.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Petua: Tekan butang &apos;Copy Previous Hour&apos; untuk menjimatkan masa jika tiada perubahan parameter mendadak.
                  </div>
                </div>

                {/* Module 2 */}
                <div className="bg-[#0B1320] border border-[#1F2E43] hover:border-[#009FE3]/50 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                      QC ANALYST (QCS001)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">BORANG: RF-FR-001</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">2. Ujian Makmal QC (SR / QC)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Staf QC mengambil sampel minyak dan memasukkan keputusan ujian: FFA, M&I, Nilai DOBI, dan Nilai Iodin. Sistem akan mengesahkan kesesuaian nilai secara automatik dengan spesifikasi PORAM.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Petua: Jika keputusan berada di luar had, status bertukar kepada &apos;Quarantine&apos; dan memerlukan semakan penyelia.
                  </div>
                </div>

                {/* Module 3 */}
                <div className="bg-[#0B1320] border border-[#1F2E43] hover:border-[#009FE3]/50 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                      SUPERVISOR / MGR (SUP001 / MGR001)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">STATUS: APPROVED</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">3. Papan Penyelia & Kelulusan (AR)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Penyelia dan Pengurus menyemak borang shif, meluluskan deviasi (variance), serta mengeluarkan Sijil Pelepasan Kelompok Minyak (*Batch Release Certificate*).
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Petua: Tandatangan digital direkodkan secara kekal ke dalam jejak audit tanpa boleh dipadam.
                  </div>
                </div>

                {/* Module 4 */}
                <div className="bg-[#0B1320] border border-[#1F2E43] hover:border-[#009FE3]/50 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                      AUDITOR & ADMIN (ADM001 / USR001)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">STANDARD: ISO 9001</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">4. Borang Rasmi & Jejak Audit (AL)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Pusat cetakan borang rasmi industri (RF-FR-001, RF-FR-004), eksport data ke CSV/PDF, serta semakan integriti lejar audit yang mematuhi garis panduan FDA 21 CFR Part 11.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Petua: Tekan &apos;View JSON&apos; pada baris log audit untuk melihat rekod keadaan sebelum dan selepas operasi.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE DIRECTORY & PORAM SPECS */}
          {activeTab === 'specs' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Code Dictionary */}
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-[#009FE3]" />
                  <span>Kamus Kod Piawaian Loji (Traceability Dictionary)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-[#009FE3] font-mono font-bold text-sm">SR001</div>
                    <div className="text-white font-medium mt-1">Sample Report</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Ujian makmal QC (RF-FR-001)</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-emerald-400 font-mono font-bold text-sm">QC001</div>
                    <div className="text-white font-medium mt-1">QC Decision</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Keputusan pelepasan kelompok</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-amber-400 font-mono font-bold text-sm">PR001</div>
                    <div className="text-white font-medium mt-1">Production Record</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Borang shif harian (RF-FR-004)</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-sky-400 font-mono font-bold text-sm">PL001</div>
                    <div className="text-white font-medium mt-1">Process Log</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Catatan bacaan fizikal setiap jam</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-purple-400 font-mono font-bold text-sm">AR001</div>
                    <div className="text-white font-medium mt-1">Approval Record</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Kelulusan deviasi & signoff</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-rose-400 font-mono font-bold text-sm">AL001</div>
                    <div className="text-white font-medium mt-1">Audit Log</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Lejar keselamatan tidak boleh ubah</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-cyan-400 font-mono font-bold text-sm">BP001</div>
                    <div className="text-white font-medium mt-1">Batch Process</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Kitaran penapisan kelompok</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-indigo-400 font-mono font-bold text-sm">ISO001</div>
                    <div className="text-white font-medium mt-1">ISO Certificate</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Pensijilan pematuhan mutu</div>
                  </div>
                </div>
              </div>

              {/* PORAM Specifications Table */}
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  <span>Had Kawalan Kualiti Minyak Sawit (PORAM & ISO 9001 Standards)</span>
                </h3>
                <div className="overflow-x-auto rounded-lg border border-[#1F2E43]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#080D18] text-slate-400 uppercase text-[10px] font-mono border-b border-[#1F2E43]">
                      <tr>
                        <th className="py-2.5 px-3">Parameter Ujian</th>
                        <th className="py-2.5 px-3">Minyak Mentah (CPO)</th>
                        <th className="py-2.5 px-3">Minyak Ditapis (RBD Palm Oil)</th>
                        <th className="py-2.5 px-3">Tindakan Jika Melebihi Had</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2E43]/60 font-mono">
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Free Fatty Acid (FFA)</td>
                        <td className="py-2.5 px-3 text-slate-300">≤ 5.00 %</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">≤ 0.050 %</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Kaji semula suhu deodorizer / masa tinggal</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Moisture & Impurities (M&I)</td>
                        <td className="py-2.5 px-3 text-slate-300">≤ 0.25 %</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">≤ 0.050 %</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Tingkatkan pengeringan vakum (Dryer)</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">DOBI (Bleachability Index)</td>
                        <td className="py-2.5 px-3 text-amber-400">≥ 2.80 (Good)</td>
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Tambah dos Bleaching Earth dalam Bleacher</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Iodine Value (IV)</td>
                        <td className="py-2.5 px-3 text-slate-300">50.0 – 55.0 Wijs</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">50.0 – 55.0 Wijs</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Semak suapan bahan mentah & fractionation</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Warna Lovibond (5¼&quot; Cell)</td>
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">3.0 Red / 30 Yellow Max</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Semak kecekapan penapis daun (Leaf Filter)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTROL ROOM & HOTLINE DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                  <Radio className="h-4 w-4 text-[#009FE3]" />
                  <span>Direktori Talian Perhubungan Loji Kilang (Lam Soon Refinery)</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Gunakan talian sambungan interkom (Extension) atau saluran radio komunikasi (Walkie-Talkie VHF) sekiranya berlaku kecemasan atau keperluan penyesuaian parameter loji segera.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Central Control Room (CCR / DCS)</div>
                    <div className="text-xs text-slate-400 mt-0.5">Bilik Kawalan Automasi Utama & Deodorizer</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-sky-400">Intercom Ext: <span className="font-bold">201 / 202</span></div>
                      <div className="text-slate-300">VHF Radio: <span className="text-amber-400 font-bold">Channel 4 (Ops Loji)</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Makmal Kawalan Kualiti (QC Central Lab)</div>
                    <div className="text-xs text-slate-400 mt-0.5">Analisis Sampel & Pengesahan Kelompok</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-emerald-400">Intercom Ext: <span className="font-bold">108</span></div>
                      <div className="text-slate-300">Talian Terus: <span className="text-slate-200">+603-3168-8000 (Ext 108)</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Talian Kecemasan & Keselamatan (EHS)</div>
                    <div className="text-xs text-slate-400 mt-0.5">Tumpahan Minyak, Kebakaran & Kemalangan Loji</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-rose-400 font-bold">Kecemasan: 999 / Ext. 911</div>
                      <div className="text-slate-300">Pegawai EHS Bertugas: <span className="text-slate-200">Ext 115</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Sokongan Kejuruteraan IT & SCADA</div>
                    <div className="text-xs text-slate-400 mt-0.5">Sistem Pangkalan Data, Rangkaian & Sensor Loji</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-purple-400">Intercom Ext: <span className="font-bold">305</span></div>
                      <div className="text-slate-300">Emel: <span className="text-slate-200">plant-it@lamsoon.com.my</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift Hours Guide */}
              <div className="bg-[#080D18] p-4 rounded-xl border border-[#1F2E43]">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#009FE3]" />
                  <span>Jadual Waktu Syif Operasi Loji 24 Jam</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1F2E43]">
                    <div className="text-amber-400 font-bold">SYIF A (Pagi)</div>
                    <div className="text-slate-200 text-sm mt-0.5">06:00 – 14:00 MYT</div>
                    <div className="text-[10px] text-slate-400 mt-1">Handover pada jam 13:45</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1F2E43]">
                    <div className="text-sky-400 font-bold">SYIF B (Petang)</div>
                    <div className="text-slate-200 text-sm mt-0.5">14:00 – 22:00 MYT</div>
                    <div className="text-[10px] text-slate-400 mt-1">Handover pada jam 21:45</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1F2E43]">
                    <div className="text-purple-400 font-bold">SYIF C (Malam)</div>
                    <div className="text-slate-200 text-sm mt-0.5">22:00 – 06:00 MYT</div>
                    <div className="text-[10px] text-slate-400 mt-1">Handover pada jam 05:45</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM HEALTH & ISSUE TICKET SUBMISSION */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Diagnostics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Pangkalan Data</div>
                  <div className="text-emerald-400 font-bold text-sm mt-1 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Supabase Cloud (ap-southeast-1)</div>
                </div>

                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Zon Masa Loji</div>
                  <div className="text-[#009FE3] font-bold text-sm mt-1">Asia/Kuala_Lumpur</div>
                  <div className="text-[10px] text-slate-400 mt-1">MYT (UTC +08:00)</div>
                </div>

                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Lejar Audit</div>
                  <div className="text-purple-400 font-bold text-sm mt-1">226+ Rekod</div>
                  <div className="text-[10px] text-slate-400 mt-1">Kekal & Disahkan Integriti</div>
                </div>

                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Versi Sistem</div>
                  <div className="text-white font-bold text-sm mt-1">v1.0.0 Production</div>
                  <div className="text-[10px] text-slate-400 mt-1">Next.js 16 + React 19</div>
                </div>
              </div>

              {/* Support Ticket Submission */}
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <Send className="h-4 w-4 text-[#009FE3]" />
                  <span>Borang Laporan Masalah & Aduan Teknikal Kilang</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Laporkan sebarang ralat pengiraan, masalah pautan pangkalan data, atau sensor loji yang tidak disegerakkan terus kepada Bahagian Kejuruteraan Loji.
                </p>

                {ticketSuccessMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{ticketSuccessMessage}</span>
                  </div>
                )}

                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Kategori Isu
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full bg-[#080D18] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#009FE3]"
                      >
                        <option value="process">Operasi Shift & Log Sejam (RF-FR-004)</option>
                        <option value="qc">Ujian Makmal QC & Nilai Sampel (RF-FR-001)</option>
                        <option value="scada">Sambungan Sensor / DCS Pelayan</option>
                        <option value="security">Akaun Pengguna & Hak Akses</option>
                        <option value="general">Cadangan Penambahbaikan Sistem</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Tajuk Isu / Lokasi Peralatan
                      </label>
                      <input
                        type="text"
                        placeholder="cth: Deodorizer D-201 sensor tekanan tidak stabil"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full bg-[#080D18] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Keterangan Terperinci Isu
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Terangkan masalah yang dihadapi, nombor batch atau masa kejadian berlaku..."
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      className="w-full bg-[#080D18] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Pelapor: <span className="text-[#009FE3] font-semibold">{currentUser?.full_name || 'Staff Loji'}</span> ({currentUser?.employee_no || 'OPR001'})
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#009FE3] hover:bg-[#0085C0] text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingTicket ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menghantar...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Hantar Tiket Bantuan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1F2E43] bg-[#0E1726]/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <Info className="h-3.5 w-3.5 text-[#009FE3]" />
            <span>Dokumentasi Rasmi Loji · Dikemaskini 2026-09-28</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#142032] hover:bg-[#1A283C] text-slate-200 font-mono text-xs border border-[#1F2E43] transition-colors cursor-pointer"
          >
            Tutup (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
