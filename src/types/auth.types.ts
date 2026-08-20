export type PDMRole = 'admin' | 'it_admin' | 'projectmanager' | 'teammember' | 'gate_reviewer' | 'warehouse_user';

export interface PDMPermissions {
  manageUsers: boolean;
  manageProjects: boolean;
  manageTasks: boolean;
  manageDeliverables: boolean;
  reviewGates: boolean;
  approveGates: boolean;
  reviewDesign: boolean;
  approveDesign: boolean;
  manageWarehouse: boolean;
  viewReports: boolean;
}

export interface PDMUserSession {
  username: string;
  email: string;
  fullName: string;
  role: PDMRole;
  roleLabel: string;
  department: string;
  functionName?: string; // Engineering, Quality, Purchasing, Warehouse, Program Management
  employeeId?: string;
  permissions: PDMPermissions;
  roles: string[];
  userImage?: string;
}

export interface UserDetails extends PDMUserSession {}

export interface LoginPayload {
  usr: string;
  pwd: string;
}

export interface LoginResponse {
  message: string;
  user: PDMUserSession;
}
