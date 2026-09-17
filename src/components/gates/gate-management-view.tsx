'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useGates } from '@/hooks/use-gates';
import { useProjectStageMover } from '@/hooks/use-stage-mover';
import { Project } from '@/types/project.types';
import { Gate } from '@/types/gate.types';
import { Task } from '@/types/task.types';
import {
  INTEVA_GATE_CHOICES,
  IntevaGateCode,
} from '@/config/gate-choices.config';
import { GateReadinessTab } from './gate-readiness-tab';
import { KgdTab } from './kgd-tab';
import { GateReviewResultSummaryTab } from './gate-review-result-summary-tab';
import {
  Layers,
  FolderKanban,
  CheckCircle2,
  ListTodo,
  Award,
  RefreshCw,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type GateTabType =
  | 'Gate readniss tab'
  | 'KGD tab'
  | 'Gate Review Result summery tab';

interface GateManagementViewProps {
  initialProjectId?: string;
  initialTab?: GateTabType;
  initialGate?: IntevaGateCode;
}

export function GateManagementView({
  initialProjectId,
  initialTab = 'Gate readniss tab',
  initialGate,
}: GateManagementViewProps) {
  // Projects List
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({
    page: 1,
    pageSize: 100,
  });
  const projects: Project[] = projectsData?.projects || [];

  // Selected Project State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || ''
  );

  // Auto-select first project if none specified
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].name);
    }
  }, [projects, selectedProjectId]);

  // Selected Tab State: EXACT 3 TAB NAMES
  const [activeTab, setActiveTab] = useState<GateTabType>(initialTab);

  // Active Gate State: 1. PL through 6. CT
  const [activeGateCode, setActiveGateCode] = useState<IntevaGateCode>(
    initialGate || '1. PL'
  );

  // Stage Mover info for selected project (to detect current active stage)
  const {
    data: stageMoverStatus,
    isLoading: isLoadingStageMover,
    refetch: refetchStageMover,
  } = useProjectStageMover(selectedProjectId);

  // Update active gate to match project's current PDP stage on project switch
  useEffect(() => {
    if (stageMoverStatus?.current_stage) {
      const stage = stageMoverStatus.current_stage;
      const matched = INTEVA_GATE_CHOICES.find((g) => g.includes(stage));
      if (matched && !initialGate) {
        setActiveGateCode(matched);
      }
    }
  }, [stageMoverStatus?.current_stage, initialGate]);

  // Fetch Gantt / PDP Tasks for the selected project (Single Source of Truth)
  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    refetch: refetchTasks,
  } = useTasks({
    project: selectedProjectId || undefined,
    pageSize: 1000,
  });
  const tasks: Task[] = tasksData?.tasks || [];

  // Fetch Gates for the selected project
  const {
    data: gatesData,
    isLoading: isLoadingGates,
    isFetching: isFetchingGates,
    refetch: refetchGates,
  } = useGates({
    project: selectedProjectId || undefined,
    pageSize: 50,
  });
  const gates: Gate[] = gatesData?.gates || [];

  const handleRefreshAll = () => {
    refetchTasks();
    refetchGates();
    refetchStageMover();
  };

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.name === selectedProjectId);
  }, [projects, selectedProjectId]);

  const isGlobalLoading =
    isLoadingProjects || (!!selectedProjectId && (isLoadingTasks || isLoadingGates));

  return (
    <div className="space-y-6">
      {/* Top Header Card: Project Context & PDP Stage Breadcrumb */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Connected Gate Flow
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Gantt ↔ Gate Readiness ↔ KGD ↔ Gate Review ↔ Stage Mover
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              <span>Gate Management</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Project Selector (Strict project context) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Project:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 cursor-pointer min-w-[200px]"
              >
                {projects.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {p.project_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isFetchingTasks || isFetchingGates}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              title="Refresh connected tasks and gate decisions"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  (isFetchingTasks || isFetchingGates) && 'animate-spin text-emerald-600'
                )}
              />
            </button>
          </div>
        </div>

        {/* PDP Gate Sequence Steps: 1. PL -> 2. VC -> 3. TKO -> 4. VL -> 5. CPA -> 6. CT */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
            PDP Gate Lifecycle Sequence:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {INTEVA_GATE_CHOICES.map((gateChoice, idx) => {
              const cleanCode = gateChoice.replace(/^\d+\.\s*/, '');
              const isCurrentStage =
                stageMoverStatus?.current_stage === cleanCode;
              const isSelected = activeGateCode === gateChoice;

              return (
                <button
                  key={gateChoice}
                  type="button"
                  onClick={() => setActiveGateCode(gateChoice)}
                  className={cn(
                    'p-2.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer',
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : isCurrentStage
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-tight">
                      {gateChoice}
                    </span>
                    {isCurrentStage && (
                      <span
                        className={cn(
                          'text-[9px] font-extrabold px-1.5 py-0.2 rounded',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-200 text-emerald-800'
                        )}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      'text-[10px] mt-1 truncate',
                      isSelected ? 'text-emerald-100' : 'text-slate-400'
                    )}
                  >
                    Phase {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* THREE USER-FACING TABS */}
      <div className="flex items-center border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        {/* Tab 1: Gate readniss tab */}
        <button
          type="button"
          onClick={() => setActiveTab('Gate readniss tab')}
          className={cn(
            'px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none',
            activeTab === 'Gate readniss tab'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-2xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Gate readniss tab</span>
        </button>

        {/* Tab 2: KGD tab */}
        <button
          type="button"
          onClick={() => setActiveTab('KGD tab')}
          className={cn(
            'px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none',
            activeTab === 'KGD tab'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-2xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <ListTodo className="h-4 w-4" />
          <span>KGD tab</span>
        </button>

        {/* Tab 3: Gate Review Result summery tab */}
        <button
          type="button"
          onClick={() => setActiveTab('Gate Review Result summery tab')}
          className={cn(
            'px-5 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none',
            activeTab === 'Gate Review Result summery tab'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-2xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <Award className="h-4 w-4" />
          <span>Gate Review Result summery tab</span>
        </button>
      </div>

      {/* Loading Indicator */}
      {isGlobalLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white border border-slate-200 rounded-3xl">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <div className="text-xs font-bold text-slate-500">
            Connecting project tasks and Gate Review data...
          </div>
        </div>
      ) : (
        <div>
          {/* TAB 1: Gate readniss tab */}
          {activeTab === 'Gate readniss tab' && (
            <GateReadinessTab
              tasks={tasks}
              projectId={selectedProjectId}
              projectName={selectedProject?.project_name}
              selectedGateFilter={activeGateCode}
              onGateFilterChange={(g) => {
                if (g === 'ALL') setActiveGateCode('1. PL');
                else setActiveGateCode(g as IntevaGateCode);
              }}
              onRefresh={handleRefreshAll}
            />
          )}

          {/* TAB 2: KGD tab */}
          {activeTab === 'KGD tab' && (
            <KgdTab
              tasks={tasks}
              projectId={selectedProjectId}
              projectName={selectedProject?.project_name}
              selectedGateFilter={activeGateCode}
              onGateFilterChange={(g) => {
                if (g === 'ALL') setActiveGateCode('1. PL');
                else setActiveGateCode(g as IntevaGateCode);
              }}
              onRefresh={handleRefreshAll}
            />
          )}

          {/* TAB 3: Gate Review Result summery tab */}
          {activeTab === 'Gate Review Result summery tab' && (
            <GateReviewResultSummaryTab
              projectId={selectedProjectId}
              projectName={selectedProject?.project_name}
              tasks={tasks}
              gates={gates}
              activeGateCode={activeGateCode}
              onGateChange={setActiveGateCode}
              onRefresh={handleRefreshAll}
            />
          )}
        </div>
      )}
    </div>
  );
}
