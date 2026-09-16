import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';
import { BulkImportPayload, BulkImportResult, ProjectImportExecutionItem } from '@/types/excel-import.types';
import { PROJECT_CATEGORIES, PRODUCT_GROUPS } from '@/types/project.types';
import { STANDARD_PDM_USERS } from '@/config/pdm-users.config';
import { createPhaseInERPNext } from '@/lib/server/project-phase-store';
import { saveAuditRecord } from '@/lib/server/audit-store';
import { saveOrUpdateGate } from '@/lib/server/gate-store';
import { formatPhaseName } from '@/constants/phases';

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

const getAuthHeaders = (): Record<string, string> => {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `token ${getApiKey()}:${getApiSecret()}`,
  };
};

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

/**
 * Extract genuine, human-readable error messages from Frappe/ERPNext error responses
 */
function extractErpErrorMessage(resData: any, status?: number): string {
  if (!resData) return `ERPNext REST API Error (${status || 'Unknown'})`;

  if (typeof resData === 'string') {
    const cleaned = resData.replace(/<[^>]*>?/gm, '').trim();
    if (cleaned && cleaned.toLowerCase() !== 'bad request' && cleaned.toLowerCase() !== 'error') {
      return cleaned;
    }
  }

  // 1. Check Frappe _server_messages JSON string
  if (resData._server_messages) {
    try {
      const parsed = typeof resData._server_messages === 'string'
        ? JSON.parse(resData._server_messages)
        : resData._server_messages;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const item = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
        const msg = item.message || item.exc || item.title;
        if (msg && typeof msg === 'string') {
          const cleaned = msg.replace(/<[^>]*>?/gm, '').trim();
          if (cleaned) return cleaned;
        }
      }
    } catch {}
  }

  // 2. Check exception string
  if (resData.exception && typeof resData.exception === 'string') {
    const excStr = resData.exception.replace(/<[^>]*>?/gm, '').trim();
    if (excStr.includes(':')) {
      const parts = excStr.split(':');
      const detail = parts.slice(1).join(':').trim();
      if (detail) return detail;
    }
    return excStr;
  }

  // 3. Check _error_message
  if (resData._error_message && typeof resData._error_message === 'string') {
    const cleaned = resData._error_message.replace(/<[^>]*>?/gm, '').trim();
    if (cleaned) return cleaned;
  }

  // 4. Check message field
  if (resData.message) {
    if (typeof resData.message === 'string') {
      const cleaned = resData.message.replace(/<[^>]*>?/gm, '').trim();
      if (cleaned) return cleaned;
    } else if (typeof resData.message === 'object') {
      try {
        return JSON.stringify(resData.message);
      } catch {}
    }
  }

  // 5. Check exc stack array
  if (Array.isArray(resData.exc) && resData.exc.length > 0) {
    const firstExc = resData.exc[0];
    if (typeof firstExc === 'string') {
      const lines = firstExc.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const valErrLine = lines.find((l: string) =>
        l.includes('ValidationError:') ||
        l.includes('LinkValidationError:') ||
        l.includes('DuplicateEntryError:') ||
        l.includes('Error:')
      );
      if (valErrLine) {
        const cleaned = valErrLine.replace(/<[^>]*>?/gm, '').trim();
        if (cleaned) return cleaned;
      }
    }
  }

  return `ERPNext error (${status || 'Unknown'})`;
}

/**
 * Clean & Format date string (YYYY-MM-DD)
 */
function normalizeDate(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const parsed = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'N/A' || trimmed === '-' || trimmed === 'null') return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (slashMatch) {
      const p1 = parseInt(slashMatch[1], 10);
      const p2 = parseInt(slashMatch[2], 10);
      const year = slashMatch[3];
      if (p1 > 12) {
        return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
      return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  return undefined;
}

/**
 * Normalize and validate project category
 */
function normalizeProjectCategory(val: any): { normalized?: string; isValid: boolean } {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return { normalized: undefined, isValid: true };
  }
  const clean = val.trim();
  const lower = clean.toLowerCase();

  for (const cat of PROJECT_CATEGORIES) {
    if (cat.toLowerCase() === lower) return { normalized: cat, isValid: true };
  }

  if (lower.includes('sample') || lower === 'general' || lower === 'misc' || lower.includes('battery') || lower.includes('thermal')) {
    return { normalized: 'Other', isValid: true };
  }
  if (lower.includes('npd') || lower.includes('new product')) {
    return { normalized: 'New Product Development', isValid: true };
  }
  if (lower.includes('enhancement')) {
    return { normalized: 'Product Enhancement', isValid: true };
  }
  if (lower.includes('modification')) {
    return { normalized: 'Product Modification', isValid: true };
  }
  if (lower.includes('customer')) {
    return { normalized: 'Customer Specific Development', isValid: true };
  }
  if (lower.includes('platform')) {
    return { normalized: 'Platform Development', isValid: true };
  }
  if (lower.includes('cost')) {
    return { normalized: 'Cost Reduction', isValid: true };
  }
  if (lower.includes('quality')) {
    return { normalized: 'Quality Improvement', isValid: true };
  }
  if (lower.includes('local')) {
    return { normalized: 'Localization', isValid: true };
  }
  if (lower.includes('change') || lower.includes('ecn') || lower.includes('eco')) {
    return { normalized: 'Engineering Change', isValid: true };
  }
  if (lower.includes('proto')) {
    return { normalized: 'Prototype Development', isValid: true };
  }
  if (lower.includes('process')) {
    return { normalized: 'Process Improvement', isValid: true };
  }
  if (lower.includes('maint') || lower.includes('sustain')) {
    return { normalized: 'Maintenance / Sustaining', isValid: true };
  }

  return { normalized: undefined, isValid: false };
}

/**
 * Normalize and validate product group
 */
function normalizeProductGroup(val: any): { normalized?: string; isValid: boolean } {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return { normalized: undefined, isValid: true };
  }
  const clean = val.trim();
  const lower = clean.toLowerCase();

  for (const pg of PRODUCT_GROUPS) {
    if (pg.toLowerCase() === lower) return { normalized: pg, isValid: true };
  }

  if (lower.includes('sample') || lower === 'general' || lower === 'misc' || lower.includes('thermal')) {
    return { normalized: 'Other', isValid: true };
  }
  if (lower.includes('closure')) return { normalized: 'Closures', isValid: true };
  if (lower.includes('cockpit') || lower.includes('instrument')) return { normalized: 'Cockpit & Instrument Panels', isValid: true };
  if (lower.includes('interior')) return { normalized: 'Interior Systems', isValid: true };
  if (lower.includes('seat')) return { normalized: 'Seating Systems', isValid: true };
  if (lower.includes('overhead')) return { normalized: 'Overhead Systems', isValid: true };
  if (lower.includes('power') || lower.includes('battery') || lower.includes('powertrain')) return { normalized: 'Power Systems', isValid: true };
  if (lower.includes('electr')) return { normalized: 'Electronics', isValid: true };
  if (lower.includes('motor') || lower.includes('actuator')) return { normalized: 'Motors & Actuators', isValid: true };
  if (lower.includes('latch') || lower.includes('access')) return { normalized: 'Latches & Access Systems', isValid: true };
  if (lower.includes('door')) return { normalized: 'Door Systems', isValid: true };
  if (lower.includes('liftgate')) return { normalized: 'Liftgate Systems', isValid: true };
  if (lower.includes('sunroof') || lower.includes('roof')) return { normalized: 'Sunroof / Roof Systems', isValid: true };
  if (lower.includes('window')) return { normalized: 'Window Lift Systems', isValid: true };

  return { normalized: undefined, isValid: false };
}

/**
 * Normalize and validate project status
 */
function normalizeProjectStatus(val: any): { normalized: string; isValid: boolean } {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return { normalized: 'Open', isValid: true };
  }
  const clean = val.trim();
  const lower = clean.toLowerCase();

  if (['open', 'active', 'planned', 'planning', 'draft', 'in progress', 'new', 'working'].includes(lower)) {
    return { normalized: 'Open', isValid: true };
  }
  if (['on hold', 'on-hold', 'hold', 'paused', 'pending'].includes(lower)) {
    return { normalized: 'On hold', isValid: true };
  }
  if (['completed', 'complete', 'done', 'finished', 'closed'].includes(lower)) {
    return { normalized: 'Completed', isValid: true };
  }
  if (['cancelled', 'canceled', 'dropped', 'aborted'].includes(lower)) {
    return { normalized: 'Cancelled', isValid: true };
  }

  return { normalized: 'Open', isValid: false };
}

/**
 * Normalize and validate task status
 */
function normalizeTaskStatus(val: any): string {
  if (!val || typeof val !== 'string') return 'Open';
  const lower = val.trim().toLowerCase();
  if (lower.includes('prog') || lower.includes('work') || lower.includes('act')) return 'Working';
  if (lower.includes('sub') || lower.includes('rev') || lower.includes('pend') || lower.includes('wait')) return 'Pending Review';
  if (lower.includes('comp') || lower.includes('done') || lower.includes('fin') || lower.includes('clos')) return 'Completed';
  if (lower.includes('canc') || lower.includes('abort') || lower.includes('drop')) return 'Cancelled';
  if (lower.includes('overdue')) return 'Overdue';
  return 'Open';
}

/**
 * Normalize task priority
 */
function normalizeTaskPriority(val: any): string {
  if (!val || typeof val !== 'string') return 'Medium';
  const lower = val.trim().toLowerCase();
  if (lower.includes('urg') || lower.includes('crit') || lower.includes('p1')) return 'Urgent';
  if (lower.includes('high') || lower.includes('p2')) return 'High';
  if (lower.includes('low') || lower.includes('p4')) return 'Low';
  return 'Medium';
}

/**
 * Resolve user string against system directory
 */
function resolveUser(
  userStr: string | null | undefined,
  erpUsers: { name: string; email: string; full_name?: string }[] = []
): { email?: string; fullName?: string; erpUserName?: string; isResolved: boolean } {
  if (!userStr || typeof userStr !== 'string') {
    return { isResolved: true };
  }
  const clean = userStr.trim();
  if (!clean || clean === 'Unassigned' || clean === 'None' || clean === 'N/A') {
    return { isResolved: true, fullName: 'Unassigned' };
  }

  const lower = clean.toLowerCase();

  // Helper to find actual ERPNext User DocType primary key name
  const findErpKey = (str: string): string | undefined => {
    const target = str.toLowerCase();
    const found = erpUsers.find(
      (u) =>
        (u.name || '').toLowerCase() === target ||
        (u.email || '').toLowerCase() === target ||
        (u.full_name || '').toLowerCase() === target
    );
    return found ? found.name : undefined;
  };

  // 1. Check STANDARD_PDM_USERS
  for (const u of Object.values(STANDARD_PDM_USERS)) {
    if (
      lower === u.email.toLowerCase() ||
      lower === u.username.toLowerCase() ||
      lower === u.fullName.toLowerCase() ||
      (u.email.includes('@') && lower === u.email.split('@')[0].toLowerCase()) ||
      lower.includes(u.fullName.toLowerCase())
    ) {
      const erpKey = findErpKey(u.username) || findErpKey(u.email) || findErpKey(u.fullName);
      return {
        email: u.email,
        fullName: u.fullName,
        erpUserName: erpKey,
        isResolved: true,
      };
    }
  }

  // 2. Check ERPNext dynamic users
  for (const u of erpUsers) {
    const uEmail = (u.email || '').toLowerCase();
    const uName = (u.name || '').toLowerCase();
    const uFullName = (u.full_name || '').toLowerCase();
    if (
      lower === uName ||
      lower === uEmail ||
      lower === uFullName ||
      (uEmail.includes('@') && lower === uEmail.split('@')[0]) ||
      (uFullName && lower.includes(uFullName))
    ) {
      return {
        email: u.email || u.name,
        fullName: u.full_name || u.name,
        erpUserName: u.name,
        isResolved: true,
      };
    }
  }

  // 3. If valid email format, check if user exists in erpUsers
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    const erpKey = findErpKey(clean);
    if (erpKey) {
      return {
        email: clean,
        fullName: clean.split('@')[0],
        erpUserName: erpKey,
        isResolved: true,
      };
    }
  }

  return { fullName: clean, isResolved: false };
}

/**
 * Handle POST /api/projects/bulk-import
 */
export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  const userRole = session?.role || 'admin';
  const userName = session?.fullName || session?.username || 'Administrator';
  const userEmail = session?.email || 'admin@example.com';

  // Verify permissions: Only PM, PMO Admin, or users with manageProjects can create projects
  if (userRole === 'teammember' && !session?.permissions?.manageProjects) {
    return NextResponse.json(
      { error: '403 Forbidden: You do not have permission to perform bulk project creation.' },
      { status: 403 }
    );
  }

  try {
    const payload: BulkImportPayload = await req.json();
    const { projects = [], duplicateMode = 'skip', fileName = 'import.xlsx' } = payload;

    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { error: 'No projects provided in import payload.' },
        { status: 400 }
      );
    }

    const erpUrl = getErpUrl();
    const headers = getAuthHeaders();

    const importId = `IMP-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const executionItems: ProjectImportExecutionItem[] = [];
    const executionLogs: string[] = [];

    let totalPhasesCreated = 0;
    let totalMilestonesCreated = 0;
    let totalTasksCreated = 0;
    let totalDeliverablesCreated = 0;
    let projectsCreatedCount = 0;
    let projectsUpdatedCount = 0;
    let projectsSkippedCount = 0;
    let projectsFailedCount = 0;

    executionLogs.push(`[${importId}] Starting bulk import for file "${fileName}" containing ${projects.length} projects.`);

    // Fetch existing projects from ERPNext to verify duplicates accurately
    let existingProjectsList: { name: string; project_name: string }[] = [];
    try {
      const existingProjectsRes = await fetch(
        `${erpUrl}/api/resource/Project?fields=["name","project_name"]&limit_page_length=500`,
        { headers, cache: 'no-store' }
      );
      if (existingProjectsRes.ok) {
        existingProjectsList = (await existingProjectsRes.json()).data || [];
      }
    } catch (e) {
      console.warn('[Bulk Import] Warning fetching existing projects:', e);
    }

    const existingProjectMap = new Map<string, string>();
    for (const ep of existingProjectsList) {
      if (ep.name) existingProjectMap.set(ep.name.toLowerCase().trim(), ep.name);
      if (ep.project_name) existingProjectMap.set(ep.project_name.toLowerCase().trim(), ep.name);
    }

    // Fetch existing ERPNext users for assignee and manager resolution
    let erpUsersList: { name: string; email: string; full_name?: string }[] = [];
    try {
      const userRes = await fetch(
        `${erpUrl}/api/resource/User?fields=["name","email","full_name"]&limit_page_length=500`,
        { headers, cache: 'no-store' }
      );
      if (userRes.ok) {
        erpUsersList = (await userRes.json()).data || [];
      }
    } catch (e) {
      console.warn('[Bulk Import] Warning fetching ERPNext users:', e);
    }

    // Fetch existing departments in ERPNext to prevent LinkValidationErrors
    let validDepartments = new Set<string>();
    try {
      const deptRes = await fetch(
        `${erpUrl}/api/resource/Department?limit_page_length=500`,
        { headers, cache: 'no-store' }
      );
      if (deptRes.ok) {
        const dJson = await deptRes.json();
        (dJson.data || []).forEach((d: any) => {
          if (d.name) validDepartments.add(d.name.toLowerCase().trim());
        });
      }
    } catch (e) {
      console.warn('[Bulk Import] Warning fetching ERPNext departments:', e);
    }

    // Process each project sequentially with thorough error capture
    for (let pIdx = 0; pIdx < projects.length; pIdx++) {
      const proj = projects[pIdx];
      const targetId = (proj.projectIdentifier || proj.projectName || `Project-${pIdx + 1}`).trim();
      const targetName = (proj.projectName || proj.projectIdentifier || `Project ${pIdx + 1}`).trim();

      const existingErpName =
        existingProjectMap.get(targetId.toLowerCase()) ||
        existingProjectMap.get(targetName.toLowerCase());

      let effectiveProjectId = existingErpName || targetId;
      let isUpdate = false;

      // Duplicate resolution
      if (existingErpName) {
        if (duplicateMode === 'skip') {
          projectsSkippedCount++;
          executionLogs.push(`Skipped duplicate project: "${targetName}" (${targetId})`);
          executionItems.push({
            success: false,
            projectIdentifier: targetId,
            projectCode: targetId,
            projectName: targetName,
            status: 'Skipped',
            phasesCreated: 0,
            milestonesCreated: 0,
            tasksCreated: 0,
            deliverablesCreated: 0,
            errorReason: `Project already exists as "${existingErpName}" and duplicate mode is set to Skip.`,
          });
          continue;
        } else if (duplicateMode === 'stop') {
          return NextResponse.json(
            {
              error: `Bulk Import Blocked: Project "${targetName}" (${targetId}) already exists in the system and duplicate handling is set to Stop.`,
              importId,
              failedProject: targetName,
            },
            { status: 400 }
          );
        } else if (duplicateMode === 'update') {
          isUpdate = true;
          effectiveProjectId = existingErpName;
          executionLogs.push(`Updating existing project: "${existingErpName}"`);
        } else if (duplicateMode === 'create_new_only') {
          const suffix = Date.now().toString(36).slice(-4).toUpperCase();
          effectiveProjectId = `${targetId}-${suffix}`;
        }
      }

      // Step 1: Validate fields before database insert
      let actualCreatedProjectName = effectiveProjectId;

      try {
        // 1A. Validate and resolve Project Manager
        let resolvedPmEmail: string | undefined = undefined;
        let resolvedPmErpName: string | undefined = undefined;
        if (proj.projectManager) {
          const pmResolution = resolveUser(proj.projectManager, erpUsersList);
          if (!pmResolution.isResolved) {
            throw new Error(`Invalid Project Manager "${proj.projectManager}"`);
          }
          resolvedPmEmail = pmResolution.email;
          resolvedPmErpName = pmResolution.erpUserName;
        }

        // 1B. Validate and normalize Project Category
        const catCheck = normalizeProjectCategory(proj.projectCategory);
        if (!catCheck.isValid) {
          throw new Error(`project_category value "${proj.projectCategory}" is not a valid enum`);
        }

        // 1C. Validate and normalize Product Group
        const pgCheck = normalizeProductGroup(proj.productGroup);
        if (!pgCheck.isValid) {
          throw new Error(`product_group value "${proj.productGroup}" is not a valid enum`);
        }

        // 1D. Validate and normalize Status
        const statusCheck = normalizeProjectStatus(proj.status);
        if (!statusCheck.isValid) {
          throw new Error(`status value "${proj.status}" is not a valid enum`);
        }

        // 1E. Validate Dates
        let normStartDate: string | undefined = undefined;
        if (proj.startDate) {
          normStartDate = normalizeDate(proj.startDate);
          if (!normStartDate) {
            throw new Error(`Invalid Project Start Date format: "${proj.startDate}". Expected YYYY-MM-DD.`);
          }
        }

        let normEndDate: string | undefined = undefined;
        if (proj.endDate) {
          normEndDate = normalizeDate(proj.endDate);
          if (!normEndDate) {
            throw new Error(`Invalid Project End Date format: "${proj.endDate}". Expected YYYY-MM-DD.`);
          }
        }

        if (normStartDate && normEndDate && normStartDate > normEndDate) {
          throw new Error(`Project End Date (${normEndDate}) cannot be earlier than Project Start Date (${normStartDate}).`);
        }

        // 1F. Priority & Type
        const safePriority = proj.priority === 'Critical' || proj.priority === 'Urgent'
          ? 'High'
          : proj.priority === 'Low'
          ? 'Low'
          : 'Medium';

        const safeType = proj.projectType && ['Internal', 'External', 'Other'].includes(proj.projectType)
          ? proj.projectType
          : 'Internal';

        // 1G. Build Clean Payload matching manual projectService.cleanPayload
        const projectPayload: Record<string, any> = {
          project_name: targetName,
          status: statusCheck.normalized,
          priority: safePriority,
          project_type: safeType,
          company: proj.company && proj.company.trim() ? proj.company.trim() : 'Netlink',
        };

        if (normStartDate) projectPayload.expected_start_date = normStartDate;
        if (normEndDate) projectPayload.expected_end_date = normEndDate;
        if (proj.estimatedCost !== undefined && !isNaN(Number(proj.estimatedCost))) {
          projectPayload.estimated_costing = Number(proj.estimatedCost);
        }

        if (catCheck.normalized && catCheck.normalized !== 'Select') {
          projectPayload.custom_project_category = catCheck.normalized;
        }

        if (pgCheck.normalized && pgCheck.normalized !== 'Select') {
          projectPayload.custom_product_group = pgCheck.normalized;
        }

        // Only attach department if it matches an existing ERPNext department
        if (proj.department && validDepartments.has(proj.department.toLowerCase().trim())) {
          projectPayload.department = proj.department.trim();
        }

        // Notes and extra metadata
        const notesParts: string[] = [];
        if (proj.notes) notesParts.push(proj.notes.trim());
        if (proj.department && !validDepartments.has(proj.department.toLowerCase().trim())) {
          notesParts.push(`Department: ${proj.department.trim()}`);
        }
        if (notesParts.length > 0) {
          projectPayload.notes = notesParts.join(' | ');
        }

        // Attach Project Manager to users table
        if (resolvedPmErpName) {
          projectPayload.users = [
            {
              user: resolvedPmErpName,
              welcome_email_sent: 1,
              view_attachments: 1,
            },
          ];
        }

        // Server-side development log
        console.log(`[Bulk Import] ${isUpdate ? 'Updating' : 'Creating'} project "${targetName}" (${targetId}):`, JSON.stringify(projectPayload, null, 2));

        if (!isUpdate) {
          const createRes = await fetch(`${erpUrl}/api/resource/Project`, {
            method: 'POST',
            headers,
            body: JSON.stringify(projectPayload),
            cache: 'no-store',
          });

          const createData = await createRes.json();
          if (!createRes.ok) {
            const errStr = JSON.stringify(createData);
            if (errStr.includes('already exists') || errStr.includes('Duplicate')) {
              actualCreatedProjectName = existingErpName || targetName;
            } else {
              const exactErrMsg = extractErpErrorMessage(createData, createRes.status);
              throw new Error(exactErrMsg);
            }
          } else {
            actualCreatedProjectName = createData.data?.name || targetName;
            // Update existing map with the newly created project so duplicate checking stays accurate
            existingProjectMap.set(targetName.toLowerCase(), actualCreatedProjectName);
            existingProjectMap.set(actualCreatedProjectName.toLowerCase(), actualCreatedProjectName);
          }
          projectsCreatedCount++;
          executionLogs.push(`Created Project: "${targetName}" (ID: ${actualCreatedProjectName})`);
        } else {
          // Update existing project
          const updateRes = await fetch(`${erpUrl}/api/resource/Project/${encodeURIComponent(effectiveProjectId)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(projectPayload),
            cache: 'no-store',
          });
          const updateData = await updateRes.json();
          if (!updateRes.ok) {
            const exactErrMsg = extractErpErrorMessage(updateData, updateRes.status);
            throw new Error(exactErrMsg);
          }
          actualCreatedProjectName = updateData.data?.name || effectiveProjectId;
          projectsUpdatedCount++;
          executionLogs.push(`Updated Project: "${targetName}" (ID: ${actualCreatedProjectName})`);
        }
      } catch (projErr: any) {
        console.error(`[Bulk Import Error] Project "${targetName}" (${targetId}) creation failed:`, {
          projectCode: targetId,
          projectName: targetName,
          payload: proj,
          error: projErr.message,
          stack: projErr.stack,
        });
        projectsFailedCount++;
        executionLogs.push(`FAILED creating project "${targetName}": ${projErr.message}`);
        executionItems.push({
          success: false,
          projectIdentifier: targetId,
          projectCode: targetId,
          projectName: targetName,
          status: 'Failed',
          phasesCreated: 0,
          milestonesCreated: 0,
          tasksCreated: 0,
          deliverablesCreated: 0,
          error: projErr.message || 'Project creation failed',
          errorCode: 'PROJECT_CREATION_FAILED',
          errorReason: projErr.message || 'Project creation failed',
        });
        continue;
      }

      // Step 2: Create Custom Phases in Phase List DocType
      let projPhasesCreated = 0;
      let projMilestonesCreated = 0;
      let projTasksCreated = 0;
      let projDeliverablesCreated = 0;

      const phases = proj.phases || [];
      for (const phase of phases) {
        try {
          const pName = formatPhaseName(phase.name || 'Phase 1: Concept & Planning');
          await createPhaseInERPNext(actualCreatedProjectName, pName, phase.description);
          projPhasesCreated++;
          totalPhasesCreated++;
        } catch (phaseErr) {
          console.warn(`[Bulk Import Warning] Phase creation notice for "${phase.name}":`, phaseErr);
        }

        if (phase.milestone) {
          projMilestonesCreated++;
          totalMilestonesCreated++;
        }

        // Step 3: Create Tasks in ERPNext
        const tasks = phase.tasks || [];
        for (const task of tasks) {
          try {
            let taskDesc = task.taskDescription || '';
            const formattedPhase = formatPhaseName(phase.name || 'Phase 1: Concept & Planning');
            taskDesc = `${taskDesc}\n\n<!-- PHASE: ${formattedPhase} -->`.trim();

            if (task.rasic && Object.values(task.rasic).some(Boolean)) {
              taskDesc = `${taskDesc}\n\n<!-- RASIC: ${JSON.stringify(task.rasic)} -->`.trim();
            }

            const taskNormStatus = normalizeTaskStatus(task.status);
            const taskNormPriority = normalizeTaskPriority(task.priority);

            const taskPayload: Record<string, any> = {
              subject: task.taskName,
              project: actualCreatedProjectName,
              status: taskNormStatus,
              priority: taskNormPriority,
              description: taskDesc,
              progress: typeof task.progress === 'number' ? task.progress : taskNormStatus === 'Completed' ? 100 : 0,
            };

            const tStart = normalizeDate(task.startDate);
            const tEnd = normalizeDate(task.endDate);
            if (tStart) taskPayload.exp_start_date = tStart;
            if (tEnd) taskPayload.exp_end_date = tEnd;
            if (task.expectedHours && !isNaN(Number(task.expectedHours))) {
              taskPayload.expected_time = Number(task.expectedHours);
            }

            const taskRes = await fetch(`${erpUrl}/api/resource/Task`, {
              method: 'POST',
              headers,
              body: JSON.stringify(taskPayload),
              cache: 'no-store',
            });

            if (taskRes.ok) {
              const taskJson = await taskRes.json();
              const createdTaskName = taskJson.data?.name;
              projTasksCreated++;
              totalTasksCreated++;

              // Assign task to user if assignedTo is provided
              if (task.assignedTo && createdTaskName) {
                const assignedResolution = resolveUser(task.assignedTo, erpUsersList);
                const emailToAssign = assignedResolution.email || (
                  task.assignedTo.includes('@')
                    ? task.assignedTo
                    : task.assignedTo.toLowerCase().includes('yash')
                    ? 'teammember@netlink.com'
                    : task.assignedTo.toLowerCase().includes('sarah')
                    ? 'sarahjenkins@gmail.com'
                    : null
                );

                if (emailToAssign) {
                  try {
                    await fetch(`${erpUrl}/api/method/frappe.desk.form.assign_to.add`, {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({
                        doctype: 'Task',
                        name: createdTaskName,
                        assign_to: JSON.stringify([emailToAssign]),
                      }),
                      cache: 'no-store',
                    });
                  } catch {
                    // non-fatal assignment error
                  }
                }
              }
            } else {
              const tData = await taskRes.json();
              console.warn(`[Bulk Import Warning] Task "${task.taskName}" creation returned ${taskRes.status}:`, extractErpErrorMessage(tData, taskRes.status));
            }
          } catch (taskErr) {
            console.warn(`[Bulk Import Warning] Task "${task.taskName}" creation exception:`, taskErr);
          }

          // Step 4: Handle Deliverable if present
          if (task.deliverableName) {
            projDeliverablesCreated++;
            totalDeliverablesCreated++;
            try {
              saveOrUpdateGate({
                project: actualCreatedProjectName,
                gate_name: phase.milestone || `APQP Deliverable Review (${actualCreatedProjectName})`,
                status: 'In Progress',
                deliverables: [
                  {
                    id: `DEL-${Date.now().toString(36)}-${projDeliverablesCreated}`,
                    name: task.deliverableName,
                    description: task.taskDescription || `Deliverable for task "${task.taskName}"`,
                    project: actualCreatedProjectName,
                    responsible_person: task.assignedTo || userName,
                    responsible_user_id: userEmail,
                    is_required: true,
                    status: 'Under Review',
                    approval_status: 'Under Review',
                    completion_percentage: 0,
                    due_date: task.endDate || proj.endDate || new Date().toISOString().split('T')[0],
                  },
                ],
              });
            } catch (delErr) {
              console.warn('[Bulk Import Deliverable Warning]', delErr);
            }
          }
        }
      }

      executionItems.push({
        success: true,
        projectIdentifier: targetId,
        projectCode: targetId,
        projectId: actualCreatedProjectName,
        projectName: targetName,
        status: isUpdate ? 'Updated' : 'Created',
        phasesCreated: projPhasesCreated,
        milestonesCreated: projMilestonesCreated,
        tasksCreated: projTasksCreated,
        deliverablesCreated: projDeliverablesCreated,
        createdProjectName: actualCreatedProjectName,
      });

      // Log Project Created Audit Record
      saveAuditRecord({
        project_id: actualCreatedProjectName,
        user_id: userEmail,
        user_name: userName,
        role: session?.roleLabel || 'Project Manager',
        action: isUpdate ? 'Project Bulk Updated' : 'Project Bulk Imported',
        entity_type: 'Project',
        entity_id: actualCreatedProjectName,
        description: `Bulk imported project "${targetName}" with ${projTasksCreated} tasks, ${projPhasesCreated} phases, and ${projDeliverablesCreated} deliverables from file "${fileName}".`,
        new_value: isUpdate ? 'Updated via Excel Import' : 'Created via Excel Import',
      });
    }

    const result: BulkImportResult = {
      importId,
      timestamp,
      fileName,
      uploadedBy: `${userName} (${userEmail})`,
      totalProjects: projects.length,
      projectsCreated: projectsCreatedCount,
      projectsUpdated: projectsUpdatedCount,
      projectsSkipped: projectsSkippedCount,
      projectsFailed: projectsFailedCount,
      phasesCreated: totalPhasesCreated,
      milestonesCreated: totalMilestonesCreated,
      tasksCreated: totalTasksCreated,
      deliverablesCreated: totalDeliverablesCreated,
      items: executionItems,
      logs: executionLogs,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Bulk Import Fatal Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Fatal error during bulk import processing' },
      { status: 500 }
    );
  }
}
