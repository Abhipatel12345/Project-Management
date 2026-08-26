'use client';

import React, { useState, useMemo } from 'react';
import { Task } from '@/types/task.types';
import { TaskRelationship, DependencyType } from '@/types/task-dependency.types';
import { useProjectDependencies, useDeleteDependency } from '@/hooks/use-task-dependencies';
import { AddDependencyDialog } from './add-dependency-dialog';
import { TaskStatusBadge } from '@/components/tasks/task-status-badge';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { useToast } from '@/providers/toast-context';
import {
  GitFork,
  Plus,
  ArrowDown,
  ArrowRight,
  Search,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Trash2,
  Eye,
  Layers,
  LayoutGrid,
  List,
  Info,
  Calendar,
  Lock,
} from 'lucide-react';

interface TaskDependencyGraphProps {
  projectId: string;
  tasks: Task[];
  onViewTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
}

export function TaskDependencyGraph({
  projectId,
  tasks,
  onViewTask,
  onEditTask,
}: TaskDependencyGraphProps) {
  const { showToast } = useToast();
  const { data: relationships = [], refetch } = useProjectDependencies(projectId);
  const deleteMutation = useDeleteDependency();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addInitialPredId, setAddInitialPredId] = useState<string | undefined>(undefined);
  const [addInitialSuccId, setAddInitialSuccId] = useState<string | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);
  const [viewStyle, setViewStyle] = useState<'flow' | 'table'>('flow');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const taskMap = useMemo(() => new Map<string, Task>(tasks.map((t) => [t.name, t])), [tasks]);

  // Compute graph metrics and per-task predecessor/successor & blocked information
  const { taskNodes, blockedTasksCount } = useMemo(() => {
    let blockedCount = 0;

    const nodes = tasks.map((task) => {
      const predRels = relationships.filter((r: TaskRelationship) => r.successor_id === task.name);
      const succRels = relationships.filter((r: TaskRelationship) => r.predecessor_id === task.name);

      const blockingPredecessors: { task: Task | undefined; reason: string; type: DependencyType }[] = [];

      predRels.forEach((rel: TaskRelationship) => {
        const pred = taskMap.get(rel.predecessor_id);
        const predStatus = pred?.status || 'Open';

        if (rel.dependency_type === 'FS') {
          if (predStatus !== 'Completed' && predStatus !== 'Skipped') {
            blockingPredecessors.push({
              task: pred,
              reason: `Waiting for predecessor "${pred?.subject || rel.predecessor_id}" to complete`,
              type: rel.dependency_type,
            });
          }
        } else if (rel.dependency_type === 'SS') {
          if (predStatus === 'Open') {
            blockingPredecessors.push({
              task: pred,
              reason: `Waiting for predecessor "${pred?.subject || rel.predecessor_id}" to start`,
              type: rel.dependency_type,
            });
          }
        }
      });

      const isBlocked = blockingPredecessors.length > 0;
      if (isBlocked) blockedCount++;

      return {
        task,
        predecessors: predRels,
        successors: succRels,
        isBlocked,
        blockingPredecessors,
      };
    });

    return { taskNodes: nodes, blockedTasksCount: blockedCount };
  }, [tasks, relationships, taskMap]);

  // Filter task nodes
  const filteredNodes = useMemo(() => {
    return taskNodes.filter((node) => {
      if (filterBlockedOnly && !node.isBlocked) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = node.task.subject?.toLowerCase().includes(q);
        const matchesId = node.task.name?.toLowerCase().includes(q);
        const matchesAssignee = (node.task.assigned_employee_name || node.task.assigned_to || '')
          .toLowerCase()
          .includes(q);
        if (!matchesSubject && !matchesId && !matchesAssignee) return false;
      }
      return true;
    });
  }, [taskNodes, filterBlockedOnly, searchQuery]);

  // Topological sorting / levels for flowchart presentation
  const topologicalStages = useMemo(() => {
    // Group tasks into ordered stages based on incoming predecessor depth
    const levels = new Map<string, number>();

    // Initial pass: tasks with no predecessors are level 0
    const visited = new Set<string>();

    function computeLevel(taskId: string, currentPath = new Set<string>()): number {
      if (levels.has(taskId)) return levels.get(taskId)!;
      if (currentPath.has(taskId)) return 0; // break cycles gracefully

      currentPath.add(taskId);
      const incoming = relationships.filter((r: TaskRelationship) => r.successor_id === taskId);

      if (incoming.length === 0) {
        levels.set(taskId, 0);
        return 0;
      }

      let maxPredLevel = 0;
      for (const inc of incoming) {
        const l = computeLevel(inc.predecessor_id, new Set(currentPath));
        if (l + 1 > maxPredLevel) maxPredLevel = l + 1;
      }

      levels.set(taskId, maxPredLevel);
      return maxPredLevel;
    }

    tasks.forEach((t) => computeLevel(t.name));

    // Group into levels
    const stagesMap = new Map<number, typeof taskNodes>();
    filteredNodes.forEach((node) => {
      const lvl = levels.get(node.task.name) || 0;
      if (!stagesMap.has(lvl)) stagesMap.set(lvl, []);
      stagesMap.get(lvl)!.push(node);
    });

    return Array.from(stagesMap.entries()).sort(([a], [b]) => a - b);
  }, [tasks, relationships, filteredNodes]);

  const handleDeleteRelationship = async (relId: string) => {
    try {
      await deleteMutation.mutateAsync({ projectId, dependencyId: relId });
      showToast('Task dependency removed successfully', 'info');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove dependency', 'error');
    }
  };

  const handleOpenAddForTask = (taskId: string, asPredecessor = true) => {
    if (asPredecessor) {
      setAddInitialPredId(taskId);
      setAddInitialSuccId(undefined);
    } else {
      setAddInitialPredId(undefined);
      setAddInitialSuccId(taskId);
    }
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header Controls */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
            <GitFork className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">Task Dependencies & Relationships</h3>
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                {relationships.length} Relationships
              </span>
              {blockedTasksCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-700" />
                  {blockedTasksCount} Blocked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Visualize critical path execution sequences, predecessors, and successor constraints
            </p>
          </div>
        </div>

        {/* View mode & Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Style Switch */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <button
              onClick={() => setViewStyle('flow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewStyle === 'flow' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Flow Graph</span>
            </button>
            <button
              onClick={() => setViewStyle('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewStyle === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Relationship Table</span>
            </button>
          </div>

          {/* Zoom controls (for flow view) */}
          {viewStyle === 'flow' && (
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 10, 70))}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono font-bold text-slate-700">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 10, 130))}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setAddInitialPredId(undefined);
              setAddInitialSuccId(undefined);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Dependency</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task by name, ID or assignee..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterBlockedOnly(!filterBlockedOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterBlockedOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Blocked Tasks Only</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE FLOW GRAPH */}
      {viewStyle === 'flow' && (
        <div
          className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-xs overflow-x-auto min-h-[420px] transition-transform origin-top-left"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
        >
          {filteredNodes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <GitFork className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No tasks found matching criteria.</p>
              <p className="text-xs text-slate-400">Add tasks or create dependencies to start visualizing.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto">
              {topologicalStages.map(([stageIndex, nodesInStage], idx) => (
                <React.Fragment key={stageIndex}>
                  {/* Stage Row */}
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5">
                      <span>
                        Stage {stageIndex + 1} ({nodesInStage.length} {nodesInStage.length === 1 ? 'Task' : 'Tasks'})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                      {nodesInStage.map((node) => {
                        const t = node.task;
                        return (
                          <div
                            key={t.name}
                            className={`p-4 rounded-2xl border transition shadow-xs hover:shadow-md relative group ${
                              node.isBlocked
                                ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-500/20'
                                : 'bg-white border-slate-200 hover:border-sky-300'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-sky-600 block">
                                  {t.name}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-sky-600 transition">
                                  {t.subject}
                                </h4>
                              </div>
                              <TaskStatusBadge status={t.status} />
                            </div>

                            {/* Blocked Indicator Alert Banner */}
                            {node.isBlocked && (
                              <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-0.5">
                                <div className="flex items-center gap-1 font-bold text-amber-800">
                                  <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                                  <span>Blocked by Predecessor</span>
                                </div>
                                <div className="text-[10px] text-amber-700/90 truncate">
                                  {node.blockingPredecessors[0]?.reason}
                                </div>
                              </div>
                            )}

                            {/* Assignee & Dates */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                              <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                                <div className="h-5 w-5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center text-[9px] font-black shrink-0">
                                  {(t.assigned_employee_name || t.assigned_to || 'U')[0].toUpperCase()}
                                </div>
                                <span className="truncate font-semibold text-slate-700">
                                  {t.assigned_employee_name || t.assigned_to || 'Unassigned'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>{t.exp_end_date ? t.exp_end_date.split(' ')[0] : 'No Due Date'}</span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                <span>Progress</span>
                                <span className="font-mono text-slate-700">{t.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
                                  style={{ width: `${t.progress || 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Predecessors & Successors badges */}
                            <div className="mt-3 flex items-center justify-between text-[10px] pt-2 border-t border-slate-100">
                              <div className="text-slate-500 font-medium">
                                <span className="font-bold text-sky-600">{node.predecessors.length}</span> In •{' '}
                                <span className="font-bold text-indigo-600">{node.successors.length}</span> Out
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddForTask(t.name, true)}
                                  className="px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[10px] border border-sky-200 transition cursor-pointer"
                                  title="Add Successor Task"
                                >
                                  + Link
                                </button>
                                {onViewTask && (
                                  <button
                                    type="button"
                                    onClick={() => onViewTask(t)}
                                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                    title="Open Task Details"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Connecting Arrow between Stages */}
                  {idx < topologicalStages.length - 1 && (
                    <div className="flex items-center justify-center my-2 text-sky-600">
                      <div className="flex flex-col items-center bg-white px-3.5 py-1 rounded-full border border-sky-200 shadow-xs">
                        <ArrowDown className="h-4 w-4 text-sky-600 animate-bounce" />
                        <span className="text-[9px] font-black tracking-wider uppercase text-sky-700">Execution Flow</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: RELATIONSHIP TABLE */}
      {viewStyle === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <List className="h-4 w-4 text-sky-600" />
              Active Project Dependencies ({relationships.length})
            </h4>
          </div>

          {relationships.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <GitFork className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No task dependencies defined yet.</p>
              <p className="text-[11px] text-slate-400">
                Click "+ Add Dependency" above to create execution relationships between tasks.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Predecessor (Source)</th>
                    <th className="py-3 px-4 text-center">Relationship Type</th>
                    <th className="py-3 px-4">Successor (Target)</th>
                    <th className="py-3 px-4">Impact Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {relationships.map((rel: TaskRelationship) => {
                    const pred = taskMap.get(rel.predecessor_id);
                    const succ = taskMap.get(rel.successor_id);
                    const isPredDone = pred?.status === 'Completed' || pred?.status === 'Skipped';

                    return (
                      <tr key={rel.id} className="hover:bg-slate-50/70 transition">
                        {/* Predecessor */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {pred?.subject || rel.predecessor_subject || rel.predecessor_id}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                            <span>{rel.predecessor_id}</span>
                            {pred && <TaskStatusBadge status={pred.status} />}
                          </div>
                        </td>

                        {/* Dependency Type Badge */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-black">
                              {rel.dependency_type || 'FS'}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              {rel.dependency_type === 'FS'
                                ? 'Finish-to-Start'
                                : rel.dependency_type === 'SS'
                                ? 'Start-to-Start'
                                : rel.dependency_type === 'FF'
                                ? 'Finish-to-Finish'
                                : 'Start-to-Finish'}
                            </span>
                          </div>
                        </td>

                        {/* Successor */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {succ?.subject || rel.successor_subject || rel.successor_id}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                            <span>{rel.successor_id}</span>
                            {succ && <TaskStatusBadge status={succ.status} />}
                          </div>
                        </td>

                        {/* Impact Status */}
                        <td className="py-3 px-4">
                          {isPredDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Predecessor Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Lock className="h-3 w-3 text-amber-600" /> Blocking Successor
                            </span>
                          )}
                        </td>

                        {/* Action: Delete Link */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRelationship(rel.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                            title="Delete Dependency"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Dependency Dialog */}
      <AddDependencyDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        projectId={projectId}
        tasks={tasks}
        initialPredecessorId={addInitialPredId}
        initialSuccessorId={addInitialSuccId}
        onSuccess={refetch}
      />
    </div>
  );
}
