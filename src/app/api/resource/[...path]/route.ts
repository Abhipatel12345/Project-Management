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
import { getTaskRasic, saveTaskRasic, loadAllTaskRasic } from '@/lib/server/rasic-store';
import { getTaskSubmissions, loadAllTaskSubmissions } from '@/lib/server/task-submission-store';
import { getTaskPhase, saveTaskPhase, loadAllTaskPhases } from '@/lib/server/task-phase-store';
import { formatPhaseName, inferTaskPhase, getPhaseNumber } from '@/constants/phases';

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

import { getSessionFromRequest } from '@/lib/server/session';
import { PRODUCT_GROUPS, PROJECT_CATEGORIES } from '@/types/project.types';
import {
  getPdpCategoryMapping,
  hasConfiguredGateTemplate,
  hasConfiguredGanttTemplate,
  PDPCategory,
} from '@/config/pdp-templates.config';
import { saveOrUpdateGate } from '@/lib/server/gate-store';
import { saveAuditRecord } from '@/lib/server/audit-store';
import { getCharterChoices } from '@/lib/server/choices-store';

const inFlightProjectCreations = new Set<string>();

async function handleProxy(req: NextRequest, paramsPromise: Promise<{ path?: string[] }>) {
  let existingProjectForAudit: any = null;

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

    // 1B. Project Status Timing Chart Write Protection
    if ((docType === 'Project Status Timing Chart' || docType === 'Project Status Timing Line Item') && req.method !== 'GET') {
      if (userRole === 'teammember' || userRole === 'guest') {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Team members have view-only access to the Project Status Timing Chart.' },
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

    // 2. Project Charter & Settings Governance
    if (docType === 'Project') {
      if (req.method === 'DELETE') {
        const isPmo = session?.role === 'admin' || !!session?.permissions?.manageProjects;
        if (!isPmo) {
          return NextResponse.json(
            { _error_message: '403 Forbidden: Only PMO Administrators are authorized to delete Project Charters.' },
            { status: 403 }
          );
        }
      }

      if (req.method === 'PUT') {
        if (!session) {
          return NextResponse.json(
            { _error_message: '401 Unauthorized: Session required to modify Project Charter.' },
            { status: 401 }
          );
        }

        const isPmo = session.role === 'admin' || !!session?.permissions?.manageProjects;

        // Fetch existing project from ERPNext VM for PM authorization and audit trail tracking
        const erpUrl = getErpUrl();
        const existingProjRes = await fetch(`${erpUrl}/api/resource/Project/${encodeURIComponent(recordId)}`, {
          headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
          cache: 'no-store',
        });

        if (!existingProjRes.ok) {
          return NextResponse.json(
            { _error_message: `Project "${recordId}" not found in ERPNext.` },
            { status: 404 }
          );
        }

        const pData = await existingProjRes.json();
        existingProjectForAudit = pData.data;

        // Field Governance: "Charter fields must be editable only by PM"
        if (!isPmo) {
          const isAssignedPm = isProjectManagedByUser(existingProjectForAudit, session);
          if (!isAssignedPm) {
            return NextResponse.json(
              { _error_message: '403 Forbidden: Charter fields must be editable only by PM. You are not the assigned Project Manager for this project.' },
              { status: 403 }
            );
          }

          // Restrict changing core administrative attributes
          if (parsedBodyObj) {
            const restrictedCoreFields = ['project_name', 'company', 'department', 'is_active'];
            const hasRestricted = restrictedCoreFields.some((f) => f in parsedBodyObj);
            if (hasRestricted) {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Project Managers are not authorized to modify core administrative properties (project_name, company, department).' },
                { status: 403 }
              );
            }
          }
        }

        // Validations according to defined input types & controlled choices
        if (parsedBodyObj) {
          const choices = getCharterChoices();

          // 1. Model Year numeric validation
          if ('custom_model_year' in parsedBodyObj && parsedBodyObj.custom_model_year !== '' && parsedBodyObj.custom_model_year !== null) {
            if (Number.isNaN(Number(parsedBodyObj.custom_model_year))) {
              return NextResponse.json(
                { _error_message: 'Validation Error: Model Year must be a valid numeric year.' },
                { status: 400 }
              );
            }
          }

          // 2. Project Type controlled dropdown validation
          if ('project_type' in parsedBodyObj && parsedBodyObj.project_type && parsedBodyObj.project_type !== '') {
            if (!choices.project_types.includes(parsedBodyObj.project_type)) {
              return NextResponse.json(
                { _error_message: `Validation Error: Invalid Project Type "${parsedBodyObj.project_type}". Authoritative choices: ${choices.project_types.join(', ')}` },
                { status: 400 }
              );
            }
          }

          // 3. Region controlled dropdown validation
          if ('custom_region' in parsedBodyObj && parsedBodyObj.custom_region && parsedBodyObj.custom_region !== '') {
            if (!choices.regions.includes(parsedBodyObj.custom_region)) {
              return NextResponse.json(
                { _error_message: `Validation Error: Invalid Region "${parsedBodyObj.custom_region}". Authoritative choices: ${choices.regions.join(', ')}` },
                { status: 400 }
              );
            }
          }

          // 4. Country controlled dropdown validation
          if ('custom_country' in parsedBodyObj && parsedBodyObj.custom_country && parsedBodyObj.custom_country !== '') {
            if (!choices.countries.includes(parsedBodyObj.custom_country)) {
              return NextResponse.json(
                { _error_message: `Validation Error: Invalid Country "${parsedBodyObj.custom_country}". Authoritative choices: ${choices.countries.join(', ')}` },
                { status: 400 }
              );
            }
          }

          // 5. Automotive OEM Manufacturing Plant lookup validation
          if ('custom_manufacturing_plant' in parsedBodyObj && parsedBodyObj.custom_manufacturing_plant && parsedBodyObj.custom_manufacturing_plant !== '') {
            if (!choices.manufacturing_plants.includes(parsedBodyObj.custom_manufacturing_plant)) {
              return NextResponse.json(
                { _error_message: `Validation Error: Invalid Automotive OEM Manufacturing plant "${parsedBodyObj.custom_manufacturing_plant}".` },
                { status: 400 }
              );
            }
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
        // Validate progress if present
        if (parsedBodyObj && 'progress' in parsedBodyObj) {
          const p = Number(parsedBodyObj.progress);
          if (isNaN(p) || p < 0 || p > 100) {
            return NextResponse.json(
              { _error_message: 'Validation Error: Progress must be a valid number between 0 and 100.' },
              { status: 400 }
            );
          }
        }
        // Validate retimed to if present
        if (parsedBodyObj?.custom_retimed_to) {
          const validGates = ['1. PL', '2. VC', '3. TKO', '4. VL', '5. CPA', '6. CT'];
          if (!validGates.includes(parsedBodyObj.custom_retimed_to)) {
            return NextResponse.json(
              { _error_message: `Validation Error: Invalid Retimed To gate "${parsedBodyObj.custom_retimed_to}". Valid choices: ${validGates.join(', ')}` },
              { status: 400 }
            );
          }
        }
      }

      if (req.method === 'PUT' && recordId && session) {
        // Validate progress if present
        if (parsedBodyObj && 'progress' in parsedBodyObj) {
          const p = Number(parsedBodyObj.progress);
          if (isNaN(p) || p < 0 || p > 100) {
            return NextResponse.json(
              { _error_message: 'Validation Error: Progress must be a valid number between 0 and 100.' },
              { status: 400 }
            );
          }
        }

        // Validate retimed to if present
        if (parsedBodyObj?.custom_retimed_to) {
          const validGates = ['1. PL', '2. VC', '3. TKO', '4. VL', '5. CPA', '6. CT'];
          if (!validGates.includes(parsedBodyObj.custom_retimed_to)) {
            return NextResponse.json(
              { _error_message: `Validation Error: Invalid Retimed To gate "${parsedBodyObj.custom_retimed_to}". Valid choices: ${validGates.join(', ')}` },
              { status: 400 }
            );
          }
        }

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
            if (parsedBodyObj?.status === 'Completed') {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Team Members cannot mark tasks Completed directly. Please submit the task for PM review.' },
                { status: 403 }
              );
            }
            if (parsedBodyObj?.subject && parsedBodyObj.subject !== taskData.subject) {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Team Members cannot modify task definition or subject.' },
                { status: 403 }
              );
            }
            // Team members cannot modify schedule dates, dependencies, or template fields
            if (
              parsedBodyObj?.exp_start_date ||
              parsedBodyObj?.exp_end_date ||
              parsedBodyObj?.duration ||
              parsedBodyObj?.custom_predecessors ||
              parsedBodyObj?.custom_function ||
              parsedBodyObj?.custom_role ||
              parsedBodyObj?.custom_wbs
            ) {
              return NextResponse.json(
                { _error_message: '403 Forbidden: Schedule timeline modifications are restricted to Project Managers and PMO Administrators.' },
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

        // Fetch task from ERPNext to check if it is a Mandatory PDP task
        const erpUrl = getErpUrl();
        const checkRes = await fetch(
          `${erpUrl}/api/resource/Task/${encodeURIComponent(recordId)}`,
          {
            headers: { Authorization: `token ${getApiKey()}:${getApiSecret()}` },
            cache: 'no-store',
          }
        );
        if (checkRes.ok) {
          const tDoc = (await checkRes.json()).data;
          const isMandatory =
            tDoc.custom_is_mandatory_pdp == 1 ||
            tDoc.is_template == 1 ||
            (tDoc.custom_is_custom != 1 && !tDoc.subject?.toLowerCase().includes('[custom]'));

          if (isMandatory) {
            return NextResponse.json(
              {
                _error_message:
                  '403 Forbidden: Cannot delete mandatory PDP task. Mandatory PDP tasks are protected by system governance and cannot be deleted. Only custom tasks or custom milestones may be deleted.',
              },
              { status: 403 }
            );
          }
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

    // 4. Project Creation: Strict PMO RBAC, Validation, Deduplication, Persistence, and Rollback
    if (docType === 'Project' && req.method === 'POST') {
      // 4a. RBAC: PMO Only (strictly require authenticated session, no default admin fallback)
      const projectCreationSession = getSessionFromRequest(req, false);
      if (!projectCreationSession) {
        return NextResponse.json(
          { _error_message: '401 Unauthorized: Authentication required to create projects.' },
          { status: 401 }
        );
      }
      const isPmo = projectCreationSession.role === 'admin' || !!projectCreationSession.permissions?.manageProjects;
      if (!isPmo) {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Only PMO personnel are authorized to create projects.' },
          { status: 403 }
        );
      }


      if (!parsedBodyObj || typeof parsedBodyObj !== 'object') {
        return NextResponse.json(
          { error: 'Project payload is required', _error_message: 'Project payload is required', field: 'payload' },
          { status: 400 }
        );
      }

      // 4b. Mandatory Field Validations
      const projectName = (parsedBodyObj.project_name || '').trim();
      if (!projectName) {
        return NextResponse.json(
          {
            error: 'Project Name cannot be empty or only spaces',
            _error_message: 'Project Name cannot be empty or only spaces',
            field: 'project_name',
          },
          { status: 400 }
        );
      }

      const productGroup = (parsedBodyObj.custom_product_group || '').trim();
      if (!productGroup) {
        return NextResponse.json(
          {
            error: 'Product Group is mandatory',
            _error_message: 'Product Group is mandatory',
            field: 'custom_product_group',
          },
          { status: 400 }
        );
      }
      if (!PRODUCT_GROUPS.includes(productGroup as any)) {
        return NextResponse.json(
          {
            error: 'Invalid Product Group selected',
            _error_message: 'Invalid Product Group selected',
            field: 'custom_product_group',
          },
          { status: 400 }
        );
      }

      const pdpCategoryRaw = (parsedBodyObj.custom_pdp_category || '').trim().toUpperCase();
      if (!pdpCategoryRaw) {
        return NextResponse.json(
          {
            error: 'PDP Category is mandatory (Category A or Category D)',
            _error_message: 'PDP Category is mandatory (Category A or Category D)',
            field: 'custom_pdp_category',
          },
          { status: 400 }
        );
      }
      if (pdpCategoryRaw !== 'A' && pdpCategoryRaw !== 'D') {
        return NextResponse.json(
          {
            error: 'Invalid PDP Category selected. Must be Category A or Category D.',
            _error_message: 'Invalid PDP Category selected. Must be Category A or Category D.',
            field: 'custom_pdp_category',
          },
          { status: 400 }
        );
      }
      const pdpCategory = pdpCategoryRaw as PDPCategory;

      // 4c. Double-Submission In-Flight Lock
      const lockKey = projectName.toLowerCase();
      if (inFlightProjectCreations.has(lockKey)) {
        return NextResponse.json(
          {
            error: `A project creation request for "${projectName}" is currently in progress. Please wait.`,
            _error_message: `A project creation request for "${projectName}" is currently in progress. Please wait.`,
            field: 'project_name',
          },
          { status: 409 }
        );
      }

      inFlightProjectCreations.add(lockKey);
      try {
        const erpUrl = getErpUrl();
        const apiKey = getApiKey();
        const apiSecret = getApiSecret();
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `token ${apiKey}:${apiSecret}`,
        };

        // 4d. Duplicate Uniqueness Check in ERPNext
        const checkRes = await fetch(
          `${erpUrl}/api/resource/Project?filters=[["project_name","=","${encodeURIComponent(projectName)}"]]&fields=["name","project_name"]&limit_page_length=1`,
          { headers, cache: 'no-store' }
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

        const projectCode = (parsedBodyObj.name || '').trim();
        if (projectCode) {
          const checkCodeRes = await fetch(
            `${erpUrl}/api/resource/Project?filters=[["name","=","${encodeURIComponent(projectCode)}"]]&fields=["name"]&limit_page_length=1`,
            { headers, cache: 'no-store' }
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
        }

        // 4e. Sanitize Payload for Native ERPNext Persistence
        const erpPayload: Record<string, any> = {
          ...parsedBodyObj,
          project_name: projectName,
          custom_product_group: productGroup,
          custom_pdp_category: pdpCategory,
          company: parsedBodyObj.company?.trim() || 'Netlink',
        };

        // If custom_project_category is provided, ensure it matches ERPNext options; otherwise remove to prevent validation failure
        if (
          !erpPayload.custom_project_category ||
          erpPayload.custom_project_category === 'Select' ||
          !PROJECT_CATEGORIES.includes(erpPayload.custom_project_category as any)
        ) {
          delete erpPayload.custom_project_category;
        }

        // 4f. Execute ERPNext Project Creation
        const createRes = await fetch(`${erpUrl}/api/resource/Project`, {
          method: 'POST',
          headers,
          body: JSON.stringify(erpPayload),
          cache: 'no-store',
        });

        const createText = await createRes.text();
        let createJson: any;
        try {
          createJson = JSON.parse(createText);
        } catch {
          createJson = createText;
        }

        if (!createRes.ok) {
          const errStr = JSON.stringify(createJson || createText || '');
          if (/duplicate/i.test(errStr) || /already\s*exists/i.test(errStr) || /must\s*be\s*unique/i.test(errStr)) {
            const isCode = /code/i.test(errStr);
            return NextResponse.json(
              {
                error: isCode ? 'Project Code must be unique' : 'Project Name must be unique',
                _error_message: isCode ? 'Project Code must be unique' : 'Project Name must be unique',
                field: isCode ? 'name' : 'project_name',
              },
              { status: 409 }
            );
          }
          return NextResponse.json(
            typeof createJson === 'object' && createJson !== null
              ? createJson
              : { _error_message: createText || 'ERPNext project creation failed' },
            { status: createRes.status }
          );
        }

        const createdProject = createJson.data;
        const createdProjectId = createdProject?.name;

        // 4g. Configurable Template Instantiation & Rollback Protection
        const templateMapping = getPdpCategoryMapping(pdpCategory);
        try {
          if (templateMapping?.gateTemplate && hasConfiguredGateTemplate(pdpCategory) && createdProjectId) {
            for (const gate of templateMapping.gateTemplate.gates) {
              await saveOrUpdateGate({
                name: `${createdProjectId}-${gate.gate_type}`,
                gate_name: gate.gate_name,
                gate_type: gate.gate_type,
                project: createdProjectId,
                project_name: projectName,
                status: 'Pending',
                criteria: (gate.criteria || []).map((c) => ({
                  id: c.id,
                  name: c.name,
                  status: 'Pending',
                  is_required: c.is_required,
                  description: c.description,
                })),
                deliverables: (gate.deliverables || []).map((d) => ({
                  id: d.id,
                  name: d.name,
                  status: 'Pending',
                  is_required: d.is_required,
                  description: d.description,
                })),
              });
            }
          }

          if (templateMapping?.ganttTemplate && hasConfiguredGanttTemplate(pdpCategory) && createdProjectId) {
            for (const task of templateMapping.ganttTemplate.tasks) {
              const taskRes = await fetch(`${erpUrl}/api/resource/Task`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  subject: task.subject,
                  project: createdProjectId,
                  status: 'Open',
                  priority: task.priority || 'Medium',
                  expected_time: task.expected_time || 0,
                  description: task.description || '',
                }),
                cache: 'no-store',
              });
              if (!taskRes.ok) {
                throw new Error(`Failed to create Gantt task "${task.subject}"`);
              }
            }
          }
        } catch (templateError: any) {
          console.error(`[Project Creation Rollback] Error instantiating template for ${createdProjectId}:`, templateError);
          if (createdProjectId) {
            try {
              await fetch(`${erpUrl}/api/resource/Project/${encodeURIComponent(createdProjectId)}`, {
                method: 'DELETE',
                headers,
                cache: 'no-store',
              });
            } catch (delError) {
              console.error(`[Project Creation Rollback] Failed to delete rolled-back project ${createdProjectId}:`, delError);
            }
          }
          return NextResponse.json(
            {
              error: `Project creation rolled back due to error initializing templates: ${templateError.message || templateError}`,
              _error_message: `Project creation rolled back due to error initializing templates: ${templateError.message || templateError}`,
            },
            { status: 500 }
          );
        }

        return NextResponse.json(createJson, { status: 200 });
      } finally {
        inFlightProjectCreations.delete(lockKey);
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

    // Project Charter Audit Trail Logging
    if (docType === 'Project' && req.method === 'PUT' && erpRes.ok && session && parsedBodyObj) {
      const charterFields = [
        'custom_project_manager',
        'custom_project_sponsor',
        'project_type',
        'notes',
        'custom_product_image',
        'custom_ar_no',
        'custom_region',
        'custom_country',
        'custom_manufacturing_plant',
        'custom_direct_customer',
        'custom_final_oem',
        'custom_model_year',
        'custom_project_assumptions',
        'custom_sop_date',
        'custom_vehicle',
        'custom_segment',
        'custom_life',
        'custom_customer_volume_annually',
        'custom_ihs_volume_annually',
        'custom_customer_assembly',
      ];

      for (const field of charterFields) {
        if (field in parsedBodyObj) {
          const oldVal = existingProjectForAudit ? existingProjectForAudit[field] : undefined;
          const newVal = parsedBodyObj[field];
          if (String(oldVal ?? '') !== String(newVal ?? '')) {
            try {
              saveAuditRecord({
                project_id: recordId,
                user_id: session.email,
                user_name: session.fullName || session.username || 'Project Manager',
                role: session.role || 'Project Manager',
                action: `Project Charter Updated: ${field}`,
                entity_type: 'Project',
                entity_id: recordId,
                description: `Updated Charter field "${field}" from "${oldVal || 'None'}" to "${newVal || 'None'}"`,
                old_value: String(oldVal ?? ''),
                new_value: String(newVal ?? ''),
                created_at: new Date().toISOString(),
              });
            } catch (auditErr) {
              console.warn('[Audit Store Error] Failed to log charter field update:', auditErr);
            }
          }
        }
      }
    }

    // Task POST / PUT Synchronizations (Assignment & RASIC)
    if (docType === 'Task' && (req.method === 'POST' || req.method === 'PUT') && erpRes.ok && resJson.data) {
      const targetTaskId = resJson.data.name || recordId;

      // 1. Synchronize Assignment
      if (parsedBodyObj?.assigned_to) {
        const targetEmail = parsedBodyObj.assigned_to;
        const emailToAssign = targetEmail.includes('@')
          ? targetEmail
          : targetEmail.toLowerCase().includes('yash')
          ? 'teammember@netlink.com'
          : targetEmail.toLowerCase().includes('sarah')
          ? 'sarahjenkins@gmail.com'
          : null;

        if (emailToAssign && targetTaskId) {
          try {
            await fetch(`${erpUrl}/api/method/frappe.desk.form.assign_to.add`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `token ${getApiKey()}:${getApiSecret()}`,
              },
              body: JSON.stringify({
                doctype: 'Task',
                name: targetTaskId,
                assign_to: JSON.stringify([emailToAssign]),
              }),
            });
          } catch {
            // non-blocking
          }
        }
      }

      // 2. Synchronize RASIC Store
      let rasicPayload = parsedBodyObj?.rasic;
      if (!rasicPayload && parsedBodyObj) {
        if (
          parsedBodyObj.rasic_responsible ||
          parsedBodyObj.rasic_accountable ||
          parsedBodyObj.rasic_support ||
          parsedBodyObj.rasic_consulted ||
          parsedBodyObj.rasic_informed
        ) {
          rasicPayload = {
            responsible: parsedBodyObj.rasic_responsible,
            accountable: parsedBodyObj.rasic_accountable,
            support: parsedBodyObj.rasic_support,
            consulted: parsedBodyObj.rasic_consulted,
            informed: parsedBodyObj.rasic_informed,
          };
        } else if (parsedBodyObj.description && parsedBodyObj.description.includes('<!-- RASIC:')) {
          try {
            const match = parsedBodyObj.description.match(/<!-- RASIC: (.*?) -->/);
            if (match && match[1]) {
              rasicPayload = JSON.parse(match[1]);
            }
          } catch {}
        }
      }

      if (targetTaskId && rasicPayload) {
        saveTaskRasic(targetTaskId, rasicPayload, session);
        resJson.data.rasic = rasicPayload;
      }

      // 3. Synchronize Phase Store
      let phasePayload = parsedBodyObj?.phase;
      if (!phasePayload && parsedBodyObj?.description && parsedBodyObj.description.includes('<!-- PHASE:')) {
        try {
          const match = parsedBodyObj.description.match(/<!-- PHASE: (.*?) -->/);
          if (match && match[1]) {
            phasePayload = match[1].trim();
          }
        } catch {}
      }

      if (targetTaskId && phasePayload) {
        const formatted = formatPhaseName(phasePayload);
        saveTaskPhase(targetTaskId, formatted);
        resJson.data.phase = formatted;
        resJson.data.phase_id = `phase-${getPhaseNumber(formatted)}`;
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

      // 5B. Task Scoping & RASIC Hydration
      if (docType === 'Task') {
        if (recordId && resJson.data) {
          // Hydrate RASIC from server store or description
          const storedRasic = getTaskRasic(recordId);
          if (storedRasic) {
            resJson.data.rasic = {
              responsible: storedRasic.responsible || '',
              accountable: storedRasic.accountable || '',
              support: storedRasic.support || '',
              consulted: storedRasic.consulted || '',
              informed: storedRasic.informed || '',
            };
          } else if (resJson.data.description && resJson.data.description.includes('<!-- RASIC:')) {
            try {
              const match = resJson.data.description.match(/<!-- RASIC: (.*?) -->/);
              if (match && match[1]) {
                resJson.data.rasic = JSON.parse(match[1]);
              }
            } catch {}
          }

          // Hydrate Submissions from server store
          const taskSubs = getTaskSubmissions(recordId);
          resJson.data.submissions = taskSubs;
          if (taskSubs.length > 0 && resJson.data.status !== 'Completed' && resJson.data.status !== 'Cancelled') {
            const latestSub = taskSubs[0];
            if (latestSub.status === 'Submitted') {
              resJson.data.status = 'Submitted';
            }
          }

          // Hydrate Phase
          const storedPhase = getTaskPhase(recordId);
          let extractedPhase = '';
          if (resJson.data.description && resJson.data.description.includes('<!-- PHASE:')) {
            try {
              const match = resJson.data.description.match(/<!-- PHASE: (.*?) -->/);
              if (match && match[1]) extractedPhase = match[1].trim();
            } catch {}
          }
          const finalPhase = storedPhase || extractedPhase || resJson.data.phase || inferTaskPhase(resJson.data);
          resJson.data.phase = formatPhaseName(finalPhase);
          resJson.data.phase_id = `phase-${getPhaseNumber(resJson.data.phase)}`;

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
          // Hydrate RASIC, Submissions, and Phases on all task items
          const allRasic = loadAllTaskRasic();
          const allSubs = loadAllTaskSubmissions();
          const allPhases = loadAllTaskPhases();
          resJson.data.forEach((item: any) => {
            if (item && item.name) {
              const r = allRasic[item.name];
              if (r) {
                item.rasic = {
                  responsible: r.responsible || '',
                  accountable: r.accountable || '',
                  support: r.support || '',
                  consulted: r.consulted || '',
                  informed: r.informed || '',
                };
              } else if (item.description && item.description.includes('<!-- RASIC:')) {
                try {
                  const match = item.description.match(/<!-- RASIC: (.*?) -->/);
                  if (match && match[1]) {
                    item.rasic = JSON.parse(match[1]);
                  }
                } catch {}
              }

              const subs = allSubs[item.name] || [];
              item.submissions = subs;
              if (subs.length > 0 && item.status !== 'Completed' && item.status !== 'Cancelled') {
                const latestSub = subs[0];
                if (latestSub.status === 'Submitted') {
                  item.status = 'Submitted';
                }
              }

              const storedP = allPhases[item.name];
              let descP = '';
              if (item.description && item.description.includes('<!-- PHASE:')) {
                try {
                  const match = item.description.match(/<!-- PHASE: (.*?) -->/);
                  if (match && match[1]) descP = match[1].trim();
                } catch {}
              }
              const finalP = storedP || descP || item.phase || inferTaskPhase(item);
              item.phase = formatPhaseName(finalP);
              item.phase_id = `phase-${getPhaseNumber(item.phase)}`;
            }
          });

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

    // Audit Trail Logging for Task Operations
    if (erpRes.ok && docType === 'Task') {
      try {
        const taskId = recordId || resJson?.data?.name || 'UNKNOWN';
        const projId = parsedBodyObj?.project || resJson?.data?.project || 'PROJ';
        if (req.method === 'POST') {
          saveAuditRecord({
            project_id: projId,
            user_id: session?.email || session?.username || 'user',
            user_name: session?.fullName || 'User',
            role: session?.roleLabel || session?.role || 'PM',
            action: parsedBodyObj?.is_milestone ? 'Custom Milestone Created' : 'Task Created',
            entity_type: 'Task',
            entity_id: taskId,
            description: `Created ${parsedBodyObj?.is_milestone ? 'milestone' : 'task'} "${parsedBodyObj?.subject || ''}" (ID: ${taskId})`,
            new_value: parsedBodyObj?.subject || '',
          });
        } else if (req.method === 'PUT') {
          const changedFields = Object.keys(parsedBodyObj || {}).filter(k => k !== 'doctype' && k !== 'name');
          saveAuditRecord({
            project_id: projId,
            user_id: session?.email || session?.username || 'user',
            user_name: session?.fullName || 'User',
            role: session?.roleLabel || session?.role || 'PM',
            action: parsedBodyObj?.custom_is_skipped
              ? 'Task Skipped'
              : parsedBodyObj?.custom_retimed_to
              ? 'Task Retimed'
              : 'Task Updated',
            entity_type: 'Task',
            entity_id: taskId,
            description: `Updated task ${taskId}: ${changedFields.join(', ')}`,
            new_value: JSON.stringify(parsedBodyObj).slice(0, 200),
          });
        } else if (req.method === 'DELETE') {
          saveAuditRecord({
            project_id: projId,
            user_id: session?.email || session?.username || 'user',
            user_name: session?.fullName || 'User',
            role: session?.roleLabel || session?.role || 'PM',
            action: 'Task Deleted',
            entity_type: 'Task',
            entity_id: taskId,
            description: `Deleted custom task/milestone ${taskId}`,
          });
        }
      } catch (err) {
        console.warn('[Audit Store] Failed to log task audit:', err);
      }
    }

    // Audit Trail Logging for Project Status Timing Chart
    if (erpRes.ok && (docType === 'Project Status Timing Chart' || docType === 'Project Status Timing Line Item')) {
      try {
        const chartId = recordId || resJson?.data?.name || 'TIMING';
        const projId = parsedBodyObj?.project || resJson?.data?.project || 'PROJ';
        saveAuditRecord({
          project_id: projId,
          user_id: session?.email || session?.username || 'user',
          user_name: session?.fullName || 'User',
          role: session?.roleLabel || session?.role || 'PM',
          action: req.method === 'POST' ? 'Timing Chart Initialized' : 'Timing Chart Updated',
          entity_type: 'Project Status Timing Chart',
          entity_id: chartId,
          description: `Updated Project Status Timing Chart for ${projId}`,
          new_value: JSON.stringify(parsedBodyObj).slice(0, 200),
        });
      } catch (err) {
        console.warn('[Audit Store] Failed to log timing chart audit:', err);
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
