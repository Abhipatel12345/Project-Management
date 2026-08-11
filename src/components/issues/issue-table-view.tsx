import React, { useState, useMemo } from 'react';
import { Issue, IssueStatus, IssuePriority } from '@/types/issue.types';
import { IssueStatusBadge } from './issue-status-badge';
import { IssuePriorityBadge } from './issue-priority-badge';
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  Tag,
  User,
  Calendar,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';

interface IssueTableViewProps {
  issues: Issue[];
  onViewIssue: (issue: Issue) => void;
  onEditIssue: (issue: Issue) => void;
  onDeleteIssue: (issueName: string) => void;
}

export function IssueTableView({
  issues,
  onViewIssue,
  onEditIssue,
  onDeleteIssue,
}: IssueTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Filter issues
  const filteredIssues = useMemo(() => {
    let result = [...issues];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.subject.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.project && i.project.toLowerCase().includes(q)) ||
          (i.assigned_to && i.assigned_to.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((i) => i.priority === priorityFilter);
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((i) => i.issue_type === typeFilter);
    }

    return result;
  }, [issues, searchQuery, statusFilter, priorityFilter, typeFilter]);

  return (
    <div className="space-y-4 font-sans">
      {/* Controls & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issue ID, subject, project..."
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Replied">Replied</option>
          <option value="On Hold">On Hold</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent / Critical</option>
        </select>

        {/* Issue Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Issue Types</option>
          <option value="Technical">Technical</option>
          <option value="Defect">Defect</option>
          <option value="Quality">Quality</option>
          <option value="Safety">Safety</option>
          <option value="General">General</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Issue ID & Subject</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-center">Priority</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No issues found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.name} className="hover:bg-slate-50/80 transition">
                    {/* ID & Subject */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 line-clamp-1 max-w-[220px]" title={issue.subject}>
                          {issue.subject}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-sky-700">{issue.name}</div>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4">
                      {issue.project ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <FolderKanban className="h-3 w-3 text-slate-400" />
                          {issue.project}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Issue Type */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-700 text-[11px] font-semibold">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {issue.issue_type || 'Technical'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 text-center">
                      <IssuePriorityBadge priority={issue.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <IssueStatusBadge status={issue.status} />
                    </td>

                    {/* Assigned To */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 text-[11px] font-bold">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">{issue.assigned_to || 'Unassigned'}</span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {issue.creation || 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewIssue(issue)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditIssue(issue)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Issue"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteIssue(issue.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Issue"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
