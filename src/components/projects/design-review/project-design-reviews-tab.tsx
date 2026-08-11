import React, { useState } from 'react';
import {
  useDesignReviews,
  useCreateDesignReview,
  useUpdateDesignReview,
  useAddReviewFinding,
  useDeleteDesignReview,
} from '@/hooks/use-design-reviews';
import { useToast } from '@/providers/toast-context';
import { DesignReviewTableView } from '@/components/design-review/design-review-table-view';
import { DesignReviewFormDialog, DesignReviewFormValues } from '@/components/design-review/design-review-form-dialog';
import { DesignReviewDetailModal } from '@/components/design-review/design-review-detail-modal';
import { DesignReview, ReviewFinding } from '@/types/design-review.types';
import { Plus, Loader2 } from 'lucide-react';

interface ProjectDesignReviewsTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectDesignReviewsTab({ projectId, projectName }: ProjectDesignReviewsTabProps) {
  const { showToast } = useToast();
  const {
    data: reviewListData,
    isLoading,
    isError,
    refetch,
  } = useDesignReviews({ project: projectId, pageSize: 100 });

  const reviews = reviewListData?.reviews || [];

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
        project: projectId,
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
      showToast(`Design Review ${newReview.name} scheduled for ${projectId}`, 'success');
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
          project: projectId,
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
      showToast(`Design Review ${editingReview.name} updated`, 'success');
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
      showToast('Finding added to review!', 'success');
      setViewingReview(updated);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to add finding', 'error');
    }
  };

  const handleDeleteReview = async (reviewName: string) => {
    if (!confirm(`Delete design review ${reviewName}?`)) return;
    try {
      await deleteReviewMutation.mutateAsync(reviewName);
      showToast(`Design review ${reviewName} deleted`, 'success');
      setViewingReview(null);
      setEditingReview(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete design review', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Design Reviews & Milestone Approvals ({projectName})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Conduct peer reviews, sign off on APQP design gates, and track findings for {projectId}.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Design Review</span>
        </button>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading design reviews for {projectId}...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
          <p className="text-xs font-bold text-rose-600">Failed to load design reviews.</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <DesignReviewTableView
          reviews={reviews}
          onViewReview={(r) => setViewingReview(r)}
          onEditReview={(r) => setEditingReview(r)}
          onDeleteReview={handleDeleteReview}
        />
      )}

      {/* Form & Modals */}
      {isCreateOpen && (
        <DesignReviewFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={projectId}
        />
      )}

      {editingReview && (
        <DesignReviewFormDialog
          isOpen={!!editingReview}
          onClose={() => setEditingReview(null)}
          onSubmit={handleEditSubmit}
          initialData={editingReview}
          defaultProjectId={projectId}
        />
      )}

      {viewingReview && (
        <DesignReviewDetailModal
          review={viewingReview}
          onClose={() => setViewingReview(null)}
          onEdit={(r) => {
            setViewingReview(null);
            setEditingReview(r);
          }}
          onDelete={handleDeleteReview}
          onAddFinding={handleAddFinding}
        />
      )}
    </div>
  );
}
