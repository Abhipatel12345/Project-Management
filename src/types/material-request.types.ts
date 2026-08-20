export type MaterialRequestStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'WAREHOUSE_REVIEW'
  | 'STOCK_AVAILABLE'
  | 'RESERVED'
  | 'ISSUED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'STOCK_NOT_AVAILABLE'
  | 'PROCUREMENT_REQUIRED';

export interface MaterialAuditEntry {
  status: MaterialRequestStatus;
  timestamp: string;
  updatedBy: string;
  remarks?: string;
}

export interface MaterialRequestItem {
  name: string; // MR ID e.g. MR-2026-001
  project: string;
  projectName?: string;
  task?: string;
  requestedBy: string;
  requestedByName: string;
  materialCode: string;
  materialName: string;
  description?: string;
  quantity: number;
  requiredDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  warehouse: string;
  remarks?: string;
  status: MaterialRequestStatus;
  availableStock?: number;
  shortageQty?: number;
  issuedBy?: string;
  issuedDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  auditTrail: MaterialAuditEntry[];
  createdAt: string;
}

export interface CreateMaterialRequestInput {
  project: string;
  projectName?: string;
  task?: string;
  requestedBy: string;
  requestedByName: string;
  materialCode: string;
  materialName: string;
  description?: string;
  quantity: number;
  requiredDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  warehouse?: string;
  remarks?: string;
}
