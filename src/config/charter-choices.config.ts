/**
 * Authoritative PMO-Maintained Charter Choices
 * Sourced directly from Manager Requirement Document:
 * "New Software Requirements review template.xlsx" -> Sheet: "Choices" & "Location (Manufacturing Plant)"
 */

export const CHARTER_PROJECT_TYPES = ['A', 'D'] as const;
export type CharterProjectType = (typeof CHARTER_PROJECT_TYPES)[number];

export const CHARTER_REGIONS = [
  'Americas',
  'China',
  'Europe',
  'India',
  'Korea',
] as const;
export type CharterRegion = (typeof CHARTER_REGIONS)[number];

export const CHARTER_COUNTRIES = [
  'China',
  'Czech',
  'France',
  'India',
  'Korea',
  'Mexico',
  'Morocco',
  'Romania',
  'US',
] as const;
export type CharterCountry = (typeof CHARTER_COUNTRIES)[number];

export const CHARTER_MANUFACTURING_PLANTS = [
  'Adrian',
  'Blufton',
  'Brownsville',
  'Direct Ship',
  'Esson',
  'Gadsden',
  'Guanajuato',
  'Juarez',
  'KDS',
  'Matamoros - Alianza',
  'Matamoros - Plant 1',
  'Matamoros - Plant 2',
  'Matamoros - Plant 3',
  'Morocco',
  'Pune',
  'Rychnov',
  'Salonta',
  'SDADS',
  'Sichuan',
  'Sully-sur-Loire',
  'Suzhou Greentech Material',
  'Xian',
  'Zhenjiang',
] as const;
export type CharterManufacturingPlant = (typeof CHARTER_MANUFACTURING_PLANTS)[number];

export interface CharterChoicesConfig {
  project_types: string[];
  regions: string[];
  countries: string[];
  manufacturing_plants: string[];
}

export const DEFAULT_CHARTER_CHOICES: CharterChoicesConfig = {
  project_types: [...CHARTER_PROJECT_TYPES],
  regions: [...CHARTER_REGIONS],
  countries: [...CHARTER_COUNTRIES],
  manufacturing_plants: [...CHARTER_MANUFACTURING_PLANTS],
};

export const BOARD_FUNCTIONS = [
  'FIN',
  'IT',
  'ME',
  'OPS',
  'PE',
  'PM',
  'QA',
  'RE',
  'SCM',
  'SD',
  'SM',
] as const;
export type BoardFunction = (typeof BOARD_FUNCTIONS)[number];

export const PDT_ROLES = [
  'Account Manager - Sales',
  'APQP Engineer',
  'Board Member',
  'Finance or Cost Estimator',
  'Lead Manufacturing Engineer',
  'Lead Operations Engineer',
  'Lead Product Engineer',
  'Product Group Leader',
  'Project Manager',
  'Reliability & Test Engineer',
  'Supplier Development Engineer',
  'Supply Chain Program Manager',
] as const;
export type PdtRole = (typeof PDT_ROLES)[number];

export const TEAM_TYPES = ['Board', 'Team'] as const;
export type TeamType = (typeof TEAM_TYPES)[number];

export const SKIPPED_TASK_CHOICES = ['-', 'Skipped'] as const;
export type SkippedTaskChoice = (typeof SKIPPED_TASK_CHOICES)[number];

export const GATE_BOARD_MEMBER_TITLES = [
  'Platform Director/ Product Group Director',
  'Operations Director / Plant Manager',
  'Regional Finance Director',
  'Regional Technical Director',
  'Regional Purchasing Director',
  'Regional Sales Director / Business Development Strategy Director',
  'Regional Quality Director – Plant Quality Manager',
] as const;
export type GateBoardMemberTitle = (typeof GATE_BOARD_MEMBER_TITLES)[number];

export const KGD_STATUS_CHOICES = ['Green', 'Yellow', 'Red'] as const;
export type KgdStatusChoice = (typeof KGD_STATUS_CHOICES)[number];

export const GATE_CHOICES = [
  '1. PL',
  '2. VC',
  '3. TKO',
  '4. VL',
  '5. CPA',
  '6. CT',
] as const;
export type GateChoice = (typeof GATE_CHOICES)[number];

export const DESIGN_REVIEW_CHOICES = [
  'PDR - Preliminary Design Review',
  'IDR - Interim Design Review',
  'SDR - Serial Design Review',
  'PVR - Production Validation Readiness',
  'PRR - Production Readiness Review',
] as const;
export type DesignReviewChoice = (typeof DESIGN_REVIEW_CHOICES)[number];

export const PRODUCT_GROUP_CHOICES = [
  'Door Systems',
  'Latches',
  'Interiors',
  'Motors & Electronics',
] as const;
export type ProductGroupChoice = (typeof PRODUCT_GROUP_CHOICES)[number];

export const GROUP_CHOICES = [
  'General',
  'Requirements & Concept',
  'Product Design',
  'Manufacturing',
  'Tracking',
] as const;
export type GroupChoice = (typeof GROUP_CHOICES)[number];

export const RM_CHOICES = ['R', 'M'] as const;
export type RmChoice = (typeof RM_CHOICES)[number];

export const DR_STATUS_CHOICES = ['G', 'Y', 'R', 'NA'] as const;
export type DrStatusChoice = (typeof DR_STATUS_CHOICES)[number];

export const DR_COMPLETION_STATUS_CHOICES = [
  'Open',
  'In Progress',
  'Completed',
] as const;
export type DrCompletionStatusChoice = (typeof DR_COMPLETION_STATUS_CHOICES)[number];

export const DR_DECISION_CHOICES = [
  'Passed',
  'Not Passed',
  'Concur with followup',
] as const;
export type DrDecisionChoice = (typeof DR_DECISION_CHOICES)[number];

export const PDT_RECOMMENDATION_CHOICES = [
  'Closed',
  'Concur with followup',
  'Escalate',
] as const;
export type PdtRecommendationChoice = (typeof PDT_RECOMMENDATION_CHOICES)[number];

export const PROJECT_STATUS_CHOICES = [
  'Not Started',
  'In Progress',
  'Completed',
  'On Hold',
  'Cancelled',
] as const;
export type ProjectStatusChoice = (typeof PROJECT_STATUS_CHOICES)[number];

export interface MasterChoicesConfig extends CharterChoicesConfig {
  board_functions: string[];
  pdt_roles: string[];
  team_types: string[];
  skipped_tasks: string[];
  gate_board_members: string[];
  kgd_statuses: string[];
  gates: string[];
  design_reviews: string[];
  product_groups: string[];
  groups: string[];
  rm_choices: string[];
  dr_statuses: string[];
  dr_completion_statuses: string[];
  dr_decisions: string[];
  pdt_recommendations: string[];
  project_statuses: string[];
}

export const DEFAULT_MASTER_CHOICES: MasterChoicesConfig = {
  ...DEFAULT_CHARTER_CHOICES,
  board_functions: [...BOARD_FUNCTIONS],
  pdt_roles: [...PDT_ROLES],
  team_types: [...TEAM_TYPES],
  skipped_tasks: [...SKIPPED_TASK_CHOICES],
  gate_board_members: [...GATE_BOARD_MEMBER_TITLES],
  kgd_statuses: [...KGD_STATUS_CHOICES],
  gates: [...GATE_CHOICES],
  design_reviews: [...DESIGN_REVIEW_CHOICES],
  product_groups: [...PRODUCT_GROUP_CHOICES],
  groups: [...GROUP_CHOICES],
  rm_choices: [...RM_CHOICES],
  dr_statuses: [...DR_STATUS_CHOICES],
  dr_completion_statuses: [...DR_COMPLETION_STATUS_CHOICES],
  dr_decisions: [...DR_DECISION_CHOICES],
  pdt_recommendations: [...PDT_RECOMMENDATION_CHOICES],
  project_statuses: [...PROJECT_STATUS_CHOICES],
};

