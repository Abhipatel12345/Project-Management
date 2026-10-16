import fs from 'fs';
import path from 'path';
import { ProjectRiskAssessment, RiskArea, RiskItem, RiskRating } from '@/types/risk.types';
import { loadAllGates } from './gate-store';
import {
  createErpDoc,
  updateErpDoc,
  fetchErpResource,
  getErpDoc,
} from './erp-client';

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

export async function fetchRiskAssessmentFromERPNext(
  projectId: string,
  projectName?: string,
  currentPhase?: string
): Promise<ProjectRiskAssessment> {
  try {
    const list = await fetchErpResource<any>('Risk Assesment', {
      filters: [['project', '=', projectId]],
      limit: 1,
    });

    if (list && list.length > 0) {
      const doc = await getErpDoc<any>('Risk Assesment', list[0].name);
      const defaultAreas = getDefaultRiskAreas();

      // Hydrate items from doc.risk_items
      if (Array.isArray(doc.risk_items) && doc.risk_items.length > 0) {
        for (const rItem of doc.risk_items) {
          const areaMatch = defaultAreas.find((a) => {
            const an = a.name.toUpperCase();
            const ran = (rItem.risk_area || '').toUpperCase();
            return an === ran || (ran.includes('DESIGN') && an.includes('DESIGN'));
          });
          if (areaMatch) {
            const itemMatch = areaMatch.items.find(
              (i) => i.question.toLowerCase().trim() === (rItem.risk_item || '').toLowerCase().trim()
            );
            if (itemMatch) {
              itemMatch.selected_value = rItem.response || itemMatch.selected_value;
              itemMatch.rating = (rItem.risk_rating === 'H' ? 'H' : rItem.risk_rating === 'L' ? 'L' : 'OK') as RiskRating;
              itemMatch.risk_resolution_plan = rItem.risk_resolution_plan || '';
              itemMatch.target_date = rItem.target_completion_date || undefined;
            }
          }
        }
      }

      const { highRiskCount, overallRisk, escalation } = calculateRiskMetrics(defaultAreas);
      const assessment: ProjectRiskAssessment = {
        project_id: projectId,
        project_number: projectId,
        project_name: doc.project_name || projectName || projectId,
        current_pdp_phase: doc.pdp_phase || currentPhase || 'PL',
        quote_phase: 'Quote',
        overall_risk_assessment: (doc.number_of_items_rated_as_high > 0 ? 'H' : overallRisk) as RiskRating,
        high_risk_count: doc.number_of_items_rated_as_high || highRiskCount,
        escalation_recommendation: doc.escalation_recommendation === 'Y' ? 'Y' : escalation,
        areas: defaultAreas,
        last_updated: doc.modified || new Date().toISOString(),
        updated_by: doc.owner || 'Administrator',
      };

      // Update local cache
      try {
        ensureDataFile();
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const store = JSON.parse(raw);
        store[projectId] = assessment;
        fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
      } catch {}

      return assessment;
    }
  } catch (err: any) {
    console.warn('[RiskStore] fetchRiskAssessmentFromERPNext failed, using local cache:', err.message);
  }

  return getProjectRiskAssessment(projectId, projectName, currentPhase);
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

  // Authoritative ERPNext Sync: persist to Risk Assesment and PDM Risk Assessment Item
  const risk_items: any[] = [];
  for (const area of areas) {
    let erpArea = 'PROJECT MANAGEMENT';
    const an = area.name.toUpperCase();
    if (an.includes('DESIGN') && an.includes('PROCESS')) erpArea = 'PROCESS/SYSTEM DESIGN';
    else if (an.includes('DESIGN')) erpArea = 'PRODUCT/SYSTEM DESIGN';
    else if (an.includes('TEST') || an.includes('VALIDATION')) erpArea = 'TEST/VALIDATION';
    else if (an.includes('SOURCING') || an.includes('PURCHASING')) erpArea = 'SOURCING';
    else if (an.includes('MANUFACTURING') || an.includes('OPERATIONS')) erpArea = 'MANUFACTURING';

    for (const item of area.items) {
      risk_items.push({
        risk_area: erpArea,
        category: item.category || '',
        risk_item: item.question,
        response: item.selected_value || '',
        risk_rating: item.rating === 'H' ? 'H' : item.rating === 'L' ? 'L' : 'OK',
        risk_description: item.risk_resolution_plan || '',
        risk_resolution_plan: item.risk_resolution_plan || '',
        target_completion_date: item.target_date || null,
      });
    }
  }

  const erpPayload = {
    project: projectId,
    project_name: merged.project_name || '',
    pdp_phase: 'PL',
    number_of_items_rated_as_high: highRiskCount,
    escalation_recommendation: escalation === 'Y' ? 'Y' : 'N',
    risk_items,
  };

  fetchErpResource<any>('Risk Assesment', { filters: [['project', '=', projectId]], limit: 1 })
    .then((existing) => {
      if (existing && existing.length > 0) {
        return updateErpDoc('Risk Assesment', existing[0].name, erpPayload);
      } else {
        return createErpDoc('Risk Assesment', erpPayload);
      }
    })
    .catch((err) => {
      console.warn('[RiskStore] Failed to sync Risk Assessment to ERPNext:', err.message);
    });

  return merged;
}

export function getRiskAssessmentDashboard() {
  ensureDataFile();
  let store: Record<string, ProjectRiskAssessment> = {};
  try {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    store = {};
  }

  // Load known project IDs from gates
  const allGates = loadAllGates();
  const knownProjectIds = Array.from(
    new Set(allGates.map((g) => g.project).filter((p): p is string => Boolean(p)))
  );
  if (knownProjectIds.length === 0) {
    knownProjectIds.push('PROJ-0124', 'PROJ-0123', 'PROJ-0122', 'PROJ-0121');
  }

  // Combine stored projects and known projects
  const allProjectIds: string[] = Array.from(new Set([...Object.keys(store), ...knownProjectIds]));

  let highRiskItemsTotal = 0;
  let escalatedProjectsTotal = 0;
  let okCount = 0;
  let medCount = 0;
  let highCount = 0;
  let totalPlansNeeded = 0;
  let totalPlansCompleted = 0;

  const projectSummaries = allProjectIds.map((pid: string) => {
    const assessment = store[pid] || getProjectRiskAssessment(pid);
    const hCount = assessment.high_risk_count || 0;
    highRiskItemsTotal += hCount;

    if (assessment.overall_risk_assessment === 'H') highCount++;
    else if (assessment.overall_risk_assessment === 'L') medCount++;
    else okCount++;

    if (assessment.escalation_recommendation === 'Y') {
      escalatedProjectsTotal++;
    }

    let plansNeeded = 0;
    let plansCompleted = 0;
    for (const area of assessment.areas) {
      for (const item of area.items) {
        if (item.rating === 'H') {
          plansNeeded++;
          if ((item.risk_resolution_plan || '').trim().length > 0) {
            plansCompleted++;
          }
        }
      }
    }

    totalPlansNeeded += plansNeeded;
    totalPlansCompleted += plansCompleted;

    const gate = allGates.find((g) => g.project === pid);

    return {
      project_id: pid,
      project_name: assessment.project_name || gate?.project_name || pid,
      current_phase: assessment.current_pdp_phase || 'PL',
      high_risk_count: hCount,
      overall_risk_assessment: assessment.overall_risk_assessment,
      escalation_recommendation: assessment.escalation_recommendation === 'Y' ? 'Escalate' : 'Pass',
      total_items: assessment.areas.reduce((acc: number, a: RiskArea) => acc + a.items.length, 0),
      open_plans_needed: plansNeeded - plansCompleted,
      plans_completed: plansCompleted,
      last_updated: assessment.last_updated || new Date().toISOString(),
      updated_by: assessment.updated_by || 'System',
    };
  });

  const assessedCount = Object.keys(store).length;

  return {
    total_projects: allProjectIds.length,
    assessed_projects: assessedCount,
    high_risk_items: highRiskItemsTotal,
    escalated_projects: escalatedProjectsTotal,
    risk_distribution: {
      ok: okCount,
      medium: medCount,
      high: highCount,
    },
    mitigation_status: {
      plans_needed: totalPlansNeeded,
      plans_completed: totalPlansCompleted,
      completion_rate:
        totalPlansNeeded > 0 ? Math.round((totalPlansCompleted / totalPlansNeeded) * 100) : 100,
    },
    projects: projectSummaries,
  };
}

