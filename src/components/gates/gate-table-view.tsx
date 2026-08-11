import React, { useState, useMemo } from 'react';
import { Gate } from '@/types/gate.types';
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
  Lock,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface GateTableViewProps {
  gates: Gate[];
  onViewGate: (gate: Gate) => void;
  onEditGate: (gate: Gate) => void;
  onDeleteGate: (gateName: string) => void;
}

export function GateTableView({
  gates,
  onViewGate,
  onEditGate,
  onDeleteGate,
}: GateTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');

  // Extract unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    gates.forEach((g) => {
      if (g.gate_owner) set.add(g.gate_owner);
    });
    return Array.from(set);
  }, [gates]);

  const filteredGates = useMemo(() => {
    let result = [...gates];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.gate_name.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q) ||
          (g.project && g.project.toLowerCase().includes(q)) ||
          (g.gate_owner && g.gate_owner.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((g) => g.gate_type === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((g) => g.status === statusFilter);
    }

    if (approvalFilter !== 'ALL') {
      result = result.filter((g) => g.approval_status === approvalFilter);
    }

    if (ownerFilter !== 'ALL') {
      result = result.filter((g) => g.gate_owner === ownerFilter);
    }

    return result;
  }, [gates, searchQuery, typeFilter, statusFilter, approvalFilter, ownerFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {status}
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-500" />
            In Progress
          </span>
        );
      case 'Ready for Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Ready for Review
          </span>
        );
      case 'Blocked':
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-500" />
            {status}
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
            {approval}
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
            {approval || 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Gate ID, Gate Name, project, owner..."
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>

        {/* Gate Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Gate Types</option>
          <option value="Concept & Charter">Concept & Charter</option>
          <option value="APQP Stage-Gate">APQP Stage-Gate</option>
          <option value="Design Freeze">Design Freeze</option>
          <option value="FMEA & Risk Validation">FMEA & Risk Validation</option>
          <option value="Validation">Validation</option>
          <option value="Production Readiness">Production Readiness</option>
          <option value="Flawless Launch">Flawless Launch</option>
          <option value="Final Approval">Final Approval</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Ready for Review">Ready for Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Blocked">Blocked</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Gate Owner Filter */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Gate Owners</option>
          {uniqueOwners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      </div>

      {/* Main Gate Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Gate ID</th>
                <th className="py-3.5 px-4">Gate Name</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Gate Type</th>
                <th className="py-3.5 px-4">Gate Owner</th>
                <th className="py-3.5 px-4">Planned Date</th>
                <th className="py-3.5 px-4">Actual Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Readiness %</th>
                <th className="py-3.5 px-4 text-center">Approval</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredGates.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No stage-gates found matching your search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredGates.map((gate) => (
                  <tr key={gate.name} className="hover:bg-slate-50/80 transition">
                    {/* Gate ID */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-[11px]">
                      {gate.name}
                    </td>

                    {/* Gate Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 line-clamp-1 max-w-[220px]" title={gate.gate_name}>
                        {gate.gate_name}
                      </div>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4">
                      {gate.project ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <FolderKanban className="h-3 w-3 text-slate-400" />
                          {gate.project}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Gate Type */}
                    <td className="py-3 px-4 text-slate-700 font-semibold text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3 text-slate-400" />
                        {gate.gate_type}
                      </span>
                    </td>

                    {/* Gate Owner */}
                    <td className="py-3 px-4 font-bold text-slate-800 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">{gate.gate_owner}</span>
                      </div>
                    </td>

                    {/* Planned Date */}
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {gate.planned_date || 'N/A'}
                    </td>

                    {/* Actual Date */}
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {gate.actual_date || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">{getStatusBadge(gate.status)}</td>

                    {/* Readiness % */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-black font-mono ${
                          (gate.readiness_percentage || 0) >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : (gate.readiness_percentage || 0) >= 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {gate.readiness_percentage || 0}%
                      </span>
                    </td>

                    {/* Approval */}
                    <td className="py-3 px-4 text-center">{getApprovalBadge(gate.approval_status)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewGate(gate)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title="View Stage-Gate Criteria & Deliverables"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditGate(gate)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Stage-Gate Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteGate(gate.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Stage-Gate"
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
