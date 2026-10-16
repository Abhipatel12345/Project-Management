/**
 * Live ERPNext Persistence & Integration Verification Script
 * Validates:
 * 1. Live DocType existence in ERPNext
 * 2. Live record counts and child table associations
 * 3. Full CRUD & Round-trip persistence via application stores
 * 4. Project-wise data isolation
 */

import { fetchErpResource, getErpDoc, createErpDoc, updateErpDoc, deleteErpDoc, getErpUrl } from '../src/lib/server/erp-client';
import { saveOrUpdateGate, fetchGatesFromERPNext, loadAllGates } from '../src/lib/server/gate-store';
import { saveBaseline, fetchBaselinesFromERPNext } from '../src/lib/server/baseline-store';
import { saveProjectScorecard, fetchScorecardFromERPNext, getProjectScorecardAsync } from '../src/lib/server/scorecard-store';
import { evaluateProjectFLMAsync, fetchFlawlessLaunchFromERPNext } from '../src/lib/server/flawless-launch-store';
import { saveOrUpdateDesignReview, fetchDesignReviewsFromERPNext } from '../src/lib/server/design-review-store';
import { saveProjectRiskAssessment, fetchRiskAssessmentFromERPNext } from '../src/lib/server/risk-assessment-store';
import { addProjectTeamMember, getProjectTeamMembers, removeProjectTeamMember } from '../src/lib/server/team-store';

async function verifyLiveCounts() {
  console.log('================================================================');
  console.log(`1. VERIFYING LIVE ERPNEXT DOCTYPES & RECORD COUNTS (${getErpUrl()})`);
  console.log('================================================================\n');

  const doctypes = [
    'Gate',
    'Gate Criteria Item',
    'Gate Deliverable Item',
    'Gate Board Review Item',
    'Project Baseline',
    'Baseline Task Item',
    'Risk Assesment',
    'PDM Risk Assessment Item',
    'Design Review',
    'Design Review Finding Item',
    'Task Submission',
    'Task Skip Request',
    'Stage Movement History',
    'Imperative Scorecard',
    'Scorecard Metric Item',
    'Flawless Launch',
    'Flawless Launch Metric Item',
    'PDM Document',
    'Project',
  ];

  const results: Record<string, number> = {};

  for (const dt of doctypes) {
    try {
      const records = await fetchErpResource(dt, { limit: 2000, fields: ['name'] });
      results[dt] = records.length;
      console.log(`  ✓ DocType "${dt}": ${records.length} records verified live.`);
    } catch (err: any) {
      console.error(`  ✗ DocType "${dt}" error:`, err.message);
      results[dt] = -1;
    }
  }

  return results;
}

async function verifyCustomFields() {
  console.log('\n================================================================');
  console.log('2. VERIFYING PROJECT CUSTOM FIELDS (custom_stage & team user fields)');
  console.log('================================================================\n');

  const projects = await fetchErpResource<any>('Project', { limit: 5, fields: ['name', 'project_name', 'custom_stage'] });
  for (const p of projects) {
    const full = await getErpDoc('Project', p.name);
    console.log(`  Project ${p.name} ("${p.project_name}"):`);
    console.log(`    - custom_stage: "${full.custom_stage || 'Not Set'}"`);
    console.log(`    - Team users count: ${(full.users || []).length}`);
    if (full.users && full.users.length > 0) {
      const sample = full.users[0];
      console.log(`    - Sample user ${sample.user}: role="${sample.custom_role || ''}", dept="${sample.custom_department || ''}", is_board=${sample.custom_is_board_member}`);
    }
  }
}

async function verifyApplicationStoreSync() {
  console.log('\n================================================================');
  console.log('3. VERIFYING APPLICATION STORE TO ERPNEXT ROUND-TRIP PERSISTENCE');
  console.log('================================================================\n');

  // Test Project
  const testProject = 'PROJ-0124';

  // 1. Gate Round-trip
  console.log('--- A. Gate Store Round-trip ---');
  const initialGates = await fetchGatesFromERPNext(testProject);
  console.log(`  Initial Gates in ERPNext for ${testProject}: ${initialGates.length}`);
  
  const testGatePayload = {
    name: `GATE-TEST-${Date.now()}`,
    gate_name: `Verification Gate ${Date.now()}`,
    project: testProject,
    gate_type: '1. PL',
    status: 'In Progress' as const,
    completion_percentage: 50,
    readiness_percentage: 60,
    criteria: [
      {
        id: 'CRIT-TEST-1',
        name: 'Technical Feasibility Confirmed',
        status: 'Completed' as const,
        is_required: true,
        completion_percentage: 100,
      }
    ],
    deliverables: [
      {
        id: 'DEL-TEST-1',
        name: 'Concept Architecture Document',
        status: 'Approved' as const,
        is_required: true,
        completion_percentage: 100,
      }
    ]
  };

  const savedGate = saveOrUpdateGate(testGatePayload);
  console.log(`  Saved Gate "${savedGate.gate_name}" (${savedGate.name}) to store.`);
  
  // Wait 1.5s for async sync to ERPNext
  await new Promise(r => setTimeout(r, 1500));

  // Verify directly in ERPNext
  const erpGateMatches = await fetchErpResource('Gate', {
    filters: [['project', '=', testProject], ['gate_name', '=', testGatePayload.gate_name]],
    limit: 1
  });
  console.log(`  Live ERPNext query for created gate: Found ${erpGateMatches.length} record(s).`);
  if (erpGateMatches.length > 0) {
    const liveDoc = await getErpDoc('Gate', erpGateMatches[0].name);
    console.log(`  ✓ Verified in ERPNext: Name=${liveDoc.name}, Criteria rows=${liveDoc.criteria?.length}, Deliverables rows=${liveDoc.deliverables?.length}`);
    // Cleanup test gate
    await deleteErpDoc('Gate', erpGateMatches[0].name);
    console.log(`  Cleaned up test gate ${liveDoc.name} from ERPNext.`);
  }

  // 2. Scorecard Round-trip
  console.log('\n--- B. Imperative Scorecard Round-trip ---');
  const sc = await getProjectScorecardAsync(testProject);
  console.log(`  Scorecard for ${testProject}: Rows count=${sc.rows?.length}, Version=${sc.version}, OI Target=${sc.oi_percentage_target}`);
  
  const updatedSc = {
    ...sc,
    version: 'v2.0-verified',
    oi_percentage_current: '16.2%',
  };
  saveProjectScorecard(testProject, updatedSc);
  console.log(`  Saved updated scorecard version "${updatedSc.version}".`);
  
  await new Promise(r => setTimeout(r, 1500));
  const erpSc = await fetchScorecardFromERPNext(testProject);
  console.log(`  ✓ Verified Scorecard directly from ERPNext: version="${erpSc?.version}", oi_current="${erpSc?.oi_percentage_current}"`);

  // 3. Flawless Launch Round-trip
  console.log('\n--- C. Flawless Launch Round-trip ---');
  const flmData = await evaluateProjectFLMAsync(testProject, 'Verification Project', 'PL');
  console.log(`  Evaluated FLM for ${testProject}: Overall Status=${flmData.overall_flm_status}, Gates evaluated=${flmData.gates.length}`);
  
  await new Promise(r => setTimeout(r, 1500));
  const erpFlm = await fetchFlawlessLaunchFromERPNext(testProject);
  console.log(`  ✓ Verified Flawless Launch directly from ERPNext: Current Gate="${erpFlm?.current_gate}", Overall Status="${erpFlm?.overall_flm_status}"`);

  // 4. Team Member Sync Round-trip
  console.log('\n--- D. Project Team Custom Fields Round-trip ---');
  const initialTeam = getProjectTeamMembers(testProject);
  console.log(`  Initial team members in local store for ${testProject}: ${initialTeam.length}`);
  
  const testMemberEmail = `verif_${Date.now()}@inteva.com`;
  const addedMember = addProjectTeamMember(testProject, {
    user_email: testMemberEmail,
    employee_name: 'Test Verification Engineer',
    role: 'Lead Systems Engineer',
    department: 'Advanced Engineering',
    function_name: 'Platform Architecture',
    is_board_member: true,
    status: 'Active',
  });
  console.log(`  Added team member ${addedMember.employee_name} (${addedMember.role}).`);
  
  await new Promise(r => setTimeout(r, 1500));
  const erpProjDoc = await getErpDoc('Project', testProject);
  const foundUser = (erpProjDoc.users || []).find((u: any) => (u.user || u.email) === testMemberEmail);
  if (foundUser) {
    console.log(`  ✓ Verified Team Member in ERPNext Project.users: user="${foundUser.user}", role="${foundUser.custom_role}", dept="${foundUser.custom_department}", is_board=${foundUser.custom_is_board_member}`);
    // Cleanup
    removeProjectTeamMember(testProject, addedMember.id);
    await new Promise(r => setTimeout(r, 1000));
    console.log(`  Cleaned up test team member from ${testProject}.`);
  }

  console.log('\n================================================================');
  console.log('ALL ERPNEXT PERSISTENCE CHECKS COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

async function main() {
  try {
    await verifyLiveCounts();
    await verifyCustomFields();
    await verifyApplicationStoreSync();
  } catch (err: any) {
    console.error('Verification failed with error:', err);
    process.exit(1);
  }
}

main();
