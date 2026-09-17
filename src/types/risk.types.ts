export type RiskRating = 'OK' | 'L' | 'H';

export interface RiskItem {
  id: string;
  area_id: string; // e.g., 'PM', 'DESIGN', 'PROCESS', 'TEST', 'SOURCING', 'MANUFACTURING'
  category?: string; // e.g. 'CUSTOMER', 'TIMING', 'PRODUCT ENGINEERING', etc.
  question: string;
  allowed_options: string[];
  selected_value?: string;
  rating: RiskRating;
  // Risk Summary fields
  description_of_risk?: string;
  risk_resolution_plan?: string;
  owner?: string;
  target_completion_date?: string;
  actual_completion_date?: string;
}

export interface RiskArea {
  id: string;
  name: string;
  overall_risk: RiskRating;
  items: RiskItem[];
}

export interface ProjectRiskAssessment {
  project_id: string;
  project_number: string;
  project_name: string;
  current_pdp_phase: string; // 'PL' | 'VC' | 'TKO' | 'VL'
  quote_phase?: string;
  overall_risk_assessment: RiskRating;
  high_risk_count: number;
  escalation_recommendation: 'Y' | 'N';
  areas: RiskArea[];
  last_updated?: string;
  updated_by?: string;
}
