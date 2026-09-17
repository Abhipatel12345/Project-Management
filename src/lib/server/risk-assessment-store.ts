import fs from 'fs';
import path from 'path';
import { ProjectRiskAssessment, RiskArea, RiskItem, RiskRating } from '@/types/risk.types';

const DATA_FILE = path.join(process.cwd(), '.data', 'risk_assessments.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

export function getDefaultRiskAreas(): RiskArea[] {
  return [
    {
      id: 'PM',
      name: 'PROJECT MANAGEMENT',
      overall_risk: 'OK',
      items: [
        {
          id: 'pm-1',
          area_id: 'PM',
          category: 'CUSTOMER',
          question: 'New Customer',
          allowed_options: ['No', 'Yes'],
          selected_value: 'No',
          rating: 'OK',
        },
        {
          id: 'pm-2',
          area_id: 'PM',
          category: 'CUSTOMER',
          question: 'Customer is also Competitor',
          allowed_options: ['No', 'Yes'],
          selected_value: 'No',
          rating: 'OK',
        },
        {
          id: 'pm-3',
          area_id: 'PM',
          category: 'CUSTOMER',
          question: 'Customer Discipline',
          allowed_options: ['High', 'Low'],
          selected_value: 'High',
          rating: 'OK',
        },
        {
          id: 'pm-4',
          area_id: 'PM',
          category: 'CUSTOMER',
          question: 'Number of Customers Locations Affected',
          allowed_options: ['Few', 'Many'],
          selected_value: 'Few',
          rating: 'OK',
        },
        {
          id: 'pm-5',
          area_id: 'PM',
          category: 'TIMING',
          question: 'Project Timing',
          allowed_options: ['Normal', 'Compressed'],
          selected_value: 'Normal',
          rating: 'OK',
        },
        {
          id: 'pm-6',
          area_id: 'PM',
          category: 'CONTINGENCY PLANS',
          question: 'New Technology (Product)',
          allowed_options: ['Solid', 'Weak'],
          selected_value: 'Solid',
          rating: 'OK',
        },
        {
          id: 'pm-7',
          area_id: 'PM',
          category: 'CONTINGENCY PLANS',
          question: 'New Technology (Process)',
          allowed_options: ['Solid', 'Weak'],
          selected_value: 'Solid',
          rating: 'OK',
        },
        {
          id: 'pm-8',
          area_id: 'PM',
          category: 'RESOURCES',
          question: 'People',
          allowed_options: ['Available', 'Not Available'],
          selected_value: 'Available',
          rating: 'OK',
        },
        {
          id: 'pm-9',
          area_id: 'PM',
          category: 'OTHER',
          question: 'Other',
          allowed_options: ['None', 'Identified'],
          selected_value: 'None',
          rating: 'OK',
        },
      ],
    },
    {
      id: 'DESIGN',
      name: 'PRODUCT / SYSTEM DESIGN',
      overall_risk: 'OK',
      items: [
        {
          id: 'des-1',
          area_id: 'DESIGN',
          category: 'PRODUCT ENGINEERING',
          question: 'Technical Requirements Defined',
          allowed_options: ['Yes', 'No - Have Plan', 'No - No Plan'],
          selected_value: 'Yes',
          rating: 'OK',
        },
        {
          id: 'des-2',
          area_id: 'DESIGN',
          category: 'PRODUCT ENGINEERING',
          question: 'Capability to meet Design requirements',
          allowed_options: ['Yes', 'No - Have Plan', 'No - No Plan'],
          selected_value: 'Yes',
          rating: 'OK',
        },
        {
          id: 'des-3',
          area_id: 'DESIGN',
          category: 'PRODUCT ENGINEERING',
          question: 'System Interface understood',
          allowed_options: ['Yes', 'No - Have Plan', 'No - No Plan'],
          selected_value: 'Yes',
          rating: 'OK',
        },
        {
          id: 'des-4',
          area_id: 'DESIGN',
          category: 'PRODUCT ENGINEERING',
          question: 'Product Design Maturity',
          allowed_options: ['Existing application', 'New application'],
          selected_value: 'Existing application',
          rating: 'OK',
        },
        {
          id: 'des-5',
          area_id: 'DESIGN',
          category: 'PRODUCT ENGINEERING',
          question: 'Buildability in Customer Plant',
          allowed_options: ['Easy', 'Difficult'],
          selected_value: 'Easy',
          rating: 'OK',
        },
        {
          id: 'des-6',
          area_id: 'DESIGN',
          category: 'OTHER',
          question: 'Other',
          allowed_options: ['None', 'Identified'],
          selected_value: 'None',
          rating: 'OK',
        },
      ],
    },
    {
      id: 'PROCESS',
      name: 'PROCESS / SYSTEM DESIGN',
      overall_risk: 'OK',
      items: [
        {
          id: 'proc-1',
          area_id: 'PROCESS',
          category: 'MANUFACTURING ENGINEERING',
          question: 'Process/Equipment Application',
          allowed_options: ['in Use @ Automotive OEM', 'In Use in Industry', 'Not Used'],
          selected_value: 'in Use @ Automotive OEM',
          rating: 'OK',
        },
        {
          id: 'proc-2',
          area_id: 'PROCESS',
          category: 'BUILDABILITY',
          question: 'Are there any known DFM Issues',
          allowed_options: ['Easy', 'Difficult'],
          selected_value: 'Easy',
          rating: 'OK',
        },
        {
          id: 'proc-3',
          area_id: 'PROCESS',
          category: 'OTHER',
          question: 'Other',
          allowed_options: ['None', 'Identified'],
          selected_value: 'None',
          rating: 'OK',
        },
      ],
    },
    {
      id: 'TEST',
      name: 'TEST / VALIDATION',
      overall_risk: 'OK',
      items: [
        {
          id: 'test-1',
          area_id: 'TEST',
          category: 'TEST / VALIDATION',
          question: 'Any New Test Requirements.',
          allowed_options: ['No', 'Yes'],
          selected_value: 'No',
          rating: 'OK',
        },
        {
          id: 'test-2',
          area_id: 'TEST',
          category: 'TEST / VALIDATION',
          question: 'Test Capacity',
          allowed_options: ['Available', 'Not Available'],
          selected_value: 'Available',
          rating: 'OK',
        },
        {
          id: 'test-3',
          area_id: 'TEST',
          category: 'OTHER',
          question: 'Other',
          allowed_options: ['None', 'Identified'],
          selected_value: 'None',
          rating: 'OK',
        },
      ],
    },
    {
      id: 'SOURCING',
      name: 'SOURCING',
      overall_risk: 'OK',
      items: [
        {
          id: 'src-1',
          area_id: 'SOURCING',
          category: 'PURCHASING',
          question: 'New Suppliers',
          allowed_options: ['None', '3 or More'],
          selected_value: 'None',
          rating: 'OK',
        },
        {
          id: 'src-2',
          area_id: 'SOURCING',
          category: 'PURCHASING',
          question: 'Competitive Sources Available',
          allowed_options: ['Yes', 'No'],
          selected_value: 'Yes',
          rating: 'OK',
        },
        {
          id: 'src-3',
          area_id: 'SOURCING',
          category: 'OTHER',
          question: 'Other',
          allowed_options: ['None', 'Identified'],
          selected_value: 'None',
          rating: 'OK',
        },
      ],
    },
    {
      id: 'MANUFACTURING',
      name: 'MANUFACTURING',
      overall_risk: 'OK',
      items: [
        {
          id: 'mfg-1',
          area_id: 'MANUFACTURING',
          category: 'OPERATIONS',
          question: '# of Manufacturing Sites',
          allowed_options: ['1', '2+'],
          selected_value: '1',
          rating: 'OK',
        },
        {
          id: 'mfg-2',
          area_id: 'MANUFACTURING',
          category: 'OPERATIONS',
          question: 'Manufacturing Acceleration',
          allowed_options: ['Slow', 'Fast'],
          selected_value: 'Slow',
          rating: 'OK',
        },
        {
          id: 'mfg-3',
          area_id: 'MANUFACTURING',
          category: 'OPERATIONS',
          question: 'Logistics',
          allowed_options: ['Local', 'Regional', 'Global'],
          selected_value: 'Local',
          rating: 'OK',
        },
        {
          id: 'mfg-4',
          area_id: 'MANUFACTURING',
          category: 'OPERATIONS',
          question: 'Facility',
          allowed_options: ['Existing', 'New'],
          selected_value: 'Existing',
          rating: 'OK',
        },
        {
          id: 'mfg-5',
          area_id: 'MANUFACTURING',
          category: 'OPERATIONS',
          question: 'Value Stream Complexity',
          allowed_options: ['Low', 'Medium', 'High'],
          selected_value: 'Low',
          rating: 'OK',
        },
        {
          id: 'mfg-6',
          area_id: 'MANUFACTURING',
          category: 'OTHER',
          question: 'Other',
          allowed_options: ['None', 'Identified'],
          selected_value: 'None',
          rating: 'OK',
        },
      ],
    },
  ];
}

export function calculateRiskMetrics(areas: RiskArea[]): {
  highRiskCount: number;
  overallRisk: RiskRating;
  escalation: 'Y' | 'N';
} {
  let highCount = 0;
  let lowCount = 0;

  for (const area of areas) {
    let areaHigh = 0;
    let areaLow = 0;
    for (const it of area.items) {
      if (it.rating === 'H') {
        highCount++;
        areaHigh++;
      } else if (it.rating === 'L') {
        lowCount++;
        areaLow++;
      }
    }
    area.overall_risk = areaHigh > 0 ? 'H' : areaLow > 0 ? 'L' : 'OK';
  }

  const overallRisk: RiskRating = highCount > 0 ? 'H' : lowCount > 0 ? 'L' : 'OK';
  const escalation: 'Y' | 'N' = highCount > 0 ? 'Y' : 'N';

  return {
    highRiskCount: highCount,
    overallRisk,
    escalation,
  };
}

export function getProjectRiskAssessment(
  projectId: string,
  projectName?: string,
  currentPhase?: string
): ProjectRiskAssessment {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  let store: Record<string, ProjectRiskAssessment> = {};
  try {
    store = JSON.parse(raw);
  } catch {
    store = {};
  }

  if (store[projectId]) {
    // Recalculate metrics in case of any rating change
    const assessment = store[projectId];
    const { highRiskCount, overallRisk, escalation } = calculateRiskMetrics(assessment.areas);
    assessment.high_risk_count = highRiskCount;
    assessment.overall_risk_assessment = overallRisk;
    assessment.escalation_recommendation = escalation;
    if (projectName && (!assessment.project_name || assessment.project_name === projectId)) {
      assessment.project_name = projectName;
    }
    if (currentPhase) {
      assessment.current_pdp_phase = currentPhase;
    }
    return assessment;
  }

  // Seed new assessment for project
  const areas = getDefaultRiskAreas();
  const { highRiskCount, overallRisk, escalation } = calculateRiskMetrics(areas);

  const newAssessment: ProjectRiskAssessment = {
    project_id: projectId,
    project_number: projectId,
    project_name: projectName || projectId,
    current_pdp_phase: currentPhase || 'PL',
    quote_phase: 'Quote',
    overall_risk_assessment: overallRisk,
    high_risk_count: highRiskCount,
    escalation_recommendation: escalation,
    areas,
    last_updated: new Date().toISOString(),
  };

  store[projectId] = newAssessment;
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  return newAssessment;
}

export function saveProjectRiskAssessment(
  projectId: string,
  updatedData: Partial<ProjectRiskAssessment>,
  userName?: string
): ProjectRiskAssessment {
  ensureDataFile();
  const current = getProjectRiskAssessment(projectId);

  const areas = updatedData.areas || current.areas;

  // Validation: Check if any item rated 'H' has a missing Risk Resolution Plan
  for (const area of areas) {
    for (const item of area.items) {
      if (item.rating === 'H') {
        const plan = (item.risk_resolution_plan || '').trim();
        if (!plan) {
          throw new Error(
            `Validation Error: "A Risk Resolution Plan is Required for all High Risk Items". Item "${item.question}" in ${area.name} is rated High but missing a resolution plan.`
          );
        }
      }
    }
  }

  const { highRiskCount, overallRisk, escalation } = calculateRiskMetrics(areas);

  const merged: ProjectRiskAssessment = {
    ...current,
    ...updatedData,
    project_id: projectId,
    areas,
    high_risk_count: highRiskCount,
    overall_risk_assessment: overallRisk,
    escalation_recommendation: escalation,
    last_updated: new Date().toISOString(),
    updated_by: userName || current.updated_by || 'User',
  };

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  let store: Record<string, ProjectRiskAssessment> = {};
  try {
    store = JSON.parse(raw);
  } catch {
    store = {};
  }

  store[projectId] = merged;
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  return merged;
}
