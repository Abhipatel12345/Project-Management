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

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path } = await props.params;
    const subpath = path ? path.join('/') : '';
    const erpUrl = getErpUrl();
    const targetUrl = `${erpUrl}/files/${subpath}`;

    const headers: Record<string, string> = {
      Authorization: `token ${getApiKey()}:${getApiSecret()}`,
    };

    const erpRes = await fetch(targetUrl, {
      headers,
      cache: 'no-store',
    });

    if (!erpRes.ok) {
      // Fallback: check local task attachments storage
      const { findLocalTaskAttachment } = await import('@/lib/server/task-attachment-store');
      const local = findLocalTaskAttachment(subpath);
      if (local) {
        const fs = await import('fs');
        const localBuffer = fs.readFileSync(local.filePath);
        return new NextResponse(localBuffer, {
          status: 200,
          headers: {
            'Content-Type': local.mimeType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
      return new NextResponse('File not found', { status: erpRes.status });
    }

    const contentType = erpRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await erpRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[Files Stream Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
