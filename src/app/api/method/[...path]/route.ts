import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

async function handleProxy(req: NextRequest, paramsPromise: Promise<{ path?: string[] }>) {
  try {
    const { path } = await paramsPromise;
    const subpath = path ? path.join('/') : '';
    const searchParams = req.nextUrl.search;
    const erpUrl = getErpUrl();
    const targetUrl = `${erpUrl}/api/method/${subpath}${searchParams}`;

    const apiKey = getApiKey();
    const apiSecret = getApiSecret();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
    }

    const method = req.method;
    let body: string | undefined = undefined;

    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const text = await req.text();
        if (text && text.trim() !== '') {
          body = text;
        }
      } catch {
        // body unreadable or empty
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
    console.error('[Next.js ERPNext Method Proxy Error]', error);
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
