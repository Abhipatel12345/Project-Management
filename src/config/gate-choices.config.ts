/**
 * Authoritative Master Data & Choices for Module #6: Gate Readiness & Gate Management
 * Source: "New Software Requirements review template.xlsx" -> Sheets: "Gate Readiness Tab", "Gate Review Results,Summary Tab", "Choices"
 */

export const INTEVA_GATE_CHOICES = [
  '1. PL',
  '2. VC',
  '3. TKO',
  '4. VL',
  '5. CPA',
  '6. CT',
] as const;

export type IntevaGateCode = (typeof INTEVA_GATE_CHOICES)[number];

export const GATE_BOARD_TITLES = [
  'Platform Director/ Product Group Director',
  'Operations Director / Plant Manager',
  'Regional Finance Director',
  'Regional Technical Director',
  'Regional Purchasing Director',
  'Regional Sales Director / Business Development Strategy Director',
  'Regional Quality Director – Plant Quality Manager',
] as const;

export type GateBoardTitle = (typeof GATE_BOARD_TITLES)[number];

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

export const DEFAULT_BOARD_FUNCTION_MAPPING: Record<GateBoardTitle, BoardFunction> = {
  'Platform Director/ Product Group Director': 'PM',
  'Operations Director / Plant Manager': 'OPS',
  'Regional Finance Director': 'FIN',
  'Regional Technical Director': 'PE',
  'Regional Purchasing Director': 'SCM',
  'Regional Sales Director / Business Development Strategy Director': 'SD',
  'Regional Quality Director – Plant Quality Manager': 'QA',
};

export const GATE_DECISIONS = [
  'Pass',
  'Pass with Follow up',
  'Escalate',
] as const;

export type GateDecision = (typeof GATE_DECISIONS)[number];

export const DELEGATION_CHOICES = [
  'Applicable',
  'Not Applicable',
] as const;

export type DelegationChoice = (typeof DELEGATION_CHOICES)[number];

export const SKIPPED_TASK_CHOICES = [
  '-',
  'Skipped  ',
] as const;

export const RETIMED_GATE_CHOICES = [
  '2. VC',
  '3. TKO',
  '4. VL',
  '5. CPA',
  '6. CT',
] as const;
