import api from './api';
import {
  Gate,
  GateListQueryParams,
  GateListResponse,
  GateSummary,
  GateCriterion,
  GateDeliverable,
  GateReviewRecord,
  GateActivityLog,
} from '@/types/gate.types';

const STORAGE_KEY = 'pdm_gate_management_v2';

const getInitialGates = (): Gate[] => [
  {
    name: 'GATE-2026-00001',
    gate_name: 'Gate 1: Concept & Program Charter Sign-off',
    project: 'PROJ-0001',
    gate_type: 'Concept & Charter',
    planned_date: '2026-08-01',
    actual_date: '2026-08-02',
    status: 'Approved',
    gate_owner: 'Program Director',
    approval_status: 'Approved',
    completion_percentage: 100,
    readiness_percentage: 100,
    description: 'Initial APQP Gate 1 charter definition, vehicle level targets, and business case sign-off.',
    criteria: [
      {
        id: 'CRT-101',
        name: 'Project Charter Sign-off',
        description: 'Signed executive charter and scope boundaries.',
        is_required: true,
        status: 'Completed',
        responsible_person: 'Program Director',
        due_date: '2026-08-01',
        comments: 'Signed by Vice President of Product Engineering.',
      },
      {
        id: 'CRT-102',
        name: 'Customer Vehicle Targets Documented',
        description: 'Target specs for NVH, weight, crash safety, and battery range.',
        is_required: true,
        status: 'Completed',
        responsible_person: 'Systems Lead',
        due_date: '2026-08-01',
        comments: 'Documented in DOC-2026-00001.',
      },
      {
        id: 'CRT-103',
        name: 'Initial Bill of Materials (BOM) Target',
        description: 'High-value part cost targets and supply chain strategy.',
        is_required: true,
        status: 'Completed',
        responsible_person: 'Procurement Specialist',
        due_date: '2026-08-01',
      },
    ],
    deliverables: [
      {
        id: 'DEL-101',
        name: 'Signed Program Charter File',
        description: 'PDF attachment of executive charter.',
        responsible_person: 'Program Director',
        project: 'PROJ-0001',
        due_date: '2026-08-01',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
        document_reference: 'DOC-2026-00001',
        related_task: 'TASK-001',
      },
      {
        id: 'DEL-102',
        name: 'Product Attribute Matrix',
        description: 'Attribute spec sheets and customer requirements.',
        responsible_person: 'Systems Engineering Lead',
        project: 'PROJ-0001',
        due_date: '2026-08-01',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
      },
    ],
    reviews: [
      {
        id: 'REV-101',
        reviewer: 'Chief Vehicle Engineer',
        review_date: '2026-08-02',
        decision: 'Approved',
        comments: 'All Gate 1 mandatory criteria cleared. Released for APQP Stage 2.',
      },
    ],
    activity_log: [
      {
        id: 'ACT-101',
        timestamp: '2026-08-01 10:00',
        user: 'Program Director',
        action: 'Created Gate 1: Concept & Program Charter Sign-off',
      },
      {
        id: 'ACT-102',
        timestamp: '2026-08-02 14:30',
        user: 'Chief Vehicle Engineer',
        action: 'Approved Stage-Gate Sign-off',
      },
    ],
  },
  {
    name: 'GATE-2026-00002',
    gate_name: 'Gate 2: APQP Stage-Gate & DFMEA Freeze',
    project: 'PROJ-0001',
    gate_type: 'APQP Stage-Gate',
    planned_date: '2026-08-15',
    status: 'In Progress',
    gate_owner: 'Chief Engineer',
    approval_status: 'Pending',
    completion_percentage: 75,
    readiness_percentage: 75,
    description: 'APQP Stage 2 design freeze, system DFMEA completion, and preliminary tooling release.',
    criteria: [
      {
        id: 'CRT-201',
        name: 'System DFMEA Freeze & RPN Mitigation',
        description: 'Complete high risk score mitigations.',
        is_required: true,
        status: 'Completed',
        responsible_person: 'FMEA Specialist',
        due_date: '2026-08-10',
        comments: 'High RPN items mitigated below 100.',
      },
      {
        id: 'CRT-202',
        name: 'Control Plan & Inspection Protocol',
        description: 'Quality control points defined.',
        is_required: true,
        status: 'Completed',
        responsible_person: 'Quality Lead',
        due_date: '2026-08-12',
      },
      {
        id: 'CRT-203',
        name: 'Class-A Surface CAD Release',
        description: 'Final CAD release to tooling suppliers.',
        is_required: true,
        status: 'In Progress',
        responsible_person: 'Design Lead',
        due_date: '2026-08-14',
        comments: 'Handle bezel draft angle refinement in progress.',
      },
      {
        id: 'CRT-204',
        name: 'Packaging & Shipping Container Design',
        description: 'Returnable container spec.',
        is_required: false,
        status: 'In Progress',
        responsible_person: 'Logistics Engineer',
        due_date: '2026-08-15',
      },
    ],
    deliverables: [
      {
        id: 'DEL-201',
        name: 'DFMEA PDF Document',
        description: 'System DFMEA risk report.',
        responsible_person: 'FMEA Specialist',
        project: 'PROJ-0001',
        due_date: '2026-08-10',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
        document_reference: 'DOC-2026-00002',
      },
      {
        id: 'DEL-202',
        name: '3D CAD Surface Data Package',
        description: 'CAD release files.',
        responsible_person: 'Design Lead',
        project: 'PROJ-0001',
        due_date: '2026-08-14',
        status: 'In Progress',
        completion_percentage: 50,
        is_required: true,
      },
    ],
    reviews: [],
    activity_log: [
      {
        id: 'ACT-201',
        timestamp: '2026-08-05 09:15',
        user: 'Chief Engineer',
        action: 'Created Gate 2: APQP Stage-Gate & DFMEA Freeze',
      },
    ],
  },
  {
    name: 'GATE-2026-00003',
    gate_name: 'Gate 3: Production Readiness & PPAP Approval',
    project: 'PROJ-0002',
    gate_type: 'Production Readiness',
    planned_date: '2026-08-28',
    status: 'Ready for Review',
    gate_owner: 'Plant Manufacturing Director',
    approval_status: 'Pending',
    completion_percentage: 90,
    readiness_percentage: 90,
    description: 'PPAP Level 3 sign-off, line trial run rate, and assembly ergonomics validation.',
    criteria: [
      {
        id: 'CRT-301',
        name: 'PPAP Level 3 Package Approval',
        description: 'Supplier PPAP submissions.',
        is_required: true,
        status: 'Completed',
        responsible_person: 'Supplier Quality Manager',
        due_date: '2026-08-25',
      },
      {
        id: 'CRT-302',
        name: 'Run@Rate Line Trial (100 JPH)',
        description: 'Full line speed verification.',
        is_required: true,
        status: 'In Progress',
        responsible_person: 'Industrial Engineer',
        due_date: '2026-08-27',
      },
    ],
    deliverables: [
      {
        id: 'DEL-301',
        name: 'PPAP Submission Binder',
        description: 'Quality Level 3 documentation.',
        responsible_person: 'Supplier Quality Manager',
        project: 'PROJ-0002',
        due_date: '2026-08-25',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
        document_reference: 'DOC-2026-00003',
      },
    ],
    reviews: [],
    activity_log: [],
  },
];

const getStoredGates = (): Gate[] => {
  if (typeof window === 'undefined') return getInitialGates();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialGates();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialGates();
  }
};

const saveStoredGates = (gates: Gate[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gates));
    } catch {
      // fallback
    }
  }
};

export const calculateGateReadiness = (gate: Gate): { completion: number; readiness: number; totalRequired: number; completedRequired: number; openRequired: number } => {
  const criteria = gate.criteria || [];
  const deliverables = gate.deliverables || [];

  const requiredCriteria = criteria.filter((c) => c.is_required && c.status !== 'Not Applicable');
  const requiredDeliverables = deliverables.filter((d) => d.is_required);

  const totalRequired = requiredCriteria.length + requiredDeliverables.length;

  const completedRequiredCriteria = requiredCriteria.filter((c) => c.status === 'Completed').length;
  const completedRequiredDeliverables = requiredDeliverables.filter(
    (d) => d.status === 'Completed' || d.status === 'Approved' || (d.completion_percentage || 0) >= 100
  ).length;

  const completedRequired = completedRequiredCriteria + completedRequiredDeliverables;
  const openRequired = totalRequired - completedRequired;

  const readiness = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

  // Calculate overall completion
  const allItemsCount = criteria.length + deliverables.length;
  if (allItemsCount === 0) return { completion: 100, readiness: 100, totalRequired: 0, completedRequired: 0, openRequired: 0 };

  const doneCriteria = criteria.filter((c) => c.status === 'Completed' || c.status === 'Not Applicable').length;
  const doneDeliverables = deliverables.filter((d) => d.status === 'Completed' || d.status === 'Approved' || (d.completion_percentage || 0) >= 100).length;

  const completion = Math.round(((doneCriteria + doneDeliverables) / allItemsCount) * 100);

  return { completion, readiness, totalRequired, completedRequired, openRequired };
};

export const gateService = {
  async getGates(params: GateListQueryParams = {}): Promise<GateListResponse> {
    let gates = getStoredGates();

    // Recalculate readiness & completion dynamically
    gates.forEach((g) => {
      const { completion, readiness } = calculateGateReadiness(g);
      g.completion_percentage = completion;
      g.readiness_percentage = readiness;
    });

    if (params.project && params.project !== 'ALL') {
      gates = gates.filter((g) => g.project === params.project);
    }

    if (params.status && params.status !== 'ALL') {
      gates = gates.filter((g) => g.status === params.status);
    }

    if (params.gate_type && params.gate_type !== 'ALL') {
      gates = gates.filter((g) => g.gate_type === params.gate_type);
    }

    if (params.approval_status && params.approval_status !== 'ALL') {
      gates = gates.filter((g) => g.approval_status === params.approval_status);
    }

    if (params.gate_owner && params.gate_owner !== 'ALL') {
      gates = gates.filter((g) => g.gate_owner === params.gate_owner);
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      gates = gates.filter(
        (g) =>
          g.gate_name.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q) ||
          (g.project && g.project.toLowerCase().includes(q)) ||
          (g.gate_owner && g.gate_owner.toLowerCase().includes(q))
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const summary: GateSummary = {
      totalGates: gates.length,
      notStartedGates: gates.filter((g) => g.status === 'Not Started').length,
      inProgressGates: gates.filter((g) => g.status === 'In Progress').length,
      readyForReviewGates: gates.filter((g) => g.status === 'Ready for Review').length,
      approvedGates: gates.filter((g) => g.status === 'Approved' || g.status === 'Completed' || g.approval_status === 'Approved').length,
      blockedGates: gates.filter((g) => g.status === 'Blocked' || g.status === 'Rejected').length,
      upcomingGates: gates.filter((g) => g.planned_date && g.planned_date >= todayStr && g.status !== 'Completed' && g.status !== 'Approved').length,
      completedGates: gates.filter((g) => g.status === 'Completed' || g.status === 'Approved').length,
      requiringApprovalGates: gates.filter((g) => g.status === 'Ready for Review' || g.approval_status === 'Pending').length,
    };

    return {
      gates,
      totalCount: gates.length,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      summary,
    };
  },

  async createGate(data: Partial<Gate>): Promise<Gate> {
    const nextId = `GATE-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newGate: Gate = {
      name: nextId,
      gate_name: data.gate_name || 'Untitled Stage Gate',
      project: data.project || '',
      gate_type: data.gate_type || 'Concept & Charter',
      planned_date: data.planned_date || new Date().toISOString().split('T')[0],
      actual_date: data.actual_date,
      status: data.status || 'Not Started',
      gate_owner: data.gate_owner || 'Administrator',
      approval_status: data.approval_status || 'Pending',
      completion_percentage: 0,
      readiness_percentage: 0,
      description: data.description || '',
      criteria: data.criteria || [
        {
          id: `CRT-${Math.floor(100 + Math.random() * 900)}`,
          name: 'Gate Charter & Exit Criteria Sign-off',
          description: 'Primary exit criteria verification',
          is_required: true,
          status: 'Pending',
          responsible_person: data.gate_owner || 'Administrator',
          due_date: data.planned_date,
        },
      ],
      deliverables: data.deliverables || [],
      reviews: [],
      activity_log: [
        {
          id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          user: data.gate_owner || 'Administrator',
          action: `Created Stage-Gate ${nextId}`,
        },
      ],
    };

    const { completion, readiness } = calculateGateReadiness(newGate);
    newGate.completion_percentage = completion;
    newGate.readiness_percentage = readiness;

    const gates = getStoredGates();
    gates.unshift(newGate);
    saveStoredGates(gates);

    return newGate;
  },

  async updateGate(name: string, data: Partial<Gate>): Promise<Gate> {
    const gates = getStoredGates();
    const index = gates.findIndex((g) => g.name === name);
    if (index === -1) throw new Error('Gate not found');

    const current = gates[index];

    // Enforce approval readiness check
    if (data.status === 'Approved' || data.approval_status === 'Approved') {
      const { readiness, openRequired } = calculateGateReadiness(current);
      if (readiness < 100 && !data.description?.includes('[OVERRIDE]')) {
        throw new Error(
          `Approval Blocked: ${openRequired} required criteria/deliverable(s) are incomplete. Complete all required items or use manager override.`
        );
      }
    }

    const updated: Gate = {
      ...current,
      ...data,
      modified: new Date().toISOString(),
    };

    const { completion, readiness } = calculateGateReadiness(updated);
    updated.completion_percentage = completion;
    updated.readiness_percentage = readiness;

    updated.activity_log = updated.activity_log || [];
    updated.activity_log.unshift({
      id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: data.gate_owner || current.gate_owner || 'Administrator',
      action: `Updated Stage-Gate details (Status: ${updated.status}, Approval: ${updated.approval_status})`,
    });

    gates[index] = updated;
    saveStoredGates(gates);

    return updated;
  },

  async addCriterion(gateName: string, criterion: Partial<GateCriterion>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const newCriterion: GateCriterion = {
      id: `CRT-${Math.floor(100 + Math.random() * 900)}`,
      name: criterion.name || 'Checklist Criterion',
      description: criterion.description || '',
      is_required: criterion.is_required !== undefined ? criterion.is_required : true,
      status: criterion.status || 'Pending',
      responsible_person: criterion.responsible_person || gate.gate_owner,
      due_date: criterion.due_date || gate.planned_date,
      comments: criterion.comments || '',
    };

    gate.criteria = gate.criteria || [];
    gate.criteria.push(newCriterion);

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    gate.activity_log = gate.activity_log || [];
    gate.activity_log.unshift({
      id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: gate.gate_owner,
      action: `Added Criterion: ${newCriterion.name}`,
    });

    saveStoredGates(gates);
    return gate;
  },

  async updateCriterion(gateName: string, criterionId: string, data: Partial<GateCriterion>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const criterion = (gate.criteria || []).find((c) => c.id === criterionId);
    if (criterion) {
      Object.assign(criterion, data);
    }

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    saveStoredGates(gates);
    return gate;
  },

  async deleteCriterion(gateName: string, criterionId: string): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    gate.criteria = (gate.criteria || []).filter((c) => c.id !== criterionId);

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    saveStoredGates(gates);
    return gate;
  },

  async addDeliverable(gateName: string, deliverable: Partial<GateDeliverable>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const newDel: GateDeliverable = {
      id: `DEL-${Math.floor(100 + Math.random() * 900)}`,
      name: deliverable.name || 'Deliverable Item',
      description: deliverable.description || '',
      responsible_person: deliverable.responsible_person || gate.gate_owner,
      project: gate.project,
      due_date: deliverable.due_date || gate.planned_date,
      status: deliverable.status || 'Not Started',
      completion_percentage: deliverable.completion_percentage || 0,
      is_required: deliverable.is_required !== undefined ? deliverable.is_required : true,
      document_reference: deliverable.document_reference,
      related_task: deliverable.related_task,
    };

    gate.deliverables = gate.deliverables || [];
    gate.deliverables.push(newDel);

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    gate.activity_log = gate.activity_log || [];
    gate.activity_log.unshift({
      id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: gate.gate_owner,
      action: `Added Deliverable: ${newDel.name}`,
    });

    saveStoredGates(gates);
    return gate;
  },

  async updateDeliverable(gateName: string, deliverableId: string, data: Partial<GateDeliverable>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const del = (gate.deliverables || []).find((d) => d.id === deliverableId);
    if (del) {
      Object.assign(del, data);
    }

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    saveStoredGates(gates);
    return gate;
  },

  async deleteDeliverable(gateName: string, deliverableId: string): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    gate.deliverables = (gate.deliverables || []).filter((d) => d.id !== deliverableId);

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    saveStoredGates(gates);
    return gate;
  },

  async addGateReview(gateName: string, review: { reviewer: string; decision: 'Approved' | 'Approved with Conditions' | 'Rejected'; comments?: string }): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const { readiness, openRequired } = calculateGateReadiness(gate);

    if (review.decision === 'Approved' && readiness < 100) {
      throw new Error(`Cannot approve gate: ${openRequired} required item(s) incomplete.`);
    }

    const reviewRecord: GateReviewRecord = {
      id: `REV-${Math.floor(100 + Math.random() * 900)}`,
      reviewer: review.reviewer || gate.gate_owner,
      review_date: new Date().toISOString().split('T')[0],
      decision: review.decision,
      comments: review.comments || '',
    };

    gate.reviews = gate.reviews || [];
    gate.reviews.unshift(reviewRecord);

    gate.approval_status = review.decision;
    if (review.decision === 'Approved' || review.decision === 'Approved with Conditions') {
      gate.status = 'Approved';
      gate.actual_date = new Date().toISOString().split('T')[0];
    } else {
      gate.status = 'Rejected';
    }

    gate.activity_log = gate.activity_log || [];
    gate.activity_log.unshift({
      id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      user: reviewRecord.reviewer,
      action: `Performed Executive Gate Review (Decision: ${review.decision})`,
    });

    saveStoredGates(gates);
    return gate;
  },

  async deleteGate(name: string): Promise<void> {
    const gates = getStoredGates().filter((g) => g.name !== name);
    saveStoredGates(gates);
  },
};

export default gateService;
