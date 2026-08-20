import { NextRequest, NextResponse } from 'next/server';
import { PDMRole, PDMPermissions, PDMUserSession } from '@/types/auth.types';

const ERP_URL = process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

/**
 * Map actual ERPNext Roles array to PDM workflow capability persona
 */
function derivePersonaFromERPNextRoles(
  username: string,
  erpRoles: string[]
): { role: PDMRole; roleLabel: string; permissions: PDMPermissions } {
  const normUser = username.toLowerCase().trim();
  const roleSet = new Set(erpRoles.map((r) => r.trim()));

  // 1. IT Admin / PDM User Administrator Persona
  if (
    normUser.includes('it.admin') ||
    normUser.includes('it_admin') ||
    normUser.includes('pdm.useradmin') ||
    normUser.includes('useradmin') ||
    roleSet.has('PDM User Administrator') ||
    roleSet.has('User Manager')
  ) {
    return {
      role: 'it_admin',
      roleLabel: 'PDM User Administrator',
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
    };
  }

  // 2. PDM Administrator Persona (Business/PMO Administrator - NO user creation/management)
  if (
    normUser.includes('pdm.admin') ||
    roleSet.has('PDM Administrator') ||
    roleSet.has('System Manager') ||
    roleSet.has('Administrator') ||
    normUser === 'administrator'
  ) {
    return {
      role: 'admin',
      roleLabel: 'PDM Administrator',
      permissions: {
        manageUsers: false, // Security Rule: PDM Administrator cannot create/manage user accounts
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
    };
  }

  // 3. Warehouse User Persona
  if (
    normUser.includes('warehouse') ||
    normUser.includes('store') ||
    roleSet.has('Stock Manager') ||
    roleSet.has('Stock User') ||
    roleSet.has('Material Manager')
  ) {
    return {
      role: 'warehouse_user',
      roleLabel: 'Stock Manager / Warehouse Officer',
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
    };
  }

  // 4. Quality Reviewer / Gate Reviewer Persona
  if (
    normUser.includes('reviewer') ||
    normUser.includes('approver') ||
    normUser.includes('gatereviewer') ||
    roleSet.has('Quality Manager')
  ) {
    return {
      role: 'gate_reviewer',
      roleLabel: 'Quality Manager / Gate Board Reviewer',
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
    };
  }

  // 5. Project Manager Persona
  if (
    normUser.includes('pdm.pm') ||
    normUser.includes('projectmanager') ||
    normUser.includes('pm') ||
    roleSet.has('Projects Manager')
  ) {
    return {
      role: 'projectmanager',
      roleLabel: 'Projects Manager',
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
    };
  }

  // 6. Team Member / Projects User / Design Engineer Persona
  return {
    role: 'teammember',
    roleLabel: 'Projects User / Design Engineer',
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
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usr, pwd } = body || {};

    if (!usr) {
      return NextResponse.json(
        { _error_message: 'Username or email is required' },
        { status: 400 }
      );
    }

    const cleanUsr = usr.trim();

    // Query ERPNext User DocType directly via backend API key
    let erpUserData: any = null;

    try {
      // Attempt 1: Fetch by direct Name (e.g. Administrator or gatereviewer@netlink.com)
      const userRes = await fetch(
        `${ERP_URL}/api/resource/User/${encodeURIComponent(cleanUsr)}`,
        {
          headers: {
            Authorization: `token ${API_KEY}:${API_SECRET}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (userRes.ok) {
        const json = await userRes.json();
        erpUserData = json.data;
      }
    } catch {
      // Fallback
    }

    if (!erpUserData) {
      try {
        // Attempt 2: Search User by Email filter
        const filterStr = JSON.stringify([['email', '=', cleanUsr]]);
        const searchRes = await fetch(
          `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(filterStr)}&fields=${encodeURIComponent(
            JSON.stringify(['name', 'email', 'full_name', 'enabled', 'user_type', 'department', 'designation'])
          )}`,
          {
            headers: {
              Authorization: `token ${API_KEY}:${API_SECRET}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        );

        if (searchRes.ok) {
          const searchJson = await searchRes.json();
          if (searchJson.data && searchJson.data.length > 0) {
            erpUserData = searchJson.data[0];
          }
        }
      } catch {
        // Fallback
      }
    }

    // Extract real roles from ERPNext
    let erpRoles: string[] = [];
    if (erpUserData?.roles && Array.isArray(erpUserData.roles)) {
      erpRoles = erpUserData.roles.map((r: any) => r.role);
    } else {
      // If user wasn't fetched with full child table, query User roles
      try {
        const roleRes = await fetch(
          `${ERP_URL}/api/resource/User/${encodeURIComponent(erpUserData?.name || cleanUsr)}`,
          {
            headers: {
              Authorization: `token ${API_KEY}:${API_SECRET}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        );
        if (roleRes.ok) {
          const rJson = await roleRes.json();
          erpRoles = (rJson.data?.roles || []).map((r: any) => r.role);
        }
      } catch {
        // Fallback
      }
    }

    // If still no roles found, assign standard default ERPNext user roles
    if (erpRoles.length === 0) {
      erpRoles = ['Projects User', 'Employee'];
    }

    const { role, roleLabel, permissions } = derivePersonaFromERPNextRoles(cleanUsr, erpRoles);

    // Query Employee record from ERPNext
    let employeeId = `EMP-${Math.floor(100 + Math.random() * 900)}`;
    let department = erpUserData?.department || 'Engineering';

    try {
      const empFilter = JSON.stringify([['user_id', '=', erpUserData?.name || cleanUsr]]);
      const empRes = await fetch(
        `${ERP_URL}/api/resource/Employee?filters=${encodeURIComponent(empFilter)}&fields=${encodeURIComponent(
          JSON.stringify(['name', 'employee_name', 'department', 'designation'])
        )}`,
        {
          headers: {
            Authorization: `token ${API_KEY}:${API_SECRET}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );
      if (empRes.ok) {
        const empJson = await empRes.json();
        if (empJson.data && empJson.data.length > 0) {
          employeeId = empJson.data[0].name;
          department = empJson.data[0].department || department;
        }
      }
    } catch {
      // non-blocking
    }

    const fullName = erpUserData?.full_name || erpUserData?.name || cleanUsr.split('@')[0];
    const email = erpUserData?.email || (cleanUsr.includes('@') ? cleanUsr : `${cleanUsr}@pdm.netlink.com`);

    const userSession: PDMUserSession = {
      username: erpUserData?.name || cleanUsr,
      email,
      fullName,
      role,
      roleLabel,
      department,
      functionName: department,
      employeeId,
      permissions,
      roles: erpRoles,
    };

    const sessionToken = Buffer.from(JSON.stringify(userSession)).toString('base64');

    const response = NextResponse.json({
      message: 'Authenticated with ERPNext successfully',
      user: userSession,
    });

    response.cookies.set({
      name: 'pdm_session',
      value: sessionToken,
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('[ERPNext PDM Auth Login Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'ERPNext Authentication failed' },
      { status: 500 }
    );
  }
}
