import React from 'react';
import { Loader2 } from 'lucide-react';

interface TaskDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  taskSubject?: string;
  isLoading?: boolean;
}

export function TaskDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  taskSubject = 'this task',
  isLoading = false,
}: TaskDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-black text-slate-900">Delete Work Package Task?</h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-slate-800">"{taskSubject}"</span>? This action will permanently remove the record from ERPNext.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
