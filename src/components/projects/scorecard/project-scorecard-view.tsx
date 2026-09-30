'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProjectScorecard, ScorecardRow } from '@/types/scorecard.types';
import { scorecardService } from '@/services/scorecard.service';
import { useAuth } from '@/providers/auth-context';
import { useToast } from '@/providers/toast-context';
import {
  Target,
  Upload,
  Download,
  Save,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProjectScorecardViewProps {
  projectId: string;
  projectName?: string;
}

export function ProjectScorecardView({
  projectId,
  projectName,
}: ProjectScorecardViewProps) {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const canEdit =
    hasPermission('manageProjects') ||
    user?.role === 'projectmanager' ||
    user?.role === 'admin' ||
    user?.role === 'it_admin';

  const [scorecard, setScorecard] = useState<ProjectScorecard | null>(null);
  const [editedRows, setEditedRows] = useState<Record<string, ScorecardRow>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const fetchScorecard = async () => {
    setIsLoading(true);
    try {
      const data = await scorecardService.getScorecard(projectId);
      setScorecard(data);
      setEditedRows({});
    } catch (err: any) {
      showToast(err.message || 'Failed to load project scorecard', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchScorecard();
    }
  }, [projectId]);

  const hasUnsavedChanges = Object.keys(editedRows).length > 0;

  const handleCellChange = (rowId: string, field: keyof ScorecardRow, value: string) => {
    if (!scorecard || !canEdit) return;
    const currentRow = editedRows[rowId] || scorecard.rows.find((r) => r.id === rowId);
    if (!currentRow) return;

    const updatedRow = { ...currentRow, [field]: value };
    setEditedRows((prev) => ({ ...prev, [rowId]: updatedRow }));
  };

  const handleSave = async () => {
    if (!scorecard || !hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const mergedRows = scorecard.rows.map((r) => editedRows[r.id] || r);
      const updatedScorecard: ProjectScorecard = {
        ...scorecard,
        rows: mergedRows,
      };

      const result = await scorecardService.updateScorecard(projectId, updatedScorecard);
      setScorecard(result);
      setEditedRows({});
      showToast('Imperative Scorecard saved successfully and synchronized with Flawless Launch!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save scorecard', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await scorecardService.downloadTemplate(projectId);
      showToast('Scorecard template downloaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to download template', 'error');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsImporting(true);
    try {
      const updated = await scorecardService.importExcel(projectId, importFile);
      setScorecard(updated);
      setEditedRows({});
      setIsImportModalOpen(false);
      setImportFile(null);
      showToast('Scorecard imported and synchronized with Flawless Launch metrics!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to import Excel file', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const displayedRows = useMemo(() => {
    if (!scorecard) return [];
    if (categoryFilter === 'ALL') return scorecard.rows;
    return scorecard.rows.filter((r) => r.category === categoryFilter);
  }, [scorecard, categoryFilter]);

  // Derived financial & KPI metrics for overview cards
  const oiRow = scorecard?.rows.find((r) => r.id === 'oi_pct');
  const oeeRow = scorecard?.rows.find((r) => r.id === 'oee_pct');
  const otdRow = scorecard?.rows.find((r) => r.id === 'otd_pct');
  const gmRow = scorecard?.rows.find((r) => r.id === 'gross_margin');

  const oiVal = parseFloat((oiRow?.pl_current || '0').replace('%', ''));
  const oiTgt = parseFloat((oiRow?.ar_target || '0').replace('%', ''));
  const oiIsGreen = oiVal >= oiTgt;

  const oeeVal = parseFloat((oeeRow?.pl_current || '0').replace('%', ''));
  const oeeTgt = parseFloat((oeeRow?.ar_target || '0').replace('%', ''));
  const oeeIsGreen = oeeVal >= oeeTgt;

  const otdVal = parseFloat((otdRow?.pl_current || '0').replace('%', ''));
  const otdTgt = parseFloat((otdRow?.ar_target || '0').replace('%', ''));
  const otdIsGreen = otdVal >= otdTgt;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Authoritative Financial Model
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Sourced from PMO Imperative Scorecard Template
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              <span>Imperative Scorecard & Financial KPIs</span>
            </h2>
            <p className="text-xs text-slate-500">
              Project: <span className="font-bold text-slate-700">{projectName || projectId}</span>
              {scorecard?.last_imported_at && (
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  • Last imported: {new Date(scorecard.last_imported_at).toLocaleDateString()} by{' '}
                  {scorecard.last_imported_by || 'PM'} (v{scorecard.version})
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Download Excel</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="h-4 w-4 text-indigo-600" />
                <span>Import Excel</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Changes {hasUnsavedChanges && `(${Object.keys(editedRows).length})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchScorecard}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              title="Refresh scorecard"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-indigo-600')} />
            </button>
          </div>
        </div>

        {/* Highlight KPI Metric Cards (Feeds into Flawless Launch) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* 1. Operating Income (OI%) - Mandatory FLM KPI */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900">
                (%) OI — Program Life Avg.
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-200/80 text-indigo-900">
                FLM MANDATORY
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {oiRow?.pl_current || '15.6%'}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1',
                  oiIsGreen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                )}
              >
                {oiIsGreen ? 'Target Met (Green)' : 'Below Target (Red)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              AR Target: <span className="font-bold text-slate-700 font-mono">{oiRow?.ar_target || '15.0%'}</span>
            </div>
          </div>

          {/* 2. OEE (%) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                OEE (%) — Equipment Effectiveness
              </span>
              <span className="text-[10px] text-slate-400 font-bold">FLM Metric</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {oeeRow?.pl_current || '87.4%'}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                  oeeIsGreen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                )}
              >
                {oeeIsGreen ? 'Green' : 'Red'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              AR Target: <span className="font-bold text-slate-700 font-mono">{oeeRow?.ar_target || '85.0%'}</span>
            </div>
          </div>

          {/* 3. OTD (%) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                OTD (%) — On-Time Delivery
              </span>
              <span className="text-[10px] text-slate-400 font-bold">FLM Metric</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {otdRow?.pl_current || '98.5%'}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                  otdIsGreen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                )}
              >
                {otdIsGreen ? 'Green' : 'Red'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              AR Target: <span className="font-bold text-slate-700 font-mono">{otdRow?.ar_target || '98.0%'}</span>
            </div>
          </div>

          {/* 4. Gross Margin (%) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                (%) Gross Margin
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Business Case</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {gmRow?.pl_current || '24.5%'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                Active
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              AR Target: <span className="font-bold text-slate-700 font-mono">{gmRow?.ar_target || '24.0%'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['ALL', 'General', 'Volume', 'Tooling & Equipment', 'Investment', 'Expenses', 'Financial Statistics'].map(
          (cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer',
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {cat === 'ALL' ? 'All Line Items' : cat}
            </button>
          )
        )}
      </div>

      {/* Scorecard Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] border-b border-slate-800">
                <th className="p-3.5 sticky left-0 bg-slate-900 z-10 min-w-[260px]">
                  Imperative Line Item
                </th>
                <th className="p-3.5 min-w-[90px] text-slate-400">Unit</th>
                <th className="p-3.5 min-w-[120px] bg-slate-800 text-slate-200 text-center">
                  PRB (Commitment)
                </th>
                <th className="p-3.5 min-w-[130px] bg-indigo-950 text-indigo-200 text-center">
                  AR Target
                </th>
                <th className="p-3.5 min-w-[110px] text-center">PL (Current)</th>
                <th className="p-3.5 min-w-[110px] text-center">PL (R&O)</th>
                <th className="p-3.5 min-w-[110px] text-center">VC (Current)</th>
                <th className="p-3.5 min-w-[110px] text-center">VC (R&O)</th>
                <th className="p-3.5 min-w-[110px] text-center">TKO (Current)</th>
                <th className="p-3.5 min-w-[110px] text-center">TKO (R&O)</th>
                <th className="p-3.5 min-w-[110px] text-center">VL (Current)</th>
                <th className="p-3.5 min-w-[110px] text-center">VL (R&O)</th>
                <th className="p-3.5 min-w-[110px] text-center">CPA (Current)</th>
                <th className="p-3.5 min-w-[110px] text-center">CPA (R&O)</th>
                <th className="p-3.5 min-w-[110px] text-center">CT (Current)</th>
                <th className="p-3.5 min-w-[110px] text-center">CT (R&O)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.map((row) => {
                const activeData = editedRows[row.id] || row;
                const isMandatory = row.is_mandatory;

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'hover:bg-slate-50/70 transition',
                      isMandatory && 'bg-indigo-50/20 font-semibold'
                    )}
                  >
                    <td className="p-3.5 sticky left-0 bg-white font-medium text-slate-800 flex items-center justify-between gap-2 shadow-xs">
                      <span>{row.line_item}</span>
                      {isMandatory && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-700 shrink-0">
                          MANDATORY
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono text-[10px]">{row.unit || '—'}</td>

                    {/* PRB */}
                    <td className="p-2 text-center bg-slate-50/60 font-mono text-slate-700">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.prb || ''}
                          onChange={(e) => handleCellChange(row.id, 'prb', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.prb || '—'
                      )}
                    </td>

                    {/* AR Target */}
                    <td className="p-2 text-center bg-indigo-50/40 font-mono text-indigo-900 font-bold">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.ar_target || ''}
                          onChange={(e) => handleCellChange(row.id, 'ar_target', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-indigo-300 focus:border-indigo-500 bg-transparent text-xs font-mono font-bold text-indigo-900"
                        />
                      ) : (
                        activeData.ar_target || '—'
                      )}
                    </td>

                    {/* PL Current */}
                    <td className="p-2 text-center font-mono">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.pl_current || ''}
                          onChange={(e) => handleCellChange(row.id, 'pl_current', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.pl_current || '—'
                      )}
                    </td>

                    {/* PL R&O */}
                    <td className="p-2 text-center font-mono text-slate-500">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.pl_ro || ''}
                          onChange={(e) => handleCellChange(row.id, 'pl_ro', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.pl_ro || '—'
                      )}
                    </td>

                    {/* VC Current */}
                    <td className="p-2 text-center font-mono">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.vc_current || ''}
                          onChange={(e) => handleCellChange(row.id, 'vc_current', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.vc_current || '—'
                      )}
                    </td>

                    {/* VC R&O */}
                    <td className="p-2 text-center font-mono text-slate-500">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.vc_ro || ''}
                          onChange={(e) => handleCellChange(row.id, 'vc_ro', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.vc_ro || '—'
                      )}
                    </td>

                    {/* TKO Current */}
                    <td className="p-2 text-center font-mono">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.tko_current || ''}
                          onChange={(e) => handleCellChange(row.id, 'tko_current', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.tko_current || '—'
                      )}
                    </td>

                    {/* TKO R&O */}
                    <td className="p-2 text-center font-mono text-slate-500">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.tko_ro || ''}
                          onChange={(e) => handleCellChange(row.id, 'tko_ro', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.tko_ro || '—'
                      )}
                    </td>

                    {/* VL Current */}
                    <td className="p-2 text-center font-mono">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.vl_current || ''}
                          onChange={(e) => handleCellChange(row.id, 'vl_current', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.vl_current || '—'
                      )}
                    </td>

                    {/* VL R&O */}
                    <td className="p-2 text-center font-mono text-slate-500">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.vl_ro || ''}
                          onChange={(e) => handleCellChange(row.id, 'vl_ro', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.vl_ro || '—'
                      )}
                    </td>

                    {/* CPA Current */}
                    <td className="p-2 text-center font-mono">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.cpa_current || ''}
                          onChange={(e) => handleCellChange(row.id, 'cpa_current', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.cpa_current || '—'
                      )}
                    </td>

                    {/* CPA R&O */}
                    <td className="p-2 text-center font-mono text-slate-500">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.cpa_ro || ''}
                          onChange={(e) => handleCellChange(row.id, 'cpa_ro', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.cpa_ro || '—'
                      )}
                    </td>

                    {/* CT Current */}
                    <td className="p-2 text-center font-mono">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.ct_current || ''}
                          onChange={(e) => handleCellChange(row.id, 'ct_current', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.ct_current || '—'
                      )}
                    </td>

                    {/* CT R&O */}
                    <td className="p-2 text-center font-mono text-slate-500">
                      {canEdit ? (
                        <input
                          type="text"
                          value={activeData.ct_ro || ''}
                          onChange={(e) => handleCellChange(row.id, 'ct_ro', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent text-xs font-mono"
                        />
                      ) : (
                        activeData.ct_ro || '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Import Imperative Scorecard</h3>
                  <p className="text-xs text-slate-500">Upload filled Excel workbook (.xlsx)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 space-y-5">
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50">
                <Upload className="h-8 w-8 text-indigo-500 mx-auto" />
                <div>
                  <label htmlFor="scorecard-file-input" className="cursor-pointer">
                    <span className="font-bold text-indigo-600 hover:text-indigo-500 text-xs">
                      Click to choose file
                    </span>
                    <span className="text-xs text-slate-500"> or drag and drop</span>
                  </label>
                  <input
                    id="scorecard-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Microsoft Excel (.xlsx, .xls) up to 10MB</p>
                </div>
                {importFile && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 text-left flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{importFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportFile(null)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <div className="font-bold text-slate-700">Predefined Column Structure:</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  The system will read and map columns according to the PMO Imperative Scorecard
                  standard (PRB, AR Target, and Stage Current/R&O values). Columns cannot be added or deleted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || isImporting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{isImporting ? 'Importing & Validating...' : 'Import Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
