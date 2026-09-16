'use client';

import React, { useState, useRef } from 'react';
import { parseMspXml, parseMspExcel, MspImportTask, MspImportValidationResult } from '@/utils/msp-importer';
import { X, Upload, FileCode, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

interface ImportMspDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onImportTasks: (tasks: MspImportTask[]) => Promise<void>;
}

export function ImportMspDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  onImportTasks,
}: ImportMspDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<MspImportValidationResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setValidationResult(null);
    setGeneralError(null);

    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xml')) {
        const text = await file.text();
        const result = parseMspXml(text);
        setValidationResult(result);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        const buffer = await file.arrayBuffer();
        const result = parseMspExcel(buffer);
        setValidationResult(result);
      } else {
        setGeneralError('Unsupported file format. Please select an MS Project XML (.xml) or Excel (.xlsx) file.');
      }
    } catch (err: any) {
      setGeneralError(`Failed to read file: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || !validationResult.isValid || validationResult.tasks.length === 0) return;

    setIsImporting(true);
    setGeneralError(null);
    try {
      await onImportTasks(validationResult.tasks);
      onClose();
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to import schedule into ERPNext');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Upload className="h-4 w-4 text-sky-600" />
              Import Schedule (MS Project / Excel)
            </h3>
            <p className="text-xs text-slate-500">
              Target Project: <strong className="text-slate-800 font-bold">{projectName || projectId}</strong> ({projectId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {/* File Picker Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-3 bg-white rounded-xl shadow-2xs border border-sky-100">
              <FileCode className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Click to select MS Project XML or Excel schedule'}
              </p>
              <p className="text-[11px] text-slate-400">Supported formats: Microsoft Project XML (.xml), Excel (.xlsx, .xls, .csv)</p>
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              <span>Parsing and validating schedule structure...</span>
            </div>
          )}

          {/* Errors Display */}
          {generalError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation Error</p>
                <p>{generalError}</p>
              </div>
            </div>
          )}

          {/* Validation Result Preview */}
          {validationResult && (
            <div className="space-y-3">
              {validationResult.errors.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Validation Failed ({validationResult.errors.length} errors)
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] font-bold text-rose-900 mt-2">
                    Import blocked to prevent corrupting project schedule.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Valid Schedule: {validationResult.tasks.length} tasks ready to import
                    </div>
                  </div>

                  {validationResult.warnings.length > 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Warnings ({validationResult.warnings.length}):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 mt-1">
                        {validationResult.warnings.slice(0, 3).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sample Task Table Preview */}
                  <div className="mt-3 border border-emerald-200/80 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">WBS</th>
                          <th className="py-2 px-3">Task Name</th>
                          <th className="py-2 px-3">Start</th>
                          <th className="py-2 px-3">Finish</th>
                          <th className="py-2 px-3 text-right">Dur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validationResult.tasks.slice(0, 8).map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-mono text-slate-500">{t.wbs}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-800 truncate max-w-[200px]">
                              {t.subject}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{t.exp_start_date}</td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{t.exp_end_date}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{t.duration}d</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationResult.tasks.length > 8 && (
                      <p className="p-2 text-center text-slate-400 text-[10px] bg-slate-50/50">
                        ...and {validationResult.tasks.length - 8} more tasks
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!validationResult?.isValid || isImporting || isParsing}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition disabled:opacity-50 shadow-xs flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${validationResult?.tasks.length || 0} Tasks`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
