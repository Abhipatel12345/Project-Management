import api from './api';
import {
  Gate,
  GateListQueryParams,
  GateListResponse,
  GateSummary,
  GateDeliverable,
} from '@/types/gate.types';

const STORAGE_KEY = 'pdm_gate_management_v1';

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
    deliverables: [
      {
        id: 'DEL-101',
        name: 'Project Charter & Target Definition',
        description: 'Signed executive charter and high level technical specifications.',
        responsible_person: 'Program Director',
        due_date: '2026-08-01',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
        document_reference: 'DOC-2026-00001',
      },
      {
        id: 'DEL-102',
        name: 'Customer Voice & Product Specifications',
        description: 'Customer attribute targets (NVH, Range, Crash safety, Ergonomics).',
        responsible_person: 'Systems Engineering Lead',
        due_date: '2026-08-01',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
      },
      {
        id: 'DEL-103',
        name: 'Initial Bill of Materials (BOM) Estimate',
        description: 'Target cost structure and high-value part vendor strategy.',
        responsible_person: 'Procurement Specialist',
        due_date: '2026-08-01',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
      },
    ],
    review_signoff: {
      reviewer: 'Chief Vehicle Engineer',
      review_date: '2026-08-02',
      decision: 'Approved',
      comments: 'All Gate 1 mandatory deliverables verified and cleared for APQP Stage-Gate entry.',
    },
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
    deliverables: [
      {
        id: 'DEL-201',
        name: 'System DFMEA & Risk Analysis',
        description: 'Comprehensive risk score mitigation for high RPN components.',
        responsible_person: 'FMEA Specialist',
        due_date: '2026-08-10',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
        document_reference: 'DOC-2026-00002',
      },
      {
        id: 'DEL-202',
        name: 'Control Plan & Inspection Protocols',
        description: 'Quality control points and critical dimension verification plan.',
        responsible_person: 'Quality Lead',
        due_date: '2026-08-12',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
        document_reference: 'DOC-2026-00003',
      },
      {
        id: 'DEL-203',
        name: 'Class-A Surface CAD Freeze',
        description: 'Final CAD release to tooling suppliers.',
        responsible_person: 'Design Lead',
        due_date: '2026-08-14',
        status: 'In Progress',
        completion_percentage: 50,
        is_required: true,
      },
      {
        id: 'DEL-204',
        name: 'Packaging & Logistics Concept',
        description: 'Returnable container design and shipping protection spec.',
        responsible_person: 'Logistics Engineer',
        due_date: '2026-08-15',
        status: 'In Progress',
        completion_percentage: 50,
        is_required: false,
      },
    ],
    review_signoff: {
      reviewer: 'Quality Director',
      decision: 'Pending',
      comments: 'Awaiting 100% completion of Class-A surface CAD freeze.',
    },
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
    deliverables: [
      {
        id: 'DEL-301',
        name: 'PPAP Level 3 Approval Package',
        description: 'Supplier PPAP submissions and dimensional layout results.',
        responsible_person: 'Supplier Quality Manager',
        due_date: '2026-08-25',
        status: 'Completed',
        completion_percentage: 100,
        is_required: true,
      },
      {
        id: 'DEL-302',
        name: 'Run@Rate Manufacturing Trial',
        description: 'Verification of 100 jobs-per-hour production rate at full line speed.',
        responsible_person: 'Plant Industrial Engineer',
        due_date: '2026-08-27',
        status: 'In Progress',
        completion_percentage: 80,
        is_required: true,
      },
    ],
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

const calculateGatePercentages = (gate: Gate): { completion: number; readiness: number } => {
  const deliverables = gate.deliverables || [];
  if (deliverables.length === 0) return { completion: 100, readiness: 100 };

  const totalComp = deliverables.reduce((sum, d) => sum + (d.completion_percentage || 0), 0);
  const completion = Math.round(totalComp / deliverables.length);

  const required = deliverables.filter((d) => d.is_required);
  if (required.length === 0) return { completion, readiness: completion };

  const completedRequired = required.filter((d) => d.status === 'Completed' || d.completion_percentage >= 100).length;
  const readiness = Math.round((completedRequired / required.length) * 100);

  return { completion, readiness };
};

export const gateService = {
  async getGates(params: GateListQueryParams = {}): Promise<GateListResponse> {
    let gates = getStoredGates();

    // Recalculate percentages dynamically
    gates.forEach((g) => {
      const { completion, readiness } = calculateGatePercentages(g);
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
      upcomingGates: gates.filter((g) => g.planned_date && g.planned_date >= todayStr && g.status !== 'Completed' && g.status !== 'Approved').length,
      inProgressGates: gates.filter((g) => g.status === 'In Progress' || g.status === 'Ready for Review').length,
      completedGates: gates.filter((g) => g.status === 'Completed' || g.status === 'Approved').length,
      blockedGates: gates.filter((g) => g.status === 'Blocked' || g.status === 'Rejected').length,
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
      deliverables: data.deliverables || [],
      review_signoff: data.review_signoff,
    };

    const { completion, readiness } = calculateGatePercentages(newGate);
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
    let updated: Gate;

    if (index !== -1) {
      const merged = { ...gates[index], ...data, modified: new Date().toISOString() };
      const { completion, readiness } = calculateGatePercentages(merged);
      merged.completion_percentage = completion;
      merged.readiness_percentage = readiness;
      gates[index] = merged;
      updated = merged;
    } else {
      updated = {
        name,
        gate_name: data.gate_name || 'Stage Gate',
        gate_type: data.gate_type || 'Concept & Charter',
        gate_owner: 'Administrator',
        status: data.status || 'Not Started',
        approval_status: data.approval_status || 'Pending',
        completion_percentage: 0,
        readiness_percentage: 0,
        deliverables: [],
        ...data,
      };
      const { completion, readiness } = calculateGatePercentages(updated);
      updated.completion_percentage = completion;
      updated.readiness_percentage = readiness;
      gates.unshift(updated);
    }

    saveStoredGates(gates);
    return updated;
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
      due_date: deliverable.due_date || gate.planned_date,
      status: deliverable.status || 'Pending',
      completion_percentage: deliverable.completion_percentage || 0,
      is_required: deliverable.is_required !== undefined ? deliverable.is_required : true,
      document_reference: deliverable.document_reference,
    };

    gate.deliverables = gate.deliverables || [];
    gate.deliverables.push(newDel);

    const { completion, readiness } = calculateGatePercentages(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    saveStoredGates(gates);
    return gate;
  },

  async deleteGate(name: string): Promise<void> {
    const gates = getStoredGates().filter((g) => g.name !== name);
    saveStoredGates(gates);
  },
};

export default gateService;
