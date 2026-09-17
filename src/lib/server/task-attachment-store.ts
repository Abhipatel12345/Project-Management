import fs from 'fs';
import path from 'path';
import { PDMUserSession } from '@/types/auth.types';
import { saveAuditRecord } from './audit-store';
import { getMimeType } from './file-storage';

const DATA_DIR = path.join(process.cwd(), '.data');
const ATTACHMENTS_FILE = path.join(DATA_DIR, 'task_attachments.json');
const TASK_UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'tasks');

export interface TaskAttachmentRecord {
  id: string;
  taskId: string;
  projectId?: string;
  fileName: string;
  fileUrl: string;
  localPath?: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
  erpFileId?: string;
  documentType?: string;
}

let inMemoryAttachments: Record<string, TaskAttachmentRecord[]> | null = null;

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TASK_UPLOADS_DIR)) {
    fs.mkdirSync(TASK_UPLOADS_DIR, { recursive: true });
  }
}

export function loadAllTaskAttachments(): Record<string, TaskAttachmentRecord[]> {
  if (inMemoryAttachments !== null) {
    return inMemoryAttachments;
  }
  ensureDirs();
  try {
    if (fs.existsSync(ATTACHMENTS_FILE)) {
      const raw = fs.readFileSync(ATTACHMENTS_FILE, 'utf-8');
      inMemoryAttachments = JSON.parse(raw);
      return inMemoryAttachments || {};
    }
  } catch (err) {
    console.error('[Task Attachment Store] Error loading attachments file:', err);
  }
  inMemoryAttachments = {};
  return inMemoryAttachments;
}

export function saveAllTaskAttachments(data: Record<string, TaskAttachmentRecord[]>): void {
  ensureDirs();
  inMemoryAttachments = data;
  try {
    fs.writeFileSync(ATTACHMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Task Attachment Store] Error saving attachments file:', err);
  }
}

export function getTaskAttachmentsFromStore(taskId: string): TaskAttachmentRecord[] {
  if (!taskId) return [];
  const all = loadAllTaskAttachments();
  return all[taskId] || [];
}

/**
 * Save a document attachment to the task and synchronize with ERPNext File DocType
 */
export async function saveTaskAttachment(params: {
  taskId: string;
  projectId?: string;
  fileName: string;
  buffer: Buffer;
  mimeType?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  documentType?: string;
  session?: PDMUserSession | null;
}) {
  const {
    taskId,
    projectId = '',
    fileName,
    buffer,
    uploadedBy = 'system',
    uploadedByName = 'User',
    documentType = 'Engineering',
    session,
  } = params;

  ensureDirs();

  const cleanFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const taskFolder = path.join(TASK_UPLOADS_DIR, taskId.replace(/[^a-zA-Z0-9._-]/g, '_'));
  if (!fs.existsSync(taskFolder)) {
    fs.mkdirSync(taskFolder, { recursive: true });
  }

  const localFilePath = path.join(taskFolder, cleanFileName);
  fs.writeFileSync(localFilePath, buffer);

  const mime = params.mimeType || getMimeType(cleanFileName);
  let fileUrl = `/files/${encodeURIComponent(cleanFileName)}`;
  let erpFileId: string | undefined = undefined;

  // Sync to ERPNext File DocType via /api/method/upload_file
  try {
    const erpUrl = (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), cleanFileName);
    formData.append('is_private', '0');
    formData.append('doctype', 'Task');
    formData.append('docname', taskId);
    formData.append('attached_to_doctype', 'Task');
    formData.append('attached_to_name', taskId);

    const erpRes = await fetch(`${erpUrl}/api/method/upload_file`, {
      method: 'POST',
      headers: {
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
      body: formData,
    });

    if (erpRes.ok) {
      const erpData = await erpRes.json();
      if (erpData.message?.file_url) {
        fileUrl = erpData.message.file_url;
      }
      if (erpData.message?.name) {
        erpFileId = erpData.message.name;
      }
    } else {
      console.warn(`[ERPNext Attachment Upload Warning] Status ${erpRes.status} for task ${taskId}:`, await erpRes.text());
    }
  } catch (syncErr) {
    console.warn('[ERPNext Attachment Sync Warning] Fallback to local storage:', syncErr);
  }

  const recordId = erpFileId || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record: TaskAttachmentRecord = {
    id: recordId,
    taskId,
    projectId,
    fileName: cleanFileName,
    fileUrl,
    localPath: localFilePath,
    fileSize: buffer.length,
    mimeType: mime,
    uploadedBy,
    uploadedByName,
    createdAt: new Date().toISOString(),
    erpFileId,
    documentType,
  };

  const all = loadAllTaskAttachments();
  if (!all[taskId]) {
    all[taskId] = [];
  }

  // Deduplicate by filename
  const existingIdx = all[taskId].findIndex((item) => item.fileName === cleanFileName);
  if (existingIdx >= 0) {
    all[taskId][existingIdx] = record;
  } else {
    all[taskId].push(record);
  }
  saveAllTaskAttachments(all);

  // Audit Log
  try {
    saveAuditRecord({
      project_id: projectId || 'PROJ',
      user_id: session?.email || uploadedBy,
      user_name: session?.fullName || uploadedByName,
      role: session?.roleLabel || session?.role || 'User',
      action: 'Task Document Attached',
      entity_type: 'Task',
      entity_id: taskId,
      description: `Attached document "${cleanFileName}" to task ${taskId} (${(buffer.length / 1024).toFixed(1)} KB)`,
      new_value: cleanFileName,
    });
  } catch (auditErr) {
    console.warn('[Audit Log Warning]', auditErr);
  }

  return record;
}

/**
 * Remove an attachment from a task
 */
export async function deleteTaskAttachmentFromStore(
  taskId: string,
  attachmentIdOrName: string,
  session?: PDMUserSession | null
): Promise<boolean> {
  const all = loadAllTaskAttachments();
  const list = all[taskId] || [];

  const targetIdx = list.findIndex(
    (item) => item.id === attachmentIdOrName || item.fileName === attachmentIdOrName || item.erpFileId === attachmentIdOrName
  );

  if (targetIdx < 0) {
    return false;
  }

  const [removed] = list.splice(targetIdx, 1);
  all[taskId] = list;
  saveAllTaskAttachments(all);

  // Attempt to remove local file if present
  if (removed.localPath && fs.existsSync(removed.localPath)) {
    try {
      fs.unlinkSync(removed.localPath);
    } catch {}
  }

  // Attempt to delete from ERPNext if File DocType record exists
  const targetErpFile = removed.erpFileId || (removed.id.startsWith('att-') ? undefined : removed.id);
  if (targetErpFile) {
    try {
      const erpUrl = (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
      const apiSecret = process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

      await fetch(`${erpUrl}/api/resource/File/${encodeURIComponent(targetErpFile)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${apiKey}:${apiSecret}`,
        },
      });
    } catch (erpErr) {
      console.warn('[ERPNext Delete File Warning]', erpErr);
    }
  }

  // Audit Log
  try {
    saveAuditRecord({
      project_id: removed.projectId || 'PROJ',
      user_id: session?.email || 'user',
      user_name: session?.fullName || 'User',
      role: session?.roleLabel || session?.role || 'User',
      action: 'Task Document Removed',
      entity_type: 'Task',
      entity_id: taskId,
      description: `Removed attached document "${removed.fileName}" from task ${taskId}`,
      old_value: removed.fileName,
    });
  } catch (auditErr) {
    console.warn('[Audit Log Warning]', auditErr);
  }

  return true;
}

/**
 * Locate a file buffer locally if ERPNext returns 404
 */
export function findLocalTaskAttachment(subpath: string): { filePath: string; mimeType: string } | null {
  ensureDirs();
  const cleanName = path.basename(subpath);

  // Look in all task upload folders
  if (fs.existsSync(TASK_UPLOADS_DIR)) {
    const taskDirs = fs.readdirSync(TASK_UPLOADS_DIR);
    for (const dir of taskDirs) {
      const candidate = path.join(TASK_UPLOADS_DIR, dir, cleanName);
      if (fs.existsSync(candidate)) {
        return {
          filePath: candidate,
          mimeType: getMimeType(cleanName),
        };
      }
    }
  }

  return null;
}
