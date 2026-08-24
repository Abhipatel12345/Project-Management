'use client';

import React, { useState } from 'react';
import { useProjectConnectionCounts } from '@/hooks/use-project-connections';
import { PROJECT_CONNECTIONS, ConnectionItemConfig, ConnectionCountResult } from '@/types/connection.types';
import { ConnectionRecordsModal } from './connection-records-modal';
import { ConnectionCreateModal } from './connection-create-modal';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { useCreateTask } from '@/hooks/use-tasks';
import { useToast } from '@/providers/toast-context';
import {
  Network,
  RefreshCw,
  Plus,
  Layers,
  Clock,
  AlertCircle,
  FileText,
  Package,
  ShoppingCart,
  Receipt,
  Factory,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProjectConnectionsTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectConnectionsTab({ projectId, projectName }: ProjectConnectionsTabProps) {
  const { showToast } = useToast();
  const { data: countsMap = {}, isLoading, isError, refetch } = useProjectConnectionCounts(projectId);

  // Modal State
  const [selectedListConfig, setSelectedListConfig] = useState<ConnectionItemConfig | null>(null);
  const [selectedCreateConfig, setSelectedCreateConfig] = useState<ConnectionItemConfig | null>(null);
  const [isTaskCreateOpen, setIsTaskCreateOpen] = useState(false);

  const createTaskMutation = useCreateTask();

  const handleTaskSubmit = async (values: any) => {
    try {
      await createTaskMutation.mutateAsync({
        ...values,
        project: projectId,
      });
      showToast('Task created successfully in ERPNext!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create task', 'error');
    }
  };

  const getGroupIcon = (groupName: string) => {
    switch (groupName) {
      case 'Project':
        return <Layers className="h-4 w-4 text-sky-600" />;
      case 'Material':
        return <Package className="h-4 w-4 text-amber-600" />;
      case 'Sales':
        return <ShoppingCart className="h-4 w-4 text-emerald-600" />;
      case 'Purchase':
        return <Receipt className="h-4 w-4 text-purple-600" />;
      case 'Manufacture':
        return <Factory className="h-4 w-4 text-indigo-600" />;
      default:
        return <Network className="h-4 w-4 text-sky-600" />;
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner & Control Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 shadow-2xs">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Project Connections — {projectName}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live ERPNext document links across Project, Material, Sales, Purchase & Manufacturing modules.
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Connections</span>
        </button>
      </div>

      {/* 5 Connection Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {PROJECT_CONNECTIONS.map((groupConfig) => (
          <motion.div
            key={groupConfig.group}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col justify-between"
          >
            {/* Group Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-[#EBF5FF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white border border-sky-200 shadow-2xs">
                  {getGroupIcon(groupConfig.group)}
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    {groupConfig.group}
                  </h3>
                  {groupConfig.description && (
                    <p className="text-[10px] text-slate-500 font-medium">
                      {groupConfig.description}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[10px] font-black text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-200 shadow-2xs">
                {groupConfig.items.length} DocTypes
              </span>
            </div>

            {/* Connection Items List */}
            <div className="divide-y divide-slate-100 p-2">
              {groupConfig.items.map((item) => {
                const countResult: ConnectionCountResult | undefined = countsMap[item.doctype];
                const isItemLoading = isLoading && !countResult;

                return (
                  <div
                    key={item.doctype}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-sky-50/50 transition cursor-pointer"
                    onClick={() => setSelectedListConfig(item)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600 transition shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-700 transition">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Count Badge / Skeleton Loader / Error State */}
                      {isItemLoading ? (
                        <div className="h-5 w-10 bg-slate-100 animate-pulse rounded-md" />
                      ) : countResult?.status === 'permission_denied' ? (
                        <span
                          className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold"
                          title="Permission denied for this DocType"
                        >
                          Restricted
                        </span>
                      ) : countResult?.status === 'not_found' || countResult?.status === 'error' ? (
                        <span
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium"
                          title={countResult.errorMessage || 'Unable to load'}
                        >
                          Unavailable
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 group-hover:bg-white group-hover:border-sky-300 group-hover:text-sky-700 transition">
                          {countResult?.count ?? 0}
                        </span>
                      )}

                      {/* Add Related Record "+" Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.doctype === 'Task') {
                            setIsTaskCreateOpen(true);
                          } else {
                            setSelectedCreateConfig(item);
                          }
                        }}
                        title={`Create new ${item.label} for project ${projectId}`}
                        aria-label={`Create new ${item.label}`}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-sky-600 hover:text-white transition cursor-pointer border border-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Record List Modal */}
      {selectedListConfig && (
        <ConnectionRecordsModal
          isOpen={!!selectedListConfig}
          onClose={() => setSelectedListConfig(null)}
          projectId={projectId}
          projectName={projectName}
          itemConfig={selectedListConfig}
          onAddNew={() => {
            if (selectedListConfig.doctype === 'Task') {
              setIsTaskCreateOpen(true);
            } else {
              setSelectedCreateConfig(selectedListConfig);
            }
          }}
        />
      )}

      {/* Generic Create Connection Record Modal */}
      {selectedCreateConfig && (
        <ConnectionCreateModal
          isOpen={!!selectedCreateConfig}
          onClose={() => setSelectedCreateConfig(null)}
          projectId={projectId}
          projectName={projectName}
          itemConfig={selectedCreateConfig}
          onSuccess={() => refetch()}
        />
      )}

      {/* Reused Task Creation Form Dialog */}
      <TaskFormDialog
        isOpen={isTaskCreateOpen}
        onClose={() => setIsTaskCreateOpen(false)}
        onSubmit={handleTaskSubmit}
        defaultProjectId={projectId}
        isLoading={createTaskMutation.isPending}
      />
    </div>
  );
}
