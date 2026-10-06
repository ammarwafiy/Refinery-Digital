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
  syncLotNumberWithProduct,
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
  const [qcProductId, setQcProductId] = useState<string>('');
  const [qcProductName, setQcProductName] = useState<string>('');
  const [qcLotNo, setQcLotNo] = useState<string>('');

  // Auto-generate next sequential Lot Number whenever Product or Date changes
  useEffect(() => {
    const auto = generateNextLotNo(newProductId, newDate, newProductOther);
    setNewLotNo(auto);
  }, [newProductId, newDate, newProductOther]);

  // Enter results state
  const [resultInputs, setResultInputs] = useState<Record<string, { num?: number; text?: string }>>({});
  const [paramNameInputs, setParamNameInputs] = useState<Record<string, string>>({});
  const [customParamRows, setCustomParamRows] = useState<{ id: string; parameter_name: string; result_text: string; requested: boolean }[]>([]);
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
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

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

  // Validation Rule: Every ticked parameter MUST have its blank box filled in before QC decision can be made
  const missingTickedParams = useMemo(() => {
    if (!selectedReport) return [];
    const missing: string[] = [];

    displayResults.forEach(r => {
      const isTicked = requestedMap[r.id] !== false;
      if (isTicked) {
        const val = resultInputs[r.id];
        const hasNum = val?.num !== null && val?.num !== undefined && !isNaN(val.num);
        const hasText = val?.text !== undefined && val?.text !== null && val.text.trim() !== '';
        if (!hasNum && !hasText) {
          missing.push(r.parameter_name);
        }
      }
    });

    customParamRows.forEach(crow => {
      if (crow.requested) {
        if (!crow.result_text || crow.result_text.trim() === '') {
          missing.push(crow.parameter_name || 'Custom Parameter');
        }
      }
    });

    return missing;
  }, [selectedReport, displayResults, requestedMap, resultInputs, customParamRows]);

  const handleOpenDecisionModal = (targetType: 'accept' | 'accept_concession' | 'reject' = 'accept') => {
    setValidationWarning(null);
    setDecisionType(targetType);
    setIsDecisionModalOpen(true);
  };

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
      setQcProductId(selectedReport.product_id || '');
      setQcProductName(selectedReport.product_name || '');
      setQcLotNo(selectedReport.lot_no || '');
      setQcRemarkFlushing(selectedReport.remark_flushing ?? false);
      setQcRemarkCooling(selectedReport.remark_cooling ?? false);
      setQcRemarkPushover(selectedReport.remark_pushover ?? false);
      setQcRemarksText(selectedReport.remarks || '');
      setQcSamplingPointId(selectedReport.sampling_point_id || '');
      const cryst = selectedReport.crystallizer_no || '';
      const batch = selectedReport.batch_no || '';
      const combined = cryst && batch ? `${cryst} / ${batch}` : (cryst || batch || '');
      setQcCrystallizerBatch(combined);
      setCustomParamRows([]);
    }
    if (displayResults.length > 0) {
      const inputs: Record<string, { num?: number; text?: string }> = {};
      const names: Record<string, string> = {};
      const reqs: Record<string, boolean> = {};

      displayResults.forEach(r => {
        inputs[r.id] = {
          num: r.value_numeric ?? undefined,
          text: r.value_text ?? (r.value_numeric !== undefined && r.value_numeric !== null ? String(r.value_numeric) : undefined),
        };
        names[r.id] = r.parameter_name || '';
        reqs[r.id] = r.requested !== false;
      });

      setResultInputs(inputs);
      setParamNameInputs(names);
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
      const paramName = res.parameter_name;
      const rawText = val.text !== undefined ? val.text : (val.num !== undefined ? String(val.num) : '');
      const numVal = isReq && rawText.trim() !== '' && !isNaN(Number(rawText)) ? Number(rawText) : (val.num ?? null);

      return {
        resultId: res.id,
        parameter_id: res.parameter_id,
        parameter_code: res.parameter_code,
        parameter_name: paramName,
        unit: null,
        series_key: res.series_key,
        value_numeric: isReq ? numVal : null,
        value_text: isReq ? (rawText.trim() !== '' ? rawText : null) : null,
        requested: isReq,
      };
    });

    // Also include any newly added custom parameter rows
    customParamRows.forEach(crow => {
      if (crow.parameter_name.trim() !== '' || crow.result_text.trim() !== '') {
        const rawText = crow.result_text.trim();
        const numVal = rawText !== '' && !isNaN(Number(rawText)) ? Number(rawText) : null;
        payload.push({
          resultId: crow.id,
          parameter_id: crow.id,
          parameter_code: 'CUSTOM',
          parameter_name: crow.parameter_name.trim() || 'Custom Parameter',
          unit: null,
          series_key: null,
          value_numeric: crow.requested ? numVal : null,
          value_text: crow.requested ? (rawText !== '' ? rawText : null) : null,
          requested: crow.requested,
        });
      }
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
      product_id: qcProductId || undefined,
      product_name: qcProductName || undefined,
      lot_no: qcLotNo || selectedReport.lot_no || undefined,
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

    // Strict Rule: Every ticked parameter MUST have its blank box filled before deciding Pass or Reject
    if (missingTickedParams.length > 0) {
      setDecisionError(
        `Wajib isi semua blank box bagi parameter yang ditick (${missingTickedParams.length} belum diisi: ${missingTickedParams.slice(0, 4).join(', ')}${missingTickedParams.length > 4 ? ` dan ${missingTickedParams.length - 4} lagi` : ''}) sebelum merekodkan keputusan.`
      );
      return;
    }

    // Auto-commit entered blank box inputs into the sample report so QC decision evaluates the live numbers
    const payload = displayResults.map(res => {
      const val = resultInputs[res.id] || {};
      const isReq = requestedMap[res.id] !== false;
      const paramName = res.parameter_name;
      const rawText = val.text !== undefined ? val.text : (val.num !== undefined ? String(val.num) : '');
      const numVal = isReq && rawText.trim() !== '' && !isNaN(Number(rawText)) ? Number(rawText) : (val.num ?? null);

      return {
        resultId: res.id,
        parameter_id: res.parameter_id,
        parameter_code: res.parameter_code,
        parameter_name: paramName,
        unit: null,
        series_key: res.series_key,
        value_numeric: isReq ? numVal : null,
        value_text: isReq ? (rawText.trim() !== '' ? rawText : null) : null,
        requested: isReq,
      };
    });

    customParamRows.forEach(crow => {
      if (crow.parameter_name.trim() !== '' || crow.result_text.trim() !== '') {
        const rawText = crow.result_text.trim();
        const numVal = rawText !== '' && !isNaN(Number(rawText)) ? Number(rawText) : null;
        payload.push({
          resultId: crow.id,
          parameter_id: crow.id,
          parameter_code: 'CUSTOM',
          parameter_name: crow.parameter_name.trim() || 'Custom Parameter',
          unit: null,
          series_key: null,
          value_numeric: crow.requested ? numVal : null,
          value_text: crow.requested ? (rawText !== '' ? rawText : null) : null,
          requested: crow.requested,
        });
      }
    });

    let crystNo = qcCrystallizerBatch.trim();
    let batchNo = '';
    if (qcCrystallizerBatch.includes('/')) {
      const parts = qcCrystallizerBatch.split('/');
      crystNo = parts[0]?.trim() || '';
      batchNo = parts.slice(1).join('/').trim();
    }

    const matchedSp = samplingPoints.find(sp => sp.id === qcSamplingPointId);

    updateSampleResults(selectedReport.id, payload, {
      remark_flushing: qcRemarkFlushing,
      remark_cooling: qcRemarkCooling,
      remark_pushover: qcRemarkPushover,
      remarks: qcRemarksText,
      sampling_point_id: qcSamplingPointId || null,
      sampling_point_name: matchedSp?.name || undefined,
      crystallizer_no: crystNo || null,
      batch_no: batchNo || (qcCrystallizerBatch.includes('/') ? null : crystNo || null),
      product_id: qcProductId || undefined,
      product_name: qcProductName || undefined,
      lot_no: qcLotNo || selectedReport.lot_no || undefined,
    });

    const updatedRep = getSampleReports().find(r => r.id === selectedReport.id) || selectedReport;
    const failedParams = updatedRep.results
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
    setValidationWarning(null);
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

  // Pre-calculate status counts for filter chips
  const countAccepted = useMemo(() => {
    return reports.filter(r => r.decision?.decision === 'accept' || r.decision?.decision === 'accept_concession').length;
  }, [reports]);

  const countRejected = useMemo(() => {
    return reports.filter(r => r.decision?.decision === 'reject').length;
  }, [reports]);

  const countAwaiting = useMemo(() => {
    return reports.filter(r => {
      const dec = r.decision?.decision;
      return dec !== 'accept' && dec !== 'accept_concession' && dec !== 'reject';
    }).length;
  }, [reports]);

  // Filtered reports list strictly aligned with QC decision status
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q ||
                          (r.lot_no || '').toLowerCase().includes(q) ||
                          (r.product_name || '').toLowerCase().includes(q) ||
                          (r.report_no || '').toLowerCase().includes(q);
      if (!matchSearch) return false;

      const dec = r.decision?.decision;
      const isAccepted = dec === 'accept' || dec === 'accept_concession';
      const isRejected = dec === 'reject';
      const isAwaiting = !isAccepted && !isRejected;

      if (filterStatus === 'awaiting') return isAwaiting;
      if (filterStatus === 'accepted') return isAccepted;
      if (filterStatus === 'rejected') return isRejected;
      return true;
    });
  }, [reports, searchQuery, filterStatus]);

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
                  { id: 'all', label: `All (${reports.length})` },
                  { id: 'awaiting', label: `Awaiting (${countAwaiting})` },
                  { id: 'accepted', label: `Accepted (${countAccepted})` },
                  { id: 'rejected', label: `Rejected (${countRejected})` },
                ].map(f => (
                  <button
                    key={f.id}
                    className="seg"
                    aria-pressed={filterStatus === f.id}
                    type="button"
                    onClick={() => {
                      setFilterStatus(f.id);
                      const q = searchQuery.trim().toLowerCase();
                      const matching = reports.filter(r => {
                        const matchSearch = !q ||
                                            (r.lot_no || '').toLowerCase().includes(q) ||
                                            (r.product_name || '').toLowerCase().includes(q) ||
                                            (r.report_no || '').toLowerCase().includes(q);
                        if (!matchSearch) return false;
                        const dec = r.decision?.decision;
                        const isAcc = dec === 'accept' || dec === 'accept_concession';
                        const isRej = dec === 'reject';
                        const isAw = !isAcc && !isRej;
                        if (f.id === 'awaiting') return isAw;
                        if (f.id === 'accepted') return isAcc;
                        if (f.id === 'rejected') return isRej;
                        return true;
                      });
                      if (matching.length > 0 && !matching.some(m => m.id === selectedReportId)) {
                        setSelectedReportId(matching[0].id);
                      }
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {filteredReports.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  No sample lots found for {filterStatus !== 'all' ? `status "${filterStatus}"` : 'your search'}.
                </div>
              ) : (
                filteredReports.map(rep => {
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
                })
              )}
            </div>
          </section>

          {/* Right Column: Active Sample Lab Result Input & QC Decision */}
          <div style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
            {selectedReport ? (
              <section className="panel" style={{ margin: 0, minWidth: 0 }}>
                {/* Sample Header Summary */}
                <div 
                  className="rh"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'nowrap',
                    padding: '16px 20px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {qcLotNo || selectedReport.lot_no}
                      </h2>
                      <span className="hint" style={{ fontSize: '11px', flexShrink: 0 }}>({selectedReport.report_no})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      <span>Product: <strong style={{ color: 'var(--text)' }}>{qcProductName || selectedReport.product_name}</strong></span>
                      <span>•</span>
                      <span>Batch: <strong style={{ color: 'var(--text)' }}>{selectedReport.crystallizer_no || selectedReport.batch_no || 'CR-04'}</strong></span>
                      <span>•</span>
                      <span>Submitted: <strong>{selectedReport.submitted_by_name}</strong></span>
                    </div>
                  </div>

                  {/* Actions & Decision */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {selectedReport.decision?.decision ? (
                      <>
                        <span className={`bd ${selectedReport.decision.decision === 'reject' ? 'r' : selectedReport.decision.decision === 'accept' ? 'g' : 'a'}`}>
                          QC: {String(selectedReport.decision.decision).toUpperCase()}
                        </span>

                        {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionModal(selectedReport.decision?.decision || 'accept')}
                            className="ghost"
                            style={{ whiteSpace: 'nowrap' }}
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
                            onClick={() => handleOpenDecisionModal('accept')}
                            className="primary font-semibold"
                            style={{ whiteSpace: 'nowrap' }}
                            title="Buka borang keputusan QC (Accept / Concession / Reject)"
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
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Certificate
                      </button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setReportToDelete(selectedReport)}
                        className="ghost dng"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Validation Warning Alert Banner if blank boxes are missing */}
                {validationWarning && (
                  <div style={{ margin: '14px 20px 0', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>⚠️ Perhatian:</span>
                      <span>{validationWarning}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setValidationWarning(null)} 
                      className="ghost"
                      style={{ height: '24px', width: '24px', padding: 0, fontSize: '13px', color: '#f87171' }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Product, Lot Number, Sampling Point & Batch row (Balanced 2x2 Card Grid - Never Overflows) */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    {/* 1. Product Selection */}
                    <div className="fld" style={{ margin: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Product (QC Selection):</span>
                        <span style={{ fontSize: '10px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 500 }}>
                          Boleh ubah jika silap key-in
                        </span>
                      </label>
                      <select
                        value={qcProductId}
                        disabled={!canEdit}
                        onChange={e => {
                          const val = e.target.value;
                          setQcProductId(val);
                          const matched = products.find(p => p.id === val || p.code === val);
                          const newName = matched?.name || val;
                          setQcProductName(newName);

                          // Auto-sync Lot Number immediately with newly selected product
                          const syncedLot = syncLotNumberWithProduct(
                            qcLotNo || selectedReport?.lot_no,
                            val,
                            selectedReport?.sample_date,
                            selectedReport?.time_check
                          );
                          setQcLotNo(syncedLot);

                          if (selectedReport) {
                            selectedReport.product_id = val;
                            selectedReport.product_name = newName;
                            selectedReport.lot_no = syncedLot;
                            setReports(prev => prev.map(r => r.id === selectedReport.id ? { 
                              ...r, 
                              product_id: val, 
                              product_name: newName, 
                              lot_no: syncedLot 
                            } : r));
                          }
                        }}
                        className="inp"
                        style={{ width: '100%', fontWeight: 600, height: '38px' }}
                      >
                        <option value="">-- Pilih Produk Lain --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Lot Number */}
                    <div className="fld" style={{ margin: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Lot Number:</span>
                        <span style={{ fontSize: '10px', color: '#009fe3', background: 'rgba(0, 159, 227, 0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 159, 227, 0.25)', fontWeight: 500 }}>
                          ✓ Auto-sync produk
                        </span>
                      </label>
                      <input
                        type="text"
                        value={qcLotNo || selectedReport.lot_no || ''}
                        disabled={!canEdit}
                        onChange={e => {
                          const val = e.target.value;
                          setQcLotNo(val);
                          if (selectedReport) {
                            selectedReport.lot_no = val;
                            setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, lot_no: val } : r));
                          }
                        }}
                        placeholder="LOT-CODE-YYMMDD-TIME"
                        className="inp font-mono"
                        style={{ width: '100%', fontWeight: 700, height: '38px', letterSpacing: '0.02em' }}
                      />
                    </div>

                    {/* 3. Sampling Point */}
                    <div className="fld" style={{ margin: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Sampling Point (QC Selection):</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 500 }}>
                          Titik persampelan
                        </span>
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
                        className="inp"
                        style={{ width: '100%', height: '38px' }}
                      >
                        <option value="">-- Select Sampling Point --</option>
                        {samplingPoints.map(sp => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Crystallizer / Batch No */}
                    <div className="fld" style={{ margin: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Crystallizer / Batch No:</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 500 }}>
                          CR-XX / Batch
                        </span>
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
                        className="inp font-mono"
                        style={{ width: '100%', height: '38px' }}
                      />
                    </div>
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
                          onClick={() => {
                            const newId = `custom-param-${Date.now()}`;
                            setCustomParamRows(prev => [
                              ...prev,
                              { id: newId, parameter_name: '', result_text: '', requested: true }
                            ]);
                          }}
                          className="ghost"
                          style={{ height: '30px', fontSize: '12px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--blue)' }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Add Parameter</span>
                        </button>
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

                  <div className="tw" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                    <table style={{ width: '100%', minWidth: 'unset', tableLayout: 'auto' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center' }}>Test</th>
                          <th style={{ minWidth: '180px' }}>Parameter Name</th>
                          <th style={{ minWidth: '180px' }}>Lab Result [blank box]</th>
                          <th style={{ width: '64px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 1. Standard Laboratory Parameters with Blank Box Inputs */}
                        {standardResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');
                          const currentName = paramNameInputs[res.id] !== undefined ? paramNameInputs[res.id] : res.parameter_name;
                          const currentResult = inputVal.text !== undefined ? inputVal.text : (inputVal.num !== undefined ? String(inputVal.num) : '');
                          const isBlank = !isUnticked && currentResult.trim() === '';

                          return (
                            <tr key={res.id} style={{ opacity: isUnticked ? 0.45 : 1 }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={!isUnticked}
                                  onChange={e => handleToggleResultParam(res.id, e.target.checked)}
                                  disabled={!canEdit}
                                  style={{ accentColor: 'var(--red)', width: '16px', height: '16px', cursor: 'pointer' }}
                                  title="Tick/untick test parameter"
                                />
                              </td>
                              <td style={{ verticalAlign: 'middle', padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '13px', color: isUnticked ? 'var(--muted)' : 'var(--text)' }}>
                                    {res.parameter_name}
                                  </span>
                                  {res.unit && (
                                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                                      ({res.unit})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  disabled={!canEdit || isUnticked}
                                  placeholder={isUnticked ? "N/A – Unticked" : "Enter lab result..."}
                                  value={isUnticked ? "" : currentResult}
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
                                  className="inp"
                                  style={{
                                    width: '100%',
                                    minWidth: 'unset',
                                    height: '34px',
                                    color: isUnticked ? 'var(--muted)' : 'var(--text)',
                                    background: isUnticked ? 'transparent' : 'var(--surface)',
                                    borderColor: isBlank ? 'rgba(245, 158, 11, 0.45)' : undefined,
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {!isUnticked && currentResult.trim() !== '' ? (
                                  <span title="Result recorded" style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                                ) : !isUnticked ? (
                                  <span title="Wajib diisi sebelum boleh membuat keputusan Pass/Reject" style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>*wajib</span>
                                ) : null}
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
                            <td colSpan={2}>
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
                          const currentName = paramNameInputs[res.id] !== undefined ? paramNameInputs[res.id] : res.parameter_name;
                          const currentResult = inputVal.text !== undefined ? inputVal.text : (inputVal.num !== undefined ? String(inputVal.num) : '');
                          const isBlank = !isUnticked && currentResult.trim() === '';

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
                              <td style={{ paddingLeft: '28px', verticalAlign: 'middle', padding: '8px 12px 8px 28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 500, fontSize: '12px', color: isUnticked ? 'var(--muted)' : 'var(--text)' }}>
                                    {res.parameter_name}
                                  </span>
                                  {res.unit && (
                                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                                      ({res.unit})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  disabled={!canEdit || isUnticked}
                                  placeholder={isUnticked ? "N/A – Unticked" : "Enter lab result..."}
                                  value={isUnticked ? "" : currentResult}
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
                                  className="inp"
                                  style={{
                                    width: '100%',
                                    minWidth: 'unset',
                                    height: '34px',
                                    color: isUnticked ? 'var(--muted)' : 'var(--text)',
                                    background: isUnticked ? 'transparent' : 'var(--surface)',
                                    borderColor: isBlank ? 'rgba(245, 158, 11, 0.45)' : undefined,
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {!isUnticked && currentResult.trim() !== '' ? (
                                  <span title="Result recorded" style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                                ) : !isUnticked ? (
                                  <span title="Wajib diisi sebelum boleh membuat keputusan Pass/Reject" style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>*wajib</span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 4. Custom Parameter Rows Added by QC Analyst */}
                        {customParamRows.map((crow) => (
                          <tr key={crow.id} style={{ background: 'rgba(0, 159, 227, 0.04)' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={crow.requested}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setCustomParamRows(prev => prev.map(r => r.id === crow.id ? { ...r, requested: checked } : r));
                                }}
                                disabled={!canEdit}
                                style={{ accentColor: 'var(--red)', width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                disabled={!canEdit}
                                placeholder="Nama Parameter Baru..."
                                value={crow.parameter_name}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCustomParamRows(prev => prev.map(r => r.id === crow.id ? { ...r, parameter_name: val } : r));
                                }}
                                className="inp"
                                style={{ width: '100%', height: '34px', fontWeight: 500, minWidth: 'unset' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                disabled={!canEdit || !crow.requested}
                                placeholder="Lab Result [blank box]..."
                                value={crow.result_text}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCustomParamRows(prev => prev.map(r => r.id === crow.id ? { ...r, result_text: val } : r));
                                }}
                                className="inp"
                                style={{ 
                                  width: '100%', 
                                  height: '34px', 
                                  minWidth: 'unset',
                                  borderColor: crow.requested && (!crow.result_text || crow.result_text.trim() === '') ? 'rgba(245, 158, 11, 0.45)' : undefined,
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {crow.requested && (!crow.result_text || crow.result_text.trim() === '') && (
                                <span title="Wajib diisi" style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 600, marginRight: '4px' }}>*wajib</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setCustomParamRows(prev => prev.filter(r => r.id !== crow.id))}
                                className="ghost dng"
                                style={{ height: '28px', width: '28px', padding: 0, fontSize: '14px' }}
                                title="Hapus baris parameter ini"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-alert-overlay-in"
          onClick={() => setIsDecisionModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-lg rounded-2xl bg-[#0F1524] border border-[#1F2E43] shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-6 overflow-hidden animate-alert-content-in"
            style={{ margin: 0 }}
          >
            {/* Top accent beam */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-[#009FE3] to-amber-500 opacity-80" />
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

            {missingTickedParams.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '10px', color: '#f87171', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️ Perhatian: Nilai Blank Box Belum Lengkap ({missingTickedParams.length} parameter)</span>
                </div>
                <p style={{ margin: 0, lineHeight: 1.4 }}>
                  Parameter berikut ditick tetapi blank box masih kosong: <strong>{missingTickedParams.slice(0, 4).join(', ')}{missingTickedParams.length > 4 ? ` dan ${missingTickedParams.length - 4} lagi` : ''}</strong>. Anda wajib mengisi nilai di borang parameter makmal terlebih dahulu sebelum boleh membuat keputusan Pass atau Reject.
                </p>
              </div>
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

              {missingTickedParams.length > 0 && (
                <div style={{ margin: '14px 0 0', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
                  ⚠️ Wajib isi blank box bagi {missingTickedParams.length} parameter yang ditick dahulu sebelum membuat keputusan ({missingTickedParams.slice(0, 3).join(', ')}{missingTickedParams.length > 3 ? '...' : ''}).
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="ghost transition-all duration-150 active:scale-[0.97] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={missingTickedParams.length > 0}
                  className="primary transition-all duration-150 active:scale-[0.97] hover:shadow-[0_0_15px_rgba(0,159,227,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-alert-overlay-in"
          onClick={() => {
            setReportToDelete(null);
            setDeleteError(null);
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-lg rounded-2xl bg-[#0F1524] border border-[#1F2E43] shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-6 overflow-hidden animate-alert-content-in"
            style={{ margin: 0 }}
          >
            {/* Top red accent beam */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 opacity-90" />
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
                  className="ghost transition-all duration-150 active:scale-[0.97] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="primary transition-all duration-150 active:scale-[0.97] hover:shadow-[0_0_15px_rgba(216,31,44,0.4)] cursor-pointer"
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
