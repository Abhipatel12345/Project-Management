import api from './api';
import {
  DesignReview,
  DesignReviewListQueryParams,
  DesignReviewListResponse,
  DesignReviewSummary,
  ReviewFinding,
} from '@/types/design-review.types';

const STORAGE_KEY = 'pdm_design_reviews_v1';

const getInitialDesignReviews = (): DesignReview[] => {
  const reviewTypes: DesignReview['review_type'][] = [
    'Concept Review',
    'Detailed Design Review',
    'Design Validation Review',
    'Tooling Sign-off Review',
  ];

  const projects = [
    'PROJ-0001', 'PROJ-0002', 'PROJ-0003', 'PROJ-0004', 'PROJ-0005',
    'PROJ-0006', 'PROJ-0007', 'PROJ-0008', 'PROJ-0009', 'PROJ-0010',
    'PROJ-0011', 'PROJ-0012', 'PROJ-0013', 'PROJ-0014', 'PROJ-0015',
    'PROJ-0016', 'PROJ-0017', 'PROJ-0018', 'PROJ-0019', 'PROJ-0020',
    'PROJ-0021', 'PROJ-0022', 'PROJ-0023', 'PROJ-0024', 'PROJ-0025',
    'PROJ-0026', 'PROJ-0027', 'PROJ-0028', 'PROJ-0029', 'PROJ-0030',
  ];

  const titles = [
    'Door Handle Exterior Surface Concept & Ergonomics Review',
    'EV Battery Pack Thermal Manifold Detailed Design Review',
    '800V SiC Inverter PCB Layout & Creepage Distance Review',
    'Underbody Battery Tray Side Impact Crash FEA Review',
    'Autonomous Radar Alignment Bracket GD&T Stackup Review',
    'Active Suspension ECU Control Loop C++ Firmware Review',
    'Brake-by-Wire Electro-Hydraulic Pressure Valve Review',
    'Steering Column Torque Sensor EMC Shielding Review',
    'Fender Stamping Die Surface Springback Compensation Review',
    'Instrument Cluster Anti-Glare Glass Optics Review',
    'Cabin HEPA Air Purifier Filter Flow Pressure Drop Review',
    'Matrix LED Headlamp Aluminum Heatsink Thermal CFD Review',
    'Rear Tail Lightbar Acrylic Light Guide Speos Simulation',
    'Seat Belt Pyrotechnic Pretensioner Deployment Safety Review',
    'Electric Motor Stator Water Jacket Cooling Sleeve Review',
    'Dual-Clutch Transmission Oil Cooler Braze Leak Review',
    'Thermal Heat Pump Refrigerant Valve Stepper Control Review',
    '5G TCU Cellular Antenna Impedance & Radiation Review',
    'Cybersecurity Gateway ISO 21434 Threat Analysis Review',
    'Charge Port Motorized Door Ice Breaking Force Review',
    'Electric Power Steering Motor Cogging Torque Harmonic Review',
    'Side Curtain Airbag -40C Cold Temperature Inflation Review',
    'Driver Monitoring Camera 940nm IR LED Eye Safety Review',
    'TPMS Receiver 433MHz Antenna Radiated Immunity Review',
    'Panoramic Sunroof Cable Drive Acoustic Vibration Review',
    'Rain-Sensing Wiper Pantograph Linkage Durability Review',
    'AVAS External Acoustic Speaker Harmonic Distortion Review',
    'UWB Smart Key Fob Distance Ranging Accuracy Review',
    'High-Pressure Washer Pump Motor Thermal Protection Review',
    'Wireless BMS Node 2.4GHz Mesh Network Latency Review',
  ];

  return projects.map((proj, idx) => {
    const num = idx + 1;
    const isCompleted = num % 2 === 0;
    const isInProgress = num % 3 === 0 && !isCompleted;
    const status: DesignReview['status'] = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Planned';
    const approvalStatus: DesignReview['approval_status'] = isCompleted ? 'Approved' : isInProgress ? 'Under Review' : 'Pending';

    return {
      name: `DR-2026-${String(num).padStart(5, '0')}`,
      title: titles[idx],
      project: proj,
      review_type: reviewTypes[idx % 4],
      review_date: `2026-08-${String(1 + (num % 28)).padStart(2, '0')}`,
      reviewer: idx % 2 === 0 ? 'Lead Systems Architect' : 'Chief Quality Engineer',
      participants: ['Administrator', 'Design Lead', 'Quality Specialist', 'Manufacturing Engineer'],
      status,
      approval_status: approvalStatus,
      description: `Formal engineering design review for ${titles[idx]}.`,
      notes: isCompleted ? 'Design approved with zero critical blocking items.' : 'Action items logged in findings section.',
      findings: [
        {
          id: `FND-${num}01`,
          description: `Verify tolerance clearance for ${titles[idx].split(' ')[0]} sub-assembly.`,
          severity: num % 4 === 0 ? 'Critical' : num % 3 === 0 ? 'High' : 'Medium',
          assigned_to: 'Mechanical Lead',
          due_date: '2026-08-25',
          status: isCompleted ? 'Resolved' : 'In Progress',
          comments: isCompleted ? 'GD&T drawing updated.' : 'Simulation in progress.',
        },
      ],
    };
  });
};

const getStoredReviews = (): DesignReview[] => {
  if (typeof window === 'undefined') return getInitialDesignReviews();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 30) return parsed;
    }
  } catch {
    // fallback
  }
  const initial = getInitialDesignReviews();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
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

    const openFindingsCount = reviews.reduce((acc, r) => {
      const openInReview = (r.findings || []).filter((f) => f.status === 'Open' || f.status === 'In Progress').length;
      return acc + openInReview;
    }, 0);

    const summary: DesignReviewSummary = {
      totalReviews: reviews.length,
      plannedReviews: reviews.filter((r) => r.status === 'Planned').length,
      inProgressReviews: reviews.filter((r) => r.status === 'In Progress').length,
      completedReviews: reviews.filter((r) => r.status === 'Completed').length,
      approvedReviews: reviews.filter((r) => r.approval_status === 'Approved').length,
      openFindingsCount,
    };

    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const startIndex = (page - 1) * pageSize;
    const paginatedReviews = reviews.slice(startIndex, startIndex + pageSize);

    return {
      reviews: paginatedReviews,
      totalCount: reviews.length,
      page,
      pageSize,
      summary,
    };
  },

  async getDesignReviewByName(name: string): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const review = reviews.find((r) => r.name === name);
    if (!review) throw new Error(`Design review ${name} not found`);
    return review;
  },

  async createDesignReview(data: Partial<DesignReview>): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const newReview: DesignReview = {
      name: `DR-2026-${String(reviews.length + 1).padStart(5, '0')}`,
      title: data.title || 'Untitled Design Review',
      project: data.project || 'PROJ-0001',
      review_type: data.review_type || 'Concept Review',
      review_date: data.review_date || new Date().toISOString().split('T')[0],
      reviewer: data.reviewer || 'Lead Engineer',
      participants: data.participants || ['Administrator'],
      status: 'Planned',
      approval_status: 'Pending',
      description: data.description || '',
      notes: data.notes || '',
      findings: data.findings || [],
    };

    const updated = [newReview, ...reviews];
    saveStoredReviews(updated);
    return newReview;
  },

  async updateDesignReview(name: string, data: Partial<DesignReview>): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const review = reviews.find((r) => r.name === name);
    if (!review) throw new Error('Design review not found');

    Object.assign(review, data);
    saveStoredReviews(reviews);
    return review;
  },

  async addFinding(reviewName: string, finding: Partial<ReviewFinding>): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const review = reviews.find((r) => r.name === reviewName);
    if (!review) throw new Error('Design review not found');

    const newFinding: ReviewFinding = {
      id: `FND-${Math.floor(100 + Math.random() * 900)}`,
      description: finding.description || 'Action Item Finding',
      severity: finding.severity || 'Medium',
      assigned_to: finding.assigned_to || review.reviewer,
      due_date: finding.due_date || review.review_date,
      status: finding.status || 'Open',
      comments: finding.comments || '',
    };

    review.findings = review.findings || [];
    review.findings.push(newFinding);

    saveStoredReviews(reviews);
    return review;
  },

  async updateFinding(reviewName: string, findingId: string, data: Partial<ReviewFinding>): Promise<DesignReview> {
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

  async deleteFinding(reviewName: string, findingId: string): Promise<DesignReview> {
    const reviews = getStoredReviews();
    const review = reviews.find((r) => r.name === reviewName);
    if (!review) throw new Error('Design review not found');

    review.findings = (review.findings || []).filter((f) => f.id !== findingId);
    saveStoredReviews(reviews);
    return review;
  },

  async deleteDesignReview(name: string): Promise<void> {
    const reviews = getStoredReviews().filter((r) => r.name !== name);
    saveStoredReviews(reviews);
  },
};

export default designReviewService;
