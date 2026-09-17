export type FLMIndicator = 'GREEN' | 'RED';

export interface FLMMetricItem {
  id: string;
  name: string;
  target_value?: string;
  current_value?: string;
  target_date?: string;
  current_date?: string;
  indicator: FLMIndicator;
  source: 'Gantt' | 'Imperative Scorecard';
  description: string;
  is_mandatory?: boolean;
}

export interface GateFLMEvaluation {
  gate_code: 'PL' | 'VC' | 'TKO' | 'VL' | 'CPA' | 'CT';
  gate_name: string;
  is_current: boolean;
  metrics: FLMMetricItem[];
  green_count: number;
  total_metrics: number;
  oi_is_green: boolean;
  final_flm_status: FLMIndicator;
}

export interface ProjectFLMData {
  project_id: string;
  project_name: string;
  current_gate: 'PL' | 'VC' | 'TKO' | 'VL' | 'CPA' | 'CT';
  overall_flm_status: FLMIndicator;
  overall_green_count: number;
  overall_total_metrics: number;
  oi_is_green: boolean;
  gates: GateFLMEvaluation[];
  last_evaluated: string;
}
