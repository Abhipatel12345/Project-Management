export interface ProjectPhase {
  id: string;
  name: string;
  phase_number: number;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    dot: string;
  };
}

export const STANDARD_PROJECT_PHASES: ProjectPhase[] = [
  {
    id: 'phase-1',
    phase_number: 1,
    name: 'Phase 1: Concept & Planning',
    description: 'Feasibility, Project Charter, Requirements Definition & Kickoff',
    color: {
      bg: 'bg-sky-50/70',
      text: 'text-sky-900',
      border: 'border-sky-200',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    },
  },
  {
    id: 'phase-2',
    phase_number: 2,
    name: 'Phase 2: Product Design & Development',
    description: 'CAD 3D Modeling, System Architecture, FEA Analysis & Design Freeze',
    color: {
      bg: 'bg-indigo-50/70',
      text: 'text-indigo-900',
      border: 'border-indigo-200',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500',
    },
  },
  {
    id: 'phase-3',
    phase_number: 3,
    name: 'Phase 3: Process Design & Development',
    description: 'DFM/DFA, Tooling Specifications, Manufacturing Process & Control Plans',
    color: {
      bg: 'bg-amber-50/70',
      text: 'text-amber-900',
      border: 'border-amber-200',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
  },
  {
    id: 'phase-4',
    phase_number: 4,
    name: 'Phase 4: Product & Process Validation',
    description: 'Prototype Builds, DV/PV Testing, Environmental Validation & PPAP',
    color: {
      bg: 'bg-purple-50/70',
      text: 'text-purple-900',
      border: 'border-purple-200',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500',
    },
  },
  {
    id: 'phase-5',
    phase_number: 5,
    name: 'Phase 5: Launch & Production Readiness',
    description: 'Pre-production Ramp, Line Trials, SOP Release & Final Sign-off',
    color: {
      bg: 'bg-emerald-50/70',
      text: 'text-emerald-900',
      border: 'border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
  },
];

/**
 * Get all available phases for a project (standard 5 APQP phases)
 */
export function getProjectPhases(projectId?: string): ProjectPhase[] {
  return STANDARD_PROJECT_PHASES;
}

/**
 * Format phase name for consistent display across all views
 */
export function formatPhaseName(phaseStr?: string | null): string {
  if (!phaseStr || phaseStr.trim() === '' || phaseStr === 'N/A') {
    return 'Phase 1: Concept & Planning';
  }

  const clean = phaseStr.trim();
  const lower = clean.toLowerCase();

  const matched = STANDARD_PROJECT_PHASES.find(
    (p) =>
      p.id === lower ||
      p.name.toLowerCase() === lower ||
      `phase ${p.phase_number}` === lower ||
      `phase-${p.phase_number}` === lower ||
      lower.startsWith(`phase ${p.phase_number}`) ||
      lower.startsWith(`phase-${p.phase_number}`) ||
      lower.startsWith(`phase${p.phase_number}`)
  );

  if (matched) return matched.name;

  return clean;
}

/**
 * Extract phase number (1, 2, 3, 4, 5, 6, ...) from any phase string
 */
export function getPhaseNumber(phaseStr?: string | null): number {
  if (!phaseStr) return 1;
  const match = phaseStr.match(/phase\s*[-_]?\s*(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return 1;
}

const CUSTOM_PALETTES = [
  {
    bg: 'bg-teal-50/70',
    text: 'text-teal-900',
    border: 'border-teal-200',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  {
    bg: 'bg-fuchsia-50/70',
    text: 'text-fuchsia-900',
    border: 'border-fuchsia-200',
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    dot: 'bg-fuchsia-500',
  },
  {
    bg: 'bg-cyan-50/70',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
  },
];

/**
 * Get color styling for a phase
 */
export function getPhaseBadgeColors(phaseStr?: string | null) {
  const num = getPhaseNumber(phaseStr);
  if (num >= 1 && num <= 5) {
    const phase = STANDARD_PROJECT_PHASES.find((p) => p.phase_number === num) || STANDARD_PROJECT_PHASES[0];
    return phase.color;
  }
  // For custom phase numbers (6, 7, etc.)
  const paletteIndex = (num - 6) % CUSTOM_PALETTES.length;
  return CUSTOM_PALETTES[paletteIndex >= 0 ? paletteIndex : 0];
}

/**
 * Infer an appropriate project phase for existing tasks that don't have one assigned
 */
export function inferTaskPhase(task: {
  subject?: string;
  description?: string;
  phase?: string;
  name?: string;
}): string {
  if (task.phase && task.phase.trim() !== '') {
    return formatPhaseName(task.phase);
  }

  const text = `${task.subject || ''} ${task.description || ''}`.toLowerCase();

  // Phase 5 keywords: Launch, SOP, Production Ramp, Mass Production, SOP Release
  if (
    text.includes('sop') ||
    text.includes('launch') ||
    text.includes('production ramp') ||
    text.includes('line trial') ||
    text.includes('mass production') ||
    text.includes('commercial release')
  ) {
    return 'Phase 5: Launch & Production Readiness';
  }

  // Phase 4 keywords: Validation, DV, PV, PPAP, Testing, Environmental, EMC, Reliability
  if (
    text.includes('validation') ||
    text.includes('dv/pv') ||
    text.includes('ppap') ||
    text.includes('prototype testing') ||
    text.includes('environmental test') ||
    text.includes('emc') ||
    text.includes('durability test') ||
    text.includes('sample inspection')
  ) {
    return 'Phase 4: Product & Process Validation';
  }

  // Phase 3 keywords: Process, DFM, DFA, Tooling, Fixture, Manufacturing, Mold, Line Setup, Control Plan
  if (
    text.includes('tooling') ||
    text.includes('dfm') ||
    text.includes('dfa') ||
    text.includes('process design') ||
    text.includes('mold') ||
    text.includes('fixture') ||
    text.includes('manufacturing line') ||
    text.includes('control plan') ||
    text.includes('stamping die')
  ) {
    return 'Phase 3: Process Design & Development';
  }

  // Phase 2 keywords: CAD, 3D, Design Freeze, Simulation, Architecture, FEA, Schematic, PCB, BOM
  if (
    text.includes('cad') ||
    text.includes('3d model') ||
    text.includes('design freeze') ||
    text.includes('schematic') ||
    text.includes('pcb') ||
    text.includes('fea') ||
    text.includes('mechanical design') ||
    text.includes('architecture') ||
    text.includes('bom structure')
  ) {
    return 'Phase 2: Product Design & Development';
  }

  // Default to Phase 1: Concept & Planning
  return 'Phase 1: Concept & Planning';
}
