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
}

export function ProjectDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  projectName = 'this project',
  isLoading = false,
}: ProjectDeleteDialogProps) {
  if (!isOpen) return null;

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
                Are you sure you want to delete <span className="font-bold text-slate-900">"{projectName}"</span>? This action will permanently remove the record from ERPNext and cannot be undone.
              </p>
            </div>
          </div>

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
