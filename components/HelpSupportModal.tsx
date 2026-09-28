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
  Info,
  MessageSquare
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { addAuditLog } from '@/lib/data-service';

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
  const [ticketWhatsAppUrl, setTicketWhatsAppUrl] = useState<string | null>(null);
  const [ticketErrorMessage, setTicketErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsSubmittingTicket(true);
    setTicketErrorMessage(null);
    setTicketSuccessMessage(null);
    setTicketWhatsAppUrl(null);

    try {
      const response = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          category: ticketCategory,
          description: ticketDescription.trim(),
          reporterName: currentUser?.full_name || 'Plant Personnel',
          reporterId: currentUser?.employee_no || 'OPR001',
          reporterRole: currentUser?.role || 'operator',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal menghantar tiket aduan.');
      }

      const ticketId = result.ticketId;

      setTicketSuccessMessage(
        `Tiket [${ticketId}] berjaya didaftarkan ke Log Audit Loji & disalurkan ke WhatsApp Pengurus Loji!`
      );

      if (result.whatsappUrl) {
        setTicketWhatsAppUrl(result.whatsappUrl);
      }

      // Append to immutable client audit trail for immediate UI sync
      addAuditLog('incident_tickets', ticketId, 'insert', null, {
        ticket_id: ticketId,
        subject: ticketSubject.trim(),
        category: ticketCategory,
        description: ticketDescription.trim(),
        reporter: `${currentUser?.full_name || 'Plant Personnel'} (${currentUser?.employee_no || 'OPR001'})`,
        dispatched_to_whatsapp: targetPhone,
      });

      setTicketSubject('');
      setTicketDescription('');
    } catch (err: any) {
      console.error('[Incident Ticket Dispatch Error]:', err);
      setTicketErrorMessage(err.message || 'Ralat semasa menghantar tiket aduan.');
    } finally {
      setIsSubmittingTicket(false);
    }
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
            title="Close Modal"
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
            <span>1. Modules & SOP Workflow</span>
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
            <span>2. Code Standards & PORAM Specs</span>
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
            <span>3. Plant Control Room Hotline</span>
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
            <span>4. System Status & Incident Ticket</span>
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
                  <span>Plant Operational Workflow Overview</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Refinery Digital Operations Suite unifies palm oil processing end-to-end—spanning physical hourly telemetry logs (Shift Handover), certified laboratory testing (QC Testing), multi-tiered supervisory approvals, and permanent 21 CFR Part 11 audit trails for ISO compliance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Module 1 */}
                <div className="bg-[#0B1320] border border-[#1F2E43] hover:border-[#009FE3]/50 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      OPERATOR (OPR001)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">FORM: RF-FR-004</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">1. Shift Handover & Hourly Logs (PL / PR)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Operators log physical operating parameters hourly (Deodorizer Temperature 240–265°C, Vacuum pressure, Bleaching Earth dosage). At hour 8, execute digital e-signature to complete shift handover.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Tip: Click &apos;Copy Previous Hour&apos; to accelerate logging when equipment runs in steady state.
                  </div>
                </div>

                {/* Module 2 */}
                <div className="bg-[#0B1320] border border-[#1F2E43] hover:border-[#009FE3]/50 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                      QC ANALYST (QCS001)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">FORM: RF-FR-001</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">2. QC Laboratory Testing (SR / QC)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    QC analysts sample palm oil batches and record analytical test results: FFA, M&I, DOBI value, and Iodine Value (IV). The system evaluates test results against PORAM trade standards automatically.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Tip: If values fall outside strict limits, the status automatically flags as &apos;Quarantine&apos; requiring supervisor review.
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
                  <h4 className="text-sm font-bold text-white mb-1">3. Supervisor Board & Approvals (AR)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Shift supervisors and plant quality managers audit shift sheets, authorize operational variance concessions, and issue official Batch Release Certificates.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Tip: Every digital signoff is permanently registered in the tamper-evident audit ledger.
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
                  <h4 className="text-sm font-bold text-white mb-1">4. Official Forms & Audit Trail (AL)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    Central repository for printing official plant forms (RF-FR-001, RF-FR-004), exporting analytical data to CSV/PDF, and verifying FDA 21 CFR Part 11 compliant audit integrity.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-[#070C16] p-2.5 rounded-lg border border-[#172437] font-mono">
                    💡 Tip: Click &apos;View Details&apos; on any audit log row to inspect exact pre-change and post-change JSON states.
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
                  <span>Official Plant Traceability Code Directory</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-[#009FE3] font-mono font-bold text-sm">SR001</div>
                    <div className="text-white font-medium mt-1">Sample Report</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">QC Lab Analysis (RF-FR-001)</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-emerald-400 font-mono font-bold text-sm">QC001</div>
                    <div className="text-white font-medium mt-1">QC Decision</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Batch Release & Disposition</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-amber-400 font-mono font-bold text-sm">PR001</div>
                    <div className="text-white font-medium mt-1">Production Record</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Daily Shift Sheet (RF-FR-004)</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-sky-400 font-mono font-bold text-sm">PL001</div>
                    <div className="text-white font-medium mt-1">Process Log</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Hourly Process Readings</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-purple-400 font-mono font-bold text-sm">AR001</div>
                    <div className="text-white font-medium mt-1">Approval Record</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Variance Approvals & Signoffs</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-rose-400 font-mono font-bold text-sm">AL001</div>
                    <div className="text-white font-medium mt-1">Audit Log</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Immutable Security Ledger</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-cyan-400 font-mono font-bold text-sm">BP001</div>
                    <div className="text-white font-medium mt-1">Batch Process</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Refinery Production Batch</div>
                  </div>
                  <div className="bg-[#080D18] p-3 rounded-lg border border-[#1F2E43]">
                    <div className="text-indigo-400 font-mono font-bold text-sm">ISO001</div>
                    <div className="text-white font-medium mt-1">ISO Certificate</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Quality Compliance Certificate</div>
                  </div>
                </div>
              </div>

              {/* PORAM Specifications Table */}
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  <span>Palm Oil Quality Specifications (PORAM & ISO 9001 Standards)</span>
                </h3>
                <div className="overflow-x-auto rounded-lg border border-[#1F2E43]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#080D18] text-slate-400 uppercase text-[10px] font-mono border-b border-[#1F2E43]">
                      <tr>
                        <th className="py-2.5 px-3">Test Parameter</th>
                        <th className="py-2.5 px-3">Crude Palm Oil (CPO)</th>
                        <th className="py-2.5 px-3">RBD Palm Oil (Refined)</th>
                        <th className="py-2.5 px-3">Corrective Engineering Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2E43]/60 font-mono">
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Free Fatty Acid (FFA)</td>
                        <td className="py-2.5 px-3 text-slate-300">≤ 5.00 %</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">≤ 0.050 %</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Adjust deodorizer temperature (250–265°C) & stripping steam</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Moisture & Impurities (M&I)</td>
                        <td className="py-2.5 px-3 text-slate-300">≤ 0.25 %</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">≤ 0.050 %</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Increase vacuum dryer temperature & inspect vacuum ejectors</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">DOBI (Bleachability Index)</td>
                        <td className="py-2.5 px-3 text-amber-400">≥ 2.80 (Good)</td>
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Increase activated Bleaching Earth dosage in Bleacher B-101</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Iodine Value (IV)</td>
                        <td className="py-2.5 px-3 text-slate-300">50.0 – 55.0 Wijs</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">50.0 – 55.0 Wijs</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Verify CPO origin feedstock & fractionation crystallization cuts</td>
                      </tr>
                      <tr className="hover:bg-[#121D2C]">
                        <td className="py-2.5 px-3 text-white font-sans font-medium">Lovibond Colour (5¼&quot; Cell)</td>
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">3.0 Red / 30 Yellow Max</td>
                        <td className="py-2.5 px-3 text-rose-400 font-sans">Check leaf filter screen integrity & heat bleach residence time</td>
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
                  <span>Plant Communications & Intercom Directory (Lam Soon Refinery)</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Use internal extension lines or handheld VHF two-way radios for immediate operational coordination or process escalation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Central Control Room (CCR / DCS)</div>
                    <div className="text-xs text-slate-400 mt-0.5">Primary Plant Automation & Deodorizer Control</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-sky-400">Intercom Ext: <span className="font-bold">201 / 202</span></div>
                      <div className="text-slate-300">VHF Radio: <span className="text-amber-400 font-bold">Channel 4 (Plant Ops)</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">QC Central Laboratory</div>
                    <div className="text-xs text-slate-400 mt-0.5">Sample Analytical Testing & Batch Certification</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-emerald-400">Intercom Ext: <span className="font-bold">108</span></div>
                      <div className="text-slate-300">Direct Line: <span className="text-slate-200">+603-3168-8000 (Ext 108)</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Emergency Health & Safety (EHS)</div>
                    <div className="text-xs text-slate-400 mt-0.5">Oil Spill Containment, Fire Alarms & Site Incidents</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-rose-400 font-bold">Emergency: 999 / Ext. 911</div>
                      <div className="text-slate-300">Duty Safety Officer: <span className="text-slate-200">Ext 115</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B1320] border border-[#1F2E43] rounded-xl p-4 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Plant IT & SCADA Engineering</div>
                    <div className="text-xs text-slate-400 mt-0.5">Database Infrastructure, Network & Process Sensors</div>
                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-purple-400">Intercom Ext: <span className="font-bold">305</span></div>
                      <div className="text-slate-300">Email: <span className="text-slate-200">plant-it@lamsoon.com.my</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift Hours Guide */}
              <div className="bg-[#080D18] p-4 rounded-xl border border-[#1F2E43]">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#009FE3]" />
                  <span>24-Hour Continuous Plant Shift Schedule</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1F2E43]">
                    <div className="text-amber-400 font-bold">SHIFT A (Morning)</div>
                    <div className="text-slate-200 text-sm mt-0.5">06:00 – 14:00 MYT</div>
                    <div className="text-[10px] text-slate-400 mt-1">Handover window: 13:45</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1F2E43]">
                    <div className="text-sky-400 font-bold">SHIFT B (Afternoon)</div>
                    <div className="text-slate-200 text-sm mt-0.5">14:00 – 22:00 MYT</div>
                    <div className="text-[10px] text-slate-400 mt-1">Handover window: 21:45</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0E1726] border border-[#1F2E43]">
                    <div className="text-purple-400 font-bold">SHIFT C (Night)</div>
                    <div className="text-slate-200 text-sm mt-0.5">22:00 – 06:00 MYT</div>
                    <div className="text-[10px] text-slate-400 mt-1">Handover window: 05:45</div>
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
                  <div className="text-slate-400 text-[10px] uppercase">Database Engine</div>
                  <div className="text-emerald-400 font-bold text-sm mt-1 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Supabase Cloud (ap-southeast-1)</div>
                </div>

                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Plant Timezone</div>
                  <div className="text-[#009FE3] font-bold text-sm mt-1">Asia/Kuala_Lumpur</div>
                  <div className="text-[10px] text-slate-400 mt-1">MYT (UTC +08:00)</div>
                </div>

                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Audit Ledger</div>
                  <div className="text-purple-400 font-bold text-sm mt-1">226+ Records</div>
                  <div className="text-[10px] text-slate-400 mt-1">Immutable & Verified</div>
                </div>

                <div className="bg-[#0E1726] p-3.5 rounded-xl border border-[#1F2E43]">
                  <div className="text-slate-400 text-[10px] uppercase">Application Build</div>
                  <div className="text-white font-bold text-sm mt-1">v1.0.0 Production</div>
                  <div className="text-[10px] text-slate-400 mt-1">Next.js 16 + React 19</div>
                </div>
              </div>

              {/* Support Ticket Submission */}
              <div className="bg-[#0E1726] border border-[#1F2E43] rounded-xl p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <Send className="h-4 w-4 text-[#009FE3]" />
                  <span>Report Plant Incident or Technical Issue</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Log isu operasi, percanggahan nilai makmal, penderia SCADA atau sistem. Aduan akan terus disalurkan ke WhatsApp Pengurus Loji secara automatik.
                </p>

                {ticketSuccessMessage && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col gap-2.5 animate-in fade-in">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                      <span className="font-medium">{ticketSuccessMessage}</span>
                    </div>

                    {ticketWhatsAppUrl && (
                      <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-emerald-400/90 font-mono">
                          Salinan terus WhatsApp rasmi sedia dihantar.
                        </span>
                        <a
                          href={ticketWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow-sm"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Buka Salinan di WhatsApp Pengurus</span>
                          <ExternalLink className="h-3 w-3 opacity-80" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {ticketErrorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{ticketErrorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Issue Category
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full bg-[#080D18] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#009FE3]"
                      >
                        <option value="process">Shift Operations & Hourly Log (RF-FR-004)</option>
                        <option value="qc">QC Laboratory Testing & Sample Results (RF-FR-001)</option>
                        <option value="scada">Physical Sensor / DCS Connectivity</option>
                        <option value="security">User Authentication & Role Permissions</option>
                        <option value="general">System Feature Enhancement Request</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Issue Subject / Equipment Tag
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Deodorizer D-201 vacuum transmitter pressure spike"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full bg-[#080D18] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Detailed Incident Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe the discrepancy, equipment status, lot number, or time of observation..."
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      className="w-full bg-[#080D18] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Reporter: <span className="text-[#009FE3] font-semibold">{currentUser?.full_name || 'Plant Personnel'}</span> ({currentUser?.employee_no || 'OPR001'})
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#009FE3] hover:bg-[#0085C0] text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingTicket ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Submit Support Ticket</span>
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
            <span>Official Plant Documentation · Updated 2026-09-28</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#142032] hover:bg-[#1A283C] text-slate-200 font-mono text-xs border border-[#1F2E43] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
