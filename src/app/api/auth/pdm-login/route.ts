import { NextRequest, NextResponse } from 'next/server';
import { PDMRole, PDMPermissions, PDMUserSession } from '@/types/auth.types';
import { signSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const ERP_URL = (process.env.ERP_URL || process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
const API_KEY = process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
const API_SECRET = process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

/**
 * Map actual ERPNext Roles array and verified user identity to PDM workflow capability persona
 */
function derivePersonaFromERPNextRoles(
  username: string,
  erpRoles: string[]
): { role: PDMRole; roleLabel: string; permissions: PDMPermissions } {
  const normUser = username.toLowerCase().trim();
  const roleSet = new Set(erpRoles.map((r) => r.trim()));

  // 1. PDM Administrator Persona (Super Admin / PMO Director - Full Governance & Access)
  if (
    normUser === 'administrator' ||
    normUser === 'admin' ||
    normUser.includes('admin@example.com') ||
    normUser.includes('pdm.admin') ||
    normUser.includes('pmo')
  ) {
    return {
      role: 'admin',
      roleLabel: 'PMO / Administrator',
      permissions: {
        manageUsers: false,
        manageProjects: true,
        manageTasks: true,
        manageDeliverables: true,
        manageTeamMembers: true,
        manageBoardMembers: true,
        manageProjectSettings: true,
        reviewGates: true,
        approveGates: true,
        reviewDesign: true,
        approveDesign: true,
        manageWarehouse: true,
        viewReports: true,
      },
    };
  }

  // 2. IT Admin / PDM User Administrator Persona
  if (
    normUser.includes('it.admin') ||
    normUser.includes('it_admin') ||
    normUser.includes('itadmin') ||
    normUser.includes('pdm.useradmin') ||
    normUser.includes('useradmin')
  ) {
    return {
      role: 'it_admin',
      roleLabel: 'IT Admin',
      permissions: {
        manageUsers: true,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: false,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: false,
        approveGates: false,
        reviewDesign: false,
        approveDesign: false,
        manageWarehouse: false,
        viewReports: true,
      },
    };
  }

  // 3. Team Member / Projects User (Restricted Execution Access)
  if (
    normUser.includes('teammember') ||
    normUser.includes('yash') ||
    normUser === 'teammember@netlink.com'
  ) {
    return {
      role: 'teammember',
      roleLabel: 'Team Member',
      permissions: {
        manageUsers: false,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: true,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: false,
        approveGates: false,
        reviewDesign: false,
        approveDesign: false,
        manageWarehouse: false,
        viewReports: false,
      },
    };
  }

  // 4. Project Manager Persona (Full PM access, All Projects)
  if (
    normUser.includes('sarah') ||
    normUser.includes('jenkins') ||
    normUser.includes('sarahjenkins') ||
    normUser.includes('sarah.jenkins') ||
    normUser.includes('pdm.pm') ||
    normUser === 'projectmanager'
  ) {
    return {
      role: 'projectmanager',
      roleLabel: 'Project Manager',
      permissions: {
        manageUsers: false,
        manageProjects: true,
        manageTasks: true,
        manageDeliverables: true,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: true,
        approveGates: false,
        reviewDesign: true,
        approveDesign: false,
        manageWarehouse: true,
        viewReports: true,
      },
    };
  }

  // 5. Quality Reviewer / Gate Reviewer Persona
  if (
    normUser.includes('reviewer') ||
    normUser.includes('gatereviewer') ||
    normUser.includes('approver') ||
    normUser.includes('board') ||
    normUser === 'gate_reviewer'
  ) {
    return {
      role: 'gate_reviewer',
      roleLabel: 'Quality Manager / Gate Board Reviewer',
      permissions: {
        manageUsers: false,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: false,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: true,
        approveGates: true,
        reviewDesign: true,
        approveDesign: true,
        manageWarehouse: false,
        viewReports: true,
      },
    };
  }

  // 6. Warehouse User Persona
  if (
    normUser.includes('warehouse') ||
    normUser.includes('store') ||
    normUser.includes('stock') ||
    normUser === 'warehouse_user'
  ) {
    return {
      role: 'warehouse_user',
      roleLabel: 'Stock Manager / Warehouse Officer',
      permissions: {
        manageUsers: false,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: false,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: false,
        approveGates: false,
        reviewDesign: false,
        approveDesign: false,
        manageWarehouse: true,
        viewReports: true,
      },
    };
  }

  // --- ROLE FALLBACKS FOR GENERIC ACCOUNTS ---
  if (roleSet.has('PDM User Administrator') || roleSet.has('User Manager')) {
    return {
      role: 'it_admin',
      roleLabel: 'IT Admin',
      permissions: {
        manageUsers: true,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: false,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: false,
        approveGates: false,
        reviewDesign: false,
        approveDesign: false,
        manageWarehouse: false,
        viewReports: true,
      },
    };
  }

  if (roleSet.has('Projects Manager')) {
    return {
      role: 'projectmanager',
      roleLabel: 'Project Manager',
      permissions: {
        manageUsers: false,
        manageProjects: true,
        manageTasks: true,
        manageDeliverables: true,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: true,
        approveGates: false,
        reviewDesign: true,
        approveDesign: false,
        manageWarehouse: true,
        viewReports: true,
      },
    };
  }

  if (
    roleSet.has('Gate Reviewer') ||
    roleSet.has('Quality Manager') ||
    roleSet.has('Quality Reviewer') ||
    roleSet.has('Gate Board Reviewer')
  ) {
    return {
      role: 'gate_reviewer',
      roleLabel: 'Quality Manager / Gate Board Reviewer',
      permissions: {
        manageUsers: false,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: false,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: true,
        approveGates: true,
        reviewDesign: true,
        approveDesign: true,
        manageWarehouse: false,
        viewReports: true,
      },
    };
  }

  if (roleSet.has('Stock Manager') || roleSet.has('Stock User') || roleSet.has('Material Manager')) {
    return {
      role: 'warehouse_user',
      roleLabel: 'Stock Manager / Warehouse Officer',
      permissions: {
        manageUsers: false,
        manageProjects: false,
        manageTasks: false,
        manageDeliverables: false,
        manageTeamMembers: false,
        manageBoardMembers: false,
        manageProjectSettings: false,
        reviewGates: false,
        approveGates: false,
        reviewDesign: false,
        approveDesign: false,
        manageWarehouse: true,
        viewReports: true,
      },
    };
  }

  if (roleSet.has('PDM Administrator') || roleSet.has('System Manager') || roleSet.has('Administrator')) {
    return {
      role: 'admin',
      roleLabel: 'PMO / Administrator',
      permissions: {
        manageUsers: false,
        manageProjects: true,
        manageTasks: true,
        manageDeliverables: true,
        manageTeamMembers: true,
        manageBoardMembers: true,
        manageProjectSettings: true,
        reviewGates: true,
        approveGates: true,
        reviewDesign: true,
        approveDesign: true,
        manageWarehouse: true,
        viewReports: true,
      },
    };
  }

  // Default: Team Member persona
  return {
    role: 'teammember',
    roleLabel: 'Team Member',
    permissions: {
      manageUsers: false,
      manageProjects: false,
      manageTasks: false,
      manageDeliverables: true,
      manageTeamMembers: false,
      manageBoardMembers: false,
      manageProjectSettings: false,
      reviewGates: false,
      approveGates: false,
      reviewDesign: false,
      approveDesign: false,
      manageWarehouse: false,
      viewReports: false,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { _error_message: 'Invalid JSON request payload' },
        { status: 400 }
      );
    }

    const usr = (body?.usr || body?.username || '').trim();
    const pwd = (body?.pwd || body?.password || '').trim();

    // 1. Mandatory credentials validation
    if (!usr || !pwd) {
      return NextResponse.json(
        { _error_message: 'Username/email and password are required' },
        { status: 400 }
      );
    }

    // Resolve login identifier: Map common admin aliases or emails to canonical ERPNext User name
    let loginId = usr;
    const lowerUsr = usr.toLowerCase().trim();
    if (
      lowerUsr === 'admin' ||
      lowerUsr === 'administrator' ||
      lowerUsr === 'admin@pdm.netlink.com' ||
      lowerUsr === 'admin@example.com'
    ) {
      loginId = 'Administrator';
    } else {
      // Look up user in ERPNext by email or username to resolve canonical User record
      try {
        let foundName: string | null = null;
        if (usr.includes('@')) {
          const filterStr = JSON.stringify([['email', '=', usr]]);
          const searchRes = await fetch(
            `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(filterStr)}&fields=${encodeURIComponent(JSON.stringify(['name']))}`,
            {
              headers: {
                Authorization: `token ${API_KEY}:${API_SECRET}`,
                Accept: 'application/json',
              },
              cache: 'no-store',
            }
          );
          if (searchRes.ok) {
            const sJson = await searchRes.json();
            if (sJson.data && sJson.data.length > 0 && sJson.data[0].name) {
              foundName = sJson.data[0].name;
            }
          }
        }
        if (!foundName) {
          const filterStr = JSON.stringify([['username', '=', usr]]);
          const searchRes = await fetch(
            `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(filterStr)}&fields=${encodeURIComponent(JSON.stringify(['name']))}`,
            {
              headers: {
                Authorization: `token ${API_KEY}:${API_SECRET}`,
                Accept: 'application/json',
              },
              cache: 'no-store',
            }
          );
          if (searchRes.ok) {
            const sJson = await searchRes.json();
            if (sJson.data && sJson.data.length > 0 && sJson.data[0].name) {
              foundName = sJson.data[0].name;
            }
          }
        }
        if (foundName) {
          loginId = foundName;
        }
      } catch {
        // non-blocking
      }
    }

    // 2. Authoritative ERPNext / Frappe Credential Verification
    let erpLoginRes: Response;
    try {
      erpLoginRes = await fetch(`${ERP_URL}/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ usr: loginId, pwd }),
        cache: 'no-store',
      });

      // If 401 with resolved loginId and loginId !== usr, also try raw usr in case Frappe expects original input
      if (erpLoginRes.status === 401 && loginId !== usr) {
        const retryRes = await fetch(`${ERP_URL}/api/method/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ usr, pwd }),
          cache: 'no-store',
        });
        if (retryRes.ok) {
          erpLoginRes = retryRes;
        }
      }
    } catch (networkErr: any) {
      console.error('[ERPNext Auth Connection Error]', networkErr);
      return NextResponse.json(
        { _error_message: 'ERPNext authentication service is unavailable. Please check your connection.' },
        { status: 503 }
      );
    }

    // 3. Check ERPNext authentication outcome
    if (erpLoginRes.status === 401) {
      return NextResponse.json(
        { _error_message: 'Invalid username or password. Please verify your ERPNext credentials.' },
        { status: 401 }
      );
    }

    if (erpLoginRes.status === 500) {
      const errText = await erpLoginRes.text().catch(() => '');
      if (errText.includes('locked') || errText.includes('SecurityException')) {
        return NextResponse.json(
          { _error_message: 'Your account has been temporarily locked due to multiple failed login attempts. Please wait 60 seconds.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { _error_message: 'Invalid username or password. Please verify your ERPNext credentials.' },
        { status: 401 }
      );
    }

    if (!erpLoginRes.ok) {
      return NextResponse.json(
        { _error_message: 'ERPNext authentication failed. Please verify your credentials.' },
        { status: 401 }
      );
    }

    // 4. Resolve authenticated identity from ERPNext
    const setCookie = erpLoginRes.headers.get('set-cookie') || '';
    const sidMatch = setCookie.match(/sid=([^;]+)/);
    const sid = sidMatch ? sidMatch[1] : null;

    const userIdMatch = setCookie.match(/user_id=([^;]+)/);
    const cookieUserId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : null;

    let canonicalUsername = cookieUserId || loginId || usr;
    if (sid) {
      try {
        const whoamiRes = await fetch(`${ERP_URL}/api/method/frappe.auth.get_logged_user`, {
          headers: {
            Cookie: `sid=${sid}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        if (whoamiRes.ok) {
          const whoamiJson = await whoamiRes.json();
          if (whoamiJson?.message && typeof whoamiJson.message === 'string') {
            canonicalUsername = whoamiJson.message;
          }
        }
      } catch {
        // keep canonicalUsername
      }
    }

    // 5. Query user record from ERPNext to verify status and retrieve real roles
    let erpUserData: any = null;
    try {
      const userRes = await fetch(
        `${ERP_URL}/api/resource/User/${encodeURIComponent(canonicalUsername)}`,
        {
          headers: {
            Authorization: `token ${API_KEY}:${API_SECRET}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );
      if (userRes.ok) {
        const uJson = await userRes.json();
        erpUserData = uJson.data;
      }
    } catch {
      // non-blocking
    }

    if (!erpUserData) {
      try {
        const filterStr = JSON.stringify([['email', '=', canonicalUsername]]);
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
        // non-blocking
      }
    }

    // 6. Check account status & eligibility
    if (erpUserData) {
      if (erpUserData.enabled === 0 || erpUserData.enabled === false) {
        return NextResponse.json(
          { _error_message: 'Account is disabled in ERPNext. Please contact your system administrator.' },
          { status: 403 }
        );
      }
      if (erpUserData.user_type === 'Website User') {
        return NextResponse.json(
          { _error_message: 'Website users are not permitted to access the PDM system.' },
          { status: 403 }
        );
      }
    }

    // 7. Extract authoritative roles from ERPNext
    let erpRoles: string[] = [];
    if (erpUserData?.roles && Array.isArray(erpUserData.roles)) {
      erpRoles = erpUserData.roles
        .map((r: any) => (typeof r === 'string' ? r : r.role))
        .filter(Boolean);
    } else {
      try {
        const roleRes = await fetch(
          `${ERP_URL}/api/resource/User/${encodeURIComponent(erpUserData?.name || canonicalUsername)}`,
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
          erpRoles = (rJson.data?.roles || [])
            .map((r: any) => (typeof r === 'string' ? r : r.role))
            .filter(Boolean);
        }
      } catch {
        // non-blocking
      }
    }

    if (erpRoles.length === 0) {
      erpRoles = ['Projects User', 'Employee'];
    }

    const { role, roleLabel, permissions } = derivePersonaFromERPNextRoles(
      canonicalUsername,
      erpRoles
    );

    // 8. Retrieve linked Employee record if available
    let employeeId = `EMP-${Math.floor(100 + Math.random() * 900)}`;
    let department = erpUserData?.department || 'Engineering';

    try {
      const empFilter = JSON.stringify([['user_id', '=', erpUserData?.name || canonicalUsername]]);
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

    const fullName =
      role === 'it_admin'
        ? (erpUserData?.full_name || 'IT Admin')
        : (erpUserData?.full_name || erpUserData?.name || canonicalUsername.split('@')[0]);

    const email = erpUserData?.email || (canonicalUsername.includes('@') ? canonicalUsername : `${canonicalUsername}@pdm.netlink.com`);

    // 9. Construct and sign the authenticated PDM session
    const userSession: PDMUserSession = {
      username: erpUserData?.name || canonicalUsername,
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

    const signedToken = signSession(userSession);

    const response = NextResponse.json({
      message: 'Authenticated with ERPNext successfully',
      user: userSession,
    });

    response.cookies.set({
      name: 'pdm_session',
      value: signedToken,
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('[ERPNext PDM Auth Login Error]', error);
    return NextResponse.json(
      { _error_message: 'Authentication failed. Please verify your credentials.' },
      { status: 500 }
    );
  }
}
