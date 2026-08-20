import { NextRequest, NextResponse } from 'next/server';
import { PDMUserSession } from '@/types/auth.types';

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

/**
 * Safely parse server-side authenticated session cookie
 */
function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (!cookie) return null;
    const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function handleProxy(req: NextRequest, paramsPromise: Promise<{ path?: string[] }>) {
  try {
    const { path } = await paramsPromise;
    const docType = path && path[0] ? path[0] : '';
    const recordId = path && path[1] ? path[1] : '';

    const session = getSessionFromRequest(req);
    const userRole = session?.role || 'teammember';
    const userEmail = (session?.email || '').toLowerCase().trim();
    const username = (session?.username || '').toLowerCase().trim();

    // 1. IT Admin User Management Endpoint Protection
    if (docType === 'User' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
      if (userRole !== 'it_admin' && userRole !== 'admin') {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Only IT Administrators are authorized to manage user accounts.' },
          { status: 403 }
        );
      }
    }

    // 2. Project Manager Record Scoping on GET /api/resource/Project/{id}
    if (docType === 'Project' && recordId && userRole === 'projectmanager') {
      try {
        const erpUrl = getErpUrl();
        const checkRes = await fetch(`${erpUrl}/api/resource/Project/${encodeURIComponent(recordId)}`, {
          headers: {
            Authorization: `token ${getApiKey()}:${getApiSecret()}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (checkRes.ok) {
          const projData = await checkRes.json();
          const owner = (projData.data?.owner || '').toLowerCase().trim();
          const teamUsers = (projData.data?.users || []).map((u: any) => (u.user || u.email || '').toLowerCase().trim());

          const isAuthorized =
            owner === userEmail ||
            owner === username ||
            teamUsers.includes(userEmail) ||
            teamUsers.includes(username);

          if (!isAuthorized) {
            return NextResponse.json(
              { _error_message: `403 Forbidden: Access Denied. Project Manager ${session?.fullName} is not assigned to Project ${recordId}.` },
              { status: 403 }
            );
          }
        }
      } catch {
        // Fallthrough if check failed
      }
    }

    // 3. Team Member Task Scoping on GET /api/resource/Task
    let searchParams = req.nextUrl.search;
    if (docType === 'Task' && req.method === 'GET' && userRole === 'teammember') {
      // If team member queries task list without explicit assignment filter, inject user email filter
      if (!searchParams.includes('_assign') && !searchParams.includes('owner') && userEmail) {
        const filterParam = encodeURIComponent(JSON.stringify([['_assign', 'like', `%${userEmail}%`]]));
        searchParams += searchParams ? `&filters=${filterParam}` : `?filters=${filterParam}`;
      }
    }

    // 4. Warehouse Operation Protection
    if (docType === 'Material Request' && (req.method === 'PUT' || req.method === 'POST')) {
      if (userRole === 'teammember' || userRole === 'gate_reviewer') {
        return NextResponse.json(
          { _error_message: '403 Forbidden: Material Requisitions and Warehouse actions are restricted to authorized personnel.' },
          { status: 403 }
        );
      }
    }

    // Proxy request directly to ERPNext VM
    const erpUrl = getErpUrl();
    const targetUrl = `${erpUrl}/api/resource/${path ? path.join('/') : ''}${searchParams}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `token ${getApiKey()}:${getApiSecret()}`,
    };

    const method = req.method;
    let body: string | undefined = undefined;

    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const text = await req.text();
        if (text && text.trim() !== '') {
          body = text;
        }
      } catch {
        // empty body
      }
    }

    const erpRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
    });

    const resText = await erpRes.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = resText;
    }

    if (typeof resJson === 'object' && resJson !== null) {
      return NextResponse.json(resJson, { status: erpRes.status });
    }

    return new NextResponse(resText, {
      status: erpRes.status,
      headers: { 'Content-Type': erpRes.headers.get('content-type') || 'text/plain' },
    });
  } catch (error: any) {
    console.error('[Next.js ERPNext Proxy Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to communicate with ERPNext server' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function POST(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  return handleProxy(req, props.params);
}
