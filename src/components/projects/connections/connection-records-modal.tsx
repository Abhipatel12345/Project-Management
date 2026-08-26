'use client';

import React, { useState } from 'react';
import { useProjectConnectionRecords, useSubmitConnectionRecord } from '@/hooks/use-project-connections';
import { ConnectionItemConfig, ConnectionRecordItem } from '@/types/connection.types';
import { useToast } from '@/providers/toast-context';
import {
  X,
  Search,
  Loader2,
  Calendar,
  FileText,
  ChevronRight,
  User,
  ExternalLink,
  Filter,
  Send,
  CheckCircle2,
  Package,
  Layers,
  Clock,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ConnectionRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  itemConfig: ConnectionItemConfig | null;
  onAddNew: () => void;
}

export function ConnectionRecordsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  itemConfig,
  onAddNew,
}: ConnectionRecordsModalProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ConnectionRecordItem | null>(null);
  const [submittingName, setSubmittingName] = useState<string | null>(null);

  const doctype = itemConfig?.doctype || '';
  const projectField = itemConfig?.projectField || 'project';
  const alternativeField = itemConfig?.alternativeProjectField;

  const { data, isLoading, isError, refetch } = useProjectConnectionRecords(
    projectId,
    doctype,
    projectField,
    alternativeField,
    page,
    50,
    isOpen
  );

  const submitRecordMutation = useSubmitConnectionRecord();

  const rawRecords = data?.records || [];

  // Client-side search filtering
  const filteredRecords = rawRecords.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = (rec.title || rec.subject || rec.item || rec.item_code || rec.name || '').toLowerCase();
    const status = (rec.status || '').toLowerCase();
    const customer = (rec.customer || rec.supplier || '').toLowerCase();
    return (
      title.includes(query) ||
      status.includes(query) ||
      customer.includes(query) ||
      rec.name.toLowerCase().includes(query)
    );
  });

  if (!isOpen || !itemConfig) return null;

  const handleSubmitRecord = async (recordName: string) => {
    setSubmittingName(recordName);
    try {
      await submitRecordMutation.mutateAsync({
        doctype,
        name: recordName,
      });
      showToast(`${itemConfig.label} ${recordName} submitted successfully to ERPNext!`, 'success');
      await refetch();
      if (selectedRecord && selectedRecord.name === recordName) {
        setSelectedRecord((prev) => (prev ? { ...prev, docstatus: 1, status: 'Submitted' } : null));
      }
    } catch (err: any) {
      showToast(err.message || `Failed to submit ${itemConfig.label} ${recordName}`, 'error');
    } finally {
      setSubmittingName(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EBF5FF] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    {itemConfig.label} ({filteredRecords.length})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-sky-700 text-[10px] font-extrabold border border-sky-200">
                    {doctype}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Linked to Project: <span className="font-bold text-slate-800">{projectName}</span> ({projectId})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onAddNew();
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                + Create {itemConfig.label}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${itemConfig.label} records (ID, Item, Status)...`}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition shadow-2xs"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Loader2 className={cn('h-3.5 w-3.5', isLoading ? 'animate-spin' : 'hidden')} />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Records Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">
                  Fetching live {itemConfig.label} records from ERPNext...
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No {itemConfig.label} Records Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No {itemConfig.label} records are currently associated with project {projectId}. Click "+ Create {itemConfig.label}" to create a new draft request.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const isDraft = rec.docstatus === 0 || rec.status === 'Draft';
                  const isSubmitted =
                    rec.docstatus === 1 ||
                    rec.status === 'Submitted' ||
                    rec.status === 'Pending' ||
                    rec.status === 'Ordered';

                  const displayTitle =
                    rec.item_name || rec.item || rec.item_code || rec.title || rec.subject || rec.name;
                  const displayParty = rec.customer || rec.supplier || rec.owner || '';

                  return (
                    <div
                      key={rec.name}
                      onClick={() => setSelectedRecord(rec)}
                      className={cn(
                        'p-4 hover:bg-sky-50/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                        selectedRecord?.name === rec.name ? 'bg-sky-50/60' : ''
                      )}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-900 truncate">
                            {rec.name}
                          </span>

                          {/* ERPNext Real Docstatus / Status Badge */}
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Submitted
                            </span>
                          ) : isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3 text-amber-600" />
                              Draft
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {rec.status || 'Active'}
                            </span>
                          )}

                          {rec.project && (
                            <span className="text-[10px] font-bold text-slate-400">
                              Project: <strong className="text-slate-600">{rec.project}</strong>
                            </span>
                          )}
                        </div>

                        {displayTitle !== rec.name && (
                          <p className="text-xs font-bold text-slate-800 truncate">{displayTitle}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                          {(rec.item || rec.item_code) && (
                            <span className="text-sky-700 font-mono font-bold">
                              📦 {rec.item || rec.item_code}
                            </span>
                          )}
                          {rec.qty !== undefined && rec.qty !== null && (
                            <span className="font-mono font-bold text-slate-700">
                              Qty: {rec.qty}
                            </span>
                          )}
                          {displayParty && (
                            <span className="text-slate-600">👤 {displayParty}</span>
                          )}
                          {(rec.transaction_date || rec.posting_date || rec.schedule_date || rec.creation) && (
                            <span className="font-mono text-slate-400">
                              📅 {rec.transaction_date || rec.posting_date || rec.schedule_date || (rec.creation ? rec.creation.split(' ')[0] : '')}
                            </span>
                          )}
                          {(rec.grand_total || rec.total_amount) && (
                            <span className="font-mono font-bold text-emerald-700">
                              💰 ${(rec.grand_total || rec.total_amount || 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Zone: Submit Button for Drafts */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isDraft && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitRecord(rec.name);
                            }}
                            disabled={submittingName === rec.name}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                            title={`Submit ${doctype} ${rec.name} to ERPNext`}
                          >
                            {submittingName === rec.name ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span>Submit</span>
                          </button>
                        )}

                        <div className="p-1 text-slate-400 hover:text-sky-600 transition">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Record Detail Drawer / Preview Modal if selected */}
          {selectedRecord && (
            <div className="p-5 bg-slate-900 text-white border-t border-slate-800 shrink-0 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sky-400 text-sm">
                    {selectedRecord.name}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-black uppercase',
                      selectedRecord.docstatus === 1 || selectedRecord.status === 'Submitted'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                        : 'bg-amber-900/80 text-amber-300 border border-amber-700'
                    )}
                  >
                    {selectedRecord.docstatus === 1 || selectedRecord.status === 'Submitted'
                      ? '✓ Submitted to ERPNext'
                      : 'Draft'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {(selectedRecord.docstatus === 0 || selectedRecord.status === 'Draft') && (
                    <button
                      onClick={() => handleSubmitRecord(selectedRecord.name)}
                      disabled={submittingName === selectedRecord.name}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      {submittingName === selectedRecord.name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Submit to ERPNext</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-slate-400 hover:text-white transition px-2 py-1"
                  >
                    Close Preview
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] text-slate-300 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 block">DocType:</span>
                  <span className="font-bold text-white">{doctype}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Associated Project:</span>
                  <span className="font-bold text-sky-300">{projectId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Item / Part:</span>
                  <span className="font-mono text-white">
                    {selectedRecord.item || selectedRecord.item_code || selectedRecord.title || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Owner / Created By:</span>
                  <span className="text-white">{selectedRecord.owner || 'Administrator'}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
