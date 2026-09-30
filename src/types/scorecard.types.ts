/**
 * Imperative Scorecard Types
 * Sourced directly from Inteva PM Software Requirements:
 * "New Software Requirements review template.xlsx" -> Sheet "Imperative scorecard Template" & "Imperative Scorecard Tab"
 */

export interface ScorecardRow {
  id: string;
  category: 'General' | 'Volume' | 'Tooling & Equipment' | 'Investment' | 'Expenses' | 'Financial Statistics';
  line_item: string;
  unit?: string;
  prb?: string;
  ar_target?: string;
  pl_current?: string;
  pl_ro?: string;
  vc_current?: string;
  vc_ro?: string;
  tko_current?: string;
  tko_ro?: string;
  vl_current?: string;
  vl_ro?: string;
  cpa_current?: string;
  cpa_ro?: string;
  ct_current?: string;
  ct_ro?: string;
  is_mandatory?: boolean;
}

export interface ProjectScorecard {
  project_id: string;
  project_name?: string;
  version: string;
  last_imported_at?: string;
  last_imported_by?: string;
  sop_date?: string;
  oi_percentage_target?: string;
  oi_percentage_current?: string;
  oee_target?: string;
  oee_current?: string;
  otd_target?: string;
  otd_current?: string;
  rows: ScorecardRow[];
}
