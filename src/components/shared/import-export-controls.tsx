'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, FileJson, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ImportExportControlsProps {
  entityName: string;
  dataToExport?: any[];
  onImportCSV?: (parsedData: any[]) => Promise<void> | void;
  exportFilename?: string;
  className?: string;
}

export function ImportExportControls({
  entityName,
  dataToExport = [],
  onImportCSV,
  exportFilename = 'pdm_export',
  className = '',
}: ImportExportControlsProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle CSV Export
   */
  const handleExportCSV = () => {
    if (!dataToExport || dataToExport.length === 0) {
      alert(`No ${entityName} data available to export.`);
      return;
    }

    const firstRow = dataToExport[0];
    const headers = Object.keys(firstRow).filter((k) => typeof firstRow[k] !== 'object' || firstRow[k] === null);

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const item of dataToExport) {
      const values = headers.map((header) => {
        const val = item[header];
        if (val === null || val === undefined) return '""';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFilename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Handle JSON Export
   */
  const handleExportJSON = () => {
    if (!dataToExport || dataToExport.length === 0) {
      alert(`No ${entityName} data available to export.`);
      return;
    }

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFilename}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Parse CSV File
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');

        if (lines.length < 2) {
          setImportStatus('CSV file must contain a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.replace(/^"(.*)"$/, '$1').trim());
        const parsedRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.replace(/^"(.*)"$/, '$1').trim());
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });
          parsedRows.push(rowObj);
        }

        setImportedRows(parsedRows);
        setImportStatus(`Successfully parsed ${parsedRows.length} ${entityName} records from CSV.`);
      } catch (err: any) {
        setImportStatus(`Failed to parse CSV file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (importedRows.length === 0) return;
    setImporting(true);
    try {
      if (onImportCSV) {
        await onImportCSV(importedRows);
      }
      alert(`Imported ${importedRows.length} ${entityName} records successfully!`);
      setImportModalOpen(false);
      setImportedRows([]);
      setImportStatus(null);
    } catch (err: any) {
      setImportStatus(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Import CSV Button */}
      {onImportCSV && (
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
          title={`Import ${entityName} CSV`}
        >
          <Upload className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          <span>Import</span>
        </button>
      )}

      {/* Export Options */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition cursor-pointer"
          title={`Export ${entityName} to CSV`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={handleExportJSON}
          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          title={`Export ${entityName} to JSON`}
        >
          <FileJson className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans text-slate-800">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-sky-600" /> Bulk Import {entityName} (CSV)
              </h3>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportedRows([]);
                  setImportStatus(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a CSV file containing {entityName} data. The first row should contain field header names.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-2xl text-center space-y-2 cursor-pointer bg-slate-50 dark:bg-slate-950 transition"
              >
                <FileSpreadsheet className="h-8 w-8 text-sky-600 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Click to select CSV file
                </div>
                <div className="text-[11px] text-slate-400">Supports .csv format with standard headers</div>
              </div>

              {importStatus && (
                <div
                  className={cn(
                    'p-3 rounded-xl text-xs font-semibold flex items-center gap-2',
                    importedRows.length > 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  )}
                >
                  {importedRows.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{importStatus}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportedRows([]);
                  setImportStatus(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importedRows.length === 0 || importing}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Import {importedRows.length} Records</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
