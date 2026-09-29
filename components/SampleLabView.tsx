'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  SampleReport, 
  Product, 
  Tank, 
  SamplingPoint, 
  Parameter, 
  RejectionReason, 
  UserRole,
  Disposition,
  Profile 
} from '@/types/refinery';
import { 
  getSampleReports, 
  createSampleReport, 
  updateSampleResults, 
  submitQCDecision, 
  getProducts, 
  getTanks, 
  getSamplingPoints, 
  getParameters, 
  getRejectionReasons, 
  getCurrentRole,
  getProductSpecs,
  getRealtimeShiftDate,
  ensureAutoDispatchedQC,
  syncAllProcessEntriesToQC,
  generateNextLotNo,
  deleteSampleReport,
  syncSampleReportsFromSupabase
} from '@/lib/data-service';
import {
  DEFAULT_PRODUCT_ID,
  DEFAULT_FEED_TANK_ID,
  DEFAULT_DISCHARGE_TANK_ID,
  DEFAULT_SAMPLING_POINT_ID,
  PARAM_IDS
} from '@/lib/mock-data';
import { 
  FlaskConical, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Save, 
  ShieldCheck,
  Sparkles,
  RefreshCw,
  FileText,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface SampleLabViewProps {
  currentRole?: UserRole;
  currentUser?: Profile | null;
  onNavigateToCertificate?: (reportId: string) => void;
}

export default function SampleLabView({ currentRole, currentUser, onNavigateToCertificate }: SampleLabViewProps = {}) {
  const [reports, setReports] = useState<SampleReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [samplingPoints, setSamplingPoints] = useState<SamplingPoint[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [reasons, setReasons] = useState<RejectionReason[]>([]);
  const [role, setRole] = useState<UserRole>(currentRole || currentUser?.role || getCurrentRole() || 'qc_analyst');
  const canEdit = role === 'qc_analyst' || role === 'qc_manager' || role === 'admin';

  // Active sub-tab: 'list' | 'new' | 'detail'
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // "Raise New Sample" form state
  const [newDate, setNewDate] = useState<string>(() => getRealtimeShiftDate());
  const [newTimeCheck, setNewTimeCheck] = useState('11:30');
  const [newProductId, setNewProductId] = useState(DEFAULT_PRODUCT_ID); // PL 65 Matsuyama
  const [newProductOther, setNewProductOther] = useState('');
  const [newLotNo, setNewLotNo] = useState<string>(() => generateNextLotNo(DEFAULT_PRODUCT_ID, getRealtimeShiftDate()));
  const [newFeedTankId, setNewFeedTankId] = useState(DEFAULT_FEED_TANK_ID);
  const [newDischargeTankId, setNewDischargeTankId] = useState(DEFAULT_DISCHARGE_TANK_ID);
  const [newCrystallizerNo, setNewCrystallizerNo] = useState('CR-04');
  const [newBatchNo, setNewBatchNo] = useState('B260904');
  const [newSamplingPointId, setNewSamplingPointId] = useState(DEFAULT_SAMPLING_POINT_ID);
  const [newRemarkFlushing, setNewRemarkFlushing] = useState(false);
  const [newRemarkCooling, setNewRemarkCooling] = useState(false);
  const [newRemarkPushover, setNewRemarkPushover] = useState(false);
  const [newRemarks, setNewRemarks] = useState('');
  const [selectedParamIds, setSelectedParamIds] = useState<string[]>([
    PARAM_IDS.FFA, PARAM_IDS.H2O, PARAM_IDS.IV, PARAM_IDS.PV, PARAM_IDS.COLOUR_R, PARAM_IDS.COLOUR_Y, PARAM_IDS.ODOUR, PARAM_IDS.CLOUD_POINT, PARAM_IDS.SFC, PARAM_IDS.TEMP
  ]);
  const [selectedTempKeys, setSelectedTempKeys] = useState<number[]>([10, 15, 20, 25, 30, 35, 40, 45, 50]);

  // QC Remarks & Operating Conditions state
  const [qcRemarkFlushing, setQcRemarkFlushing] = useState(false);
  const [qcRemarkCooling, setQcRemarkCooling] = useState(false);
  const [qcRemarkPushover, setQcRemarkPushover] = useState(false);
  const [qcRemarksText, setQcRemarksText] = useState('');
  const [qcSamplingPointId, setQcSamplingPointId] = useState<string>('');
  const [qcCrystallizerBatch, setQcCrystallizerBatch] = useState<string>('');

  // Auto-generate next sequential Lot Number whenever Product or Date changes
  useEffect(() => {
    const auto = generateNextLotNo(newProductId, newDate, newProductOther);
    setNewLotNo(auto);
  }, [newProductId, newDate, newProductOther]);

  // Enter results state
  const [resultInputs, setResultInputs] = useState<Record<string, { num?: number; text?: string }>>({});
  const [requestedMap, setRequestedMap] = useState<Record<string, boolean>>({});
  const [resultsSuccess, setResultsSuccess] = useState<string | null>(null);

  // QC Decision Modal state
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'accept' | 'accept_concession' | 'reject'>('accept');
  const [decisionReasonId, setDecisionReasonId] = useState('');
  const [decisionNarrative, setDecisionNarrative] = useState('');
  const [decisionDisposition, setDecisionDisposition] = useState<Disposition>('reprocess');
  const [decisionPassword, setDecisionPassword] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Delete Sample state (QC mistake correction)
  const [reportToDelete, setReportToDelete] = useState<SampleReport | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('Wrong analytical readings entered');
  const [deleteCustomReason, setDeleteCustomReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const activeR = currentRole || currentUser?.role || getCurrentRole();
    setRole(activeR);
    setProducts(getProducts());
    setTanks(getTanks());
    setSamplingPoints(getSamplingPoints());
    setParameters(getParameters());
    setReasons(getRejectionReasons());
    refreshReports();
    syncSampleReportsFromSupabase().then(() => {
      refreshReports();
    }).catch(() => {});

    const handleUpdate = () => {
      refreshReports();
    };

    window.addEventListener('refinery_reports_updated', handleUpdate);
    window.addEventListener('refinery_sheet_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refinery_reports_updated', handleUpdate);
      window.removeEventListener('refinery_sheet_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const refreshReports = () => {
    syncAllProcessEntriesToQC();
    const list = getSampleReports();
    setReports(list);
    if (!selectedReportId && list.length > 0) {
      setSelectedReportId(list[0].id);
    }
  };

  const selectedReport = reports.find(r => r.id === selectedReportId) || reports[0];

  // Merge full catalog parameters so QC can always view and tick/untick any parameter
  const displayResults = useMemo(() => {
    if (!selectedReport) return [];
    const rawExisting = selectedReport.results || [];

    // Normalize any legacy results where SFC had a series_key into separate TEMP results
    const existing = rawExisting.map(r => {
      if ((r.parameter_code === 'SFC' || r.parameter_id === 'param-sfc') && r.series_key != null) {
        return {
          ...r,
          parameter_id: 'param-temp',
          parameter_code: 'TEMP',
          parameter_name: `Temperature ${r.series_key}°C`,
          unit: '%',
        };
      }
      return r;
    });

    const existingParamKeys = new Set(
      existing.map(r => r.series_key != null ? `${r.parameter_id}-${r.series_key}` : r.parameter_id)
    );
    const merged = [...existing];

    parameters.forEach(param => {
      if (param.is_series && param.series_values) {
        param.series_values.forEach(temp => {
          const key = `${param.id}-${temp}`;
          if (!existingParamKeys.has(key)) {
            merged.push({
              id: `res-${selectedReport.id}-${param.code}-${temp}`,
              report_id: selectedReport.id,
              parameter_id: param.id,
              parameter_code: param.code,
              parameter_name: `${param.name} ${temp}°C`,
              unit: param.code === 'TEMP' ? '-' : (param.unit || '-'),
              series_key: temp,
              requested: false,
            });
          }
        });
      } else {
        if (!existingParamKeys.has(param.id)) {
          merged.push({
            id: `res-${selectedReport.id}-${param.code}`,
            report_id: selectedReport.id,
            parameter_id: param.id,
            parameter_code: param.code,
            parameter_name: param.name,
            unit: param.unit,
            requested: false,
          });
        }
      }
    });

    // Sort parameters based on standard catalog order
    const paramOrderMap = new Map(parameters.map(p => [p.id, p.sort_order]));
    merged.sort((a, b) => {
      const orderA = paramOrderMap.get(a.parameter_id) ?? 99;
      const orderB = paramOrderMap.get(b.parameter_id) ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.series_key != null && b.series_key != null) {
        return Number(a.series_key) - Number(b.series_key);
      }
      return 0;
    });

    return merged;
  }, [selectedReport, parameters]);

  // Separate standard parameters from Temperature series
  const standardResults = useMemo(() => {
    return displayResults.filter(r => r.parameter_code !== 'TEMP');
  }, [displayResults]);

  const tempResults = useMemo(() => {
    return displayResults.filter(r => r.parameter_code === 'TEMP');
  }, [displayResults]);

  // Master Temperature tick box state
  const isTempAllTicked = useMemo(() => {
    return tempResults.length > 0 && tempResults.every(r => requestedMap[r.id] !== false);
  }, [tempResults, requestedMap]);

  const isTempAnyTicked = useMemo(() => {
    return tempResults.some(r => requestedMap[r.id] !== false);
  }, [tempResults, requestedMap]);

  const activeTempCount = useMemo(() => {
    return tempResults.filter(r => requestedMap[r.id] !== false).length;
  }, [tempResults, requestedMap]);

  // Toggle master Temperature parameter
  const handleToggleMasterTemp = (checked: boolean) => {
    setRequestedMap(prev => {
      const next = { ...prev };
      tempResults.forEach(r => {
        next[r.id] = checked;
      });
      return next;
    });
  };

  // Toggle single parameter in New Sample registration
  const toggleParam = (id: string) => {
    setSelectedParamIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        if (id === 'param-temp') setSelectedTempKeys([]);
        return prev.filter(p => p !== id);
      } else {
        if (id === 'param-temp') setSelectedTempKeys([10, 15, 20, 25, 30, 35, 40, 45, 50]);
        return [...prev, id];
      }
    });
  };

  // Toggle single temperature point in New Sample registration
  const toggleTempKey = (temp: number) => {
    setSelectedTempKeys(prev => {
      const next = prev.includes(temp) ? prev.filter(t => t !== temp) : [...prev, temp].sort((a, b) => a - b);
      if (next.length > 0 && !selectedParamIds.includes('param-temp')) {
        setSelectedParamIds(p => [...p, 'param-temp']);
      } else if (next.length === 0 && selectedParamIds.includes('param-temp')) {
        setSelectedParamIds(p => p.filter(id => id !== 'param-temp'));
      }
      return next;
    });
  };

  const handleToggleAllTempsForNew = (checked: boolean) => {
    if (checked) {
      setSelectedTempKeys([10, 15, 20, 25, 30, 35, 40, 45, 50]);
      if (!selectedParamIds.includes('param-temp')) {
        setSelectedParamIds(prev => [...prev, 'param-temp']);
      }
    } else {
      setSelectedTempKeys([]);
      setSelectedParamIds(prev => prev.filter(id => id !== 'param-temp'));
    }
  };

  // Initialize result inputs
  useEffect(() => {
    if (selectedReport) {
      setQcRemarkFlushing(selectedReport.remark_flushing ?? false);
      setQcRemarkCooling(selectedReport.remark_cooling ?? false);
      setQcRemarkPushover(selectedReport.remark_pushover ?? false);
      setQcRemarksText(selectedReport.remarks || '');
      setQcSamplingPointId(selectedReport.sampling_point_id || '');
      const cryst = selectedReport.crystallizer_no || '';
      const batch = selectedReport.batch_no || '';
      const combined = cryst && batch ? `${cryst} / ${batch}` : (cryst || batch || '');
      setQcCrystallizerBatch(combined);
    }
    if (displayResults.length > 0) {
      const inputs: Record<string, { num?: number; text?: string }> = {};
      const reqs: Record<string, boolean> = {};

      displayResults.forEach(r => {
        inputs[r.id] = {
          num: r.value_numeric ?? undefined,
          text: r.value_text ?? undefined,
        };
        reqs[r.id] = r.requested !== false;
      });

      setResultInputs(inputs);
      setRequestedMap(reqs);
    }
  }, [selectedReport?.id, displayResults.length]);

  const handleToggleResultParam = (resId: string, checked: boolean) => {
    setRequestedMap(prev => ({
      ...prev,
      [resId]: checked,
    }));
  };

  const handleTickAll = () => {
    const reqs: Record<string, boolean> = {};
    displayResults.forEach(r => {
      reqs[r.id] = true;
    });
    setRequestedMap(reqs);
  };

  const handleUntickAll = () => {
    const reqs: Record<string, boolean> = {};
    displayResults.forEach(r => {
      reqs[r.id] = false;
    });
    setRequestedMap(reqs);
  };

  const handleApplyProductSpec = () => {
    if (!selectedReport) return;
    const specs = getProductSpecs(selectedReport.product_id || undefined);
    const specParamIds = new Set(specs.map(s => s.parameter_id));
    const specTempKeys = new Set(specs.filter(s => s.parameter_id === 'param-temp' && s.series_key != null).map(s => Number(s.series_key)));
    const reqs: Record<string, boolean> = {};
    displayResults.forEach(r => {
      if (r.parameter_code === 'TEMP' && r.series_key != null) {
        reqs[r.id] = specTempKeys.has(Number(r.series_key));
      } else {
        reqs[r.id] = specParamIds.has(r.parameter_id);
      }
    });
    setRequestedMap(reqs);
  };

  const handleCreateSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLotNo) return;

    const res = createSampleReport({
      sample_date: newDate,
      time_check: newTimeCheck,
      lot_no: newLotNo,
      product_id: newProductId,
      product_other: newProductId === 'others' ? newProductOther : null,
      feed_tank_id: newFeedTankId,
      discharge_tank_id: newDischargeTankId,
      crystallizer_no: newCrystallizerNo,
      batch_no: newBatchNo,
      sampling_point_id: newSamplingPointId,
      remark_flushing: newRemarkFlushing,
      remark_cooling: newRemarkCooling,
      remark_pushover: newRemarkPushover,
      remarks: newRemarks,
      selected_parameter_ids: selectedParamIds,
      selected_temperatures: selectedTempKeys,
    });

    if (res.success && res.report) {
      refreshReports();
      setSelectedReportId(res.report.id);
      setActiveSubTab('detail');
    }
  };

  const handleSaveResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setResultsSuccess(null);

    const payload = displayResults.map(res => {
      const val = resultInputs[res.id] || {};
      const isReq = requestedMap[res.id] !== false;
      return {
        resultId: res.id,
        parameter_id: res.parameter_id,
        parameter_code: res.parameter_code,
        parameter_name: res.parameter_name,
        unit: res.unit,
        series_key: res.series_key,
        value_numeric: isReq && val.num !== undefined ? Number(val.num) : null,
        value_text: isReq ? (val.text ?? null) : null,
        requested: isReq,
      };
    });

    let crystNo = qcCrystallizerBatch.trim();
    let batchNo = '';
    if (qcCrystallizerBatch.includes('/')) {
      const parts = qcCrystallizerBatch.split('/');
      crystNo = parts[0]?.trim() || '';
      batchNo = parts.slice(1).join('/').trim();
    }

    const matchedSp = samplingPoints.find(sp => sp.id === qcSamplingPointId);

    const res = updateSampleResults(selectedReport.id, payload, {
      remark_flushing: qcRemarkFlushing,
      remark_cooling: qcRemarkCooling,
      remark_pushover: qcRemarkPushover,
      remarks: qcRemarksText,
      sampling_point_id: qcSamplingPointId || null,
      sampling_point_name: matchedSp?.name || undefined,
      crystallizer_no: crystNo || null,
      batch_no: batchNo || (qcCrystallizerBatch.includes('/') ? null : crystNo || null),
    });
    if (res.success) {
      setResultsSuccess('Laboratory test results, operating remarks & checkboxes saved and synced with Supabase!');
      refreshReports();
    }
  };

  const handleSubmitDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setDecisionError(null);

    const failedParams = selectedReport.results
      ?.filter(r => (requestedMap[r.id] ?? r.requested) !== false && r.in_spec === false)
      .map(r => `${r.parameter_name} (${r.value_numeric ?? r.value_text})`) || [];

    const res = submitQCDecision({
      report_id: selectedReport.id,
      decision: decisionType,
      reason_id: decisionType !== 'accept' ? decisionReasonId : undefined,
      reason_detail: decisionType !== 'accept' ? decisionNarrative : undefined,
      failed_parameters: failedParams,
      disposition: decisionType === 'reject' ? decisionDisposition : undefined,
      password_confirm: decisionPassword,
    });

    if (!res.success) {
      setDecisionError(res.error || 'Decision submission failed.');
      return;
    }

    setIsDecisionModalOpen(false);
    setDecisionPassword('');
    setDecisionNarrative('');
    refreshReports();
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportToDelete) return;
    setDeleteError(null);
    setIsDeleting(true);

    const finalReason = deleteReason === 'other'
      ? (deleteCustomReason.trim() || 'Mistake in sample entry')
      : deleteReason;

    try {
      const res = await deleteSampleReport(reportToDelete.id, finalReason);
      setIsDeleting(false);
      if (res.success) {
        setDeleteSuccessMessage(`Sample lot ${reportToDelete.lot_no} (${reportToDelete.report_no}) was deleted and synchronized.`);
        const remaining = res.remainingReports || reports.filter(r => r.id !== reportToDelete.id);
        setReports(remaining);
        if (selectedReportId === reportToDelete.id) {
          setSelectedReportId(remaining.length > 0 ? remaining[0].id : null);
        }
        setReportToDelete(null);
        setDeleteCustomReason('');
        setTimeout(() => setDeleteSuccessMessage(null), 5000);
      } else {
        setDeleteError(res.error || 'Failed to delete sample report.');
      }
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteError(err?.message || 'Error occurred while deleting sample.');
    }
  };

  // Filtered reports list
  const filteredReports = reports.filter(r => {
    const matchSearch = r.lot_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (r.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.report_no.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatus === 'awaiting') return r.status === 'awaiting_results';
    if (filterStatus === 'accepted') return r.decision?.decision === 'accept';
    if (filterStatus === 'rejected') return r.decision?.decision === 'reject';
    return true;
  });

  return (
    <div>
      {/* 1. Module Header & Sub-Navigation */}
      <section className="panel head">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
            Sample analysis report and quality control
          </h2>
          <p className="meta">
            44 standard products, parameter tick list, 9-point SFC series, QC disposition
          </p>
        </div>

        <div className="segs" style={{ '--c': 2, margin: 0, width: '280px' } as React.CSSProperties}>
          <button
            type="button"
            className="seg"
            aria-pressed={activeSubTab !== 'new'}
            onClick={() => setActiveSubTab('list')}
          >
            Lab queue ({reports.length})
          </button>

          <button
            type="button"
            className="seg"
            aria-pressed={activeSubTab === 'new'}
            onClick={() => setActiveSubTab('new')}
          >
            Raise sample
          </button>
        </div>
      </section>


      {/* Delete Success Alert Notification */}
      {deleteSuccessMessage && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 font-mono text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{deleteSuccessMessage}</span>
          </div>
          <span 
            onClick={() => setDeleteSuccessMessage(null)} 
            className="cursor-pointer text-slate-400 hover:text-slate-200 px-1 font-bold text-sm"
          >
            ✕
          </span>
        </div>
      )}

      {/* 2. Content Views */}

      {/* VIEW A: Raise New Sample Report */}
      {activeSubTab === 'new' && (
        <section className="panel" style={{ padding: '28px' }}>
          <div className="ph" style={{ padding: '0 0 16px', borderBottom: '1px solid var(--line)', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                Raise New Sample Report
              </h2>
              <p className="hint">Sample registration, initial operating conditions and parameter selection</p>
            </div>
          </div>

          <form onSubmit={handleCreateSample}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="fld">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Lot Number *</label>
                  <span className="bd a">Auto-Generated</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOT-PL65-2609-04"
                    value={newLotNo}
                    onChange={e => setNewLotNo(e.target.value)}
                    className="inp"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setNewLotNo(generateNextLotNo(newProductId, newDate, newProductOther))}
                    className="ghost"
                    title="Regenerate next sequential lot number based on selected product & date"
                  >
                    Sync
                  </button>
                </div>
                <p className="hint" style={{ marginTop: '4px', fontSize: '11px' }}>Pattern: LOT-[PROD]-[YYMM]-[SEQ]</p>
              </div>

              <div className="fld">
                <label>Sample Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="fld">
                <label>Time Check</label>
                <input
                  type="time"
                  value={newTimeCheck}
                  onChange={e => setNewTimeCheck(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Product Picker */}
            <div className="fld" style={{ marginBottom: '20px' }}>
              <label>Product Selection (Standard List)</label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="inp"
                style={{ width: '100%' }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="others">Others — Free Text Entry</option>
              </select>

              {newProductId === 'others' && (
                <div style={{ marginTop: '12px' }}>
                  <label>Enter Custom Product Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="Specify other product name..."
                    value={newProductOther}
                    onChange={e => setNewProductOther(e.target.value)}
                    className="inp"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>

            {/* Tanks & Sampling Point */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="fld">
                <label>Feed Tank</label>
                <select
                  value={newFeedTankId}
                  onChange={e => setNewFeedTankId(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                >
                  {tanks.filter(t => t.kind === 'feed' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id}>{t.code}</option>
                  ))}
                </select>
              </div>

              <div className="fld">
                <label>Discharge Tank</label>
                <select
                  value={newDischargeTankId}
                  onChange={e => setNewDischargeTankId(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                >
                  {tanks.filter(t => t.kind === 'discharge' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id}>{t.code}</option>
                  ))}
                </select>
              </div>

              <div className="fld">
                <label>Crystallizer / Batch No</label>
                <input
                  type="text"
                  placeholder="CR-04 / B260904"
                  value={newBatchNo}
                  onChange={e => setNewBatchNo(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="fld">
                <label>Sampling Point</label>
                <select
                  value={newSamplingPointId}
                  onChange={e => setNewSamplingPointId(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                >
                  {samplingPoints.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printed Remarks Checkboxes */}
            <div style={{ padding: '16px 20px', background: 'var(--raised)', borderRadius: '10px', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text)', marginBottom: '10px' }}>
                Printed Remarks Tick-List
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '13px', color: 'var(--text)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRemarkFlushing}
                    onChange={e => setNewRemarkFlushing(e.target.checked)}
                    style={{ accentColor: 'var(--red)' }}
                  />
                  <span>Flushing</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRemarkCooling}
                    onChange={e => setNewRemarkCooling(e.target.checked)}
                    style={{ accentColor: 'var(--red)' }}
                  />
                  <span>Cooling</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRemarkPushover}
                    onChange={e => setNewRemarkPushover(e.target.checked)}
                    style={{ accentColor: 'var(--red)' }}
                  />
                  <span>Pushover</span>
                </label>
              </div>
            </div>

            {/* Parameter Tick-List */}
            <div style={{ padding: '16px 20px', background: 'var(--raised)', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                  Requested Lab Parameters (Tick to include on testing sheet)
                </span>
                <span className="bd">{selectedParamIds.length} parameters selected</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {parameters.filter(p => p.code !== 'TEMP').map(param => {
                  const isChecked = selectedParamIds.includes(param.id);
                  return (
                    <label
                      key={param.id}
                      onClick={() => toggleParam(param.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: isChecked ? 'rgba(216,31,44,.12)' : 'var(--surface)',
                        color: isChecked ? 'var(--text)' : 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        style={{ accentColor: 'var(--red)' }}
                      />
                      <span>{param.name} {param.unit ? `(${param.unit})` : ''}</span>
                    </label>
                  );
                })}
              </div>

              {/* Temperature Test Points Selection */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="new-temp-master"
                      checked={selectedParamIds.includes('param-temp') && selectedTempKeys.length === 9}
                      onChange={e => handleToggleAllTempsForNew(e.target.checked)}
                      style={{ accentColor: 'var(--red)' }}
                    />
                    <label htmlFor="new-temp-master" style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                      Temperature Test Points ({selectedTempKeys.length} / 9 Active)
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => handleToggleAllTempsForNew(true)} className="ghost" style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}>Select All 9</button>
                    <button type="button" onClick={() => handleToggleAllTempsForNew(false)} className="ghost" style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}>Deselect All</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', gap: '8px' }}>
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(temp => {
                    const isTicked = selectedTempKeys.includes(temp);
                    return (
                      <button
                        key={temp}
                        type="button"
                        onClick={() => toggleTempKey(temp)}
                        className={`seg ${isTicked ? 'active' : ''}`}
                        aria-pressed={isTicked}
                        style={{ height: '34px', fontSize: '12px' }}
                      >
                        {temp}°C
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="foot" style={{ padding: '16px 0 0', borderTop: '1px solid var(--line)' }}>
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
              >
                Submit Sample to Lab Queue
              </button>
            </div>
          </form>
        </section>
      )}

      {/* VIEW B & C: Master-Detail Lab & Decision View */}
      {activeSubTab !== 'new' && (
        <div className="qc">
          {/* Left Column: Sample Reports List */}
          <section className="panel" style={{ margin: 0, maxHeight: '850px', overflowY: 'auto' }}>
            <div className="ph" style={{ flexDirection: 'column', alignItems: 'stretch', fontWeight: 400, gap: '10px' }}>
              <input
                className="inp w"
                type="search"
                placeholder="Search lot no, product, report no"
                aria-label="Search samples"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="chips">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'awaiting', label: 'Awaiting' },
                  { id: 'accepted', label: 'Accepted' },
                  { id: 'rejected', label: 'Rejected' },
                ].map(f => (
                  <button
                    key={f.id}
                    className="seg"
                    aria-pressed={filterStatus === f.id}
                    type="button"
                    onClick={() => setFilterStatus(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {filteredReports.map(rep => {
                const isSelected = selectedReport?.id === rep.id;
                const isRejected = rep.decision?.decision === 'reject';
                const isAccepted = rep.decision?.decision === 'accept';
                const isConcession = rep.decision?.decision === 'accept_concession';

                return (
                  <button
                    key={rep.id}
                    className="lot"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedReportId(rep.id);
                      setActiveSubTab('detail');
                    }}
                  >
                    <div>
                      <b style={{ color: 'var(--text)' }}>{rep.lot_no}</b>
                      <span className={`bd ${isAccepted ? 'g' : isRejected ? 'r' : isConcession ? 'a' : 'a'}`}>
                        {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : isConcession ? 'Concession' : 'Awaiting'}
                      </span>
                    </div>
                    <div>
                      <span>{rep.product_name}</span>
                      <span>{rep.sample_date} {rep.time_check}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right Column: Active Sample Lab Result Input & QC Decision */}
          <div>
            {selectedReport ? (
              <section className="panel" style={{ margin: 0 }}>
                {/* Sample Header Summary */}
                <div className="rh">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                        {selectedReport.lot_no}
                      </h2>
                      <span className="hint">({selectedReport.report_no})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '13px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      <span>Product: <strong style={{ color: 'var(--text)' }}>{selectedReport.product_name}</strong></span>
                      <span>•</span>
                      <span>Batch: <strong style={{ color: 'var(--text)' }}>{selectedReport.crystallizer_no || selectedReport.batch_no || 'BP-2609-01'}</strong></span>
                      <span>•</span>
                      <span>Submitted: <strong>{selectedReport.submitted_by_name}</strong></span>
                    </div>
                  </div>

                  {/* Actions & Decision */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedReport.decision?.decision ? (
                      <>
                        <span className={`bd ${selectedReport.decision.decision === 'reject' ? 'r' : selectedReport.decision.decision === 'accept' ? 'g' : 'a'}`}>
                          QC: {String(selectedReport.decision.decision).toUpperCase()}
                        </span>

                        {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionType(selectedReport.decision?.decision || 'accept');
                              setIsDecisionModalOpen(true);
                            }}
                            className="ghost"
                          >
                            Update Decision
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="bd a">Awaiting</span>
                        {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => setIsDecisionModalOpen(true)}
                            className="primary"
                          >
                            Record Decision
                          </button>
                        )}
                      </>
                    )}

                    {onNavigateToCertificate && (
                      <button
                        type="button"
                        onClick={() => onNavigateToCertificate(selectedReport.id)}
                        className="ghost"
                      >
                        Certificate
                      </button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setReportToDelete(selectedReport)}
                        className="ghost dng"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Sampling Point & Batch row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', padding: '20px 28px', borderBottom: '1px solid var(--line)' }}>
                  <div className="fld" style={{ margin: 0 }}>
                    <label>Sampling Point (QC Selection):</label>
                    <select
                      value={qcSamplingPointId}
                      disabled={!canEdit}
                      onChange={e => {
                        const val = e.target.value;
                        setQcSamplingPointId(val);
                        const matched = samplingPoints.find(sp => sp.id === val);
                        if (selectedReport) {
                          selectedReport.sampling_point_id = val;
                          selectedReport.sampling_point_name = matched?.name || '';
                        }
                      }}
                      className="inp"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Select Sampling Point --</option>
                      {samplingPoints.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="fld" style={{ margin: 0 }}>
                    <label>Crystallizer / Batch No:</label>
                    <input
                      type="text"
                      placeholder="e.g. CR-04 / B260904"
                      disabled={!canEdit}
                      value={qcCrystallizerBatch}
                      onChange={e => {
                        const val = e.target.value;
                        setQcCrystallizerBatch(val);
                        if (selectedReport) {
                          if (val.includes('/')) {
                            const [c, b] = val.split('/');
                            selectedReport.crystallizer_no = c?.trim();
                            selectedReport.batch_no = b?.trim();
                          } else {
                            selectedReport.crystallizer_no = val.trim();
                            selectedReport.batch_no = val.trim();
                          }
                        }
                      }}
                      className="inp"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Rejection Alert Banner if lot was rejected */}
                {selectedReport.decision?.decision === 'reject' && (
                  <div style={{ margin: '20px 28px', padding: '16px', background: 'rgba(216,31,44,.12)', borderRadius: '10px', border: '1px solid rgba(216,31,44,.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--redt)', fontWeight: 600, fontSize: '13px' }}>
                      <span className="bd r">REJECTED</span>
                      <span>{selectedReport.decision.reason_label}</span>
                    </div>
                    <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text)' }}>
                      {selectedReport.decision.reason_detail}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                      Disposition: <strong style={{ color: 'var(--redt)', textTransform: 'uppercase' }}>{selectedReport.decision.disposition}</strong> · Decided: {selectedReport.decision.decided_at}
                    </div>
                  </div>
                )}

                {/* Success alert on result saving */}
                {resultsSuccess && (
                  <div style={{ margin: '20px 28px', padding: '14px', background: 'rgba(63,179,127,.12)', borderRadius: '10px', border: '1px solid rgba(63,179,127,.4)', color: 'var(--green)', fontSize: '13px' }}>
                    {resultsSuccess}
                  </div>
                )}

                {/* Parameter Test Input Form */}
                <form onSubmit={handleSaveResults}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                      Laboratory Analytical Parameters
                    </span>

                    {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleApplyProductSpec}
                          className="ghost"
                          style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                        >
                          Product Spec Only
                        </button>
                        <button
                          type="button"
                          onClick={handleTickAll}
                          className="ghost"
                          style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                        >
                          Tick All
                        </button>
                        <button
                          type="button"
                          onClick={handleUntickAll}
                          className="ghost"
                          style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                        >
                          Untick All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '60px', textAlign: 'center' }}>Test</th>
                          <th>Parameter Name</th>
                          <th style={{ width: '100px' }}>Unit</th>
                          <th style={{ width: '220px' }}>Lab Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 1. Standard Laboratory Parameters */}
                        {standardResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');

                          return (
                            <tr key={res.id} style={{ opacity: isUnticked ? 0.45 : 1 }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  style={{ accentColor: 'var(--red)', width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ fontWeight: isUnticked ? 400 : 500, color: 'var(--text)' }}>
                                {res.parameter_name}
                              </td>
                              <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                {res.unit || '–'}
                              </td>
                              <td>
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A – Unticked"
                                    style={{ color: 'var(--muted)', fontStyle: 'italic' }}
                                  />
                                ) : res.parameter_code === 'ODOUR' ? (
                                  <select
                                    disabled={!canEdit}
                                    value={inputVal.text || 'bland'}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], text: e.target.value }
                                    }))}
                                  >
                                    <option value="bland">Bland (Normal)</option>
                                    <option value="acceptable">Acceptable</option>
                                    <option value="off">Off / Burnt Odour</option>
                                  </select>
                                ) : (
                                  <input
                                    type="number"
                                    step={res.parameter_code === 'SFC' || res.parameter_code === 'BPP' || res.parameter_code === 'SLIP_MELT' || res.parameter_code === 'CLOUD_POINT' || res.parameter_code === 'SOAP' || res.parameter_code === 'IV' || res.parameter_code === 'COLOUR_R' || res.parameter_code === 'COLOUR_Y' ? '0.1' : '0.001'}
                                    disabled={!canEdit}
                                    placeholder="Enter value"
                                    value={inputVal.num ?? ''}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], num: e.target.value ? Number(e.target.value) : undefined }
                                    }))}
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 2. Master Temperature Row */}
                        {tempResults.length > 0 && (
                          <tr style={{ background: 'var(--raised)' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isTempAllTicked}
                                onChange={e => handleToggleMasterTemp(e.target.checked)}
                                disabled={!(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin')}
                                style={{ accentColor: 'var(--red)', width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                Temperature Test Series
                              </span>
                            </td>
                            <td style={{ color: 'var(--muted)' }}>–</td>
                            <td>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                  {activeTempCount === 9 ? 'All 9 Active' : activeTempCount === 0 ? 'None Active' : `${activeTempCount} / 9 Active`}
                                </span>
                                {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button type="button" onClick={() => handleToggleMasterTemp(true)} className="ghost" style={{ height: '24px', fontSize: '11px', padding: '0 6px' }}>All</button>
                                    <button type="button" onClick={() => handleToggleMasterTemp(false)} className="ghost" style={{ height: '24px', fontSize: '11px', padding: '0 6px' }}>Clear</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* 3. Nine Individual Temperature Test Points */}
                        {tempResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');

                          return (
                            <tr key={res.id} style={{ opacity: isUnticked ? 0.45 : 1 }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  style={{ accentColor: 'var(--red)', width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ paddingLeft: '28px', color: 'var(--text)' }}>
                                ↳ Temperature {res.series_key}°C
                              </td>
                              <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                {res.parameter_code === 'TEMP' ? '–' : (res.unit || '–')}
                              </td>
                              <td>
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A – Unticked"
                                    style={{ color: 'var(--muted)', fontStyle: 'italic' }}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    disabled={!canEdit}
                                    placeholder=""
                                    value={inputVal.text !== undefined ? inputVal.text : (inputVal.num !== undefined ? String(inputVal.num) : '')}
                                    onChange={e => {
                                      const raw = e.target.value;
                                      const numVal = raw.trim() !== '' && !isNaN(Number(raw)) ? Number(raw) : undefined;
                                      setResultInputs(prev => ({
                                        ...prev,
                                        [res.id]: {
                                          num: numVal,
                                          text: raw,
                                        }
                                      }));
                                    }}
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* QC Operating Conditions & Remarks Section */}
                  <div className="row">
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px' }}>
                      QC Operating Conditions & Remarks
                    </label>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '14px', fontSize: '13px', color: 'var(--text)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkFlushing}
                          onChange={e => setQcRemarkFlushing(e.target.checked)}
                          style={{ accentColor: 'var(--red)' }}
                        />
                        <span>Flushing (Sampling line flushed)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkCooling}
                          onChange={e => setQcRemarkCooling(e.target.checked)}
                          style={{ accentColor: 'var(--red)' }}
                        />
                        <span>Cooling (Crystallizer active cooling)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkPushover}
                          onChange={e => setQcRemarkPushover(e.target.checked)}
                          style={{ accentColor: 'var(--red)' }}
                        />
                        <span>Push over (Transfer operation)</span>
                      </label>
                    </div>

                    <textarea
                      disabled={!canEdit}
                      rows={2}
                      placeholder="Type remarks here (appearance, clarity, moisture haze, process deviations)..."
                      value={qcRemarksText}
                      onChange={e => setQcRemarksText(e.target.value)}
                      className="rem"
                    />
                  </div>

                  {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                    <div className="foot">
                      <p>All recorded laboratory entries comply with ISO / 21 CFR Part 11 integrity standards.</p>
                      <button
                        type="submit"
                        className="primary"
                      >
                        Commit Lab Results
                      </button>
                    </div>
                  )}
                </form>
              </section>
            ) : (
              <section className="panel empty">
                Select a sample report from the queue on the left.
              </section>
            )}
          </div>
        </div>
      )}


      {/* 3. QC Decision Modal with Electronic Signature */}
      {isDecisionModalOpen && selectedReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div className="panel" style={{ maxWidth: '500px', width: '100%', margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                  QC Formal Decision: {selectedReport.lot_no}
                </h3>
                <p className="hint" style={{ marginTop: '2px' }}>
                  {selectedReport.product_name} · Report {selectedReport.report_no}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDecisionModalOpen(false)}
                className="ghost"
                style={{ height: '30px', width: '30px', padding: 0 }}
              >
                ✕
              </button>
            </div>

            {decisionError && (
              <p className="err" style={{ marginBottom: '12px' }}>{decisionError}</p>
            )}

            <form onSubmit={handleSubmitDecision}>
              {/* Decision Type Buttons */}
              <div className="fld">
                <label>Select QC Disposition:</label>
                <div className="segs" style={{ '--c': 3, margin: 0 } as React.CSSProperties}>
                  <button
                    type="button"
                    onClick={() => setDecisionType('accept')}
                    className="seg"
                    aria-pressed={decisionType === 'accept'}
                  >
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('accept_concession')}
                    className="seg"
                    aria-pressed={decisionType === 'accept_concession'}
                  >
                    CONCESSION
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('reject')}
                    className="seg"
                    aria-pressed={decisionType === 'reject'}
                  >
                    REJECT
                  </button>
                </div>
              </div>

              {/* Mandatory Rejection fields */}
              {decisionType !== 'accept' && (
                <>
                  <div className="fld">
                    <label>Rejection Reason Code (Pareto categorized) *</label>
                    <select
                      required
                      value={decisionReasonId}
                      onChange={e => setDecisionReasonId(e.target.value)}
                      className="inp"
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Choose Reason Code --</option>
                      {reasons.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {decisionType === 'reject' && (
                    <div className="fld">
                      <label>Mandatory Product Disposition *</label>
                      <select
                        value={decisionDisposition}
                        onChange={e => setDecisionDisposition(e.target.value as Disposition)}
                        className="inp"
                        style={{ width: '100%', color: 'var(--amber)', fontWeight: 600 }}
                      >
                        <option value="reprocess">Reprocess (Return to Deodorizer)</option>
                        <option value="rework">Rework (Bleaching/Pre-treatment)</option>
                        <option value="downgrade">Downgrade to Lower Grade Product</option>
                        <option value="hold">Quality Hold (Quarantine Tank)</option>
                        <option value="scrap">Scrap / By-product Tank</option>
                      </select>
                    </div>
                  )}

                  <div className="fld">
                    <label>Reason Narrative (Audit explanation, min 10 chars) *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Detailed explanation of failure mode and analytical findings..."
                      value={decisionNarrative}
                      onChange={e => setDecisionNarrative(e.target.value)}
                      className="rem"
                      style={{ height: '70px', width: '100%' }}
                    />
                  </div>
                </>
              )}

              {/* Electronic Signature Password Confirmation */}
              <div className="fld" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '16px' }}>
                <label>Electronic Signature: Enter QC Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={decisionPassword}
                  onChange={e => setDecisionPassword(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                >
                  Sign & Commit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Sample Confirmation (QC Correction) */}
      {reportToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div className="panel" style={{ maxWidth: '500px', width: '100%', margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--redt)' }}>
                  Delete Sample Analysis
                </h3>
                <p className="hint">Quality Control Record Removal · 21 CFR Part 11</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportToDelete(null);
                  setDeleteError(null);
                }}
                className="ghost"
                style={{ height: '30px', width: '30px', padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Sample Information Summary */}
            <div style={{ background: 'var(--raised)', padding: '14px', borderRadius: '8px', fontSize: '13px', color: 'var(--muted)', display: 'grid', gap: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Report No:</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{reportToDelete.report_no || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Lot Number:</span>
                <span style={{ color: 'var(--redt)', fontWeight: 600 }}>{reportToDelete.lot_no || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Product:</span>
                <span style={{ color: 'var(--text)' }}>{reportToDelete.product_name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sampling Time:</span>
                <span style={{ color: 'var(--text)' }}>{reportToDelete.sample_date || ''} {reportToDelete.time_check || ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Current Status:</span>
                <span className="bd a">
                  {String(reportToDelete.decision?.decision || reportToDelete.status || 'PENDING').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            {deleteError && (
              <p className="err" style={{ marginBottom: '12px' }}>{deleteError}</p>
            )}

            <form onSubmit={handleConfirmDelete}>
              <div className="fld">
                <label>Reason for Deletion *</label>
                <select
                  required
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="inp"
                  style={{ width: '100%' }}
                >
                  <option value="Wrong analytical readings entered">Wrong analytical readings / parameters entered</option>
                  <option value="Incorrect product or tank selection">Incorrect product or tank selection</option>
                  <option value="Duplicate sample lot in queue">Duplicate sample lot generated in queue</option>
                  <option value="Contaminated or invalid physical sample">Contaminated or invalid physical sample</option>
                  <option value="Process log entry cancelled or obsolete">Process log entry cancelled or obsolete</option>
                  <option value="other">Other reason (specify below)...</option>
                </select>
              </div>

              {deleteReason === 'other' && (
                <div className="fld">
                  <label>Specific Reason Narrative *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter specific audit explanation for sample removal..."
                    value={deleteCustomReason}
                    onChange={e => setDeleteCustomReason(e.target.value)}
                    className="rem"
                    style={{ height: '60px', width: '100%' }}
                  />
                </div>
              )}

              <p className="hint" style={{ color: 'var(--amber)', margin: '12px 0 16px', fontSize: '12px' }}>
                ⚠️ Notice: Deleting this sample will purge its analytical test results, update the QC queue, and sync across all refinery log sheets and Supabase cloud records.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setReportToDelete(null);
                    setDeleteError(null);
                  }}
                  className="ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="primary"
                  style={{ background: 'var(--red)' }}
                >
                  {isDeleting ? 'Deleting Sample...' : 'Confirm & Delete Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
