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
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await materialRequestService.getRequestsFromERPNext();
      setRequests(data);
      if (data.length > 0 && !selectedReq) {
        setSelectedReq(data[0]);
      }
    } catch (err) {
      console.warn('Failed to load warehouse data:', err);
    } finally {
      setLoading(false);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {status}
          </span>
        );
      case 'RESERVED':
      case 'STOCK_AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <PackageCheck className="h-3 w-3 text-sky-600" /> {status}
          </span>
        );
      case 'STOCK_NOT_AVAILABLE':
      case 'PROCUREMENT_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <PackageX className="h-3 w-3 text-rose-600" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-bold text-xl shadow-xs">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Warehouse & Materials Depot</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                Supply Chain Execution
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
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
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Requisitions List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requisitions List (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search MR ID, material, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'PENDING', 'ISSUED', 'SHORTAGE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap cursor-pointer',
                    statusFilter === st
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
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
                        ? 'bg-sky-50/70 border-sky-500 shadow-sm'
                        : 'bg-white border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/20 shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-sky-600">{req.name}</span>
                        <span className="text-xs font-semibold text-slate-800">{req.materialName}</span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[240px]">{req.projectName}</span>
                      <span className="font-semibold text-slate-600">
                        Qty: <strong className="text-slate-900 font-bold">{req.quantity}</strong>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
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
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
          {selectedReq ? (
            <>
              {/* Top Banner */}
              <div className="space-y-2 pb-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-sky-600">{selectedReq.name}</span>
                  {getStatusBadge(selectedReq.status)}
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">{selectedReq.materialName}</h2>
                <div className="text-xs font-mono text-slate-500">Code: {selectedReq.materialCode}</div>
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Quantity Requested</div>
                  <div className="text-base font-black text-slate-900">{selectedReq.quantity} units</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">On-Hand Stock</div>
                  <div className="text-base font-black text-emerald-600">
                    {selectedReq.availableStock ?? 25} units
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 col-span-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Project</div>
                  <div className="font-semibold text-slate-800 truncate">{selectedReq.projectName}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Warehouse Bin</div>
                  <div className="font-semibold text-slate-700">{selectedReq.warehouse}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Required Date</div>
                  <div className="font-semibold text-slate-700">{selectedReq.requiredDate}</div>
                </div>
              </div>

              {/* Action Buttons for Warehouse Flow */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-700">Warehouse Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReq.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleAction('WAREHOUSE_REVIEW', 'Received for warehouse review')}
                      disabled={actionLoading}
                      className="col-span-2 py-2.5 px-3 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
                        className="py-2.5 px-3 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
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
                        className="py-2.5 px-3 text-xs font-bold rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="col-span-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Issue Material to Project</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Timestamped Audit History */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <History className="h-3.5 w-3.5 text-sky-600" />
                  <span>Audit & Material Movement History</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedReq.auditTrail.map((entry, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-600">{entry.status}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-700">{entry.remarks}</div>
                      <div className="text-[10px] text-slate-500">By: {entry.updatedBy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Select a material request card to inspect details and warehouse actions.
            </div>
          )}
        </div>
      </div>

      {/* Shortage Modal */}
      {shortageModalOpen && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="h-5 w-5" />
              <span>Log Stock Shortage</span>
            </div>
            <p className="text-xs text-slate-500">
              Record available stock quantity for <strong className="text-slate-900">{selectedReq.materialName}</strong>. This will set status to <strong>STOCK NOT AVAILABLE / PROCUREMENT REQUIRED</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Available Quantity in Stock</label>
                <input
                  type="number"
                  value={availStockInput}
                  onChange={(e) => setAvailStockInput(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Shortage Quantity</label>
                <input
                  type="number"
                  disabled
                  value={Math.max(0, selectedReq.quantity - availStockInput)}
                  className="w-full mt-1 p-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-rose-600 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Warehouse Remarks</label>
                <textarea
                  rows={3}
                  value={shortageRemarks}
                  onChange={(e) => setShortageRemarks(e.target.value)}
                  placeholder="Reason for shortage or procurement request note..."
                  className="w-full mt-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShortageModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleShortageSubmit}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition"
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
