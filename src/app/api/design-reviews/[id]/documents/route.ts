import { NextRequest, NextResponse } from 'next/server';
import {
  getDesignReviewByName,
  saveOrUpdateDesignReview,
} from '@/lib/server/design-review-store';
import { PDMUserSession } from '@/types/auth.types';

function getSessionFromRequest(req: NextRequest): PDMUserSession | null {
  try {
    const cookie = req.cookies.get('pdm_session')?.value;
    if (cookie) {
      const jsonStr = Buffer.from(cookie, 'base64').toString('utf-8');
      return JSON.parse(jsonStr);
    }
    const userCookie = req.cookies.get('pdm_user')?.value;
    if (userCookie) {
      return JSON.parse(decodeURIComponent(userCookie));
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to upload document.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const reviewId = decodeURIComponent(id || '');
    const review = getDesignReviewByName(reviewId);

    if (!review) {
      return NextResponse.json(
        { _error_message: `Design review "${reviewId}" not found.` },
        { status: 404 }
      );
    }

    const body = await req.json();
    const files = Array.isArray(body.files) ? body.files : [body];

    const updated = await saveOrUpdateDesignReview(
      review,
      files,
      session
    );

    return NextResponse.json({
      success: true,
      review: updated,
      documents: updated.documents || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to upload document to design review' },
      { status: 500 }
    );
  }
}
