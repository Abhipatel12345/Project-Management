'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Project } from '@/types/project.types';
import { useAuth } from '@/providers/auth-context';
import { useUpdateProject } from '@/hooks/use-projects';
import { useCharterChoices } from '@/hooks/use-charter-choices';
import { PeoplePicker } from '@/components/shared/people-picker';
import { ManufacturingPlantSelect } from './manufacturing-plant-select';
import {
  FileCheck,
  Edit2,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Lock,
  Calendar,
  Building,
  Globe,
  MapPin,
  TrendingUp,
  Car,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import axios from 'axios';

interface ProjectCharterViewProps {
  project: Project;
  onRefresh?: () => void;
}

const formatPersonDisplay = (val?: string): string => {
  if (!val || val.trim() === '') return 'Unassigned';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'sarahjenkins@gmail.com') return 'Sarah Jenkins (sarahjenkins@gmail.com)';
  if (lower === 'admin@pdm.netlink.com' || lower === 'admin@example.com') return 'Administrator';
  if (lower === 'sarah@pdm.netlink.com') return 'Sarah Connor (sarah@pdm.netlink.com)';
  if (lower === 'quality@netlink.com') return 'Quality Lead (quality@netlink.com)';
  if (lower === 'robert@pdm.netlink.com') return 'Robert Sterling (robert@pdm.netlink.com)';
  if (lower === 'teammember@netlink.com') return 'Yash (teammember@netlink.com)';
  if (lower === 'gatereviewer@netlink.com') return 'Gate Reviewer (gatereviewer@netlink.com)';
  return trimmed;
};

export function ProjectCharterView({ project, onRefresh }: ProjectCharterViewProps) {
  const { user } = useAuth();
  const updateProjectMutation = useUpdateProject();
  const { data: choicesData } = useCharterChoices();

  const projectTypes = choicesData?.project_types || ['A', 'D'];
  const regions = choicesData?.regions || ['Americas', 'China', 'Europe', 'India', 'Korea'];
  const countries = choicesData?.countries || [
    'China',
    'Czech',
    'France',
    'India',
    'Korea',
    'Mexico',
    'Morocco',
    'Romania',
    'US',
  ];

  // RBAC: Check if current user is PMO Admin OR assigned Project Manager
  const isPmoAdmin = user?.role === 'admin' || !!user?.permissions?.manageProjects;
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userFullName = (user?.fullName || '').toLowerCase().trim();
  const assignedPm = (project.custom_project_manager || project.owner || '').toLowerCase().trim();

  const isAssignedPm =
    isPmoAdmin ||
    (assignedPm &&
      (assignedPm === userEmail ||
        assignedPm.includes(userEmail) ||
        (userFullName && assignedPm.includes(userFullName))));

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Image Upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize form data from project record
  useEffect(() => {
    setFormData({
      custom_project_manager: project.custom_project_manager || '',
      custom_project_sponsor: project.custom_project_sponsor || '',
      project_type: (project.project_type === 'A' || project.project_type === 'D')
        ? project.project_type
        : (project.custom_pdp_category === 'D' ? 'D' : 'A'),
      notes: project.notes || '',
      custom_product_image: project.custom_product_image || '',
      custom_ar_no: project.custom_ar_no || '',
      custom_region: project.custom_region || '',
      custom_country: project.custom_country || '',
      custom_manufacturing_plant: project.custom_manufacturing_plant || '',
      custom_direct_customer: project.custom_direct_customer || '',
      custom_final_oem: project.custom_final_oem || '',
      custom_model_year: project.custom_model_year !== undefined ? String(project.custom_model_year) : '',
      custom_project_assumptions: project.custom_project_assumptions || '',
      custom_sop_date: project.custom_sop_date || '',
      custom_vehicle: project.custom_vehicle || '',
      custom_segment: project.custom_segment || '',
      custom_life: project.custom_life || '',
      custom_customer_volume_annually: project.custom_customer_volume_annually !== undefined ? String(project.custom_customer_volume_annually) : '',
      custom_ihs_volume_annually: project.custom_ihs_volume_annually !== undefined ? String(project.custom_ihs_volume_annually) : '',
      custom_customer_assembly: project.custom_customer_assembly || '',
    });
    setValidationErrors({});
    setServerError(null);
  }, [project]);

  const handleInputChange = (field: keyof Project, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Image Upload Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setIsUploadingImage(true);
    setServerError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file, file.name);
      uploadFormData.append('is_private', '0');
      uploadFormData.append('doctype', 'Project');
      uploadFormData.append('docname', project.name);
      uploadFormData.append('fieldname', 'custom_product_image');

      const res = await axios.post('/api/method/upload_file', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = res.data?.message?.file_url;
      if (fileUrl) {
        handleInputChange('custom_product_image', fileUrl);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setServerError('Failed to upload product image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.custom_model_year && String(formData.custom_model_year).trim() !== '') {
      const year = Number(formData.custom_model_year);
      if (Number.isNaN(year) || year < 1980 || year > 2050) {
        errors.custom_model_year = 'Model Year must be a valid 4-digit numeric year (e.g. 2026).';
      }
    }

    if (formData.custom_sop_date && formData.custom_sop_date.trim() !== '') {
      const parsed = new Date(formData.custom_sop_date);
      if (Number.isNaN(parsed.getTime())) {
        errors.custom_sop_date = 'Please enter a valid SOP date.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setServerError(null);
    try {
      await updateProjectMutation.mutateAsync({
        name: project.name,
        data: formData,
      });

      setSaveSuccess(true);
      setIsEditing(false);
      onRefresh?.();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save project charter:', err);
      const msg =
        err.response?.data?._error_message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save charter changes';
      setServerError(msg);
    }
  };

  const handleCancel = () => {
    // Revert form state to project
    setFormData({
      custom_project_manager: project.custom_project_manager || '',
      custom_project_sponsor: project.custom_project_sponsor || '',
      project_type: (project.project_type === 'A' || project.project_type === 'D')
        ? project.project_type
        : (project.custom_pdp_category === 'D' ? 'D' : 'A'),
      notes: project.notes || '',
      custom_product_image: project.custom_product_image || '',
      custom_ar_no: project.custom_ar_no || '',
      custom_region: project.custom_region || '',
      custom_country: project.custom_country || '',
      custom_manufacturing_plant: project.custom_manufacturing_plant || '',
      custom_direct_customer: project.custom_direct_customer || '',
      custom_final_oem: project.custom_final_oem || '',
      custom_model_year: project.custom_model_year !== undefined ? String(project.custom_model_year) : '',
      custom_project_assumptions: project.custom_project_assumptions || '',
      custom_sop_date: project.custom_sop_date || '',
      custom_vehicle: project.custom_vehicle || '',
      custom_segment: project.custom_segment || '',
      custom_life: project.custom_life || '',
      custom_customer_volume_annually: project.custom_customer_volume_annually !== undefined ? String(project.custom_customer_volume_annually) : '',
      custom_ihs_volume_annually: project.custom_ihs_volume_annually !== undefined ? String(project.custom_ihs_volume_annually) : '',
      custom_customer_assembly: project.custom_customer_assembly || '',
    });
    setValidationErrors({});
    setServerError(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Banner & Governance Bar */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800 mb-1">
            <FileCheck className="h-4 w-4 text-sky-600" />
            <span>PROJECT CHARTER • {project.name}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {project.project_name || project.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative program metadata, governance parameters, and APQP lifecycle definitions.
          </p>
        </div>

        {/* Governance Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {isAssignedPm ? (
            !isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Charter</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updateProjectMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateProjectMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {updateProjectMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Save Charter</span>
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Read-Only Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Project Charter changes saved and persisted successfully in ERPNext!</span>
        </div>
      )}

      {serverError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* 4 Clean Executive Sections for the 20 Charter Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Core Leadership & Identity (Fields 1-6) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <h2>1. Leadership & Program Identity</h2>
          </div>

          <div className="space-y-4">
            {/* Field 1: Project Manager (People Picker) */}
            {isEditing ? (
              <PeoplePicker
                label="1. Project Manager"
                value={formData.custom_project_manager}
                onChange={(val) => handleInputChange('custom_project_manager', val)}
                placeholder="Search system user directory for PM..."
                required
              />
            ) : (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  1. Project Manager
                </span>
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formatPersonDisplay(formData.custom_project_manager)}
                </p>
              </div>
            )}

            {/* Field 2: Project Sponsor (People Picker) */}
            {isEditing ? (
              <PeoplePicker
                label="2. Project Sponsor (Platform / Product Group Director)"
                value={formData.custom_project_sponsor}
                onChange={(val) => handleInputChange('custom_project_sponsor', val)}
                placeholder="Search system user directory for Sponsor..."
              />
            ) : (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  2. Project Sponsor
                </span>
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formatPersonDisplay(formData.custom_project_sponsor)}
                </p>
              </div>
            )}

            {/* Field 3: Project Type (Controlled Dropdown: A / D) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                3. Project Type <span className="text-slate-400 font-normal">(PMO-Maintained: A / D)</span>
              </label>
              {isEditing ? (
                <select
                  value={formData.project_type || 'A'}
                  onChange={(e) => handleInputChange('project_type', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                >
                  {projectTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      Category {pt}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  Category {formData.project_type || (project.custom_pdp_category === 'D' ? 'D' : 'A')}
                </p>
              )}
            </div>

            {/* Field 4: Description (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">4. Description</label>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Brief project summary..."
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {formData.notes || 'No description provided.'}
                </p>
              )}
            </div>

            {/* Field 5: Product Image (Upload, preview, replace) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">5. Product Image</label>
              {formData.custom_product_image ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.custom_product_image}
                    alt="Product Reference"
                    className="h-40 w-full object-cover rounded-lg"
                  />
                  {isEditing && (
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition"
                      >
                        Replace Image
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('custom_product_image', '')}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                  <ImageIcon className="h-6 w-6 text-slate-300 mx-auto" />
                  <p className="text-[11px] text-slate-400">No product image uploaded</p>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition shadow-2xs"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>Upload Product Image</span>
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            {/* Field 6: AR No (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                6. AR No <span className="text-slate-400 font-normal">(Approval / Reference Number)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_ar_no || ''}
                  onChange={(e) => handleInputChange('custom_ar_no', e.target.value)}
                  placeholder="e.g. AR-2026-0042"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold font-mono text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_ar_no || 'N/A'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Geographic & Manufacturing Location (Fields 7-9, 20) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Globe className="h-4 w-4 text-emerald-600" />
            <h2>2. Geographic & Manufacturing Setup</h2>
          </div>

          <div className="space-y-4">
            {/* Field 7: Region (Controlled Dropdown) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                7. Region <span className="text-slate-400 font-normal">(Authoritative PMO Choices)</span>
              </label>
              {isEditing ? (
                <select
                  value={formData.custom_region || ''}
                  onChange={(e) => handleInputChange('custom_region', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                >
                  <option value="">Select Region...</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_region || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 8: Country (Controlled Dropdown) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                8. Country <span className="text-slate-400 font-normal">(Authoritative PMO Choices)</span>
              </label>
              {isEditing ? (
                <select
                  value={formData.custom_country || ''}
                  onChange={(e) => handleInputChange('custom_country', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                >
                  <option value="">Select Country...</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_country || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 9: Automotive OEM Manufacturing (Lookup from 23 plants) */}
            {isEditing ? (
              <ManufacturingPlantSelect
                label="9. Automotive OEM Manufacturing (Plant Lookup)"
                value={formData.custom_manufacturing_plant}
                onChange={(val) => handleInputChange('custom_manufacturing_plant', val)}
              />
            ) : (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  9. Automotive OEM Manufacturing Plant
                </span>
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_manufacturing_plant || 'N/A'}
                </p>
              </div>
            )}

            {/* Field 10: Customer Assembly (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                10. Customer Assembly <span className="text-slate-400 font-normal">(Assembly Location)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_customer_assembly || ''}
                  onChange={(e) => handleInputChange('custom_customer_assembly', e.target.value)}
                  placeholder="e.g. Wolfsburg Plant 2"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_customer_assembly || 'N/A'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Customer & Program Lifecycle (Fields 11-17) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Car className="h-4 w-4 text-indigo-600" />
            <h2>3. Customer & Program Lifecycle</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 11: Direct Customer (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">11. Direct Customer</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_direct_customer || ''}
                  onChange={(e) => handleInputChange('custom_direct_customer', e.target.value)}
                  placeholder="e.g. BMW Group"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_direct_customer || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 12: Final OEM (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">12. Final OEM</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_final_oem || ''}
                  onChange={(e) => handleInputChange('custom_final_oem', e.target.value)}
                  placeholder="e.g. BMW AG"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_final_oem || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 13: Model Year (Numeric field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">13. Model Year (Numeric)</label>
              {isEditing ? (
                <div>
                  <input
                    type="number"
                    value={formData.custom_model_year || ''}
                    onChange={(e) => handleInputChange('custom_model_year', e.target.value)}
                    placeholder="e.g. 2027"
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 font-mono"
                  />
                  {validationErrors.custom_model_year && (
                    <p className="text-[11px] text-rose-500 mt-1">{validationErrors.custom_model_year}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold font-mono text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_model_year || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 14: SOP (Date field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">14. SOP (Start of Production)</label>
              {isEditing ? (
                <div>
                  <input
                    type="date"
                    value={formData.custom_sop_date || ''}
                    onChange={(e) => handleInputChange('custom_sop_date', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 font-mono"
                  />
                  {validationErrors.custom_sop_date && (
                    <p className="text-[11px] text-rose-500 mt-1">{validationErrors.custom_sop_date}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold font-mono text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_sop_date || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 15: Vehicle (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">15. Vehicle</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_vehicle || ''}
                  onChange={(e) => handleInputChange('custom_vehicle', e.target.value)}
                  placeholder="e.g. i7 Electric Sedan"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_vehicle || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 16: Segment (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">16. Segment</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_segment || ''}
                  onChange={(e) => handleInputChange('custom_segment', e.target.value)}
                  placeholder="e.g. Luxury D-Segment"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_segment || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 17: Life (Text field) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700">17. Life (Product Lifecycle)</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_life || ''}
                  onChange={(e) => handleInputChange('custom_life', e.target.value)}
                  placeholder="e.g. 7 Years (2027 - 2034)"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {formData.custom_life || 'N/A'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Volumes & Strategic Assumptions (Fields 18-20) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <h2>4. Volumes & Strategic Assumptions</h2>
          </div>

          <div className="space-y-4">
            {/* Field 18: Customer Volume – Annually (Numeric / Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                18. Customer Volume – Annually
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_customer_volume_annually || ''}
                  onChange={(e) => handleInputChange('custom_customer_volume_annually', e.target.value)}
                  placeholder="e.g. 180,000 units"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 font-mono"
                />
              ) : (
                <p className="text-xs font-bold font-mono text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_customer_volume_annually || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 19: IHS Volume – Annually (Numeric / Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                19. IHS Volume – Annually <span className="text-slate-400 font-normal">(Forecast Volume)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.custom_ihs_volume_annually || ''}
                  onChange={(e) => handleInputChange('custom_ihs_volume_annually', e.target.value)}
                  placeholder="e.g. 165,000 units"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 font-mono"
                />
              ) : (
                <p className="text-xs font-bold font-mono text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.custom_ihs_volume_annually || 'N/A'}
                </p>
              )}
            </div>

            {/* Field 20: Project Assumptions (Text field) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                20. Project Assumptions <span className="text-slate-400 font-normal">(Key Assumptions)</span>
              </label>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={formData.custom_project_assumptions || ''}
                  onChange={(e) => handleInputChange('custom_project_assumptions', e.target.value)}
                  placeholder="List critical assumptions, regulatory parameters, tooling investments..."
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                />
              ) : (
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap min-h-[80px]">
                  {formData.custom_project_assumptions || 'No project assumptions recorded.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
