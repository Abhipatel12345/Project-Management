'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectFormSchema, ProjectFormValues } from '@/lib/validations/project.schema';
import { Project, PROJECT_CATEGORIES, PRODUCT_GROUPS, PROJECT_TYPES } from '@/types/project.types';
import {
  X,
  Loader2,
  FolderPlus,
  Edit3,
  Calendar,
  DollarSign,
  Tag,
  Percent,
  Layers,
  Sliders,
  AlertCircle,
  UploadCloud,
  FileText,
  Trash2,
  UserCheck,
  Paperclip,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import documentService from '@/services/document.service';
import { auditService } from '@/services/audit.service';
import { useAuth } from '@/providers/auth-context';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface AttachedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

interface ProjectFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues, attachedFiles?: AttachedFileItem[]) => Promise<void>;
  initialData?: Project | null;
  isLoading?: boolean;
}

const AVAILABLE_PROJECT_MANAGERS = [
  { name: 'Sarah Jenkins', email: 'sarah.jenkins@inteva.com', title: 'Senior Program Manager' },
  { name: 'Administrator', email: 'administrator@pdm.netlink.com', title: 'System Manager' },
  { name: 'Sarah Connor', email: 'sarah@pdm.netlink.com', title: 'Engineering Manager' },
  { name: 'Quality Lead', email: 'quality@netlink.com', title: 'APQP Quality Director' },
  { name: 'Robert Sterling', email: 'robert@pdm.netlink.com', title: 'Warehouse Specialist' },
];

export function ProjectFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: ProjectFormDialogProps) {
  const { user } = useAuth();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      project_name: '',
      status: 'Open',
      priority: 'Medium',
      project_type: 'Internal',
      custom_project_category: '',
      custom_product_group: '',
      percent_complete: 0,
      expected_start_date: '',
      expected_end_date: '',
      estimated_cost: 0,
      notes: '',
      owner: 'Sarah Jenkins (sarah.jenkins@inteva.com)',
    },
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setFormError(null);
    setAttachedFiles([]);
    if (initialData) {
      const p = initialData.priority as any;
      const safePriority = p === 'Critical' ? 'High' : p || 'Medium';
      reset({
        project_name: initialData.project_name || '',
        status: (initialData.status as any) || 'Open',
        priority: safePriority,
        project_type: initialData.project_type || 'Internal',
        custom_project_category: initialData.custom_project_category || '',
        custom_product_group: initialData.custom_product_group || '',
        percent_complete: initialData.percent_complete || 0,
        expected_start_date: initialData.expected_start_date || '',
        expected_end_date: initialData.expected_end_date || '',
        estimated_cost: initialData.estimated_cost || 0,
        company: initialData.company || '',
        department: initialData.department || '',
        notes: initialData.notes || '',
        owner: initialData.owner || 'Sarah Jenkins (sarah.jenkins@inteva.com)',
      });
    } else {
      reset({
        project_name: '',
        status: 'Open',
        priority: 'Medium',
        project_type: 'Internal',
        custom_project_category: '',
        custom_product_group: '',
        percent_complete: 0,
        expected_start_date: '',
        expected_end_date: '',
        estimated_cost: 0,
        company: '',
        department: '',
        notes: '',
        owner: 'Sarah Jenkins (sarah.jenkins@inteva.com)',
      });
    }
  }, [initialData, reset, isOpen]);

  // File Upload Handlers
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const fileId = `FILE-${Math.random().toString(36).substring(2, 9)}`;
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: fileId,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
          },
        ]);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onFormSubmit = async (data: ProjectFormValues) => {
    try {
      setFormError(null);
      await onSubmit(data, attachedFiles);

      // Save attached files directly into document store linked to the Project Name
      const targetProjectName = data.project_name || 'NEW-PROJECT';
      for (const attFile of attachedFiles) {
        await documentService.uploadDocument({
          title: attFile.name,
          project: targetProjectName,
          document_type: 'Engineering',
          version: 'v1.0',
          uploaded_by: user?.fullName || 'Administrator',
          file_name: attFile.name,
          file_size: attFile.size,
          file_url: attFile.dataUrl,
          status: 'Approved',
          review_status: 'Approved',
          description: `Uploaded during project creation for ${targetProjectName}`,
        });

        auditService.logAction(
          user?.fullName || 'Administrator',
          'Uploaded Document',
          'Document',
          attFile.name,
          `Attached ${attFile.name} to Project "${targetProjectName}" during project setup.`
        );
      }

      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save project. Please check form inputs.');
    }
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
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6"
        >
          {/* Dialog Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-100 bg-[#EBF5FF]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-sky-600 border border-sky-200 shadow-2xs">
                {isEditing ? <Edit3 className="h-5 w-5" /> : <FolderPlus className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isEditing ? `Edit Project: ${initialData?.project_name}` : 'Create New Project'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {isEditing
                    ? 'Update project details and charter milestones.'
                    : 'Fill in project information, assign Project Manager, and upload initial project documents.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Dialog Form Body */}
          <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between font-medium">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
                <button type="button" onClick={() => setFormError(null)} className="text-[11px] font-bold underline cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}

            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Project Name <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('project_name')}
                type="text"
                placeholder="e.g. Door Handle Assembly (PROJ-0043)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
              />
              {errors.project_name && (
                <p className="text-[11px] text-rose-500 font-bold">{errors.project_name.message}</p>
              )}
            </div>

            {/* Project Manager Assignment Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                Assigned Project Manager <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('owner')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
              >
                {AVAILABLE_PROJECT_MANAGERS.map((pm) => (
                  <option key={pm.email} value={`${pm.name} (${pm.email})`}>
                    {pm.name} — {pm.title} ({pm.email})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                The assigned Project Manager automatically receives full access to view, open, and download project documents.
              </p>
            </div>

            {/* Project Category & Product Group Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Project Category</label>
                <div className="relative">
                  <Sliders className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    {...register('custom_project_category')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                  >
                    <option value="">Select Category...</option>
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Product Group</label>
                <div className="relative">
                  <Layers className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    {...register('custom_product_group')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                  >
                    <option value="">Select Product Group...</option>
                    {PRODUCT_GROUPS.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Status & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            {/* Type & Percent Complete Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Project Type</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    {...register('project_type')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                  >
                    <option value="">Select Project Type...</option>
                    {PROJECT_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Percent Complete (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('percent_complete', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="100"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Expected Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('expected_start_date')}
                    type="date"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Expected Target End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('expected_end_date')}
                    type="date"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Estimated Cost ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  {...register('estimated_cost', { valueAsNumber: true })}
                  type="number"
                  placeholder="0.00"
                  step="1000"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* Scope Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Project Charter / Scope Notes</label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Key objectives, scope constraints, engineering parameters..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition resize-none"
              />
            </div>

            {/* NEW SECTION: Project Documents Drag & Drop Upload */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-sky-600" /> Project Documents
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Upload initial Project Charter, Customer Requirements, Specifications, or CAD Drawings.
                  </p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
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
                className={cn(
                  'p-5 border-2 border-dashed rounded-2xl text-center space-y-2 transition cursor-pointer',
                  isDragging
                    ? 'border-sky-500 bg-sky-50/80'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/80 hover:border-sky-400'
                )}
                onClick={() => {
                  const input = document.getElementById('project-file-upload-input');
                  if (input) input.click();
                }}
              >
                <input
                  id="project-file-upload-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <UploadCloud className="h-7 w-7 text-sky-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800">
                  Drag & Drop project files here or <span className="text-sky-600 underline">Browse Files</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Supported formats: PDF, DOCX, XLSX, STEP, CAD, PNG, JPG, CSV, ZIP (Up to 50MB per file)
                </p>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Attached Files ({attachedFiles.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {attachedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate max-w-xs">{f.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">({formatSize(f.size)})</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(f.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Project & Attach Documents'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
