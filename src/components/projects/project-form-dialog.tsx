'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectFormSchema, ProjectFormValues } from '@/lib/validations/project.schema';
import { Project, PROJECT_CATEGORIES, PRODUCT_GROUPS, PROJECT_TYPES, PDP_CATEGORIES, PDPCategory } from '@/types/project.types';
import { ProductGroupSearchSelect } from './product-group-search-select';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  X,
  Loader2,
  FolderPlus,
  Edit3,
  Calendar,
  DollarSign,
  Tag,
  Layers,
  Sliders,
  AlertCircle,
  UploadCloud,
  FileText,
  Trash2,
  UserCheck,
  Paperclip,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import documentService from '@/services/document.service';
import projectService from '@/services/project.service';
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
  { name: 'Sarah Jenkins', email: 'sarahjenkins@gmail.com', title: 'Senior Program Manager' },
  { name: 'Administrator', email: 'admin@pdm.netlink.com', title: 'System Manager' },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      project_name: '',
      status: 'Open',
      priority: 'Medium',
      project_type: 'A',
      custom_project_category: '',
      custom_product_group: '',
      custom_pdp_category: 'A',
      expected_start_date: '',
      expected_end_date: '',
      estimated_cost: 0,
      notes: '',
      custom_project_manager: 'sarahjenkins@gmail.com',
      owner: 'sarahjenkins@gmail.com',
    },
  });

  const selectedPdpCategory = watch('custom_pdp_category');

  const [formError, setFormError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setFormError(null);
    setAttachedFiles([]);
    if (initialData) {
      const p = initialData.priority as any;
      const safePriority = p === 'Critical' ? 'High' : p || 'Medium';
      const pdpCat = (initialData.custom_pdp_category as any) || 'A';
      const projType = (initialData.project_type === 'A' || initialData.project_type === 'D') ? initialData.project_type : pdpCat;
      const pmVal = initialData.custom_project_manager || initialData.owner || 'sarahjenkins@gmail.com';
      reset({
        project_name: initialData.project_name || '',
        status: (initialData.status as any) || 'Open',
        priority: safePriority,
        project_type: projType,
        custom_project_category: initialData.custom_project_category || '',
        custom_product_group: initialData.custom_product_group || '',
        custom_pdp_category: pdpCat,
        expected_start_date: initialData.expected_start_date || '',
        expected_end_date: initialData.expected_end_date || '',
        estimated_cost: initialData.estimated_cost || 0,
        company: initialData.company || '',
        department: initialData.department || '',
        notes: initialData.notes || '',
        custom_project_manager: pmVal,
        owner: pmVal,
      });
    } else {
      reset({
        project_name: '',
        status: 'Open',
        priority: 'Medium',
        project_type: 'A',
        custom_project_category: '',
        custom_product_group: '',
        custom_pdp_category: 'A',
        expected_start_date: '',
        expected_end_date: '',
        estimated_cost: 0,
        company: '',
        department: '',
        notes: '',
        custom_project_manager: 'sarahjenkins@gmail.com',
        owner: 'sarahjenkins@gmail.com',
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
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      setFormError(null);
      clearErrors();
      const createdProj: any = await onSubmit(data, attachedFiles);

      // Save attached files directly into ERPNext Project DocType and document store linked to Canonical Project ID
      const targetProjectId = createdProj?.name || createdProj?.project_name || data.project_name || initialData?.name || 'NEW-PROJECT';
      for (const attFile of attachedFiles) {
        // Upload directly to Frappe File DocType linked to Project and custom_upload_document
        try {
          await projectService.uploadProjectDocument(
            targetProjectId,
            attFile.file,
            attFile.name,
            'custom_upload_document'
          );
        } catch (erpUpErr) {
          console.warn('ERPNext direct upload notice:', erpUpErr);
        }

        // Also sync to application document store
        await documentService.uploadDocument({
          title: attFile.name,
          project: targetProjectId,
          document_type: 'Engineering',
          version: 'v1.0',
          uploaded_by: user?.fullName || 'Administrator',
          file_name: attFile.name,
          file_size: attFile.size,
          file_url: attFile.dataUrl,
          file_data: attFile.dataUrl,
          status: 'Approved',
          review_status: 'Approved',
          description: `Uploaded during project creation for ${data.project_name || targetProjectId}`,
        });

        auditService.logAction(
          user?.fullName || 'Administrator',
          'Uploaded Document',
          'Document',
          attFile.name,
          `Attached ${attFile.name} to Project "${targetProjectId}" (custom_upload_document) during project setup.`
        );
      }

      onClose();
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?._error_message ||
        err.message ||
        'Failed to save project. Please check form inputs.';
      const errField = err.response?.data?.field;

      // 1. Duplicate Project Name Validation Error Mapping
      if (
        errField === 'project_name' ||
        /project\s*name\s*must\s*be\s*unique/i.test(errMsg) ||
        (/already\s*exists/i.test(errMsg) && !/code/i.test(errMsg)) ||
        (/duplicate/i.test(errMsg) && /name/i.test(errMsg))
      ) {
        setError('project_name', {
          type: 'manual',
          message: 'Project Name must be unique',
        });
        setFormError(null);
        return;
      }

      // 2. Duplicate Project Code Validation Error Mapping
      if (
        errField === 'name' ||
        /project\s*code\s*must\s*be\s*unique/i.test(errMsg) ||
        (/duplicate/i.test(errMsg) && /code/i.test(errMsg))
      ) {
        setError('project_name', {
          type: 'manual',
          message: 'Project Code must be unique',
        });
        setFormError(null);
        return;
      }

      // 3. Product Group Validation Error Mapping
      if (errField === 'custom_product_group' || /product\s*group/i.test(errMsg)) {
        setError('custom_product_group', {
          type: 'manual',
          message: errMsg,
        });
        setFormError(null);
        return;
      }

      // 4. PDP Category Validation Error Mapping
      if (errField === 'custom_pdp_category' || /pdp\s*category/i.test(errMsg)) {
        setError('custom_pdp_category', {
          type: 'manual',
          message: errMsg,
        });
        setFormError(null);
        return;
      }

      // Genuine system/server errors (500, network, etc.)
      setFormError(errMsg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
                {...register('project_name', {
                  onChange: () => {
                    if (errors.project_name) clearErrors('project_name');
                    if (formError) setFormError(null);
                  },
                })}
                type="text"
                placeholder="e.g. Door Handle Assembly (PROJ-0043)"
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl text-xs font-bold placeholder-slate-400 focus:outline-none transition',
                  errors.project_name
                    ? 'bg-rose-50/70 border-2 border-rose-500 text-rose-900 focus:ring-1 focus:ring-rose-500 focus:border-rose-500'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:border-sky-500'
                )}
              />
              {errors.project_name && (
                <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span>{errors.project_name.message}</span>
                </p>
              )}
            </div>

            {/* Project Manager Assignment Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                Assigned Project Manager <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                {...register('custom_project_manager')}
                searchPlaceholder="Search project manager..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
              >
                {AVAILABLE_PROJECT_MANAGERS.map((pm) => (
                  <option key={pm.email} value={pm.email}>
                    {pm.name} — {pm.title} ({pm.email})
                  </option>
                ))}
              </SearchableSelect>
              <p className="text-[10px] text-slate-400">
                The assigned Project Manager automatically receives full access to view, open, and download project documents.
              </p>
            </div>

            {/* PDP Category Selection (Category A vs Category D) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  PDP Category <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Select Product Development Process Category</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category A Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setValue('custom_pdp_category', 'A', { shouldValidate: true });
                    setValue('project_type', 'A');
                    if (errors.custom_pdp_category) clearErrors('custom_pdp_category');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setValue('custom_pdp_category', 'A', { shouldValidate: true });
                      setValue('project_type', 'A');
                    }
                  }}
                  className={cn(
                    'relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left',
                    selectedPdpCategory === 'A'
                      ? 'bg-sky-50/70 border-sky-600 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-black',
                          selectedPdpCategory === 'A' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        Category A
                      </span>
                      <span className="text-xs font-bold text-slate-800">Standard APQP</span>
                    </div>
                    {selectedPdpCategory === 'A' && <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Full development program with complete gate milestones and standard verification.
                  </p>
                </div>

                {/* Category D Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setValue('custom_pdp_category', 'D', { shouldValidate: true });
                    setValue('project_type', 'D');
                    if (errors.custom_pdp_category) clearErrors('custom_pdp_category');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setValue('custom_pdp_category', 'D', { shouldValidate: true });
                      setValue('project_type', 'D');
                    }
                  }}
                  className={cn(
                    'relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left',
                    selectedPdpCategory === 'D'
                      ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-black',
                          selectedPdpCategory === 'D' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        Category D
                      </span>
                      <span className="text-xs font-bold text-slate-800">Derivative</span>
                    </div>
                    {selectedPdpCategory === 'D' && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Derivative / modification program with streamlined gate checkpoints.
                  </p>
                </div>
              </div>

              {errors.custom_pdp_category && (
                <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span>{errors.custom_pdp_category.message}</span>
                </p>
              )}
            </div>

            {/* Product Group & Project Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative z-30">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-sky-600" />
                  Product Group <span className="text-rose-500">*</span>
                </label>
                <Controller
                  name="custom_product_group"
                  control={control}
                  render={({ field }) => (
                    <ProductGroupSearchSelect
                      value={field.value || ''}
                      onChange={(val) => {
                        field.onChange(val);
                        if (errors.custom_product_group) clearErrors('custom_product_group');
                        if (formError) setFormError(null);
                      }}
                      error={errors.custom_product_group?.message}
                      disabled={isSubmitting || isLoading}
                    />
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-slate-500" />
                  Project Category <span className="text-slate-400 font-normal">(Classification)</span>
                </label>
                <div className="relative">
                  <SearchableSelect
                    {...register('custom_project_category')}
                    disabled={isSubmitting || isLoading}
                    searchPlaceholder="Search category..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select Category...</option>
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </SearchableSelect>
                </div>
              </div>
            </div>


            {/* Status & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Status <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  {...register('status')}
                  searchPlaceholder="Search status..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </SearchableSelect>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Priority <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  {...register('priority')}
                  searchPlaceholder="Search priority..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </SearchableSelect>
              </div>
            </div>

            {/* Project Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Project Type</label>
              <div className="relative">
                <SearchableSelect
                  {...register('project_type')}
                  searchPlaceholder="Search project type..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="">Select Project Type...</option>
                  {PROJECT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </SearchableSelect>
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
                disabled={isLoading || isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {(isLoading || isSubmitting) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isSubmitting
                  ? 'Creating Project...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Create Project & Attach Documents'}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
