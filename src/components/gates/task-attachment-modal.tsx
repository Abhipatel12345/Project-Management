'use client';

import React, { useState } from 'react';
import { Task, TaskAttachment } from '@/types/task.types';
import { useTaskAttachments, useUploadTaskAttachments, useDeleteTaskAttachment } from '@/hooks/use-tasks';
import { useToast } from '@/providers/toast-context';
import {
  X,
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  File,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface TaskAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projectId?: string;
  onAttachmentsChanged?: () => void;
}

export function TaskAttachmentModal({
  isOpen,
  onClose,
  task,
  projectId,
  onAttachmentsChanged,
}: TaskAttachmentModalProps) {
  const { showToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const taskId = task?.name || '';
  const {
    data: attachments = [],
    isLoading: isLoadingAttachments,
    refetch,
  } = useTaskAttachments(taskId);

  const uploadMutation = useUploadTaskAttachments();
  const deleteMutation = useDeleteTaskAttachment();

  if (!isOpen || !task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleRemoveQueuedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) return;
    try {
      const res = await uploadMutation.mutateAsync({
        taskId: task.name,
        files: selectedFiles,
        projectId: projectId || task.project,
      });

      if (res.failed && res.failed.length > 0) {
        showToast(
          `Uploaded ${res.uploaded?.length || 0} file(s). Some files failed: ${res.failed.map((f: { fileName: string }) => f.fileName).join(', ')}`,
          'warning'
        );
      } else {
        showToast(`Successfully uploaded ${selectedFiles.length} document(s)`, 'success');
      }

      setSelectedFiles([]);
      await refetch();
      onAttachmentsChanged?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload attachments', 'error');
    }
  };

  const handleDeleteAttachment = async (att: TaskAttachment) => {
    const idToDelete = att.name || att.file_url || att.file_name;
    if (!idToDelete) return;

    if (!confirm(`Are you sure you want to remove "${att.file_name || 'this document'}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        taskId: task.name,
        attachmentId: idToDelete,
      });
      showToast('Attachment deleted successfully', 'success');
      await refetch();
      onAttachmentsChanged?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete attachment', 'error');
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Task Document Attachments</h3>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {task.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {task.subject}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-2xl p-5 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer',
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            )}
            onClick={() => document.getElementById('gate-task-file-input')?.click()}
          >
            <input
              id="gate-task-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="h-10 w-10 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500">
              <Upload className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Click to upload</span> or drag and drop
              evidence files here
            </div>
            <div className="text-[11px] text-slate-400">
              PDF, Word, Excel, PowerPoint, PNG, JPG (max 25MB each)
            </div>
          </div>

          {/* Queued Files for Upload */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  Ready to Upload ({selectedFiles.length})
                </span>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={uploadMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  <span>Upload Now</span>
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <File className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedFile(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Attached Documents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Attached Documents</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                  {attachments.length}
                </span>
              </div>
              {isLoadingAttachments && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>

            {attachments.length === 0 ? (
              <div className="p-8 border border-slate-100 rounded-2xl text-center text-slate-400 bg-slate-50/40 space-y-1">
                <FileText className="h-6 w-6 mx-auto text-slate-300" />
                <p className="font-medium">No document evidence attached yet.</p>
                <p className="text-[11px] text-slate-400">
                  Upload supporting specifications, review sign-offs, test reports or charter documents.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att: TaskAttachment) => (
                  <div
                    key={att.name || att.file_name}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition group"
                  >
                    <div className="flex items-center gap-3 truncate min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">
                          {att.file_name || 'Document'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          {att.file_size && <span>{formatFileSize(att.file_size)}</span>}
                          {att.creation && <span>• Uploaded {att.creation}</span>}
                          {att.uploaded_by && <span>• By {att.uploaded_by}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      {att.file_url && (
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.file_name}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition"
                          title="Download document"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
