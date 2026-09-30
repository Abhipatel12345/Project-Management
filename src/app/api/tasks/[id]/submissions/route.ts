import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import {
  getTaskSubmissions,
  createTaskSubmission,
  reviewTaskSubmission,
} from '@/lib/server/task-submission-store';
import { saveTaskAttachment } from '@/lib/server/task-attachment-store';
import { getSessionFromRequest, DEFAULT_ADMIN_SESSION } from '@/lib/server/session';
import { isTaskAssignedToUser } from '@/lib/server/rbac-scoping';

export const dynamic = 'force-dynamic';

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

/**
 * GET /api/tasks/:id/submissions
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const taskId = decodeURIComponent(id || '').trim();

    const session = getSessionFromRequest(req) || DEFAULT_ADMIN_SESSION;

    const submissions = getTaskSubmissions(taskId);
    return NextResponse.json({ data: submissions, submissions }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch task submissions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/:id/submissions
 * Yash/Assignee submits task with comment, progress, and file deliverables
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const taskId = decodeURIComponent(id || '').trim();

    const session = getSessionFromRequest(req) || DEFAULT_ADMIN_SESSION;

    // RBAC: Team Member can only submit work packages for tasks assigned to them
    if (session.role === 'teammember') {
      try {
        const erpUrl = getErpUrl();
        const taskRes = await fetch(
          `${erpUrl}/api/resource/Task?filters=[["name","=","${encodeURIComponent(taskId)}"]]&fields=["name","subject","project","status","priority","_assign","owner","assigned_to","description"]`,
          {
            headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
            cache: 'no-store',
          }
        );
        if (taskRes.ok) {
          const taskList = (await taskRes.json()).data;
          const taskData = Array.isArray(taskList) && taskList.length > 0 ? taskList[0] : null;
          if (taskData && !isTaskAssignedToUser(taskData, session)) {
            return NextResponse.json(
              { _error_message: '403 Forbidden: You can only submit work packages for tasks assigned to you.' },
              { status: 403 }
            );
          }
        }
      } catch (checkErr) {
        console.warn('[Task Submission RBAC Check Notice]:', checkErr);
      }
    }

    const body = await req.json();
    const { comment = '', progress = 100, projectId = 'Global', taskSubject = '', files = [] } = body;

    // 1. Create Submission Record and save documents in store
    const submission = await createTaskSubmission(
      {
        taskId,
        projectId,
        taskSubject,
        comment,
        progress,
        files,
      },
      session
    );

    // 2. Upload deliverable files to ERPNext Task attachments & get deliverable URL
    let deliverableUrl: string | undefined = undefined;
    for (const f of files) {
      if (f.dataUrl || f.file_url) {
        try {
          let buffer: Buffer;
          if (f.dataUrl && f.dataUrl.startsWith('data:')) {
            const base64Index = f.dataUrl.indexOf(';base64,');
            buffer =
              base64Index !== -1
                ? Buffer.from(f.dataUrl.slice(base64Index + 8), 'base64')
                : Buffer.from(f.dataUrl.slice(f.dataUrl.indexOf(',') + 1), 'utf-8');
          } else {
            buffer = Buffer.from('Task deliverable submission', 'utf-8');
          }

          const savedAtt = await saveTaskAttachment({
            taskId,
            projectId,
            fileName: f.name || 'deliverable.pdf',
            buffer,
            mimeType: f.mimeType,
            uploadedBy: session?.email || 'Assignee',
            uploadedByName: session?.fullName || 'Assignee',
            documentType: 'Engineering',
            documentRole: 'deliverable',
            session,
          });

          if (!deliverableUrl && savedAtt.fileUrl) {
            deliverableUrl = savedAtt.fileUrl;
          }
        } catch (attErr) {
          console.warn('[Submission Deliverable Upload Notice]:', attErr);
        }
      }
    }

    if (!deliverableUrl && submission.attachments && submission.attachments.length > 0) {
      deliverableUrl = submission.attachments[0].file_url || submission.attachments[0].download_url;
    }

    // 3. Synchronize Task status & Task Deliverable with ERPNext (Task Assign Document is preserved untouched)
    try {
      const erpUrl = getErpUrl();
      const taskUpdates: Record<string, any> = {
        status: 'Working',
        progress: progress ?? 100,
      };

      if (deliverableUrl) {
        taskUpdates.custom_task_deliverable = deliverableUrl;
      }

      await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${getApiKey()}:${getApiSecret()}`,
        },
        body: JSON.stringify(taskUpdates),
      });
    } catch (erpErr) {
      console.warn('[Task Submission API] ERPNext sync notice:', erpErr);
    }

    return NextResponse.json({ success: true, data: submission, submission }, { status: 201 });
  } catch (error: any) {
    console.error('[Task Submission API Error]:', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create task submission' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tasks/:id/submissions
 * Review Task Submission (Approve / Request Changes)
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const taskId = decodeURIComponent(id || '').trim();

    const session = getSessionFromRequest(req) || DEFAULT_ADMIN_SESSION;

    // RBAC: Team Members must NEVER review, approve, or sign off on tasks/submissions
    if (session.role === 'teammember') {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Team Members are not authorized to review, approve, or sign off on task submissions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { submissionId, action = 'approve', comment = '' } = body;

    const updatedSubmission = await reviewTaskSubmission(
      taskId,
      submissionId,
      action as 'approve' | 'request_changes',
      comment,
      session
    );

    if (!updatedSubmission) {
      return NextResponse.json({ _error_message: 'Submission not found' }, { status: 404 });
    }

    // Synchronize status with ERPNext
    if (action === 'approve') {
      try {
        const erpUrl = getErpUrl();
        await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `token ${getApiKey()}:${getApiSecret()}`,
          },
          body: JSON.stringify({
            status: 'Completed',
            progress: 100,
          }),
        });
      } catch {}
    } else if (action === 'request_changes') {
      try {
        const erpUrl = getErpUrl();
        await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `token ${getApiKey()}:${getApiSecret()}`,
          },
          body: JSON.stringify({
            status: 'Working',
          }),
        });
      } catch {}
    }

    return NextResponse.json({ success: true, data: updatedSubmission, submission: updatedSubmission }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to review task submission' },
      { status: 500 }
    );
  }
}
