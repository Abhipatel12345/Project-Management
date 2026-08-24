'use client';

import React, { useState, useEffect } from 'react';
import { auditService, AuditLogEntry } from '@/services/audit.service';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  FileCheck,
  Send,
  Boxes,
  Users,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProjectActivityTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectActivityTab({ projectId, projectName }: ProjectActivityTabProps) {
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const res = await auditService.getProjectActivities(projectId, searchQuery);
      setActivities(res);
    } catch (err) {
      console.error('Failed to load project activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const filteredActivities = activities.filter((a) => {
    if (selectedEntity !== 'ALL' && a.entityType !== selectedEntity) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      return (
        a.action.toLowerCase().includes(q) ||
        (a.details && a.details.toLowerCase().includes(q)) ||
        (a.entityId && a.entityId.toLowerCase().includes(q)) ||
        (a.user && a.user.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'Project':
        return <FolderKanban className="h-4 w-4 text-sky-600" />;
      case 'Task':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'Gate':
      case 'GateCriterion':
      case 'GateDeliverable':
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      case 'DesignReview':
        return <FileCheck className="h-4 w-4 text-purple-600" />;
      case 'Document':
        return <FileText className="h-4 w-4 text-amber-600" />;
      case 'Team':
        return <Users className="h-4 w-4 text-indigo-600" />;
      case 'MaterialRequest':
      case 'BOM':
        return <Boxes className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  const getEntityBadgeColor = (entityType: string) => {
    switch (entityType) {
      case 'Project':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Task':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Gate':
      case 'GateCriterion':
      case 'GateDeliverable':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DesignReview':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Document':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Team':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MaterialRequest':
      case 'BOM':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 shadow-2xs">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Project Audit Trail & Change History — {projectName}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Immutable audit history tracking tasks, gates, documents, approvals, and team mutations.
            </p>
          </div>
        </div>

        <button
          onClick={fetchActivities}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, user, or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Entity:</span>
          {['ALL', 'Project', 'Task', 'Gate', 'DesignReview', 'Document', 'Team', 'BOM'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEntity(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedEntity === type
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {type === 'ALL' ? 'All Activities' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading audit history from server database...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs space-y-2">
          <Activity className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No matching activity records found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Audit events are automatically recorded whenever tasks, gates, documents, or team assignments are modified.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((log) => {
              const dateObj = new Date(log.timestamp);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0 mt-0.5">
                      {getEntityIcon(log.entityType)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{log.action}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getEntityBadgeColor(
                            log.entityType
                          )}`}
                        >
                          {log.entityType}: {log.entityId}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-2xl">
                        {log.details}
                      </p>

                      {(log.oldValue || log.newValue) && (
                        <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 w-fit mt-1.5">
                          <span className="text-slate-400 font-semibold">{log.oldValue || 'None'}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="text-purple-700 font-bold">{log.newValue || 'Updated'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-1 pl-11 sm:pl-0">
                    <div className="flex sm:justify-end items-center gap-1.5 text-xs font-bold text-slate-800">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{log.user}</span>
                      {log.role && (
                        <span className="text-[10px] text-slate-400 font-normal">({log.role})</span>
                      )}
                    </div>
                    <div className="flex sm:justify-end items-center gap-1 text-[11px] text-slate-400 font-medium font-mono">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>
                        {formattedDate} at {formattedTime}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
