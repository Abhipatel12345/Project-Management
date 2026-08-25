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

const calculateGateReadiness = (gate: Gate) => {
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
};

const getStoredGates = (): Gate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
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

export const gateService = {
  async getGateReviews(params: GateListQueryParams = {}): Promise<GateListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.project && params.project !== 'ALL') queryParams.set('project', params.project);
      if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
      if (params.gate_type && params.gate_type !== 'ALL') queryParams.set('gate_type', params.gate_type);
      if (params.approval_status && params.approval_status !== 'ALL')
        queryParams.set('approval_status', params.approval_status);
      if (params.search) queryParams.set('search', params.search);
      if (params.page) queryParams.set('page', String(params.page));
      if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));

      const res = await api.get<GateListResponse>(`/api/gates?${queryParams.toString()}`);
      if (res && Array.isArray(res.gates)) {
        saveStoredGates(res.gates);
        return res;
      }
    } catch {
      // Fallback to local storage if API unreachable
    }

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
    try {
      const res = await api.get<{ success: boolean; gate: Gate }>(`/api/gates/${encodeURIComponent(name)}`);
      if (res?.gate) return res.gate;
    } catch {
      // Fallback
    }
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === name);
    if (!gate) throw new Error(`Gate ${name} not found`);
    return gate;
  },

  async createGate(data: Partial<Gate>): Promise<Gate> {
    try {
      const res = await api.post<{ success: boolean; gate: Gate }>('/api/gates', data);
      if (res?.gate) {
        const stored = getStoredGates();
        saveStoredGates([res.gate, ...stored]);
        return res.gate;
      }
    } catch (err: any) {
      if (err?.response?.data?._error_message) {
        throw new Error(err.response.data._error_message);
      }
    }

    const gates = getStoredGates();
    const newGate: Gate = {
      name: data.name || `GATE-2026-${String(gates.length + 1).padStart(5, '0')}`,
      gate_name: data.gate_name || 'Untitled APQP Gate Review',
      project: data.project || 'PROJ-0001',
      gate_type: data.gate_type || 'Concept & Charter',
      planned_date: data.planned_date || new Date().toISOString().split('T')[0],
      status: 'In Progress',
      gate_owner: data.gate_owner || 'Program Director',
      gate_owner_id: data.gate_owner_id || 'director@company.com',
      gate_reviewer: data.gate_reviewer || 'Sarah Jenkins',
      reviewer_user_id: data.reviewer_user_id || 'sarahjenkins@gmail.com',
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
    try {
      const res = await api.put<{ success: boolean; gate: Gate }>(`/api/gates/${encodeURIComponent(name)}`, data);
      if (res?.gate) {
        const gates = getStoredGates().map((g) => (g.name === name ? res.gate : g));
        saveStoredGates(gates);
        return res.gate;
      }
    } catch (err: any) {
      if (err?.response?.data?._error_message) {
        throw new Error(err.response.data._error_message);
      }
    }

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

  /**
   * Execute deliverable review, approval, or rejection via backend API with strict permission checks
   */
  async executeDeliverableAction(
    gateName: string,
    deliverableId: string,
    action: 'review' | 'approve' | 'reject',
    comment?: string
  ): Promise<{ gate: Gate; deliverable: GateDeliverable }> {
    const res = await api.post<{ success: boolean; gate: Gate; deliverable: GateDeliverable }>(
      `/api/gates/${encodeURIComponent(gateName)}/deliverables/${encodeURIComponent(deliverableId)}/action`,
      { action, comment }
    );

    if (res?.gate) {
      const gates = getStoredGates().map((g) => (g.name === gateName ? res.gate : g));
      saveStoredGates(gates);
      return { gate: res.gate, deliverable: res.deliverable };
    }

    throw new Error('Failed to update deliverable action');
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

    return this.updateGate(gateName, { criteria: gate.criteria });
  },

  async updateCriterion(gateName: string, criterionId: string, data: Partial<GateCriterion>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const criterion = (gate.criteria || []).find((c) => c.id === criterionId);
    if (criterion) {
      Object.assign(criterion, data);
    }

    return this.updateGate(gateName, { criteria: gate.criteria });
  },

  async deleteCriterion(gateName: string, criterionId: string): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    gate.criteria = (gate.criteria || []).filter((c) => c.id !== criterionId);
    return this.updateGate(gateName, { criteria: gate.criteria });
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
      responsible_user_id: deliverable.responsible_user_id,
      project: gate.project,
      due_date: deliverable.due_date || gate.planned_date,
      status: deliverable.status || 'Not Started',
      approval_status: deliverable.approval_status || 'Not Started',
      completion_percentage: deliverable.completion_percentage || 0,
      is_required: deliverable.is_required !== undefined ? deliverable.is_required : true,
      document_reference: deliverable.document_reference,
      related_task: deliverable.related_task,
    };

    gate.deliverables = gate.deliverables || [];
    gate.deliverables.push(newDel);

    return this.updateGate(gateName, { deliverables: gate.deliverables });
  },

  async updateDeliverable(gateName: string, deliverableId: string, data: Partial<GateDeliverable>): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    const del = (gate.deliverables || []).find((d) => d.id === deliverableId);
    if (del) {
      Object.assign(del, data);
    }

    return this.updateGate(gateName, { deliverables: gate.deliverables });
  },

  async deleteDeliverable(gateName: string, deliverableId: string): Promise<Gate> {
    const gates = getStoredGates();
    const gate = gates.find((g) => g.name === gateName);
    if (!gate) throw new Error('Gate not found');

    gate.deliverables = (gate.deliverables || []).filter((d) => d.id !== deliverableId);
    return this.updateGate(gateName, { deliverables: gate.deliverables });
  },

  async addGateReview(
    gateName: string,
    review: { reviewer: string; decision: 'Approved' | 'Approved with Conditions' | 'Rejected'; comments?: string }
  ): Promise<Gate> {
    const gate = await this.getGateByName(gateName);
    const { readiness, openRequired } = calculateGateReadiness(gate);

    if (review.decision === 'Approved' && readiness < 100) {
      throw new Error(`Cannot approve gate: ${openRequired} required item(s) incomplete.`);
    }

    const reviewRecord: GateReviewRecord = {
      id: `REV-${Math.floor(100 + Math.random() * 900)}`,
      reviewer: review.reviewer || gate.gate_reviewer || gate.gate_owner,
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

    return this.updateGate(gateName, {
      reviews: gate.reviews,
      approval_status: gate.approval_status,
      status: gate.status,
      actual_date: gate.actual_date,
    });
  },

  async deleteGate(name: string): Promise<void> {
    const gates = getStoredGates().filter((g) => g.name !== name);
    saveStoredGates(gates);
  },
};

export default gateService;
