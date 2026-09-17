'use client';

import React, { useState, useRef } from 'react';
import { Gate, GateCriterion } from '@/types/gate.types';
import {
  parseChecklistFile,
  downloadChecklistSampleTemplate,
  ChecklistParseResult,
  ParsedCriterionItem,
} from '@/services/gate-checklist-parser.service';
import { gateService } from '@/services/gate.service';
import { useToast } from '@/providers/toast-context';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
  FileText,
  HelpCircle,
  Filter,
  Check,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface GateChecklistUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gate: Gate;
  onSuccess: (updatedGate: Gate, createdCount: number, skippedCount: number) => void;
}

export function GateChecklistUploadDialog({
  isOpen,
  onClose,
  gate,
  onSuccess,
}: GateChecklistUploadDialogProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ChecklistParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewTab, setPreviewTab] = useState<'valid' | 'duplicates' | 'errors'>('valid');

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);

    try {
      const res = await parseChecklistFile(
        file,
        gate.criteria || [],
        gate.gate_owner,
        gate.planned_date
      );
      setParseResult(res);
      if (res.itemsToImport.length > 0) {
        setPreviewTab('valid');
      } else if (res.duplicateItems.length > 0) {
        setPreviewTab('duplicates');
      } else if (res.rowErrors.length > 0) {
        setPreviewTab('errors');
      }
    } catch (err: any) {
      showToast(`Error parsing file: ${err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile || !parseResult || parseResult.itemsToImport.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('criteria', JSON.stringify(parseResult.itemsToImport));

      const res = await gateService.uploadChecklist(gate.name, formData);

      showToast(
        res.message ||
          `Checklist uploaded successfully — ${res.createdCount} new criteria created (${res.skippedCount} duplicates skipped).`,
        'success'
      );

      onSuccess(res.gate, res.createdCount, res.skippedCount);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload checklist', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Upload Exit Criteria Checklist</h3>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {gate.name} ({gate.gate_type || 'N/A'})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bulk import exit criteria for <strong className="text-slate-700">{gate.project || 'Project'}</strong>. Duplicates will be safely skipped.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadChecklistSampleTemplate(gate.gate_type || gate.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Download standard APQP Checklist Excel Template"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Download Template</span>
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* File Picker / Dropzone */}
          {!parseResult && !isParsing && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-3xl p-8 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer select-none',
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="h-12 w-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-emerald-600">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800">
                  Click to select checklist Excel file or drag & drop here
                </div>
                <div className="text-slate-400">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 25MB
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-1 mt-1 font-medium">
                <span>Recognized columns:</span>
                <span className="font-mono font-bold text-slate-700">Criterion, Description, Required, Responsible Person, Due Date, Status</span>
              </div>
            </div>
          )}

          {/* Parsing State */}
          {isParsing && (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
              <div className="font-bold text-slate-700">Validating checklist Excel structure...</div>
              <div className="text-slate-400 text-[11px]">
                Checking required columns, data formats, and detecting duplicate items
              </div>
            </div>
          )}

          {/* Validation & Import Preview */}
          {parseResult && (
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5 truncate">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{parseResult.fileName}</span>
                  <span className="text-slate-400 text-[11px]">
                    ({parseResult.totalRows} data rows detected)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null);
                    setSelectedFile(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Choose Different File
                </button>
              </div>

              {/* General Error Banner */}
              {parseResult.generalError && parseResult.itemsToImport.length === 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">{parseResult.generalError}</div>
                    {parseResult.missingRequiredColumns.length > 0 && (
                      <div className="text-[11px] mt-1 text-rose-700">
                        Required column <strong>Criterion</strong> was not found in the header row.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Rows</div>
                  <div className="text-lg font-mono font-black text-slate-800">
                    {parseResult.totalRows}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Valid Rows</div>
                  <div className="text-lg font-mono font-black text-emerald-800">
                    {parseResult.validRowsCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Duplicate Rows</div>
                  <div className="text-lg font-mono font-black text-amber-800">
                    {parseResult.duplicateRowsCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-rose-700">Invalid Rows</div>
                  <div className="text-lg font-mono font-black text-rose-800">
                    {parseResult.invalidRowsCount}
                  </div>
                </div>
              </div>

              {/* Tabs for Reviewing Rows */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('valid')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer',
                      previewTab === 'valid'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>To Create ({parseResult.validRowsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewTab('duplicates')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer',
                      previewTab === 'duplicates'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Duplicates to Skip ({parseResult.duplicateRowsCount})</span>
                  </button>

                  {parseResult.rowErrors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewTab('errors')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer',
                        previewTab === 'errors'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Errors ({parseResult.rowErrors.length})</span>
                    </button>
                  )}
                </div>

                {/* Tab: Valid Items to Create */}
                {previewTab === 'valid' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/40">
                    {parseResult.itemsToImport.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 font-medium">
                        No new valid items to create.
                      </div>
                    ) : (
                      parseResult.itemsToImport.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                        >
                          <div className="space-y-0.5 truncate max-w-lg">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">
                                Row {item.rowNumber}
                              </span>
                              <span className="font-bold text-slate-900 truncate">
                                {item.name}
                              </span>
                              {item.is_required && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                  Required
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500 truncate">
                                {item.description}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3 text-[11px]">
                            <span className="text-slate-500">{item.responsible_person}</span>
                            {item.due_date && (
                              <span className="font-mono text-slate-400">({item.due_date})</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Duplicates Skipped */}
                {previewTab === 'duplicates' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/40">
                    {parseResult.duplicateItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 font-medium">
                        No duplicate items detected.
                      </div>
                    ) : (
                      parseResult.duplicateItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/40 border border-amber-200 text-xs opacity-80"
                        >
                          <div className="space-y-0.5 truncate max-w-lg">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">
                                Row {item.rowNumber}
                              </span>
                              <span className="font-bold text-slate-800 line-through truncate">
                                {item.name}
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-700 font-medium">
                              {item.duplicateReason || 'Already exists in this gate'}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                            Skipped
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Errors */}
                {previewTab === 'errors' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/40">
                    {parseResult.rowErrors.map((err, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] bg-rose-200/60 px-1.5 py-0.5 rounded">
                            Row {err.rowNumber}
                          </span>
                          <span className="font-medium">{err.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {parseResult && parseResult.validRowsCount > 0 ? (
              <span>
                Ready to create <strong>{parseResult.validRowsCount}</strong> exit criteria in{' '}
                <strong>{gate.name}</strong>.
              </span>
            ) : (
              <span>Select an Excel workbook to review and import.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition text-xs cursor-pointer"
            >
              Cancel
            </button>

            {parseResult && parseResult.validRowsCount > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Import {parseResult.validRowsCount} Checklist Items</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
