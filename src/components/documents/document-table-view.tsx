import React, { useState, useMemo } from 'react';
import { DocumentItem } from '@/types/document.types';
import {
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  Tag,
  User,
  FolderKanban,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface DocumentTableViewProps {
  documents: DocumentItem[];
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onViewDocument: (doc: DocumentItem) => void;
  onEditDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docName: string) => void;
}

export function DocumentTableView({
  documents,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  onViewDocument,
  onEditDocument,
  onDeleteDocument,
}: DocumentTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [internalStatusFilter, setInternalStatusFilter] = useState('ALL');

  const statusFilter = controlledStatusFilter !== undefined ? controlledStatusFilter : internalStatusFilter;
  const setStatusFilter = (val: string) => {
    setInternalStatusFilter(val);
    if (onStatusFilterChange) onStatusFilterChange(val);
  };

  const filteredDocs = useMemo(() => {
    let result = [...documents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.project && d.project.toLowerCase().includes(q)) ||
          (d.uploaded_by && d.uploaded_by.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((d) => d.document_type === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((d) => d.status === statusFilter);
    }

    return result;
  }, [documents, searchQuery, typeFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Approved
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-500" />
            Under Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-500" />
            Rejected
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {status}
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
            placeholder="Search document title, ID, project..."
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        {/* Document Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Document Types</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Specification">Specification</option>
          <option value="Quality">Quality</option>
          <option value="Testing">Testing</option>
          <option value="APQP">APQP</option>
          <option value="Process">Process</option>
          <option value="Customer">Customer</option>
          <option value="Other">Other</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Main Document Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Document Title & ID</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Type & Version</th>
                <th className="py-3.5 px-4">Uploaded By</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No documents found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.name} className="hover:bg-slate-50/80 transition">
                    {/* Title & ID */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 line-clamp-1 max-w-[260px]" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-sky-700">{doc.name}</div>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4">
                      {doc.project ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <FolderKanban className="h-3 w-3 text-slate-400" />
                          {doc.project}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Type & Version */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-slate-700 text-[11px] font-semibold">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {doc.document_type}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 font-bold">{doc.version}</div>
                      </div>
                    </td>

                    {/* Uploaded By */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 text-[11px] font-bold">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">{doc.uploaded_by || 'Administrator'}</span>
                      </div>
                    </td>

                    {/* Upload Date */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {doc.upload_date || 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">{getStatusBadge(doc.status)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                          title="View Document Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditDocument(doc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Document Metadata"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteDocument(doc.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Document"
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
