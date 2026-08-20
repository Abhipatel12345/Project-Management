import React, { useState } from 'react';
import { useProjectConnectionRecords } from '@/hooks/use-project-connections';
import { ConnectionItemConfig, ConnectionRecordItem } from '@/types/connection.types';
import { X, Search, Loader2, Calendar, FileText, ChevronRight, User, ExternalLink, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ConnectionRecordItem | null>(null);

  const doctype = itemConfig?.doctype || '';
  const projectField = itemConfig?.projectField || 'project';
  const alternativeField = itemConfig?.alternativeProjectField;

  const { data, isLoading, isError, refetch } = useProjectConnectionRecords(
    projectId,
    doctype,
    projectField,
    alternativeField,
    page,
    20,
    isOpen
  );

  const rawRecords = data?.records || [];

  // Client-side search filtering
  const filteredRecords = rawRecords.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = (rec.title || rec.subject || rec.name || '').toLowerCase();
    const status = (rec.status || '').toLowerCase();
    const customer = (rec.customer || rec.supplier || '').toLowerCase();
    return title.includes(query) || status.includes(query) || customer.includes(query) || rec.name.toLowerCase().includes(query);
  });

  if (!isOpen || !itemConfig) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#EBF5FF] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {itemConfig.label} ({filteredRecords.length})
                </h3>
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
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
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
                placeholder={`Search ${itemConfig.label} records...`}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition shadow-2xs"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 bg-white px-3 py-2 rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs"
            >
              🔄 Refresh List
            </button>
          </div>

          {/* Records Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                <p className="text-xs text-slate-500 font-semibold">
                  Loading {itemConfig.label} records from ERPNext...
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No {itemConfig.label} Records Found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No {itemConfig.label} records are currently associated with project {projectId}. Click "+ Create" to add one.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const displayTitle = rec.subject || rec.title || rec.name;
                  const displayParty = rec.customer || rec.supplier || rec.employee_name || '';
                  const statusColor =
                    rec.status === 'Completed' || rec.status === 'Paid' || rec.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : rec.status === 'Open' || rec.status === 'Draft' || rec.status === 'Working'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <div
                      key={rec.name}
                      onClick={() => setSelectedRecord(rec)}
                      className="p-4 hover:bg-sky-50/40 transition cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 truncate">
                            {rec.name}
                          </span>
                          {rec.status && (
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${statusColor}`}
                            >
                              {rec.status}
                            </span>
                          )}
                        </div>

                        {displayTitle !== rec.name && (
                          <p className="text-xs font-semibold text-slate-700 truncate">{displayTitle}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          {displayParty && (
                            <span className="font-medium text-slate-600">👤 {displayParty}</span>
                          )}
                          {(rec.posting_date || rec.creation) && (
                            <span className="font-mono text-slate-400">
                              📅 {rec.posting_date || (rec.creation ? rec.creation.split(' ')[0] : '')}
                            </span>
                          )}
                          {(rec.grand_total || rec.total_amount) && (
                            <span className="font-mono font-bold text-emerald-700">
                              💰 ${(rec.grand_total || rec.total_amount || 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Record Detail Drawer / Preview Modal if selected */}
          {selectedRecord && (
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-t border-slate-800 shrink-0 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Selected: </span>
                <span className="font-bold text-sky-400">{selectedRecord.name}</span> —{' '}
                <span>{selectedRecord.subject || selectedRecord.title || selectedRecord.status || 'Details'}</span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white transition"
              >
                Close Preview
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
