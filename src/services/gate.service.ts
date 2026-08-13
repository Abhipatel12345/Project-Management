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

const getInitialGates = (): Gate[] => {
  const gateTypes: Gate['gate_type'][] = [
    'Concept & Charter',
    'Architecture Sign-off',
    'Detailed Design Freeze',
    'Tooling & DFM Release',
    'Production Readiness',
  ];

  const projects = [
    'PROJ-0001', 'PROJ-0002', 'PROJ-0003', 'PROJ-0004', 'PROJ-0005',
    'PROJ-0006', 'PROJ-0007', 'PROJ-0008', 'PROJ-0009', 'PROJ-0010',
    'PROJ-0011', 'PROJ-0012', 'PROJ-0013', 'PROJ-0014', 'PROJ-0015',
    'PROJ-0016', 'PROJ-0017', 'PROJ-0018', 'PROJ-0019', 'PROJ-0020',
    'PROJ-0021', 'PROJ-0022', 'PROJ-0023', 'PROJ-0024', 'PROJ-0025',
    'PROJ-0026', 'PROJ-0027', 'PROJ-0028', 'PROJ-0029', 'PROJ-0030',
  ];

  const titles = [
    'Gate 1: Door Handle Assembly Concept Charter',
    'Gate 2: EV Powertrain Cooling Architecture Sign-off',
    'Gate 3: 800V SiC Traction Inverter DFM Tooling Release',
    'Gate 4: Underbody Battery Tray PPAP Level 3 Approval',
    'Gate 1: Autonomous Radar & LiDAR Sensor Charter',
    'Gate 2: Active Suspension ECU Firmware Architecture',
    'Gate 3: Brake-by-Wire Electro-Hydraulic Tooling Freeze',
    'Gate 4: Steering Torque Sensor Production Readiness',
    'Gate 2: Exterior Body Stamping Die Surface Freeze',
    'Gate 1: Instrument Cluster Display Concept Charter',
    'Gate 3: Cabin HEPA HVAC Filter DFM Sign-off',
    'Gate 4: Matrix LED Headlamp PPAP Level 3 Release',
    'Gate 5: Rear Lightbar SOP Line Trial Ramp-up',
    'Gate 2: Seat Belt Pretensioner Design Freeze',
    'Gate 3: Motor Stator Cooling Sleeve Tooling Release',
    'Gate 4: Dual-Clutch Transmission Heat Exchanger PPAP',
    'Gate 2: Thermal Heat Pump Valve Manifold Architecture',
    'Gate 3: 5G TCU Antenna Package Tooling Freeze',
    'Gate 1: Vehicle Cybersecurity Gateway Charter (ISO 21434)',
    'Gate 4: Charge Port Door Actuator Production Readiness',
    'Gate 5: Electric Power Steering Motor SOP Production Ramp',
    'Gate 2: Side Curtain Airbag -40C Cold Deployment Freeze',
    'Gate 3: Driver Monitoring System Camera DFM Release',
    'Gate 4: TPMS RF Receiver EMC Regulatory Sign-off',
    'Gate 2: Panoramic Sunroof Mechanism Design Freeze',
    'Gate 5: Rain-Sensing Wiper Linkage SOP Line Trial',
    'Gate 3: AVAS External Acoustic Speaker Tooling Freeze',
    'Gate 2: UWB Smart Key Fob Ranging Architecture Sign-off',
    'Gate 5: High-Pressure Washer Pump SOP Production Ramp',
    'Gate 1: Wireless BMS Node Mesh Protocol Charter',
  ];

  return projects.map((proj, idx) => {
    const num = idx + 1;
    const isApproved = num % 3 === 0 || num % 5 === 0;
    const isReady = num % 2 === 0 && !isApproved;
    const status: Gate['status'] = isApproved ? 'Approved' : isReady ? 'Ready for Review' : 'In Progress';
    const approvalStatus: Gate['approval_status'] = isApproved ? 'Approved' : isReady ? 'Pending' : 'Pending';
    const comp = isApproved ? 100 : isReady ? 90 : 50 + (num % 4) * 10;
    const read = isApproved ? 100 : isReady ? 90 : 45 + (num % 4) * 10;

    return {
      name: `GATE-2026-${String(num).padStart(5, '0')}`,
      gate_name: titles[idx],
      project: proj,
      gate_type: gateTypes[idx % 5],
      planned_date: `2026-08-${String(1 + (num % 28)).padStart(2, '0')}`,
      actual_date: isApproved ? `2026-08-${String(1 + (num % 28)).padStart(2, '0')}` : undefined,
      status,
      gate_owner: idx % 2 === 0 ? 'Program Director' : 'Systems Engineering Lead',
      approval_status: approvalStatus,
      completion_percentage: comp,
      readiness_percentage: read,
      description: `Formal APQP Gate Milestone audit and quality gate sign-off for ${proj}.`,
      criteria: [
        {
          id: `CRT-${num}01`,
          name: 'Technical Specification Sign-off',
          description: 'Verified CTRS customer requirements and safety compliance.',
          is_required: true,
          status: isApproved ? 'Completed' : 'In Progress',
          responsible_person: 'Systems Lead',
          due_date: '2026-08-15',
          comments: isApproved ? 'Sign-off complete.' : 'Under engineering review.',
        },
        {
          id: `CRT-${num}02`,
          name: 'DFMEA & Risk Mitigation Plan',
          description: 'Design failure mode effect analysis risk priority numbers below threshold.',
          is_required: true,
          status: isApproved ? 'Completed' : 'In Progress',
          responsible_person: 'Quality Lead',
          due_date: '2026-08-20',
        },
      ],
      deliverables: [
        {
          id: `DEL-${num}01`,
          name: 'Engineering CAD & DFMEA Binder',
          description: 'Formal release package documentation.',
          responsible_person: 'Lead Engineer',
          project: proj,
          due_date: '2026-08-25',
          status: isApproved ? 'Completed' : 'In Progress',
          completion_percentage: comp,
          is_required: true,
          document_reference: `DOC-2026-${String(num).padStart(5, '0')}`,
        },
      ],
      reviews: isApproved
        ? [
            {
              id: `REV-${num}01`,
              reviewer: 'Program Director',
              review_date: '2026-08-10',
              decision: 'Approved',
              comments: 'All criteria satisfied.',
            },
          ]
        : [],
      activity_log: [
        {
          id: `ACT-${num}01`,
          timestamp: '2026-08-01 10:00',
          user: 'System',
          action: 'Created Gate Milestone Record',
        },
      ],
    };
  });
};

const getStoredGates = (): Gate[] => {
  if (typeof window === 'undefined') return getInitialGates();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 30) return parsed;
    }
  } catch {
    // fallback
  }
  const initial = getInitialGates();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
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

const calculateGateReadiness = (gate: Gate) => {
  const criteria = gate.criteria || [];
  const deliverables = gate.deliverables || [];

  const totalCriteria = criteria.length;
  const completedCriteria = criteria.filter((c) => c.status === 'Completed').length;

  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter((d) => d.status === 'Completed' || d.completion_percentage === 100).length;

  const totalItems = totalCriteria + totalDeliverables;
  const completedItems = completedCriteria + completedDeliverables;

  const completion = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const requiredCriteria = criteria.filter((c) => c.is_required);
  const completedRequiredCriteria = requiredCriteria.filter((c) => c.status === 'Completed').length;

  const requiredDeliverables = deliverables.filter((d) => d.is_required);
  const completedRequiredDeliverables = requiredDeliverables.filter((d) => d.status === 'Completed' || d.completion_percentage === 100).length;

  const totalRequired = requiredCriteria.length + requiredDeliverables.length;
  const completedRequired = completedRequiredCriteria + completedRequiredDeliverables;

  const readiness = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;
  const openRequired = totalRequired - completedRequired;

  return { completion, readiness, openRequired };
};

export const gateService = {
  async getGateReviews(params: GateListQueryParams = {}): Promise<GateListResponse> {
    let gates = getStoredGates();

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
          (g.description && g.description.toLowerCase().includes(q))
      );
    }

    const totalCount = gates.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const startIndex = (page - 1) * pageSize;
    const paginatedGates = gates.slice(startIndex, startIndex + pageSize);

    const summary: GateSummary = {
      totalGates: gates.length,
      notStartedGates: gates.filter((g) => g.status === 'Not Started').length,
      inProgressGates: gates.filter((g) => g.status === 'In Progress').length,
      readyForReviewGates: gates.filter((g) => g.status === 'Ready for Review').length,
      approvedGates: gates.filter((g) => g.status === 'Approved').length,
      blockedGates: gates.filter((g) => g.status === 'Blocked').length,
      upcomingGates: gates.filter((g) => g.planned_date && g.planned_date >= '2026-08-15').length,
      completedGates: gates.filter((g) => g.status === 'Approved' || g.status === 'Completed').length,
      requiringApprovalGates: gates.filter((g) => g.approval_status === 'Pending').length,
    };

    return {
      gates: paginatedGates,
      totalCount,
      page,
      pageSize,
      summary,
    };
  },

  async getGates(params: GateListQueryParams = {}): Promise<GateListResponse> {
    return this.getGateReviews(params);
  },

  async getGateByName(name: string): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === name);
    if (!gate) throw new Error(`Gate ${name} not found`);
    return gate;
  },

  async createGate(data: Partial<Gate>): Promise<Gate> {
    const gates = getStoredGates();
    const newGate: Gate = {
      name: `GATE-2026-${String(gates.length + 1).padStart(5, '0')}`,
      gate_name: data.gate_name || 'Untitled APQP Gate Review',
      project: data.project || 'PROJ-0001',
      gate_type: data.gate_type || 'Concept & Charter',
      planned_date: data.planned_date || new Date().toISOString().split('T')[0],
      status: 'In Progress',
      gate_owner: data.gate_owner || 'Program Director',
      approval_status: 'Pending',
      completion_percentage: 0,
      readiness_percentage: 0,
      description: data.description || '',
      criteria: data.criteria || [],
      deliverables: data.deliverables || [],
      reviews: [],
      activity_log: [
        {
          id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          user: data.gate_owner || 'Program Director',
          action: 'Created APQP Gate Milestone',
        },
      ],
    };

    const updated = [newGate, ...gates];
    saveStoredGates(updated);
    return newGate;
  },

  async updateGate(name: string, data: Partial<Gate>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === name);
    if (!gate) throw new Error('Gate not found');

    Object.assign(gate, data);
    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

    saveStoredGates(gates);
    return gate;
  },

  async addCriterion(gateName: string, criterion: Partial<GateCriterion>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const newCrit: GateCriterion = {
      id: `CRT-${Math.floor(100 + Math.random() * 900)}`,
      name: criterion.name || 'Checklist Criterion Item',
      description: criterion.description || '',
      is_required: criterion.is_required !== undefined ? criterion.is_required : true,
      status: criterion.status || 'In Progress',
      responsible_person: criterion.responsible_person || gate.gate_owner,
      due_date: criterion.due_date || gate.planned_date,
      comments: criterion.comments,
    };

    gate.criteria = gate.criteria || [];
    gate.criteria.push(newCrit);

    const { completion, readiness } = calculateGateReadiness(gate);
    gate.completion_percentage = completion;
    gate.readiness_percentage = readiness;

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

    saveStoredGates(gates);
    return gate;
  },

  async deleteGate(name: string): Promise<void> {
    const gates = getStoredGates().filter((g) => g.name !== name);
    saveStoredGates(gates);
  },
};

export default gateService;
