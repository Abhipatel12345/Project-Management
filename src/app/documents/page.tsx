'use client';

import React, { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import {
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from '@/hooks/use-documents';
import { useToast } from '@/providers/toast-context';
import { DocumentHeaderSummary } from '@/components/documents/document-header-summary';
import { DocumentTableView } from '@/components/documents/document-table-view';
import { DocumentFormDialog, DocumentFormValues } from '@/components/documents/document-form-dialog';
import { DocumentDetailModal } from '@/components/documents/document-detail-modal';
import { DocumentItem } from '@/types/document.types';
import { Project } from '@/types/project.types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function DocumentsPage() {
  const { showToast } = useToast();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];

  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  const {
    data: documentListData,
    isLoading: isLoadingDocuments,
    isError: isErrorDocuments,
    error: documentError,
    refetch,
    isFetching,
  } = useDocuments({
    project: selectedProjectId === 'ALL' ? undefined : selectedProjectId,
    pageSize: 100,
  });

  const documents: DocumentItem[] = documentListData?.documents || [];
  const summary = documentListData?.summary || {
    totalDocuments: 0,
    projectDocuments: 0,
    recentlyAdded: 0,
    requiringReview: 0,
  };

  const createDocumentMutation = useCreateDocument();
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);

  const handleCreateSubmit = async (values: DocumentFormValues) => {
    try {
      const newDoc = await createDocumentMutation.mutateAsync({
        title: values.title,
        project: values.project || undefined,
        document_type: values.document_type,
        version: values.version,
        uploaded_by: values.uploaded_by,
        status: values.status,
        review_status: values.review_status,
        description: values.description,
        notes: values.notes,
        file_name: values.file_name,
      });
      showToast(`Document ${newDoc.name} uploaded successfully to ERPNext!`, 'success');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload document to ERPNext', 'error');
    }
  };

  const handleEditSubmit = async (values: DocumentFormValues) => {
    if (!editingDocument) return;
    try {
      await updateDocumentMutation.mutateAsync({
        name: editingDocument.name,
        data: {
          title: values.title,
          project: values.project || undefined,
          document_type: values.document_type,
          version: values.version,
          uploaded_by: values.uploaded_by,
          status: values.status,
          review_status: values.review_status,
          description: values.description,
          notes: values.notes,
          file_name: values.file_name,
        },
      });
      showToast(`Document ${editingDocument.name} updated successfully!`, 'success');
      setEditingDocument(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update document metadata', 'error');
    }
  };

  const handleDeleteDocument = async (docName: string) => {
    if (!confirm(`Are you sure you want to delete document ${docName}?`)) return;
    try {
      await deleteDocumentMutation.mutateAsync(docName);
      showToast(`Document ${docName} removed successfully`, 'success');
      setViewingDocument(null);
      setEditingDocument(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  };

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center py-32 space-x-3 text-slate-500 font-sans">
        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
        <span className="text-sm font-bold">Loading Engineering Documents Module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header & Executive Summary */}
      <DocumentHeaderSummary
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id: string) => setSelectedProjectId(id)}
        summary={summary}
        onCreateClick={() => setIsCreateOpen(true)}
        onRefreshClick={() => refetch()}
        isFetching={isFetching}
      />

      {/* Main Table View */}
      {isLoadingDocuments ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Fetching document vault records from ERPNext...</p>
        </div>
      ) : isErrorDocuments ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-6 shadow-xs font-sans">
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Failed to Load ERPNext Documents</h2>
            <p className="text-xs text-slate-500">
              {(documentError as any)?.message || 'Unable to retrieve document vault records.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </button>
        </div>
      ) : (
        <DocumentTableView
          documents={documents}
          onViewDocument={(doc) => setViewingDocument(doc)}
          onEditDocument={(doc) => setEditingDocument(doc)}
          onDeleteDocument={handleDeleteDocument}
        />
      )}

      {/* Upload/Create Dialog */}
      {isCreateOpen && (
        <DocumentFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Edit Dialog */}
      {editingDocument && (
        <DocumentFormDialog
          isOpen={!!editingDocument}
          onClose={() => setEditingDocument(null)}
          onSubmit={handleEditSubmit}
          initialData={editingDocument}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : undefined}
        />
      )}

      {/* Detail Modal */}
      {viewingDocument && (
        <DocumentDetailModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
          onEdit={(doc) => {
            setViewingDocument(null);
            setEditingDocument(doc);
          }}
          onDelete={handleDeleteDocument}
        />
      )}
    </div>
  );
}
