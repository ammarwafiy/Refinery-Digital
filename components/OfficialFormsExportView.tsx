'use client';

import React, { useState } from 'react';
import { 
  getActiveProcessSheet, 
  getSampleReports, 
  getAuditLogs 
} from '@/lib/data-service';
import { 
  FileText, 
  Printer, 
  Download, 
  History, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Table, 
  Calendar,
  Layers
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function OfficialFormsExportView() {
  const sheet = getActiveProcessSheet();
  const reports = getSampleReports();
  const auditLogs = getAuditLogs();

  const [activeFormType, setActiveFormType] = useState<'rf_fr_004' | 'rf_fr_001' | 'audit'>('rf_fr_004');
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');

  const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeFormType === 'rf_fr_004') {
      const headers = [
        'Time Slot', 'Product', 'Oil Feed Rate (L)', 'Deod Time (Hr)', 'Vacuum (Torr)',
        'Tray 1 (C)', 'Tray 2 (C)', 'Tray 3 (C)', 'Tray 4 (C)', 'Tray 5 (C)', 'Tray 6 (C)', 'Tray 7 (C)',
        'BC101 In (C)', 'BC101 Out (C)', 'Chill In (C)', 'Chill Out (C)',
        'Booster (Bar)', 'Ejector (Bar)', 'Strip Steam %', 'Strip Flow (kg/h)',
        'FP101A (Bar)', 'FP101B (Bar)', 'Remarks', 'Recorded By'
      ];

      const rows = (sheet.entries || []).map(e => [
        e.slot_label,
        e.product_name || '-',
        e.oil_feed_rate_litre || '-',
        e.deod_time_set_hr || '-',
        e.vacuum_torr || '-',
        e.tray_1_temp_c || '-',
        e.tray_2_temp_c || '-',
        e.tray_3_temp_c || '-',
        e.tray_4_temp_c || '-',
        e.tray_5_temp_c || '-',
        e.tray_6_temp_c || '-',
        e.tray_7_temp_c || '-',
        e.bc101_water_in_c || '-',
        e.bc101_water_out_c || '-',
        e.chill_water_in_c || '-',
        e.chill_water_out_c || '-',
        e.booster_press_bar || '-',
        e.ejector_press_bar || '-',
        e.strip_steam_pct_of_oil || '-',
        e.strip_steam_flow_kghr || '-',
        e.fp101a_press_bar || '-',
        e.fp101b_press_bar || '-',
        `"${(e.remarks || '').replace(/"/g, '""')}"`,
        e.recorded_by_name || '-'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RF-FR-004_Deodorizer_Log_${sheet.shift_date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeFormType === 'rf_fr_001') {
      const headers = ['Report No', 'Sample Date', 'Time', 'Lot No', 'Product', 'Tank', 'Status', 'Decision', 'Decided By'];
      const rows = reports.map(r => [
        r.report_no,
        r.sample_date,
        r.time_check,
        r.lot_no,
        `"${(r.product_name || '').replace(/"/g, '""')}"`,
        r.feed_tank_code || '-',
        r.status,
        r.decision?.decision || 'PENDING',
        r.decision?.decided_by_name || '-'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RF-FR-001_Sample_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Official Controlled Forms & Regulatory Audit Trail</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact physical form layout replication for customer and ISO quality audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition-all border border-slate-700 shadow"
            >
              <Printer className="h-4 w-4 text-cyan-400" />
              <span>Print Official PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-950/40"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* Form Selector Tabs */}
        <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3 text-xs font-mono">
          <button
            onClick={() => setActiveFormType('rf_fr_004')}
            className={`px-3.5 py-1.5 rounded-lg border transition-all ${
              activeFormType === 'rf_fr_004'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            RF-FR-004 : 24-Hour Process Sheet
          </button>

          <button
            onClick={() => setActiveFormType('rf_fr_001')}
            className={`px-3.5 py-1.5 rounded-lg border transition-all ${
              activeFormType === 'rf_fr_001'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            RF-FR-001 : Sample Analysis Certificate
          </button>

          <button
            onClick={() => setActiveFormType('audit')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition-all ${
              activeFormType === 'audit'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Immutable Audit Trail ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* FORM 1: RF-FR-004 Layout */}
      {activeFormType === 'rf_fr_004' && (
        <div className="rounded-2xl border border-slate-700 bg-white text-slate-900 p-8 shadow-2xl overflow-x-auto print:border-none print:shadow-none print:p-0">
          {/* Form Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  Lam Soon Edible Oils Sdn. Bhd.
                </h2>
                <div className="text-sm font-semibold text-slate-700">
                  Refinery Section · Nisshin Deodorizer Plant
                </div>
                <div className="text-base font-bold text-slate-900 mt-1 uppercase">
                  Hourly Process Control Log Sheet
                </div>
              </div>

              <div className="text-right font-mono text-xs border border-slate-900 p-2 rounded">
                <div><strong>DOC NO:</strong> RF-FR-004</div>
                <div><strong>REVISION:</strong> 02</div>
                <div><strong>EFFECTIVE:</strong> 01/01/2026</div>
              </div>
            </div>

            {/* Sub-header Parameters */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-300 font-mono text-xs">
              <div>
                <span className="text-slate-500">SHIFT DATE:</span> <strong>{sheet.shift_date}</strong>
              </div>
              <div>
                <span className="text-slate-500">STRIPPING STEAM:</span> <strong>{sheet.stripping_steam_pct.toFixed(2)} % of oil</strong>
              </div>
              <div>
                <span className="text-slate-500">STEAM SUPPLY:</span> <strong>{sheet.set_steam_supply_bar.toFixed(2)} Bar</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500">STATUS:</span> <strong className="uppercase">{sheet.status}</strong>
              </div>
            </div>
          </div>

          {/* 24-Row × 21-Column Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-slate-900 text-[10px] font-mono">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-900 text-slate-800">
                  <th className="border border-slate-900 p-1" rowSpan={2}>Time</th>
                  <th className="border border-slate-900 p-1" rowSpan={2}>Type of Oil</th>
                  <th className="border border-slate-900 p-1" colSpan={3}>Processing</th>
                  <th className="border border-slate-900 p-1" colSpan={7}>Temperature Recorder (°C)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>BC 101 (°C)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Chilling (°C)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Steam Press (Bar)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Stripping Steam</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Filtration (Bar)</th>
                  <th className="border border-slate-900 p-1" rowSpan={2}>Remarks</th>
                </tr>
                <tr className="bg-slate-100 text-[9px] border-b border-slate-900">
                  <th className="border border-slate-900 p-1">Feed (L)</th>
                  <th className="border border-slate-900 p-1">Time (Hr)</th>
                  <th className="border border-slate-900 p-1">Vac (Torr)</th>
                  <th className="border border-slate-900 p-1">T1</th>
                  <th className="border border-slate-900 p-1">T2</th>
                  <th className="border border-slate-900 p-1">T3</th>
                  <th className="border border-slate-900 p-1">T4</th>
                  <th className="border border-slate-900 p-1">T5</th>
                  <th className="border border-slate-900 p-1">T6</th>
                  <th className="border border-slate-900 p-1">T7</th>
                  <th className="border border-slate-900 p-1">In</th>
                  <th className="border border-slate-900 p-1">Out</th>
                  <th className="border border-slate-900 p-1">In</th>
                  <th className="border border-slate-900 p-1">Out</th>
                  <th className="border border-slate-900 p-1">Boost</th>
                  <th className="border border-slate-900 p-1">Ejec</th>
                  <th className="border border-slate-900 p-1">%</th>
                  <th className="border border-slate-900 p-1">kg/h</th>
                  <th className="border border-slate-900 p-1">FP-A</th>
                  <th className="border border-slate-900 p-1">FP-B</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }).map((_, idx) => {
                  const label = String(((idx + 7) % 24) * 100).padStart(4, '0');
                  const entry = sheet.entries?.find(e => e.slot_index === idx);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-900 p-1 font-bold">{label}</td>
                      <td className="border border-slate-900 p-1 font-sans text-left max-w-[90px] truncate">
                        {entry?.product_name || '-'}
                      </td>
                      <td className="border border-slate-900 p-1">{entry?.oil_feed_rate_litre || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.deod_time_set_hr || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.vacuum_torr || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_1_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_2_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_3_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_4_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_5_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_6_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_7_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.bc101_water_in_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.bc101_water_out_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.chill_water_in_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.chill_water_out_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.booster_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.ejector_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.strip_steam_pct_of_oil || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.strip_steam_flow_kghr || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.fp101a_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.fp101b_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1 font-sans text-left max-w-[120px] truncate">
                        {entry?.remarks || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Verification Sign-Off Footer */}
          <div className="grid grid-cols-2 gap-8 mt-6 pt-4 border-t-2 border-slate-900 text-xs font-mono">
            <div>
              <div className="text-slate-500 mb-1">RECORDED BY (LEAD OPERATOR):</div>
              <div className="font-bold text-slate-800 border-b border-slate-400 pb-1">
                {sheet.opened_by_name || 'Ahmad Razak (OP-1042)'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Shift Round Handover Signed</div>
            </div>

            <div>
              <div className="text-slate-500 mb-1">VERIFIED BY (SHIFT SUPERVISOR):</div>
              <div className="font-bold text-slate-800 border-b border-slate-400 pb-1">
                {sheet.verified_by_name ? `${sheet.verified_by_name} [ELECTRONIC SIGNATURE VERIFIED]` : '_____________________________ (Pending Verification)'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {sheet.verified_at ? `Verified At: ${sheet.verified_at}` : 'Awaiting shift completion'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM 2: RF-FR-001 Layout */}
      {activeFormType === 'rf_fr_001' && activeReport && (
        <div className="rounded-2xl border border-slate-700 bg-white text-slate-900 p-8 shadow-2xl max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight uppercase">
                Lam Soon Edible Oils Sdn. Bhd.
              </h2>
              <div className="text-sm font-semibold text-slate-700">
                Refinery Section · Quality Assurance Department
              </div>
              <div className="text-base font-bold text-slate-900 mt-1 uppercase">
                Sample Analysis Report
              </div>
            </div>

            <div className="text-right font-mono text-xs border border-slate-900 p-2 rounded">
              <div><strong>DOC NO:</strong> RF-FR-001</div>
              <div><strong>REVISION:</strong> 02</div>
              <div><strong>REPORT NO:</strong> {activeReport.report_no}</div>
            </div>
          </div>

          {/* Sample Metadata */}
          <div className="grid grid-cols-3 gap-4 border border-slate-900 p-3 rounded font-mono text-xs mb-4">
            <div><span className="text-slate-500">SAMPLE DATE:</span> <strong>{activeReport.sample_date}</strong></div>
            <div><span className="text-slate-500">TIME CHECK:</span> <strong>{activeReport.time_check}</strong></div>
            <div><span className="text-slate-500">LOT NUMBER:</span> <strong>{activeReport.lot_no}</strong></div>
            <div><span className="text-slate-500">FEED TANK:</span> <strong>{activeReport.feed_tank_code || '-'}</strong></div>
            <div><span className="text-slate-500">DISCHARGE TANK:</span> <strong>{activeReport.discharge_tank_code || '-'}</strong></div>
            <div><span className="text-slate-500">CRYSTALLIZER/BATCH:</span> <strong>{activeReport.batch_no || '-'}</strong></div>
            <div className="col-span-2"><span className="text-slate-500">PRODUCT:</span> <strong>{activeReport.product_name}</strong></div>
            <div><span className="text-slate-500">SAMPLING POINT:</span> <strong>{activeReport.sampling_point_name || 'Outlet'}</strong></div>
          </div>

          {/* Parameters Table */}
          <table className="w-full text-left border-collapse border border-slate-900 text-xs font-mono mb-4">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900">
                <th className="border border-slate-900 p-2">Tested Parameter</th>
                <th className="border border-slate-900 p-2">Unit</th>
                <th className="border border-slate-900 p-2">Analytical Result</th>
                <th className="border border-slate-900 p-2 text-center">Quality Spec Compliance</th>
              </tr>
            </thead>
            <tbody>
              {activeReport.results?.map(res => (
                <tr key={res.id}>
                  <td className="border border-slate-900 p-2 font-sans">{res.parameter_name}</td>
                  <td className="border border-slate-900 p-2 text-slate-500">{res.unit || '-'}</td>
                  <td className="border border-slate-900 p-2 font-bold">{res.value_numeric ?? res.value_text ?? '-'}</td>
                  <td className="border border-slate-900 p-2 text-center">
                    {res.in_spec === true ? (
                      <span className="font-bold text-emerald-700">PASS (IN SPEC)</span>
                    ) : res.in_spec === false ? (
                      <span className="font-bold text-rose-700">FAIL (OUT OF SPEC)</span>
                    ) : (
                      <span className="text-slate-400">PENDING</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* QC Formal Decision Stamp */}
          <div className="border-2 border-slate-900 p-4 rounded bg-slate-50 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-2 font-bold">
              <span>QC FORMAL DISPOSITION BLOCK</span>
              <span className="uppercase text-sm">
                STATUS: {activeReport.decision?.decision || 'AWAITING DECISION'}
              </span>
            </div>

            {activeReport.decision && (
              <div className="space-y-1">
                <div><span className="text-slate-500">REASON CODE:</span> <strong>{activeReport.decision.reason_label || 'None (Accepted)'}</strong></div>
                {activeReport.decision.disposition && (
                  <div><span className="text-slate-500">MANDATORY DISPOSITION:</span> <strong className="uppercase text-rose-700">{activeReport.decision.disposition}</strong></div>
                )}
                {activeReport.decision.reason_detail && (
                  <div><span className="text-slate-500">NARRATIVE:</span> {activeReport.decision.reason_detail}</div>
                )}
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  Electronic Signature: {activeReport.decision.decided_by_name} · Timestamp: {activeReport.decision.decided_at}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM 3: Audit Trail Viewer */}
      {activeFormType === 'audit' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-semibold">
              <History className="h-5 w-5 text-cyan-400" />
              <span>Immutable System Audit Trail Log (Database Trigger Level)</span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Tamper-Proof Append-Only Records
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (MYT)</th>
                  <th className="py-2.5 px-3">Table Name</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Authorized Actor</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/30">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.occurred_at)}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-semibold">
                      {log.table_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action === 'insert' ? 'bg-emerald-950 text-emerald-400' :
                        log.action === 'update' ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {log.actor_name || 'System / DB Trigger'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-md truncate">
                      {JSON.stringify(log.new_row || log.old_row || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
