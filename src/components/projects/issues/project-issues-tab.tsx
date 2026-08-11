import React, { useState } from 'react';
import { useIssues, useCreateIssue, useUpdateIssue, useDeleteIssue } from '@/hooks/use-issues';
import { useToast } from '@/providers/toast-context';
import { IssueTableView } from '@/components/issues/issue-table-view';
import { IssueFormDialog, IssueFormValues } from '@/components/issues/issue-form-dialog';
import { IssueDetailModal } from '@/components/issues/issue-detail-modal';
import { Issue } from '@/types/issue.types';
import { Loader2, Plus, AlertTriangle } from 'lucide-react';

interface ProjectIssuesTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectIssuesTab({ projectId, projectName }: ProjectIssuesTabProps) {
  const { showToast } = useToast();

  const {
    data: issueListData,
    isLoading,
    refetch,
  } = useIssues({
    project: projectId,
    pageSize: 100,
  });

  const issues: Issue[] = issueListData?.issues || [];

  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue();
  const deleteIssueMutation = useDeleteIssue();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null);

  const handleCreateSubmit = async (values: IssueFormValues) => {
    try {
      const newIssue = await createIssueMutation.mutateAsync({
        ...values,
        project: projectId,
      });
      showToast(`Issue ${newIssue.name} logged for ${projectName}!`, 'success');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create issue in ERPNext', 'error');
    }
  };

  const handleEditSubmit = async (values: IssueFormValues) => {
    if (!editingIssue) return;
    try {
      await updateIssueMutation.mutateAsync({
        name: editingIssue.name,
        data: {
          ...values,
          project: projectId,
        },
      });
      showToast(`Issue ${editingIssue.name} updated successfully!`, 'success');
      setEditingIssue(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update issue in ERPNext', 'error');
    }
  };

  const handleDeleteIssue = async (issueName: string) => {
    if (!confirm(`Are you sure you want to delete issue ${issueName}?`)) return;
    try {
      await deleteIssueMutation.mutateAsync(issueName);
      showToast(`Issue ${issueName} deleted successfully`, 'success');
      setViewingIssue(null);
      setEditingIssue(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete issue', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 mx-auto" />
        <p className="text-xs font-bold text-slate-600">
          Loading issues for project {projectName}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <h3 className="text-base font-black text-slate-900">
              Project Issues & Defect Log
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Project-isolated issue tracking for <strong className="text-slate-800">{projectName}</strong> ({projectId}).
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
        >
          <Plus className="h-4 w-4" />
          <span>Log Project Issue</span>
        </button>
      </div>

      {/* Table View */}
      <IssueTableView
        issues={issues}
        onViewIssue={(issue) => setViewingIssue(issue)}
        onEditIssue={(issue) => setEditingIssue(issue)}
        onDeleteIssue={handleDeleteIssue}
      />

      {/* Modals */}
      {isCreateOpen && (
        <IssueFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={projectId}
        />
      )}

      {editingIssue && (
        <IssueFormDialog
          isOpen={!!editingIssue}
          onClose={() => setEditingIssue(null)}
          onSubmit={handleEditSubmit}
          initialData={editingIssue}
          defaultProjectId={projectId}
        />
      )}

      {viewingIssue && (
        <IssueDetailModal
          issue={viewingIssue}
          onClose={() => setViewingIssue(null)}
          onEdit={(issue) => {
            setViewingIssue(null);
            setEditingIssue(issue);
          }}
          onDelete={handleDeleteIssue}
        />
      )}
    </div>
  );
}
