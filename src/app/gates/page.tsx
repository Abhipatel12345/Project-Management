'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import {
  useGates,
  useCreateGate,
  useUpdateGate,
  useAddGateCriterion,
  useUpdateGateCriterion,
  useDeleteGateCriterion,
  useAddGateDeliverable,
  useUpdateGateDeliverable,
  useDeleteGateDeliverable,
  useAddGateReview,
  useDeleteGate,
} from '@/hooks/use-gates';
import { useToast } from '@/providers/toast-context';
import { GateHeaderSummary } from '@/components/gates/gate-header-summary';
import { GateTableView } from '@/components/gates/gate-table-view';
import { GateFormDialog, GateFormValues } from '@/components/gates/gate-form-dialog';
import { GateDetailModal } from '@/components/gates/gate-detail-modal';
import { Gate, GateCriterion, GateDeliverable } from '@/types/gate.types';
import { Project } from '@/types/project.types';
import { BackButton } from '@/components/shared/back-button';
import { Pagination } from '@/components/shared/pagination';
import { ImportExportControls } from '@/components/shared/import-export-controls';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function GateManagementPage() {
  const { showToast } = useToast();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  const {
    data: gateListData,
    isLoading: isLoadingGates,
    isError: isErrorGates,
    error: gateError,
    refetch,
    isFetching,
  } = useGates({
    project: selectedProjectId === 'ALL' ? undefined : selectedProjectId,
    pageSize: 100,
  });

  const gates: Gate[] = gateListData?.gates || [];
  const summary = gateListData?.summary || {
    totalGates: 0,
    notStartedGates: 0,
    inProgressGates: 0,
    readyForReviewGates: 0,
    approvedGates: 0,
    blockedGates: 0,
    upcomingGates: 0,
    completedGates: 0,
    requiringApprovalGates: 0,
  };

  // Mutations
  const createGateMutation = useCreateGate();
  const updateGateMutation = useUpdateGate();
  const addCriterionMutation = useAddGateCriterion();
  const updateCriterionMutation = useUpdateGateCriterion();
  const deleteCriterionMutation = useDeleteGateCriterion();
  const addDeliverableMutation = useAddGateDeliverable();
  const updateDeliverableMutation = useUpdateGateDeliverable();
  const deleteDeliverableMutation = useDeleteGateDeliverable();
  const addGateReviewMutation = useAddGateReview();
  const deleteGateMutation = useDeleteGate();

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [viewingGate, setViewingGate] = useState<Gate | null>(null);

  const handleCreateSubmit = async (values: GateFormValues) => {
    try {
      const newGate = await createGateMutation.mutateAsync({
        gate_name: values.gate_name,
        project: values.project || undefined,
        gate_type: values.gate_type,
        planned_date: values.planned_date,
        actual_date: values.actual_date,
        gate_owner: values.gate_owner,
        status: values.status,
        approval_status: values.approval_status,
        description: values.description,
      });

      showToast(`Stage-Gate ${newGate.name} created successfully!`, 'success');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create stage-gate', 'error');
    }
  };

  const handleEditSubmit = async (values: GateFormValues) => {
    if (!editingGate) return;
    try {
      await updateGateMutation.mutateAsync({
        name: editingGate.name,
        data: {
          gate_name: values.gate_name,
          project: values.project || undefined,
          gate_type: values.gate_type,
          planned_date: values.planned_date,
          actual_date: values.actual_date,
          gate_owner: values.gate_owner,
          status: values.status,
          approval_status: values.approval_status,
          description: values.description,
        },
      });

      showToast(`Stage-Gate ${editingGate.name} updated successfully!`, 'success');
      setEditingGate(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage-gate', 'error');
    }
  };

  const handleAddCriterion = async (criterion: Partial<GateCriterion>) => {
    if (!viewingGate) return;
    try {
      const updated = await addCriterionMutation.mutateAsync({
        gateName: viewingGate.name,
        criterion,
      });
      showToast('Gate criterion added successfully!', 'success');
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to add criterion', 'error');
    }
  };

  const handleUpdateCriterion = async (criterionId: string, data: Partial<GateCriterion>) => {
    if (!viewingGate) return;
    try {
      const updated = await updateCriterionMutation.mutateAsync({
        gateName: viewingGate.name,
        criterionId,
        data,
      });
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update criterion', 'error');
    }
  };

  const handleDeleteCriterion = async (criterionId: string) => {
    if (!viewingGate) return;
    try {
      const updated = await deleteCriterionMutation.mutateAsync({
        gateName: viewingGate.name,
        criterionId,
      });
      showToast('Criterion removed', 'success');
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete criterion', 'error');
    }
  };

  const handleAddDeliverable = async (deliverable: Partial<GateDeliverable>) => {
    if (!viewingGate) return;
    try {
      const updated = await addDeliverableMutation.mutateAsync({
        gateName: viewingGate.name,
        deliverable,
      });
      showToast('Gate deliverable added!', 'success');
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to add deliverable', 'error');
    }
  };

  const handleUpdateDeliverable = async (deliverableId: string, data: Partial<GateDeliverable>) => {
    if (!viewingGate) return;
    try {
      const updated = await updateDeliverableMutation.mutateAsync({
        gateName: viewingGate.name,
        deliverableId,
        data,
      });
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update deliverable', 'error');
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!viewingGate) return;
    try {
      const updated = await deleteDeliverableMutation.mutateAsync({
        gateName: viewingGate.name,
        deliverableId,
      });
      showToast('Deliverable removed', 'success');
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete deliverable', 'error');
    }
  };

  const handleAddGateReview = async (review: { reviewer: string; decision: 'Approved' | 'Approved with Conditions' | 'Rejected'; comments?: string }) => {
    if (!viewingGate) return;
    try {
      const updated = await addGateReviewMutation.mutateAsync({
        gateName: viewingGate.name,
        review,
      });
      showToast(`Gate sign-off decision recorded: ${review.decision}!`, 'success');
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to record gate review', 'error');
    }
  };

  const handleDeleteGate = async (gateName: string) => {
    if (!confirm(`Are you sure you want to delete stage-gate ${gateName}?`)) return;
    try {
      await deleteGateMutation.mutateAsync(gateName);
      showToast(`Stage-Gate ${gateName} removed successfully`, 'success');
      setViewingGate(null);
      setEditingGate(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete stage-gate', 'error');
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-32 space-x-3 text-slate-500 font-sans">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="text-sm font-bold">Loading Gate Management Module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header & Summary */}
      <GateHeaderSummary
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id: string) => setSelectedProjectId(id)}
        summary={summary}
        onCreateClick={() => setIsCreateOpen(true)}
        onRefreshClick={() => refetch()}
        isFetching={isFetching}
      />

      {/* Main Table View */}
      {isLoadingGates ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Fetching stage-gate records from ERPNext...</p>
        </div>
      ) : isErrorGates ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-6 shadow-xs font-sans">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Failed to Load Stage-Gates</h2>
            <p className="text-xs text-slate-500">
              {(gateError as any)?.message || 'Unable to retrieve stage-gate records.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </button>
        </div>
      ) : (
        <GateTableView
          gates={gates}
          onViewGate={(gate) => setViewingGate(gate)}
          onEditGate={(gate) => setEditingGate(gate)}
          onDeleteGate={handleDeleteGate}
        />
      )}

      {/* Create Dialog */}
      {isCreateOpen && (
        <GateFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Edit Dialog */}
      {editingGate && (
        <GateFormDialog
          isOpen={!!editingGate}
          onClose={() => setEditingGate(null)}
          onSubmit={handleEditSubmit}
          initialData={editingGate}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Detail & Criteria/Deliverables/Reviews Modal */}
      {viewingGate && (
        <GateDetailModal
          gate={viewingGate}
          onClose={() => setViewingGate(null)}
          onEdit={(gate) => {
            setViewingGate(null);
            setEditingGate(gate);
          }}
          onDelete={handleDeleteGate}
          onAddCriterion={handleAddCriterion}
          onUpdateCriterion={handleUpdateCriterion}
          onDeleteCriterion={handleDeleteCriterion}
          onAddDeliverable={handleAddDeliverable}
          onUpdateDeliverable={handleUpdateDeliverable}
          onDeleteDeliverable={handleDeleteDeliverable}
          onAddGateReview={handleAddGateReview}
        />
      )}
    </div>
  );
}
