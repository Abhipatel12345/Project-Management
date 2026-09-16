import * as XLSX from 'xlsx';
import {
  PDMFieldDefinition,
  PDMFieldId,
  ColumnMappingItem,
  MappingTemplate,
  ParsedProjectItem,
  ParsedPhaseItem,
  ParsedTaskItem,
  ValidationError,
  ValidationWarning,
  ImportValidationSummary,
  BulkImportResult,
} from '@/types/excel-import.types';
import { TaskPriority, TaskStatus } from '@/types/task.types';
import { PROJECT_CATEGORIES, PRODUCT_GROUPS, ProjectStatus } from '@/types/project.types';
import { STANDARD_PDM_USERS } from '@/config/pdm-users.config';
import { formatPhaseName, inferTaskPhase } from '@/constants/phases';

export const PDM_FIELD_DEFINITIONS: PDMFieldDefinition[] = [
  // Project Level
  {
    id: 'project_id',
    label: 'Project Identifier / Code (ID)',
    category: 'Project',
    required: true,
    isProjectIdentifier: true,
    description: 'Unique identifier used to group multiple rows into the same project',
    aliases: ['project id', 'project_id', 'projectid', 'project code', 'project_code', 'project number', 'project no', 'proj id', 'proj_id', 'wbs code', 'program id', 'code', 'id'],
  },
  {
    id: 'project_name',
    label: 'Project Name',
    category: 'Project',
    required: true,
    description: 'Official name or title of the project / program',
    aliases: ['project name', 'project_name', 'projectname', 'project', 'program name', 'program', 'title', 'project title'],
  },
  {
    id: 'project_manager',
    label: 'Project Manager (PM)',
    category: 'Project',
    description: 'Assigned Project Manager name or email',
    aliases: ['project manager', 'project_manager', 'pm', 'lead pm', 'program manager', 'owner', 'lead', 'project owner', 'manager', 'lead engineer'],
  },
  {
    id: 'project_category',
    label: 'Project Category',
    category: 'Project',
    description: 'APQP / Automotive Project Category (e.g. Battery Systems, Powertrain, Chassis)',
    aliases: ['project category', 'project_category', 'category', 'program category', 'classification', 'domain'],
  },
  {
    id: 'product_group',
    label: 'Product Group',
    category: 'Project',
    description: 'Product Group or Platform (e.g. Thermal Systems, High Voltage)',
    aliases: ['product group', 'product_group', 'group', 'product line', 'platform', 'subsystem'],
  },
  {
    id: 'department',
    label: 'Department',
    category: 'Project',
    description: 'Engineering or Business Department',
    aliases: ['department', 'dept', 'division', 'business unit', 'functional group'],
  },
  {
    id: 'company',
    label: 'Company / Organization',
    category: 'Project',
    description: 'Legal operating company (default: Netlink)',
    aliases: ['company', 'organization', 'entity', 'org', 'legal entity'],
  },
  {
    id: 'project_type',
    label: 'Project Type',
    category: 'Project',
    description: 'Internal, Customer, or Platform project',
    aliases: ['project type', 'project_type', 'type', 'program type'],
  },
  {
    id: 'project_priority',
    label: 'Project Priority',
    category: 'Project',
    description: 'Low, Medium, High, or Urgent',
    aliases: ['project priority', 'project_priority', 'proj priority'],
  },
  {
    id: 'project_status',
    label: 'Project Status',
    category: 'Project',
    description: 'Open, In Progress, Completed, On Hold, Cancelled',
    aliases: ['project status', 'project_status', 'proj status'],
  },
  {
    id: 'project_start_date',
    label: 'Project Expected Start Date',
    category: 'Project',
    description: 'Overall project start date',
    aliases: ['project start date', 'project_start_date', 'proj start', 'project start', 'target start', 'program start'],
  },
  {
    id: 'project_end_date',
    label: 'Project Expected End Date',
    category: 'Project',
    description: 'Overall project completion target date',
    aliases: ['project end date', 'project_end_date', 'proj end', 'project end', 'target end', 'program end', 'sop date'],
  },
  {
    id: 'estimated_cost',
    label: 'Estimated Cost / Budget',
    category: 'Project',
    description: 'Total financial budget or costing amount',
    aliases: ['estimated cost', 'estimated_cost', 'budget', 'cost', 'estimated costing', 'total budget'],
  },
  {
    id: 'project_notes',
    label: 'Project Scope / Notes',
    category: 'Project',
    description: 'Charter scope, objectives, or executive summary',
    aliases: ['project notes', 'project_notes', 'charter scope', 'scope', 'objectives', 'notes', 'project description', 'summary'],
  },

  // Phase & Milestone
  {
    id: 'phase_name',
    label: 'Phase / APQP Gate Stage',
    category: 'Phase & Milestone',
    description: 'Phase 1 to Phase 5 or custom lifecycle stage',
    aliases: ['phase', 'phase name', 'phase_name', 'stage', 'apqp stage', 'gate phase', 'gate stage', 'gate'],
  },
  {
    id: 'phase_description',
    label: 'Phase Scope & Objectives',
    category: 'Phase & Milestone',
    description: 'Detailed description of the phase work breakdown',
    aliases: ['phase description', 'phase_description', 'phase scope', 'stage description', 'phase objectives'],
  },
  {
    id: 'milestone_name',
    label: 'Milestone / Gate Name',
    category: 'Phase & Milestone',
    description: 'Key gate milestone or delivery checkpoint',
    aliases: ['milestone', 'milestone name', 'milestone_name', 'gate name', 'gate milestone', 'checkpoint', 'key milestone'],
  },

  // Task Level
  {
    id: 'task_name',
    label: 'Task Name / Subject',
    category: 'Task',
    required: true,
    description: 'Name of the work package or individual engineering task',
    aliases: ['task name', 'task_name', 'task', 'task title', 'subject', 'activity', 'activity name', 'work package', 'task subject', 'wbs item', 'action item'],
  },
  {
    id: 'task_description',
    label: 'Task Description / Specification',
    category: 'Task',
    description: 'Technical task details, instructions, or acceptance criteria',
    aliases: ['task description', 'task_description', 'description', 'task details', 'details', 'work instructions', 'task spec'],
  },
  {
    id: 'assigned_to',
    label: 'Assigned To / Assignee',
    category: 'Task',
    description: 'Engineer email, username, or display name assigned to this task',
    aliases: ['assigned to', 'assigned_to', 'assignee', 'owner', 'assigned user', 'assigned engineer', 'resource', 'resource name', 'developer', 'engineer'],
  },
  {
    id: 'task_start_date',
    label: 'Task Start Date',
    category: 'Task',
    description: 'Planned or expected task start date (YYYY-MM-DD)',
    aliases: ['start date', 'start_date', 'task start date', 'task_start_date', 'start', 'planned start', 'exp start date', 'task start', 'begin date'],
  },
  {
    id: 'task_end_date',
    label: 'Task End Date / Due Date',
    category: 'Task',
    description: 'Planned or expected task end date (YYYY-MM-DD)',
    aliases: ['end date', 'end_date', 'due date', 'due_date', 'task end date', 'task_end_date', 'end', 'planned end', 'exp end date', 'task end', 'finish date', 'target completion'],
  },
  {
    id: 'task_status',
    label: 'Task Status',
    category: 'Task',
    description: 'Open, Working, Pending Review, Completed, Cancelled',
    aliases: ['status', 'task status', 'task_status', 'state', 'progress status', 'task state'],
  },
  {
    id: 'task_priority',
    label: 'Task Priority',
    category: 'Task',
    description: 'Low, Medium, High, or Urgent',
    aliases: ['priority', 'task priority', 'task_priority', 'severity', 'urgency'],
  },
  {
    id: 'deliverable_name',
    label: 'Deliverable Name',
    category: 'Task',
    description: 'Tangible deliverable or work product produced by this task',
    aliases: ['deliverable', 'deliverable name', 'deliverable_name', 'work product', 'output', 'artifact', 'deliverable item'],
  },
  {
    id: 'expected_hours',
    label: 'Expected Hours / Effort',
    category: 'Task',
    description: 'Estimated work hours or duration',
    aliases: ['expected hours', 'expected_hours', 'hours', 'effort', 'duration', 'expected time', 'work hours', 'man hours'],
  },
  {
    id: 'progress',
    label: 'Progress Percentage (%)',
    category: 'Task',
    description: '0 to 100 percent completion',
    aliases: ['progress', 'percent complete', 'percent_complete', '% complete', '% done', 'completion'],
  },
  {
    id: 'depends_on',
    label: 'Dependencies / Predecessors',
    category: 'Task',
    description: 'Predecessor task name or task ID',
    aliases: ['depends on', 'depends_on', 'predecessors', 'predecessor', 'dependencies', 'dependency', 'blocked by'],
  },

  // RASIC Matrix
  {
    id: 'rasic_r',
    label: 'Responsible (R)',
    category: 'RASIC',
    description: 'Person who does the work to achieve the task',
    aliases: ['responsible', 'responsible (r)', 'rasic_r', 'rasic r', 'r'],
  },
  {
    id: 'rasic_a',
    label: 'Accountable (A)',
    category: 'RASIC',
    description: 'Person with ultimate decision-making approval',
    aliases: ['accountable', 'accountable (a)', 'rasic_a', 'rasic a', 'a'],
  },
  {
    id: 'rasic_s',
    label: 'Support (S)',
    category: 'RASIC',
    description: 'Resources supporting task execution',
    aliases: ['support', 'support (s)', 'rasic_s', 'rasic s', 's'],
  },
  {
    id: 'rasic_c',
    label: 'Consulted (C)',
    category: 'RASIC',
    description: 'Two-way communication role providing expert input',
    aliases: ['consulted', 'consulted (c)', 'rasic_c', 'rasic c', 'c'],
  },
  {
    id: 'rasic_i',
    label: 'Informed (I)',
    category: 'RASIC',
    description: 'One-way communication kept updated on progress',
    aliases: ['informed', 'informed (i)', 'rasic_i', 'rasic i', 'i'],
  },

  // Custom & Ignore
  {
    id: 'custom_field_1',
    label: 'Custom Field 1',
    category: 'Other',
    description: 'Mapped to custom project/task attribute',
    aliases: ['custom 1', 'custom_1', 'custom field 1'],
  },
  {
    id: 'custom_field_2',
    label: 'Custom Field 2',
    category: 'Other',
    description: 'Mapped to custom project/task attribute',
    aliases: ['custom 2', 'custom_2', 'custom field 2'],
  },
  {
    id: 'ignore',
    label: 'Ignore / Do Not Import',
    category: 'Other',
    description: 'Explicitly skip this Excel column during import',
    aliases: ['ignore', 'skip', 'unmapped', 'none', 'exclude'],
  },
];

const TEMPLATES_STORAGE_KEY = 'pdm_import_mapping_templates';

export const BUILT_IN_MAPPING_TEMPLATES: MappingTemplate[] = [
  {
    id: 'inteva-standard-template',
    name: 'Inteva Standard Project Import',
    description: 'Standard automotive program schedule mapping with phases, milestones, tasks, deliverables, and RASIC matrix.',
    isBuiltIn: true,
    createdAt: '2026-01-01',
    mappings: {
      'Project ID': 'project_id',
      'Project Name': 'project_name',
      'Project Manager': 'project_manager',
      'Category': 'project_category',
      'Project Category': 'project_category',
      'Product Group': 'product_group',
      'Department': 'department',
      'Project Status': 'project_status',
      'Project Start Date': 'project_start_date',
      'Project End Date': 'project_end_date',
      'Project Description': 'project_notes',
      'Phase': 'phase_name',
      'Phase Name': 'phase_name',
      'Milestone': 'milestone_name',
      'Milestone Name': 'milestone_name',
      'Task Name': 'task_name',
      'Task Description': 'task_description',
      'Assigned To': 'assigned_to',
      'Start Date': 'task_start_date',
      'Task Start Date': 'task_start_date',
      'End Date': 'task_end_date',
      'Task End Date': 'task_end_date',
      'Status': 'task_status',
      'Task Status': 'task_status',
      'Priority': 'task_priority',
      'Task Priority': 'task_priority',
      'Deliverable': 'deliverable_name',
      'Deliverable Name': 'deliverable_name',
      'Expected Hours': 'expected_hours',
      'Responsible (R)': 'rasic_r',
      'Accountable (A)': 'rasic_a',
      'Support (S)': 'rasic_s',
      'Consulted (C)': 'rasic_c',
      'Informed (I)': 'rasic_i',
      'Customer': 'custom_field_1',
      'Project Sponsor': 'custom_field_2',
    },
  },
  {
    id: 'pdm-standard-template',
    name: 'PDM Multi-Project Master Template',
    description: 'Complete ERPNext-aligned multi-project template mapping all standard project and task properties.',
    isBuiltIn: true,
    createdAt: '2026-01-01',
    mappings: {
      'Project Code': 'project_id',
      'Project Title': 'project_name',
      'Manager': 'project_manager',
      'Classification': 'project_category',
      'APQP Stage': 'phase_name',
      'Checkpoint': 'milestone_name',
      'Activity': 'task_name',
      'Description': 'task_description',
      'Assignee': 'assigned_to',
      'Planned Start': 'task_start_date',
      'Planned End': 'task_end_date',
      'State': 'task_status',
      'Severity': 'task_priority',
      'Output Artifact': 'deliverable_name',
    },
  },
  {
    id: 'simple-task-list-template',
    name: 'Quick Task & Activity List',
    description: 'Lightweight format mapping Project Name, Phase, Task, Assignee, and Dates.',
    isBuiltIn: true,
    createdAt: '2026-01-01',
    mappings: {
      'Project': 'project_name',
      'Phase': 'phase_name',
      'Task': 'task_name',
      'Assigned': 'assigned_to',
      'Start': 'task_start_date',
      'End': 'task_end_date',
      'Status': 'task_status',
    },
  },
];

/**
 * Clean & Format standard date string (YYYY-MM-DD)
 */
export function normalizeDate(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel numeric date serial offset
    const parsed = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'N/A' || trimmed === '-' || trimmed === 'null') return undefined;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (slashMatch) {
      let p1 = parseInt(slashMatch[1], 10);
      let p2 = parseInt(slashMatch[2], 10);
      const year = slashMatch[3];
      // If p1 > 12, assume DD/MM/YYYY
      if (p1 > 12) {
        return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
      // Otherwise default to MM/DD/YYYY standard
      return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }

    // Attempt standard JS Date parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  return undefined;
}

/**
 * Map status string to PDM standard TaskStatus
 */
export function normalizeTaskStatus(val: any): TaskStatus {
  if (!val) return 'Open';
  const str = String(val).trim().toLowerCase();
  if (str.includes('prog') || str.includes('work') || str.includes('act')) return 'Working';
  if (str.includes('sub') || str.includes('rev') || str.includes('pend')) return 'Pending Review';
  if (str.includes('comp') || str.includes('done') || str.includes('fin') || str.includes('clos')) return 'Completed';
  if (str.includes('canc') || str.includes('abort') || str.includes('drop')) return 'Cancelled';
  if (str.includes('skip')) return 'Skipped';
  return 'Open';
}

/**
 * Map priority string to PDM standard TaskPriority
 */
export function normalizeTaskPriority(val: any): TaskPriority {
  if (!val) return 'Medium';
  const str = String(val).trim().toLowerCase();
  if (str.includes('urg') || str.includes('crit') || str.includes('p1')) return 'Urgent';
  if (str.includes('high') || str.includes('p2')) return 'High';
  if (str.includes('low') || str.includes('p4')) return 'Low';
  return 'Medium';
}

/**
 * Normalize and validate project category against ERPNext / PDM supported options
 */
export function normalizeProjectCategory(val: any): { normalized?: string; isValid: boolean } {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return { normalized: undefined, isValid: true };
  }
  const clean = val.trim();
  const lower = clean.toLowerCase();

  for (const cat of PROJECT_CATEGORIES) {
    if (cat.toLowerCase() === lower) return { normalized: cat, isValid: true };
  }

  // Common aliases
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
 * Normalize and validate product group against ERPNext / PDM supported options
 */
export function normalizeProductGroup(val: any): { normalized?: string; isValid: boolean } {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return { normalized: undefined, isValid: true };
  }
  const clean = val.trim();
  const lower = clean.toLowerCase();

  for (const pg of PRODUCT_GROUPS) {
    if (pg.toLowerCase() === lower) return { normalized: pg, isValid: true };
  }

  // Aliases
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
 * Normalize and validate project status against ERPNext / PDM supported options
 */
export function normalizeProjectStatus(val: any): { normalized?: string; isValid: boolean } {
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

  return { normalized: undefined, isValid: false };
}

export const excelImportService = {
  /**
   * Parse uploaded binary file into SheetJS Workbook object
   */
  async readWorkbook(file: File): Promise<XLSX.WorkBook> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The uploaded file does not contain any readable sheets.');
    }
    return workbook;
  },

  /**
   * Extract raw headers and data rows from a specific worksheet
   */
  extractSheetData(
    workbook: XLSX.WorkBook,
    sheetName: string
  ): { headers: string[]; rows: Record<string, any>[] } {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" was not found in the workbook.`);
    }

    // Convert to 2D array to accurately inspect headers
    const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (!rawMatrix || rawMatrix.length === 0) {
      return { headers: [], rows: [] };
    }

    // Find first row with non-empty strings as headers
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawMatrix.length, 10); i++) {
      const row = rawMatrix[i];
      if (Array.isArray(row) && row.some((cell) => cell !== '' && cell !== null && cell !== undefined)) {
        headerRowIdx = i;
        break;
      }
    }

    const rawHeaderRow = rawMatrix[headerRowIdx] || [];
    const headers: string[] = rawHeaderRow.map((h: any, idx: number) => {
      const trimmed = String(h || '').trim();
      return trimmed || `Column_${idx + 1}`;
    });

    const rows: Record<string, any>[] = [];
    for (let i = headerRowIdx + 1; i < rawMatrix.length; i++) {
      const rowArr = rawMatrix[i];
      if (!Array.isArray(rowArr) || rowArr.every((c) => c === '' || c === null || c === undefined)) {
        continue;
      }
      const rowObj: Record<string, any> = {};
      headers.forEach((hdr, colIdx) => {
        rowObj[hdr] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
      });
      rows.push(rowObj);
    }

    return { headers, rows };
  },

  /**
   * Suggest automatic column mappings based on aliases and header name similarity
   */
  suggestColumnMappings(
    headers: string[],
    rows: Record<string, any>[] = []
  ): ColumnMappingItem[] {
    const assignedFields = new Set<PDMFieldId>();
    const mappedDefinitions = new Map<string, PDMFieldDefinition>();

    // Pass 1: Exact alias matches for all headers first
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
      for (const def of PDM_FIELD_DEFINITIONS) {
        if (def.id === 'ignore' || assignedFields.has(def.id)) continue;
        if (def.aliases.some((alias) => alias.toLowerCase() === normalizedHeader)) {
          mappedDefinitions.set(header, def);
          assignedFields.add(def.id);
          break;
        }
      }
    }

    // Pass 2: Fuzzy / substring matches for remaining unmapped headers
    for (const header of headers) {
      if (mappedDefinitions.has(header)) continue;
      const normalizedHeader = header.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
      const isIdCol = normalizedHeader.endsWith(' id') || normalizedHeader.endsWith(' code') || normalizedHeader.endsWith(' no') || normalizedHeader.endsWith(' number');
      const isTaskCol = normalizedHeader.startsWith('task ');
      const isGateCol = normalizedHeader.startsWith('gate ');

      for (const def of PDM_FIELD_DEFINITIONS) {
        if (def.id === 'ignore' || assignedFields.has(def.id)) continue;

        // Safeguards: Don't let ID columns steal name, description, status, priority, or type fields
        if (isIdCol && (def.id.includes('name') || def.id.includes('status') || def.id.includes('description') || def.id.includes('type') || def.id.includes('priority'))) {
          continue;
        }
        // Task Type should not map to project_type
        if (isTaskCol && def.id === 'project_type') {
          continue;
        }
        // Gate Status should not map to task_status
        if (isGateCol && def.id === 'task_status') {
          continue;
        }

        if (
          def.aliases.some(
            (alias) =>
              normalizedHeader.includes(alias.toLowerCase()) ||
              alias.toLowerCase().includes(normalizedHeader)
          )
        ) {
          mappedDefinitions.set(header, def);
          assignedFields.add(def.id);
          break;
        }
      }
    }

    return headers.map((header) => {
      const matchedDef = mappedDefinitions.get(header);

      // Collect up to 3 non-empty sample values from data rows
      const sampleValues: string[] = [];
      for (const r of rows) {
        const val = r[header];
        if (val !== '' && val !== null && val !== undefined) {
          const str = String(val).trim();
          if (str && !sampleValues.includes(str)) {
            sampleValues.push(str);
            if (sampleValues.length >= 3) break;
          }
        }
      }

      return {
        excelColumn: header,
        pdmField: matchedDef ? matchedDef.id : 'ignore',
        mappingType: matchedDef ? 'auto' : 'unmapped',
        sampleValues,
      };
    });
  },

  /**
   * Load all saved and built-in mapping templates
   */
  getMappingTemplates(): MappingTemplate[] {
    const builtIn = [...BUILT_IN_MAPPING_TEMPLATES];
    if (typeof window === 'undefined') return builtIn;

    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed: MappingTemplate[] = JSON.parse(stored);
        return [...builtIn, ...parsed];
      }
    } catch (e) {
      console.warn('[Excel Import Service] Failed to load custom mapping templates:', e);
    }
    return builtIn;
  },

  /**
   * Save a user-defined mapping template
   */
  saveMappingTemplate(name: string, mappings: Record<string, PDMFieldId>, description?: string): MappingTemplate {
    const newTemplate: MappingTemplate = {
      id: `tmpl-${Date.now().toString(36)}`,
      name: name.trim(),
      description: description?.trim() || `User mapping template for ${name}`,
      isBuiltIn: false,
      mappings,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
        const list: MappingTemplate[] = stored ? JSON.parse(stored) : [];
        const existingIdx = list.findIndex((t) => t.name.toLowerCase() === name.toLowerCase().trim());
        if (existingIdx >= 0) {
          list[existingIdx] = newTemplate;
        } else {
          list.push(newTemplate);
        }
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('[Excel Import Service] Failed to save mapping template:', e);
      }
    }

    return newTemplate;
  },

  /**
   * Delete a custom mapping template
   */
  deleteMappingTemplate(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const list: MappingTemplate[] = JSON.parse(stored);
        const filtered = list.filter((t) => t.id !== id && !t.isBuiltIn);
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('[Excel Import Service] Failed to delete mapping template:', e);
    }
  },

  /**
   * Resolve user against PDM standard users and available user directory
   */
  resolveUser(
    userStr: string | null | undefined,
    availableEmployees: { name: string; email: string; full_name?: string }[] = []
  ): { email?: string; fullName?: string; foundInDirectory: boolean } {
    if (!userStr || typeof userStr !== 'string') {
      return { foundInDirectory: false };
    }
    const clean = userStr.trim();
    if (!clean || clean === 'Unassigned' || clean === 'None' || clean === 'N/A') {
      return { foundInDirectory: true, fullName: 'Unassigned' };
    }

    const lower = clean.toLowerCase();

    // 1. Match against STANDARD_PDM_USERS
    for (const u of Object.values(STANDARD_PDM_USERS)) {
      if (
        lower === u.email.toLowerCase() ||
        lower === u.username.toLowerCase() ||
        lower === u.fullName.toLowerCase() ||
        (u.email.includes('@') && lower === u.email.split('@')[0].toLowerCase()) ||
        lower.includes(u.fullName.toLowerCase())
      ) {
        return { email: u.email, fullName: u.fullName, foundInDirectory: true };
      }
    }

    // 2. Match against dynamic available employees
    for (const emp of availableEmployees) {
      const empEmail = (emp.email || '').toLowerCase();
      const empName = (emp.full_name || emp.name || '').toLowerCase();
      if (
        lower === empEmail ||
        lower === empName ||
        (empEmail.includes('@') && lower === empEmail.split('@')[0]) ||
        lower.includes(empName)
      ) {
        return { email: emp.email, fullName: emp.full_name || emp.name, foundInDirectory: true };
      }
    }

    // If it looks like a valid email, allow resolution
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return { email: clean, fullName: clean.split('@')[0], foundInDirectory: true };
    }

    return { foundInDirectory: false, fullName: clean };
  },

  /**
   * Group Excel rows by Project Identifier, organize into Phases, and execute thorough pre-creation validation
   */
  groupAndValidate(
    rows: Record<string, any>[],
    mappings: Record<string, PDMFieldId>,
    existingProjects: { name: string; project_name: string }[] = [],
    availableEmployees: { name: string; email: string; full_name?: string }[] = []
  ): {
    projects: ParsedProjectItem[];
    summary: ImportValidationSummary;
  } {
    // Invert mapping for quick lookup: PDMFieldId -> Excel Column Header(s)
    const fieldToColumn: Partial<Record<PDMFieldId, string>> = {};
    for (const [col, field] of Object.entries(mappings)) {
      if (field !== 'ignore') {
        fieldToColumn[field] = col;
      }
    }

    const existingProjectMap = new Map<string, any>();
    for (const p of existingProjects) {
      if (p.name) existingProjectMap.set(p.name.toLowerCase().trim(), p);
      if (p.project_name) existingProjectMap.set(p.project_name.toLowerCase().trim(), p);
    }

    const projectsGrouped = new Map<string, {
      projectIdentifier: string;
      projectName: string;
      projectManager?: string;
      projectCategory?: string;
      rawCategory?: string;
      productGroup?: string;
      rawProductGroup?: string;
      department?: string;
      company?: string;
      projectType?: string;
      priority?: string;
      status?: string;
      rawStatus?: string;
      startDate?: string;
      rawStartDate?: string;
      endDate?: string;
      rawEndDate?: string;
      estimatedCost?: number;
      notes?: string;
      rows: { rowIndex: number; data: Record<string, any> }[];
    }>();

    // 1. Group rows into projects
    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-indexed including header row

      const idCol = fieldToColumn['project_id'];
      const nameCol = fieldToColumn['project_name'];

      let projId = idCol && row[idCol] ? String(row[idCol]).trim() : '';
      let projName = nameCol && row[nameCol] ? String(row[nameCol]).trim() : '';

      // Fallback: If project ID column is not mapped or empty, use project name
      if (!projId && projName) {
        projId = projName;
      }
      // If neither is present, use a fallback single-project bucket
      if (!projId && !projName) {
        projId = `Project_1`;
        projName = `Project 1`;
      }
      if (!projName && projId) {
        projName = projId;
      }

      const groupKey = projId.toLowerCase();

      if (!projectsGrouped.has(groupKey)) {
        const pmCol = fieldToColumn['project_manager'];
        const catCol = fieldToColumn['project_category'];
        const prodCol = fieldToColumn['product_group'];
        const deptCol = fieldToColumn['department'];
        const compCol = fieldToColumn['company'];
        const typeCol = fieldToColumn['project_type'];
        const prioCol = fieldToColumn['project_priority'];
        const statCol = fieldToColumn['project_status'];
        const startCol = fieldToColumn['project_start_date'];
        const endCol = fieldToColumn['project_end_date'];
        const costCol = fieldToColumn['estimated_cost'];
        const notesCol = fieldToColumn['project_notes'];

        const parsedCost = costCol && row[costCol] ? parseFloat(String(row[costCol]).replace(/[^0-9.-]/g, '')) : undefined;

        projectsGrouped.set(groupKey, {
          projectIdentifier: projId,
          projectName: projName,
          projectManager: pmCol && row[pmCol] ? String(row[pmCol]).trim() : undefined,
          rawCategory: catCol && row[catCol] ? String(row[catCol]).trim() : undefined,
          rawProductGroup: prodCol && row[prodCol] ? String(row[prodCol]).trim() : undefined,
          department: deptCol && row[deptCol] ? String(row[deptCol]).trim() : undefined,
          company: compCol && row[compCol] ? String(row[compCol]).trim() : 'Netlink',
          projectType: typeCol && row[typeCol] ? String(row[typeCol]).trim() : 'Internal',
          priority: prioCol && row[prioCol] ? String(row[prioCol]).trim() : 'Medium',
          rawStatus: statCol && row[statCol] ? String(row[statCol]).trim() : undefined,
          rawStartDate: startCol && row[startCol] !== '' && row[startCol] !== null && row[startCol] !== undefined ? String(row[startCol]).trim() : undefined,
          rawEndDate: endCol && row[endCol] !== '' && row[endCol] !== null && row[endCol] !== undefined ? String(row[endCol]).trim() : undefined,
          estimatedCost: !isNaN(Number(parsedCost)) ? parsedCost : undefined,
          notes: notesCol && row[notesCol] ? String(row[notesCol]).trim() : undefined,
          rows: [],
        });
      }

      projectsGrouped.get(groupKey)!.rows.push({ rowIndex: rowNum, data: row });
    });

    const parsedProjects: ParsedProjectItem[] = [];
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    let totalTasksCount = 0;
    let totalPhasesCount = 0;
    let totalMilestonesCount = 0;
    let totalDeliverablesCount = 0;
    let duplicateProjectsCount = 0;

    // 2. Validate and structure each project
    projectsGrouped.forEach((group) => {
      const projectErrors: ValidationError[] = [];
      const projectWarnings: ValidationWarning[] = [];
      const teamMembers = new Set<string>();

      // Check if project exists in ERPNext / local store
      const isExisting =
        existingProjectMap.has(group.projectIdentifier.toLowerCase()) ||
        existingProjectMap.has(group.projectName.toLowerCase());

      const existingData = isExisting
        ? existingProjectMap.get(group.projectIdentifier.toLowerCase()) ||
          existingProjectMap.get(group.projectName.toLowerCase())
        : undefined;

      if (isExisting) {
        duplicateProjectsCount++;
        projectWarnings.push({
          projectIdentifier: group.projectIdentifier,
          projectName: group.projectName,
          rowNumber: group.rows[0]?.rowIndex || 1,
          field: 'project_id',
          message: `Project "${group.projectIdentifier}" already exists in the system.`,
          severity: 'warning',
        });
      }

      // Validate Project Manager
      let pmResolved: { email?: string; fullName?: string; foundInDirectory: boolean } | undefined;
      if (group.projectManager) {
        pmResolved = excelImportService.resolveUser(group.projectManager, availableEmployees);
        if (!pmResolved.foundInDirectory) {
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: group.rows[0]?.rowIndex || 1,
            field: 'project_manager',
            reason: `Project Manager "${group.projectManager}" is not found in PDM user directory.`,
            severity: 'error',
          });
        } else if (pmResolved.email) {
          teamMembers.add(pmResolved.email);
        }
      }

      // Validate and normalize Project Category
      let finalCategory: string | undefined = undefined;
      if (group.rawCategory) {
        const catCheck = normalizeProjectCategory(group.rawCategory);
        if (!catCheck.isValid) {
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: group.rows[0]?.rowIndex || 1,
            field: 'project_category',
            reason: `project_category value "${group.rawCategory}" is not a valid enum`,
            severity: 'error',
          });
        } else {
          finalCategory = catCheck.normalized;
        }
      }

      // Validate and normalize Product Group
      let finalProductGroup: string | undefined = undefined;
      if (group.rawProductGroup) {
        const pgCheck = normalizeProductGroup(group.rawProductGroup);
        if (!pgCheck.isValid) {
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: group.rows[0]?.rowIndex || 1,
            field: 'product_group',
            reason: `product_group value "${group.rawProductGroup}" is not a valid enum`,
            severity: 'error',
          });
        } else {
          finalProductGroup = pgCheck.normalized;
        }
      }

      // Validate and normalize Project Status
      let finalStatus: string = 'Open';
      if (group.rawStatus) {
        const statusCheck = normalizeProjectStatus(group.rawStatus);
        if (!statusCheck.isValid) {
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: group.rows[0]?.rowIndex || 1,
            field: 'project_status',
            reason: `status value "${group.rawStatus}" is not a valid enum`,
            severity: 'error',
          });
        } else {
          finalStatus = statusCheck.normalized || 'Open';
        }
      }

      // Validate Project Start/End Date
      let finalStartDate = group.rawStartDate ? normalizeDate(group.rawStartDate) : undefined;
      let finalEndDate = group.rawEndDate ? normalizeDate(group.rawEndDate) : undefined;

      if (group.rawStartDate && !finalStartDate) {
        projectErrors.push({
          projectIdentifier: group.projectIdentifier,
          projectName: group.projectName,
          rowNumber: group.rows[0]?.rowIndex || 1,
          field: 'project_start_date',
          reason: `Invalid Project Start Date format: "${group.rawStartDate}". Expected YYYY-MM-DD or DD/MM/YYYY.`,
          severity: 'error',
        });
      }

      if (group.rawEndDate && !finalEndDate) {
        projectErrors.push({
          projectIdentifier: group.projectIdentifier,
          projectName: group.projectName,
          rowNumber: group.rows[0]?.rowIndex || 1,
          field: 'project_end_date',
          reason: `Invalid Project End Date format: "${group.rawEndDate}". Expected YYYY-MM-DD or DD/MM/YYYY.`,
          severity: 'error',
        });
      }

      if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
        projectErrors.push({
          projectIdentifier: group.projectIdentifier,
          projectName: group.projectName,
          rowNumber: group.rows[0]?.rowIndex || 1,
          field: 'project_dates',
          reason: `Project End Date (${finalEndDate}) cannot be earlier than Project Start Date (${finalStartDate}).`,
          severity: 'error',
        });
      }

      // Organize tasks into phases
      const phasesMap = new Map<string, ParsedPhaseItem>();
      const allTasks: ParsedTaskItem[] = [];
      let projDeliverables = 0;

      group.rows.forEach(({ rowIndex, data }) => {
        const taskNameCol = fieldToColumn['task_name'];
        const taskDescCol = fieldToColumn['task_description'];
        const phaseCol = fieldToColumn['phase_name'];
        const phaseDescCol = fieldToColumn['phase_description'];
        const milestoneCol = fieldToColumn['milestone_name'];
        const assignCol = fieldToColumn['assigned_to'];
        const startCol = fieldToColumn['task_start_date'];
        const endCol = fieldToColumn['task_end_date'];
        const statusCol = fieldToColumn['task_status'];
        const prioCol = fieldToColumn['task_priority'];
        const delivCol = fieldToColumn['deliverable_name'];
        const hoursCol = fieldToColumn['expected_hours'];
        const progCol = fieldToColumn['progress'];
        const depCol = fieldToColumn['depends_on'];

        const rCol = fieldToColumn['rasic_r'];
        const aCol = fieldToColumn['rasic_a'];
        const sCol = fieldToColumn['rasic_s'];
        const cCol = fieldToColumn['rasic_c'];
        const iCol = fieldToColumn['rasic_i'];

        const rawTaskName = taskNameCol && data[taskNameCol] ? String(data[taskNameCol]).trim() : '';

        // Requirement 11: Support projects without phases/tasks
        if (!rawTaskName) {
          return;
        }

        const taskErrors: string[] = [];
        const taskWarnings: string[] = [];

        // Validate Task Assignee
        const rawAssigned = assignCol && data[assignCol] ? String(data[assignCol]).trim() : undefined;
        let assignedResolved: { email?: string; fullName?: string; foundInDirectory: boolean } | undefined;
        if (rawAssigned) {
          assignedResolved = excelImportService.resolveUser(rawAssigned, availableEmployees);
          if (!assignedResolved.foundInDirectory) {
            const errReason = `Assigned User "${rawAssigned}" was not found in PDM user directory.`;
            taskErrors.push(errReason);
            projectErrors.push({
              projectIdentifier: group.projectIdentifier,
              projectName: group.projectName,
              rowNumber: rowIndex,
              field: 'assigned_to',
              reason: errReason,
              severity: 'error',
            });
          } else if (assignedResolved.email) {
            teamMembers.add(assignedResolved.email);
          }
        }

        // Validate Task Start & End Date
        const rawStart = startCol ? data[startCol] : undefined;
        const rawEnd = endCol ? data[endCol] : undefined;

        const parsedStart = normalizeDate(rawStart);
        const parsedEnd = normalizeDate(rawEnd);

        if (rawStart && !parsedStart) {
          const errReason = `Invalid Task Start Date format: "${rawStart}". Expected YYYY-MM-DD or DD/MM/YYYY.`;
          taskErrors.push(errReason);
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: rowIndex,
            field: 'task_start_date',
            reason: errReason,
            severity: 'error',
          });
        }

        if (rawEnd && !parsedEnd) {
          const errReason = `Invalid Task End Date format: "${rawEnd}". Expected YYYY-MM-DD or DD/MM/YYYY.`;
          taskErrors.push(errReason);
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: rowIndex,
            field: 'task_end_date',
            reason: errReason,
            severity: 'error',
          });
        }

        if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
          const errReason = `Task End Date (${parsedEnd}) cannot be before Task Start Date (${parsedStart}).`;
          taskErrors.push(errReason);
          projectErrors.push({
            projectIdentifier: group.projectIdentifier,
            projectName: group.projectName,
            rowNumber: rowIndex,
            field: 'task_dates',
            reason: errReason,
            severity: 'error',
          });
        }

        // Validate Task Status
        const rawStatus = statusCol && data[statusCol] ? String(data[statusCol]).trim() : '';
        const normStatus = normalizeTaskStatus(rawStatus);

        // Validate Task Priority
        const rawPriority = prioCol && data[prioCol] ? String(data[prioCol]).trim() : '';
        const normPriority = normalizeTaskPriority(rawPriority);

        // Parse Deliverable
        const rawDeliv = delivCol && data[delivCol] ? String(data[delivCol]).trim() : undefined;
        if (rawDeliv) {
          projDeliverables++;
        }

        // Parse Phase & Milestone
        const rawPhase = phaseCol && data[phaseCol] ? String(data[phaseCol]).trim() : undefined;
        const rawPhaseDesc = phaseDescCol && data[phaseDescCol] ? String(data[phaseDescCol]).trim() : undefined;
        const rawMilestone = milestoneCol && data[milestoneCol] ? String(data[milestoneCol]).trim() : undefined;

        const effectivePhaseName = rawPhase ? formatPhaseName(rawPhase) : inferTaskPhase({ subject: rawTaskName, description: taskDescCol ? data[taskDescCol] : '' });

        // Parse Hours & Progress
        const rawHours = hoursCol && data[hoursCol] ? parseFloat(String(data[hoursCol])) : undefined;
        const rawProgress = progCol && data[progCol] ? parseFloat(String(data[progCol])) : undefined;

        // Parse RASIC
        const rasicObj = {
          responsible: rCol && data[rCol] ? String(data[rCol]).trim() : undefined,
          accountable: aCol && data[aCol] ? String(data[aCol]).trim() : undefined,
          support: sCol && data[sCol] ? String(data[sCol]).trim() : undefined,
          consulted: cCol && data[cCol] ? String(data[cCol]).trim() : undefined,
          informed: iCol && data[iCol] ? String(data[iCol]).trim() : undefined,
        };

        const taskItem: ParsedTaskItem = {
          rowIndex,
          taskName: rawTaskName,
          taskDescription: taskDescCol && data[taskDescCol] ? String(data[taskDescCol]).trim() : undefined,
          phaseName: effectivePhaseName,
          milestoneName: rawMilestone,
          assignedTo: rawAssigned,
          assignedToResolved: assignedResolved,
          startDate: parsedStart,
          endDate: parsedEnd,
          status: normStatus,
          priority: normPriority,
          deliverableName: rawDeliv,
          expectedHours: !isNaN(Number(rawHours)) ? rawHours : undefined,
          progress: !isNaN(Number(rawProgress)) ? rawProgress : normStatus === 'Completed' ? 100 : 0,
          dependsOn: depCol && data[depCol] ? String(data[depCol]).trim() : undefined,
          rasic: rasicObj,
          errors: taskErrors,
          warnings: taskWarnings,
        };

        allTasks.push(taskItem);

        // Put in phase bucket
        if (!phasesMap.has(effectivePhaseName)) {
          phasesMap.set(effectivePhaseName, {
            name: effectivePhaseName,
            description: rawPhaseDesc,
            milestone: rawMilestone,
            tasks: [],
          });
        }
        phasesMap.get(effectivePhaseName)!.tasks.push(taskItem);
      });

      // Compute project roll-up dates if not explicitly provided at project level
      let derivedProjStart = finalStartDate;
      let derivedProjEnd = finalEndDate;

      if (!derivedProjStart) {
        const startDates = allTasks.map((t) => t.startDate).filter(Boolean) as string[];
        if (startDates.length > 0) {
          derivedProjStart = startDates.sort()[0];
        }
      }
      if (!derivedProjEnd) {
        const endDates = allTasks.map((t) => t.endDate).filter(Boolean) as string[];
        if (endDates.length > 0) {
          derivedProjEnd = endDates.sort().reverse()[0];
        }
      }

      const phasesList = Array.from(phasesMap.values());
      const milestonesCount = phasesList.filter((p) => Boolean(p.milestone)).length;

      totalTasksCount += allTasks.length;
      totalPhasesCount += phasesList.length;
      totalMilestonesCount += milestonesCount;
      totalDeliverablesCount += projDeliverables;

      const isValid = projectErrors.length === 0;

      const parsedProject: ParsedProjectItem = {
        projectIdentifier: group.projectIdentifier,
        projectName: group.projectName,
        projectManager: group.projectManager,
        projectManagerResolved: pmResolved,
        projectCategory: finalCategory,
        productGroup: finalProductGroup,
        department: group.department,
        company: group.company || 'Netlink',
        projectType: group.projectType || 'Internal',
        priority: group.priority || 'Medium',
        status: finalStatus,
        startDate: derivedProjStart,
        endDate: derivedProjEnd,
        estimatedCost: group.estimatedCost,
        notes: group.notes,
        phases: phasesList,
        allTasks,
        deliverablesCount: projDeliverables,
        teamMembers,
        rowIndices: group.rows.map((r) => r.rowIndex),
        isExistingInSystem: isExisting,
        existingProjectData: existingData,
        errors: projectErrors,
        warnings: projectWarnings,
        isValid,
      };

      parsedProjects.push(parsedProject);
      allErrors.push(...projectErrors);
      allWarnings.push(...projectWarnings);
    });

    const validProjectsCount = parsedProjects.filter((p) => p.isValid).length;
    const invalidProjectsCount = parsedProjects.filter((p) => !p.isValid).length;

    let overallStatus: ImportValidationSummary['status'] = 'READY_TO_IMPORT';
    if (allErrors.length > 0) {
      overallStatus = 'IMPORT_BLOCKED';
    } else if (allWarnings.length > 0) {
      overallStatus = 'READY_WITH_WARNINGS';
    }

    const summary: ImportValidationSummary = {
      totalRowsProcessed: rows.length,
      projectsDetected: parsedProjects.length,
      validProjectsCount,
      invalidProjectsCount,
      totalErrors: allErrors.length,
      totalWarnings: allWarnings.length,
      totalPhases: totalPhasesCount,
      totalMilestones: totalMilestonesCount,
      totalTasks: totalTasksCount,
      totalDeliverables: totalDeliverablesCount,
      duplicateProjectsCount,
      status: overallStatus,
      errors: allErrors,
      warnings: allWarnings,
    };

    return {
      projects: parsedProjects,
      summary,
    };
  },

  /**
   * Generate downloadable standard multi-project sample Excel spreadsheet
   */
  generateSampleTemplate(): void {
    const templateData = [
      // Project A: Thermal Management System
      {
        'Project ID': 'PROJ-THM-2026',
        'Project Name': 'EV Battery Thermal Heat Pump Subsystem',
        'Project Manager': 'Sarah Jenkins',
        'Category': 'Battery Systems',
        'Product Group': 'Thermal Management',
        'Department': 'Powertrain',
        'Phase': 'Phase 1: Concept & Planning',
        'Milestone': 'Gate 1: Concept Charter Sign-off',
        'Task Name': 'Benchmark Dual-Loop Heat Pump Thermodynamic Architecture',
        'Task Description': 'Perform initial 1D simulation of refrigerant loop across -30C to +45C ambient conditions.',
        'Assigned To': 'Yash',
        'Start Date': '2026-09-01',
        'End Date': '2026-09-12',
        'Status': 'Completed',
        'Priority': 'High',
        'Deliverable': '1D Cycle Efficiency Model Report',
        'Expected Hours': 45,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Sarah Jenkins',
        'Support (S)': 'Quality Lead',
        'Consulted (C)': '',
        'Informed (I)': 'Administrator',
      },
      {
        'Project ID': 'PROJ-THM-2026',
        'Project Name': 'EV Battery Thermal Heat Pump Subsystem',
        'Project Manager': 'Sarah Jenkins',
        'Category': 'Battery Systems',
        'Product Group': 'Thermal Management',
        'Department': 'Powertrain',
        'Phase': 'Phase 2: Product Design & Development',
        'Milestone': 'Gate 2: Architecture & Packaging Freeze',
        'Task Name': 'Design Integrated Electronic Expansion Valve (EXV) Manifold',
        'Task Description': 'Develop 3D CAD parametric model for 8-port coolant distribution block.',
        'Assigned To': 'Yash',
        'Start Date': '2026-09-15',
        'End Date': '2026-09-30',
        'Status': 'Working',
        'Priority': 'Urgent',
        'Deliverable': 'EXV Manifold Step 3D CAD & Drawing Release',
        'Expected Hours': 60,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Sarah Jenkins',
        'Support (S)': 'Robert Sterling',
        'Consulted (C)': 'Quality Lead',
        'Informed (I)': '',
      },
      {
        'Project ID': 'PROJ-THM-2026',
        'Project Name': 'EV Battery Thermal Heat Pump Subsystem',
        'Project Manager': 'Sarah Jenkins',
        'Category': 'Battery Systems',
        'Product Group': 'Thermal Management',
        'Department': 'Powertrain',
        'Phase': 'Phase 3: Process Design & Development',
        'Milestone': 'Gate 3: DFM & Tooling Sign-off',
        'Task Name': 'Execute Die Casting Mold Flow & Tooling Feasibility',
        'Task Description': 'Optimize runner gate geometry to eliminate porosity in high-pressure aluminum casting.',
        'Assigned To': 'Sarah Jenkins',
        'Start Date': '2026-10-01',
        'End Date': '2026-10-18',
        'Status': 'Open',
        'Priority': 'Medium',
        'Deliverable': 'Mold Flow Simulation & Tooling Sign-off',
        'Expected Hours': 40,
        'Responsible (R)': 'Sarah Jenkins',
        'Accountable (A)': 'Reviewer',
        'Support (S)': 'Yash',
        'Consulted (C)': '',
        'Informed (I)': '',
      },

      // Project B: Radar Perception Module
      {
        'Project ID': 'PROJ-RDR-2026',
        'Project Name': '77GHz Autonomous Radar Perception Sensor',
        'Project Manager': 'Sarah Jenkins',
        'Category': 'Active Safety',
        'Product Group': 'ADAS & Sensing',
        'Department': 'Electronics',
        'Phase': 'Phase 1: Concept & Planning',
        'Milestone': 'Gate 1: Sensor Concept Sign-off',
        'Task Name': 'Antenna Array Waveguide RF Simulation',
        'Task Description': 'Perform HFSS full-wave electromagnetic simulation for 120-degree horizontal field of view.',
        'Assigned To': 'Yash',
        'Start Date': '2026-09-05',
        'End Date': '2026-09-20',
        'Status': 'Completed',
        'Priority': 'High',
        'Deliverable': 'RF Radar Pattern Antenna Gain Report',
        'Expected Hours': 50,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Sarah Jenkins',
        'Support (S)': 'Reviewer',
        'Consulted (C)': '',
        'Informed (I)': '',
      },
      {
        'Project ID': 'PROJ-RDR-2026',
        'Project Name': '77GHz Autonomous Radar Perception Sensor',
        'Project Manager': 'Sarah Jenkins',
        'Category': 'Active Safety',
        'Product Group': 'ADAS & Sensing',
        'Department': 'Electronics',
        'Phase': 'Phase 2: Product Design & Development',
        'Milestone': 'Gate 2: Radar PCB Schematic Freeze',
        'Task Name': 'High-Speed MMIC PCB Layout & Signal Integrity',
        'Task Description': '12-layer Rogers high-frequency PCB layout with differential matched impedance traces.',
        'Assigned To': 'Yash',
        'Start Date': '2026-09-22',
        'End Date': '2026-10-10',
        'Status': 'Working',
        'Priority': 'Urgent',
        'Deliverable': 'Gerber Manufacturing Package & BOM Release',
        'Expected Hours': 70,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Sarah Jenkins',
        'Support (S)': '',
        'Consulted (C)': '',
        'Informed (I)': 'Administrator',
      },

      // Project C: Steering Torque Sensor
      {
        'Project ID': 'PROJ-STR-2026',
        'Project Name': 'Steer-By-Wire Dual-Redundant Torque Sensor',
        'Project Manager': 'Administrator',
        'Category': 'Chassis & Suspension',
        'Product Group': 'Steering Systems',
        'Department': 'Mechatronics',
        'Phase': 'Phase 1: Concept & Planning',
        'Milestone': 'Gate 1: ASIL-D Functional Safety Concept',
        'Task Name': 'ISO 26262 ASIL-D HARA & Safety Goal Definition',
        'Task Description': 'Hazard Analysis and Risk Assessment for uncommanded steer assist failure modes.',
        'Assigned To': 'Reviewer',
        'Start Date': '2026-09-10',
        'End Date': '2026-09-25',
        'Status': 'Completed',
        'Priority': 'Urgent',
        'Deliverable': 'ASIL-D Functional Safety Concept Specification',
        'Expected Hours': 45,
        'Responsible (R)': 'Reviewer',
        'Accountable (A)': 'Administrator',
        'Support (S)': 'Sarah Jenkins',
        'Consulted (C)': 'Yash',
        'Informed (I)': '',
      },
      {
        'Project ID': 'PROJ-STR-2026',
        'Project Name': 'Steer-By-Wire Dual-Redundant Torque Sensor',
        'Project Manager': 'Administrator',
        'Category': 'Chassis & Suspension',
        'Product Group': 'Steering Systems',
        'Department': 'Mechatronics',
        'Phase': 'Phase 4: Product & Process Validation',
        'Milestone': 'Gate 4: PPAP Level 3 Validation',
        'Task Name': 'Execute 1 Million Cycle Steering Column Dyno Durability Run',
        'Task Description': 'Continuous oscillatory load profile with cyclic thermal shock -40C to +125C.',
        'Assigned To': 'Yash',
        'Start Date': '2026-10-01',
        'End Date': '2026-10-25',
        'Status': 'Open',
        'Priority': 'High',
        'Deliverable': 'PPAP L3 Environmental Test Report',
        'Expected Hours': 80,
        'Responsible (R)': 'Yash',
        'Accountable (A)': 'Reviewer',
        'Support (S)': 'Robert Sterling',
        'Consulted (C)': '',
        'Informed (I)': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet['!cols'] = [
      { wch: 18 }, // Project ID
      { wch: 42 }, // Project Name
      { wch: 20 }, // Project Manager
      { wch: 22 }, // Category
      { wch: 24 }, // Product Group
      { wch: 16 }, // Department
      { wch: 32 }, // Phase
      { wch: 38 }, // Milestone
      { wch: 48 }, // Task Name
      { wch: 60 }, // Task Description
      { wch: 22 }, // Assigned To
      { wch: 14 }, // Start Date
      { wch: 14 }, // End Date
      { wch: 14 }, // Status
      { wch: 12 }, // Priority
      { wch: 40 }, // Deliverable
      { wch: 16 }, // Expected Hours
      { wch: 18 }, // R
      { wch: 18 }, // A
      { wch: 18 }, // S
      { wch: 18 }, // C
      { wch: 18 }, // I
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Multi-Project Master');

    XLSX.writeFile(workbook, `pdm_multi_project_import_template.xlsx`);
  },

  /**
   * Export validation errors and warnings to a structured CSV file
   */
  exportValidationErrorsCSV(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const rows: string[] = ['"Type","Project ID","Project Name","Row #","Field","Message"'];

    errors.forEach((err) => {
      const escapedProjId = String(err.projectIdentifier || '').replace(/"/g, '""');
      const escapedProjName = String(err.projectName || '').replace(/"/g, '""');
      const escapedField = String(err.field || '').replace(/"/g, '""');
      const escapedReason = String(err.reason || '').replace(/"/g, '""');
      rows.push(`"ERROR","${escapedProjId}","${escapedProjName}","${err.rowNumber}","${escapedField}","${escapedReason}"`);
    });

    warnings.forEach((warn) => {
      const escapedProjId = String(warn.projectIdentifier || '').replace(/"/g, '""');
      const escapedProjName = String(warn.projectName || '').replace(/"/g, '""');
      const escapedField = String(warn.field || '').replace(/"/g, '""');
      const escapedMsg = String(warn.message || '').replace(/"/g, '""');
      rows.push(`"WARNING","${escapedProjId}","${escapedProjName}","${warn.rowNumber}","${escapedField}","${escapedMsg}"`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pdm_import_validation_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export bulk import execution result report as CSV
   */
  exportImportResultCSV(result: BulkImportResult): void {
    const rows: string[] = [
      `"IMPORT AUDIT REPORT - ${result.importId}"`,
      `"File:","${result.fileName}"`,
      `"Uploaded By:","${result.uploadedBy}"`,
      `"Timestamp:","${result.timestamp}"`,
      `"Total Projects:","${result.totalProjects}"`,
      `"Created:","${result.projectsCreated}","Updated:","${result.projectsUpdated}","Skipped:","${result.projectsSkipped}","Failed:","${result.projectsFailed}"`,
      `"Total Phases:","${result.phasesCreated}","Milestones:","${result.milestonesCreated}","Tasks:","${result.tasksCreated}","Deliverables:","${result.deliverablesCreated}"`,
      '',
      '"Project ID","Project Name","Status","Phases Created","Milestones Created","Tasks Created","Deliverables Created","Details"',
    ];

    result.items.forEach((item) => {
      const escId = String(item.projectIdentifier || '').replace(/"/g, '""');
      const escName = String(item.projectName || '').replace(/"/g, '""');
      const escStatus = String(item.status || '').replace(/"/g, '""');
      const escErr = String(item.errorReason || item.createdProjectName || '').replace(/"/g, '""');
      rows.push(`"${escId}","${escName}","${escStatus}","${item.phasesCreated}","${item.milestonesCreated}","${item.tasksCreated}","${item.deliverablesCreated}","${escErr}"`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pdm_bulk_import_report_${result.importId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

export default excelImportService;
