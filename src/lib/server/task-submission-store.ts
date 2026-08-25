import fs from 'fs';
import path from 'path';
import { TaskSubmission, TaskSubmissionAttachment } from '@/types/task.types';
import { PDMUserSession } from '@/types/auth.types';
import { saveDocument } from './document-store';
import { saveAuditRecord } from './audit-store';

const DATA_DIR = path.join(process.cwd(), '.data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'task_submissions.json');

// In-memory cache for fast access
let inMemorySubmissions: Record<string, TaskSubmission[]> | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load all task submissions from file storage
 */
export function loadAllTaskSubmissions(): Record<string, TaskSubmission[]> {
  if (inMemorySubmissions !== null) {
    return inMemorySubmissions;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      inMemorySubmissions = JSON.parse(raw);
      return inMemorySubmissions || {};
    }
  } catch (err) {
    console.error('[Task Submission Store] Error loading submissions file:', err);
  }
  inMemorySubmissions = {};
  return inMemorySubmissions;
}

/**
 * Save all task submissions to file storage
 */
export function saveAllTaskSubmissions(data: Record<string, TaskSubmission[]>): void {
  ensureDataDir();
  inMemorySubmissions = data;
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Task Submission Store] Error saving submissions file:', err);
  }
}

/**
 * Get all submissions for a given task ID (e.g. TASK-2026-00042)
 */
export function getTaskSubmissions(taskId: string): TaskSubmission[] {
  if (!taskId) return [];
  const all = loadAllTaskSubmissions();
  return all[taskId] || [];
}

/**
 * Get all submissions for a project
 */
export function getProjectSubmissions(projectId: string): TaskSubmission[] {
  if (!projectId) return [];
  const all = loadAllTaskSubmissions();
  const list: TaskSubmission[] = [];
  const targetProjNorm = projectId.toLowerCase().trim();

  Object.values(all).forEach((subs) => {
    subs.forEach((sub) => {
      const projNorm = (sub.project_id || '').toLowerCase().trim();
      if (projNorm === targetProjNorm || projNorm.includes(targetProjNorm) || targetProjNorm.includes(projNorm)) {
        list.push(sub);
      }
    });
  });

  return list.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
}

/**
 * Create a new task submission with optional attached documents
 */
export async function createTaskSubmission(
  params: {
    taskId: string;
    projectId?: string;
    taskSubject?: string;
    comment: string;
    progress: number;
    files?: Array<{
      name: string;
      size: number;
      dataUrl?: string;
      file_url?: string;
      mimeType?: string;
    }>;
  },
  session: PDMUserSession | null
): Promise<TaskSubmission> {
  const { taskId, projectId = 'Global', taskSubject = '', comment, progress, files = [] } = params;
  const all = loadAllTaskSubmissions();
  const existingSubmissions = all[taskId] || [];
  const submissionNumber = existingSubmissions.length + 1;
  const submissionId = `SUB-${taskId}-${String(submissionNumber).padStart(2, '0')}`;
  const now = new Date().toISOString();

  const submitterId = session?.email || session?.username || 'Assignee';
  const submitterName = session?.fullName || (submitterId.includes('@') ? submitterId.split('@')[0] : submitterId);

  // 1. Process and save uploaded files to Document Store
  const attachments: TaskSubmissionAttachment[] = [];

  for (const f of files) {
    const cleanName = path.basename(f.name || 'submission_deliverable.pdf');
    try {
      const savedDoc = await saveDocument({
        title: cleanName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        file_name: cleanName,
        file_size: f.size || 1024,
        file_data: f.dataUrl,
        file_url: f.file_url,
        mime_type: f.mimeType,
        project: projectId,
        task: taskId,
        entity_type: 'TaskSubmission',
        entity_id: submissionId,
        uploaded_by: submitterName,
        upload_date: now.split('T')[0],
        document_type: 'Engineering',
        description: `Task Submission #${submissionNumber} Deliverable for ${taskId}: ${comment || cleanName}`,
        notes: `Submitted by ${submitterName} on ${now.split('T')[0]}`,
        status: 'Under Review',
        review_status: 'Pending Review',
      });

      attachments.push({
        file_id: savedDoc.name,
        file_name: savedDoc.file_name || cleanName,
        file_size: savedDoc.file_size,
        file_url: savedDoc.file_url || `/api/documents/${encodeURIComponent(savedDoc.name)}/download`,
        download_url: `/api/documents/${encodeURIComponent(savedDoc.name)}/download`,
        mime_type: savedDoc.mime_type,
        uploaded_at: now,
        uploaded_by: submitterName,
      });
    } catch (docErr) {
      console.error(`[Task Submission Store] Error saving attachment ${cleanName}:`, docErr);
      // Fallback attachment entry
      attachments.push({
        file_id: `DOC-${submissionId}-${attachments.length + 1}`,
        file_name: cleanName,
        file_size: f.size,
        file_url: f.file_url || `/api/documents/${encodeURIComponent(cleanName)}/download`,
        download_url: `/api/documents/${encodeURIComponent(cleanName)}/download`,
        mime_type: f.mimeType,
        uploaded_at: now,
        uploaded_by: submitterName,
      });
    }
  }

  // 2. Build the TaskSubmission record
  const newSubmission: TaskSubmission = {
    id: submissionId,
    submission_number: submissionNumber,
    task_id: taskId,
    project_id: projectId,
    task_subject: taskSubject,
    submitted_by_id: submitterId,
    submitted_by_name: submitterName,
    submitted_at: now,
    progress: progress ?? 100,
    comment: comment || '',
    status: 'Submitted',
    attachments,
  };

  // 3. Append to existing submissions list (newest first or appended)
  existingSubmissions.unshift(newSubmission);
  all[taskId] = existingSubmissions;
  saveAllTaskSubmissions(all);

  // 4. Log Audit Event
  try {
    saveAuditRecord({
      project_id: projectId,
      entity_type: 'Task',
      entity_id: taskId,
      action: `Submitted Task #${submissionNumber} (${taskId}) with ${attachments.length} attachment(s)`,
      user_id: submitterId,
      user_name: submitterName,
      description: `Task Submission #${submissionNumber}: ${comment || 'Deliverable uploaded'}`,
      new_value: JSON.stringify({
        submission_id: submissionId,
        submission_number: submissionNumber,
        progress,
        attachments: attachments.map((a) => a.file_name),
      }),
    });
  } catch {}

  return newSubmission;
}

/**
 * Review a task submission (Approve / Request Changes)
 */
export async function reviewTaskSubmission(
  taskId: string,
  submissionId: string,
  action: 'approve' | 'request_changes',
  comment: string,
  session: PDMUserSession | null
): Promise<TaskSubmission | null> {
  const all = loadAllTaskSubmissions();
  const list = all[taskId] || [];
  const submission = list.find((s) => s.id === submissionId) || list[0];

  if (!submission) return null;

  const reviewerId = session?.email || session?.username || 'Reviewer';
  const reviewerName = session?.fullName || 'Project Manager';
  const now = new Date().toISOString();

  submission.status = action === 'approve' ? 'Approved' : 'Changes Requested';
  submission.reviewed_by = reviewerName;
  submission.reviewed_at = now;
  submission.review_comment = comment || '';

  saveAllTaskSubmissions(all);

  // Audit Log
  try {
    saveAuditRecord({
      project_id: submission.project_id || 'Global',
      entity_type: 'Task',
      entity_id: taskId,
      action: `${action === 'approve' ? 'Approved' : 'Requested changes on'} Task Submission (${submissionId})`,
      user_id: reviewerId,
      user_name: reviewerName,
      description: `Task review action: ${action}. Note: ${comment || 'N/A'}`,
      new_value: JSON.stringify({
        submission_id: submissionId,
        action,
        status: submission.status,
      }),
    });
  } catch {}

  return submission;
}
