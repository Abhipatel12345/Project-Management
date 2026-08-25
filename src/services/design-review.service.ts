import api from './api';
import {
  DesignReview,
  DesignReviewListQueryParams,
  DesignReviewListResponse,
  DesignReviewSummary,
  ReviewFinding,
} from '@/types/design-review.types';

export const designReviewService = {
  /**
   * Fetch paginated design reviews with filters and summary
   */
  async getDesignReviews(params: DesignReviewListQueryParams = {}): Promise<DesignReviewListResponse> {
    try {
      const res = await api.get<DesignReviewListResponse>('/api/design-reviews', { params });
      if (res && res.reviews) {
        return res;
      }
    } catch (err) {
      console.warn('[designReviewService] Failed to fetch from API, using fallback', err);
    }

    return {
      reviews: [],
      totalCount: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      summary: {
        totalReviews: 0,
        plannedReviews: 0,
        inProgressReviews: 0,
        approvedReviews: 0,
        rejectedReviews: 0,
        openFindings: 0,
      },
    };
  },

  /**
   * Fetch single design review by ID/name, fully hydrated with attached documents
   */
  async getDesignReviewByName(name: string): Promise<DesignReview> {
    const res = await api.get<{ success: boolean; review: DesignReview }>(
      `/api/design-reviews/${encodeURIComponent(name)}`
    );
    if (res && res.review) {
      return res.review;
    }
    throw new Error(`Design review ${name} not found`);
  },

  /**
   * Create a new design review with optional attached binary files
   */
  async createDesignReview(
    data: Partial<DesignReview> & {
      files?: { name: string; size: number; dataUrl?: string; mimeType?: string }[];
    }
  ): Promise<DesignReview> {
    const res = await api.post<{ success: boolean; review: DesignReview }>('/api/design-reviews', data);
    if (res && res.review) {
      return res.review;
    }
    throw new Error('Failed to create design review');
  },

  /**
   * Update an existing design review
   */
  async updateDesignReview(
    name: string,
    data: Partial<DesignReview> & {
      files?: { name: string; size: number; dataUrl?: string; mimeType?: string }[];
    }
  ): Promise<DesignReview> {
    const res = await api.put<{ success: boolean; review: DesignReview }>(
      `/api/design-reviews/${encodeURIComponent(name)}`,
      data
    );
    if (res && res.review) {
      return res.review;
    }
    throw new Error('Failed to update design review');
  },

  /**
   * Attach a document directly to an existing design review
   */
  async uploadReviewDocument(
    name: string,
    file: { name: string; size: number; dataUrl: string; mimeType?: string }
  ): Promise<DesignReview> {
    const res = await api.post<{ success: boolean; review: DesignReview }>(
      `/api/design-reviews/${encodeURIComponent(name)}/documents`,
      file
    );
    if (res && res.review) {
      return res.review;
    }
    throw new Error('Failed to attach document to design review');
  },

  /**
   * Add an action item / finding to a design review
   */
  async addFinding(reviewName: string, finding: Partial<ReviewFinding>): Promise<DesignReview> {
    const currentReview = await this.getDesignReviewByName(reviewName);
    const newFinding: ReviewFinding = {
      id: `FND-${Math.floor(100 + Math.random() * 900)}`,
      description: finding.description || 'Action Item Finding',
      severity: finding.severity || 'Medium',
      assigned_to: finding.assigned_to || currentReview.reviewer,
      due_date: finding.due_date || currentReview.review_date,
      status: finding.status || 'Open',
      comments: finding.comments || '',
      created_at: new Date().toISOString(),
    };

    const updatedFindings = [...(currentReview.findings || []), newFinding];
    return this.updateDesignReview(reviewName, { findings: updatedFindings });
  },

  async addReviewFinding(reviewName: string, finding: Partial<ReviewFinding>): Promise<DesignReview> {
    return this.addFinding(reviewName, finding);
  },

  /**
   * Update finding status or details
   */
  async updateFinding(
    reviewName: string,
    findingId: string,
    data: Partial<ReviewFinding>
  ): Promise<DesignReview> {
    const currentReview = await this.getDesignReviewByName(reviewName);
    const updatedFindings = (currentReview.findings || []).map((f) =>
      f.id === findingId ? { ...f, ...data } : f
    );
    return this.updateDesignReview(reviewName, { findings: updatedFindings });
  },

  /**
   * Delete a finding
   */
  async deleteFinding(reviewName: string, findingId: string): Promise<DesignReview> {
    const currentReview = await this.getDesignReviewByName(reviewName);
    const updatedFindings = (currentReview.findings || []).filter((f) => f.id !== findingId);
    return this.updateDesignReview(reviewName, { findings: updatedFindings });
  },

  /**
   * Delete a design review
   */
  async deleteDesignReview(name: string): Promise<void> {
    await api.delete(`/api/design-reviews/${encodeURIComponent(name)}`);
  },
};

export default designReviewService;
