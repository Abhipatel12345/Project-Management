'use client';

import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  projectName?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
}

/**
 * Extracts and formats dynamic linked DocType and record ID from ERPNext error response
 * Produces: "Cannot delete: Project is linked with <DocType> <RecordId>."
 */
export function extractProjectDeleteErrorMessage(err: any): string {
  let raw = '';
  if (typeof err === 'string') {
    raw = err;
  } else if (err) {
    raw =
      err?.erpMessage?.message ||
      err?.erpMessage?.cleanMessage ||
      err?.message ||
      '';

    if (!raw && err?.response?.data?._server_messages) {
      try {
        const parsed =
          typeof err.response.data._server_messages === 'string'
            ? JSON.parse(err.response.data._server_messages)
            : err.response.data._server_messages;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const item =
            typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
          raw = item?.message || '';
        }
      } catch {
        // ignore parse error
      }
    }
  }

  // Strip HTML tags and decode basic entities
  const clean = raw
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  // Match 'is linked with <DocType> <RecordId>'
  const match = clean.match(/is linked with\s+(.+?)(?:\.|\s*$)/i);
  if (match) {
    const linkedPart = match[1].trim().replace(/\.+$/, '');
    return `Cannot delete: Project is linked with ${linkedPart}.`;
  }

  if (clean.toLowerCase().startsWith('cannot delete:')) {
    return clean.endsWith('.') ? clean : `${clean}.`;
  }

  if (clean) {
    const formatted = clean.endsWith('.') ? clean : `${clean}.`;
    return `Cannot delete: ${formatted}`;
  }

  return 'Cannot delete: Project is linked to another record.';
}

export function ProjectDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  projectName = 'this project',
  isLoading = false,
  errorMessage = null,
}: ProjectDeleteDialogProps) {
  if (!isOpen) return null;

  const displayProjectName = projectName ? projectName.trim() : 'this project';
  const cleanErrorText = errorMessage ? errorMessage.replace(/^🔴\s*/, '') : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 text-slate-800"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Delete Project Charter?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{displayProjectName}"</span>? This action will permanently remove the record from ERPNext and cannot be undone.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div
              id="project-delete-error"
              className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold"
            >
              <span className="text-rose-600 select-none shrink-0" aria-hidden="true">
                🔴
              </span>
              <span className="break-words leading-relaxed">{cleanErrorText}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Delete
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
