import { PDMRole, PDMPermissions, PDMUserSession } from '@/types/auth.types';

export const PDM_ROLE_PERMISSIONS: Record<PDMRole, { label: string; permissions: PDMPermissions }> = {
  admin: {
    label: 'PMO / Administrator',
    permissions: {
      manageUsers: true,
      manageProjects: true,
      manageTasks: true,
      manageDeliverables: true,
      reviewGates: true,
      approveGates: true,
      reviewDesign: true,
      approveDesign: true,
      manageWarehouse: true,
      viewReports: true,
    },
  },
  it_admin: {
    label: 'IT Administrator',
    permissions: {
      manageUsers: true,
      manageProjects: false,
      manageTasks: false,
      manageDeliverables: false,
      reviewGates: false,
      approveGates: false,
      reviewDesign: false,
      approveDesign: false,
      manageWarehouse: false,
      viewReports: true,
    },
  },
  projectmanager: {
    label: 'Project Manager',
    permissions: {
      manageUsers: false,
      manageProjects: true,
      manageTasks: true,
      manageDeliverables: true,
      reviewGates: true,
      approveGates: false,
      reviewDesign: true,
      approveDesign: false,
      manageWarehouse: false,
      viewReports: true,
    },
  },
  teammember: {
    label: 'Team Member',
    permissions: {
      manageUsers: false,
      manageProjects: false,
      manageTasks: true,
      manageDeliverables: true,
      reviewGates: false,
      approveGates: false,
      reviewDesign: false,
      approveDesign: false,
      manageWarehouse: false,
      viewReports: true,
    },
  },
  gate_reviewer: {
    label: 'Gate Reviewer / Board Member',
    permissions: {
      manageUsers: false,
      manageProjects: false,
      manageTasks: false,
      manageDeliverables: false,
      reviewGates: true,
      approveGates: true,
      reviewDesign: true,
      approveDesign: true,
      manageWarehouse: false,
      viewReports: true,
    },
  },
  warehouse_user: {
    label: 'Warehouse User',
    permissions: {
      manageUsers: false,
      manageProjects: false,
      manageTasks: false,
      manageDeliverables: false,
      reviewGates: false,
      approveGates: false,
      reviewDesign: false,
      approveDesign: false,
      manageWarehouse: true,
      viewReports: true,
    },
  },
};

export const STANDARD_PDM_USERS: Record<string, Omit<PDMUserSession, 'permissions'>> = {
  admin: {
    username: 'admin',
    email: 'admin@pdm.netlink.com',
    fullName: 'PMO Director (Admin)',
    role: 'admin',
    roleLabel: 'PMO / Administrator',
    department: 'PMO & Enterprise Governance',
    functionName: 'Program Management',
    employeeId: 'EMP-001',
    roles: ['System Manager', 'Administrator', 'PMO Admin'],
  },
  it_admin: {
    username: 'it_admin',
    email: 'itadmin@pdm.netlink.com',
    fullName: 'IT Security & User Admin',
    role: 'it_admin',
    roleLabel: 'IT Administrator',
    department: 'Information Technology',
    functionName: 'IT',
    employeeId: 'EMP-002',
    roles: ['System Administrator', 'User Manager'],
  },
  projectmanager: {
    username: 'projectmanager',
    email: 'pm@pdm.netlink.com',
    fullName: 'Alex Morgan (Project Manager)',
    role: 'projectmanager',
    roleLabel: 'Project Manager',
    department: 'Automotive Vehicle Programs',
    functionName: 'Program Management',
    employeeId: 'EMP-101',
    roles: ['Projects Manager', 'PDM PM'],
  },
  teammember: {
    username: 'teammember',
    email: 'engineer@pdm.netlink.com',
    fullName: 'David Vance (Design Engineer)',
    role: 'teammember',
    roleLabel: 'Team Member',
    department: 'Powertrain & Battery Engineering',
    functionName: 'Engineering',
    employeeId: 'EMP-204',
    roles: ['Employee', 'Engineer'],
  },
  gate_reviewer: {
    username: 'gate_reviewer',
    email: 'reviewer@pdm.netlink.com',
    fullName: 'Elena Rostova (Gate Board Chair)',
    role: 'gate_reviewer',
    roleLabel: 'Gate Reviewer / Board Member',
    department: 'Executive Engineering Board',
    functionName: 'Quality',
    employeeId: 'EMP-305',
    roles: ['Gate Approver', 'Chief Engineer'],
  },
  warehouse_user: {
    username: 'warehouse_user',
    email: 'warehouse@pdm.netlink.com',
    fullName: 'Robert Sterling (Warehouse Specialist)',
    role: 'warehouse_user',
    roleLabel: 'Warehouse User',
    department: 'Supply Chain & Logistics',
    functionName: 'Warehouse',
    employeeId: 'EMP-410',
    roles: ['Material Manager', 'Warehouse Officer'],
  },
};

/**
  * Match username/email to PDM Role and return full User Session object
  */
export function getPDMUserSession(usrInput: string): PDMUserSession {
  const normalized = usrInput.trim().toLowerCase();

  let matchedKey: keyof typeof STANDARD_PDM_USERS = 'admin';

  if (normalized.includes('it_admin') || normalized.includes('itadmin')) {
    matchedKey = 'it_admin';
  } else if (normalized.includes('warehouse') || normalized.includes('store')) {
    matchedKey = 'warehouse_user';
  } else if (normalized.includes('reviewer') || normalized.includes('approver') || normalized.includes('board') || normalized.includes('gate_reviewer')) {
    matchedKey = 'gate_reviewer';
  } else if (normalized.includes('projectmanager') || normalized.includes('pm') || normalized.includes('manager')) {
    matchedKey = 'projectmanager';
  } else if (normalized.includes('teammember') || normalized.includes('team') || normalized.includes('engineer') || normalized.includes('member')) {
    matchedKey = 'teammember';
  } else if (normalized === 'admin' || normalized.includes('pmo') || normalized.includes('administrator')) {
    matchedKey = 'admin';
  }

  const baseUser = STANDARD_PDM_USERS[matchedKey];
  const roleConfig = PDM_ROLE_PERMISSIONS[baseUser.role];

  // If user entered a specific email or username, customize details
  const isCustomInput = !STANDARD_PDM_USERS[normalized];
  const username = isCustomInput ? usrInput.split('@')[0] : baseUser.username;
  const email = usrInput.includes('@') ? usrInput : baseUser.email;
  const fullName = isCustomInput
    ? username.charAt(0).toUpperCase() + username.slice(1) + ` (${roleConfig.label})`
    : baseUser.fullName;

  return {
    username,
    email,
    fullName,
    role: baseUser.role,
    roleLabel: roleConfig.label,
    department: baseUser.department,
    functionName: baseUser.functionName,
    employeeId: baseUser.employeeId,
    permissions: roleConfig.permissions,
    roles: baseUser.roles,
  };
}
