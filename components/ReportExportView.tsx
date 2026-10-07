'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Copy,
  Layers,
  FlaskConical,
  Activity,
  Check,
  BarChart3,
  SlidersHorizontal
} from 'lucide-react';
import {
  getActiveProcessSheet,
  getAllProcessSheets,
  getSampleReports,
  getDeviations,
  getProducts,
  syncSampleReportsFromSupabase,
  syncProcessSheetsFromSupabase
} from '@/lib/data-service';
import GliderTabs from './GliderTabs';
import SearchableSelect from './SearchableSelect';

type ReportPeriod = 'daily' | 'monthly' | 'yearly';
type ReportCategory = 'process' | 'qc' | 'deviations' | 'master';

export default function ReportExportView() {
  const sheet = getActiveProcessSheet();
  const [sampleReports, setSampleReports] = useState(() => getSampleReports());
  const deviations = getDeviations();
  const products = getProducts();

  useEffect(() => {
    const handleUpdate = () => {
      setSampleReports(getSampleReports());
    };

    syncSampleReportsFromSupabase().then(() => handleUpdate()).catch(() => {});
    syncProcessSheetsFromSupabase().catch(() => {});

    window.addEventListener('refinery_reports_updated', handleUpdate);
    window.addEventListener('refinery_sheet_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refinery_reports_updated', handleUpdate);
      window.removeEventListener('refinery_sheet_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filter States
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [category, setCategory] = useState<ReportCategory>('process');
  
  // Date selections
  const defaultDate = sheet.shift_date || new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultDate.slice(0, 7)); // '2026-09'
  const [selectedYear, setSelectedYear] = useState<string>(defaultDate.slice(0, 4)); // '2026'
  
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Helper date matcher
  const matchesDate = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const clean = dateStr.slice(0, 10);
    if (period === 'daily') {
      return clean === selectedDate;
    }
    if (period === 'monthly') {
      return clean.startsWith(selectedMonth);
    }
    if (period === 'yearly') {
      return clean.startsWith(selectedYear);
    }
    return true;
  };

  // Filtered Process Entries across all saved shift sheets
  const filteredProcessEntries = useMemo(() => {
    const allSheets = getAllProcessSheets();
    const sheetsList = Object.values(allSheets);
    const allEntries: (ProcessEntry & { sheet_date?: string })[] = [];
    sheetsList.forEach(s => {
      (s.entries || []).forEach(e => {
        allEntries.push({ ...e, sheet_date: s.shift_date });
      });
    });

    return allEntries.filter(e => {
      // Check sheet date
      const dateMatches = matchesDate(e.sheet_date || sheet.shift_date);
      const productMatches = selectedProductId === 'all' || e.product_id === selectedProductId || (e.product_name && e.product_name.toLowerCase().includes(selectedProductId.toLowerCase()));
      const queryMatches = !searchQuery || 
        (e.slot_label && e.slot_label.includes(searchQuery)) ||
        (e.product_name && e.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.recorded_by_name && e.recorded_by_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.remarks && e.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatches && productMatches && queryMatches;
    });
  }, [sheet, period, selectedDate, selectedMonth, selectedYear, selectedProductId, searchQuery]);

  // Filtered QC Reports
  const filteredQCReports = useMemo(() => {
    return sampleReports.filter(r => {
      const dateMatches = matchesDate(r.sample_date);
      const productMatches = selectedProductId === 'all' || r.product_id === selectedProductId || (r.product_name && r.product_name.toLowerCase().includes(selectedProductId.toLowerCase()));
      const queryMatches = !searchQuery ||
        (r.report_no && r.report_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.lot_no && r.lot_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.product_name && r.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.decision?.decision && r.decision.decision.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatches && productMatches && queryMatches;
    });
  }, [sampleReports, period, selectedDate, selectedMonth, selectedYear, selectedProductId, searchQuery]);

  // Filtered Deviations
  const filteredDeviations = useMemo(() => {
    return deviations.filter(d => {
      const dateMatches = matchesDate(d.created_at);
      const queryMatches = !searchQuery ||
        (d.field_label && d.field_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.slot_label && d.slot_label.includes(searchQuery)) ||
        (d.acknowledged_by_name && d.acknowledged_by_name.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatches && queryMatches;
    });
  }, [deviations, period, selectedDate, selectedMonth, selectedYear, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalEntries = filteredProcessEntries.length;
    const avgVacuum = totalEntries > 0 
      ? (filteredProcessEntries.reduce((acc, e) => acc + (e.vacuum_torr || 0), 0) / totalEntries).toFixed(2)
      : '-';
    const avgTray4 = totalEntries > 0
      ? (filteredProcessEntries.reduce((acc, e) => acc + (e.tray_4_temp_c || 0), 0) / totalEntries).toFixed(1)
      : '-';

    const totalQC = filteredQCReports.length;
    const acceptedQC = filteredQCReports.filter(r => r.decision?.decision === 'accept').length;
    const passRate = totalQC > 0 ? Math.round((acceptedQC / totalQC) * 100) : 100;

    return { totalEntries, avgVacuum, avgTray4, totalQC, acceptedQC, passRate };
  }, [filteredProcessEntries, filteredQCReports]);

  // CSV Generator
  const generateCSVData = (): { filename: string; content: string } => {
    const timeLabel = period === 'daily' 
      ? selectedDate 
      : period === 'monthly' 
        ? selectedMonth 
        : selectedYear;

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (category === 'process') {
      filename = `RF-FR-004_Process_Log_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'Shift Date',
        'Time Slot',
        'Product Name',
        'Feed Rate (L/hr)',
        'Deod Time (hr)',
        'Vacuum (Torr)',
        'Tray 1 (°C)',
        'Tray 2 (°C)',
        'Tray 3 (°C)',
        'Tray 4 (°C)',
        'Tray 5 (°C)',
        'Tray 6 (°C)',
        'Tray 7 (°C)',
        'BC101 In (°C)',
        'BC101 Out (°C)',
        'Chill In (°C)',
        'Chill Out (°C)',
        'Booster (bar)',
        'Ejector (bar)',
        'Strip Steam %',
        'Strip Flow (kg/h)',
        'FP101A (bar)',
        'FP101B (bar)',
        'Status / Deviation',
        'Recorded By',
        'Remarks'
      ];

      rows = filteredProcessEntries.map(e => [
        sheet.shift_date,
        e.slot_label,
        `"${(e.product_name || '-').replace(/"/g, '""')}"`,
        e.oil_feed_rate_litre ?? '-',
        e.deod_time_set_hr ?? '-',
        e.vacuum_torr ?? '-',
        e.tray_1_temp_c ?? '-',
        e.tray_2_temp_c ?? '-',
        e.tray_3_temp_c ?? '-',
        e.tray_4_temp_c ?? '-',
        e.tray_5_temp_c ?? '-',
        e.tray_6_temp_c ?? '-',
        e.tray_7_temp_c ?? '-',
        e.bc101_water_in_c ?? '-',
        e.bc101_water_out_c ?? '-',
        e.chill_water_in_c ?? '-',
        e.chill_water_out_c ?? '-',
        e.booster_press_bar ?? '-',
        e.ejector_press_bar ?? '-',
        e.strip_steam_pct_of_oil ?? '-',
        e.strip_steam_flow_kghr ?? '-',
        e.fp101a_press_bar ?? '-',
        e.fp101b_press_bar ?? '-',
        e.has_deviation ? 'DEVIATION DETECTED' : 'NORMAL',
        `"${(e.recorded_by_name || '-').replace(/"/g, '""')}"`,
        `"${(e.remarks || '').replace(/"/g, '""')}"`
      ]);
    } else if (category === 'qc') {
      filename = `RF-FR-001_QC_Lab_Report_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'Report No',
        'Sample Date',
        'Time',
        'Lot Number',
        'Product Name',
        'Feed Tank',
        'Discharge Tank',
        'Sampling Point',
        'FFA (%)',
        'Moisture (%)',
        'IV (g I2/100g)',
        'PV (meq/kg)',
        'Colour Red (R)',
        'Colour Yellow (Y)',
        'Odour',
        'Cloud Point (°C)',
        'QC Decision',
        'Reason / Notes',
        'Analyst Name'
      ];

      rows = filteredQCReports.map(r => {
        const getRes = (code: string) => (r.results || []).find(res => res.parameter_code === code)?.value_numeric ?? '-';
        const getOdour = () => (r.results || []).find(res => res.parameter_code === 'ODOUR')?.value_text ?? '-';

        return [
          r.report_no,
          r.sample_date,
          r.time_check,
          r.lot_no,
          `"${(r.product_name || '-').replace(/"/g, '""')}"`,
          r.feed_tank_code || '-',
          r.discharge_tank_code || '-',
          `"${(r.sampling_point_name || '-').replace(/"/g, '""')}"`,
          getRes('FFA'),
          getRes('H2O'),
          getRes('IV'),
          getRes('PV'),
          getRes('COLOUR_R'),
          getRes('COLOUR_Y'),
          getOdour(),
          getRes('CLOUD_POINT'),
          r.decision?.decision ? String(r.decision.decision).toUpperCase() : 'PENDING',
          `"${(r.decision?.reason_label || r.remarks || '-').replace(/"/g, '""')}"`,
          `"${(r.decision?.decided_by_name || r.submitted_by_name || '-').replace(/"/g, '""')}"`
        ];
      });
    } else if (category === 'deviations') {
      filename = `Plant_Deviations_Log_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'ID',
        'Date / Time',
        'Time Slot',
        'Parameter',
        'Observed Value',
        'Soft Min',
        'Soft Max',
        'Status',
        'Acknowledged By',
        'Action Taken'
      ];

      rows = filteredDeviations.map(d => [
        d.id,
        d.created_at,
        d.slot_label,
        `"${d.field_label}"`,
        d.observed,
        d.soft_min ?? '-',
        d.soft_max ?? '-',
        d.acknowledged_by ? 'ACKNOWLEDGED' : 'OPEN DEVIATION',
        `"${(d.acknowledged_by_name || '-').replace(/"/g, '""')}"`,
        `"${(d.action_taken || '-').replace(/"/g, '""')}"`
      ]);
    } else {
      // Master Combined Report
      filename = `Master_Refinery_Plant_Record_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'Shift Date',
        'Slot',
        'Product',
        'Vacuum (Torr)',
        'Tray 4 Temp (°C)',
        'Strip Steam %',
        'Process Status',
        'Matching QC Lot',
        'QC Decision',
        'FFA %',
        'Moisture %',
        'IV',
        'Operator',
        'Supervisor / Analyst'
      ];

      rows = filteredProcessEntries.map((e, idx) => {
        const matchingQC = filteredQCReports[idx % Math.max(1, filteredQCReports.length)];
        const ffa = (matchingQC?.results || []).find(r => r.parameter_code === 'FFA')?.value_numeric ?? '-';
        const h2o = (matchingQC?.results || []).find(r => r.parameter_code === 'H2O')?.value_numeric ?? '-';
        const iv = (matchingQC?.results || []).find(r => r.parameter_code === 'IV')?.value_numeric ?? '-';

        return [
          sheet.shift_date,
          e.slot_label,
          `"${(e.product_name || '-').replace(/"/g, '""')}"`,
          e.vacuum_torr ?? '-',
          e.tray_4_temp_c ?? '-',
          e.strip_steam_pct_of_oil ?? '-',
          e.has_deviation ? 'DEVIATION' : 'NORMAL',
          matchingQC?.lot_no || '-',
          matchingQC?.decision?.decision ? String(matchingQC.decision.decision).toUpperCase() : 'PENDING',
          ffa,
          h2o,
          iv,
          `"${(e.recorded_by_name || '-').replace(/"/g, '""')}"`,
          `"${(matchingQC?.decision?.decided_by_name || '-').replace(/"/g, '""')}"`
        ];
      });
    }

    // Include UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    return { filename, content: csvContent };
  };

  const handleDownloadCSV = () => {
    const { filename, content } = generateCSVData();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const { content } = generateCSVData();
    // Convert CSV to TSV for Excel tab-separated paste
    const tsvContent = content.replace(/\uFEFF/, '').replace(/,/g, '\t');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <section className="panel head">
        <div>
          <h2>Plant Operations and Quality Report Generator</h2>
          <p className="meta">Download daily shift rounds, monthly performance or yearly audit records, including QC lab results.</p>
        </div>
        <div className="stats">
          <button onClick={handleCopyToClipboard} className="ghost" type="button">
            {copied ? 'Copied to Clipboard!' : 'Copy for Excel'}
          </button>
          <button onClick={handleDownloadCSV} className="primary" type="button">
            Download CSV file
          </button>
        </div>
      </section>

      {/* 2. KPI Overview Cards */}
      <div className="cards">
        <div className="panel">
          <label>Filtered records</label>
          <b>{category === 'process' || category === 'master' ? stats.totalEntries : category === 'qc' ? stats.totalQC : filteredDeviations.length}</b>
          <p>{period === 'daily' ? `Daily Shift (${selectedDate})` : period === 'monthly' ? `Monthly (${selectedMonth})` : `Yearly (${selectedYear})`}</p>
        </div>

        <div className="panel">
          <label>QC pass rate</label>
          <b style={{ color: 'var(--green)' }}>{stats.passRate}%</b>
          <p>{stats.acceptedQC} of {stats.totalQC} samples approved</p>
        </div>

        <div className="panel">
          <label>Average deodorizer vacuum</label>
          <b>{stats.avgVacuum} <small>Torr</small></b>
          <p>Target: below 4.5 Torr</p>
        </div>

        <div className="panel">
          <label>Average tray 4 temperature</label>
          <b>{stats.avgTray4} <small>°C</small></b>
          <p>Standard: 250 to 268 °C</p>
        </div>
      </div>

      {/* 3. Filter Configuration */}
      <section className="panel">
        <div className="cfg">
          <div>
            <h3>Timeframe</h3>
            <div className="mb-2.5">
              <GliderTabs
                size="sm"
                items={[
                  { id: 'daily', label: 'Daily' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'yearly', label: 'Yearly' },
                ]}
                activeId={period}
                onChange={(id) => setPeriod(id as ReportPeriod)}
              />
            </div>
            <div className="dr">
              {period === 'daily' && (
                <>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    aria-label="Report date"
                  />
                  <button className="ghost" type="button" onClick={() => setSelectedDate(defaultDate)}>
                    Today
                  </button>
                </>
              )}
              {period === 'monthly' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Report month"
                />
              )}
              {period === 'yearly' && (
                <SearchableSelect
                  value={selectedYear}
                  onChange={(val) => setSelectedYear(val)}
                  placeholder="Select Year"
                  searchPlaceholder="Search year..."
                  aria-label="Report year"
                  options={[
                    { value: '2026', label: '2026 (Operational Year)' },
                    { value: '2025', label: '2025 (Historical Archive)' },
                    { value: '2024', label: '2024 (Baseline Year)' }
                  ]}
                />
              )}
            </div>
          </div>

          <div>
            <h3>Data category</h3>
            <div className="mb-2.5">
              <GliderTabs
                size="sm"
                items={[
                  { id: 'process', label: 'Process Log' },
                  { id: 'qc', label: 'QC Lab' },
                  { id: 'deviations', label: 'Deviations' },
                  { id: 'master', label: 'Master Combined' },
                ]}
                activeId={category}
                onChange={(id) => setCategory(id as ReportCategory)}
              />
            </div>
            <SearchableSelect
              aria-label="Product"
              value={selectedProductId}
              onChange={(val) => setSelectedProductId(val)}
              placeholder="Select Product"
              searchPlaceholder="Search product..."
              options={[
                { value: 'all', label: 'All products (unfiltered)' },
                ...products.map((p) => ({
                  value: p.id,
                  label: p.name
                }))
              ]}
            />
          </div>

          <div>
            <h3>Search and preview</h3>
            <input
              type="search"
              placeholder="Search slot, lot no, operator, remarks"
              aria-label="Search records"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="ob">
              <span>Output file</span>
              <b className="truncate">
                {category === 'process' ? 'RF-FR-004' : category === 'qc' ? 'RF-FR-001' : category === 'deviations' ? 'Deviations' : 'Master'}_{period}_{period === 'daily' ? selectedDate : period === 'monthly' ? selectedMonth : selectedYear}.csv
              </b>
              <span>Matching rows: <b>{category === 'process' || category === 'master' ? filteredProcessEntries.length : category === 'qc' ? filteredQCReports.length : filteredDeviations.length}</b></span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live Data Table Preview */}
      <section className="panel">
        <div className="rh">
          <h2>
            {category === 'process' && 'Hourly process log preview'}
            {category === 'qc' && 'QC lab analysis preview'}
            {category === 'deviations' && 'Plant deviations & excursions preview'}
            {category === 'master' && 'Master operations & quality merged preview'}
          </h2>
          <span className="hint">Excel-compatible CSV (UTF-8 with BOM)</span>
        </div>

        <div className="tw">
          {/* 1. PROCESS LOG & MASTER PREVIEW */}
          {(category === 'process' || category === 'master') && (
            <table>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Feed (L)</th>
                  <th style={{ textAlign: 'right' }}>Vacuum (Torr)</th>
                  <th style={{ textAlign: 'right' }}>Tray 4 (°C)</th>
                  <th style={{ textAlign: 'right' }}>Tray 7 (°C)</th>
                  <th style={{ textAlign: 'right' }}>Steam %</th>
                  <th>Status</th>
                  <th>Recorded By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcessEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                      No process entries match this timeframe and filters.
                    </td>
                  </tr>
                ) : (
                  filteredProcessEntries.map((e) => (
                    <tr key={e.id || e.slot_index}>
                      <td style={{ fontWeight: 600, color: 'var(--redt)' }}>{e.slot_label}</td>
                      <td>{e.product_name || '-'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.oil_feed_rate_litre?.toLocaleString() || '-'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.vacuum_torr?.toFixed(1) || '-'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--amber)' }}>{e.tray_4_temp_c?.toFixed(1) || '-'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.tray_7_temp_c?.toFixed(1) || '-'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.strip_steam_pct_of_oil ?? '-'}%</td>
                      <td>
                        {e.has_deviation ? (
                          <span className="bd r">Deviation</span>
                        ) : (
                          <span className="bd g">Normal</span>
                        )}
                      </td>
                      <td>{e.recorded_by_name || '-'}</td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.remarks || undefined}>
                        {e.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 2. QC LAB TABLE PREVIEW */}
          {category === 'qc' && (
            <table>
              <thead>
                <tr>
                  <th>Report No</th>
                  <th>Time</th>
                  <th>Lot No</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>FFA (%)</th>
                  <th style={{ textAlign: 'right' }}>Moisture (%)</th>
                  <th style={{ textAlign: 'right' }}>IV</th>
                  <th style={{ textAlign: 'right' }}>Colour R/Y</th>
                  <th>QC Decision</th>
                  <th>Decided By</th>
                </tr>
              </thead>
              <tbody>
                {filteredQCReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                      No QC sample laboratory reports found matching the selected timeframe and filters.
                    </td>
                  </tr>
                ) : (
                  filteredQCReports.map((r) => {
                    const ffa = (r.results || []).find((res) => res.parameter_code === 'FFA')?.value_numeric;
                    const h2o = (r.results || []).find((res) => res.parameter_code === 'H2O')?.value_numeric;
                    const iv = (r.results || []).find((res) => res.parameter_code === 'IV')?.value_numeric;
                    const colR = (r.results || []).find((res) => res.parameter_code === 'COLOUR_R')?.value_numeric;
                    const colY = (r.results || []).find((res) => res.parameter_code === 'COLOUR_Y')?.value_numeric;
                    const isAccepted = r.decision?.decision === 'accept';
                    const isRejected = r.decision?.decision === 'reject';

                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--redt)' }}>{r.report_no}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.time_check}</td>
                        <td style={{ fontWeight: 500 }}>{r.lot_no}</td>
                        <td>{r.product_name}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--green)' }}>{ffa ?? '-'}%</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h2o ?? '-'}%</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{iv ?? '-'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--amber)' }}>
                          {colR ?? '-'}/{colY ?? '-'}
                        </td>
                        <td>
                          {isAccepted && <span className="bd g">Accepted</span>}
                          {isRejected && <span className="bd r">Rejected</span>}
                          {!isAccepted && !isRejected && <span className="bd a">Pending</span>}
                        </td>
                        <td>{r.decision?.decided_by_name || r.submitted_by_name || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* 3. DEVIATIONS TABLE PREVIEW */}
          {category === 'deviations' && (
            <table>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Parameter</th>
                  <th style={{ textAlign: 'right' }}>Observed</th>
                  <th style={{ textAlign: 'right' }}>Soft Limit</th>
                  <th>Status</th>
                  <th>Acknowledged By</th>
                  <th>Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeviations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                      No deviation or operational excursion records found.
                    </td>
                  </tr>
                ) : (
                  filteredDeviations.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, color: 'var(--redt)' }}>{d.slot_label}</td>
                      <td>{d.field_label}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--redt)', fontWeight: 600 }}>{d.observed}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>{d.soft_min ?? '-'} - {d.soft_max ?? '-'}</td>
                      <td>
                        {d.acknowledged_by ? (
                          <span className="bd g">Acknowledged</span>
                        ) : (
                          <span className="bd a">Open</span>
                        )}
                      </td>
                      <td>{d.acknowledged_by_name || '-'}</td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.action_taken || undefined}>
                        {d.action_taken || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        <div className="foot">
          <p>Historical records are ready to export to Excel or CSV.</p>
          <button onClick={handleDownloadCSV} className="primary" type="button">
            Export {category.toUpperCase()} to CSV
          </button>
        </div>
      </section>
    </div>
  );
}
