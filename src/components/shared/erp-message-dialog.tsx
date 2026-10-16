'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ErpMessageIndicator = 'red' | 'orange' | 'blue' | 'green';

export interface ErpMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  indicator?: ErpMessageIndicator;
}

export function ErpMessageDialog({
  isOpen,
  onClose,
  title = 'Message',
  message,
  indicator = 'red',
}: ErpMessageDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  // Determine indicator dot color matching native Frappe Desk styles
  const getIndicatorColor = () => {
    switch (indicator) {
      case 'orange':
        return 'bg-amber-500';
      case 'blue':
        return 'bg-sky-500';
      case 'green':
        return 'bg-emerald-500';
      case 'red':
      default:
        return 'bg-rose-500';
    }
  };

  const hasHtml = /<[a-z][\s\S]*>/i.test(message);

  // Enhance safe anchor tags with target="_blank" and rel attributes
  const safeMessageHtml = hasHtml
    ? message.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi, (match, href) => {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"`;
      })
    : message;

  return (
    <AnimatePresence>
      <div
        id="erp-message-modal-overlay"
        onClick={onClose}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="erp-message-title"
      >
        <motion.div
          id="erp-message-dialog"
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
        >
          {/* Native Frappe / ERPNext Style Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5">
              <span
                id="erp-message-indicator"
                className={`w-2 h-2 rounded-full ${getIndicatorColor()} shrink-0 inline-block`}
              />
              <h3 id="erp-message-title" className="text-sm font-semibold text-slate-800 tracking-tight">
                {title || 'Message'}
              </h3>
            </div>
            <button
              id="erp-message-close-btn"
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Native Frappe / ERPNext Style Modal Body */}
          <div className="p-5 text-sm text-slate-700 leading-relaxed font-normal bg-white">
            {hasHtml ? (
              <div
                id="erp-message-content"
                className="[&_a]:text-sky-600 [&_a]:underline [&_a]:font-semibold [&_a:hover]:text-sky-700 break-words"
                dangerouslySetInnerHTML={{ __html: safeMessageHtml }}
              />
            ) : (
              <p id="erp-message-content" className="break-words">
                {message}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
