'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import {
  useDesignReviews,
  useCreateDesignReview,
  useUpdateDesignReview,
  useAddReviewFinding,
  useDeleteDesignReview,
} from '@/hooks/use-design-reviews';
import { useToast } from '@/providers/toast-context';
import { DesignReviewHeaderSummary } from '@/components/design-review/design-review-header-summary';
import { DesignReviewTableView } from '@/components/design-review/design-review-table-view';
import { DesignReviewFormDialog, DesignReviewFormValues } from '@/components/design-review/design-review-form-dialog';
import { DesignReviewDetailModal } from '@/components/design-review/design-review-detail-modal';
import { DesignReview, ReviewFinding } from '@/types/design-review.types';
import { Project } from '@/types/project.types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function DesignReviewPage() {
  const { showToast } = useToast();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  const {
    data: reviewListData,
    isLoading: isLoadingReviews,
    isError: isErrorReviews,
    error: reviewError,
    refetch,
    isFetching,
  } = useDesignReviews({
    project: selectedProjectId === 'ALL' ? undefined : selectedProjectId,
    pageSize: 100,
  });

  const reviews: DesignReview[] = reviewListData?.reviews || [];
  const summary = reviewListData?.summary || {
    totalReviews: 0,
    plannedReviews: 0,
    inProgressReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    openFindings: 0,
  };

  const createReviewMutation = useCreateDesignReview();
  const updateReviewMutation = useUpdateDesignReview();
  const addFindingMutation = useAddReviewFinding();
  const deleteReviewMutation = useDeleteDesignReview();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<DesignReview | null>(null);
  const [viewingReview, setViewingReview] = useState<DesignReview | null>(null);

  const handleCreateSubmit = async (values: DesignReviewFormValues) => {
    try {
      const participants = values.participantsStr
        ? values.participantsStr.split(',').map((s) => s.trim()).filter(Boolean)
        : ['Administrator'];

      const newReview = await createReviewMutation.mutateAsync({
        title: values.title,
        project: values.project || undefined,
        review_type: values.review_type,
        reviewer: values.reviewer,
        review_date: values.review_date,
        participants,
        status: values.status,
        approval_status: values.approval_status,
        description: values.description,
        notes: values.notes,
        findings: [],
      });

      showToast(`Design Review ${newReview.name} scheduled successfully!`, 'success');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create design review', 'error');
    }
  };

  const handleEditSubmit = async (values: DesignReviewFormValues) => {
    if (!editingReview) return;
    try {
      const participants = values.participantsStr
        ? values.participantsStr.split(',').map((s) => s.trim()).filter(Boolean)
        : editingReview.participants;

      await updateReviewMutation.mutateAsync({
        name: editingReview.name,
        data: {
          title: values.title,
          project: values.project || undefined,
          review_type: values.review_type,
          reviewer: values.reviewer,
          review_date: values.review_date,
          participants,
          status: values.status,
          approval_status: values.approval_status,
          description: values.description,
          notes: values.notes,
        },
      });

      showToast(`Design Review ${editingReview.name} updated successfully!`, 'success');
      setEditingReview(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update design review', 'error');
    }
  };

  const handleAddFinding = async (finding: Partial<ReviewFinding>) => {
    if (!viewingReview) return;
    try {
      const updated = await addFindingMutation.mutateAsync({
        reviewName: viewingReview.name,
        finding,
      });
      showToast('Review finding added successfully!', 'success');
      setViewingReview(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to add finding', 'error');
    }
  };

  const handleUpdateReviewStatus = async (
    reviewName: string,
    status: any,
    approvalStatus: any,
    approvedBy?: string,
    comment?: string
  ) => {
    try {
      await updateReviewMutation.mutateAsync({
        name: reviewName,
        data: {
          status,
          approval_status: approvalStatus,
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          approval_comment: comment,
        },
      });
      showToast(`Design Review ${reviewName} updated to ${approvalStatus}`, 'success');
      refetch();
      if (viewingReview && viewingReview.name === reviewName) {
        setViewingReview((prev) =>
          prev
            ? {
                ...prev,
                status,
                approval_status: approvalStatus,
                approved_by: approvedBy,
                approved_at: new Date().toISOString(),
                approval_comment: comment,
              }
            : null
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update review status', 'error');
    }
  };

  const handleDeleteReview = async (reviewName: string) => {
    if (!confirm(`Are you sure you want to delete design review ${reviewName}?`)) return;
    try {
      await deleteReviewMutation.mutateAsync(reviewName);
      showToast(`Design Review ${reviewName} removed successfully`, 'success');
      setViewingReview(null);
      setEditingReview(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete design review', 'error');
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-32 space-x-3 text-slate-500 font-sans">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-sm font-bold">Loading Design Review Module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header & Summary */}
      <DesignReviewHeaderSummary
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id: string) => setSelectedProjectId(id)}
        summary={summary}
        onCreateClick={() => setIsCreateOpen(true)}
        onRefreshClick={() => refetch()}
        isFetching={isFetching}
      />

      {/* Main Table View */}
      {isLoadingReviews ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Fetching design review records from ERPNext...</p>
        </div>
      ) : isErrorReviews ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-6 shadow-xs font-sans">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Failed to Load Design Reviews</h2>
            <p className="text-xs text-slate-500">
              {(reviewError as any)?.message || 'Unable to retrieve design review records.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </button>
        </div>
      ) : (
        <DesignReviewTableView
          reviews={reviews}
          onViewReview={(review) => setViewingReview(review)}
          onEditReview={(review) => setEditingReview(review)}
          onDeleteReview={handleDeleteReview}
        />
      )}

      {/* Schedule/Create Dialog */}
      {isCreateOpen && (
        <DesignReviewFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Edit Dialog */}
      {editingReview && (
        <DesignReviewFormDialog
          isOpen={!!editingReview}
          onClose={() => setEditingReview(null)}
          onSubmit={handleEditSubmit}
          initialData={editingReview}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Detail & Action Items Modal */}
      {viewingReview && (
        <DesignReviewDetailModal
          review={viewingReview}
          onClose={() => setViewingReview(null)}
          onEdit={(review) => {
            setViewingReview(null);
            setEditingReview(review);
          }}
          onDelete={handleDeleteReview}
          onAddFinding={handleAddFinding}
          onUpdateReviewStatus={handleUpdateReviewStatus}
        />
      )}
    </div>
  );
}
