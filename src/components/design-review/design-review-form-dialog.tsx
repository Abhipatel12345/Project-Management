'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  DesignReview,
  DesignReviewType,
  DesignReviewStatus,
  DesignReviewApprovalStatus,
} from '@/types/design-review.types';
import { Project } from '@/types/project.types';
import { useProjects } from '@/hooks/use-projects';
import { useAvailableEmployees } from '@/hooks/use-project-team';
import { useAuth } from '@/providers/auth-context';
import documentService from '@/services/document.service';
import { auditService } from '@/services/audit.service';
import {
  X,
  Loader2,
  ClipboardList,
  UploadCloud,
  FileText,
  Trash2,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DesignReviewFormValues {
  title: string;
  project?: string;
  review_type: DesignReviewType | string;
  reviewer: string;
  review_date?: string;
  participantsStr?: string;
  status: DesignReviewStatus;
  approval_status: DesignReviewApprovalStatus;
  description?: string;
  notes?: string;
  documents?: {
    id: string;
    name: string;
    file_name: string;
    file_url?: string;
    file_size?: number;
    uploaded_by?: string;
    uploaded_at?: string;
  }[];
}

interface AttachedFileItem {
  name: string;
  size: number;
  file: File;
  dataUrl: string;
}

interface DesignReviewFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DesignReviewFormValues) => Promise<void>;
  initialData?: DesignReview | null;
  defaultProjectId?: string;
}

export function DesignReviewFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultProjectId,
}: DesignReviewFormDialogProps) {
  const { user, hasPermission } = useAuth();
  const canApproveDesign = hasPermission('approveDesign');
  const isEditing = !!initialData;
  const { data: projectsData } = useProjects({ page: 1, pageSize: 50 });
  const { data: employees = [] } = useAvailableEmployees('');
  const projects: Project[] = projectsData?.projects || [];

  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultReviewer =
    employees.length > 0 ? employees[0].full_name || employees[0].name : 'Administrator';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DesignReviewFormValues>({
    defaultValues: {
      title: '',
      project: defaultProjectId || '',
      review_type: 'Concept Review',
      reviewer: defaultReviewer,
      review_date: new Date().toISOString().split('T')[0],
      participantsStr: 'Administrator, Quality Lead',
      status: 'Planned',
      approval_status: 'Pending',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        project: initialData.project || defaultProjectId || '',
        review_type: initialData.review_type || 'Concept Review',
        reviewer: initialData.reviewer || defaultReviewer,
        review_date: initialData.review_date || new Date().toISOString().split('T')[0],
        participantsStr: (initialData.participants || []).join(', '),
        status: initialData.status || 'Planned',
        approval_status: initialData.approval_status || 'Pending',
        description: initialData.description || '',
        notes: initialData.notes || '',
      });
      setAttachedFiles([]);
    } else {
      reset({
        title: '',
        project: defaultProjectId || (projects.length > 0 ? projects[0].name : ''),
        review_type: 'Concept Review',
        reviewer: defaultReviewer,
        review_date: new Date().toISOString().split('T')[0],
        participantsStr: 'Administrator, Quality Lead',
        status: 'Planned',
        approval_status: 'Pending',
        description: '',
        notes: '',
      });
      setAttachedFiles([]);
    }
  }, [initialData, reset, isOpen, defaultProjectId, projects]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            file,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onFormSubmit = async (values: DesignReviewFormValues) => {
    try {
      const uploadedDocsList: any[] = initialData?.documents ? [...initialData.documents] : [];
      const targetProjectId = values.project || 'GLOBAL';

      for (const att of attachedFiles) {
        try {
          const docRecord = await documentService.uploadDocument({
            title: att.name,
            project: targetProjectId,
            document_type: 'Design',
            version: 'v1.0',
            uploaded_by: user?.fullName || 'Administrator',
            file_name: att.name,
            file_size: att.size,
            file_url: att.dataUrl,
            file_data: att.dataUrl,
            status: 'Approved',
            review_status: 'Approved',
            entity_type: 'DesignReview',
            description: `Design review artifact for ${values.title}`,
          });

          uploadedDocsList.push({
            id: docRecord.name,
            name: docRecord.name,
            file_name: att.name,
            file_url: docRecord.file_url,
            file_size: att.size,
            uploaded_by: user?.fullName || 'Administrator',
            uploaded_at: new Date().toISOString(),
          });

          auditService.logAction(
            user?.fullName || 'Administrator',
            'Document Uploaded',
            'Document',
            att.name,
            `Uploaded design document "${att.name}" for Design Review "${values.title}"`,
            undefined,
            undefined,
            user?.roleLabel,
            targetProjectId
          );
        } catch (docErr) {
          console.warn('[Design Review Doc Upload Notice]', docErr);
        }
      }

      await onSubmit({
        ...values,
        documents: uploadedDocsList,
      });

      auditService.logAction(
        user?.fullName || 'Administrator',
        isEditing ? 'Design Review Updated' : 'Design Review Created',
        'DesignReview',
        values.title,
        `${isEditing ? 'Updated' : 'Created'} design review "${values.title}" (${values.review_type}) with ${uploadedDocsList.length} document(s).`,
        undefined,
        values.status,
        user?.roleLabel,
        targetProjectId
      );

      onClose();
    } catch {}
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isEditing ? 'Edit Design Review & Gate Check' : 'Create Engineering Design Review'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Formal technical review, CAD evaluations, documents, and sign-off decision log.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Review Title & Focus Area <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('title', { required: 'Review title is required' })}
                placeholder="e.g. EV Battery Pack Thermal Manifold Detailed Design Review"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  errors.title ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Associated Project</label>
                <select
                  {...register('project')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.project_name || p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Design Review Phase</label>
                <select
                  {...register('review_type')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Concept Review">Concept Review (CR)</option>
                  <option value="Preliminary Design Review">Preliminary Design Review (PDR)</option>
                  <option value="Detailed Design Review">Detailed Design Review (DDR)</option>
                  <option value="Engineering Review">Engineering Sign-off</option>
                  <option value="Design Validation Review">Design Validation Review (DVR)</option>
                  <option value="Final Design Review">Final Design Review (FDR)</option>
                </select>
              </div>
            </div>

            {/* Owner, Date & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Lead / Owner</label>
                <select
                  {...register('reviewer')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                >
                  {employees.length > 0 ? (
                    employees.map((emp: any) => (
                      <option key={emp.name || emp.email} value={emp.full_name || emp.name}>
                        {emp.full_name || emp.name} ({emp.designation || 'Review Lead'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Sarah Jenkins">Sarah Jenkins (Project Manager)</option>
                      <option value="Yash">Yash (Team Member)</option>
                      <option value="Administrator">Administrator (PMO)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Date</label>
                <input
                  type="date"
                  {...register('review_date')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Approval Status & Participants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Approval Decision</label>
                <select
                  {...register('approval_status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Pending">Pending Sign-off</option>
                  <option value="Under Review">Under Review</option>
                  {canApproveDesign && (
                    <>
                      <option value="Approved">Approved</option>
                      <option value="Approved with Conditions">Approved with Conditions</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Key Participants</label>
                <input
                  type="text"
                  {...register('participantsStr')}
                  placeholder="e.g. Administrator, Sarah Jenkins, Yash"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Document Uploads / Attachments Zone */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                  Documents & Attachments (CAD, Specs, Drawings, Reports)
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  PDF, DOCX, XLSX, STEP, PNG
                </span>
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <UploadCloud className="h-6 w-6 text-indigo-600" />
                <p className="text-xs font-bold text-slate-700">
                  Click to browse or drag & drop design documents
                </p>
                <p className="text-[10px] text-slate-400">
                  Files will be securely stored and linked to this Design Review.
                </p>
              </div>

              {/* Uploaded File List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {attachedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <span className="font-bold text-slate-800">{f.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({formatSize(f.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachedFile(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Review Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Review Agenda & Technical Scope
              </label>
              <textarea
                rows={3}
                {...register('description')}
                placeholder="Key design criteria evaluated, CAD boundary conditions, FEA simulation results..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? 'Save Review Updates' : 'Create Design Review'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
