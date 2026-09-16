'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  FileCheck2,
  Trash2,
  Info,
  Sparkles,
  Layers,
} from 'lucide-react';
import { excelImportService } from '@/services/excel-import.service';

interface StepUploadFileProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  error?: string | null;
}

export function StepUploadFile({
  file,
  onFileSelect,
  onFileRemove,
  error,
}: StepUploadFileProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const validateAndPassFile = (selectedFile: File) => {
    setUploadError(null);
    const name = selectedFile.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');

    if (!isExcel) {
      setUploadError('Invalid file format. Please upload a valid Microsoft Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds the maximum allowed size of 25MB.');
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const handleDownloadSample = () => {
    try {
      excelImportService.generateSampleTemplate();
    } catch (err: any) {
      setUploadError(`Failed to generate sample template: ${err.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Informative Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 border border-sky-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs shrink-0 mt-0.5">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Multi-Project Bulk Excel Import Engine</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold uppercase tracking-wide">
                Inteva / APQP Ready
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Upload a single Excel workbook containing <strong>1, 5, 20, or 100+ projects</strong> with their phases, milestones, work package tasks, deliverables, and team assignments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-sky-300 text-sky-700 hover:bg-sky-50 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4 text-sky-600" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {/* Errors Banner */}
      {(uploadError || error) && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">File Upload Error: </span>
            <span>{uploadError || error}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Drop Zone / Selected File Card */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
            isDragOver
              ? 'border-sky-500 bg-sky-500/10 shadow-lg scale-[1.005]'
              : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-sky-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs group-hover:scale-110 group-hover:border-sky-300 text-sky-600 transition-all mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h4 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition">
            Choose Excel file or drag & drop here
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) workbooks up to 25MB.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] font-semibold text-slate-500">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
              Multiple Projects in 1 Sheet
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
              Auto Column Mapping
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
              Pre-Validation Check
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-white border border-sky-200 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {file.name}
                </h4>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                  Ready to Process
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatFileSize(file.size)} • Last modified{' '}
                {new Date(file.lastModified).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Replace File
            </button>
            <button
              type="button"
              onClick={onFileRemove}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
              title="Remove File"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Guideline Features List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-600 leading-snug">
            <span className="font-bold text-slate-800">Row Grouping: </span>
            Rows sharing the same Project ID / Number are automatically grouped into one project.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-600 leading-snug">
            <span className="font-bold text-slate-800">APQP Phases & Gates: </span>
            Supports Phase 1–5 breakdown, deliverables, milestones, and RASIC assignments.
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-600 leading-snug">
            <span className="font-bold text-slate-800">Pre-Import Safety: </span>
            Validates all rows, dates, users, and statuses before creating anything in the database.
          </div>
        </div>
      </div>
    </div>
  );
}
