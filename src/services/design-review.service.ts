import api from './api';
import {
  DesignReview,
  DesignReviewListQueryParams,
  DesignReviewListResponse,
  DesignReviewSummary,
  ReviewFinding,
} from '@/types/design-review.types';

const STORAGE_KEY = 'pdm_design_reviews_v1';

const getInitialDesignReviews = (): DesignReview[] => [
  {
    name: 'DR-2026-00001',
    title: 'Door Handle Exterior Surface Concept & Ergonomics Review',
    project: 'PROJ-0001',
    review_type: 'Concept Review',
    review_date: '2026-08-04',
    reviewer: 'Lead Ergonomics Engineer',
    participants: ['Administrator', 'Design Lead', 'Quality Engineer'],
    status: 'Completed',
    approval_status: 'Approved',
    description: 'Review of Class-A surface geometry, flushness tolerances, and tactile feedback.',
    notes: 'Approved with requirement to perform thermal cycle test.',
    findings: [
      {
        id: 'FND-001',
        description: 'Check latch actuation clearance during extreme cold (-30C).',
        severity: 'High',
        assigned_to: 'Thermal Engineer',
        due_date: '2026-08-15',
        status: 'In Progress',
        comments: 'Simulation model being configured in ANSYS.',
      },
      {
        id: 'FND-002',
        description: 'Verify chrome plating thickness for anti-corrosion compliance.',
        severity: 'Medium',
        assigned_to: 'Materials Specialist',
        due_date: '2026-08-18',
        status: 'Resolved',
        comments: 'Specification updated to ISO 9227 salt spray standard.',
      },
    ],
  },
  {
    name: 'DR-2026-00002',
    title: 'EV Battery Pack Thermal Manifold Detailed Design Review',
    project: 'PROJ-0002',
    review_type: 'Detailed Design Review',
    review_date: '2026-08-12',
    reviewer: 'Chief Powertrain Architect',
    participants: ['HV Safety Lead', 'Thermal Specialist', 'Systems Engineer'],
    status: 'In Progress',
    approval_status: 'Under Review',
    description: 'Detailed CFD flow analysis and seal gasket compression review for coolant distribution.',
    notes: 'Focus on pressure drop across cell cold plates.',
    findings: [
      {
        id: 'FND-003',
        description: 'Coolant manifold inlet nozzle pressure drop exceeds target by 12%.',
        severity: 'Critical',
        assigned_to: 'Fluid Dynamics Lead',
        due_date: '2026-08-14',
        status: 'Open',
        comments: 'Redesigning nozzle internal chamfer radius.',
      },
    ],
  },
  {
    name: 'DR-2026-00003',
    title: 'Pre-Production Chassis Frame Weldment Validation Review',
    project: 'PROJ-0001',
    review_type: 'Design Validation Review',
    review_date: '2026-08-20',
    reviewer: 'Chassis System Lead',
    participants: ['Manufacturing Lead', 'Weld Specialist'],
    status: 'Planned',
    approval_status: 'Pending',
    description: 'Robotic welding cell access and non-destructive testing protocol sign-off.',
    findings: [],
  },
];

const getStoredReviews = (): DesignReview[] => {
  if (typeof window === 'undefined') return getInitialDesignReviews();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDesignReviews();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialDesignReviews();
  }
};

const saveStoredReviews = (reviews: DesignReview[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    } catch {
      // fallback
    }
  }
};

export const designReviewService = {
  async getDesignReviews(params: DesignReviewListQueryParams = {}): Promise<DesignReviewListResponse> {
    let reviews = getStoredReviews();

    // Filtering
    if (params.project && params.project !== 'ALL') {
      reviews = reviews.filter((r) => r.project === params.project);
    }

    if (params.status && params.status !== 'ALL') {
      reviews = reviews.filter((r) => r.status === params.status);
    }

    if (params.review_type && params.review_type !== 'ALL') {
      reviews = reviews.filter((r) => r.review_type === params.review_type);
    }

    if (params.approval_status && params.approval_status !== 'ALL') {
      reviews = reviews.filter((r) => r.approval_status === params.approval_status);
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      reviews = reviews.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.project && r.project.toLowerCase().includes(q)) ||
          (r.reviewer && r.reviewer.toLowerCase().includes(q))
      );
    }

    // Calculate total open findings
    const openFindingsCount = reviews.reduce((acc, r) => {
      const openInReview = (r.findings || []).filter((f) => f.status === 'Open' || f.status === 'In Progress').length;
      return acc + openInReview;
    }, 0);

    const summary: DesignReviewSummary = {
      totalReviews: reviews.length,
      plannedReviews: reviews.filter((r) => r.status === 'Planned').length,
      inProgressReviews: reviews.filter((r) => r.status === 'In Progress').length,
      approvedReviews: reviews.filter((r) => r.approval_status === 'Approved' || r.approval_status === 'Approved with Conditions').length,
      rejectedReviews: reviews.filter((r) => r.approval_status === 'Rejected').length,
      openFindings: openFindingsCount,
    };

    return {
      reviews,
      totalCount: reviews.length,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      summary,
    };
  },

  async createDesignReview(data: Partial<DesignReview>): Promise<DesignReview> {
    const nextId = `DR-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newReview: DesignReview = {
      name: nextId,
      title: data.title || 'Untitled Design Review',
      project: data.project || '',
      review_type: data.review_type || 'Concept Review',
      review_date: data.review_date || new Date().toISOString().split('T')[0],
      reviewer: data.reviewer || 'Administrator',
      participants: data.participants || [],
      status: data.status || 'Planned',
      approval_status: data.approval_status || 'Pending',
      description: data.description || '',
      notes: data.notes || '',
      findings: data.findings || [],
    };

    const reviews = getStoredReviews();
    reviews.unshift(newReview);
    saveStoredReviews(reviews);

    return newReview;
  },

  async updateDesignReview(name: string, data: Partial<DesignReview>): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const index = reviews.findIndex((r) => r.name === name);
    let updated: DesignReview;

    if (index !== -1) {
      reviews[index] = { ...reviews[index], ...data, modified: new Date().toISOString() };
      updated = reviews[index];
    } else {
      updated = {
        name,
        title: data.title || 'Design Review',
        review_type: data.review_type || 'Concept Review',
        reviewer: 'Administrator',
        status: data.status || 'Planned',
        approval_status: data.approval_status || 'Pending',
        findings: [],
        ...data,
      };
      reviews.unshift(updated);
    }

    saveStoredReviews(reviews);
    return updated;
  },

  async addReviewFinding(reviewName: string, finding: Partial<ReviewFinding>): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const review = reviews.find((r) => r.name === reviewName);
    if (!review) throw new Error('Design review not found');

    const newFinding: ReviewFinding = {
      id: `FND-${Math.floor(100 + Math.random() * 900)}`,
      description: finding.description || 'Finding description',
      severity: finding.severity || 'Medium',
      assigned_to: finding.assigned_to || 'Unassigned',
      due_date: finding.due_date || new Date().toISOString().split('T')[0],
      status: finding.status || 'Open',
      comments: finding.comments || '',
      created_at: new Date().toISOString(),
    };

    review.findings = review.findings || [];
    review.findings.push(newFinding);

    saveStoredReviews(reviews);
    return review;
  },

  async updateReviewFinding(reviewName: string, findingId: string, data: Partial<ReviewFinding>): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const review = reviews.find((r) => r.name === reviewName);
    if (!review) throw new Error('Design review not found');

    const finding = (review.findings || []).find((f) => f.id === findingId);
    if (finding) {
      Object.assign(finding, data);
    }

    saveStoredReviews(reviews);
    return review;
  },

  async deleteDesignReview(name: string): Promise<void> {
    const reviews = getStoredReviews().filter((r) => r.name !== name);
    saveStoredReviews(reviews);
  },
};

export default designReviewService;
