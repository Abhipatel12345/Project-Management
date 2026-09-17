'use client';

import React, { useState, useRef } from 'react';
import { ProjectTeamMember } from '@/types/team.types';
import { Task, TaskPriority } from '@/types/task.types';
import { BOARD_FUNCTIONS, PDT_ROLES } from '@/config/charter-choices.config';
import { X, Plus, Calendar, User, Layers, Lock, Paperclip, Upload, FileText, Trash2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/utils/gantt-scheduling-engine';

interface CreateCustomTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  teamMembers: ProjectTeamMember[];
  onSubmit: (taskData: Partial<Task>, files?: File[]) => Promise<void>;
}

export function CreateCustomTaskDialog({
  isOpen,
  onClose,
  projectId,
  teamMembers,
  onSubmit,
}: CreateCustomTaskDialogProps) {
  const todayStr = formatDate(new Date());
  const [subject, setSubject] = useState('');
  const [phase, setPhase] = useState('Phase 1: Concept & Planning');
  const [gate, setGate] = useState('1. PL');
  const [startDate, setStartDate] = useState(todayStr);
  const [finishDate, setFinishDate] = useState(todayStr);
  const [functionName, setFunctionName] = useState('PE');
  const [role, setRole] = useState('Lead Product Engineer');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; documentType: string }>>([]);
  const [pendingFileError, setPendingFileError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFileError(null);
    setPendingFileError(null);

    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
    const validPending: Array<{ file: File; documentType: string }> = [];

    for (const f of newFiles) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      if (!allowed.includes(ext)) {
        setFileError(`File "${f.name}" has unsupported format. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG.`);
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        setFileError(`File "${f.name}" exceeds maximum allowed size of 25MB.`);
        continue;
      }
      if (
        !selectedFiles.some((existing) => existing.name === f.name) &&
        !pendingFiles.some((p) => p.file.name === f.name)
      ) {
        validPending.push({ file: f, documentType: '' });
      }
    }

    setPendingFiles((prev) => [...prev, ...validPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updatePendingFileDocType = (idx: number, docType: string) => {
    setPendingFiles((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, documentType: docType } : item))
    );
    setPendingFileError(null);
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    if (pendingFiles.length <= 1) {
      setPendingFileError(null);
    }
  };

  const handleConfirmPendingUpload = () => {
    const missing = pendingFiles.some((p) => !p.documentType || !p.documentType.trim());
    if (missing) {
      setPendingFileError('Please select a Document Type before uploading the document.');
      return;
    }

    const confirmed = pendingFiles.map((p) => {
      const f = p.file;
      Object.defineProperty(f, 'documentType', {
        value: p.documentType,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      return f;
    });

    setSelectedFiles((prev) => [...prev, ...confirmed]);
    setPendingFiles([]);
    setPendingFileError(null);
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Task Name is required');
      return;
    }
    if (new Date(finishDate) < new Date(startDate)) {
      setError('Finish Date cannot be earlier than Start Date');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(finishDate).getTime();
      const duration = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);

      await onSubmit({
        subject: subject.trim(),
        project: projectId,
        phase,
        custom_phase: phase,
        gate,
        custom_gate: gate,
        exp_start_date: startDate,
        exp_end_date: finishDate,
        duration,
        function_name: functionName,
        custom_function: functionName,
        role,
        custom_role: role,
        assigned_to: assignedTo || undefined,
        priority,
        status: 'Open',
        progress: 0,
        description: description.trim(),
        is_custom: true,
        custom_is_custom: 1,
        is_mandatory_pdp: false,
        custom_is_mandatory_pdp: 0,
        is_milestone: false,
        custom_is_milestone: 0,
      }, selectedFiles);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create custom task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="h-4 w-4 text-sky-600" />
              Add Custom Project Task
            </h3>
            <p className="text-xs text-slate-500">
              Create an ad-hoc or project-specific task outside standard PDP tasks for {projectId}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-medium">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Task Name / Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Supplementary Prototype Harness Verification"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Phase 1: Concept & Planning">Phase 1: Concept & Planning</option>
                <option value="Phase 2: Product Design & Development">Phase 2: Product Design</option>
                <option value="Phase 3: Process Design & Development">Phase 3: Process Design</option>
                <option value="Phase 4: Validation & Launch">Phase 4: Validation & Launch</option>
                <option value="Phase 5: Production & Feedback">Phase 5: Production</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PDP Gate</label>
              <select
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="1. PL">1. PL</option>
                <option value="2. VC">2. VC</option>
                <option value="3. TKO">3. TKO</option>
                <option value="4. VL">4. VL</option>
                <option value="5. CPA">5. CPA</option>
                <option value="6. CT">6. CT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Finish Date</label>
              <input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Function</label>
              <select
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {BOARD_FUNCTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PDT Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                {PDT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Task Owner / Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map((m) => (
                  <option key={m.id || m.user_email} value={m.user_email}>
                    {m.employee_name || m.user_email} ({m.function_name || m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details and deliverables notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Attachments / Reference Documents */}
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-black text-xs uppercase tracking-wider">
                <Paperclip className="h-3.5 w-3.5 text-sky-600" />
                <span>Reference Documents ({selectedFiles.length})</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-sky-700 hover:bg-sky-50 border border-sky-200 text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <Upload className="h-3 w-3" />
                <span>Upload Documents</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Attach engineering drawings, specs, or reports (PDF, DOCX, XLSX, PPTX, JPG, PNG up to 25MB each).
            </p>

            {fileError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Pending File(s) Document Type Selection (Step 2 of Flow) */}
            {pendingFiles.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">
                    Select Document Type ({pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''})
                  </span>
                  <span className="text-[11px] text-sky-700 font-bold">* Mandatory</span>
                </div>

                {pendingFileError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{pendingFileError}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {pendingFiles.map((item, idx) => (
                    <div
                      key={`${item.file.name}-${idx}`}
                      className="p-3 rounded-xl bg-white border border-sky-200 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">
                            File: {item.file.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(item.file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingFile(idx)}
                          className="text-slate-400 hover:text-rose-600 text-[11px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-700 shrink-0">
                          Document Type: <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={item.documentType}
                          onChange={(e) => updatePendingFileDocType(idx, e.target.value)}
                          className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="">Select Document Type ▼</option>
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
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFiles([]);
                      setPendingFileError(null);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPendingUpload}
                    className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Upload
                  </button>
                </div>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-sky-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate text-[11px]">{file.name}</span>
                      {(file as any).documentType && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                          {(file as any).documentType}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Custom Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
