'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Clock, 
  Layers, 
  FlaskConical, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Save, 
  Check, 
  ArrowRight,
  Eye,
  FileText
} from 'lucide-react';
import { UserRole } from '@/types/refinery';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: UserRole;
}

export default function InteractiveTutorialModal({
  isOpen,
  onClose,
  currentRole = 'operator',
}: InteractiveTutorialModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRoleGuide, setSelectedRoleGuide] = useState<'operator' | 'qc' | 'supervisor'>('operator');

  useEffect(() => {
    if (currentRole === 'qc_analyst' || currentRole === 'qc_manager') {
      setSelectedRoleGuide('qc');
    } else if (currentRole === 'supervisor' || currentRole === 'admin') {
      setSelectedRoleGuide('supervisor');
    } else {
      setSelectedRoleGuide('operator');
    }
  }, [currentRole, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setActiveStep((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const STEPS = [
    {
      id: 'step-1',
      title: '1. Hourly Shift Timeline & Live Window',
      subtitle: 'Memilih Slot Jam & Memahami Tingkap Waktu Operasi',
      icon: Clock,
      color: '#009FE3',
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Pada bahagian atas borang <b>Process Control Log</b>, terdapat 24 slot jam pengeluaran loji (bermula jam <b>0700</b> pagi hingga <b>0600</b> keesokan hari).
          </p>

          <div className="bg-[#0B1320] border border-[#1F2E43] p-3.5 rounded-xl space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
              Visual Preview: Timeline Slot Header
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
              <div className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 shrink-0">
                <Check className="h-3 w-3" />
                <span>0700 (Saved)</span>
              </div>
              <div className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 shrink-0">
                <Check className="h-3 w-3" />
                <span>0800 (Saved)</span>
              </div>
              <div className="px-3 py-1.5 rounded-md text-xs font-mono bg-[#009FE3] text-white font-bold ring-2 ring-[#009FE3]/50 shadow-md flex items-center gap-1.5 shrink-0 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>1400 (LIVE WINDOW)</span>
              </div>
              <div className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#101927] text-slate-500 border border-[#1F2E43] shrink-0">
                <span>1500 (Locked)</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-amber-300/90 bg-amber-950/20 border border-amber-800/30 p-3 rounded-lg leading-relaxed font-mono">
            ⚠️ <b>Peraturan Audit ISO:</b> Anda hanya boleh memasukkan bacaan pada slot jam semasa (<i>Live Window</i>). Jam yang telah berlalu atau belum tiba akan dikunci secara automatik untuk melindungi integriti audit.
          </div>
        </div>
      )
    },
    {
      id: 'step-2',
      title: '2. Input Readings & Copy Feature',
      subtitle: 'Memasukkan Parameter Loji & Fungsi Salin Sejam Lalu',
      icon: Layers,
      color: '#10B981',
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Pilih jenis minyak yang sedang diproses di <b>Section A</b> (contoh: <i>RBD Palm Olein</i>). Kemudian masukkan bacaan suhu Deodorizer, kadar suapan (<i>Feed Rate</i>), dan tekanan vakum.
          </p>

          <div className="bg-[#0B1320] border border-[#1F2E43] p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                💡 Shortcut: Butang Salin Jam Lalu
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#131F33] text-slate-300 border border-[#1F2E43]">
                Ergonomic Feature
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070C16] border border-[#172437] flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                Loji beroperasi dalam keadaan stabil (*steady-state*)?
              </span>
              <div className="px-2.5 py-1 rounded bg-slate-800 text-sky-300 text-xs font-mono border border-sky-500/30 flex items-center gap-1.5 shadow-xs">
                <Copy className="h-3.5 w-3.5 text-sky-400" />
                <span>Copy readings from 13:00</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Tekan butang ini untuk menyalin bacaan jam lalu secara automatik ke dalam slot semasa tanpa perlu menaip semula satu persatu.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'step-3',
      title: '3. Save Hour Log (Simpan Bacaan Sahaja)',
      subtitle: 'Menyimpan Rekod Telemetri ke Audit Trail',
      icon: Save,
      color: '#3B82F6',
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Selepas semua bacaan jam semasa lengkap diisi, tekan butang biru <b>&quot;Save Hour Log&quot;</b> di bahagian paling bawah borang.
          </p>

          <div className="bg-[#0B1320] border border-[#1F2E43] p-4 rounded-xl flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-white">Butang Penyimpanan Utama</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Menyimpan nombor telemetri ke pangkalan data loji.
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-[#009FE3] text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-[#009FE3]/20">
              <Save className="h-3.5 w-3.5" />
              <span>Save Hour Log</span>
            </div>
          </div>

          <div className="text-[11px] text-emerald-300/90 bg-emerald-950/20 border border-emerald-800/30 p-3 rounded-lg leading-relaxed font-mono">
            ℹ️ <b>Penting:</b> Butang ini <u>HANYA MENYIMPAN</u> bacaan telemetri proses anda. Ia <b>tidak</b> menghantar sample ke makmal QC secara automatik. Sila teruskan ke Langkah 4 untuk menghantar sample fizikal.
          </div>
        </div>
      )
    },
    {
      id: 'step-4',
      title: '4. Sample For QC (Hantar Sample ke Makmal)',
      subtitle: 'Menyerahkan Sample Minyak Fizikal ke Barisan Giliran QC',
      icon: FlaskConical,
      color: '#F59E0B',
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Selepas mengambil sample minyak fizikal dari paip pengeluaran (<i>Header 4 Sampling Outlet</i>), tekan butang kuning <b>&quot;Sample For QC&quot;</b> (terletak di sebelah kiri butang *Save Hour Log*).
          </p>

          <div className="bg-[#0B1320] border border-[#1F2E43] p-4 rounded-xl flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-amber-400">Butang Penyerahan QC</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Menghantar rekod lot sample terus ke makmal QC.
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Sample For QC</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Selepas ditekan, butang akan bertukar hijau menjadi <b>&quot;✓ Sample Sent to QC&quot;</b>. Pihak QC Chemist akan serta-merta menerima rekod sample ini di paparan <b>QC Lab</b> mereka untuk memulakan ujian makmal.
          </p>
        </div>
      )
    },
    {
      id: 'step-5',
      title: '5. Notifikasi Keputusan QC (Loceng & Toast)',
      subtitle: 'Mengetahui Sample Diterima (Accept) atau Ditolak (Reject)',
      icon: Bell,
      color: '#EF4444',
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Operator tidak perlu lagi bertanya kepada QC secara manual. Sebaik sahaja pihak Chemist selesai menguji dan menghantar keputusan:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Accept Card */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs font-mono">
                <CheckCircle2 className="h-4 w-4" />
                <span>ACCEPTED (DITERIMA)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Parameter (FFA, Warna Lovibond, Moisture) lulus spesifikasi PORAM. Minyak selamat dipindahkan ke tangki simpanan.
              </p>
            </div>

            {/* Reject Card */}
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 space-y-1">
              <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs font-mono">
                <AlertCircle className="h-4 w-4" />
                <span>REJECTED (DITOLAK)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Parameter luar spesifikasi (contoh: FFA tinggi). Makluman pelupusan (<i>HOLD / REWORK</i>) dipaparkan serta-merta.
              </p>
            </div>
          </div>

          <div className="bg-[#0B1320] border border-[#1F2E43] p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                <Bell className="h-4 w-4 text-[#009FE3]" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Gambar Loceng (Sebelah Sign Out)</span>
                <span className="text-[11px] text-slate-400">Klik loceng bila-bila masa untuk semak senarai keputusan.</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">Read All</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">Clear All</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'step-6',
      title: '6. Shift Lock, Sign-Off & Sijil COA',
      subtitle: 'Pengesahan Penyelia & Penjanaan Sijil Rasmi',
      icon: ShieldCheck,
      color: '#A855F7',
      content: (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Pada penghujung syif 8 jam (Shift Handover):
          </p>

          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-[#0B1320] border border-[#1F2E43] flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">1</span>
              <div>
                <b className="text-xs text-white">Supervisor Verification</b>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Penyelia menyemak kesemua 8 slot jam dan menekan butang <b>&quot;Verify &amp; Lock Shift Sheet&quot;</b> dengan kata laluan E-Signature.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B1320] border border-[#1F2E43] flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">2</span>
              <div>
                <b className="text-xs text-white">Certificates &amp; Reports</b>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Buka tab <b>Certificates</b> untuk menjana Sijil Analisis (COA) dengan kod QR sah, atau tab <b>Reports</b> untuk mencetak borang rasmi RF-FR-001 &amp; RF-FR-004 bagi audit ISO / MPOB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStepData = STEPS[activeStep];
  const StepIcon = currentStepData.icon;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-alert-overlay-in font-sans"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#090F1B] border border-[#1F2E43] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] animate-alert-content-in"
      >
        {/* 1. Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2E43] bg-[#0C1524]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#009FE3]/15 text-[#009FE3] border border-[#009FE3]/30 shadow-inner">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Refinery Operations System Tutorial
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/30">
                  Panduan Pengguna
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Tutorial interaktif cara menggunakan sistem loji penapisan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Tutorial"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Step Navigator Progress Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-[#1F2E43] bg-[#070D18] flex items-center justify-between overflow-x-auto no-scrollbar gap-1.5">
          {STEPS.map((step, idx) => {
            const isCurrent = activeStep === idx;
            const isCompleted = activeStep > idx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-[#009FE3] text-white font-bold shadow-md'
                    : isCompleted
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-medium'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <span>{idx + 1}</span>
                <span className="hidden sm:inline text-[11px]">
                  {idx === 0 ? 'Timeline' : idx === 1 ? 'Reading' : idx === 2 ? 'Save' : idx === 3 ? 'QC Sample' : idx === 4 ? 'Bell & Toast' : 'Lock'}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Main Step Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
              style={{ 
                backgroundColor: `${currentStepData.color}15`, 
                borderColor: `${currentStepData.color}40`,
                color: currentStepData.color 
              }}
            >
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                {currentStepData.title}
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentStepData.subtitle}
              </p>
            </div>
          </div>

          <div className="pt-1">
            {currentStepData.content}
          </div>
        </div>

        {/* 4. Footer Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#1F2E43] bg-[#070D18]">
          <span className="text-[11px] font-mono text-slate-500">
            Langkah {activeStep + 1} daripada {STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#101927] hover:bg-[#1A263B] border border-[#1F2E43] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Sebelumnya</span>
              </button>
            )}

            {activeStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1))}
                className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-[#009FE3] hover:bg-[#00B4FF] transition-all flex items-center gap-1 cursor-pointer shadow-md active:scale-95"
              >
                <span>Seterusnya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Check className="h-4 w-4" />
                <span>Selesai &amp; Mula Operasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
