'use client';

import React from 'react';
import { DocumentItem } from '@/types/document.types';
import { X, Download, FileText, ExternalLink, AlertCircle, FileCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auditService } from '@/services/audit.service';
import { useAuth } from '@/providers/auth-context';

interface DocumentViewerModalProps {
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewerModal({ document: doc, isOpen, onClose }: DocumentViewerModalProps) {
  const { user } = useAuth();

  if (!isOpen || !doc) return null;

  const fileName = doc.file_name || doc.title || 'document';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const fileUrl = doc.file_url || '';

  const isPdf = fileExt === 'pdf' || fileUrl.includes('application/pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(fileExt) || fileUrl.startsWith('data:image/');
  const isText = ['txt', 'csv', 'json', 'md', 'xml'].includes(fileExt);

  const handleDownload = async () => {
    try {
      auditService.logAction(
        user?.fullName || 'User',
        'Downloaded Document',
        'Document',
        doc.name,
        `Downloaded attachment ${fileName} for project ${doc.project || 'Global'}`
      );

      const { documentService } = await import('@/services/document.service');
      await documentService.downloadDocument(doc.project, doc.name, fileName);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Unable to download this document because the file is no longer available.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white text-slate-900 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-sky-700 font-bold">{doc.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                    {doc.version}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                    {doc.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{doc.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Document Content View Area */}
          <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
            {isPdf && fileUrl ? (
              <iframe
                src={fileUrl}
                className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-inner"
                title={fileName}
              />
            ) : isImage && fileUrl ? (
              <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-h-[70vh] max-w-full rounded-2xl border border-slate-300 shadow-md object-contain"
                />
              </div>
            ) : (
              <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
                <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{fileName}</h4>
                  <p className="text-xs text-slate-500">
                    Inline browser preview is not supported for <span className="font-mono font-bold">.{fileExt}</span> files.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1 font-mono">
                  <div><span className="text-slate-400">Document ID:</span> {doc.name}</div>
                  <div><span className="text-slate-400">Project:</span> {doc.project || 'Global'}</div>
                  <div><span className="text-slate-400">Uploaded By:</span> {doc.uploaded_by}</div>
                  <div><span className="text-slate-400">Upload Date:</span> {doc.upload_date || 'N/A'}</div>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Download File Attachment
                </button>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="px-6 py-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between text-xs text-slate-500">
            <div>
              <span className="font-bold text-slate-700">Project:</span> {doc.project || 'Global Vault'}
            </div>
            <div>
              <span className="font-bold text-slate-700">Uploaded By:</span> {doc.uploaded_by} ({doc.upload_date})
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
