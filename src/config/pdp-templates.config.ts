/**
 * PDP Category & Template Configuration
 *
 * Source-driven configuration framework for PDP Category A and Category D.
 * Holds configurable Gate and Gantt template definitions.
 *
 * NOTE: As audited, exact Gate and Gantt task mappings for Category A and Category D
 * were not defined in the manager requirements or existing application files.
 * This file provides the clean, maintainable configuration point so mappings can be
 * populated when provided, without scattering hard-coded rules across components.
 */

export type PDPCategory = 'A' | 'D';

export const PDP_CATEGORIES: PDPCategory[] = ['A', 'D'];

export interface PdpGateItem {
  gate_name: string;
  gate_type: string;
  description?: string;
  criteria?: Array<{
    id: string;
    name: string;
    is_required: boolean;
    description?: string;
  }>;
  deliverables?: Array<{
    id: string;
    name: string;
    is_required: boolean;
    description?: string;
  }>;
}

export interface PdpGateTemplateConfig {
  templateName: string;
  category: PDPCategory;
  gates: PdpGateItem[];
}

export interface PdpGanttTaskItem {
  subject: string;
  phase?: string;
  description?: string;
  expected_time?: number;
  priority?: 'Low' | 'Medium' | 'High';
  rasic?: {
    responsible?: string;
    accountable?: string;
    support?: string;
    consulted?: string;
    informed?: string;
  };
}

export interface PdpGanttTemplateConfig {
  templateName: string;
  category: PDPCategory;
  tasks: PdpGanttTaskItem[];
}

export interface PdpCategoryMapping {
  category: PDPCategory;
  label: string;
  description: string;
  gateTemplate?: PdpGateTemplateConfig;
  ganttTemplate?: PdpGanttTemplateConfig;
}

/**
 * Authoritative PDP Template Mappings
 * Configurable containers for PDP Category A and Category D.
 * Empty gate/task arrays represent unconfigured state awaiting authoritative manager definitions.
 */
export const PDP_TEMPLATE_MAPPINGS: Record<PDPCategory, PdpCategoryMapping> = {
  A: {
    category: 'A',
    label: 'Category A',
    description: 'PDP Category A - Configurable Gate and Gantt template pipeline',
    gateTemplate: {
      templateName: 'PDP Category A Gate Template',
      category: 'A',
      gates: [], // Awaiting authoritative manager gate definitions
    },
    ganttTemplate: {
      templateName: 'PDP Category A Gantt Template',
      category: 'A',
      tasks: [], // Awaiting authoritative manager task definitions
    },
  },
  D: {
    category: 'D',
    label: 'Category D',
    description: 'PDP Category D - Configurable Gate and Gantt template pipeline',
    gateTemplate: {
      templateName: 'PDP Category D Gate Template',
      category: 'D',
      gates: [], // Awaiting authoritative manager gate definitions
    },
    ganttTemplate: {
      templateName: 'PDP Category D Gantt Template',
      category: 'D',
      tasks: [], // Awaiting authoritative manager task definitions
    },
  },
};

/**
 * Retrieve PDP Category mapping configuration
 */
export function getPdpCategoryMapping(category: string): PdpCategoryMapping | null {
  const norm = category.trim().toUpperCase() as PDPCategory;
  if (norm === 'A' || norm === 'D') {
    return PDP_TEMPLATE_MAPPINGS[norm];
  }
  return null;
}

/**
 * Check whether a category has non-empty configured Gate template items
 */
export function hasConfiguredGateTemplate(category: PDPCategory): boolean {
  const mapping = PDP_TEMPLATE_MAPPINGS[category];
  return Boolean(mapping?.gateTemplate && mapping.gateTemplate.gates.length > 0);
}

/**
 * Check whether a category has non-empty configured Gantt template tasks
 */
export function hasConfiguredGanttTemplate(category: PDPCategory): boolean {
  const mapping = PDP_TEMPLATE_MAPPINGS[category];
  return Boolean(mapping?.ganttTemplate && mapping.ganttTemplate.tasks.length > 0);
}
