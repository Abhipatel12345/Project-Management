import fs from 'fs';
import path from 'path';
import { TaskSkipRequest } from '@/types/skip-request.types';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'skip-requests.json');

const ensureDirectoryExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

export const readSkipRequestsFile = (): TaskSkipRequest[] => {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading skip-requests.json:', err);
    return [];
  }
};

export const writeSkipRequestsFile = (requests: TaskSkipRequest[]): void => {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(FILE_PATH, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing skip-requests.json:', err);
  }
};

export const getSkipRequestsByProject = (projectId?: string): TaskSkipRequest[] => {
  const all = readSkipRequestsFile();
  if (!projectId || projectId === 'ALL') {
    return all.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }
  const norm = projectId.toLowerCase().trim();
  return all
    .filter((r) => r.project_id.toLowerCase().trim() === norm)
    .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
};

export const getSkipRequestById = (requestId: string): TaskSkipRequest | undefined => {
  const all = readSkipRequestsFile();
  return all.find((r) => r.id === requestId);
};

export const getPendingSkipRequestForTask = (taskId: string): TaskSkipRequest | undefined => {
  const all = readSkipRequestsFile();
  return all.find((r) => r.task_id === taskId && r.status === 'PENDING');
};

export const createSkipRequest = (
  input: Omit<TaskSkipRequest, 'id' | 'status' | 'requested_at'>
): TaskSkipRequest => {
  const all = readSkipRequestsFile();

  // Check if a pending request already exists for this task
  const existingPending = all.find((r) => r.task_id === input.task_id && r.status === 'PENDING');
  if (existingPending) {
    throw new Error(`A pending skip request already exists for task "${input.task_subject || input.task_id}".`);
  }

  const timestamp = new Date().toISOString();
  const requestId = `SKP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newRequest: TaskSkipRequest = {
    id: requestId,
    task_id: input.task_id,
    task_subject: input.task_subject || 'Untitled Task',
    project_id: input.project_id,
    requested_by: input.requested_by,
    requested_by_name: input.requested_by_name || input.requested_by,
    requested_at: timestamp,
    skip_reason: input.skip_reason.trim(),
    additional_comment: input.additional_comment?.trim() || undefined,
    status: 'PENDING',
  };

  all.unshift(newRequest);
  writeSkipRequestsFile(all);
  return newRequest;
};

export const approveSkipRequest = (
  requestId: string,
  reviewedBy: string,
  reviewedByName?: string
): TaskSkipRequest => {
  const all = readSkipRequestsFile();
  const request = all.find((r) => r.id === requestId);

  if (!request) {
    throw new Error('Skip request not found.');
  }

  if (request.status !== 'PENDING') {
    throw new Error(`Cannot approve request with status "${request.status}". Only PENDING requests can be approved.`);
  }

  const timestamp = new Date().toISOString();
  request.status = 'APPROVED';
  request.reviewed_by = reviewedBy;
  request.reviewed_by_name = reviewedByName || reviewedBy;
  request.reviewed_at = timestamp;
  request.approved_at = timestamp;

  writeSkipRequestsFile(all);
  return request;
};

export const rejectSkipRequest = (
  requestId: string,
  rejectionReason: string,
  reviewedBy: string,
  reviewedByName?: string
): TaskSkipRequest => {
  const all = readSkipRequestsFile();
  const request = all.find((r) => r.id === requestId);

  if (!request) {
    throw new Error('Skip request not found.');
  }

  if (request.status !== 'PENDING') {
    throw new Error(`Cannot reject request with status "${request.status}". Only PENDING requests can be rejected.`);
  }

  if (!rejectionReason || rejectionReason.trim() === '') {
    throw new Error('Rejection reason is required.');
  }

  const timestamp = new Date().toISOString();
  request.status = 'REJECTED';
  request.rejection_reason = rejectionReason.trim();
  request.reviewed_by = reviewedBy;
  request.reviewed_by_name = reviewedByName || reviewedBy;
  request.reviewed_at = timestamp;

  writeSkipRequestsFile(all);
  return request;
};
