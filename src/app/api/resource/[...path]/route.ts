import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import {
  isUserMatch,
  isTaskAssignedToUser,
  isProjectManagedByUser,
  getManagedProjectIdsForUser,
  getAccessibleProjectIdsForTeamMember,
  fetchAllTasksFromERP,
} from '@/lib/server/rbac-scoping';

export const dynamic = 'force-dynamic';

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

/**
 * Safely parse server-side authenticated session cookie
 */
function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (!cookie) return null;
    const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function handleProxy(req: NextRequest, paramsPromise: Promise<{ path?: string[] }>) {
  try {
    const { path } = await paramsPromise;
    const docType = path && path[0] ? path[0] : '';
    const recordId = path && path[1] ? path[1] : '';

    const session = getSessionFromRequest(req);
    const userRole = session?.role || 'teammember';

    // 1. IT Admin User Management Endpoint Protection
    if (docType === 'User' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
      if (userRole !== 'it_admin' && userRole !== 'admin') {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Only IT Administrators are authorized to manage user accounts.' },
          { status: 403 }
        );
      }
    }

    // Parse body for inspection on write operations
    let body: string | undefined = undefined;
    let parsedBodyObj: any = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const text = await req.text();
        if (text && text.trim() !== '') {
          body = text;
          try {
            parsedBodyObj = JSON.parse(text);
          } catch {
            // non-json body
          }
        }
      } catch {
        // empty body
      }
    }

    // 2. Project Manager Role & Permission Restrictions
    if (userRole === 'projectmanager') {
      // Restrict Changing Team Members / Board Members only if NOT the assigned Project Manager
      if (docType === 'Project' && (req.method === 'PUT' || req.method === 'POST') && parsedBodyObj && 'users' in parsedBodyObj) {
        if (recordId && session) {
          const managedIds = await getManagedProjectIdsForUser(session);
          if (managedIds.size > 0 && !managedIds.has(recordId)) {
            return NextResponse.json(
              { _error_message: `403 Forbidden: You are not authorized to modify team members for Project "${recordId}" because you are not its assigned Project Manager.` },
              { status: 403 }
            );
          }
        }
      }
    } else if (userRole === 'teammember') {
      if (docType === 'Project' && (req.method === 'PUT' || req.method === 'POST') && parsedBodyObj && 'users' in parsedBodyObj) {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Team Members are not authorized to add, remove, or modify Project Team Members.' },
          { status: 403 }
        );
      }
    }

    if (userRole === 'projectmanager' || !session?.permissions?.manageProjectSettings) {
      // Restrict Changing Project Settings / Deleting Project Charters
      if (docType === 'Project') {
        if (req.method === 'DELETE') {
          return NextResponse.json(
            { _error_message: '403 Forbidden: Project Managers are not authorized to delete Project Charters.' },
            { status: 403 }
          );
        }
        if (req.method === 'PUT' && parsedBodyObj) {
          const restrictedFields = ['project_name', 'company', 'department', 'is_active', 'project_type', 'custom_project_category', 'custom_product_group'];
          const hasRestrictedField = restrictedFields.some((f) => f in parsedBodyObj);
          if (hasRestrictedField) {
            return NextResponse.json(
              { _error_message: '403 Forbidden: Project Managers are not authorized to modify Project Settings or Charters.' },
              { status: 403 }
            );
          }
        }
      }
    }

    if (userRole === 'projectmanager' || !session?.permissions?.approveGates) {
      // Restrict Gate Approval Decisions
      if ((docType === 'Gate' || docType === 'Gate Review' || docType === 'GateMilestone') && (req.method === 'PUT' || req.method === 'POST')) {
        if (parsedBodyObj && (parsedBodyObj.status === 'Approved' || parsedBodyObj.status === 'Approved with Conditions' || parsedBodyObj.approval_status === 'Approved' || parsedBodyObj.decision === 'Approved' || parsedBodyObj.decision === 'Approved with Conditions')) {
          return NextResponse.json(
            { _error_message: '403 Forbidden: Gate Approval decisions are restricted to Gate Reviewers and Executive Board.' },
            { status: 403 }
          );
        }
      }
    }

    if (userRole === 'projectmanager' || !session?.permissions?.approveDesign) {
      // Restrict Design Review Approvals
      if ((docType === 'Design Review' || docType === 'DesignReview') && (req.method === 'PUT' || req.method === 'POST')) {
        if (parsedBodyObj && (parsedBodyObj.approval_status === 'Approved' || parsedBodyObj.approval_status === 'Approved with Conditions' || parsedBodyObj.approval_status === 'Rejected')) {
          return NextResponse.json(
            { _error_message: '403 Forbidden: Design Review Approvals are restricted to Quality / Gate Reviewers and PMO Administrators.' },
            { status: 403 }
          );
        }
      }
    }

    // 3. Write Operation Scoping for Tasks
    if (docType === 'Task') {
      if (req.method === 'POST') {
        if (userRole === 'teammember') {
          return NextResponse.json(
            { _error_message: '403 Forbidden: Team Members are not authorized to create project tasks directly.' },
            { status: 403 }
          );
        }
        // Project Managers and PMO Admins can create tasks for ANY project
      }

      if (req.method === 'PUT' && recordId && session) {
        if (userRole === 'teammember') {
          // Fetch existing task to verify assignment using list query to get _assign
          const erpUrl = getErpUrl();
          const taskRes = await fetch(
            `${erpUrl}/api/resource/Task?filters=[["name","=","${encodeURIComponent(recordId)}"]]&fields=["name","subject","project","status","priority","_assign","owner"]`,
            {
              headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
              cache: 'no-store',
            }
          );
          if (taskRes.ok) {
            const taskDataList = (await taskRes.json()).data;
            const taskData = Array.isArray(taskDataList) && taskDataList.length > 0 ? taskDataList[0] : null;
            if (!taskData || !isTaskAssignedToUser(taskData, session)) {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Access Denied. You are not assigned to this task.' },
                { status: 403 }
              );
            }
            if (parsedBodyObj?.assigned_to && !isUserMatch(parsedBodyObj.assigned_to, session)) {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Team Members cannot reassign tasks to other users.' },
                { status: 403 }
              );
            }
            if (parsedBodyObj?.project && parsedBodyObj.project !== taskData.project) {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Team Members cannot change task project assignment.' },
                { status: 403 }
              );
            }
          }
        }
      }

      if (req.method === 'DELETE' && recordId && session) {
        if (userRole === 'teammember') {
          return NextResponse.json(
            { _error_message: '403 Forbidden: Team Members cannot delete tasks.' },
            { status: 403 }
          );
        }
      }
    }

    // 4. Warehouse Operation Protection
    if (docType === 'Material Request' && (req.method === 'PUT' || req.method === 'POST')) {
      if (userRole === 'teammember' || userRole === 'gate_reviewer') {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Material Requisitions and Warehouse actions are restricted to authorized personnel.' },
          { status: 403 }
        );
      }
    }

    // 4. Project Duplicate Name & Code Uniqueness Validation
    if (docType === 'Project' && req.method === 'POST' && parsedBodyObj) {
      const projectName = (parsedBodyObj.project_name || '').trim();
      const projectCode = (parsedBodyObj.name || '').trim();

      const erpUrl = getErpUrl();
      const apiKey = getApiKey();
      const apiSecret = getApiSecret();

      if (projectName) {
        try {
          const checkRes = await fetch(
            `${erpUrl}/api/resource/Project?filters=[["project_name","=","${encodeURIComponent(projectName)}"]]&fields=["name","project_name"]&limit_page_length=1`,
            {
              headers: { Authorization: `token ${apiKey}:${apiSecret}` },
              cache: 'no-store',
            }
          );
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (Array.isArray(checkData.data) && checkData.data.length > 0) {
              return NextResponse.json(
                {
                  error: 'Project Name must be unique',
                  _error_message: 'Project Name must be unique',
                  field: 'project_name',
                },
                { status: 409 }
              );
            }
          }
        } catch {
          // continue
        }
      }

      if (projectCode) {
        try {
          const checkCodeRes = await fetch(
            `${erpUrl}/api/resource/Project?filters=[["name","=","${encodeURIComponent(projectCode)}"]]&fields=["name"]&limit_page_length=1`,
            {
              headers: { Authorization: `token ${apiKey}:${apiSecret}` },
              cache: 'no-store',
            }
          );
          if (checkCodeRes.ok) {
            const checkCodeData = await checkCodeRes.json();
            if (Array.isArray(checkCodeData.data) && checkCodeData.data.length > 0) {
              return NextResponse.json(
                {
                  error: 'Project Code must be unique',
                  _error_message: 'Project Code must be unique',
                  field: 'name',
                },
                { status: 409 }
              );
            }
          }
        } catch {
          // continue
        }
      }
    }

    // Forward request to ERPNext VM
    const searchParams = req.nextUrl.search;
    const erpUrl = getErpUrl();
    const targetUrl = `${erpUrl}/api/resource/${path ? path.join('/') : ''}${searchParams}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `token ${getApiKey()}:${getApiSecret()}`,
    };

    const method = req.method;

    const erpRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });

    const resText = await erpRes.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = resText;
    }

    // Normalized Duplicate Error Handling for Project
    if (docType === 'Project' && !erpRes.ok) {
      const errStr = JSON.stringify(resJson || resText || '');
      if (/duplicate/i.test(errStr) || /already\s*exists/i.test(errStr) || /must\s*be\s*unique/i.test(errStr)) {
        if (/code/i.test(errStr)) {
          return NextResponse.json(
            {
              error: 'Project Code must be unique',
              _error_message: 'Project Code must be unique',
              field: 'name',
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: 'Project Name must be unique',
            _error_message: 'Project Name must be unique',
            field: 'project_name',
          },
          { status: 409 }
        );
      }
    }

    // Auto-assign in ERPNext if Task was created with assigned_to
    if (docType === 'Task' && req.method === 'POST' && erpRes.ok && resJson.data && parsedBodyObj?.assigned_to) {
      const targetEmail = parsedBodyObj.assigned_to;
      const emailToAssign = targetEmail.includes('@')
        ? targetEmail
        : targetEmail.toLowerCase().includes('yash')
        ? 'teammember@netlink.com'
        : targetEmail.toLowerCase().includes('sarah')
        ? 'sarahjenkins@gmail.com'
        : null;

      if (emailToAssign) {
        try {
          await fetch(`${erpUrl}/api/method/frappe.desk.form.assign_to.add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `token ${getApiKey()}:${getApiSecret()}`,
            },
            body: JSON.stringify({
              doctype: 'Task',
              name: resJson.data.name,
              assign_to: JSON.stringify([emailToAssign]),
            }),
          });
        } catch {
          // non-blocking
        }
      }
    }

    // 5. READ OPERATION RBAC & DATA-SCOPING INTERCEPTOR (GET)
    if (req.method === 'GET' && session && typeof resJson === 'object' && resJson !== null) {
      // 5A. Project Scoping
      if (docType === 'Project') {
        if (recordId && resJson.data) {
          // Single Project Detail Check
          if (userRole === 'teammember') {
            const accessibleIds = await getAccessibleProjectIdsForTeamMember(session);
            const isAuthorized =
              accessibleIds.has(recordId) ||
              (resJson.data.project_name && accessibleIds.has(resJson.data.project_name)) ||
              isProjectManagedByUser(resJson.data, session);

            if (!isAuthorized) {
              return NextResponse.json(
                { _error_message: `403 Forbidden: Access Denied. You do not have assigned tasks or membership in Project "${recordId}".` },
                { status: 403 }
              );
            }
          }
          // PM & Admin have universal project access
        } else if (!recordId && Array.isArray(resJson.data)) {
          // Project List Collection Filtering
          if (userRole === 'teammember') {
            const accessibleIds = await getAccessibleProjectIdsForTeamMember(session);
            const filteredProjects = resJson.data.filter((p: any) =>
              accessibleIds.has(p.name) ||
              (p.project_name && accessibleIds.has(p.project_name)) ||
              isProjectManagedByUser(p, session)
            );
            return NextResponse.json({ data: filteredProjects }, { status: 200 });
          }
          // PM & Admin see ALL projects
        }
      }

      // 5B. Task Scoping
      if (docType === 'Task') {
        if (recordId && resJson.data) {
          // Attach _assign if missing in single document payload
          if (!resJson.data._assign) {
            try {
              const assignRes = await fetch(
                `${erpUrl}/api/resource/Task?filters=[["name","=","${encodeURIComponent(recordId)}"]]&fields=["name","_assign"]`,
                {
                  headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
                  cache: 'no-store',
                }
              );
              if (assignRes.ok) {
                const assignData = await assignRes.json();
                if (assignData.data && assignData.data.length > 0) {
                  resJson.data._assign = assignData.data[0]._assign;
                }
              }
            } catch {
              // ignore
            }
          }

          // Single Task Detail Check
          if (userRole === 'teammember') {
            if (!isTaskAssignedToUser(resJson.data, session)) {
              return NextResponse.json(
                { _error_message: `403 Forbidden: Access Denied. Task "${recordId}" is not assigned to you.` },
                { status: 403 }
              );
            }
          }
          // PM & Admin see all task details
        } else if (!recordId && Array.isArray(resJson.data)) {
          // Task List Collection Filtering
          if (userRole === 'teammember') {
            const allTasksWithDetails = await fetchAllTasksFromERP();
            const detailMap = new Map(allTasksWithDetails.map((t) => [t.name, t]));
            const filteredTasks = resJson.data.filter((t: any) => {
              const fullTask = detailMap.get(t.name) || t;
              return isTaskAssignedToUser(fullTask, session);
            });
            return NextResponse.json({ data: filteredTasks }, { status: 200 });
          }
          // PM & Admin see ALL tasks
        }
      }

      // 5C. Issue Scoping
      if (docType === 'Issue') {
        if (recordId && resJson.data) {
          if (userRole === 'teammember') {
            const myTasks = (await fetchAllTasksFromERP()).filter((t) => isTaskAssignedToUser(t, session));
            const myTaskIds = new Set(myTasks.map((t) => t.name));
            const isAuthorized =
              (resJson.data.task && myTaskIds.has(resJson.data.task)) ||
              isUserMatch(resJson.data.raised_by, session) ||
              isUserMatch(resJson.data.assigned_to, session);

            if (!isAuthorized) {
              return NextResponse.json(
                { _error_message: `403 Forbidden: Access Denied. You are not authorized to view Issue "${recordId}".` },
                { status: 403 }
              );
            }
          }
          // PM & Admin see all issues
        } else if (!recordId && Array.isArray(resJson.data)) {
          if (userRole === 'teammember') {
            const myTasks = (await fetchAllTasksFromERP()).filter((t) => isTaskAssignedToUser(t, session));
            const myTaskIds = new Set(myTasks.map((t) => t.name));
            const filteredIssues = resJson.data.filter((iss: any) =>
              (iss.task && myTaskIds.has(iss.task)) ||
              isUserMatch(iss.raised_by, session) ||
              isUserMatch(iss.assigned_to, session)
            );
            return NextResponse.json({ data: filteredIssues }, { status: 200 });
          }
          // PM & Admin see all issues
        }
      }
    }

    if (typeof resJson === 'object' && resJson !== null) {
      return NextResponse.json(resJson, { status: erpRes.status });
    }

    return new NextResponse(resText, {
      status: erpRes.status,
      headers: { 'Content-Type': erpRes.headers.get('content-type') || 'text/plain' },
    });
  } catch (error: any) {
    console.error('[Next.js ERPNext Proxy Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to communicate with ERPNext server' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function POST(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}
