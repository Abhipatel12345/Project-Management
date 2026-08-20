import React from 'react';
import Link from 'next/link';
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
  Layers,
  ChevronRight,
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

  // Extract task ID if embedded in description or task property
  const extractedTaskMatch = issue.description?.match(/\[Task:\s*([^\]]+)\]/);
  const taskId = issue.task || (extractedTaskMatch ? extractedTaskMatch[1] : null);

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
            {/* Hierarchy Breadcrumb Banner */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-rose-700 font-mono font-bold">{issue.name}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              {taskId ? (
                <Link
                  href={`/tasks?search=${encodeURIComponent(taskId)}`}
                  onClick={onClose}
                  className="text-sky-700 hover:underline font-mono font-bold flex items-center gap-1"
                >
                  <Layers className="h-3 w-3 text-sky-600" />
                  {taskId}
                </Link>
              ) : (
                <span className="text-slate-400">No Task Linked</span>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              {issue.project ? (
                <Link
                  href={`/projects/${encodeURIComponent(issue.project)}`}
                  onClick={onClose}
                  className="text-indigo-700 hover:underline font-mono font-bold flex items-center gap-1"
                >
                  <FolderKanban className="h-3 w-3 text-indigo-600" />
                  {issue.project}
                </Link>
              ) : (
                <span className="text-slate-400">No Project Linked</span>
              )}
            </div>

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
              <FolderKanban className="h-4 w-4 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Associated Project</div>
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {issue.project ? (
                    <Link
                      href={`/projects/${encodeURIComponent(issue.project)}`}
                      onClick={onClose}
                      className="text-indigo-600 hover:underline"
                    >
                      {issue.project}
                    </Link>
                  ) : (
                    'Unassigned Project'
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Layers className="h-4 w-4 text-sky-600 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Associated Work Package / Task</div>
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {taskId ? (
                    <Link
                      href={`/tasks?search=${encodeURIComponent(taskId)}`}
                      onClick={onClose}
                      className="text-sky-600 hover:underline"
                    >
                      {taskId}
                    </Link>
                  ) : (
                    'General Project Issue'
                  )}
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

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => onDelete(issue.name)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> Delete Issue
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  onEdit(issue);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Edit2 className="h-4 w-4" /> Edit Issue
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
