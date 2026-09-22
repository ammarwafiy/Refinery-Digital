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
  ensureAutoDispatchedQC
} from '@/lib/data-service';
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
  Building2
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface SampleLabViewProps {
  currentRole?: UserRole;
  currentUser?: Profile | null;
}

export default function SampleLabView({ currentRole, currentUser }: SampleLabViewProps = {}) {
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
  const [newLotNo, setNewLotNo] = useState('');
  const [newDate, setNewDate] = useState<string>(() => getRealtimeShiftDate());
  const [newTimeCheck, setNewTimeCheck] = useState('11:30');
  const [newProductId, setNewProductId] = useState('prod-26'); // PL 65 Matsuyama
  const [newProductOther, setNewProductOther] = useState('');
  const [newFeedTankId, setNewFeedTankId] = useState('tank-01');
  const [newDischargeTankId, setNewDischargeTankId] = useState('tank-04');
  const [newCrystallizerNo, setNewCrystallizerNo] = useState('CR-04');
  const [newBatchNo, setNewBatchNo] = useState('B260904');
  const [newSamplingPointId, setNewSamplingPointId] = useState('sp-01');
  const [newRemarkFlushing, setNewRemarkFlushing] = useState(false);
  const [newRemarkCooling, setNewRemarkCooling] = useState(false);
  const [newRemarkPushover, setNewRemarkPushover] = useState(false);
  const [newRemarks, setNewRemarks] = useState('');
  const [selectedParamIds, setSelectedParamIds] = useState<string[]>([
    'param-ffa', 'param-h2o', 'param-iv', 'param-pv', 'param-col-r', 'param-col-y', 'param-odour', 'param-cloud', 'param-sfc', 'param-temp'
  ]);
  const [selectedTempKeys, setSelectedTempKeys] = useState<number[]>([10, 15, 20, 25, 30, 35, 40, 45, 50]);

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
              unit: param.unit,
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

  // Initialize result inputs and active/ticked status when selected report changes
  useEffect(() => {
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

    const res = updateSampleResults(selectedReport.id, payload);
    if (res.success) {
      setResultsSuccess('Laboratory test results & active parameters saved and validated against specification limits!');
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
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-950 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-400 border border-cyan-800/50">
                  RF-FR-001 Rev. 02
                </span>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Sample Analysis Report & Quality Control
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                44 Standard Products · Parameter Tick-List · 9-Point SFC Series · QC Disposition
              </p>
            </div>
          </div>

          {/* Sub-Tabs Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'list'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lab Queue & Reports ({reports.length})
            </button>

            <button
              onClick={() => setActiveSubTab('new')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSubTab === 'new'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-slate-700'
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
                className="w-full bg-[#090d16] border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
              <span className="text-slate-500">Filter:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'awaiting', label: 'Awaiting Results' },
                { id: 'accepted', label: 'Accepted' },
                { id: 'rejected', label: 'Rejected' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-1 rounded-lg border ${
                    filterStatus === f.id
                      ? 'bg-slate-800 border-cyan-500/40 text-cyan-400'
                      : 'border-slate-800 text-slate-500 hover:text-slate-300'
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
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4 border-b border-slate-800 pb-3 font-mono uppercase tracking-wider text-cyan-400">
            RF-FR-001 Sample Report Header & Parameter Request
          </h2>

          <form onSubmit={handleCreateSample} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Lot Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LOT-PL65-2609-04"
                  value={newLotNo}
                  onChange={e => setNewLotNo(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Sample Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Time Check</label>
                <input
                  type="time"
                  value={newTimeCheck}
                  onChange={e => setNewTimeCheck(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Product Picker (44 Printed Products from Appendix) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2 font-mono">
                Product Selection (RF-FR-001 Form 44-Product Standard List)
              </label>
              <select
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-cyan-500"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="others">Others — Free Text Entry</option>
              </select>

              {newProductId === 'others' && (
                <div className="mt-3">
                  <label className="block text-xs text-slate-400 mb-1">Enter Custom Product Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="Specify other product name..."
                    value={newProductOther}
                    onChange={e => setNewProductOther(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Tanks & Sampling Point */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Feed Tank</label>
                <select
                  value={newFeedTankId}
                  onChange={e => setNewFeedTankId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                >
                  {tanks.filter(t => t.kind === 'feed' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id}>{t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Discharge Tank</label>
                <select
                  value={newDischargeTankId}
                  onChange={e => setNewDischargeTankId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                >
                  {tanks.filter(t => t.kind === 'discharge' || t.kind === 'both').map(t => (
                    <option key={t.id} value={t.id}>{t.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Crystallizer / Batch No</label>
                <input
                  type="text"
                  placeholder="CR-04 / B260904"
                  value={newBatchNo}
                  onChange={e => setNewBatchNo(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Sampling Point</label>
                <select
                  value={newSamplingPointId}
                  onChange={e => setNewSamplingPointId(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {samplingPoints.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printed Remarks Checkboxes */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 font-mono">
                Printed Remarks Tick-List
              </label>
              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkFlushing}
                    onChange={e => setNewRemarkFlushing(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Flushing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkCooling}
                    onChange={e => setNewRemarkCooling(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Cooling</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRemarkPushover}
                    onChange={e => setNewRemarkPushover(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Pushover</span>
                </label>
              </div>
            </div>

            {/* Parameter Tick-List (Tick required parameters for lab testing) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                  Requested Lab Parameters (Tick to include on testing sheet)
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedParamIds.length} parameters selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
                {parameters.filter(p => p.code !== 'TEMP').map(param => {
                  const isChecked = selectedParamIds.includes(param.id);
                  return (
                    <label
                      key={param.id}
                      onClick={() => toggleParam(param.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-cyan-500/50 bg-cyan-950/30 text-white font-medium' 
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span>{param.name} {param.unit ? `(${param.unit})` : ''}</span>
                    </label>
                  );
                })}
              </div>

              {/* Dedicated Temperature Test Points Selection (10, 15, 20, 25, 30, 35, 40, 45, 50°C) */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-temp-master"
                      checked={selectedParamIds.includes('param-temp') && selectedTempKeys.length === 9}
                      onChange={e => handleToggleAllTempsForNew(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                    />
                    <label htmlFor="new-temp-master" className="text-xs font-semibold text-cyan-400 font-mono cursor-pointer flex items-center gap-2">
                      <span>Temperature Test Points</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {selectedTempKeys.length} / 9 Active
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleAllTempsForNew(true)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                    >
                      Select All 9
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllTempsForNew(false)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors"
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
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                          isTicked
                            ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 font-bold shadow-sm shadow-cyan-950/50'
                            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isTicked}
                          readOnly
                          className="h-3.5 w-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 pointer-events-none"
                        />
                        <span>{temp}°C</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-6 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-cyan-950/60 font-mono"
              >
                <Save className="h-4 w-4" />
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
          <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-[#0f172a] p-4 shadow-xl space-y-3 max-h-[850px] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono text-slate-400">
              <span>REFINERY SAMPLES</span>
              <span>{filteredReports.length} found</span>
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
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-cyan-500/60 bg-cyan-950/30 shadow-md ring-1 ring-cyan-500/40'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{rep.lot_no}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 font-medium flex items-center gap-1.5">
                        <span>{rep.product_name}</span>
                        {rep.remarks?.includes('Process Log') && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                            Auto Log
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isRejected ? (
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-600/40 font-bold">
                          REJECT
                        </span>
                      ) : isAccepted ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/40 font-bold">
                          ACCEPT
                        </span>
                      ) : isConcession ? (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40 font-bold">
                          CONCESSION
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-600/40">
                          AWAITING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/60 pt-2">
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
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-xl space-y-6">
                {/* Sample Header Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {selectedReport.report_no}
                      </span>
                      <h2 className="text-xl font-bold text-white font-mono">
                        {selectedReport.lot_no}
                      </h2>
                      {selectedReport.remarks?.includes('Process Log') && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-700/50 flex items-center gap-1">
                          ⚡ Auto-Dispatched from Process Log ({selectedReport.time_check})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>Product: <strong className="text-white">{selectedReport.product_name}</strong></span>
                      <span>•</span>
                      <span>Tanks: <strong className="text-slate-200">{selectedReport.feed_tank_code || 'Feed'} → {selectedReport.discharge_tank_code || 'Discharge'}</strong></span>
                      <span>•</span>
                      <span>Submitted by: <strong className="text-slate-200">{selectedReport.submitted_by_name}</strong></span>
                    </div>
                  </div>

                  {/* QC Decision Action or Badge */}
                  <div className="flex items-center gap-3">
                    {selectedReport.decision ? (
                      <>
                        <div className="text-right">
                          <div className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border inline-block ${
                            selectedReport.decision.decision === 'reject'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              : selectedReport.decision.decision === 'accept'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          }`}>
                            DECISION: {selectedReport.decision.decision.toUpperCase()}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
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
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono transition-colors"
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
                          className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-lg font-mono"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Record QC Decision</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Rejection Alert Banner if lot was rejected */}
                {selectedReport.decision?.decision === 'reject' && (
                  <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm font-mono mb-1">
                      <XCircle className="h-4 w-4" />
                      <span>LOT REJECTED: {selectedReport.decision.reason_label}</span>
                    </div>
                    <p className="text-xs text-rose-200 leading-relaxed">
                      {selectedReport.decision.reason_detail}
                    </p>
                    <div className="mt-2 text-xs font-mono text-rose-400/90 flex items-center gap-4">
                      <span>Mandatory Disposition: <strong className="uppercase underline">{selectedReport.decision.disposition}</strong></span>
                      <span>•</span>
                      <span>Decided at: {selectedReport.decision.decided_at}</span>
                    </div>
                  </div>
                )}

                {/* Success alert on result saving */}
                {resultsSuccess && (
                  <div className="rounded-xl bg-emerald-950/60 p-3 text-xs text-emerald-300 border border-emerald-800/60 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{resultsSuccess}</span>
                  </div>
                )}

                {/* Parameter Test Input Form */}
                <form onSubmit={handleSaveResults} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                        Lab Analysis Results Entry (RF-FR-001 Parameter Table)
                      </span>
                      <span className="rounded bg-slate-800 px-2.5 py-0.5 font-mono text-[11px] text-cyan-300 border border-slate-700">
                        {standardResults.filter(r => requestedMap[r.id] !== false).length + (isTempAnyTicked ? 1 : 0)} / {standardResults.length + (tempResults.length > 0 ? 1 : 0)} Parameters Active
                        {isTempAnyTicked && ` · ${activeTempCount}/9 Temps Active`}
                      </span>
                    </div>

                    {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleApplyProductSpec}
                          className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                          title="Tick only parameters specified for this product"
                        >
                          Product Spec Only
                        </button>
                        <button
                          type="button"
                          onClick={handleTickAll}
                          className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        >
                          Tick All
                        </button>
                        <button
                          type="button"
                          onClick={handleUntickAll}
                          className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors"
                        >
                          Untick All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#090d16] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-14" title="Tick to test parameter, untick if product does not require it">
                            Test (✓)
                          </th>
                          <th className="py-2.5 px-3">Parameter Name</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3 w-44">Lab Result</th>
                          <th className="py-2.5 px-3 text-center">Spec Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {/* 1. Standard Laboratory Parameters (FFA to FAC C12:0, and Solid Fat Content SFC) */}
                        {standardResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');

                          return (
                            <tr
                              key={res.id}
                              className={`transition-colors ${
                                isUnticked
                                  ? 'opacity-40 bg-slate-950/40'
                                  : 'hover:bg-slate-900/30'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
                                  title={isUnticked ? "Unticked: Test not applicable for this product" : "Ticked: Active parameter"}
                                />
                              </td>
                              <td className={`py-2.5 px-3 font-sans ${isUnticked ? 'text-slate-500' : 'text-slate-200'}`}>
                                {res.parameter_name}
                              </td>
                              <td className={`py-2.5 px-3 ${isUnticked ? 'text-slate-600' : 'text-slate-500'}`}>
                                {res.unit || '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A - Unticked"
                                    className="w-full bg-slate-950/80 border border-slate-800/80 rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed font-mono italic"
                                  />
                                ) : res.parameter_code === 'ODOUR' ? (
                                  <select
                                    disabled={!canEdit}
                                    value={inputVal.text || 'bland'}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], text: e.target.value }
                                    }))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white disabled:opacity-50"
                                  >
                                    <option value="bland">Bland (Normal)</option>
                                    <option value="acceptable">Acceptable</option>
                                    <option value="off">Off / Burnt Odour</option>
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
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 disabled:opacity-50 font-mono"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isUnticked ? (
                                  <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    N/A (Unticked)
                                  </span>
                                ) : res.in_spec === true ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                                    <Check className="h-2.5 w-2.5" /> IN SPEC
                                  </span>
                                ) : res.in_spec === false ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40 font-bold">
                                    <XCircle className="h-2.5 w-2.5" /> OUT OF SPEC
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">
                                    Pending Input
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 2. Master Temperature Row (Controls all 9 points: 10, 15, 20, 25, 30, 35, 40, 45, 50°C) */}
                        {tempResults.length > 0 && (
                          <tr className={`border-t-2 border-slate-800 transition-colors ${
                            !isTempAnyTicked
                              ? 'bg-slate-950/70 opacity-60'
                              : 'bg-cyan-950/20 hover:bg-cyan-950/30'
                          }`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isTempAllTicked}
                                onChange={e => handleToggleMasterTemp(e.target.checked)}
                                disabled={!(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin')}
                                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
                                title={isTempAllTicked ? "Untick all 9 temperatures" : "Tick all 9 temperatures"}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-semibold font-sans ${isTempAnyTicked ? 'text-cyan-300' : 'text-slate-400'}`}>
                                  Temperature
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                                  9 Test Points: 10, 15, 20, 25, 30, 35, 40, 45, 50°C
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                              %
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono text-slate-400">
                                  {activeTempCount === 9
                                    ? 'All 9 Active'
                                    : activeTempCount === 0
                                    ? 'None Active (Unticked)'
                                    : `${activeTempCount} / 9 Active`}
                                </span>
                                {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMasterTemp(true)}
                                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                                    >
                                      All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMasterTemp(false)}
                                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {!isTempAnyTicked ? (
                                <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  N/A (Unticked)
                                </span>
                              ) : tempResults.some(r => requestedMap[r.id] !== false && r.in_spec === false) ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40 font-bold">
                                  <XCircle className="h-2.5 w-2.5" /> OUT OF SPEC
                                </span>
                              ) : tempResults.filter(r => requestedMap[r.id] !== false).every(r => r.in_spec === true) ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                                  <Check className="h-2.5 w-2.5" /> ALL IN SPEC
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">
                                  Pending Input
                                </span>
                              )}
                            </td>
                          </tr>
                        )}

                        {/* 3. Nine Individual Temperature Test Points: 10, 15, 20, 25, 30, 35, 40, 45, 50°C */}
                        {tempResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');

                          return (
                            <tr
                              key={res.id}
                              className={`transition-colors border-l-2 ${
                                isUnticked
                                  ? 'opacity-40 bg-slate-950/40 border-l-slate-800'
                                  : 'hover:bg-slate-900/30 border-l-cyan-500/60 bg-slate-950/20'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
                                  title={isUnticked ? `Unticked: Temperature ${res.series_key}°C not tested` : `Ticked: Test Temperature ${res.series_key}°C`}
                                />
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="flex items-center gap-2 pl-4">
                                  <span className="text-cyan-500/80 font-mono text-xs select-none">↳</span>
                                  <span className={`font-medium ${isUnticked ? 'text-slate-500' : 'text-slate-200'}`}>
                                    Temperature {res.series_key}°C
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                    Pt {res.series_key}
                                  </span>
                                </div>
                              </td>
                              <td className={`py-2.5 px-3 ${isUnticked ? 'text-slate-600' : 'text-slate-500'}`}>
                                {res.unit || '%'}
                              </td>
                              <td className="py-2.5 px-3">
                                {isUnticked ? (
                                  <input
                                    type="text"
                                    disabled
                                    value="N/A - Unticked"
                                    className="w-full bg-slate-950/80 border border-slate-800/80 rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed font-mono italic"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    step="0.1"
                                    disabled={!canEdit}
                                    placeholder={`Val @ ${res.series_key}°C`}
                                    value={inputVal.num ?? ''}
                                    onChange={e => setResultInputs(prev => ({
                                      ...prev,
                                      [res.id]: { ...prev[res.id], num: e.target.value ? Number(e.target.value) : undefined }
                                    }))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 disabled:opacity-50 font-mono"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isUnticked ? (
                                  <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    N/A (Unticked)
                                  </span>
                                ) : res.in_spec === true ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                                    <Check className="h-2.5 w-2.5" /> IN SPEC
                                  </span>
                                ) : res.in_spec === false ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40 font-bold">
                                    <XCircle className="h-2.5 w-2.5" /> OUT OF SPEC
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">
                                    Pending Input
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 py-2 rounded-xl text-xs transition-colors shadow font-mono"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save & Validate Lab Results</span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-12 text-center text-slate-500 text-xs font-mono">
                Select a sample report from the queue on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QC Decision Modal with Electronic Signature */}
      {isDecisionModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-cyan-400 border-b border-slate-800 pb-3">
              <ShieldCheck className="h-6 w-6" />
              <div>
                <h3 className="text-base font-bold text-white">
                  QC Formal Decision: {selectedReport.lot_no}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedReport.product_name} · Report {selectedReport.report_no}
                </p>
              </div>
            </div>

            {decisionError && (
              <div className="rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60">
                {decisionError}
              </div>
            )}

            <form onSubmit={handleSubmitDecision} className="space-y-4">
              {/* Decision Type Buttons */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Select QC Disposition:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionType('accept')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all ${
                      decisionType === 'accept'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-md'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('accept_concession')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all ${
                      decisionType === 'accept_concession'
                        ? 'bg-amber-950 border-amber-500 text-amber-400 shadow-md'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    CONCESSION
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('reject')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all ${
                      decisionType === 'reject'
                        ? 'bg-rose-950 border-rose-500 text-rose-400 shadow-md'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
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
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Rejection Reason Code (Pareto categorized) *
                    </label>
                    <select
                      required
                      value={decisionReasonId}
                      onChange={e => setDecisionReasonId(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="">-- Choose Reason Code --</option>
                      {reasons.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {decisionType === 'reject' && (
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">
                        Mandatory Product Disposition *
                      </label>
                      <select
                        value={decisionDisposition}
                        onChange={e => setDecisionDisposition(e.target.value as Disposition)}
                        className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-300"
                      >
                        <option value="reprocess">Reprocess (Return to Deodorizer)</option>
                        <option value="rework">Rework (Bleaching/Pre-treatment)</option>
                        <option value="downgrade">Downgrade to Lower Grade Product</option>
                        <option value="hold">Quality Hold (Quarantine Tank)</option>
                        <option value="scrap">Scrap / By-product Tank</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Reason Narrative (Audit explanation, min 10 chars) *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Detailed explanation of failure mode and analytical findings..."
                      value={decisionNarrative}
                      onChange={e => setDecisionNarrative(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </>
              )}

              {/* Electronic Signature Password Confirmation */}
              <div className="border-t border-slate-800 pt-3">
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Electronic Signature: Enter QC Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={decisionPassword}
                  onChange={e => setDecisionPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors font-mono"
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
