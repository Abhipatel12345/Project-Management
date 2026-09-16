'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  PDMFieldId,
  ColumnMappingItem,
  MappingTemplate,
  ParsedProjectItem,
  ImportValidationSummary,
  DuplicateHandlingMode,
  BulkImportResult,
  BulkImportPayload,
} from '@/types/excel-import.types';
import { excelImportService } from '@/services/excel-import.service';
import projectService from '@/services/project.service';
import teamService from '@/services/team.service';
import { auditService } from '@/services/audit.service';
import { useAuth } from '@/providers/auth-context';

import { StepUploadFile } from './steps/step-upload-file';
import { StepSelectSheet, SheetInfo } from './steps/step-select-sheet';
import { StepMapColumns } from './steps/step-map-columns';
import { StepValidateData } from './steps/step-validate-data';
import { StepPreviewProjects } from './steps/step-preview-projects';
import { StepBulkExecute } from './steps/step-bulk-execute';
import { StepImportSummary } from './steps/step-import-summary';

import {
  X,
  Upload,
  Layers,
  Table,
  CheckCircle2,
  ShieldAlert,
  Eye,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';

interface ProjectImportWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function ProjectImportWizardDialog({
  isOpen,
  onClose,
  onSuccess,
}: ProjectImportWizardDialogProps) {
  const { user } = useAuth();

  // Active step
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // File & Sheet data
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  // Mapping & Template data
  const [mappingItems, setMappingItems] = useState<ColumnMappingItem[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([]);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string>('');

  // Validation & Grouping data
  const [parsedProjects, setParsedProjects] = useState<ParsedProjectItem[]>([]);
  const [validationSummary, setValidationSummary] = useState<ImportValidationSummary | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateHandlingMode>('skip');

  // Directory caches for validation
  const [existingProjects, setExistingProjects] = useState<{ name: string; project_name: string }[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<{ name: string; email: string; full_name?: string }[]>([]);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [currentExecutingProjIndex, setCurrentExecutingProjIndex] = useState(0);
  const [currentExecutingProjName, setCurrentExecutingProjName] = useState('');
  const [executionTasksCreated, setExecutionTasksCreated] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<BulkImportResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load directories and templates on mount
  useEffect(() => {
    if (!isOpen) return;

    setSavedTemplates(excelImportService.getMappingTemplates());

    // Fetch existing projects for duplicate detection
    projectService
      .getProjects({ pageSize: 500 })
      .then((res) => {
        const list = res.projects.map((p) => ({ name: p.name, project_name: p.project_name }));
        setExistingProjects(list);
      })
      .catch((err) => console.warn('[Import Wizard] Projects directory fetch notice:', err));

    // Fetch employee list for assignee matching
    teamService
      .getAvailableEmployees()
      .then((emps) => setAvailableEmployees(emps))
      .catch((err) => console.warn('[Import Wizard] Employees fetch notice:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetWizard = () => {
    setCurrentStep(1);
    setFile(null);
    setWorkbook(null);
    setSheets([]);
    setSelectedSheetName('');
    setHeaders([]);
    setRows([]);
    setMappingItems([]);
    setParsedProjects([]);
    setValidationSummary(null);
    setDuplicateMode('skip');
    setIsExecuting(false);
    setExecutionProgress(0);
    setExecutionLogs([]);
    setExecutionResult(null);
    setGeneralError(null);
  };

  /**
   * Step 1 -> Process Uploaded File
   */
  const handleFileSelect = async (selectedFile: File) => {
    try {
      setGeneralError(null);
      setFile(selectedFile);

      const wb = await excelImportService.readWorkbook(selectedFile);
      setWorkbook(wb);

      const detectedSheets: SheetInfo[] = wb.SheetNames.map((name) => {
        const { headers: h, rows: r } = excelImportService.extractSheetData(wb, name);
        return {
          name,
          rowCount: r.length,
          columnCount: h.length,
          headers: h,
          previewRows: r.slice(0, 5),
        };
      });

      setSheets(detectedSheets);

      // Default to first non-empty sheet
      const firstNonEmpty = detectedSheets.find((s) => s.rowCount > 0) || detectedSheets[0];
      const initialSheetName = firstNonEmpty ? firstNonEmpty.name : wb.SheetNames[0];
      setSelectedSheetName(initialSheetName);

      const { headers: h, rows: r } = excelImportService.extractSheetData(wb, initialSheetName);
      setHeaders(h);
      setRows(r);

      // Generate Auto-mappings
      const initialMappings = excelImportService.suggestColumnMappings(h, r);
      setMappingItems(initialMappings);

      if (detectedSheets.length > 1) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.error('[Import Wizard File Read Error]:', err);
      setGeneralError(err.message || 'Failed to read spreadsheet workbook.');
    }
  };

  /**
   * Step 2 -> Change Selected Sheet
   */
  const handleSelectSheet = (sheetName: string) => {
    if (!workbook) return;
    setSelectedSheetName(sheetName);
    const { headers: h, rows: r } = excelImportService.extractSheetData(workbook, sheetName);
    setHeaders(h);
    setRows(r);

    const initialMappings = excelImportService.suggestColumnMappings(h, r);
    setMappingItems(initialMappings);
  };

  /**
   * Step 3 -> Update Mapping Item
   */
  const handleUpdateMapping = (excelColumn: string, newField: PDMFieldId) => {
    setMappingItems((prev) =>
      prev.map((item) => {
        if (item.excelColumn === excelColumn) {
          return {
            ...item,
            pdmField: newField,
            mappingType: newField === 'ignore' ? 'ignored' : 'manual',
          };
        }
        return item;
      })
    );
  };

  /**
   * Step 3 -> Apply Template
   */
  const handleApplyTemplate = (template: MappingTemplate) => {
    setAppliedTemplateName(template.name);
    setMappingItems((prev) =>
      prev.map((item) => {
        const mapped = template.mappings[item.excelColumn];
        if (mapped) {
          return {
            ...item,
            pdmField: mapped,
            mappingType: 'manual',
          };
        }
        return item;
      })
    );
  };

  /**
   * Step 3 -> Ignore All Unmapped
   */
  const handleIgnoreAllUnmapped = () => {
    setMappingItems((prev) =>
      prev.map((item) => {
        if (item.mappingType === 'unmapped') {
          return {
            ...item,
            pdmField: 'ignore',
            mappingType: 'ignored',
          };
        }
        return item;
      })
    );
  };

  /**
   * Step 3 -> Step 4: Run Pre-Creation Validation
   */
  const runValidationAndProceed = () => {
    // Build mapping dictionary
    const mappingDict: Record<string, PDMFieldId> = {};
    mappingItems.forEach((m) => {
      mappingDict[m.excelColumn] = m.pdmField;
    });

    const { projects, summary } = excelImportService.groupAndValidate(
      rows,
      mappingDict,
      existingProjects,
      availableEmployees
    );

    setParsedProjects(projects);
    setValidationSummary(summary);
    setCurrentStep(4);
  };

  /**
   * Step 5 -> Step 6: Execute Bulk Import on Server
   */
  const handleExecuteBulkImport = async () => {
    if (!validationSummary) return;

    setCurrentStep(6);
    setIsExecuting(true);
    setExecutionProgress(10);
    setExecutionLogs([`Initializing server batch creation for ${parsedProjects.length} projects...`]);

    const payload: BulkImportPayload = {
      projects: parsedProjects.map((p) => ({
        projectIdentifier: p.projectIdentifier,
        projectName: p.projectName,
        projectManager: p.projectManager,
        projectCategory: p.projectCategory,
        productGroup: p.productGroup,
        department: p.department,
        company: p.company,
        projectType: p.projectType,
        priority: p.priority,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        estimatedCost: p.estimatedCost,
        notes: p.notes,
        phases: p.phases.map((ph) => ({
          name: ph.name,
          description: ph.description,
          milestone: ph.milestone,
          tasks: ph.tasks.map((t) => ({
            taskName: t.taskName,
            taskDescription: t.taskDescription,
            assignedTo: t.assignedTo,
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status,
            priority: t.priority,
            deliverableName: t.deliverableName,
            expectedHours: t.expectedHours,
            progress: t.progress,
            dependsOn: t.dependsOn,
            rasic: t.rasic,
          })),
        })),
      })),
      duplicateMode,
      mappingTemplateName: appliedTemplateName || undefined,
      fileName: file?.name || 'import.xlsx',
    };

    try {
      // Progress simulation tick for responsiveness
      const progressTimer = setInterval(() => {
        setExecutionProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 300);

      const res = await fetch('/api/projects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      clearInterval(progressTimer);

      const data: BulkImportResult = await res.json();

      if (!res.ok) {
        throw new Error((data as any).error || 'Bulk project creation failed on server.');
      }

      setExecutionProgress(100);
      setExecutionTasksCreated(data.tasksCreated);
      setExecutionLogs(data.logs || []);
      setExecutionResult(data);

      // Also log action in client audit service
      auditService.logAction(
        user?.fullName || user?.username || 'Administrator',
        `Bulk Imported ${data.projectsCreated} Projects`,
        'Project',
        data.importId,
        `Bulk import completed: ${data.projectsCreated} created, ${data.tasksCreated} tasks, ${data.phasesCreated} phases from ${data.fileName}.`
      );

      setTimeout(() => {
        setIsExecuting(false);
        setCurrentStep(7);
        if (onSuccess) onSuccess();
      }, 600);
    } catch (err: any) {
      console.error('[Bulk Import Execution Error]:', err);
      setIsExecuting(false);
      setGeneralError(err.message || 'Bulk creation failed.');
    }
  };

  const handleFinishAndClose = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  const stepTitles = [
    { step: 1, label: 'Upload' },
    { step: 2, label: 'Worksheet' },
    { step: 3, label: 'Map Columns' },
    { step: 4, label: 'Validation' },
    { step: 5, label: 'Preview' },
    { step: 6, label: 'Importing' },
    { step: 7, label: 'Completed' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-600 text-white shadow-xs">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Bulk Project Import Wizard
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-extrabold">
                  Multi-Project Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Step {currentStep} of 7 •{' '}
                {currentStep === 1
                  ? 'Upload Excel Workbook'
                  : currentStep === 2
                  ? 'Select Target Worksheet'
                  : currentStep === 3
                  ? 'Map Excel Columns to PDM Fields'
                  : currentStep === 4
                  ? 'Pre-Creation Data Validation'
                  : currentStep === 5
                  ? 'Hierarchical Project Preview'
                  : currentStep === 6
                  ? 'Bulk Creating Projects...'
                  : 'Import Summary & Results'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Navigation Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[550px] gap-2">
            {stepTitles.map((st, idx) => {
              const isActive = currentStep === st.step;
              const isPast = currentStep > st.step;
              return (
                <div key={st.step} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-600/30'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-4 text-center">{st.step}</span>
                    )}
                    <span>{st.label}</span>
                  </div>
                  {idx < stepTitles.length - 1 && (
                    <div
                      className={`h-0.5 w-4 rounded-full ${
                        isPast ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[calc(92vh-180px)]">
          {generalError && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span>{generalError}</span>
              <button
                onClick={() => setGeneralError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {currentStep === 1 && (
            <StepUploadFile
              file={file}
              onFileSelect={handleFileSelect}
              onFileRemove={handleResetWizard}
              error={generalError}
            />
          )}

          {currentStep === 2 && (
            <StepSelectSheet
              sheets={sheets}
              selectedSheetName={selectedSheetName}
              onSelectSheet={handleSelectSheet}
            />
          )}

          {currentStep === 3 && (
            <StepMapColumns
              mappingItems={mappingItems}
              onUpdateMapping={handleUpdateMapping}
              onApplyTemplate={handleApplyTemplate}
              onIgnoreAllUnmapped={handleIgnoreAllUnmapped}
              savedTemplates={savedTemplates}
              onRefreshTemplates={() =>
                setSavedTemplates(excelImportService.getMappingTemplates())
              }
            />
          )}

          {currentStep === 4 && validationSummary && (
            <StepValidateData
              summary={validationSummary}
              projects={parsedProjects}
              duplicateMode={duplicateMode}
              onDuplicateModeChange={setDuplicateMode}
              onBackToMapping={() => setCurrentStep(3)}
              onReupload={handleResetWizard}
              onProceedToPreview={() => setCurrentStep(5)}
            />
          )}

          {currentStep === 5 && (
            <StepPreviewProjects
              projects={parsedProjects}
              onBack={() => setCurrentStep(4)}
              onExecuteImport={handleExecuteBulkImport}
              isLoading={isExecuting}
            />
          )}

          {currentStep === 6 && (
            <StepBulkExecute
              progressPercentage={executionProgress}
              currentProjectIndex={currentExecutingProjIndex || parsedProjects.length}
              totalProjects={parsedProjects.length}
              currentProjectName={currentExecutingProjName || parsedProjects[0]?.projectName || 'Processing...'}
              tasksCreated={executionTasksCreated}
              totalTasks={validationSummary?.totalTasks || 0}
              logs={executionLogs}
              isCompleted={false}
              error={generalError}
            />
          )}

          {currentStep === 7 && executionResult && (
            <StepImportSummary
              result={executionResult}
              onViewProjects={handleFinishAndClose}
              onImportAnother={handleResetWizard}
            />
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            {currentStep > 1 && currentStep < 6 && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 2) setCurrentStep(1);
                  else if (currentStep === 3) setCurrentStep(sheets.length > 1 ? 2 : 1);
                  else if (currentStep === 4) setCurrentStep(3);
                  else if (currentStep === 5) setCurrentStep(4);
                }}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 6 && (
              <button
                type="button"
                onClick={onClose}
                disabled={isExecuting}
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-slate-200/60 text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            {/* Step 1 Next */}
            {currentStep === 1 && file && (
              <button
                type="button"
                onClick={() => setCurrentStep(sheets.length > 1 ? 2 : 3)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Step 2 Next */}
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Confirm Sheet</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Step 3 Next */}
            {currentStep === 3 && (
              <button
                type="button"
                onClick={runValidationAndProceed}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Validate Entire Dataset</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Step 4 Next */}
            {currentStep === 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                disabled={validationSummary?.status === 'IMPORT_BLOCKED'}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Proceed to Preview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Step 5 Next */}
            {currentStep === 5 && (
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                disabled={isExecuting || parsedProjects.filter((p) => p.isValid).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <span>Create All {parsedProjects.filter((p) => p.isValid).length} Projects</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {/* Step 7 Done */}
            {currentStep === 7 && (
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
