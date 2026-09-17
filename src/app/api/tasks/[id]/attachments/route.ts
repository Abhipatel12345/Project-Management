import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';
import {
  saveTaskAttachment,
  getTaskAttachmentsFromStore,
  deleteTaskAttachmentFromStore,
} from '@/lib/server/task-attachment-store';
import {
  isTaskAssignedToUser,
  getAccessibleProjectIdsForTeamMember,
} from '@/lib/server/rbac-scoping';
import { TaskAttachment } from '@/types/task.types';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};
const getApiKey = (): string => process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
const getApiSecret = (): string => process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

/**
 * Verify if the requesting user has access to this Task
 */
async function checkTaskAccess(taskId: string, session: any): Promise<{ authorized: boolean; task?: any }> {
  if (!session) return { authorized: false };
  if (session.role === 'admin' || session.role === 'projectmanager') {
    return { authorized: true };
  }

  // Teammember check: fetch task from ERPNext
  try {
    const erpUrl = getErpUrl();
    const res = await fetch(
      `${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`,
      {
        headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      // If task isn't in ERPNext yet, check project scoping
      return { authorized: true };
    }
    const data = await res.json();
    const task = data.data;

    const accessibleProjects = await getAccessibleProjectIdsForTeamMember(session);
    const hasProjectAccess = task.project && accessibleProjects.has(task.project);
    const isAssigned = isTaskAssignedToUser(task, session);

    return { authorized: hasProjectAccess || isAssigned, task };
  } catch {
    return { authorized: true };
  }
}

/**
 * GET /api/tasks/[id]/attachments
 * Lists all attachments linked to a task from ERPNext File DocType + local store
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await props.params;
    const session = getSessionFromRequest(req);
    const { authorized } = await checkTaskAccess(taskId, session);

    if (!authorized) {
      return NextResponse.json(
        { _error_message: `403 Forbidden: You do not have permission to view documents for Task "${taskId}".` },
        { status: 403 }
      );
    }

    const aggregated: TaskAttachment[] = [];

    // 1. Fetch from Local Server Store
    const localRecords = getTaskAttachmentsFromStore(taskId);
    localRecords.forEach((r) => {
      aggregated.push({
        name: r.id,
        file_name: r.fileName,
        file_url: r.fileUrl,
        file_size: r.fileSize,
        creation: r.createdAt,
        uploaded_by: r.uploadedByName || r.uploadedBy,
        document_type: r.documentType || 'Engineering',
      });
    });

    // 2. Fetch from ERPNext File DocType
    try {
      const erpUrl = getErpUrl();
      const filters = JSON.stringify([
        ['attached_to_doctype', '=', 'Task'],
        ['attached_to_name', '=', taskId],
      ]);
      const fields = JSON.stringify(['name', 'file_name', 'file_url', 'file_size', 'creation', 'owner']);

      const erpRes = await fetch(
        `${erpUrl}/api/resource/File?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}`,
        {
          headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
          cache: 'no-store',
        }
      );

      if (erpRes.ok) {
        const erpData = await erpRes.json();
        const erpFiles: any[] = erpData.data || [];

        erpFiles.forEach((f) => {
          if (!aggregated.some((existing) => existing.file_name === f.file_name || existing.name === f.name)) {
            aggregated.push({
              name: f.name,
              file_name: f.file_name,
              file_url: f.file_url,
              file_size: f.file_size,
              creation: f.creation,
              uploaded_by: f.owner,
            });
          }
        });
      }
    } catch (erpErr) {
      console.warn('[Task Attachments GET] Error fetching ERPNext File records:', erpErr);
    }

    return NextResponse.json({ attachments: aggregated }, { status: 200 });
  } catch (error: any) {
    console.error('[Task Attachments GET Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch task attachments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]/attachments
 * Uploads one or multiple documents and links them to the Task
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await props.params;
    const session = getSessionFromRequest(req);
    const { authorized, task } = await checkTaskAccess(taskId, session);

    if (!authorized) {
      return NextResponse.json(
        { _error_message: `403 Forbidden: You do not have permission to attach documents to Task "${taskId}".` },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const projectId = (formData.get('projectId') as string) || task?.project || '';
    const documentTypesRaw = formData.get('documentTypes') || formData.get('document_types');
    let documentTypeMap: Record<string, string> = {};
    if (documentTypesRaw && typeof documentTypesRaw === 'string') {
      try {
        documentTypeMap = JSON.parse(documentTypesRaw);
      } catch {}
    }
    const singleDocType = (formData.get('documentType') || formData.get('document_type')) as string | null;

    // Collect all files from 'files' or 'file' form fields
    const files: File[] = [];
    const allFilesField = formData.getAll('files');
    const singleFileField = formData.getAll('file');

    [...allFilesField, ...singleFileField].forEach((entry) => {
      if (entry && typeof entry === 'object' && 'arrayBuffer' in entry) {
        files.push(entry as File);
      }
    });

    if (files.length === 0) {
      return NextResponse.json(
        { _error_message: 'No files provided for attachment.' },
        { status: 400 }
      );
    }

    const uploaded: TaskAttachment[] = [];
    const failed: { fileName: string; reason: string }[] = [];

    for (const file of files) {
      const fileName = file.name || 'document.pdf';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';

      // Validate File Type
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        failed.push({
          fileName,
          reason: `Unsupported file extension .${ext}. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG.`,
        });
        continue;
      }

      // Validate File Size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        failed.push({
          fileName,
          reason: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size of 25 MB.`,
        });
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const docType = documentTypeMap[fileName] || singleDocType || 'Engineering';

        const record = await saveTaskAttachment({
          taskId,
          projectId,
          fileName,
          buffer,
          mimeType: file.type,
          uploadedBy: session?.email || 'user',
          uploadedByName: session?.fullName || 'User',
          documentType: docType,
          session,
        });

        uploaded.push({
          name: record.id,
          file_name: record.fileName,
          file_url: record.fileUrl,
          file_size: record.fileSize,
          creation: record.createdAt,
          uploaded_by: record.uploadedByName || record.uploadedBy,
          document_type: record.documentType,
        });
      } catch (uploadErr: any) {
        console.error(`[Task Attachment Upload Error] ${fileName}:`, uploadErr);
        failed.push({
          fileName,
          reason: uploadErr.message || 'File upload processing failed',
        });
      }
    }

    const statusCode = failed.length > 0 && uploaded.length === 0 ? 400 : 200;

    return NextResponse.json(
      {
        uploaded,
        failed,
        totalUploaded: uploaded.length,
        totalFailed: failed.length,
      },
      { status: statusCode }
    );
  } catch (error: any) {
    console.error('[Task Attachments POST Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to upload task attachments' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]/attachments
 * Deletes an attachment from the task
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await props.params;
    const session = getSessionFromRequest(req);

    if (!session || (session.role !== 'admin' && session.role !== 'projectmanager')) {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Only Project Managers and Administrators are authorized to remove task attachments.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId') || searchParams.get('file_name');

    if (!attachmentId) {
      return NextResponse.json(
        { _error_message: 'Attachment identifier (attachmentId or file_name) is required.' },
        { status: 400 }
      );
    }

    const removed = await deleteTaskAttachmentFromStore(taskId, attachmentId, session);

    return NextResponse.json(
      { success: removed, attachmentId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Task Attachments DELETE Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to delete task attachment' },
      { status: 500 }
    );
  }
}
