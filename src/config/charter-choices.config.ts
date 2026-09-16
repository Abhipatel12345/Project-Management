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

