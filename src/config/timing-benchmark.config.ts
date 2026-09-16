/**
 * Authoritative Timing Status & Benchmark Configuration
 * Sourced from Manager Requirements:
 * "New Software Requirements review template.xlsx" -> Sheet: "Project Timing Status Tab" & "Choices"
 */

export interface PdpTimingMilestoneDefinition {
  pdp_line_item: string;
  reference_code: string;
  category: string;
  gate: string;
  description: string;
}

export const PDP_TIMING_MILESTONES: PdpTimingMilestoneDefinition[] = [
  {
    pdp_line_item: 'Project Launch / KO',
    reference_code: 'KO',
    category: 'Phase 1: Concept & Planning',
    gate: '1. PL',
    description: 'Initial Project Kickoff and team authorization',
  },
  {
    pdp_line_item: 'AR Approval',
    reference_code: 'AR',
    category: 'Phase 1: Concept & Planning',
    gate: '1. PL',
    description: 'Appropriation Request / Financial Business Case Approval',
  },
  {
    pdp_line_item: 'PL Gate Review',
    reference_code: '1. PL',
    category: 'Gate 1: Project Launch',
    gate: '1. PL',
    description: 'Project Launch Gate Formal Sign-off',
  },
  {
    pdp_line_item: 'VC Gate Review',
    reference_code: '2. VC',
    category: 'Gate 2: Concept Validation',
    gate: '2. VC',
    description: 'Concept Validation & Product Architecture Gate',
  },
  {
    pdp_line_item: 'TKO Gate Review',
    reference_code: '3. TKO',
    category: 'Gate 3: Tool Kick-Off',
    gate: '3. TKO',
    description: 'Tooling & Equipment Kickoff Gate',
  },
  {
    pdp_line_item: 'VL Gate Review',
    reference_code: '4. VL',
    category: 'Gate 4: Design Validation',
    gate: '4. VL',
    description: 'Design Validation & Prototype Build Gate',
  },
  {
    pdp_line_item: 'Customer PPAP Approval',
    reference_code: 'PPAP',
    category: 'Phase 4: Product & Process Validation',
    gate: '5. CPA',
    description: 'Production Part Approval Process Level 3 Sign-off',
  },
  {
    pdp_line_item: 'CPA Gate Review',
    reference_code: '5. CPA',
    category: 'Gate 5: Production Readiness',
    gate: '5. CPA',
    description: 'Customer Production Agreement & Line Readiness',
  },
  {
    pdp_line_item: 'Customer Start of Production',
    reference_code: 'SOP',
    category: 'Phase 5: Launch & Ramp-Up',
    gate: '6. CT',
    description: 'Serial Volume Production SOP Date',
  },
];

export const PRODUCT_GROUP_BENCHMARK_WEEKS: Record<string, Record<string, number>> = {
  'Door Systems': {
    'KO': 0,
    'AR': 6,
    '1. PL': 12,
    '2. VC': 28,
    '3. TKO': 42,
    '4. VL': 64,
    'PPAP': 80,
    '5. CPA': 88,
    'SOP': 96,
  },
  'Latches': {
    'KO': 0,
    'AR': 4,
    '1. PL': 10,
    '2. VC': 24,
    '3. TKO': 36,
    '4. VL': 56,
    'PPAP': 72,
    '5. CPA': 80,
    'SOP': 88,
  },
  'Interiors': {
    'KO': 0,
    'AR': 6,
    '1. PL': 14,
    '2. VC': 32,
    '3. TKO': 48,
    '4. VL': 70,
    'PPAP': 86,
    '5. CPA': 94,
    'SOP': 104,
  },
  'Motors & Electronics': {
    'KO': 0,
    'AR': 4,
    '1. PL': 8,
    '2. VC': 20,
    '3. TKO': 32,
    '4. VL': 52,
    'PPAP': 68,
    '5. CPA': 76,
    'SOP': 84,
  },
  // Default benchmark for other product groups
  'DEFAULT': {
    'KO': 0,
    'AR': 4,
    '1. PL': 10,
    '2. VC': 24,
    '3. TKO': 36,
    '4. VL': 56,
    'PPAP': 72,
    '5. CPA': 80,
    'SOP': 88,
  },
};

/**
 * Get benchmark duration in weeks for a product group and milestone
 */
export function getBenchmarkWeeks(productGroup?: string, referenceCode?: string): number {
  if (!referenceCode) return 0;
  const pgMap = (productGroup && PRODUCT_GROUP_BENCHMARK_WEEKS[productGroup]) || PRODUCT_GROUP_BENCHMARK_WEEKS['DEFAULT'];
  return pgMap[referenceCode] ?? PRODUCT_GROUP_BENCHMARK_WEEKS['DEFAULT'][referenceCode] ?? 0;
}

/**
 * Calculate weeks duration between reference start date and finish date
 */
export function calculateTimingWeeks(finishDate?: string, startDate?: string): number {
  if (!finishDate || !startDate) return 0;
  const start = new Date(startDate.split('T')[0]);
  const finish = new Date(finishDate.split('T')[0]);
  if (isNaN(start.getTime()) || isNaN(finish.getTime())) return 0;

  const diffMs = finish.getTime() - start.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, diffWeeks);
}

/**
 * Calculate benchmark finish date by adding benchmark weeks to project start date
 */
export function calculateBenchmarkFinishDate(startDate?: string, benchmarkWeeks = 0): string {
  if (!startDate) return '';
  const d = new Date(startDate.split('T')[0]);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + benchmarkWeeks * 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate week variance: Current Plan Weeks - Benchmark Weeks
 */
export function calculateWeekVariance(currentWeeks = 0, benchmarkWeeks = 0): number {
  return currentWeeks - benchmarkWeeks;
}

/**
 * Authoritative Timing Status Choices
 */
export const TIMING_STATUS_CHOICES = ['C', 'C Late', 'Y', 'R', 'N/A'] as const;
export type TimingStatusChoice = (typeof TIMING_STATUS_CHOICES)[number];

export const TIMING_STATUS_CONFIG: Record<
  TimingStatusChoice,
  { label: string; bg: string; text: string; border: string; description: string }
> = {
  C: {
    label: 'Completed On Time',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    description: 'Completed on or ahead of base plan schedule',
  },
  'C Late': {
    label: 'Completed Late',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    description: 'Completed past initial planned schedule date',
  },
  Y: {
    label: 'At Risk (Mitigated)',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    description: 'Incomplete with potential delay; recovery plan active',
  },
  R: {
    label: 'Critical / Delayed',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    description: 'Incomplete with significant delay; no mitigation',
  },
  'N/A': {
    label: 'Not Applicable',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    description: 'Milestone waived or not applicable for this program',
  },
};

/**
 * Suggest a default timing status based on current vs base date
 */
export function evaluateTimingStatus(
  currentDate?: string,
  baseDate?: string,
  isCompleted = false
): TimingStatusChoice {
  if (isCompleted) {
    if (!baseDate || !currentDate) return 'C';
    return currentDate <= baseDate ? 'C' : 'C Late';
  }

  if (!currentDate) return 'Y';

  const today = new Date().toISOString().split('T')[0];
  if (baseDate && currentDate > baseDate) {
    const currD = new Date(currentDate);
    const baseD = new Date(baseDate);
    const slipDays = Math.round((currD.getTime() - baseD.getTime()) / (1000 * 60 * 60 * 24));
    return slipDays > 14 ? 'R' : 'Y';
  }

  if (currentDate < today) {
    return 'R'; // Past finish date but not complete
  }

  return 'C';
}
