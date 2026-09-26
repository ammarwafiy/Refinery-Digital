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
  deleteSampleReport
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

    const handleUpdate = () => {
      refreshReports();
    };

    window.addEventListener('refinery_reports_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refinery_reports_updated', handleUpdate);
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
    <div className="space-y-6">
      {/* 1. Module Header & Sub-Navigation */}
      <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1F2E43] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#009FE3]/40 bg-[#009FE3]/10 text-[#009FE3]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded border border-[#1F2E43] bg-[#0A1018] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#009FE3]">
                  RF-FR-001 REV. 02
                </span>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 font-sans">
                  Sample Analysis Report & Quality Control
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                44 Standard Products · Parameter Tick-List · 9-Point SFC Series · QC Disposition
              </p>
            </div>
          </div>

          {/* Sub-Tabs Actions */}
          <div className="flex items-center gap-1.5 bg-[#0A1018] p-1 rounded-lg border border-[#1F2E43]">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'list'
                  ? 'bg-[#009FE3] text-white border border-[#009FE3]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#172235]'
              }`}
            >
              Lab Queue ({reports.length})
            </button>

            <button
              onClick={() => setActiveSubTab('new')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'new'
                  ? 'bg-[#009FE3] text-white border border-[#009FE3]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#172235]'
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-inherit" />
              <span>Raise Sample</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {activeSubTab !== 'new' && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search Lot No, Product, Report No..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] font-mono transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-xs">
              <span className="text-slate-400 text-[11px] uppercase mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'awaiting', label: 'Awaiting Results' },
                { id: 'accepted', label: 'Accepted' },
                { id: 'rejected', label: 'Rejected' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] border font-mono transition-all cursor-pointer ${
                    filterStatus === f.id
                      ? 'bg-[#009FE3] border-[#009FE3] text-white font-medium'
                      : 'border-[#1F2E43] bg-[#0A1018] text-slate-400 hover:text-slate-200 hover:bg-[#172235]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
        <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-5 sm:p-6">
          <h2 className="text-sm font-bold text-slate-100 mb-4 border-b border-[#1F2E43] pb-3 font-mono uppercase tracking-wider">
            RF-FR-001 Sample Report Header & Parameter Request
          </h2>

          <form onSubmit={handleCreateSample} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Lot Number *</label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#009FE3] bg-[#009FE3]/10 px-2 py-0.5 rounded border border-[#009FE3]/30">
                    <Sparkles className="h-3 w-3" /> Auto-Generated
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOT-PL65-2609-04"
                    value={newLotNo}
                    onChange={e => setNewLotNo(e.target.value)}
                    className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-3 pr-20 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#009FE3]"
                  />
                  <button
                    type="button"
                    onClick={() => setNewLotNo(generateNextLotNo(newProductId, newDate, newProductOther))}
                    className="absolute right-1 top-1 bottom-1 px-2.5 rounded-md bg-[#101927] hover:bg-[#172235] text-[#009FE3] text-[10px] font-mono transition-all flex items-center gap-1 border border-[#1F2E43] cursor-pointer"
                    title="Regenerate next sequential lot number based on selected product & date"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Sync</span>
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-500 font-mono">
                  Pattern: LOT-[PROD]-[YYMM]-[SEQ]
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">Sample Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#009FE3] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">Time Check</label>
                <input
                  type="time"
                  value={newTimeCheck}
                  onChange={e => setNewTimeCheck(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#009FE3] cursor-pointer"
                />
              </div>
            </div>

            {/* Product Picker */}
            <div className="rounded-xl border border-[#1F2E43] bg-[#0A1018] p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                Product Selection (RF-FR-001 Form 44-Product Standard List)
              </label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full bg-[#101927] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono font-medium focus:outline-none focus:border-[#009FE3] cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#101927] text-slate-200">
                    {p.name}
                  </option>
                ))}
                <option value="others" className="bg-[#101927] text-slate-200">Others — Free Text Entry</option>
              </select>

              {newProductId === 'others' && (
                <div className="mt-3">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Enter Custom Product Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="Specify other product name..."
                    value={newProductOther}
                    onChange={e => setNewProductOther(e.target.value)}
                    className="w-full bg-[#101927] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#009FE3]"
                  />
                </div>
              )}
            </div>

            {/* Tanks & Sampling Point */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">Feed Tank</label>
                <select
                  value={newFeedTankId}
                  onChange={e => setNewFeedTankId(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 cursor-pointer focus:outline-none focus:border-[#009FE3]"
                >
                  {tanks.filter(t => t.kind === 'feed' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id} className="bg-[#101927] text-slate-200">{t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">Discharge Tank</label>
                <select
                  value={newDischargeTankId}
                  onChange={e => setNewDischargeTankId(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 cursor-pointer focus:outline-none focus:border-[#009FE3]"
                >
                  {tanks.filter(t => t.kind === 'discharge' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id} className="bg-[#101927] text-slate-200">{t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">Crystallizer / Batch No</label>
                <input
                  type="text"
                  placeholder="CR-04 / B260904"
                  value={newBatchNo}
                  onChange={e => setNewBatchNo(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#009FE3]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">Sampling Point</label>
                <select
                  value={newSamplingPointId}
                  onChange={e => setNewSamplingPointId(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 cursor-pointer focus:outline-none focus:border-[#009FE3]"
                >
                  {samplingPoints.map(sp => (
                    <option key={sp.id} value={sp.id} className="bg-[#101927] text-slate-200">{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printed Remarks Checkboxes */}
            <div className="rounded-xl border border-[#1F2E43] bg-[#0A1018] p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                Printed Remarks Tick-List
              </label>
              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 font-mono">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkFlushing}
                    onChange={e => setNewRemarkFlushing(e.target.checked)}
                    className="h-4 w-4 rounded border-[#1F2E43] bg-[#101927] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                  />
                  <span>Flushing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkCooling}
                    onChange={e => setNewRemarkCooling(e.target.checked)}
                    className="h-4 w-4 rounded border-[#1F2E43] bg-[#101927] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                  />
                  <span>Cooling</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkPushover}
                    onChange={e => setNewRemarkPushover(e.target.checked)}
                    className="h-4 w-4 rounded border-[#1F2E43] bg-[#101927] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                  />
                  <span>Pushover</span>
                </label>
              </div>
            </div>

            {/* Parameter Tick-List */}
            <div className="rounded-xl border border-[#1F2E43] bg-[#0A1018] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Requested Lab Parameters (Tick to include on testing sheet)
                </span>
                <span className="text-[10px] text-[#009FE3] font-mono font-semibold">
                  {selectedParamIds.length} parameters selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs font-mono">
                {parameters.filter(p => p.code !== 'TEMP').map(param => {
                  const isChecked = selectedParamIds.includes(param.id);
                  return (
                    <label
                      key={param.id}
                      onClick={() => toggleParam(param.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-[#009FE3]/50 bg-[#009FE3]/15 text-[#009FE3] font-semibold' 
                          : 'border-[#1F2E43] bg-[#101927] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-slate-200 bg-slate-50 text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                      <span className="text-[11px] truncate">{param.name} {param.unit ? `(${param.unit})` : ''}</span>
                    </label>
                  );
                })}
              </div>

              {/* Temperature Test Points Selection */}
              <div className="mt-4 pt-3 border-t border-[#1F2E43]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-temp-master"
                      checked={selectedParamIds.includes('param-temp') && selectedTempKeys.length === 9}
                      onChange={e => handleToggleAllTempsForNew(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#101927] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                    />
                    <label htmlFor="new-temp-master" className="text-xs font-medium text-slate-200 font-mono cursor-pointer flex items-center gap-2">
                      <span>Temperature Test Points</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101927] text-[#009FE3] border border-[#1F2E43] font-semibold">
                        {selectedTempKeys.length} / 9 Active
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleAllTempsForNew(true)}
                      className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#101927] hover:bg-[#172235] text-slate-300 border border-[#1F2E43] transition-colors cursor-pointer"
                    >
                      Select All 9
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllTempsForNew(false)}
                      className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#101927] hover:bg-[#172235] text-slate-400 border border-[#1F2E43] transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(temp => {
                    const isTicked = selectedTempKeys.includes(temp);
                    return (
                      <label
                        key={temp}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleTempKey(temp);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                          isTicked
                            ? 'border-[#009FE3]/50 bg-[#009FE3]/15 text-[#009FE3] font-semibold'
                            : 'border-[#1F2E43] bg-[#101927] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isTicked}
                          readOnly
                          className="h-3 w-3 rounded border-slate-200 bg-slate-50 text-blue-600 focus:ring-blue-500 pointer-events-none"
                        />
                        <span className="text-[11px]">{temp}°C</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1F2E43]">
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="px-3.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#009FE3] hover:bg-[#0089C4] text-white font-mono font-medium text-xs uppercase px-5 py-2 rounded-lg transition-all border border-[#009FE3]/50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Submit Sample to Lab Queue</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW B & C: Master-Detail Lab & Decision View */}
      {activeSubTab !== 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sample Reports List */}
          <div className="lg:col-span-4 rounded-xl border border-[#1F2E43] bg-[#101927] p-3.5 space-y-2.5 max-h-[850px] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F2E43] text-[11px] font-mono text-slate-400">
              <span className="uppercase tracking-wider font-semibold">REFINERY SAMPLES</span>
              <span className="bg-[#0A1018] text-[#009FE3] px-2 py-0.5 rounded font-semibold border border-[#1F2E43]">{filteredReports.length} in queue</span>
            </div>

            {filteredReports.map(rep => {
              const isSelected = selectedReport?.id === rep.id;
              const isRejected = rep.decision?.decision === 'reject';
              const isAccepted = rep.decision?.decision === 'accept';
              const isConcession = rep.decision?.decision === 'accept_concession';

              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#009FE3] bg-[#009FE3]/15'
                      : 'border-[#1F2E43] bg-[#0A1018] hover:bg-[#172235]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        <span>{rep.lot_no}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-1.5 font-mono">
                        <span className="truncate max-w-[140px]">{rep.product_name}</span>
                        {(rep.remarks?.toLowerCase().includes('auto-dispatched') || rep.remarks?.includes('Process Log')) && (
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded border border-[#1F2E43] bg-[#0A1018] text-[#009FE3] font-semibold">
                            AUTO
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isRejected ? (
                        <span className="text-[9px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 font-semibold">
                          REJECT
                        </span>
                      ) : isAccepted ? (
                        <span className="text-[9px] font-mono text-green-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                          ACCEPT
                        </span>
                      ) : isConcession ? (
                        <span className="text-[9px] font-mono text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-semibold">
                          CONCESSION
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-blue-600 bg-blue-600/10 px-1.5 py-0.5 rounded border border-blue-500/30 font-semibold">
                          AWAITING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-[#1F2E43] pt-1.5">
                    <span>{rep.report_no}</span>
                    <span>{rep.sample_date} {rep.time_check}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Sample Lab Result Input & QC Decision */}
          <div className="lg:col-span-8 space-y-6">
            {selectedReport ? (
              <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-5 sm:p-6 space-y-5">
                {/* Sample Header Summary */}
                <div className="border-b border-[#1F2E43] pb-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#1F2E43] bg-[#0A1018] text-[#009FE3] font-semibold">
                          {selectedReport.report_no}
                        </span>
                        <h2 className="text-lg font-bold text-slate-100 font-mono">
                          {selectedReport.lot_no}
                        </h2>
                        {(selectedReport.remarks?.toLowerCase().includes('auto-dispatched') || selectedReport.remarks?.includes('Process Log')) && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#009FE3]/10 text-[#009FE3] border border-[#009FE3]/30 flex items-center gap-1 font-semibold">
                            ⚡ Auto-Dispatched ({selectedReport.time_check})
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2.5">
                        <span>Product: <strong className="text-slate-200">{selectedReport.product_name}</strong></span>
                        <span>•</span>
                        <span>Tanks: <strong className="text-slate-400">{selectedReport.feed_tank_code || 'Feed'} → {selectedReport.discharge_tank_code || 'Discharge'}</strong></span>
                        <span>•</span>
                        <span>Submitted: <strong className="text-slate-400">{selectedReport.submitted_by_name}</strong></span>
                      </div>
                    </div>

                    {/* QC Decision Action or Badge */}
                    <div className="flex items-center gap-2.5">
                      {selectedReport.decision ? (
                        <>
                          <div className="text-right">
                            <div className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border inline-block ${
                              selectedReport.decision.decision === 'reject'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : selectedReport.decision.decision === 'accept'
                                ? 'bg-emerald-500/10 text-green-600 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            }`}>
                              DECISION: {String(selectedReport.decision?.decision || 'PENDING').toUpperCase()}
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                              By: {selectedReport.decision.decided_by_name}
                            </div>
                          </div>

                          {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                            <button
                              type="button"
                              onClick={() => {
                                setDecisionType(selectedReport.decision?.decision || 'accept');
                                setIsDecisionModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 bg-[#0A1018] hover:bg-[#172235] text-slate-300 hover:text-white border border-[#1F2E43] px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer"
                              title="Update or re-record QC Decision"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-[#009FE3]" />
                              <span>Update Decision</span>
                            </button>
                          )}
                        </>
                      ) : (
                        (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                          <button
                            onClick={() => setIsDecisionModalOpen(true)}
                            className="flex items-center gap-1.5 bg-[#009FE3] hover:bg-[#0089C4] text-white font-mono font-medium text-xs uppercase px-3.5 py-2 rounded-lg transition-all border border-[#009FE3]/50 cursor-pointer"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Record Decision</span>
                          </button>
                        )
                      )}

                      {/* Direct Navigation to RF-FR-001 Certificate */}
                      {onNavigateToCertificate && (
                        <button
                          type="button"
                          onClick={() => onNavigateToCertificate(selectedReport.id)}
                          className="flex items-center gap-1.5 bg-[#0A1018] hover:bg-[#172235] text-slate-300 hover:text-white border border-[#1F2E43] px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer"
                          title="View & export official RF-FR-001 Certificate"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#009FE3]" />
                          <span>Certificate</span>
                        </button>
                      )}

                      {/* Delete Sample Action for QC */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setReportToDelete(selectedReport)}
                          className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-800/60 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer"
                          title="Delete this sample analysis (QC correction)"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          <span>Delete Sample</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QC Operational Sampling Point & Crystallizer / Batch No Selection Bar */}
                  <div className="pt-3 border-t border-[#1F2E43]/60 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0A1018] p-3 rounded-lg border border-[#1F2E43]">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                        <span className="text-[#009FE3]">📍</span> Sampling Point (QC Selection):
                      </label>
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
                        className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 cursor-pointer focus:outline-none focus:border-[#009FE3] disabled:opacity-50"
                      >
                        <option value="" className="bg-[#101927] text-slate-400">-- Select Sampling Point --</option>
                        {samplingPoints.map(sp => (
                          <option key={sp.id} value={sp.id} className="bg-[#101927] text-slate-200">
                            {sp.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                        <span className="text-[#009FE3]">🏷️</span> Crystallizer / Batch No:
                      </label>
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
                        className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Rejection Alert Banner if lot was rejected */}
                {selectedReport.decision?.decision === 'reject' && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 font-mono">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-1">
                      <XCircle className="h-4 w-4" />
                      <span>LOT REJECTED: {selectedReport.decision.reason_label}</span>
                    </div>
                    <p className="text-xs text-red-300 leading-relaxed">
                      {selectedReport.decision.reason_detail}
                    </p>
                    <div className="mt-2 text-[10px] text-red-400 flex items-center gap-3">
                      <span>Disposition: <strong className="uppercase underline">{selectedReport.decision.disposition}</strong></span>
                      <span>•</span>
                      <span>Decided: {selectedReport.decision.decided_at}</span>
                    </div>
                  </div>
                )}

                {/* Success alert on result saving */}
                {resultsSuccess && (
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-300 border border-emerald-500/30 flex items-center gap-2 font-mono">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{resultsSuccess}</span>
                  </div>
                )}

                {/* Parameter Test Input Form */}
                <form onSubmit={handleSaveResults} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Lab Analysis Results Entry (RF-FR-001 Table)
                      </span>
                      <span className="rounded bg-[#0A1018] px-2 py-0.5 font-mono text-[10px] text-[#009FE3] border border-[#1F2E43] font-semibold">
                        {standardResults.filter(r => requestedMap[r.id] !== false).length + (isTempAnyTicked ? 1 : 0)} / {standardResults.length + (tempResults.length > 0 ? 1 : 0)} Active
                        {isTempAnyTicked && ` · ${activeTempCount}/9 Temps`}
                      </span>
                    </div>

                    {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleApplyProductSpec}
                          className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-[#0A1018] hover:bg-[#172235] text-slate-300 hover:text-white border border-[#1F2E43] transition-colors cursor-pointer"
                          title="Tick only parameters specified for this product"
                        >
                          Product Spec Only
                        </button>
                        <button
                          type="button"
                          onClick={handleTickAll}
                          className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-[#0A1018] hover:bg-[#172235] text-slate-300 hover:text-white border border-[#1F2E43] transition-colors cursor-pointer"
                        >
                          Tick All
                        </button>
                        <button
                          type="button"
                          onClick={handleUntickAll}
                          className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-[#0A1018] hover:bg-[#172235] text-slate-400 border border-[#1F2E43] transition-colors cursor-pointer"
                        >
                          Untick All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#1F2E43] bg-[#0A1018] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101927] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-[#1F2E43]">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-14" title="Tick to test parameter, untick if product does not require it">
                            Test (✓)
                          </th>
                          <th className="py-2.5 px-3">Parameter Name</th>
                          <th className="py-2.5 px-3 w-20">Unit</th>
                          <th className="py-2.5 px-3 w-56">Lab Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F2E43] font-mono text-xs">
                        {/* 1. Standard Laboratory Parameters */}
                        {standardResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');

                          return (
                            <tr
                              key={res.id}
                              className={`transition-colors ${
                                isUnticked
                                  ? 'opacity-40 bg-[#070B12]'
                                  : 'hover:bg-[#101927]'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  className="h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#101927] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer disabled:opacity-50"
                                  title={isUnticked ? "Unticked: Test not applicable" : "Ticked: Active parameter"}
                                />
                              </td>
                              <td className={`py-2.5 px-3 font-sans ${isUnticked ? 'text-slate-500' : 'text-slate-200 font-medium'}`}>
                                {res.parameter_name}
                              </td>
                              <td className={`py-2.5 px-3 ${isUnticked ? 'text-slate-500' : 'text-slate-400'}`}>
                                {res.unit || '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A - Unticked"
                                    className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1 text-xs text-slate-500 cursor-not-allowed font-mono italic"
                                  />
                                ) : res.parameter_code === 'ODOUR' ? (
                                  <select
                                    disabled={!canEdit}
                                    value={inputVal.text || 'bland'}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], text: e.target.value }
                                    }))}
                                    className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1 text-xs text-slate-200 focus:border-[#009FE3] disabled:opacity-50 font-mono cursor-pointer"
                                  >
                                    <option value="bland" className="bg-[#101927] text-slate-200">Bland (Normal)</option>
                                    <option value="acceptable" className="bg-[#101927] text-slate-200">Acceptable</option>
                                    <option value="off" className="bg-[#101927] text-slate-200">Off / Burnt Odour</option>
                                  </select>
                                ) : (
                                  <input
                                    type="number"
                                    step={res.parameter_code === 'SFC' || res.parameter_code === 'BPP' || res.parameter_code === 'SLIP_MELT' || res.parameter_code === 'CLOUD_POINT' || res.parameter_code === 'SOAP' || res.parameter_code === 'IV' || res.parameter_code === 'COLOUR_R' || res.parameter_code === 'COLOUR_Y' ? "0.1" : "0.001"}
                                    disabled={!canEdit}
                                    placeholder="Enter value"
                                    value={inputVal.num ?? ''}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], num: e.target.value ? Number(e.target.value) : undefined }
                                    }))}
                                    className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1 text-xs text-slate-100 focus:border-[#009FE3] disabled:opacity-50 font-mono"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 2. Master Temperature Row */}
                        {tempResults.length > 0 && (
                          <tr className={`border-t border-[#1F2E43] transition-colors ${
                            !isTempAnyTicked
                              ? 'bg-[#070B12] opacity-60'
                              : 'bg-[#101927]'
                          }`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isTempAllTicked}
                                onChange={e => handleToggleMasterTemp(e.target.checked)}
                                disabled={!(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin')}
                                className="h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#0A1018] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer disabled:opacity-50"
                                title={isTempAllTicked ? "Untick all 9 temperatures" : "Tick all 9 temperatures"}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-semibold font-sans ${isTempAnyTicked ? 'text-slate-100' : 'text-slate-400'}`}>
                                  Temperature
                                </span>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0A1018] text-[#009FE3] border border-[#1F2E43] font-semibold">
                                  9 Test Points: 10, 15, 20, 25, 30, 35, 40, 45, 50°C
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono">
                              -
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400 font-medium">
                                  {activeTempCount === 9
                                    ? 'All 9 Active'
                                    : activeTempCount === 0
                                    ? 'None Active'
                                    : `${activeTempCount} / 9 Active`}
                                </span>
                                {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMasterTemp(true)}
                                      className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0A1018] hover:bg-[#172235] text-slate-300 hover:text-white border border-[#1F2E43] transition-colors cursor-pointer"
                                    >
                                      All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMasterTemp(false)}
                                      className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0A1018] hover:bg-[#172235] text-slate-400 border border-[#1F2E43] transition-colors cursor-pointer"
                                    >
                                      Clear
                                    </button>
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
                            <tr
                              key={res.id}
                              className={`transition-colors border-l-2 ${
                                isUnticked
                                  ? 'opacity-40 bg-[#070B12] border-l-[#1F2E43]'
                                  : 'hover:bg-[#101927] border-l-[#009FE3] bg-[#009FE3]/5'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  className="h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#101927] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer disabled:opacity-50"
                                  title={isUnticked ? `Unticked: Temperature ${res.series_key}°C not tested` : `Ticked: Test Temperature ${res.series_key}°C`}
                                />
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="flex items-center gap-2 pl-3">
                                  <span className="text-[#009FE3] font-mono text-xs select-none">↳</span>
                                  <span className={`font-medium ${isUnticked ? 'text-slate-500' : 'text-slate-200'}`}>
                                    Temperature {res.series_key}°C
                                  </span>
                                  <span className="text-[9px] font-mono text-[#009FE3] bg-[#009FE3]/10 px-1.5 py-0.2 rounded border border-[#009FE3]/30">
                                    Pt {res.series_key}
                                  </span>
                                </div>
                              </td>
                              <td className={`py-2.5 px-3 ${isUnticked ? 'text-slate-500' : 'text-slate-400'}`}>
                                {res.parameter_code === 'TEMP' ? '-' : (res.unit || '-')}
                              </td>
                              <td className="py-2.5 px-3">
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A - Unticked"
                                    className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1 text-xs text-slate-500 cursor-not-allowed font-mono italic"
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
                                    className="w-full bg-[#101927] border border-[#1F2E43] rounded-md px-2.5 py-1 text-xs text-slate-100 focus:border-[#009FE3] disabled:opacity-50 font-mono"
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
                  <div className="rounded-xl border border-[#1F2E43] bg-[#0A1018] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2E43] pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-[#009FE3]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                          QC OPERATING CONDITIONS & REMARKS (RF-FR-001)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Tick operating conditions & record laboratory observations
                      </span>
                    </div>

                    {/* Checkboxes: Flushing, Cooling, Push over */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        qcRemarkFlushing 
                          ? 'bg-amber-950/40 border-amber-800 text-amber-300' 
                          : 'bg-[#101927] border-[#1F2E43] text-slate-400 hover:border-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkFlushing}
                          onChange={e => setQcRemarkFlushing(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#0A1018] text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-slate-200 text-xs">Flushing</div>
                          <div className="text-[10px] text-slate-400">Sampling line flushed</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        qcRemarkCooling 
                          ? 'bg-[#009FE3]/15 border-[#009FE3]/40 text-[#009FE3]' 
                          : 'bg-[#101927] border-[#1F2E43] text-slate-400 hover:border-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkCooling}
                          onChange={e => setQcRemarkCooling(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#0A1018] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                        />
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-slate-200 text-xs">Cooling</div>
                          <div className="text-[10px] text-slate-400">Crystallizer active cooling</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        qcRemarkPushover 
                          ? 'bg-[#009FE3]/15 border-[#009FE3]/40 text-[#009FE3]' 
                          : 'bg-[#101927] border-[#1F2E43] text-slate-400 hover:border-slate-600'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkPushover}
                          onChange={e => setQcRemarkPushover(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[#1F2E43] bg-[#0A1018] text-[#009FE3] focus:ring-[#009FE3] cursor-pointer"
                        />
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-slate-200 text-xs">Push over</div>
                          <div className="text-[10px] text-slate-400">Pushover transfer operation</div>
                        </div>
                      </label>
                    </div>

                    {/* Blank Remarks Box for QC to Type */}
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Remarks & Observations:
                      </label>
                      <textarea
                        disabled={!canEdit}
                        rows={2}
                        placeholder="Type remarks here (appearance, clarity, moisture haze, process deviations)..."
                        value={qcRemarksText}
                        onChange={e => setQcRemarksText(e.target.value)}
                        className="w-full bg-[#101927] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] disabled:opacity-50 resize-none"
                      />
                    </div>
                  </div>

                  {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-2 bg-[#009FE3] hover:bg-[#0089C4] text-white font-mono font-medium text-xs uppercase px-5 py-2 rounded-lg transition-all border border-[#009FE3]/50 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Commit Lab Results</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-12 text-center text-slate-400 text-xs font-mono">
                Select a sample report from the queue on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QC Decision Modal with Electronic Signature */}
      {isDecisionModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#1F2E43] bg-[#101927] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#009FE3] border-b border-[#1F2E43] pb-3">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <h3 className="text-base font-bold text-slate-100 font-sans">
                  QC Formal Decision: {selectedReport.lot_no}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedReport.product_name} · Report {selectedReport.report_no}
                </p>
              </div>
            </div>

            {decisionError && (
              <div className="rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300 border border-red-500/30 font-mono">
                {decisionError}
              </div>
            )}

            <form onSubmit={handleSubmitDecision} className="space-y-4">
              {/* Decision Type Buttons */}
              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">
                  Select QC Disposition:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionType('accept')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                      decisionType === 'accept'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-semibold'
                        : 'border-[#1F2E43] bg-[#0A1018] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('accept_concession')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                      decisionType === 'accept_concession'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-semibold'
                        : 'border-[#1F2E43] bg-[#0A1018] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    CONCESSION
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('reject')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                      decisionType === 'reject'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-semibold'
                        : 'border-[#1F2E43] bg-[#0A1018] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    REJECT
                  </button>
                </div>
              </div>

              {/* Mandatory Rejection fields */}
              {decisionType !== 'accept' && (
                <>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                      Rejection Reason Code (Pareto categorized) *
                    </label>
                    <select
                      required
                      value={decisionReasonId}
                      onChange={e => setDecisionReasonId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    >
                      <option value="" className="bg-slate-50 text-slate-900">-- Choose Reason Code --</option>
                      {reasons.map(r => (
                        <option key={r.id} value={r.id} className="bg-slate-50 text-slate-900">{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {decisionType === 'reject' && (
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                        Mandatory Product Disposition *
                      </label>
                      <select
                        value={decisionDisposition}
                        onChange={e => setDecisionDisposition(e.target.value as Disposition)}
                        className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-amber-400 font-semibold cursor-pointer focus:border-[#009FE3]"
                      >
                        <option value="reprocess" className="bg-[#101927] text-slate-200">Reprocess (Return to Deodorizer)</option>
                        <option value="rework" className="bg-[#101927] text-slate-200">Rework (Bleaching/Pre-treatment)</option>
                        <option value="downgrade" className="bg-[#101927] text-slate-200">Downgrade to Lower Grade Product</option>
                        <option value="hold" className="bg-[#101927] text-slate-200">Quality Hold (Quarantine Tank)</option>
                        <option value="scrap" className="bg-[#101927] text-slate-200">Scrap / By-product Tank</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                      Reason Narrative (Audit explanation, min 10 chars) *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Detailed explanation of failure mode and analytical findings..."
                      value={decisionNarrative}
                      onChange={e => setDecisionNarrative(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Electronic Signature Password Confirmation */}
              <div className="border-t border-[#1F2E43] pt-3">
                <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider font-semibold">
                  Electronic Signature: Enter QC Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={decisionPassword}
                  onChange={e => setDecisionPassword(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#009FE3]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#009FE3] hover:bg-[#0089C4] text-white font-mono font-medium text-xs uppercase px-4 py-1.5 rounded-lg transition-all border border-[#009FE3]/50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-[#0D1522] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#1F2E43] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Delete Sample Analysis
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Quality Control Record Removal &bull; 21 CFR Part 11
                  </p>
                </div>
              </div>
              <span
                onClick={() => {
                  setReportToDelete(null);
                  setDeleteError(null);
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer text-lg font-bold"
              >
                ✕
              </span>
            </div>

            {/* Sample Information Summary */}
            <div className="rounded-lg border border-[#1F2E43] bg-[#070B14] p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Report No:</span>
                <span className="text-slate-200 font-bold">{reportToDelete.report_no || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lot Number:</span>
                <span className="text-[#009FE3] font-bold">{reportToDelete.lot_no || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="text-slate-200">{reportToDelete.product_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sampling Time:</span>
                <span className="text-slate-300">{reportToDelete.sample_date || ''} {reportToDelete.time_check || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="text-amber-400 font-semibold">
                  {String(reportToDelete.decision?.decision || reportToDelete.status || 'PENDING').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            {deleteError && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-300 text-xs font-mono">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1.5 uppercase tracking-wider font-semibold">
                  Reason for Deletion *
                </label>
                <select
                  required
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="w-full bg-[#070B14] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 cursor-pointer focus:border-[#009FE3] focus:outline-none"
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
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1 uppercase tracking-wider font-semibold">
                    Specific Reason Narrative *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter specific audit explanation for sample removal..."
                    value={deleteCustomReason}
                    onChange={e => setDeleteCustomReason(e.target.value)}
                    className="w-full bg-[#070B14] border border-[#1F2E43] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] resize-none"
                  />
                </div>
              )}

              <p className="text-[11px] text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 font-mono leading-relaxed">
                ⚠️ Notice: Deleting this sample will purge its analytical test results, update the QC queue, and sync across all refinery log sheets and Supabase cloud records.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1F2E43]">
                <button
                  type="button"
                  onClick={() => {
                    setReportToDelete(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-mono font-medium text-xs uppercase px-4 py-2 rounded-lg transition-all border border-red-500/50 cursor-pointer shadow-lg shadow-red-950/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isDeleting ? 'Deleting Sample...' : 'Confirm & Delete Sample'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
