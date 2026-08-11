import React from 'react';
import { DocumentItem } from '@/types/document.types';
import {
  X,
  FileText,
  FolderKanban,
  User,
  Clock,
  Download,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentDetailModalProps {
  document: DocumentItem;
  onClose: () => void;
  onEdit: (doc: DocumentItem) => void;
  onDelete: (docName: string) => void;
}

export function DocumentDetailModal({
  document: doc,
  onClose,
  onEdit,
  onDelete,
}: DocumentDetailModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-700">{doc.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {doc.version}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">{doc.title}</h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Project</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                {doc.project || 'General'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Type</span>
              <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                {doc.document_type}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              <p className="font-bold text-emerald-700 mt-0.5">{doc.status}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Review Status</span>
              <p className="font-bold text-sky-700 mt-0.5">{doc.review_status}</p>
            </div>
          </div>

          {/* Details & Notes */}
          <div className="space-y-4 text-xs">
            {doc.description && (
              <div className="space-y-1">
                <h3 className="font-bold text-slate-700 uppercase text-[10px]">Description</h3>
                <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                  {doc.description}
                </p>
              </div>
            )}

            {doc.notes && (
              <div className="space-y-1">
                <h3 className="font-bold text-slate-700 uppercase text-[10px]">Release / Review Notes</h3>
                <p className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 leading-relaxed font-medium">
                  {doc.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Uploaded by <strong className="text-slate-800">{doc.uploaded_by}</strong></span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Date: {doc.upload_date || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => onDelete(doc.name)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Document</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onEdit(doc)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Metadata</span>
              </button>

              <button
                onClick={() => alert(`Downloading attachment ${doc.file_name || doc.name}...`)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Download Attachment</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
