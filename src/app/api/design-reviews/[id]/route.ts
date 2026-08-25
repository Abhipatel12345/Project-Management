import { NextRequest, NextResponse } from 'next/server';
import {
  getDesignReviewByName,
  saveOrUpdateDesignReview,
  deleteDesignReview,
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
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

    return NextResponse.json({
      success: true,
      review,
      id: review.name,
      title: review.title,
      project: review.project,
      documents: review.documents || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch design review' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const reviewId = decodeURIComponent(id || '');
    const body = await req.json();
    const { files, ...reviewData } = body;

    const updated = await saveOrUpdateDesignReview(
      {
        ...reviewData,
        name: reviewId,
      },
      files,
      session
    );

    return NextResponse.json({
      success: true,
      review: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to update design review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const reviewId = decodeURIComponent(id || '');
    const deleted = deleteDesignReview(reviewId);

    if (!deleted) {
      return NextResponse.json(
        { _error_message: `Design review "${reviewId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Design review "${reviewId}" deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to delete design review' },
      { status: 500 }
    );
  }
}
