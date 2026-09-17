import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getErpUrl = (): string => {
  return (process.env.ERP_URL || process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

function sanitizeErpResponse(resJson: any, status: number) {
  if (status < 400) return resJson;
  const jsonStr = JSON.stringify(resJson || '').toLowerCase();
  const isAuthOrWhitelisting =
    status === 401 ||
    jsonStr.includes('reportview.get') ||
    jsonStr.includes('not whitelisted') ||
    jsonStr.includes('login to access') ||
    jsonStr.includes('method not allowed') ||
    jsonStr.includes('csrftokenerror');

  if (isAuthOrWhitelisting) {
    return {
      error: 'Your ERPNext authentication session has expired. Please sign in again.',
      _error_message: 'Your ERPNext authentication session has expired. Please sign in again.',
    };
  }

  if (status === 403 || jsonStr.includes('permissionerror')) {
    return {
      error: 'You do not have permission to access this resource.',
      _error_message: 'You do not have permission to access this resource.',
    };
  }

  if (status >= 500) {
    return {
      error: 'The ERPNext server is temporarily unavailable. Please try again later.',
      _error_message: 'The ERPNext server is temporarily unavailable. Please try again later.',
    };
  }

  return resJson;
}

async function handleProxy(req: NextRequest, paramsPromise: Promise<{ path?: string[] }>) {
  try {
    const { path } = await paramsPromise;
    const subpath = path ? path.join('/') : '';
    const searchParams = req.nextUrl.search;
    const erpUrl = getErpUrl();
    const targetUrl = `${erpUrl}/api/method/${subpath}${searchParams}`;

    const apiKey = getApiKey();
    const apiSecret = getApiSecret();

    const incomingContentType = req.headers.get('content-type') || '';
    const isMultipart = incomingContentType.includes('multipart/form-data');

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (isMultipart) {
      headers['Content-Type'] = incomingContentType;
    } else {
      headers['Content-Type'] = 'application/json';
    }

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    }

    const method = req.method;
    let body: any = undefined;

    if (method !== 'GET' && method !== 'HEAD') {
      if (isMultipart) {
        body = await req.arrayBuffer();
      } else {
        try {
          const text = await req.text();
          if (text && text.trim() !== '') {
            body = text;
          }
        } catch {
          // body unreadable or empty
        }
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
      const sanitized = !erpRes.ok ? sanitizeErpResponse(resJson, erpRes.status) : resJson;
      return NextResponse.json(sanitized, { status: erpRes.status });
    }

    if (!erpRes.ok) {
      const sanitized = sanitizeErpResponse(resText, erpRes.status);
      return NextResponse.json(sanitized, { status: erpRes.status });
    }

    return new NextResponse(resText, {
      status: erpRes.status,
      headers: { 'Content-Type': erpRes.headers.get('content-type') || 'text/plain' },
    });
  } catch (error: any) {
    console.error('[Next.js ERPNext Method Proxy Error]', error);
    return NextResponse.json(
      { _error_message: 'Failed to communicate with ERPNext server' },
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
