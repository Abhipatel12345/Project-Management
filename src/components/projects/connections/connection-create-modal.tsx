import React, { useState, useEffect } from 'react';
import { ConnectionItemConfig, ConnectionFormField } from '@/types/connection.types';
import { useCreateConnectionRecord } from '@/hooks/use-project-connections';
import { useToast } from '@/providers/toast-context';
import { X, Loader2, Plus, CheckSquare } from 'lucide-react';
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
  const createRecordMutation = useCreateConnectionRecord();

  const [formState, setFormState] = useState<Record<string, any>>({});
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
      setValidationError(null);
    }
  }, [isOpen, itemConfig]);

  if (!isOpen || !itemConfig) return null;

  const handleChange = (name: string, value: any) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate required fields
    const requiredField = itemConfig.fields?.find((f) => f.required && !formState[f.name]?.toString().trim());
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
      await createRecordMutation.mutateAsync({
        doctype: itemConfig.doctype,
        data: payload,
      });

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
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
                  />
                ) : (
                  <input
                    type={f.type}
                    value={formState[f.name] || ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
                  />
                )}
              </div>
            ))}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={createRecordMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRecordMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {createRecordMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Create {itemConfig.label}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
