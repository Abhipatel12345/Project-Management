import React, { useState } from 'react';
import {
  useGates,
  useCreateGate,
  useUpdateGate,
  useAddGateDeliverable,
  useDeleteGate,
} from '@/hooks/use-gates';
import { useToast } from '@/providers/toast-context';
import { GateTableView } from '@/components/gates/gate-table-view';
import { GateFormDialog, GateFormValues } from '@/components/gates/gate-form-dialog';
import { GateDetailModal } from '@/components/gates/gate-detail-modal';
import { Gate, GateDeliverable, GateApprovalStatus } from '@/types/gate.types';
import { Plus, Loader2 } from 'lucide-react';

interface ProjectGatesTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectGatesTab({ projectId, projectName }: ProjectGatesTabProps) {
  const { showToast } = useToast();
  const {
    data: gateListData,
    isLoading,
    isError,
    refetch,
  } = useGates({ project: projectId, pageSize: 100 });

  const gates = gateListData?.gates || [];

  const createGateMutation = useCreateGate();
  const updateGateMutation = useUpdateGate();
  const addDeliverableMutation = useAddGateDeliverable();
  const deleteGateMutation = useDeleteGate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [viewingGate, setViewingGate] = useState<Gate | null>(null);

  const handleCreateSubmit = async (values: GateFormValues) => {
    try {
      const newGate = await createGateMutation.mutateAsync({
        gate_name: values.gate_name,
        project: projectId,
        gate_type: values.gate_type,
        planned_date: values.planned_date,
        actual_date: values.actual_date,
        gate_owner: values.gate_owner,
        status: values.status,
        approval_status: values.approval_status,
        description: values.description,
        deliverables: [],
      });
      showToast(`Stage-Gate ${newGate.name} created for ${projectId}`, 'success');
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
          project: projectId,
          gate_type: values.gate_type,
          planned_date: values.planned_date,
          actual_date: values.actual_date,
          gate_owner: values.gate_owner,
          status: values.status,
          approval_status: values.approval_status,
          description: values.description,
        },
      });
      showToast(`Stage-Gate ${editingGate.name} updated`, 'success');
      setEditingGate(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage-gate', 'error');
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

  const handleUpdateGateStatus = async (status: string, approvalStatus: GateApprovalStatus) => {
    if (!viewingGate) return;
    try {
      const updated = await updateGateMutation.mutateAsync({
        name: viewingGate.name,
        data: {
          status: status as any,
          approval_status: approvalStatus,
          actual_date: status === 'Approved' || status === 'Completed' ? new Date().toISOString().split('T')[0] : viewingGate.actual_date,
        },
      });
      showToast(`Gate sign-off status updated to ${approvalStatus}`, 'success');
      setViewingGate(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update gate status', 'error');
    }
  };

  const handleDeleteGate = async (gateName: string) => {
    if (!confirm(`Delete stage-gate ${gateName}?`)) return;
    try {
      await deleteGateMutation.mutateAsync(gateName);
      showToast(`Stage-Gate ${gateName} deleted`, 'success');
      setViewingGate(null);
      setEditingGate(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete stage-gate', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900">
            APQP Stage-Gates & Governance ({projectName})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Enforce gate entry/exit criteria, deliverable readiness, and sign-offs for {projectId}.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Stage-Gate</span>
        </button>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading stage-gates for {projectId}...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
          <p className="text-xs font-bold text-rose-600">Failed to load stage-gates.</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <GateTableView
          gates={gates}
          onViewGate={(g) => setViewingGate(g)}
          onEditGate={(g) => setEditingGate(g)}
          onDeleteGate={handleDeleteGate}
        />
      )}

      {/* Form & Modals */}
      {isCreateOpen && (
        <GateFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={projectId}
        />
      )}

      {editingGate && (
        <GateFormDialog
          isOpen={!!editingGate}
          onClose={() => setEditingGate(null)}
          onSubmit={handleEditSubmit}
          initialData={editingGate}
          defaultProjectId={projectId}
        />
      )}

      {viewingGate && (
        <GateDetailModal
          gate={viewingGate}
          onClose={() => setViewingGate(null)}
          onEdit={(g) => {
            setViewingGate(null);
            setEditingGate(g);
          }}
          onDelete={handleDeleteGate}
          onAddDeliverable={handleAddDeliverable}
          onUpdateGateStatus={handleUpdateGateStatus}
        />
      )}
    </div>
  );
}
