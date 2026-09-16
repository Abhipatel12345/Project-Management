'use client';

import React, { useState } from 'react';
import {
  PDM_FIELD_DEFINITIONS,
  excelImportService,
} from '@/services/excel-import.service';
import {
  ColumnMappingItem,
  MappingTemplate,
  PDMFieldId,
} from '@/types/excel-import.types';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  BookmarkPlus,
  Save,
  RotateCcw,
  Check,
  HelpCircle,
  FolderKanban,
  FileCheck,
  ListTodo,
  Users,
  EyeOff,
  Trash2,
} from 'lucide-react';

interface StepMapColumnsProps {
  mappingItems: ColumnMappingItem[];
  onUpdateMapping: (excelColumn: string, newField: PDMFieldId) => void;
  onApplyTemplate: (template: MappingTemplate) => void;
  onIgnoreAllUnmapped: () => void;
  savedTemplates: MappingTemplate[];
  onRefreshTemplates: () => void;
}

export function StepMapColumns({
  mappingItems,
  onUpdateMapping,
  onApplyTemplate,
  onIgnoreAllUnmapped,
  savedTemplates,
  onRefreshTemplates,
}: StepMapColumnsProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);

  // Group definitions by category
  const categories = ['Project', 'Phase & Milestone', 'Task', 'RASIC', 'Other'] as const;

  const unmappedCount = mappingItems.filter(
    (m) => m.mappingType === 'unmapped' || m.pdmField === 'ignore'
  ).length;

  const autoMappedCount = mappingItems.filter((m) => m.mappingType === 'auto').length;
  const manualMappedCount = mappingItems.filter((m) => m.mappingType === 'manual').length;

  // Check required fields mapped
  const mappedFieldIds = new Set(mappingItems.map((m) => m.pdmField));
  const hasProjectIdentifier = mappedFieldIds.has('project_id') || mappedFieldIds.has('project_name');
  const hasTaskName = mappedFieldIds.has('task_name');

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;
    const found = savedTemplates.find((t) => t.id === tmplId);
    if (found) {
      onApplyTemplate(found);
    }
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const currentMappings: Record<string, PDMFieldId> = {};
    mappingItems.forEach((m) => {
      currentMappings[m.excelColumn] = m.pdmField;
    });

    excelImportService.saveMappingTemplate(newTemplateName.trim(), currentMappings);
    setTemplateSaveSuccess(`Template "${newTemplateName}" saved successfully!`);
    setTimeout(() => setTemplateSaveSuccess(null), 3500);
    setNewTemplateName('');
    setIsSavingTemplate(false);
    onRefreshTemplates();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Project':
        return <FolderKanban className="h-3.5 w-3.5 text-sky-600" />;
      case 'Phase & Milestone':
        return <FileCheck className="h-3.5 w-3.5 text-indigo-600" />;
      case 'Task':
        return <ListTodo className="h-3.5 w-3.5 text-emerald-600" />;
      case 'RASIC':
        return <Users className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Bar & Stats Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>ERP-Style Column Mapping</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
              {mappingItems.length} Columns Detected
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Map every Excel column to its corresponding PDM data field. Auto-mappings are suggested below with manual override.
          </p>
        </div>

        {/* Template Selector & Save Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Bookmark className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-slate-500 font-medium">Saved Template:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer max-w-[200px]"
            >
              <option value="">-- Apply Preset / Template --</option>
              {savedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isBuiltIn ? '(Built-in)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsSavingTemplate(!isSavingTemplate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition cursor-pointer"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>Save Mapping Template</span>
          </button>
        </div>
      </div>

      {/* Save Template Modal / Inline Form */}
      {isSavingTemplate && (
        <form
          onSubmit={handleSaveTemplateSubmit}
          className="p-4 rounded-2xl bg-sky-500/10 border border-sky-300 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-sky-900 block mb-1">
              Template Name (e.g., &quot;Inteva Standard Project Import&quot; or &quot;APQP Schedule&quot;)
            </label>
            <input
              type="text"
              required
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Enter template name..."
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto mt-2 sm:mt-5 shrink-0">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Save Template
            </button>
            <button
              type="button"
              onClick={() => setIsSavingTemplate(false)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {templateSaveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{templateSaveSuccess}</span>
        </div>
      )}

      {/* Required Fields Status Card */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-500 font-medium">Project Identifier:</span>
          {hasProjectIdentifier ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1">
              <Check className="h-3 w-3" /> Mapped
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold flex items-center gap-1">
              Required
            </span>
          )}
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-500 font-medium">Task Name:</span>
          {hasTaskName ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1">
              <Check className="h-3 w-3" /> Mapped
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold flex items-center gap-1">
              Required
            </span>
          )}
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-500 font-medium">Auto-Mapped:</span>
          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-extrabold">
            {autoMappedCount}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
          <span className="text-slate-500 font-medium">Unmapped / Ignored:</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold">
            {unmappedCount}
          </span>
        </div>
      </div>

      {/* Unmapped Columns Warning Banner */}
      {unmappedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Unmapped Columns Detected ({unmappedCount}): </span>
              <span>
                Some Excel columns are unmapped or ignored. You can map them to custom fields or click &quot;Ignore All Unmapped&quot; to proceed safely without importing them.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onIgnoreAllUnmapped}
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
          >
            Ignore All Unmapped
          </button>
        </div>
      )}

      {/* Column Mapping Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-1/3">Excel Column Header & Samples</th>
                <th className="py-3 px-4 text-center w-12">→</th>
                <th className="py-3 px-4 w-1/3">Target PDM Field</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappingItems.map((item, idx) => {
                const targetDef = PDM_FIELD_DEFINITIONS.find((d) => d.id === item.pdmField);
                const isAuto = item.mappingType === 'auto';
                const isManual = item.mappingType === 'manual';
                const isIgnored = item.pdmField === 'ignore';
                const isUnmapped = item.mappingType === 'unmapped';

                return (
                  <tr
                    key={item.excelColumn}
                    className={`hover:bg-slate-50/80 transition ${
                      isUnmapped ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {item.excelColumn}
                      </div>
                      {item.sampleValues.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-sm">
                          Sample: {item.sampleValues.join(', ')}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center text-slate-400 font-bold">
                      →
                    </td>

                    <td className="py-3 px-4">
                      <div className="relative">
                        <select
                          value={item.pdmField}
                          onChange={(e) =>
                            onUpdateMapping(item.excelColumn, e.target.value as PDMFieldId)
                          }
                          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border transition focus:outline-none cursor-pointer ${
                            item.pdmField === 'ignore'
                              ? 'bg-slate-100 border-slate-200 text-slate-500'
                              : isUnmapped
                              ? 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-1 focus:ring-amber-500'
                              : 'bg-white border-slate-200 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:border-sky-500'
                          }`}
                        >
                          <option value="ignore">-- [ Ignore / Do Not Import ] --</option>

                          {categories.map((cat) => {
                            const fields = PDM_FIELD_DEFINITIONS.filter(
                              (f) => f.category === cat && f.id !== 'ignore'
                            );
                            return (
                              <optgroup key={cat} label={`── ${cat} Fields ──`}>
                                {fields.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.label} {f.required ? '*' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isAuto && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black">
                          <Sparkles className="h-3 w-3 text-sky-600" />
                          Auto Mapped
                        </span>
                      )}
                      {isManual && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Mapped
                        </span>
                      )}
                      {isIgnored && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          <EyeOff className="h-3 w-3 text-slate-400" />
                          Ignored
                        </span>
                      )}
                      {isUnmapped && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          Unmapped
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
