'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { ModernButton } from './ModernButton';
import GliderTabs from './GliderTabs';
import ProductOptionSelector from './ProductOptionSelector';
import SearchableSelect from './SearchableSelect';
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
  AlertTriangle,
  Clock,
  Thermometer,
  Layers,
  Sliders,
  Check,
  ChevronRight,
  X,
  AlertCircle,
  MapPin,
  Box,
  User,
  Filter
} from 'lucide-react';

interface SampleLabViewProps {
  currentRole?: UserRole;
  currentUser?: Profile | null;
  onNavigateToCertificate?: (reportId: string) => void;
}

export default function SampleLabView({ currentRole, currentUser, onNavigateToCertificate }: SampleLabViewProps = {}) {
  const [reports, setReports] = useState<SampleReport[]>(() => {
    try {
      return getSampleReports();
    } catch {
      return [];
    }
  });
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [tanks, setTanks] = useState<Tank[]>(() => getTanks());
  const [samplingPoints, setSamplingPoints] = useState<SamplingPoint[]>(() => getSamplingPoints());
  const [parameters, setParameters] = useState<Parameter[]>(() => getParameters());
  const [reasons, setReasons] = useState<RejectionReason[]>(() => getRejectionReasons());
  const [role, setRole] = useState<UserRole>(() => currentRole || currentUser?.role || getCurrentRole() || 'qc_analyst');
  const canEdit = role === 'qc_analyst' || role === 'qc_manager' || role === 'admin';

  // Active sub-tab: 'list' | 'new' | 'detail'
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(() => {
    try {
      const list = getSampleReports();
      return list.length > 0 ? list[0].id : null;
    } catch {
      return null;
    }
  });

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
  const [resultsError, setResultsError] = useState<string | null>(null);

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isDecisionModalOpen || reportToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDecisionModalOpen, reportToDelete]);

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
      setProducts(getProducts());
    };

    window.addEventListener('refinery_reports_updated', handleUpdate);
    window.addEventListener('refinery_sheet_updated', handleUpdate);
    window.addEventListener('refinery_products_synced', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refinery_reports_updated', handleUpdate);
      window.removeEventListener('refinery_sheet_updated', handleUpdate);
      window.removeEventListener('refinery_products_synced', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const refreshReports = () => {
    try {
      syncAllProcessEntriesToQC();
      const list = getSampleReports();
      setReports(list);
      setSelectedReportId(prev => {
        if (prev && list.some(r => r.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (e) {
      console.warn('[SampleLabView] Failed to refresh reports:', e);
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

  // Validation Rule: Every parameter MUST be ticked before QC commit
  const untickedParams = useMemo(() => {
    if (!selectedReport) return [];
    return displayResults.filter(r => requestedMap[r.id] === false);
  }, [selectedReport, displayResults, requestedMap]);

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
    setResultsError(null);

    // Rule: QC must tick all test boxes AND fill all result boxes before committing
    if (untickedParams.length > 0 && missingTickedParams.length > 0) {
      setResultsError(
        `All laboratory parameters must be ticked (${untickedParams.length} remaining) and all test results filled (${missingTickedParams.length} empty) before committing lab results!`
      );
      return;
    }

    if (untickedParams.length > 0) {
      setResultsError(
        `There are ${untickedParams.length} laboratory parameters unticked (${untickedParams.slice(0, 3).map(p => p.parameter_name).join(', ')}${untickedParams.length > 3 ? '...' : ''}). Please tick all test checkboxes or click 'Tick All' before committing.`
      );
      return;
    }

    if (missingTickedParams.length > 0) {
      setResultsError(
        `There are ${missingTickedParams.length} ticked parameters with empty result values: ${missingTickedParams.slice(0, 3).join(', ')}${missingTickedParams.length > 3 ? '...' : ''}. Please complete all lab measurements before committing.`
      );
      return;
    }

    const incompleteCustom = customParamRows.filter(r => !r.requested || !r.parameter_name.trim() || !r.result_text.trim());
    if (incompleteCustom.length > 0) {
      setResultsError('Please ensure all additional custom parameters are ticked and have valid result values entered.');
      return;
    }

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
        `All test values for checked parameters must be entered (${missingTickedParams.length} missing: ${missingTickedParams.slice(0, 4).join(', ')}${missingTickedParams.length > 4 ? ` and ${missingTickedParams.length - 4} more` : ''}) before submitting the QC decision.`
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
                          (r.report_no || '').toLowerCase().includes(q) ||
                          (r.sample_date || '').toLowerCase().includes(q) ||
                          (r.sampling_point_name || '').toLowerCase().includes(q);
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

  // Parameter completion metrics
  const completedParamsCount = useMemo(() => {
    if (!selectedReport) return 0;
    let count = 0;
    displayResults.forEach(r => {
      const isTicked = requestedMap[r.id] !== false;
      if (isTicked) {
        const val = resultInputs[r.id];
        const hasNum = val?.num !== null && val?.num !== undefined && !isNaN(val.num);
        const hasText = val?.text !== undefined && val?.text !== null && val.text.trim() !== '';
        if (hasNum || hasText) count++;
      }
    });
    customParamRows.forEach(crow => {
      if (crow.requested && crow.result_text && crow.result_text.trim() !== '') count++;
    });
    return count;
  }, [selectedReport, displayResults, requestedMap, resultInputs, customParamRows]);

  const totalActiveParamsCount = useMemo(() => {
    if (!selectedReport) return 0;
    const activeStandard = displayResults.filter(r => requestedMap[r.id] !== false).length;
    const activeCustom = customParamRows.filter(r => r.requested).length;
    return activeStandard + activeCustom;
  }, [selectedReport, displayResults, requestedMap, customParamRows]);

  return (
    <div className="space-y-4">
      {/* 1. Module Header & Sub-Navigation Command Bar */}
      <section className="panel !mb-0 p-5 bg-[var(--surface)] border border-[var(--line)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#009FE3]/20 to-sky-500/10 border border-[#009FE3]/30 flex items-center justify-center shrink-0">
              <FlaskConical className="h-5 w-5 text-[#009FE3]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
                  Quality Control &amp; Laboratory Analysis
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--muted)]">
                  RF-FR-001
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Analytical quality testing, 9-point SFC series, and formal batch release
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Metrics Chips */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono mr-2">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[var(--muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Total: <strong className="text-[var(--text)]">{reports.length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                Awaiting: <strong className="text-sky-300">{countAwaiting}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Accepted: <strong className="text-emerald-300">{countAccepted}</strong>
              </span>
              {countRejected > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Rejected: <strong className="text-rose-300">{countRejected}</strong>
                </span>
              )}
            </div>

            <GliderTabs
              items={[
                { id: 'list', label: 'Lab Queue & Results', badge: reports.length },
                { id: 'new', label: '+ Raise Sample' },
              ]}
              activeId={activeSubTab}
              onChange={(id) => setActiveSubTab(id as 'list' | 'new')}
            />
          </div>
        </div>
      </section>

      {/* Delete Success Alert Notification */}
      {deleteSuccessMessage && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 font-mono text-xs shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{deleteSuccessMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setDeleteSuccessMessage(null)} 
            className="cursor-pointer text-slate-400 hover:text-slate-200 px-1 font-bold text-sm bg-transparent border-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW A: Raise New Sample Report */}
      {activeSubTab === 'new' && (
        <section className="panel p-6 bg-[var(--surface)] border border-[var(--line)] shadow-sm">
          <div className="pb-4 border-b border-[var(--line)] mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">
                Raise New Sample Report
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Physical sample registration, operational observations, and required parameter checklist
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('list')}
              className="ghost text-xs px-3 py-1.5"
            >
              Back to Queue
            </button>
          </div>

          <form onSubmit={handleCreateSample} className="space-y-6">
            {/* Card 1: Sample Lot Identification & Timing */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block">
                1. Sample Identification &amp; Timing
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="fld !m-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[var(--text)] !m-0">Lot Number *</label>
                    <span className="text-[10px] text-sky-400 font-mono">Auto-Generated</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. LOT-PL65-2609-04"
                      value={newLotNo}
                      onChange={e => setNewLotNo(e.target.value)}
                      className="inp font-mono font-bold flex-1 h-[38px]"
                    />
                    <button
                      type="button"
                      onClick={() => setNewLotNo(generateNextLotNo(newProductId, newDate, newProductOther))}
                      className="ghost h-[38px] px-3 text-xs"
                      title="Regenerate next sequential lot number based on selected product & date"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#009FE3]" />
                      Sync
                    </button>
                  </div>
                  <p className="hint text-[11px] text-[var(--muted)] mt-1">Pattern: LOT-[PROD]-[YYMM]-[SEQ]</p>
                </div>

                <div className="fld !m-0">
                  <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">Sample Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="inp w-full h-[38px]"
                  />
                </div>

                <div className="fld !m-0">
                  <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">Time Check</label>
                  <input
                    type="time"
                    value={newTimeCheck}
                    onChange={e => setNewTimeCheck(e.target.value)}
                    className="inp w-full h-[38px]"
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div className="fld !m-0 pt-2 border-t border-[var(--line)]/50">
                <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                  Product Selection (Catalog Specification)
                </label>
                <ProductOptionSelector
                  value={newProductId}
                  onChange={val => setNewProductId(val)}
                  onProductCreated={(created) => {
                    const updated = getProducts();
                    setProducts(updated);
                    setNewProductId(created.id);
                  }}
                  options={[
                    ...products,
                    { id: 'others', name: 'Others — Free Text Entry' }
                  ]}
                />

                {newProductId === 'others' && (
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-[var(--text)] mb-1 block">Specify Custom Product Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="Specify other product name..."
                      value={newProductOther}
                      onChange={e => setNewProductOther(e.target.value)}
                      className="inp w-full h-[38px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Tank Routing & Sampling Point */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block">
                2. Routing &amp; Sampling Point
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="fld !m-0">
                  <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">Feed Tank</label>
                  <SearchableSelect
                    value={newFeedTankId}
                    onChange={val => setNewFeedTankId(val)}
                    placeholder="Select Feed Tank"
                    searchPlaceholder="Search feed tank..."
                    options={tanks.filter(t => t.kind === 'feed' || t.kind === 'both').map(t => ({
                      value: t.id,
                      label: t.code,
                      sublabel: t.kind === 'both' ? 'Feed / Discharge' : 'Feed Tank'
                    }))}
                  />
                </div>

                <div className="fld !m-0">
                  <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">Discharge Tank</label>
                  <SearchableSelect
                    value={newDischargeTankId}
                    onChange={val => setNewDischargeTankId(val)}
                    placeholder="Select Discharge Tank"
                    searchPlaceholder="Search discharge tank..."
                    options={tanks.filter(t => t.kind === 'discharge' || t.kind === 'both').map(t => ({
                      value: t.id,
                      label: t.code,
                      sublabel: t.kind === 'both' ? 'Feed / Discharge' : 'Discharge Tank'
                    }))}
                  />
                </div>

                <div className="fld !m-0">
                  <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">Crystallizer / Batch No</label>
                  <input
                    type="text"
                    placeholder="CR-04 / B260904"
                    value={newBatchNo}
                    onChange={e => setNewBatchNo(e.target.value)}
                    className="inp font-mono w-full h-[38px]"
                  />
                </div>

                <div className="fld !m-0">
                  <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">Sampling Point</label>
                  <SearchableSelect
                    value={newSamplingPointId}
                    onChange={val => setNewSamplingPointId(val)}
                    placeholder="Select Sampling Point"
                    searchPlaceholder="Search sampling point..."
                    options={samplingPoints.map(sp => ({
                      value: sp.id,
                      label: sp.name
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Printed Remarks Checklist */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block">
                3. Physical Operating Remarks
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
                  newRemarkFlushing ? 'bg-sky-500/10 border-sky-500/30 text-[var(--text)]' : 'bg-transparent border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                }`}>
                  <AnimatedCheckbox
                    checked={newRemarkFlushing}
                    onChange={checked => setNewRemarkFlushing(checked)}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--text)]">Flushing</span>
                    <span className="text-[11px] text-[var(--muted)]">Line flushed prior to draw</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
                  newRemarkCooling ? 'bg-sky-500/10 border-sky-500/30 text-[var(--text)]' : 'bg-transparent border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                }`}>
                  <AnimatedCheckbox
                    checked={newRemarkCooling}
                    onChange={checked => setNewRemarkCooling(checked)}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--text)]">Cooling</span>
                    <span className="text-[11px] text-[var(--muted)]">Crystallizer active cooling</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
                  newRemarkPushover ? 'bg-sky-500/10 border-sky-500/30 text-[var(--text)]' : 'bg-transparent border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                }`}>
                  <AnimatedCheckbox
                    checked={newRemarkPushover}
                    onChange={checked => setNewRemarkPushover(checked)}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--text)]">Pushover</span>
                    <span className="text-[11px] text-[var(--muted)]">Transfer operation active</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 4: Parameter Checklist & Temperature Series */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  4. Requested Lab Parameters ({selectedParamIds.length} Selected)
                </span>
                <span className="text-xs text-sky-400 font-mono">
                  Tick parameters to include on testing sheet
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {parameters.filter(p => p.code !== 'TEMP').map(param => {
                  const isChecked = selectedParamIds.includes(param.id);
                  return (
                    <label
                      key={param.id}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleParam(param.id);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-[#009FE3]/10 border-[#009FE3]/40 text-[var(--text)] font-medium shadow-sm' 
                          : 'bg-transparent border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                      }`}
                    >
                      <AnimatedCheckbox
                        checked={isChecked}
                        onChange={() => toggleParam(param.id)}
                      />
                      <span className="truncate">{param.name} {param.unit ? `(${param.unit})` : ''}</span>
                    </label>
                  );
                })}
              </div>

              {/* Temperature Series */}
              <div className="pt-4 border-t border-[var(--line)]/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AnimatedCheckbox
                      id="new-temp-master"
                      checked={selectedParamIds.includes('param-temp') && selectedTempKeys.length === 9}
                      onChange={checked => handleToggleAllTempsForNew(checked)}
                    />
                    <label htmlFor="new-temp-master" className="text-xs font-semibold text-[var(--text)] cursor-pointer !m-0 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                      Temperature Series ({selectedTempKeys.length} / 9 Active)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleToggleAllTempsForNew(true)} className="ghost h-7 text-xs px-2.5">Select All 9</button>
                    <button type="button" onClick={() => handleToggleAllTempsForNew(false)} className="ghost h-7 text-xs px-2.5">Deselect All</button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(temp => {
                    const isTicked = selectedTempKeys.includes(temp);
                    return (
                      <button
                        key={temp}
                        type="button"
                        onClick={() => toggleTempKey(temp)}
                        className={`h-8 rounded-lg text-xs font-mono font-semibold transition-all border ${
                          isTicked
                            ? 'bg-[#009FE3]/20 border-[#009FE3]/50 text-sky-300 shadow-sm'
                            : 'bg-transparent border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                        }`}
                        aria-pressed={isTicked}
                      >
                        {temp}°C
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="ghost px-4 h-10 text-sm"
              >
                Cancel
              </button>
              <ModernButton
                type="submit"
                variant="primary"
                size="md"
              >
                Submit Sample to Lab Queue
              </ModernButton>
            </div>
          </form>
        </section>
      )}

      {/* VIEW B & C: Master-Detail Lab & Decision View */}
      {activeSubTab !== 'new' && (
        <div className="qc !gap-4">
          {/* Left Column: Sample Reports Queue List */}
          <section className="panel !m-0 bg-[var(--surface)] border border-[var(--line)] flex flex-col h-[820px] shadow-sm">
            {/* Search & Filter Header */}
            <div className="p-3.5 border-b border-[var(--line)] bg-[var(--raised)]/30 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
                <input
                  className="inp w-full pl-9 h-9 text-xs"
                  type="search"
                  placeholder="Search lot, product, report no..."
                  aria-label="Search samples"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full flex justify-center">
                <GliderTabs
                  size="sm"
                  items={[
                    { id: 'all', label: 'All', badge: reports.length },
                    { id: 'awaiting', label: 'Awaiting', badge: countAwaiting },
                    { id: 'accepted', label: 'Accepted', badge: countAccepted },
                    { id: 'rejected', label: 'Rejected', badge: countRejected },
                  ]}
                  activeId={filterStatus}
                  onChange={(newStatus) => {
                    setFilterStatus(newStatus);
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
                      if (newStatus === 'awaiting') return isAw;
                      if (newStatus === 'accepted') return isAcc;
                      if (newStatus === 'rejected') return isRej;
                      return true;
                    });
                    if (matching.length > 0 && !matching.some(m => m.id === selectedReportId)) {
                      setSelectedReportId(matching[0].id);
                    }
                  }}
                />
              </div>
            </div>

            {/* Lots List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
              {filteredReports.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-[var(--muted)]">
                  No sample lots found for {filterStatus !== 'all' ? `status "${filterStatus}"` : 'your search'}.
                </div>
              ) : (
                filteredReports.map(rep => {
                  const isSelected = selectedReport?.id === rep.id;
                  const isRejected = rep.decision?.decision === 'reject';
                  const isAccepted = rep.decision?.decision === 'accept';
                  const isConcession = rep.decision?.decision === 'accept_concession';
                  const isAwaiting = !isAccepted && !isRejected && !isConcession;

                  return (
                    <button
                      key={rep.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedReportId(rep.id);
                        setActiveSubTab('detail');
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col gap-1.5 ${
                        isSelected 
                          ? 'bg-[#009FE3]/12 border-[#009FE3]/50 shadow-[0_0_16px_rgba(0,159,227,0.12)] ring-1 ring-[#009FE3]/30' 
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-[var(--line)] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs tracking-tight text-[var(--text)] truncate">
                          {rep.lot_no}
                        </span>
                        {isAccepted && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            Accepted
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                            Rejected
                          </span>
                        )}
                        {isConcession && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                            Concession
                          </span>
                        )}
                        {isAwaiting && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                            Awaiting
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                        <span className="truncate max-w-[180px] text-[11px] font-medium text-[var(--text)]/80">
                          {rep.product_name}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                          <Clock className="w-2.5 h-2.5 opacity-60" />
                          {rep.sample_date.slice(5)} {rep.time_check}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Active Sample Lab Sheet & QC Decision */}
          <div className="min-w-0 w-full max-w-full">
            {selectedReport ? (
              <section className="panel !m-0 bg-[var(--surface)] border border-[var(--line)] shadow-sm flex flex-col">
                {/* Sample Header Ribbon */}
                <div className="p-4 sm:p-5 border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-20 backdrop-blur-md">
                  <div className="flex flex-col gap-3">
                    {/* Top Row: Lot Title, Badges & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Lot Title & Identity Badges */}
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight text-[var(--text)] whitespace-nowrap">
                          {qcLotNo || selectedReport.lot_no}
                        </h2>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[var(--muted)] whitespace-nowrap">
                          {selectedReport.report_no}
                        </span>
                        {selectedReport.decision?.decision ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                            selectedReport.decision.decision === 'reject' 
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                              : selectedReport.decision.decision === 'accept'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              selectedReport.decision.decision === 'reject' ? 'bg-rose-400' : selectedReport.decision.decision === 'accept' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`} />
                            QC: {String(selectedReport.decision.decision).toUpperCase()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                            Awaiting QC Decision
                          </span>
                        )}
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
                        {selectedReport.decision?.decision ? (
                          (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                            <ModernButton
                              type="button"
                              onClick={() => handleOpenDecisionModal(selectedReport.decision?.decision || 'accept')}
                              variant="primary"
                              size="sm"
                              className="h-9"
                            >
                              Update Decision
                            </ModernButton>
                          )
                        ) : (
                          (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                            <ModernButton
                              type="button"
                              onClick={() => handleOpenDecisionModal('accept')}
                              variant="primary"
                              size="md"
                              title="Open QC Decision Form (Accept / Concession / Reject)"
                              className="h-9"
                            >
                              Record Decision
                            </ModernButton>
                          )
                        )}

                        {onNavigateToCertificate && (
                          <button
                            type="button"
                            onClick={() => onNavigateToCertificate(selectedReport.id)}
                            className="ghost h-9 text-xs px-3.5 flex items-center gap-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--raised)] text-[var(--text)] transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5 opacity-80" />
                            <span>Certificate</span>
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setReportToDelete(selectedReport)}
                            className="ghost dng h-9 text-xs px-3.5 flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Metadata Ribbon (Product, Batch, Submitter) */}
                    <div className="flex items-center gap-2.5 text-xs text-[var(--muted)] flex-wrap pt-2.5 border-t border-[var(--line)]/50">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 whitespace-nowrap">
                        <FlaskConical className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-[var(--muted)]">Product:</span>
                        <span className="font-semibold text-[var(--text)]">{qcProductName || selectedReport.product_name}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 whitespace-nowrap">
                        <Box className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-[var(--muted)]">Batch:</span>
                        <span className="font-semibold text-[var(--text)]">{selectedReport.crystallizer_no || selectedReport.batch_no || 'CR-04'}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 whitespace-nowrap">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[var(--muted)]">Submitted:</span>
                        <span className="font-medium text-[var(--text)]">{selectedReport.submitted_by_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Warning Alert Banner if blank boxes are missing */}
                {validationWarning && (
                  <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{validationWarning}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setValidationWarning(null)} 
                      className="ghost h-6 w-6 p-0 text-xs text-rose-400 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Sample Specifications & Routing Card */}
                <div className="p-4 border-b border-[var(--line)]">
                  <div className="bg-white/[0.02] border border-[var(--line)] rounded-xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Sample Specifications &amp; Routing
                      </span>
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        Editable by QC Analyst
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* 1. Product Selection */}
                      <div className="fld !m-0">
                        <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                          Product Specification
                        </label>
                        <ProductOptionSelector
                          value={qcProductId || selectedReport?.product_id || ''}
                          disabled={!canEdit}
                          options={products}
                          onProductCreated={(created) => {
                            const updated = getProducts();
                            setProducts(updated);
                            setQcProductId(created.id);
                            setQcProductName(created.name);
                          }}
                          onChange={val => {
                            setQcProductId(val);
                            const matched = products.find(p => p.id === val || p.code === val);
                            const newName = matched?.name || val;
                            setQcProductName(newName);

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
                        />
                      </div>

                      {/* 2. Lot Number */}
                      <div className="fld !m-0">
                        <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                          Lot Number (Auto-Synced)
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
                          className="inp font-mono w-full font-bold h-[38px] tracking-wide"
                        />
                      </div>

                      {/* 3. Sampling Point */}
                      <div className="fld !m-0">
                        <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                          Sampling Point
                        </label>
                        <SearchableSelect
                          value={qcSamplingPointId}
                          disabled={!canEdit}
                          placeholder="-- Select Sampling Point --"
                          searchPlaceholder="Search sampling point..."
                          onChange={val => {
                            setQcSamplingPointId(val);
                            const matched = samplingPoints.find(sp => sp.id === val);
                            if (selectedReport) {
                              selectedReport.sampling_point_id = val;
                              selectedReport.sampling_point_name = matched?.name || '';
                            }
                          }}
                          options={samplingPoints.map(sp => ({
                            value: sp.id,
                            label: sp.name
                          }))}
                        />
                      </div>

                      {/* 4. Crystallizer / Batch No */}
                      <div className="fld !m-0">
                        <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                          Crystallizer / Batch No
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
                          className="inp font-mono w-full h-[38px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejection Alert Banner if lot was rejected */}
                {selectedReport.decision?.decision === 'reject' && (
                  <div className="mx-4 mt-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                      <span className="bd r">REJECTED</span>
                      <span>{selectedReport.decision.reason_label}</span>
                    </div>
                    <p className="text-xs text-[var(--text)] leading-relaxed">
                      {selectedReport.decision.reason_detail}
                    </p>
                    <div className="text-[11px] text-[var(--muted)]">
                      Disposition: <strong className="text-rose-400 uppercase">{selectedReport.decision.disposition}</strong> · Decided: {selectedReport.decision.decided_at}
                    </div>
                  </div>
                )}

                {/* Success alert on result saving */}
                {resultsSuccess && (
                  <div className="mx-4 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                    {resultsSuccess}
                  </div>
                )}

                {/* Validation error alert on result committing */}
                {resultsError && (
                  <div className="mx-4 mt-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Mandatory QC Requirement: Complete All Parameter Boxes</span>
                      </div>
                      {untickedParams.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleTickAll();
                            setResultsError(null);
                          }}
                          className="ghost h-6 text-[11px] px-2.5 text-sky-400 border-sky-500/30 bg-sky-500/10"
                        >
                          ✓ Tick All Parameters
                        </button>
                      )}
                    </div>
                    <p className="leading-relaxed text-[var(--text)] opacity-90 m-0">
                      {resultsError}
                    </p>
                  </div>
                )}

                {/* Parameter Test Input Form */}
                <form onSubmit={handleSaveResults} className="flex flex-col">
                  {/* Table Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--raised)]/30">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-xs text-[var(--text)] uppercase tracking-wider">
                        Laboratory Analytical Parameters
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--muted)]">
                        {completedParamsCount} / {totalActiveParamsCount} Done
                      </span>
                    </div>

                    {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const newId = `custom-param-${Date.now()}`;
                            setCustomParamRows(prev => [
                              ...prev,
                              { id: newId, parameter_name: '', result_text: '', requested: true }
                            ]);
                          }}
                          className="ghost h-7 text-xs px-2.5 text-sky-400 border-sky-500/30 hover:bg-sky-500/10 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Parameter</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyProductSpec}
                          className="ghost h-7 text-xs px-2.5 flex items-center gap-1"
                          title="Tick only parameters defined in product specification"
                        >
                          <Sliders className="h-3 w-3 opacity-70" />
                          <span>Product Spec</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTickAll}
                          className="ghost h-7 text-xs px-2.5"
                        >
                          Tick All
                        </button>
                        <button
                          type="button"
                          onClick={handleUntickAll}
                          className="ghost h-7 text-xs px-2.5"
                        >
                          Untick All
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clean Parameters Table */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">
                          <th className="w-12 text-center py-2.5 px-2">Test</th>
                          <th className="py-2.5 px-4 min-w-[200px]">Parameter Name</th>
                          <th className="py-2.5 px-4 min-w-[200px]">Lab Result / Reading</th>
                          <th className="w-24 text-center py-2.5 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)]/40 text-sm">
                        {/* 1. Standard Laboratory Parameters */}
                        {standardResults.map(res => {
                          const inputVal = resultInputs[res.id] || {};
                          const isUnticked = requestedMap[res.id] === false;
                          const canEdit = (role === 'qc_analyst' || role === 'qc_manager' || role === 'admin');
                          const currentName = paramNameInputs[res.id] !== undefined ? paramNameInputs[res.id] : res.parameter_name;
                          const currentResult = inputVal.text !== undefined ? inputVal.text : (inputVal.num !== undefined ? String(inputVal.num) : '');

                          return (
                            <tr key={res.id} className={`hover:bg-white/[0.015] transition-colors ${isUnticked ? 'opacity-40' : ''}`}>
                              <td className="text-center py-2 px-2 align-middle">
                                <AnimatedCheckbox
                                  checked={!isUnticked}
                                  onChange={checked => handleToggleResultParam(res.id, checked)}
                                  disabled={!canEdit}
                                  title="Tick/untick test parameter"
                                />
                              </td>
                              <td className="py-2 px-4 align-middle">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-xs ${isUnticked ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                                    {res.parameter_name}
                                  </span>
                                  {res.unit && (
                                    <span className="text-[11px] font-mono text-[var(--muted)] font-normal">
                                      ({res.unit})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-4 align-middle">
                                <input
                                  type="text"
                                  disabled={!canEdit || isUnticked}
                                  placeholder={isUnticked ? "N/A – Unticked" : "Enter lab reading..."}
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
                                  className={`inp w-full h-[34px] text-xs font-mono transition-colors ${
                                    isUnticked ? 'opacity-40 bg-transparent cursor-not-allowed' : 'bg-[var(--surface)]'
                                  }`}
                                />
                              </td>
                              <td className="text-center py-2 px-2 align-middle">
                                {!isUnticked && currentResult.trim() !== '' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <Check className="w-3 h-3" /> Recorded
                                  </span>
                                ) : !isUnticked ? (
                                  <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-medium text-slate-500">
                                    Excluded
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 2. Master Temperature Series Header Row */}
                        {tempResults.length > 0 && (
                          <tr className="bg-[#009FE3]/5 border-y border-[#009FE3]/20">
                            <td className="text-center py-2.5 px-2 align-middle">
                              <AnimatedCheckbox
                                checked={isTempAllTicked}
                                onChange={checked => handleToggleMasterTemp(checked)}
                                disabled={!(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin')}
                                title="Toggle all temperature test points"
                              />
                            </td>
                            <td className="py-2.5 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Thermometer className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="font-semibold text-xs text-[var(--text)]">
                                  Solid Fat Content (SFC) Temperature Series (10°C – 50°C)
                                </span>
                              </div>
                            </td>
                            <td colSpan={2} className="py-2.5 px-4 align-middle">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] font-mono text-[var(--muted)]">
                                  {activeTempCount === 9 ? 'All 9 Active' : activeTempCount === 0 ? 'None Active' : `${activeTempCount} of 9 Active`}
                                </span>
                                {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      type="button" 
                                      onClick={() => handleToggleMasterTemp(true)} 
                                      className="ghost h-6 text-[11px] px-2"
                                    >
                                      Select All 9
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => handleToggleMasterTemp(false)} 
                                      className="ghost h-6 text-[11px] px-2"
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
                          const currentName = paramNameInputs[res.id] !== undefined ? paramNameInputs[res.id] : res.parameter_name;
                          const currentResult = inputVal.text !== undefined ? inputVal.text : (inputVal.num !== undefined ? String(inputVal.num) : '');

                          return (
                            <tr key={res.id} className={`hover:bg-white/[0.015] transition-colors ${isUnticked ? 'opacity-40' : ''}`}>
                              <td className="text-center py-2 px-2 align-middle">
                                <AnimatedCheckbox
                                  checked={!isUnticked}
                                  onChange={checked => handleToggleResultParam(res.id, checked)}
                                  disabled={!canEdit}
                                  title="Tick/untick temperature test"
                                />
                              </td>
                              <td className="py-2 px-4 pl-9 align-middle">
                                <div className="flex items-center gap-2 border-l-2 border-[#009FE3]/30 pl-2.5">
                                  <span className={`font-medium text-xs ${isUnticked ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                                    {res.parameter_name}
                                  </span>
                                  {res.unit && (
                                    <span className="text-[11px] font-mono text-[var(--muted)]">
                                      ({res.unit})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-4 align-middle">
                                <input
                                  type="text"
                                  disabled={!canEdit || isUnticked}
                                  placeholder={isUnticked ? "N/A – Unticked" : "Enter lab reading..."}
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
                                  className={`inp w-full h-[34px] text-xs font-mono transition-colors ${
                                    isUnticked ? 'opacity-40 bg-transparent cursor-not-allowed' : 'bg-[var(--surface)]'
                                  }`}
                                />
                              </td>
                              <td className="text-center py-2 px-2 align-middle">
                                {!isUnticked && currentResult.trim() !== '' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <Check className="w-3 h-3" /> Recorded
                                  </span>
                                ) : !isUnticked ? (
                                  <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-medium text-slate-500">
                                    Excluded
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* 4. Custom Parameter Rows */}
                        {customParamRows.map((crow) => (
                          <tr key={crow.id} className="bg-sky-500/5">
                            <td className="text-center py-2 px-2 align-middle">
                              <AnimatedCheckbox
                                checked={crow.requested}
                                onChange={checked => {
                                  setCustomParamRows(prev => prev.map(r => r.id === crow.id ? { ...r, requested: checked } : r));
                                }}
                                disabled={!canEdit}
                                title="Tick/untick custom parameter"
                              />
                            </td>
                            <td className="py-2 px-4 align-middle">
                              <input
                                type="text"
                                disabled={!canEdit}
                                placeholder="Nama Parameter Baru..."
                                value={crow.parameter_name}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCustomParamRows(prev => prev.map(r => r.id === crow.id ? { ...r, parameter_name: val } : r));
                                }}
                                className="inp w-full h-[34px] text-xs font-medium"
                              />
                            </td>
                            <td className="py-2 px-4 align-middle">
                              <input
                                type="text"
                                disabled={!canEdit || !crow.requested}
                                placeholder="Lab reading..."
                                value={crow.result_text}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCustomParamRows(prev => prev.map(r => r.id === crow.id ? { ...r, result_text: val } : r));
                                }}
                                className="inp w-full h-[34px] text-xs font-mono"
                              />
                            </td>
                            <td className="text-center py-2 px-2 align-middle">
                              <button
                                type="button"
                                onClick={() => setCustomParamRows(prev => prev.filter(r => r.id !== crow.id))}
                                className="ghost dng h-7 w-7 p-0 text-xs text-rose-400 hover:text-rose-300"
                                title="Remove this parameter row"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* QC Operating Conditions & Remarks Card */}
                  <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] space-y-3.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block">
                      QC Operating Conditions &amp; Physical Observations
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        qcRemarkFlushing ? 'bg-sky-500/10 border-sky-500/30 text-[var(--text)]' : 'bg-white/[0.02] border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                      }`}>
                        <AnimatedCheckbox
                          disabled={!canEdit}
                          checked={qcRemarkFlushing}
                          onChange={checked => setQcRemarkFlushing(checked)}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[var(--text)]">Flushing</span>
                          <span className="text-[11px] text-[var(--muted)]">Sampling line flushed</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        qcRemarkCooling ? 'bg-sky-500/10 border-sky-500/30 text-[var(--text)]' : 'bg-white/[0.02] border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                      }`}>
                        <AnimatedCheckbox
                          disabled={!canEdit}
                          checked={qcRemarkCooling}
                          onChange={checked => setQcRemarkCooling(checked)}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[var(--text)]">Cooling</span>
                          <span className="text-[11px] text-[var(--muted)]">Crystallizer active cooling</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        qcRemarkPushover ? 'bg-sky-500/10 border-sky-500/30 text-[var(--text)]' : 'bg-white/[0.02] border-[var(--line)] text-[var(--muted)] hover:border-white/20'
                      }`}>
                        <AnimatedCheckbox
                          disabled={!canEdit}
                          checked={qcRemarkPushover}
                          onChange={checked => setQcRemarkPushover(checked)}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[var(--text)]">Push over</span>
                          <span className="text-[11px] text-[var(--muted)]">Transfer operation active</span>
                        </div>
                      </label>
                    </div>

                    <textarea
                      disabled={!canEdit}
                      rows={2}
                      placeholder="Type remarks here (appearance, clarity, moisture haze, process deviations)..."
                      value={qcRemarksText}
                      onChange={e => setQcRemarksText(e.target.value)}
                      className="inp w-full p-3 text-xs leading-relaxed"
                      style={{ height: '64px' }}
                    />
                  </div>

                  {/* Footer Commit Bar */}
                  {(role === 'qc_analyst' || role === 'qc_manager' || role === 'admin') && (
                    <div className="p-4 border-t border-[var(--line)] bg-[var(--raised)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Recorded laboratory entries comply with ISO / 21 CFR Part 11 integrity standards.</span>
                        </div>
                        {(untickedParams.length > 0 || missingTickedParams.length > 0) ? (
                          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {untickedParams.length > 0 ? `${untickedParams.length} checkbox(es) unchecked` : ''} 
                              {untickedParams.length > 0 && missingTickedParams.length > 0 ? ' · ' : ''}
                              {missingTickedParams.length > 0 ? `${missingTickedParams.length} reading(s) pending` : ''} 
                              (Must complete before commit)
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>All parameter boxes checked and filled. Ready to commit.</span>
                          </span>
                        )}
                      </div>

                      <ModernButton
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="shrink-0"
                      >
                        Commit Lab Results
                      </ModernButton>
                    </div>
                  )}
                </form>
              </section>
            ) : (
              <section className="panel empty p-12 text-center text-xs text-[var(--muted)]">
                Select a sample report from the queue on the left.
              </section>
            )}
          </div>
        </div>
      )}


      {/* 3. QC Decision Modal with Electronic Signature (Portaled to document.body for instant viewport centering) */}
      {isMounted && typeof document !== 'undefined' && isDecisionModalOpen && selectedReport && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none bg-black/80 backdrop-blur-md animate-alert-overlay-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setIsDecisionModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-lg rounded-2xl bg-[#0F1524] border border-[#1F2E43] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-6 overflow-hidden animate-alert-content-in max-h-[90vh] overflow-y-auto"
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
                  <span>⚠️ Attention: Incomplete Test Parameters ({missingTickedParams.length} parameter{missingTickedParams.length > 1 ? 's' : ''})</span>
                </div>
                <p style={{ margin: 0, lineHeight: 1.4 }}>
                  The following parameters are checked but values remain blank: <strong>{missingTickedParams.slice(0, 4).join(', ')}{missingTickedParams.length > 4 ? ` and ${missingTickedParams.length - 4} more` : ''}</strong>. All active test values must be entered in the laboratory form before recording an Accept, Concession, or Reject decision.
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
                    <SearchableSelect
                      value={decisionReasonId}
                      onChange={val => setDecisionReasonId(val)}
                      placeholder="-- Choose Reason Code --"
                      searchPlaceholder="Search reason code..."
                      options={reasons.map(r => ({
                        value: r.id,
                        label: r.label
                      }))}
                    />
                  </div>

                  {decisionType === 'reject' && (
                    <div className="fld">
                      <label>Mandatory Product Disposition *</label>
                      <SearchableSelect
                        value={decisionDisposition}
                        onChange={val => setDecisionDisposition(val as Disposition)}
                        placeholder="Select Disposition"
                        searchPlaceholder="Search disposition..."
                        options={[
                          { value: 'reprocess', label: 'Reprocess (Return to Deodorizer)' },
                          { value: 'rework', label: 'Rework (Bleaching/Pre-treatment)' },
                          { value: 'downgrade', label: 'Downgrade to Lower Grade Product' },
                          { value: 'hold', label: 'Quality Hold (Quarantine Tank)' },
                          { value: 'scrap', label: 'Scrap / By-product Tank' }
                        ]}
                      />
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
                  ⚠️ All blank inputs for {missingTickedParams.length} checked parameter(s) must be entered before submitting decision ({missingTickedParams.slice(0, 3).join(', ')}{missingTickedParams.length > 3 ? '...' : ''}).
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
                <ModernButton
                  type="submit"
                  variant={decisionType === 'reject' ? 'danger' : 'success'}
                  size="md"
                  disabled={missingTickedParams.length > 0}
                >
                  Sign & Commit Decision
                </ModernButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Delete Sample Confirmation (QC Correction) */}
      {isMounted && typeof document !== 'undefined' && reportToDelete && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none bg-black/80 backdrop-blur-md animate-alert-overlay-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => {
            setReportToDelete(null);
            setDeleteError(null);
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-lg rounded-2xl bg-[#0F1524] border border-[#1F2E43] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-6 overflow-hidden animate-alert-content-in max-h-[90vh] overflow-y-auto"
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
                <SearchableSelect
                  value={deleteReason}
                  onChange={val => setDeleteReason(val)}
                  placeholder="Select reason..."
                  searchPlaceholder="Search reason..."
                  options={[
                    { value: 'Wrong analytical readings entered', label: 'Wrong analytical readings / parameters entered' },
                    { value: 'Incorrect product or tank selection', label: 'Incorrect product or tank selection' },
                    { value: 'Duplicate sample lot in queue', label: 'Duplicate sample lot generated in queue' },
                    { value: 'Contaminated or invalid physical sample', label: 'Contaminated or invalid physical sample' },
                    { value: 'Process log entry cancelled or obsolete', label: 'Process log entry cancelled or obsolete' },
                    { value: 'other', label: 'Other reason (specify below)...' }
                  ]}
                />
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
                <ModernButton
                  type="submit"
                  variant="danger"
                  size="md"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting Sample...' : 'Confirm & Delete Sample'}
                </ModernButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
