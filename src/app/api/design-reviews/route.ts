import { NextRequest, NextResponse } from 'next/server';
import {
  loadAllDesignReviews,
  saveOrUpdateDesignReview,
  hydrateReviewDocuments,
} from '@/lib/server/design-review-store';
import { PDMUserSession } from '@/types/auth.types';
import { DesignReviewSummary } from '@/types/design-review.types';

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

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const project = searchParams.get('project');
    const status = searchParams.get('status');
    const review_type = searchParams.get('review_type');
    const approval_status = searchParams.get('approval_status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    let reviews = loadAllDesignReviews().map(hydrateReviewDocuments);

    if (project && project !== 'ALL') {
      const pNorm = project.toLowerCase().trim();
      reviews = reviews.filter((r) => (r.project || '').toLowerCase().trim() === pNorm);
    }

    if (status && status !== 'ALL') {
      reviews = reviews.filter((r) => r.status === status);
    }

    if (review_type && review_type !== 'ALL') {
      reviews = reviews.filter((r) => r.review_type === review_type);
    }

    if (approval_status && approval_status !== 'ALL') {
      reviews = reviews.filter((r) => r.approval_status === approval_status);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      reviews = reviews.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.project && r.project.toLowerCase().includes(q)) ||
          (r.reviewer && r.reviewer.toLowerCase().includes(q))
      );
    }

    const openFindingsCount = reviews.reduce((acc, r) => {
      const openInReview = (r.findings || []).filter(
        (f) => f.status === 'Open' || f.status === 'In Progress'
      ).length;
      return acc + openInReview;
    }, 0);

    const summary: DesignReviewSummary = {
      totalReviews: reviews.length,
      plannedReviews: reviews.filter((r) => r.status === 'Planned').length,
      inProgressReviews: reviews.filter((r) => r.status === 'In Progress').length,
      approvedReviews: reviews.filter((r) => r.approval_status === 'Approved').length,
      rejectedReviews: reviews.filter((r) => r.approval_status === 'Rejected').length,
      openFindings: openFindingsCount,
    };

    const startIndex = (page - 1) * pageSize;
    const paginated = reviews.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      reviews: paginated,
      totalCount: reviews.length,
      page,
      pageSize,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to fetch design reviews' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { _error_message: '401 Unauthorized: Session required to create design review.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { files, ...reviewData } = body;

    const createdReview = await saveOrUpdateDesignReview(reviewData, files, session);

    return NextResponse.json({
      success: true,
      review: createdReview,
      message: `Design Review ${createdReview.name} created successfully with ${createdReview.documents?.length || 0} attached documents.`,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { _error_message: error.message || 'Failed to create design review' },
      { status: 500 }
    );
  }
}
