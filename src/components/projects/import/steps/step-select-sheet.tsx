'use client';

import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Table,
  Layers,
  ArrowRight,
  Eye,
  Hash,
} from 'lucide-react';

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  previewRows: Record<string, any>[];
}

interface StepSelectSheetProps {
  sheets: SheetInfo[];
  selectedSheetName: string;
  onSelectSheet: (sheetName: string) => void;
}

export function StepSelectSheet({
  sheets,
  selectedSheetName,
  onSelectSheet,
}: StepSelectSheetProps) {
  const activeSheet = sheets.find((s) => s.name === selectedSheetName) || sheets[0];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            Select Worksheet to Import
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Detected {sheets.length} worksheet{sheets.length !== 1 ? 's' : ''} in the uploaded workbook. Choose the sheet containing your project and task schedule data.
          </p>
        </div>
      </div>

      {/* Sheets Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {sheets.map((sheet) => {
          const isSelected = sheet.name === selectedSheetName;
          return (
            <div
              key={sheet.name}
              onClick={() => onSelectSheet(sheet.name)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-sky-600 bg-sky-50/50 shadow-xs ring-2 ring-sky-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {sheet.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {sheet.rowCount} rows • {sheet.columnCount} columns
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                )}
              </div>

              <div className="text-[10px] text-slate-500 truncate bg-slate-100/70 px-2 py-1 rounded-lg">
                Headers: {sheet.headers.slice(0, 4).join(', ')}
                {sheet.headers.length > 4 ? ` +${sheet.headers.length - 4} more` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sheet Data Preview Box */}
      {activeSheet && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Eye className="h-4 w-4 text-sky-600" />
              <span>Data Sample Preview: &quot;{activeSheet.name}&quot;</span>
              <span className="text-[10px] font-medium text-slate-500">
                (Showing top {Math.min(activeSheet.previewRows.length, 5)} rows)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  <th className="py-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 w-12 text-center">
                    #
                  </th>
                  {activeSheet.headers.map((hdr, idx) => (
                    <th
                      key={`${hdr}-${idx}`}
                      className="py-2 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                    >
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activeSheet.previewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeSheet.headers.length + 1}
                      className="py-6 text-center text-slate-400 text-xs"
                    >
                      No data rows found in this sheet.
                    </td>
                  </tr>
                ) : (
                  activeSheet.previewRows.slice(0, 5).map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 text-center text-[10px] font-bold text-slate-400">
                        {rowIdx + 1}
                      </td>
                      {activeSheet.headers.map((hdr, colIdx) => (
                        <td
                          key={`${colIdx}-${hdr}`}
                          className="py-2 px-3 whitespace-nowrap max-w-xs truncate text-[11px]"
                        >
                          {row[hdr] !== undefined && row[hdr] !== null && String(row[hdr]).trim() !== ''
                            ? String(row[hdr])
                            : <span className="text-slate-300 italic">empty</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
