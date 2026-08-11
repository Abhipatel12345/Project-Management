import React from 'react';
import { Issue } from '@/types/issue.types';
import { IssueStatusBadge } from './issue-status-badge';
import { IssuePriorityBadge } from './issue-priority-badge';
import {
  X,
  AlertTriangle,
  FolderKanban,
  User,
  Calendar,
  FileText,
  Tag,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IssueDetailModalProps {
  issue: Issue | null;
  onClose: () => void;
  onEdit: (issue: Issue) => void;
  onDelete: (issueName: string) => void;
}

export function IssueDetailModal({
  issue,
  onClose,
  onEdit,
  onDelete,
}: IssueDetailModalProps) {
  if (!issue) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-3 border-b border-slate-100 pb-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                {issue.name}
              </span>
              <IssueStatusBadge status={issue.status} />
              <IssuePriorityBadge priority={issue.priority} />
            </div>

            <h2 className="text-xl font-black text-slate-900 leading-snug">
              {issue.subject}
            </h2>
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
            <div className="flex items-start gap-2.5">
              <FolderKanban className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Associated Project</div>
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {issue.project || 'Unassigned Project'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Tag className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Issue Category</div>
                <div className="text-xs font-bold text-slate-900">
                  {issue.issue_type || 'Technical'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Assigned Person</div>
                <div className="text-xs font-bold text-slate-900">
                  {issue.assigned_to || 'Unassigned'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Creation Date</div>
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {issue.creation || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Description & Technical Scope */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              Technical Scope & Description
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
              {issue.description || 'No description provided for this issue.'}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => onDelete(issue.name)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Issue</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => onEdit(issue)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Issue</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
