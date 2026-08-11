import React, { useState, useMemo } from 'react';
import { DesignReview } from '@/types/design-review.types';
import {
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  FolderKanban,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Tag,
} from 'lucide-react';

interface DesignReviewTableViewProps {
  reviews: DesignReview[];
  onViewReview: (review: DesignReview) => void;
  onEditReview: (review: DesignReview) => void;
  onDeleteReview: (reviewName: string) => void;
}

export function DesignReviewTableView({
  reviews,
  onViewReview,
  onEditReview,
  onDeleteReview,
}: DesignReviewTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.project && r.project.toLowerCase().includes(q)) ||
          (r.reviewer && r.reviewer.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((r) => r.review_type === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter);
    }

    return result;
  }, [reviews, searchQuery, typeFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Completed
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-500" />
            In Progress
          </span>
        );
      case 'Planned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Planned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getApprovalBadge = (approval: string) => {
    switch (approval) {
      case 'Approved':
      case 'Approved with Conditions':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800">
            {approval}
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
            {approval || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search review title, ID, project, reviewer..."
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Review Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Review Types</option>
          <option value="Concept Review">Concept Review</option>
          <option value="Preliminary Design Review">Preliminary Design Review</option>
          <option value="Detailed Design Review">Detailed Design Review</option>
          <option value="Engineering Review">Engineering Review</option>
          <option value="Design Validation Review">Design Validation Review</option>
          <option value="Final Design Review">Final Design Review</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Planned">Planned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Main Design Review Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Review ID & Title</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Review Type</th>
                <th className="py-3.5 px-4">Owner & Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Findings</th>
                <th className="py-3.5 px-4 text-center">Approval</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No design reviews found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const openFindingsCount = (review.findings || []).filter(
                    (f) => f.status === 'Open' || f.status === 'In Progress'
                  ).length;

                  return (
                    <tr key={review.name} className="hover:bg-slate-50/80 transition">
                      {/* ID & Title */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 line-clamp-1 max-w-[240px]" title={review.title}>
                            {review.title}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-indigo-700">{review.name}</div>
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-3 px-4">
                        {review.project ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <FolderKanban className="h-3 w-3 text-slate-400" />
                            {review.project}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Review Type */}
                      <td className="py-3 px-4 text-slate-700 font-semibold text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {review.review_type}
                        </span>
                      </td>

                      {/* Owner & Date */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-800 text-[11px] font-bold">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate max-w-[110px]">{review.reviewer}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">{review.review_date || 'N/A'}</div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">{getStatusBadge(review.status)}</td>

                      {/* Findings Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            openFindingsCount > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {review.findings?.length || 0} Total ({openFindingsCount} Open)
                        </span>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3 px-4 text-center">{getApprovalBadge(review.approval_status)}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewReview(review)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="View Design Review & Action Items"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditReview(review)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Review Details"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteReview(review.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Design Review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
