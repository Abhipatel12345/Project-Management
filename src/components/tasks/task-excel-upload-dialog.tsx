'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useCreateTask } from '@/hooks/use-tasks';
import { Task, TaskPriority, TaskStatus } from '@/types/task.types';
import { useToast } from '@/providers/toast-context';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Calendar,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface ParsedTaskRow {
  rowIndex: number;
  subject: string;
  description?: string;
  assigned_to?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  expected_time?: number;
  rasic?: {
    responsible?: string;
    accountable?: string;
    support?: string;
    consulted?: string;
    informed?: string;
  };
  isValid: boolean;
  errors: string[];
}

interface TaskExcelUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  existingTaskSubjects?: string[];
  onSuccess?: (count: number) => void;
}

/**
 * Format any date object or date string to standard YYYY-MM-DD
 */
function normalizeDateStr(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel numeric date serial
    const parsed = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
    // Try standard Date parse
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return undefined;
}

/**
 * Normalize priority
 */
function normalizePriority(val: any): TaskPriority {
  if (!val) return 'Medium';
  const str = String(val).trim().toLowerCase();
  if (str.includes('urg') || str.includes('critical')) return 'Urgent';
  if (str.includes('high')) return 'High';
  if (str.includes('low')) return 'Low';
  return 'Medium';
}

/**
 * Normalize status
 */
function normalizeStatus(val: any): TaskStatus {
  if (!val) return 'Open';
  const str = String(val).trim().toLowerCase();
  if (str.includes('prog') || str.includes('work')) return 'Working';
  if (str.includes('rev') || str.includes('pend')) return 'Pending Review';
  if (str.includes('comp') || str.includes('done') || str.includes('finish')) return 'Completed';
  if (str.includes('canc') || str.includes('abort')) return 'Cancelled';
  if (str.includes('skip')) return 'Skipped';
  return 'Open';
}

export function TaskExcelUploadDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  existingTaskSubjects = [],
  onSuccess,
}: TaskExcelUploadDialogProps) {
  const { showToast } = useToast();
  const createTaskMutation = useCreateTask();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedTaskRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  /**
   * Reset the modal state
   */
  const handleReset = () => {
    setFile(null);
    setFileName('');
    setParsedRows([]);
    setIsParsing(false);
    setIsImporting(false);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Download a professional sample Excel task template
   */
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Task Title': 'Window Regulator Motor Geometry Optimization',
        'Description': 'Perform CAD parameterization and stress simulation under 1500N load',
        'Assigned To': 'teammember@netlink.com',
        'Start Date': '2026-09-01',
        'Due Date': '2026-09-15',
        'Priority': 'High',
        'Status': 'Open',
        'Expected Hours': 40,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Sarah Jenkins',
        'Support (S)': 'Quality Lead',
        'Consulted (C)': 'Lead Engineer',
        'Informed (I)': 'PMO Administrator',
      },
      {
        'Task Title': 'Gearbox Tolerance & Backlash Analysis',
        'Description': 'Verify backlash clearances and physical tolerances on 3D printed prototype',
        'Assigned To': 'teammember@netlink.com',
        'Start Date': '2026-09-16',
        'Due Date': '2026-09-25',
        'Priority': 'Medium',
        'Status': 'Open',
        'Expected Hours': 24,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Sarah Jenkins',
        'Support (S)': '',
        'Consulted (C)': '',
        'Informed (I)': '',
      },
      {
        'Task Title': 'Thermal Dissipation & Life Cycle Bench Test',
        'Description': 'Execute 10,000 cycle endurance test at 65°C ambient temperature',
        'Assigned To': 'sarahjenkins@gmail.com',
        'Start Date': '2026-09-26',
        'Due Date': '2026-10-10',
        'Priority': 'Urgent',
        'Status': 'Open',
        'Expected Hours': 60,
        'Responsible (R)': 'Sarah Jenkins',
        'Accountable (A)': 'Quality Lead',
        'Support (S)': 'Yash',
        'Consulted (C)': '',
        'Informed (I)': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set auto column widths
    worksheet['!cols'] = [
      { wch: 45 }, // Task Title
      { wch: 55 }, // Description
      { wch: 30 }, // Assigned To
      { wch: 14 }, // Start Date
      { wch: 14 }, // Due Date
      { wch: 12 }, // Priority
      { wch: 12 }, // Status
      { wch: 15 }, // Expected Hours
      { wch: 20 }, // R
      { wch: 20 }, // A
      { wch: 20 }, // S
      { wch: 20 }, // C
      { wch: 20 }, // I
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Tasks');

    XLSX.writeFile(workbook, `pdm_tasks_template_${projectId}.xlsx`);
  };

  /**
   * Parse uploaded Excel or CSV file
   */
  const processUploadedFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setIsParsing(true);

    try {
      const dataBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array', cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('The uploaded workbook does not contain any readable sheets.');
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, {
        defval: '',
      });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('The selected spreadsheet does not contain any data rows.');
      }

      const existingLower = new Set(existingTaskSubjects.map((s) => s.toLowerCase().trim()));
      const seenInFile = new Set<string>();

      const parsedList: ParsedTaskRow[] = [];

      rawRows.forEach((row, index) => {
        const errors: string[] = [];
        const rowIndex = index + 2; // Accounting for 1-based index and header row

        // Flexible column key finders
        const getField = (aliases: string[]): any => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const alias of aliases) {
              const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias)) {
                return row[key];
              }
            }
          }
          return undefined;
        };

        const rawSubject = getField(['tasktitle', 'subject', 'taskname', 'title', 'task', 'name']);
        const rawDesc = getField(['description', 'desc', 'details', 'summary', 'scope']);
        const rawAssigned = getField(['assignedto', 'assigned', 'assignee', 'owner', 'assigneduser']);
        const rawStart = getField(['startdate', 'expstartdate', 'start', 'expectedstartdate', 'plannedstart']);
        const rawEnd = getField(['duedate', 'expenddate', 'enddate', 'due', 'deadline', 'plannedend']);
        const rawPriority = getField(['priority', 'severity', 'urgency']);
        const rawStatus = getField(['status', 'state', 'stage']);
        const rawHours = getField(['expectedhours', 'expectedtime', 'hours', 'esthours', 'estimatedhours']);

        // RASIC
        const rawR = getField(['responsibler', 'responsible', 'r']);
        const rawA = getField(['accountablea', 'accountable', 'a']);
        const rawS = getField(['supports', 'support', 's']);
        const rawC = getField(['consultedc', 'consulted', 'c']);
        const rawI = getField(['informedi', 'informed', 'i']);

        const subjectStr = String(rawSubject || '').trim();

        if (!subjectStr) {
          errors.push('Task Title / Subject is required.');
        } else {
          const lower = subjectStr.toLowerCase();
          if (seenInFile.has(lower)) {
            errors.push(`Duplicate task title "${subjectStr}" in uploaded file.`);
          } else {
            seenInFile.add(lower);
          }

          if (existingLower.has(lower)) {
            errors.push(`A task with title "${subjectStr}" already exists in ${projectId}.`);
          }
        }

        const exp_start_date = normalizeDateStr(rawStart);
        const exp_end_date = normalizeDateStr(rawEnd);

        if (rawStart && !exp_start_date) {
          errors.push(`Invalid start date value: "${rawStart}". Format should be YYYY-MM-DD.`);
        }

        if (rawEnd && !exp_end_date) {
          errors.push(`Invalid due date value: "${rawEnd}". Format should be YYYY-MM-DD.`);
        }

        if (exp_start_date && exp_end_date && exp_start_date > exp_end_date) {
          errors.push(`Start Date (${exp_start_date}) cannot be after Due Date (${exp_end_date}).`);
        }

        let expected_time: number | undefined = undefined;
        if (rawHours !== undefined && rawHours !== '') {
          const num = Number(rawHours);
          if (isNaN(num) || num < 0) {
            errors.push(`Expected Hours must be a positive number (found: "${rawHours}").`);
          } else {
            expected_time = num;
          }
        }

        const priority = normalizePriority(rawPriority);
        const status = normalizeStatus(rawStatus);

        const rasic = {
          responsible: rawR ? String(rawR).trim() : undefined,
          accountable: rawA ? String(rawA).trim() : undefined,
          support: rawS ? String(rawS).trim() : undefined,
          consulted: rawC ? String(rawC).trim() : undefined,
          informed: rawI ? String(rawI).trim() : undefined,
        };

        parsedList.push({
          rowIndex,
          subject: subjectStr,
          description: rawDesc ? String(rawDesc).trim() : undefined,
          assigned_to: rawAssigned ? String(rawAssigned).trim() : undefined,
          exp_start_date,
          exp_end_date,
          priority,
          status,
          expected_time,
          rasic,
          isValid: errors.length === 0,
          errors,
        });
      });

      setParsedRows(parsedList);
    } catch (err: any) {
      showToast(err.message || 'Failed to read spreadsheet file', 'error');
      handleReset();
    } finally {
      setIsParsing(false);
    }
  };

  /**
   * Handle File Input Change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processUploadedFile(selected);
    }
  };

  /**
   * Handle Drag and Drop
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const name = droppedFile.name.toLowerCase();
      if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        processUploadedFile(droppedFile);
      } else {
        showToast('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.', 'error');
      }
    }
  };

  /**
   * Import all validated tasks into ERPNext linked to current project
   */
  const handleImportTasks = async () => {
    if (validRows.length === 0) {
      showToast('No valid task rows available to import.', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    const failedErrors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createTaskMutation.mutateAsync({
          subject: row.subject,
          description: row.description,
          project: projectId,
          status: row.status,
          priority: row.priority,
          exp_start_date: row.exp_start_date,
          exp_end_date: row.exp_end_date,
          expected_time: row.expected_time,
          assigned_to: row.assigned_to,
          rasic: row.rasic,
        });
        successCount++;
      } catch (err: any) {
        failedErrors.push(`Row #${row.rowIndex} (${row.subject}): ${err.message || 'ERPNext error'}`);
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);

    if (successCount > 0) {
      showToast(
        `Successfully imported ${successCount} ${successCount === 1 ? 'task' : 'tasks'} into ${projectName} (${projectId})!`,
        'success'
      );
      if (onSuccess) {
        onSuccess(successCount);
      }
      onClose();
    } else {
      showToast(`Failed to import tasks: ${failedErrors.join('; ')}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Import Tasks via Excel</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-[#0B74DE] text-[10px] font-extrabold uppercase tracking-wider">
                  {projectId}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Upload a structured spreadsheet to batch create tasks for{' '}
                <span className="font-bold text-slate-800">{projectName}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Download sample Excel template with column formatting"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Sample Template</span>
            </button>
            <button
              onClick={onClose}
              disabled={isImporting}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* File Upload Zone */}
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3',
                isDragOver
                  ? 'border-sky-500 bg-sky-50/50 scale-[0.99]'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-300'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 rounded-2xl bg-white shadow-xs text-sky-600 border border-slate-200">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Click to select or drag and drop your Excel / CSV file
                </p>
                <p className="text-xs text-slate-500">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
              </div>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <span>Expected Columns:</span>
                <span className="text-slate-600">
                  Task Title*, Description, Assigned To, Start Date, Due Date, Priority, Status, Expected Hours, RASIC
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{fileName}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows parsed
                    </div>
                  </div>
                </div>

                {!isImporting && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Change File</span>
                  </button>
                )}
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="p-8 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Analyzing and validating spreadsheet rows...</p>
                </div>
              )}

              {/* Summary Stats Badges */}
              {!isParsing && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Rows Parsed
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">{parsedRows.length}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valid Rows Ready
                    </div>
                    <div className="text-xl font-black text-emerald-800 mt-0.5">{validRows.length}</div>
                  </div>

                  <div
                    className={cn(
                      'p-3.5 rounded-2xl border shadow-2xs',
                      invalidRows.length > 0
                        ? 'bg-rose-50/60 border-rose-200/80'
                        : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
                        invalidRows.length > 0 ? 'text-rose-700' : 'text-slate-400'
                      )}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Invalid Rows (Errors)
                    </div>
                    <div
                      className={cn(
                        'text-xl font-black mt-0.5',
                        invalidRows.length > 0 ? 'text-rose-800' : 'text-slate-400'
                      )}
                    >
                      {invalidRows.length}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {!isParsing && parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Task Import Preview</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Only valid rows will be imported to {projectId}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Row</th>
                          <th className="py-2.5 px-3">Task Title</th>
                          <th className="py-2.5 px-3">Assignee</th>
                          <th className="py-2.5 px-3">Dates</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parsedRows.map((row) => (
                          <tr
                            key={row.rowIndex}
                            className={cn(
                              'hover:bg-slate-50/70 transition',
                              !row.isValid ? 'bg-rose-50/30' : ''
                            )}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 font-bold text-[11px]">
                              #{row.rowIndex}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-800 max-w-xs truncate">
                                {row.subject || <span className="text-rose-500 italic">Missing Title</span>}
                              </div>
                              {row.description && (
                                <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                  {row.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {row.assigned_to || <span className="text-slate-400">Unassigned</span>}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600">
                              {row.exp_start_date || '—'} → {row.exp_end_date || '—'}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                                  row.priority === 'Urgent'
                                    ? 'bg-rose-100 text-rose-700'
                                    : row.priority === 'High'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                                )}
                              >
                                {row.priority}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Valid
                                </span>
                              ) : (
                                <div className="space-y-1 inline-block text-right">
                                  {row.errors.map((err, errIdx) => (
                                    <span
                                      key={errIdx}
                                      className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold max-w-xs text-left"
                                      title={err}
                                    >
                                      ⚠️ {err}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress Bar during Import */}
              {isImporting && (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                      Importing {validRows.length} tasks into {projectId}...
                    </span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-sky-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {file && validRows.length > 0 && (
              <span>
                Ready to create <strong className="text-slate-800">{validRows.length}</strong> tasks in{' '}
                <strong className="text-sky-700">{projectId}</strong>.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            {file && (
              <button
                type="button"
                onClick={handleImportTasks}
                disabled={isImporting || validRows.length === 0}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition cursor-pointer',
                  validRows.length > 0 && !isImporting
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                )}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing Tasks...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Import {validRows.length} Valid Tasks</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
