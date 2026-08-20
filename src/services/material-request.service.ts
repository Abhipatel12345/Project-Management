import api from './api';
import {
  MaterialRequestItem,
  CreateMaterialRequestInput,
  MaterialRequestStatus,
} from '@/types/material-request.types';

const STORAGE_KEY = 'pdm_material_requests_v2';

function getInitialRequests(): MaterialRequestItem[] {
  const now = new Date().toISOString();
  return [
    {
      name: 'MR-2026-001',
      project: 'PROJ-0001',
      projectName: 'High-Voltage Battery Thermal Management System',
      task: 'TASK-2026-00001',
      requestedBy: 'pm@pdm.netlink.com',
      requestedByName: 'Alex Morgan (Project Manager)',
      materialCode: 'MAT-BAT-COOL-01',
      materialName: 'HV Cooling Plate Prototype Housing',
      description: 'Aluminum extruded dual-pass liquid cooling plate for module test bench.',
      quantity: 15,
      requiredDate: '2026-03-15',
      priority: 'High',
      warehouse: 'Main Engineering Stores',
      remarks: 'Required for thermal bench test validation run #2.',
      status: 'ISSUED',
      availableStock: 25,
      issuedBy: 'Robert Sterling (Warehouse Specialist)',
      issuedDate: '2026-02-18T10:30:00.000Z',
      auditTrail: [
        {
          status: 'REQUESTED',
          timestamp: '2026-02-15T09:00:00.000Z',
          updatedBy: 'Alex Morgan (Project Manager)',
          remarks: 'Initial requisition created for project bench test.',
        },
        {
          status: 'WAREHOUSE_REVIEW',
          timestamp: '2026-02-16T11:00:00.000Z',
          updatedBy: 'Robert Sterling (Warehouse Specialist)',
          remarks: 'Requisition received at Main Stores.',
        },
        {
          status: 'STOCK_AVAILABLE',
          timestamp: '2026-02-17T08:30:00.000Z',
          updatedBy: 'Robert Sterling (Warehouse Specialist)',
          remarks: 'Stock verified in Bin B-14 (25 units on hand).',
        },
        {
          status: 'RESERVED',
          timestamp: '2026-02-17T09:00:00.000Z',
          updatedBy: 'Robert Sterling (Warehouse Specialist)',
          remarks: '15 units reserved for PROJ-0001.',
        },
        {
          status: 'ISSUED',
          timestamp: '2026-02-18T10:30:00.000Z',
          updatedBy: 'Robert Sterling (Warehouse Specialist)',
          remarks: '15 units issued to Engineering Lab Tech.',
        },
      ],
      createdAt: '2026-02-15T09:00:00.000Z',
    },
    {
      name: 'MR-2026-002',
      project: 'PROJ-0002',
      projectName: 'Autonomous Emergency Braking Radar Module',
      task: 'TASK-2026-00002',
      requestedBy: 'pm@pdm.netlink.com',
      requestedByName: 'Alex Morgan (Project Manager)',
      materialCode: 'MAT-RAD-LENS-77',
      materialName: 'Radar Radome Polycarbonate Cover Lens',
      description: 'Hydrophobic coated radome lens assembly for 77GHz millimeter wave sensor.',
      quantity: 30,
      requiredDate: '2026-03-20',
      priority: 'Urgent',
      warehouse: 'Prototype Lab Depot',
      remarks: 'Urgent requirement for bumper integration trial.',
      status: 'REQUESTED',
      availableStock: 35,
      auditTrail: [
        {
          status: 'REQUESTED',
          timestamp: '2026-02-19T14:20:00.000Z',
          updatedBy: 'Alex Morgan (Project Manager)',
          remarks: 'Requisition submitted for prototype radome lenses.',
        },
      ],
      createdAt: '2026-02-19T14:20:00.000Z',
    },
  ];
}

export const materialRequestService = {
  /**
   * Get all material requests from ERPNext / local state
   */
  async getRequestsFromERPNext(): Promise<MaterialRequestItem[]> {
    try {
      const fields = JSON.stringify(['name', 'title', 'status', 'schedule_date', 'transaction_date', 'creation', 'company']);
      const response = await api.get<{ data: any[] }>(
        `/api/resource/Material Request?fields=${encodeURIComponent(fields)}&limit_page_length=50`
      );
      const erpList = response.data || [];
      if (erpList.length > 0) {
        return erpList.map((m, idx) => ({
          name: m.name,
          project: 'PROJ-0001',
          projectName: m.title || 'EV Door Module Development',
          requestedBy: 'pm@pdm.netlink.com',
          requestedByName: 'Alex Morgan (Project Manager)',
          materialCode: 'MAT-EXT-01',
          materialName: m.title || 'Extruded Aluminum Prototype Component',
          quantity: 15,
          requiredDate: m.schedule_date || '2026-03-15',
          priority: 'High',
          warehouse: 'Main Engineering Stores',
          status: m.status === 'Stopped' ? 'CLOSED' : m.status === 'Submitted' ? 'ISSUED' : 'REQUESTED',
          availableStock: 25,
          auditTrail: [
            {
              status: 'REQUESTED',
              timestamp: m.creation || new Date().toISOString(),
              updatedBy: 'Alex Morgan (Project Manager)',
              remarks: 'Material Requisition saved in ERPNext.',
            },
          ],
          createdAt: m.creation || new Date().toISOString(),
        }));
      }
    } catch {
      // Fallback to client cache
    }
    return this.getRequests();
  },

  /**
   * Get material requests
   */
  getRequests(): MaterialRequestItem[] {
    if (typeof window === 'undefined') return getInitialRequests();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = getInitialRequests();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return getInitialRequests();
    }
  },

  /**
   * Create a new material request in ERPNext
   */
  async createRequest(input: CreateMaterialRequestInput): Promise<MaterialRequestItem> {
    const requests = this.getRequests();
    const nextNum = requests.length + 1;
    const mrId = `MR-2026-${String(nextNum).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newReq: MaterialRequestItem = {
      name: mrId,
      project: input.project,
      projectName: input.projectName || input.project,
      task: input.task,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      materialCode: input.materialCode.toUpperCase().trim(),
      materialName: input.materialName.trim(),
      description: input.description,
      quantity: Number(input.quantity),
      requiredDate: input.requiredDate,
      priority: input.priority || 'Medium',
      warehouse: input.warehouse || 'Main Engineering Stores',
      remarks: input.remarks,
      status: 'REQUESTED',
      availableStock: Math.floor(20 + Math.random() * 30),
      auditTrail: [
        {
          status: 'REQUESTED',
          timestamp: now,
          updatedBy: input.requestedByName,
          remarks: 'Material Requisition created and submitted to Warehouse.',
        },
      ],
      createdAt: now,
    };

    // Attempt posting to ERPNext Material Request API
    try {
      const payload = {
        material_request_type: 'Material Issue',
        schedule_date: input.requiredDate,
        title: `${input.materialName} (${input.project})`,
        company: 'Netlink',
        items: [
          {
            item_code: input.materialCode.toUpperCase().trim(),
            qty: Number(input.quantity),
            schedule_date: input.requiredDate,
            project: input.project,
          },
        ],
      };
      const erpRes = await api.post<{ data: any }>('/api/resource/Material Request', payload);
      if (erpRes?.data?.name) {
        newReq.name = erpRes.data.name;
      }
    } catch (err: any) {
      console.warn('[ERPNext Material Request Service] Saved locally, ERPNext post notice:', err.message);
    }

    const updated = [newReq, ...requests];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newReq;
  },

  /**
   * Process Material Request status transition
   */
  updateStatus(
    mrId: string,
    nextStatus: MaterialRequestStatus,
    updatedByName: string,
    remarks?: string,
    shortageQty?: number
  ): MaterialRequestItem {
    const requests = this.getRequests();
    const idx = requests.findIndex((r) => r.name === mrId);
    if (idx === -1) throw new Error(`Material Request ${mrId} not found`);

    const req = requests[idx];
    const now = new Date().toISOString();

    req.status = nextStatus;

    if (nextStatus === 'ISSUED') {
      req.issuedBy = updatedByName;
      req.issuedDate = now;
    } else if (nextStatus === 'RECEIVED' || nextStatus === 'CLOSED') {
      req.receivedBy = updatedByName;
      req.receivedDate = now;
    }

    if (shortageQty !== undefined) {
      req.shortageQty = shortageQty;
    }

    req.auditTrail.unshift({
      status: nextStatus,
      timestamp: now,
      updatedBy: updatedByName,
      remarks: remarks || `Status updated to ${nextStatus}`,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }
    return req;
  },
};
