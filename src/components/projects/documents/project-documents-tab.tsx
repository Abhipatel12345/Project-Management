import React, { useState } from 'react';
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from '@/hooks/use-documents';
import { useToast } from '@/providers/toast-context';
import { DocumentTableView } from '@/components/documents/document-table-view';
import { DocumentFormDialog, DocumentFormValues } from '@/components/documents/document-form-dialog';
import { DocumentDetailModal } from '@/components/documents/document-detail-modal';
import { DocumentViewerModal } from '@/components/documents/document-viewer-modal';
import { DocumentItem } from '@/types/document.types';
import { Plus, Loader2, FileText, RefreshCw } from 'lucide-react';

interface ProjectDocumentsTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectDocumentsTab({ projectId, projectName }: ProjectDocumentsTabProps) {
  const { showToast } = useToast();
  const {
    data: documentListData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocuments({ project: projectId, pageSize: 100 });

  const documents = documentListData?.documents || [];
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
  const [inspectingViewerDoc, setInspectingViewerDoc] = useState<DocumentItem | null>(null);

  const handleCreateSubmit = async (values: DocumentFormValues) => {
    try {
      const newDoc = await createDocumentMutation.mutateAsync({
        title: values.title,
        project: projectId,
        document_type: values.document_type,
        version: values.version,
        uploaded_by: values.uploaded_by,
        status: values.status,
        review_status: values.review_status,
        description: values.description,
        notes: values.notes,
        file_name: values.file_name,
      });
      showToast(`Document ${newDoc.name} uploaded for project ${projectId}`, 'success');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload document', 'error');
    }
  };

  const handleEditSubmit = async (values: DocumentFormValues) => {
    if (!editingDocument) return;
    try {
      await updateDocumentMutation.mutateAsync({
        name: editingDocument.name,
        data: {
          title: values.title,
          project: projectId,
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
      showToast(`Document ${editingDocument.name} updated`, 'success');
      setEditingDocument(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to update document', 'error');
    }
  };

  const handleDeleteDocument = async (docName: string) => {
    if (!confirm(`Delete document ${docName}?`)) return;
    try {
      await deleteDocumentMutation.mutateAsync(docName);
      showToast(`Document ${docName} deleted`, 'success');
      setViewingDocument(null);
      setEditingDocument(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Project Documents ({projectName})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            CAD specifications, DHF compliance files, and engineering drawings assigned to {projectId}.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Project Document</span>
        </button>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Loading documents for {projectId}...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
          <p className="text-xs font-bold text-rose-600">Failed to load project documents.</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <DocumentTableView
          documents={documents}
          onViewDocument={(doc) => setInspectingViewerDoc(doc)}
          onEditDocument={(doc) => setEditingDocument(doc)}
          onDeleteDocument={handleDeleteDocument}
        />
      )}

      {/* Form & Modals */}
      {isCreateOpen && (
        <DocumentFormDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          defaultProjectId={projectId}
        />
      )}

      {editingDocument && (
        <DocumentFormDialog
          isOpen={!!editingDocument}
          onClose={() => setEditingDocument(null)}
          onSubmit={handleEditSubmit}
          initialData={editingDocument}
          defaultProjectId={projectId}
        />
      )}

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

      {inspectingViewerDoc && (
        <DocumentViewerModal
          document={inspectingViewerDoc}
          isOpen={!!inspectingViewerDoc}
          onClose={() => setInspectingViewerDoc(null)}
        />
      )}
    </div>
  );
}
