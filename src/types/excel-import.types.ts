import { TaskPriority, TaskStatus } from './task.types';
import { ProjectPriority, ProjectStatus } from './project.types';

export type PDMFieldId =
  // Project-level fields
  | 'project_id'
  | 'project_name'
  | 'project_manager'
  | 'project_category'
  | 'product_group'
  | 'department'
  | 'company'
  | 'project_type'
  | 'project_priority'
  | 'project_status'
  | 'project_start_date'
  | 'project_end_date'
  | 'estimated_cost'
  | 'project_notes'
  // Phase & Milestone fields
  | 'phase_name'
  | 'phase_description'
  | 'milestone_name'
  // Task-level fields
  | 'task_name'
  | 'task_description'
  | 'assigned_to'
  | 'task_start_date'
  | 'task_end_date'
  | 'task_status'
  | 'task_priority'
  | 'deliverable_name'
  | 'expected_hours'
  | 'progress'
  | 'depends_on'
  // RASIC Matrix fields
  | 'rasic_r'
  | 'rasic_a'
  | 'rasic_s'
  | 'rasic_c'
  | 'rasic_i'
  // Custom / Ignored
  | 'custom_field_1'
  | 'custom_field_2'
  | 'ignore';

export interface PDMFieldDefinition {
  id: PDMFieldId;
  label: string;
  category: 'Project' | 'Phase & Milestone' | 'Task' | 'RASIC' | 'Other';
  required?: boolean;
  isProjectIdentifier?: boolean;
  description?: string;
  aliases: string[];
}

export type MappingType = 'auto' | 'manual' | 'unmapped' | 'ignored';

export interface ColumnMappingItem {
  excelColumn: string;
  pdmField: PDMFieldId;
  mappingType: MappingType;
  sampleValues: string[];
}

export interface MappingTemplate {
  id: string;
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  mappings: Record<string, PDMFieldId>;
  createdAt: string;
}

export type DuplicateHandlingMode =
  | 'skip' // Skip duplicate projects, import only new projects
  | 'update' // Update existing projects with new phases/tasks
  | 'stop' // Stop entire import if any duplicates found (strict)
  | 'create_new_only'; // Generate a unique suffix or create as new

export interface ParsedTaskItem {
  rowIndex: number;
  taskName: string;
  taskDescription?: string;
  phaseName?: string;
  milestoneName?: string;
  assignedTo?: string;
  assignedToResolved?: {
    email?: string;
    fullName?: string;
    foundInDirectory: boolean;
  };
  startDate?: string;
  endDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deliverableName?: string;
  expectedHours?: number;
  progress?: number;
  dependsOn?: string;
  rasic?: {
    responsible?: string;
    accountable?: string;
    support?: string;
    consulted?: string;
    informed?: string;
  };
  customFields?: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export interface ParsedPhaseItem {
  name: string;
  description?: string;
  milestone?: string;
  tasks: ParsedTaskItem[];
}

export interface ParsedProjectItem {
  projectIdentifier: string; // Project ID, Project Code, or Project Name
  projectName: string;
  projectManager?: string;
  projectManagerResolved?: {
    email?: string;
    fullName?: string;
    foundInDirectory: boolean;
  };
  projectCategory?: string;
  productGroup?: string;
  department?: string;
  company?: string;
  projectType?: string;
  priority?: ProjectPriority | string;
  status?: ProjectStatus | string;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  notes?: string;
  phases: ParsedPhaseItem[];
  allTasks: ParsedTaskItem[];
  deliverablesCount: number;
  teamMembers: Set<string>;
  rowIndices: number[];
  isExistingInSystem?: boolean;
  existingProjectData?: any;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean;
}

export interface ValidationError {
  projectIdentifier: string;
  projectName: string;
  rowNumber: number;
  field: string;
  reason: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  projectIdentifier: string;
  projectName: string;
  rowNumber: number;
  field: string;
  message: string;
  severity: 'warning';
}

export interface ImportValidationSummary {
  totalRowsProcessed: number;
  projectsDetected: number;
  validProjectsCount: number;
  invalidProjectsCount: number;
  totalErrors: number;
  totalWarnings: number;
  totalPhases: number;
  totalMilestones: number;
  totalTasks: number;
  totalDeliverables: number;
  duplicateProjectsCount: number;
  status: 'READY_TO_IMPORT' | 'IMPORT_BLOCKED' | 'READY_WITH_WARNINGS';
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface BulkImportPayload {
  projects: {
    projectIdentifier: string;
    projectName: string;
    projectManager?: string;
    projectCategory?: string;
    productGroup?: string;
    department?: string;
    company?: string;
    projectType?: string;
    priority?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    estimatedCost?: number;
    notes?: string;
    phases: {
      name: string;
      description?: string;
      milestone?: string;
      tasks: {
        taskName: string;
        taskDescription?: string;
        assignedTo?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        priority?: string;
        deliverableName?: string;
        expectedHours?: number;
        progress?: number;
        dependsOn?: string;
        rasic?: {
          responsible?: string;
          accountable?: string;
          support?: string;
          consulted?: string;
          informed?: string;
        };
      }[];
    }[];
  }[];
  duplicateMode: DuplicateHandlingMode;
  mappingTemplateName?: string;
  fileName: string;
}

export interface ProjectImportExecutionItem {
  success?: boolean;
  projectIdentifier: string;
  projectCode?: string;
  projectId?: string;
  projectName: string;
  status: 'Created' | 'Updated' | 'Skipped' | 'Failed';
  phasesCreated: number;
  milestonesCreated: number;
  tasksCreated: number;
  deliverablesCreated: number;
  errorReason?: string;
  error?: string;
  errorCode?: string;
  createdProjectName?: string;
}

export interface BulkImportResult {
  importId: string;
  timestamp: string;
  fileName: string;
  uploadedBy: string;
  totalProjects: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
  projectsFailed: number;
  phasesCreated: number;
  milestonesCreated: number;
  tasksCreated: number;
  deliverablesCreated: number;
  items: ProjectImportExecutionItem[];
  logs: string[];
}
