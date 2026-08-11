'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { useIssues, useCreateIssue, useUpdateIssue, useDeleteIssue } from '@/hooks/use-issues';
import { useToast } from '@/providers/toast-context';
import { IssueHeaderSummary } from '@/components/issues/issue-header-summary';
import { IssueTableView } from '@/components/issues/issue-table-view';
import { IssueFormDialog, IssueFormValues } from '@/components/issues/issue-form-dialog';
import { IssueDetailModal } from '@/components/issues/issue-detail-modal';
import { Issue } from '@/types/issue.types';
import { Project } from '@/types/project.types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function IssuesPage() {
  const { showToast } = useToast();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  // Fetch real ERPNext Issue records
  const {
    data: issueListData,
    isLoading: isLoadingIssues,
    isError: isErrorIssues,
    error: issueError,
    refetch,
  } = useIssues({
    project: selectedProjectId === 'ALL' ? undefined : selectedProjectId,
    pageSize: 100,
  });

  const issues: Issue[] = issueListData?.issues || [];
  const summary = issueListData?.summary || {
    totalIssues: 0,
    openIssues: 0,
    highPriorityIssues: 0,
    urgentIssues: 0,
    resolvedIssues: 0,
    onHoldIssues: 0,
  };

  // Issue Mutations
  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue();
  const deleteIssueMutation = useDeleteIssue();

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null);

  // Handlers
  const handleCreateSubmit = async (values: IssueFormValues) => {
    try {
      const newIssue = await createIssueMutation.mutateAsync({
        subject: values.subject,
        project: values.project || undefined,
        status: values.status,
        priority: values.priority,
        issue_type: values.issue_type,
        description: values.description,
        customer: values.customer,
        raised_by: values.raised_by,
        assigned_to: values.assigned_to,
      });
      showToast(`Issue ${newIssue.name} created successfully in ERPNext!`, 'success');
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
          subject: values.subject,
          project: values.project || undefined,
          status: values.status,
          priority: values.priority,
          issue_type: values.issue_type,
          description: values.description,
          customer: values.customer,
          raised_by: values.raised_by,
          assigned_to: values.assigned_to,
        },
      });
      showToast(`Issue ${editingIssue.name} updated successfully in ERPNext!`, 'success');
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
      showToast(`Issue ${issueName} deleted successfully from ERPNext`, 'success');
      setViewingIssue(null);
      setEditingIssue(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete issue from ERPNext', 'error');
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-32 space-x-3 text-slate-500 font-sans">
        <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        <span className="text-sm font-bold">Loading Open Issues & Defect Module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner & Executive Metrics */}
      <IssueHeaderSummary
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id: string) => setSelectedProjectId(id)}
        summary={summary}
        onCreateClick={() => setIsCreateOpen(true)}
      />

      {/* Main Issue Table View */}
      {isLoadingIssues ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">
            Fetching issue records from ERPNext Issue DocType...
          </p>
        </div>
      ) : isErrorIssues ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-6 shadow-xs font-sans">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Failed to Load ERPNext Issues</h2>
            <p className="text-xs text-slate-500">
              {(issueError as any)?.message || 'Unable to retrieve issues from ERPNext server.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry ERPNext Connection
          </button>
        </div>
      ) : (
        <IssueTableView
          issues={issues}
          onViewIssue={(issue: Issue) => setViewingIssue(issue)}
          onEditIssue={(issue: Issue) => setEditingIssue(issue)}
          onDeleteIssue={handleDeleteIssue}
        />
      )}

      {/* Create Issue Dialog */}
      {isCreateOpen && (
        <IssueFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Edit Issue Dialog */}
      {editingIssue && (
        <IssueFormDialog
          isOpen={!!editingIssue}
          onClose={() => setEditingIssue(null)}
          onSubmit={handleEditSubmit}
          initialData={editingIssue}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Issue Detail Modal */}
      {viewingIssue && (
        <IssueDetailModal
          issue={viewingIssue}
          onClose={() => setViewingIssue(null)}
          onEdit={(issue: Issue) => {
            setViewingIssue(null);
            setEditingIssue(issue);
          }}
          onDelete={handleDeleteIssue}
        />
      )}
    </div>
  );
}
