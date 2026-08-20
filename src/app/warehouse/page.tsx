'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-context';
import { materialRequestService } from '@/services/material-request.service';
import { MaterialRequestItem, MaterialRequestStatus } from '@/types/material-request.types';
import { BackButton } from '@/components/shared/back-button';
import { Pagination } from '@/components/shared/pagination';
import { ImportExportControls } from '@/components/shared/import-export-controls';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ArrowRight,
  PackageCheck,
  PackageX,
  Truck,
  ShieldCheck,
  History,
  Building2,
  User,
  Calendar,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export default function WarehousePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaterialRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReq, setSelectedReq] = useState<MaterialRequestItem | null>(null);
  const [shortageModalOpen, setShortageModalOpen] = useState(false);
  const [availStockInput, setAvailStockInput] = useState<number>(0);
  const [shortageRemarks, setShortageRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = () => {
    const data = materialRequestService.getRequests();
    setRequests(data);
    if (data.length > 0 && !selectedReq) {
      setSelectedReq(data[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.materialCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requestedByName.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING')
      return matchesSearch && (r.status === 'REQUESTED' || r.status === 'WAREHOUSE_REVIEW');
    if (statusFilter === 'ISSUED') return matchesSearch && r.status === 'ISSUED';
    if (statusFilter === 'SHORTAGE')
      return matchesSearch && (r.status === 'STOCK_NOT_AVAILABLE' || r.status === 'PROCUREMENT_REQUIRED');
    return matchesSearch;
  });

  const handleAction = async (nextStatus: MaterialRequestStatus, remarks?: string) => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      const updated = materialRequestService.updateStatus(
        selectedReq.name,
        nextStatus,
        user?.fullName || 'Warehouse Specialist',
        remarks
      );
      setSelectedReq(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShortageSubmit = () => {
    if (!selectedReq) return;
    const shortageQty = Math.max(0, selectedReq.quantity - availStockInput);
    setActionLoading(true);
    try {
      const updated = materialRequestService.updateStatus(
        selectedReq.name,
        'STOCK_NOT_AVAILABLE',
        user?.fullName || 'Warehouse Specialist',
        shortageRemarks || `Stock shortage: Only ${availStockInput} available. Shortage of ${shortageQty} units.`,
        shortageQty
      );
      setSelectedReq(updated);
      setShortageModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: MaterialRequestStatus) => {
    switch (status) {
      case 'ISSUED':
      case 'RECEIVED':
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> {status}
          </span>
        );
      case 'RESERVED':
      case 'STOCK_AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <PackageCheck className="h-3 w-3" /> {status}
          </span>
        );
      case 'STOCK_NOT_AVAILABLE':
      case 'PROCUREMENT_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <PackageX className="h-3 w-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-sky-600/20 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold text-xl shadow-lg shadow-sky-500/10">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Warehouse & Materials Depot</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Supply Chain Execution
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review project material requisitions, verify bin stock, reserve components, and log material issuances.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BackButton fallbackUrl="/dashboard" />
          <ImportExportControls
            entityName="Material Requests"
            dataToExport={requests}
            exportFilename="pdm_material_requests"
          />
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Requisitions List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requisitions List (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search MR ID, material, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'PENDING', 'ISSUED', 'SHORTAGE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap',
                    statusFilter === st
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No material requisitions found matching the selected filter.
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isSelected = selectedReq?.name === req.name;
                return (
                  <div
                    key={req.name}
                    onClick={() => setSelectedReq(req)}
                    className={cn(
                      'p-4 rounded-2xl border transition cursor-pointer space-y-2',
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-sky-400">{req.name}</span>
                        <span className="text-xs font-semibold text-slate-200">{req.materialName}</span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[240px]">{req.projectName}</span>
                      <span className="font-semibold text-slate-300">
                        Qty: <strong className="text-white font-bold">{req.quantity}</strong>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                      <span>Requester: {req.requestedByName}</span>
                      <span>Required By: {req.requiredDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Request Detail Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          {selectedReq ? (
            <>
              {/* Top Banner */}
              <div className="space-y-2 pb-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-sky-400">{selectedReq.name}</span>
                  {getStatusBadge(selectedReq.status)}
                </div>
                <h2 className="text-base font-bold text-white leading-tight">{selectedReq.materialName}</h2>
                <div className="text-xs font-mono text-slate-400">Code: {selectedReq.materialCode}</div>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Quantity Requested</div>
                  <div className="text-base font-black text-white">{selectedReq.quantity} units</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">On-Hand Stock</div>
                  <div className="text-base font-black text-emerald-400">
                    {selectedReq.availableStock ?? 25} units
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 col-span-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Project</div>
                  <div className="font-semibold text-slate-200 truncate">{selectedReq.projectName}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Warehouse Bin</div>
                  <div className="font-semibold text-slate-300">{selectedReq.warehouse}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Required Date</div>
                  <div className="font-semibold text-slate-300">{selectedReq.requiredDate}</div>
                </div>
              </div>

              {/* Action Buttons for Warehouse Flow */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-300">Warehouse Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReq.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleAction('WAREHOUSE_REVIEW', 'Received for warehouse review')}
                      disabled={actionLoading}
                      className="col-span-2 py-2.5 px-3 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center justify-center gap-2"
                    >
                      <span>1. Check Stock</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {(selectedReq.status === 'REQUESTED' || selectedReq.status === 'WAREHOUSE_REVIEW') && (
                    <>
                      <button
                        onClick={() => handleAction('RESERVED', 'Stock verified and reserved for project')}
                        disabled={actionLoading}
                        className="py-2.5 px-3 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center justify-center gap-1.5"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>Reserve Stock</span>
                      </button>
                      <button
                        onClick={() => {
                          setAvailStockInput(selectedReq.availableStock || 5);
                          setShortageModalOpen(true);
                        }}
                        disabled={actionLoading}
                        className="py-2.5 px-3 text-xs font-bold rounded-xl bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white transition flex items-center justify-center gap-1.5"
                      >
                        <PackageX className="h-3.5 w-3.5" />
                        <span>Stock Shortage</span>
                      </button>
                    </>
                  )}

                  {selectedReq.status === 'RESERVED' && (
                    <button
                      onClick={() => handleAction('ISSUED', 'Material issued to project team')}
                      disabled={actionLoading}
                      className="col-span-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Issue Material to Project</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Timestamped Audit History */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <History className="h-3.5 w-3.5 text-sky-400" />
                  <span>Audit & Material Movement History</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedReq.auditTrail.map((entry, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-400">{entry.status}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-300">{entry.remarks}</div>
                      <div className="text-[10px] text-slate-500">By: {entry.updatedBy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a material request card to inspect details and warehouse actions.
            </div>
          )}
        </div>
      </div>

      {/* Shortage Modal */}
      {shortageModalOpen && selectedReq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <AlertTriangle className="h-5 w-5" />
              <span>Log Stock Shortage</span>
            </div>
            <p className="text-xs text-slate-400">
              Record available stock quantity for <strong className="text-white">{selectedReq.materialName}</strong>. This will set status to <strong>STOCK NOT AVAILABLE / PROCUREMENT REQUIRED</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Available Quantity in Stock</label>
                <input
                  type="number"
                  value={availStockInput}
                  onChange={(e) => setAvailStockInput(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Shortage Quantity</label>
                <input
                  type="number"
                  disabled
                  value={Math.max(0, selectedReq.quantity - availStockInput)}
                  className="w-full mt-1 p-2.5 text-xs bg-slate-950/50 border border-slate-800 rounded-xl text-rose-400 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Warehouse Remarks</label>
                <textarea
                  rows={3}
                  value={shortageRemarks}
                  onChange={(e) => setShortageRemarks(e.target.value)}
                  placeholder="Reason for shortage or procurement request note..."
                  className="w-full mt-1 p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShortageModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleShortageSubmit}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
              >
                Submit Shortage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
