import fs from 'fs';
import path from 'path';
import { Gate, GateCriterion, GateDeliverable, GateReviewRecord } from '@/types/gate.types';
import { PDMUserSession } from '@/types/auth.types';
import { isGateReviewer } from '@/utils/user-matcher';
import { saveAuditRecord } from './audit-store';

const DATA_DIR = path.join(process.cwd(), '.data');
const GATES_FILE = path.join(DATA_DIR, 'gates.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function calculateGateReadiness(gate: Gate) {
  const criteria = gate.criteria || [];
  const deliverables = gate.deliverables || [];

  const totalCriteria = criteria.length;
  const completedCriteria = criteria.filter((c) => c.status === 'Completed').length;

  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter(
    (d) => d.status === 'Approved' || d.status === 'Completed' || d.completion_percentage === 100
  ).length;

  const totalItems = totalCriteria + totalDeliverables;
  const completedItems = completedCriteria + completedDeliverables;
  const completion = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const requiredCriteria = criteria.filter((c) => c.is_required);
  const completedRequiredCriteria = requiredCriteria.filter((c) => c.status === 'Completed').length;

  const requiredDeliverables = deliverables.filter((d) => d.is_required);
  const completedRequiredDeliverables = requiredDeliverables.filter(
    (d) => d.status === 'Approved' || d.status === 'Completed' || d.completion_percentage === 100
  ).length;

  const totalRequired = requiredCriteria.length + requiredDeliverables.length;
  const completedRequired = completedRequiredCriteria + completedRequiredDeliverables;
  const readiness = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;
  const openRequired = totalRequired - completedRequired;

  return { completion, readiness, openRequired };
}

function getInitialGates(): Gate[] {
  const gateTypes: Gate['gate_type'][] = [
    'Concept & Charter',
    'APQP Stage-Gate',
    'Design Freeze',
    'FMEA & Risk Validation',
    'Validation',
    'Production Readiness',
  ];

  const projects = [
    'PROJ-0001', 'PROJ-0002', 'PROJ-0003', 'PROJ-0004', 'PROJ-0005',
    'PROJ-0006', 'PROJ-0007', 'PROJ-0008', 'PROJ-0009', 'PROJ-0010',
    'PROJ-0011', 'PROJ-0012', 'PROJ-0013', 'PROJ-0014', 'PROJ-0015',
    'PROJ-0016', 'PROJ-0017', 'PROJ-0018', 'PROJ-0019', 'PROJ-0020',
  ];

  const titles = [
    'Gate 1: Concept & Feasibility Charter Sign-off',
    'Gate 2: Architecture & System Packaging Freeze',
    'Gate 3: DFM & Tooling Release Sign-off',
    'Gate 4: DV/PV Validation & PPAP Level 3 Review',
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
  ];

  return projects.map((proj, idx) => {
    const num = idx + 1;
    const isApproved = num % 4 === 0;
    const isReady = num % 2 === 0 && !isApproved;
    const status: Gate['status'] = isApproved ? 'Approved' : isReady ? 'Ready for Review' : 'In Progress';
    const approvalStatus: Gate['approval_status'] = isApproved ? 'Approved' : 'Pending';
    const comp = isApproved ? 100 : isReady ? 85 : 50;
    const read = isApproved ? 100 : isReady ? 80 : 45;

    // Set designated reviewers (e.g. Sarah Jenkins for even gates, Quality Reviewer for odd gates)
    const reviewerName = idx % 2 === 0 ? 'Sarah Jenkins' : 'Gate Reviewer';
    const reviewerUserId = idx % 2 === 0 ? 'sarahjenkins@gmail.com' : 'gatereviewer@netlink.com';

    return {
      name: `GATE-2026-${String(num).padStart(5, '0')}`,
      gate_name: titles[idx],
      project: proj,
      gate_type: gateTypes[idx % 6],
      planned_date: `2026-08-${String(1 + (num % 28)).padStart(2, '0')}`,
      actual_date: isApproved ? `2026-08-${String(1 + (num % 28)).padStart(2, '0')}` : undefined,
      status,
      gate_owner: 'Program Director',
      gate_owner_id: 'director@company.com',
      gate_reviewer: reviewerName,
      reviewer_user_id: reviewerUserId,
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
          responsible_user_id: 'teammember@netlink.com',
          project: proj,
          due_date: '2026-08-25',
          status: isApproved ? 'Approved' : 'Under Review',
          approval_status: isApproved ? 'Approved' : 'Under Review',
          completion_percentage: comp,
          is_required: true,
          document_reference: `DOC-2026-${String(num).padStart(5, '0')}`,
          approved_by: isApproved ? reviewerName : undefined,
          approved_at: isApproved ? '2026-08-10' : undefined,
        },
      ],
      reviews: isApproved
        ? [
            {
              id: `REV-${num}01`,
              reviewer: reviewerName,
              review_date: '2026-08-10',
              decision: 'Approved',
              comments: 'All criteria satisfied and verified by gate reviewer.',
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
}

export function loadAllGates(): Gate[] {
  ensureDataDir();
  if (fs.existsSync(GATES_FILE)) {
    try {
      const data = fs.readFileSync(GATES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback
    }
  }

  const initial = getInitialGates();
  saveAllGates(initial);
  return initial;
}

export function saveAllGates(gates: Gate[]): void {
  ensureDataDir();
  fs.writeFileSync(GATES_FILE, JSON.stringify(gates, null, 2), 'utf-8');
}

export function getGateByName(name: string): Gate | null {
  const gates = loadAllGates();
  return gates.find((g) => g.name === name) || null;
}

export function saveOrUpdateGate(gateData: Partial<Gate>): Gate {
  const gates = loadAllGates();
  const existingIndex = gates.findIndex((g) => g.name === gateData.name);

  if (existingIndex >= 0) {
    const existing = gates[existingIndex];
    const updated: Gate = {
      ...existing,
      ...gateData,
    };
    const { completion, readiness } = calculateGateReadiness(updated);
    updated.completion_percentage = completion;
    updated.readiness_percentage = readiness;
    gates[existingIndex] = updated;
    saveAllGates(gates);
    return updated;
  } else {
    const newGate: Gate = {
      name: gateData.name || `GATE-2026-${String(gates.length + 1).padStart(5, '0')}`,
      gate_name: gateData.gate_name || 'Untitled APQP Gate Review',
      project: gateData.project || 'PROJ-0001',
      gate_type: gateData.gate_type || 'Concept & Charter',
      planned_date: gateData.planned_date || new Date().toISOString().split('T')[0],
      actual_date: gateData.actual_date,
      status: gateData.status || 'In Progress',
      gate_owner: gateData.gate_owner || 'Program Director',
      gate_owner_id: gateData.gate_owner_id || 'director@company.com',
      gate_reviewer: gateData.gate_reviewer || 'Sarah Jenkins',
      reviewer_user_id: gateData.reviewer_user_id || 'sarahjenkins@gmail.com',
      approval_status: gateData.approval_status || 'Pending',
      completion_percentage: 0,
      readiness_percentage: 0,
      description: gateData.description || '',
      criteria: gateData.criteria || [],
      deliverables: gateData.deliverables || [],
      reviews: gateData.reviews || [],
      activity_log: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          user: gateData.gate_owner || 'Program Director',
          action: 'Created Gate Milestone Record',
        },
      ],
    };
    const { completion, readiness } = calculateGateReadiness(newGate);
    newGate.completion_percentage = completion;
    newGate.readiness_percentage = readiness;
    gates.unshift(newGate);
    saveAllGates(gates);
    return newGate;
  }
}

/**
 * Execute a Gate Deliverable Action (Review / Approve / Reject)
 * ENFORCES: Logged-in user MUST BE the assigned Gate Reviewer!
 */
export function executeDeliverableReviewAction(
  gateName: string,
  deliverableId: string,
  action: 'review' | 'approve' | 'reject',
  comment: string | undefined,
  session: PDMUserSession
): { gate: Gate; deliverable: GateDeliverable } {
  const gates = loadAllGates();
  const gate = gates.find((g) => g.name === gateName);
  if (!gate) {
    throw new Error(`Gate ${gateName} not found`);
  }

  // 1. STRICT PERMISSION CHECK: Must be the assigned Gate Reviewer
  const isReviewer = isGateReviewer(gate, session);
  if (!isReviewer) {
    const assignedReviewer = gate.gate_reviewer || gate.reviewer_user_id || 'Assigned Reviewer';
    const err: any = new Error(
      `403 Forbidden: Only the assigned Gate Reviewer (${assignedReviewer}) is authorized to perform review actions on gate ${gate.name}. Current user: ${session.fullName || session.username} (${session.email})`
    );
    err.statusCode = 403;
    throw err;
  }

  const deliverable = (gate.deliverables || []).find((d) => d.id === deliverableId);
  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found in Gate ${gateName}`);
  }

  const oldStatus = deliverable.status;
  const reviewerIdentity = session.fullName || session.username || session.email;
  const todayStr = new Date().toISOString().split('T')[0];

  if (action === 'approve') {
    deliverable.status = 'Approved';
    deliverable.approval_status = 'Approved';
    deliverable.completion_percentage = 100;
    deliverable.approved_by = reviewerIdentity;
    deliverable.approved_at = todayStr;
    deliverable.approval_comment = comment || 'Approved by Gate Reviewer';
  } else if (action === 'reject') {
    deliverable.status = 'Rejected';
    deliverable.approval_status = 'Rejected';
    deliverable.completion_percentage = 0;
    deliverable.approved_by = reviewerIdentity;
    deliverable.approved_at = todayStr;
    deliverable.approval_comment = comment || 'Rejected with findings';
  } else if (action === 'review') {
    deliverable.status = 'Under Review';
    deliverable.approval_status = 'Under Review';
    deliverable.approved_by = undefined;
    deliverable.approved_at = undefined;
    deliverable.approval_comment = comment || 'Under technical review by Gate Reviewer';
  }

  const { completion, readiness } = calculateGateReadiness(gate);
  gate.completion_percentage = completion;
  gate.readiness_percentage = readiness;

  // Record audit history
  saveAuditRecord({
    project_id: gate.project || 'GLOBAL',
    user_id: session.email || session.username,
    user_name: reviewerIdentity,
    role: session.role,
    action: `Gate Deliverable ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Under Review'}`,
    entity_type: 'GateDeliverable',
    entity_id: deliverable.id,
    description: `${action.toUpperCase()} deliverable "${deliverable.name}" for Gate ${gate.name}. ${comment ? `Reason: ${comment}` : ''}`,
    old_value: oldStatus,
    new_value: deliverable.status,
  });

  saveAllGates(gates);
  return { gate, deliverable };
}
