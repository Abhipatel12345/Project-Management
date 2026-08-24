'use client';

import React, { useState, useEffect } from 'react';
import { ConnectionItemConfig, ConnectionFormField } from '@/types/connection.types';
import { useCreateConnectionRecord } from '@/hooks/use-project-connections';
import { useToast } from '@/providers/toast-context';
import { useAuth } from '@/providers/auth-context';
import documentService from '@/services/document.service';
import { auditService } from '@/services/audit.service';
import {
  X,
  Loader2,
  Plus,
  CheckSquare,
  UploadCloud,
  Paperclip,
  FileText,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  itemConfig: ConnectionItemConfig | null;
  onSuccess?: () => void;
}

export function ConnectionCreateModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  itemConfig,
  onSuccess,
}: ConnectionCreateModalProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const createRecordMutation = useCreateConnectionRecord();

  const [formState, setFormState] = useState<Record<string, any>>({});
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; size: number; file: File; dataUrl: string }[]
  >([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form default values
  useEffect(() => {
    if (isOpen && itemConfig) {
      const initial: Record<string, any> = {};
      itemConfig.fields?.forEach((f) => {
        if (f.defaultValue !== undefined) {
          initial[f.name] = f.defaultValue;
        } else {
          initial[f.name] = '';
        }
      });
      setFormState(initial);
      setAttachedFiles([]);
      setValidationError(null);
    }
  }, [isOpen, itemConfig]);

  if (!isOpen || !itemConfig) return null;

  const handleChange = (name: string, value: any) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            file,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate required fields
    const requiredField = itemConfig.fields?.find(
      (f) => f.required && !formState[f.name]?.toString().trim()
    );
    if (requiredField) {
      setValidationError(`Please fill out the required field: ${requiredField.label}`);
      return;
    }

    // Build payload with linked Project ID
    const projectFieldName = itemConfig.projectField || 'project';
    const payload: Record<string, any> = {
      ...formState,
      [projectFieldName]: projectId,
    };

    try {
      const createdRecord: any = await createRecordMutation.mutateAsync({
        doctype: itemConfig.doctype,
        data: payload,
      });

      const recordIdentifier =
        createdRecord?.name || formState.item || formState.title || formState.subject || 'Record';

      // Upload attached files linked to this Connection record
      for (const att of attachedFiles) {
        try {
          await documentService.uploadDocument({
            title: att.name,
            project: projectId,
            document_type:
              itemConfig.doctype === 'BOM' || itemConfig.doctype === 'Material Request'
                ? 'Specification'
                : 'Engineering',
            version: 'v1.0',
            uploaded_by: user?.fullName || 'Administrator',
            file_name: att.name,
            file_size: att.size,
            file_url: att.dataUrl,
            file_data: att.dataUrl,
            status: 'Approved',
            review_status: 'Approved',
            entity_type: itemConfig.doctype,
            entity_id: recordIdentifier,
            description: `Document attached to ${itemConfig.doctype} (${recordIdentifier})`,
          });
        } catch (docErr) {
          console.warn('[Connection Doc Upload Warning]', docErr);
        }
      }

      auditService.logAction(
        user?.fullName || 'Administrator',
        `${itemConfig.label} Created`,
        itemConfig.doctype as any,
        recordIdentifier,
        `Created ${itemConfig.label} for Project ${projectId} with ${attachedFiles.length} attached document(s).`,
        undefined,
        undefined,
        user?.roleLabel,
        projectId
      );

      showToast(`New ${itemConfig.label} created successfully in ERPNext!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setValidationError(err.message || `Failed to create ${itemConfig.label} in ERPNext`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EBF5FF]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Create {itemConfig.label}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Auto-linked to Project: <span className="font-bold text-slate-800">{projectName}</span> ({projectId})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {validationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ⚠️ {validationError}
              </div>
            )}

            {/* Readonly Pre-Linked Project Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Associated Project</label>
              <input
                type="text"
                disabled
                value={`${projectName} (${projectId})`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold cursor-not-allowed"
              />
            </div>

            {/* Dynamic DocType Form Fields */}
            {itemConfig.fields?.map((f: ConnectionFormField) => (
              <div key={f.name} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {f.label} {f.required && <span className="text-rose-500">*</span>}
                </label>

                {f.type === 'select' ? (
                  <select
                    value={formState[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={formState[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                ) : f.type === 'date' ? (
                  <input
                    type="date"
                    value={formState[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  />
                ) : f.type === 'number' ? (
                  <input
                    type="number"
                    value={formState[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={formState[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                )}
              </div>
            ))}

            {/* Document Upload Zone for Connection Record */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-sky-600" />
                  Attach Supporting Documents (CAD, Specs, Drawings)
                </span>
                <span className="text-[10px] text-slate-400">PDF, XLS, DOC, Images</span>
              </label>

              <label className="p-3.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <UploadCloud className="h-5 w-5 text-sky-600" />
                <p className="text-xs font-bold text-slate-700">Click or drag files to attach</p>
              </label>

              {/* Uploaded Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-1 pt-1">
                  {attachedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{f.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={createRecordMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {createRecordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Save {itemConfig.label}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
