import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DocumentItem, DocumentType, DocumentStatus, DocumentReviewStatus } from '@/types/document.types';
import { Project } from '@/types/project.types';
import { useProjects } from '@/hooks/use-projects';
import { X, Loader2, FileText, Upload, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DocumentFormValues {
  title: string;
  project?: string;
  document_type: DocumentType | string;
  version: string;
  uploaded_by: string;
  status: DocumentStatus;
  review_status: DocumentReviewStatus;
  description?: string;
  notes?: string;
  file_name?: string;
}

interface DocumentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  initialData?: DocumentItem | null;
  defaultProjectId?: string;
}

export function DocumentFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
}: DocumentFormDialogProps) {
  const isEditing = !!initialData;
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const projects: Project[] = projectsData?.projects || [];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormValues>({
    defaultValues: {
      title: '',
      project: defaultProjectId || '',
      document_type: 'Engineering',
      version: 'v1.0',
      uploaded_by: 'Administrator',
      status: 'Draft',
      review_status: 'Pending Review',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        project: initialData.project || defaultProjectId || '',
        document_type: initialData.document_type || 'Engineering',
        version: initialData.version || 'v1.0',
        uploaded_by: initialData.uploaded_by || 'Administrator',
        status: initialData.status || 'Approved',
        review_status: initialData.review_status || 'Approved',
        description: initialData.description || '',
        notes: initialData.notes || '',
        file_name: initialData.file_name || '',
      });
    } else {
      reset({
        title: '',
        project: defaultProjectId || (projects.length > 0 ? projects[0].name : ''),
        document_type: 'Engineering',
        version: 'v1.0',
        uploaded_by: 'Administrator',
        status: 'Draft',
        review_status: 'Pending Review',
        description: '',
        notes: '',
        file_name: '',
      });
    }
  }, [initialData, reset, isOpen, defaultProjectId, projects]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      (setValue as any)('file_name', file.name);
      if (!initialData?.title) {
        (setValue as any)('title', file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const onFormSubmit = async (values: DocumentFormValues) => {
    try {
      await onSubmit({
        ...values,
        file_name: selectedFile?.name || values.file_name || 'document_attachment.pdf',
      });
      onClose();
    } catch {
      // Keep modal open on error
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8"
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isEditing ? `Edit Document Metadata (${initialData?.name})` : 'Upload New Project Document'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Store CAD specs, DHF attachments, BOM compliance, and engineering releases in ERPNext.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('title', { required: 'Document title is required' })}
                placeholder="e.g. EV Battery Thermal Cooling Loop Assembly Drawing"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
              {errors.title && <p className="text-[11px] font-bold text-rose-500">{errors.title.message}</p>}
            </div>

            {/* Project & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Associated Project</label>
                <select
                  {...register('project')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="">No Specific Project</option>
                  {projects.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.project_name || p.name} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Document Type</label>
                <select
                  {...register('document_type')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design CAD</option>
                  <option value="Specification">Specification</option>
                  <option value="Quality">Quality Control</option>
                  <option value="Testing">Testing & DVP&R</option>
                  <option value="APQP">APQP Gate File</option>
                  <option value="Process">Process Instruction</option>
                  <option value="Customer">Customer Spec</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Version & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Version Tag</label>
                <input
                  type="text"
                  {...register('version')}
                  placeholder="e.g. v1.0, v2.1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Document Status</label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Status</label>
                <select
                  {...register('review_status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="In Review">In Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Changes Requested">Changes Requested</option>
                </select>
              </div>
            </div>

            {/* File Upload Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">File Attachment</label>
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center relative hover:border-sky-400 transition cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="h-6 w-6 text-sky-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : 'Click or drop PDF, CAD, Excel, or Doc file here'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, STEP, DWG, XLSX up to 50MB</p>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Description & Release Notes</label>
              <textarea
                rows={3}
                {...register('description')}
                placeholder="Technical scope, engineering change order reference, or revision notes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? 'Save Document Changes' : 'Upload Document to ERPNext'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
