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
  generateNextLotNo
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
  AlertTriangle, 
  Clock, 
  Search, 
  FileCheck2, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  Check, 
  Filter, 
  ShieldCheck,
  Building2,
  Sparkles,
  RefreshCw,
  FileText
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

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

  // QC Remarks & Operating Conditions state (in RF-FR-001 QC Lab Detail View)
  const [qcRemarkFlushing, setQcRemarkFlushing] = useState(false);
  const [qcRemarkCooling, setQcRemarkCooling] = useState(false);
  const [qcRemarkPushover, setQcRemarkPushover] = useState(false);
  const [qcRemarksText, setQcRemarksText] = useState('');

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
    ensureAutoDispatchedQC();
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

    // Sort parameters based on standard catalog order (sort_order), and series by series_key ascending
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

  // Separate standard parameters (including standalone SFC) from Temperature series
  const standardResults = useMemo(() => {
    return displayResults.filter(r => r.parameter_code !== 'TEMP');
  }, [displayResults]);

  const tempResults = useMemo(() => {
    return displayResults.filter(r => r.parameter_code === 'TEMP');
  }, [displayResults]);

  // Master Temperature tick box state: checked if all active, indeterminate/partial if some
  const isTempAllTicked = useMemo(() => {
    return tempResults.length > 0 && tempResults.every(r => requestedMap[r.id] !== false);
  }, [tempResults, requestedMap]);

  const isTempAnyTicked = useMemo(() => {
    return tempResults.some(r => requestedMap[r.id] !== false);
  }, [tempResults, requestedMap]);

  const activeTempCount = useMemo(() => {
    return tempResults.filter(r => requestedMap[r.id] !== false).length;
  }, [tempResults, requestedMap]);

  // Toggle master Temperature parameter: ticks/unticks all 9 temperatures together
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

  // Initialize result inputs, active/ticked status, and QC remarks when selected report changes
  useEffect(() => {
    if (selectedReport) {
      setQcRemarkFlushing(selectedReport.remark_flushing ?? false);
      setQcRemarkCooling(selectedReport.remark_cooling ?? false);
      setQcRemarkPushover(selectedReport.remark_pushover ?? false);
      setQcRemarksText(selectedReport.remarks || '');
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

    const res = updateSampleResults(selectedReport.id, payload, {
      remark_flushing: qcRemarkFlushing,
      remark_cooling: qcRemarkCooling,
      remark_pushover: qcRemarkPushover,
      remarks: qcRemarksText,
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

    // Collect failed parameters from results if any (ONLY active/ticked parameters)
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
      <div className="rounded-xl border border-[#1a2336] bg-[#0c101c] p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#161d2d] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-sky-500/30 bg-[#081524] text-sky-400">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded border border-[#2a3854] bg-[#121928] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  RF-FR-001 REV. 02
                </span>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
                  Sample Analysis Report & Quality Control
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                44 Standard Products · Parameter Tick-List · 9-Point SFC Series · QC Disposition
              </p>
            </div>
          </div>

          {/* Sub-Tabs Actions */}
          <div className="flex items-center gap-2 bg-[#080b12] p-1 rounded-lg border border-[#1a2336]">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeSubTab === 'list'
                  ? 'bg-[#162238] text-white border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lab Queue ({reports.length})
            </button>

            <button
              onClick={() => setActiveSubTab('new')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeSubTab === 'new'
                  ? 'bg-[#0284c7] text-white border border-sky-400/40 shadow-sm'
                  : 'text-sky-300 hover:bg-[#121927]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Raise Sample</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar (Visible in List and Detail views) */}
        {activeSubTab !== 'new' && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search Lot No, Product, Report No..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#080b12] border border-[#1e2a3e] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-xs">
              <span className="text-slate-500 text-[11px] uppercase mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'awaiting', label: 'Awaiting Results' },
                { id: 'accepted', label: 'Accepted' },
                { id: 'rejected', label: 'Rejected' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-1 rounded text-[11px] border font-mono transition-all cursor-pointer ${
                    filterStatus === f.id
                      ? 'bg-[#162238] border-sky-500/40 text-sky-300 font-bold'
                      : 'border-[#1a2336] bg-[#080b12] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Content Views */}

      {/* VIEW A: Raise New Sample Report */}
      {activeSubTab === 'new' && (
        <div className="rounded-xl border border-[#1a2336] bg-[#0c101c] p-5 sm:p-6 shadow-2xl">
          <h2 className="text-sm font-bold text-sky-400 mb-4 border-b border-[#161d2d] pb-3 font-mono uppercase tracking-wider">
            RF-FR-001 Sample Report Header & Parameter Request
          </h2>

          <form onSubmit={handleCreateSample} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Lot Number *</label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/40">
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
                    className="w-full bg-[#080b12] border border-[#222e44] rounded-lg pl-3 pr-20 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNewLotNo(generateNextLotNo(newProductId, newDate, newProductOther))}
                    className="absolute right-1 top-1 bottom-1 px-2.5 rounded bg-[#162238] hover:bg-[#1e2f4e] text-slate-300 hover:text-sky-300 text-[10px] font-mono transition-colors flex items-center gap-1 border border-[#2a3c5a] cursor-pointer"
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
                <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">Sample Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">Time Check</label>
                <input
                  type="time"
                  value={newTimeCheck}
                  onChange={e => setNewTimeCheck(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Product Picker (44 Printed Products from Appendix) */}
            <div className="rounded-lg border border-[#1a2336] bg-[#080b12] p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-2 font-mono">
                Product Selection (RF-FR-001 Form 44-Product Standard List)
              </label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full bg-[#0c101c] border border-[#222e44] rounded-lg px-3 py-2 text-xs text-white font-mono font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0c101c]">
                    {p.name}
                  </option>
                ))}
                <option value="others" className="bg-[#0c101c]">Others — Free Text Entry</option>
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
                    className="w-full bg-[#0c101c] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            {/* Tanks & Sampling Point */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Feed Tank</label>
                <select
                  value={newFeedTankId}
                  onChange={e => setNewFeedTankId(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white cursor-pointer"
                >
                  {tanks.filter(t => t.kind === 'feed' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id} className="bg-[#0c101c]">{t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Discharge Tank</label>
                <select
                  value={newDischargeTankId}
                  onChange={e => setNewDischargeTankId(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white cursor-pointer"
                >
                  {tanks.filter(t => t.kind === 'discharge' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id} className="bg-[#0c101c]">{t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Crystallizer / Batch No</label>
                <input
                  type="text"
                  placeholder="CR-04 / B260904"
                  value={newBatchNo}
                  onChange={e => setNewBatchNo(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Sampling Point</label>
                <select
                  value={newSamplingPointId}
                  onChange={e => setNewSamplingPointId(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white cursor-pointer"
                >
                  {samplingPoints.map(sp => (
                    <option key={sp.id} value={sp.id} className="bg-[#0c101c]">{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printed Remarks Checkboxes */}
            <div className="rounded-lg border border-[#1a2336] bg-[#080b12] p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-2 font-mono">
                Printed Remarks Tick-List
              </label>
              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 font-mono">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkFlushing}
                    onChange={e => setNewRemarkFlushing(e.target.checked)}
                    className="h-4 w-4 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Flushing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkCooling}
                    onChange={e => setNewRemarkCooling(e.target.checked)}
                    className="h-4 w-4 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Cooling</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkPushover}
                    onChange={e => setNewRemarkPushover(e.target.checked)}
                    className="h-4 w-4 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Pushover</span>
                </label>
              </div>
            </div>

            {/* Parameter Tick-List */}
            <div className="rounded-lg border border-[#1a2336] bg-[#080b12] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                  Requested Lab Parameters (Tick to include on testing sheet)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
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
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-sky-500/50 bg-[#0c1828] text-sky-200 font-semibold' 
                          : 'border-[#1a2336] bg-[#0c101c] text-slate-400 hover:border-[#222e44]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-[#222e44] text-sky-500 focus:ring-0 pointer-events-none"
                      />
                      <span className="text-[11px] truncate">{param.name} {param.unit ? `(${param.unit})` : ''}</span>
                    </label>
                  );
                })}
              </div>

              {/* Temperature Test Points Selection */}
              <div className="mt-4 pt-3 border-t border-[#161d2d]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-temp-master"
                      checked={selectedParamIds.includes('param-temp') && selectedTempKeys.length === 9}
                      onChange={e => handleToggleAllTempsForNew(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="new-temp-master" className="text-xs font-semibold text-sky-400 font-mono cursor-pointer flex items-center gap-2">
                      <span>Temperature Test Points</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#162238] text-sky-300 border border-[#2a3c5a]">
                        {selectedTempKeys.length} / 9 Active
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleAllTempsForNew(true)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121927] hover:bg-[#182338] text-sky-300 border border-[#222e44] transition-colors cursor-pointer"
                    >
                      Select All 9
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllTempsForNew(false)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121927] hover:bg-[#182338] text-slate-400 border border-[#222e44] transition-colors cursor-pointer"
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
                            ? 'border-sky-500/50 bg-[#0c1828] text-sky-300 font-bold'
                            : 'border-[#1a2336] bg-[#0c101c] text-slate-400 hover:border-[#222e44]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isTicked}
                          readOnly
                          className="h-3 w-3 rounded border-[#222e44] text-sky-500 focus:ring-0 pointer-events-none"
                        />
                        <span className="text-[11px]">{temp}°C</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1a2336]">
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono font-bold text-xs uppercase px-5 py-2 rounded-lg transition-all border border-sky-400/40 shadow-md cursor-pointer active:scale-95"
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
          <div className="lg:col-span-4 rounded-xl border border-[#1a2336] bg-[#0c101c] p-3.5 shadow-2xl space-y-2.5 max-h-[850px] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#161d2d] text-[11px] font-mono text-slate-400">
              <span className="uppercase tracking-wider">REFINERY SAMPLES</span>
              <span>{filteredReports.length} in queue</span>
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
                      ? 'border-sky-500/80 bg-[#0a1828] shadow-md ring-1 ring-sky-500/50'
                      : 'border-[#1a2336] bg-[#080b12] hover:bg-[#0e1422]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{rep.lot_no}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5 font-medium flex items-center gap-1.5 font-mono">
                        <span className="truncate max-w-[140px]">{rep.product_name}</span>
                        {rep.remarks?.includes('Process Log') && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded border border-sky-500/40 bg-sky-950/60 text-sky-300">
                            AUTO
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isRejected ? (
                        <span className="text-[9px] font-mono text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-600/40 font-bold">
                          REJECT
                        </span>
                      ) : isAccepted ? (
                        <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/40 font-bold">
                          ACCEPT
                        </span>
                      ) : isConcession ? (
                        <span className="text-[9px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/40 font-bold">
                          CONCESSION
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-600/40">
                          AWAITING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-[#141b27] pt-1.5">
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
              <div className="rounded-xl border border-[#1a2336] bg-[#0c101c] p-5 sm:p-6 shadow-2xl space-y-5">
                {/* Sample Header Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#161d2d] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#2a3854] bg-[#121928] text-slate-300">
                        {selectedReport.report_no}
                      </span>
                      <h2 className="text-lg font-bold text-white font-mono">
                        {selectedReport.lot_no}
                      </h2>
                      {selectedReport.remarks?.includes('Process Log') && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-600/40 flex items-center gap-1">
                          ⚡ Auto-Dispatched ({selectedReport.time_check})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2.5">
                      <span>Product: <strong className="text-white">{selectedReport.product_name}</strong></span>
                      <span>•</span>
                      <span>Tanks: <strong className="text-slate-200">{selectedReport.feed_tank_code || 'Feed'} → {selectedReport.discharge_tank_code || 'Discharge'}</strong></span>
                      <span>•</span>
                      <span>Submitted: <strong className="text-slate-200">{selectedReport.submitted_by_name}</strong></span>
                    </div>
                  </div>

                  {/* QC Decision Action or Badge */}
                  <div className="flex items-center gap-2.5">
                    {selectedReport.decision ? (
                      <>
                        <div className="text-right">
                          <div className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border inline-block ${
                            selectedReport.decision.decision === 'reject'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              : selectedReport.decision.decision === 'accept'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          }`}>
                            DECISION: {selectedReport.decision.decision.toUpperCase()}
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
                            className="flex items-center gap-1.5 bg-[#121927] hover:bg-[#182338] text-sky-300 border border-[#222e44] px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                            title="Update or re-record QC Decision"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Update Decision</span>
                          </button>
                        )}
                      </>
                    ) : (
                      (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                        <button
                          onClick={() => setIsDecisionModalOpen(true)}
                          className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono font-bold text-xs uppercase px-3.5 py-2 rounded-lg transition-all border border-sky-400/40 shadow-md cursor-pointer active:scale-95"
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
                        className="flex items-center gap-1.5 bg-[#121927] hover:bg-[#182338] text-sky-300 border border-[#222e44] px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors shadow-sm cursor-pointer"
                        title="View & export official RF-FR-001 Certificate"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Certificate</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Rejection Alert Banner if lot was rejected */}
                {selectedReport.decision?.decision === 'reject' && (
                  <div className="rounded-lg border border-rose-800/60 bg-[#160c0f] p-3.5 font-mono">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
                      <XCircle className="h-4 w-4" />
                      <span>LOT REJECTED: {selectedReport.decision.reason_label}</span>
                    </div>
                    <p className="text-xs text-rose-200 leading-relaxed">
                      {selectedReport.decision.reason_detail}
                    </p>
                    <div className="mt-2 text-[10px] text-rose-400/90 flex items-center gap-3">
                      <span>Disposition: <strong className="uppercase underline">{selectedReport.decision.disposition}</strong></span>
                      <span>•</span>
                      <span>Decided: {selectedReport.decision.decided_at}</span>
                    </div>
                  </div>
                )}

                {/* Success alert on result saving */}
                {resultsSuccess && (
                  <div className="rounded-lg bg-emerald-950/40 p-3 text-xs text-emerald-300 border border-emerald-800/50 flex items-center gap-2 font-mono">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{resultsSuccess}</span>
                  </div>
                )}

                {/* Parameter Test Input Form */}
                <form onSubmit={handleSaveResults} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                        Lab Analysis Results Entry (RF-FR-001 Table)
                      </span>
                      <span className="rounded bg-[#080b12] px-2 py-0.5 font-mono text-[10px] text-sky-300 border border-[#1a2336]">
                        {standardResults.filter(r => requestedMap[r.id] !== false).length + (isTempAnyTicked ? 1 : 0)} / {standardResults.length + (tempResults.length > 0 ? 1 : 0)} Active
                        {isTempAnyTicked && ` · ${activeTempCount}/9 Temps`}
                      </span>
                    </div>

                    {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleApplyProductSpec}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121927] hover:bg-[#182338] text-sky-300 border border-[#222e44] transition-colors cursor-pointer"
                          title="Tick only parameters specified for this product"
                        >
                          Product Spec Only
                        </button>
                        <button
                          type="button"
                          onClick={handleTickAll}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121927] hover:bg-[#182338] text-slate-300 border border-[#222e44] transition-colors cursor-pointer"
                        >
                          Tick All
                        </button>
                        <button
                          type="button"
                          onClick={handleUntickAll}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121927] hover:bg-[#182338] text-slate-400 border border-[#222e44] transition-colors cursor-pointer"
                        >
                          Untick All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-[#1a2336] bg-[#080b12] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0b101c] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-[#1a2336]">
                        <tr>
                          <th className="py-2 px-3 text-center w-14" title="Tick to test parameter, untick if product does not require it">
                            Test (✓)
                          </th>
                          <th className="py-2 px-3">Parameter Name</th>
                          <th className="py-2 px-3 w-20">Unit</th>
                          <th className="py-2 px-3 w-56">Lab Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#141b27] font-mono text-xs">
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
                                  ? 'opacity-40 bg-[#07090e]'
                                  : 'hover:bg-[#0c121e]'
                              }`}
                            >
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  className="h-3.5 w-3.5 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer disabled:opacity-50"
                                  title={isUnticked ? "Unticked: Test not applicable" : "Ticked: Active parameter"}
                                />
                              </td>
                              <td className={`py-2 px-3 font-sans ${isUnticked ? 'text-slate-500' : 'text-slate-200'}`}>
                                {res.parameter_name}
                              </td>
                              <td className={`py-2 px-3 ${isUnticked ? 'text-slate-600' : 'text-slate-500'}`}>
                                {res.unit || '-'}
                              </td>
                              <td className="py-2 px-3">
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A - Unticked"
                                    className="w-full bg-[#07090e] border border-[#161d2d] rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed font-mono italic"
                                  />
                                ) : res.parameter_code === 'ODOUR' ? (
                                  <select
                                    disabled={!canEdit}
                                    value={inputVal.text || 'bland'}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], text: e.target.value }
                                    }))}
                                    className="w-full bg-[#0c101c] border border-[#222e44] rounded px-2 py-1 text-xs text-white disabled:opacity-50"
                                  >
                                    <option value="bland" className="bg-[#0c101c]">Bland (Normal)</option>
                                    <option value="acceptable" className="bg-[#0c101c]">Acceptable</option>
                                    <option value="off" className="bg-[#0c101c]">Off / Burnt Odour</option>
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
                                    className="w-full bg-[#0c101c] border border-[#222e44] rounded px-2 py-1 text-xs text-white focus:border-sky-500 disabled:opacity-50 font-mono"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 2. Master Temperature Row */}
                        {tempResults.length > 0 && (
                          <tr className={`border-t border-[#1a2336] transition-colors ${
                            !isTempAnyTicked
                              ? 'bg-[#07090e] opacity-60'
                              : 'bg-[#081524] hover:bg-[#0a1b2e]'
                          }`}>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isTempAllTicked}
                                onChange={e => handleToggleMasterTemp(e.target.checked)}
                                disabled={!(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin')}
                                className="h-3.5 w-3.5 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer disabled:opacity-50"
                                title={isTempAllTicked ? "Untick all 9 temperatures" : "Tick all 9 temperatures"}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-semibold font-sans ${isTempAnyTicked ? 'text-sky-300' : 'text-slate-400'}`}>
                                  Temperature
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#121927] text-sky-300 border border-[#222e44]">
                                  9 Test Points: 10, 15, 20, 25, 30, 35, 40, 45, 50°C
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-mono">
                              -
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">
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
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#121927] hover:bg-[#182338] text-sky-300 border border-[#222e44] transition-colors cursor-pointer"
                                    >
                                      All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMasterTemp(false)}
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#121927] hover:bg-[#182338] text-slate-400 border border-[#222e44] transition-colors cursor-pointer"
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
                                  ? 'opacity-40 bg-[#07090e] border-l-[#1a2336]'
                                  : 'hover:bg-[#0c121e] border-l-sky-500/60 bg-[#080d18]'
                              }`}
                            >
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  className="h-3.5 w-3.5 rounded border-[#222e44] bg-[#0c101c] text-sky-500 focus:ring-0 cursor-pointer disabled:opacity-50"
                                  title={isUnticked ? `Unticked: Temperature ${res.series_key}°C not tested` : `Ticked: Test Temperature ${res.series_key}°C`}
                                />
                              </td>
                              <td className="py-2 px-3 font-sans">
                                <div className="flex items-center gap-2 pl-3">
                                  <span className="text-sky-500 font-mono text-xs select-none">↳</span>
                                  <span className={`font-medium ${isUnticked ? 'text-slate-500' : 'text-slate-200'}`}>
                                    Temperature {res.series_key}°C
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-500 bg-[#080b12] px-1 rounded border border-[#1a2336]">
                                    Pt {res.series_key}
                                  </span>
                                </div>
                              </td>
                              <td className={`py-2 px-3 ${isUnticked ? 'text-slate-600' : 'text-slate-500'}`}>
                                {res.parameter_code === 'TEMP' ? '-' : (res.unit || '-')}
                              </td>
                              <td className="py-2 px-3">
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A - Unticked"
                                    className="w-full bg-[#07090e] border border-[#161d2d] rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed font-mono italic"
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
                                    className="w-full bg-[#0c101c] border border-[#222e44] rounded px-2 py-1 text-xs text-white focus:border-sky-500 disabled:opacity-50 font-mono"
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
                  <div className="rounded-lg border border-[#1a2336] bg-[#080b12] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161d2d] pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-sky-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                          QC OPERATING CONDITIONS & REMARKS (RF-FR-001)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Tick operating conditions & record laboratory observations
                      </span>
                    </div>

                    {/* Checkboxes: Flushing, Cooling, Push over */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        qcRemarkFlushing 
                          ? 'bg-[#161208] border-amber-500/50 text-amber-300' 
                          : 'bg-[#0c101c] border-[#1a2336] text-slate-400 hover:border-[#222e44]'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkFlushing}
                          onChange={e => setQcRemarkFlushing(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded bg-[#080b12] border-[#222e44] text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-white text-xs">Flushing</div>
                          <div className="text-[10px] text-slate-500">Sampling line flushed</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        qcRemarkCooling 
                          ? 'bg-[#081524] border-sky-500/50 text-sky-300' 
                          : 'bg-[#0c101c] border-[#1a2336] text-slate-400 hover:border-[#222e44]'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkCooling}
                          onChange={e => setQcRemarkCooling(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded bg-[#080b12] border-[#222e44] text-sky-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-white text-xs">Cooling</div>
                          <div className="text-[10px] text-slate-500">Crystallizer active cooling</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        qcRemarkPushover 
                          ? 'bg-[#150d22] border-purple-500/50 text-purple-300' 
                          : 'bg-[#0c101c] border-[#1a2336] text-slate-400 hover:border-[#222e44]'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={qcRemarkPushover}
                          onChange={e => setQcRemarkPushover(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded bg-[#080b12] border-[#222e44] text-purple-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="font-mono text-xs">
                          <div className="font-semibold text-white text-xs">Push over</div>
                          <div className="text-[10px] text-slate-500">Pushover transfer operation</div>
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
                        className="w-full bg-[#0c101c] border border-[#222e44] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 disabled:opacity-50 resize-none"
                      />
                    </div>
                  </div>

                  {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono font-bold text-xs uppercase px-5 py-2 rounded-lg transition-all border border-sky-400/40 shadow cursor-pointer active:scale-95"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Commit Lab Results</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="rounded-xl border border-[#1a2336] bg-[#0c101c] p-12 text-center text-slate-500 text-xs font-mono">
                Select a sample report from the queue on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QC Decision Modal with Electronic Signature */}
      {isDecisionModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#1a2b3c] bg-[#0a121c] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-sky-400 border-b border-[#161d2d] pb-3">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  QC Formal Decision: {selectedReport.lot_no}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedReport.product_name} · Report {selectedReport.report_no}
                </p>
              </div>
            </div>

            {decisionError && (
              <div className="rounded bg-rose-950/60 p-2.5 text-xs text-rose-300 border border-rose-800/60 font-mono">
                {decisionError}
              </div>
            )}

            <form onSubmit={handleSubmitDecision} className="space-y-4">
              {/* Decision Type Buttons */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select QC Disposition:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionType('accept')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      decisionType === 'accept'
                        ? 'bg-[#061a12] border-emerald-500 text-emerald-300 shadow-md'
                        : 'border-[#1a2336] text-slate-400 hover:bg-[#0c121e]'
                    }`}
                  >
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('accept_concession')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      decisionType === 'accept_concession'
                        ? 'bg-[#161208] border-amber-500 text-amber-300 shadow-md'
                        : 'border-[#1a2336] text-slate-400 hover:bg-[#0c121e]'
                    }`}
                  >
                    CONCESSION
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('reject')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      decisionType === 'reject'
                        ? 'bg-[#160c0f] border-rose-500 text-rose-300 shadow-md'
                        : 'border-[#1a2336] text-slate-400 hover:bg-[#0c121e]'
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
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Rejection Reason Code (Pareto categorized) *
                    </label>
                    <select
                      required
                      value={decisionReasonId}
                      onChange={e => setDecisionReasonId(e.target.value)}
                      className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white cursor-pointer"
                    >
                      <option value="" className="bg-[#0c101c]">-- Choose Reason Code --</option>
                      {reasons.map(r => (
                        <option key={r.id} value={r.id} className="bg-[#0c101c]">{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {decisionType === 'reject' && (
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Mandatory Product Disposition *
                      </label>
                      <select
                        value={decisionDisposition}
                        onChange={e => setDecisionDisposition(e.target.value as Disposition)}
                        className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-amber-300 cursor-pointer"
                      >
                        <option value="reprocess" className="bg-[#0c101c]">Reprocess (Return to Deodorizer)</option>
                        <option value="rework" className="bg-[#0c101c]">Rework (Bleaching/Pre-treatment)</option>
                        <option value="downgrade" className="bg-[#0c101c]">Downgrade to Lower Grade Product</option>
                        <option value="hold" className="bg-[#0c101c]">Quality Hold (Quarantine Tank)</option>
                        <option value="scrap" className="bg-[#0c101c]">Scrap / By-product Tank</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Reason Narrative (Audit explanation, min 10 chars) *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Detailed explanation of failure mode and analytical findings..."
                      value={decisionNarrative}
                      onChange={e => setDecisionNarrative(e.target.value)}
                      className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white resize-none"
                    />
                  </div>
                </>
              )}

              {/* Electronic Signature Password Confirmation */}
              <div className="border-t border-[#1a2336] pt-3">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Electronic Signature: Enter QC Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={decisionPassword}
                  onChange={e => setDecisionPassword(e.target.value)}
                  className="w-full bg-[#080b12] border border-[#222e44] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono font-bold text-xs uppercase px-4 py-1.5 rounded-lg transition-all border border-sky-400/40 cursor-pointer active:scale-95"
                >
                  Sign & Commit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
