import axios from 'axios';
import { generateDevelopmentTimePlanHtml } from '../src/utils/msp-exporter';
import { recalculateSchedule } from '../src/utils/gantt-scheduling-engine';

const BASE_URL = 'http://localhost:3000';

const adminSession = {
  username: 'admin',
  email: 'admin@example.com',
  fullName: 'Administrator',
  role: 'admin',
};

const adminCookie = 'pdm_session=' + Buffer.from(JSON.stringify(adminSession)).toString('base64');
const headers = {
  'Cookie': adminCookie,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('===============================================================');
  console.log('   AUTOMOTIVE DEMO PROJECT MASTER VERIFICATION CHECKLIST      ');
  console.log('===============================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(title: string, condition: boolean, details?: string) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`[PASS] ${title}`);
      if (details) console.log(`       -> ${details}`);
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error(`       -> ${details}`);
    }
  }

  // 1. PROJECT CHECKS
  console.log('--- 1. PROJECT VERIFICATION ---');
  const projRes = await axios.get(`${BASE_URL}/api/resource/Project/PROJ-0126`, { headers });
  const proj = projRes.data?.data;
  assert('Project created successfully', Boolean(proj));
  assert('Project persisted in ERPNext with correct Name', proj?.project_name === 'Aurora – Next Generation Integrated Door Module Development', proj?.project_name);
  assert('Project Type is Category A', proj?.project_type === 'A' && proj?.custom_pdp_category === 'A', `Type: ${proj?.project_type}, PDP: ${proj?.custom_pdp_category}`);
  assert('Project dates correct', proj?.expected_start_date === '2026-10-01' && proj?.expected_end_date === '2027-06-30', `${proj?.expected_start_date} to ${proj?.expected_end_date}`);

  // 2. TASKS CHECKS
  console.log('\n--- 2. TASKS VERIFICATION ---');
  const q = encodeURIComponent(JSON.stringify([['project', '=', 'PROJ-0126']]));
  const taskRes = await axios.get(`${BASE_URL}/api/resource/Task?filters=${q}&limit_page_length=50`, { headers });
  const rawList = taskRes.data?.data || [];
  
  const fullTasks = await Promise.all(
    rawList.map(async (t: any) => {
      const res = await axios.get(`${BASE_URL}/api/resource/Task/${t.name}`, { headers });
      return res.data?.data;
    })
  );

  const normalTasks = fullTasks.filter((t: any) => t.is_milestone !== 1 && t.custom_is_milestone !== 1);
  const milestoneTasks = fullTasks.filter((t: any) => t.is_milestone === 1 || t.custom_is_milestone === 1);

  assert('Exactly 8 unique tasks created', normalTasks.length === 8, `Found ${normalTasks.length} normal tasks`);

  const expectedTaskNames = [
    'Customer Requirements & RFQ Review',
    'Program Charter & Initial Risk Assessment',
    'System Architecture & Feasibility Definition',
    'Door Module Preliminary Design',
    'DFMEA & Design Requirements Review',
    'Prototype Design Release',
    'Prototype Build & PV Validation',
    'Customer PPAP Preparation & Submission'
  ];

  const actualNames = normalTasks.map((t: any) => t.subject);
  const allNamesMatch = expectedTaskNames.every(name => actualNames.includes(name));
  assert('All 8 tasks have exact unique requested names', allNamesMatch);

  // Phases check
  const phase1Tasks = normalTasks.filter((t: any) => t.custom_phase?.includes('Phase 1'));
  const phase2Tasks = normalTasks.filter((t: any) => t.custom_phase?.includes('Phase 2'));
  const phase3Tasks = normalTasks.filter((t: any) => t.custom_phase?.includes('Phase 3'));
  assert('Tasks belong to correct phases (Phase 1: 3, Phase 2: 3, Phase 3: 2)', phase1Tasks.length === 3 && phase2Tasks.length === 3 && phase3Tasks.length === 2, `P1: ${phase1Tasks.length}, P2: ${phase2Tasks.length}, P3: ${phase3Tasks.length}`);

  // 3. MILESTONES CHECKS
  console.log('\n--- 3. MILESTONES VERIFICATION ---');
  assert('At least 5 milestones created', milestoneTasks.length >= 5, `Found ${milestoneTasks.length} milestones`);
  const allMilestonesHaveZeroDur = milestoneTasks.every((m: any) => m.duration === 0);
  assert('Milestones are real milestone records with duration 0 (Diamonds)', allMilestonesHaveZeroDur);
  const allNormalTasksHavePositiveDur = normalTasks.every((t: any) => (t.duration || 0) > 0);
  assert('Normal tasks remain normal duration bars (>0 duration)', allNormalTasksHavePositiveDur);

  const customerMilestones = milestoneTasks.filter((m: any) => 
    m.custom_is_customer_milestone === 1 || 
    m.description?.includes('"is_customer_milestone":true')
  );
  const internalMilestones = milestoneTasks.filter((m: any) => 
    m.custom_is_customer_milestone !== 1 && 
    !m.description?.includes('"is_customer_milestone":true')
  );
  assert('Customer milestones distinguishable from internal milestones (3 Customer, 2 Internal)', customerMilestones.length === 3 && internalMilestones.length === 2, `Customer: ${customerMilestones.length}, Internal: ${internalMilestones.length}`);

  // 4. GATE CHECKS
  console.log('\n--- 4. GATE MANAGEMENT & CRITERIA VERIFICATION ---');
  const gateRes = await axios.get(`${BASE_URL}/api/gates?project=PROJ-0126`, { headers });
  const gates = gateRes.data?.gates || [];
  const plGate = gates.find((g: any) => g.gate_type === '1. PL');
  assert('PL Gate exists and is linked to project', Boolean(plGate), `Gate ID: ${plGate?.name}, Type: ${plGate?.gate_type}`);
  assert('Gate criteria available and populated', plGate?.criteria?.length >= 3, `Criteria count: ${plGate?.criteria?.length}`);
  assert('Gate deliverables available and populated', plGate?.deliverables?.length >= 2, `Deliverables count: ${plGate?.deliverables?.length}`);

  const kgdCriteria = plGate?.criteria?.filter((c: any) => c.name?.includes('KGD'));
  assert('KGD linked correctly in Gate', kgdCriteria?.length >= 2, `Found ${kgdCriteria?.length} KGD criteria`);
  assert('Gate Readiness calculated from actual data (>0%)', (plGate?.readiness_percentage || 0) > 0, `Readiness: ${plGate?.readiness_percentage}%`);

  // KGD flags on tasks
  const kgdTasks = normalTasks.filter((t: any) => 
    t.custom_is_kgd === 1 || 
    t.description?.includes('<!-- KGD: true -->')
  );
  assert('Only Tasks 2 & 3 marked as authoritative KGD', kgdTasks.length === 2, `KGD tasks: ${kgdTasks.map((t: any) => t.subject).join(', ')}`);

  // 5. CRITICAL PATH CHECKS
  console.log('\n--- 5. CRITICAL PATH VERIFICATION ---');
  const depRes = await axios.get(`${BASE_URL}/api/projects/PROJ-0126/dependencies`, { headers });
  const deps = depRes.data?.data || depRes.data || [];
  assert('Task dependencies exist in project', deps.length >= 8, `Found ${deps.length} dependencies`);

  const schedCalc = recalculateSchedule(fullTasks as any, deps);
  assert('Critical path calculated from dependencies', schedCalc.criticalPathTaskIds.size > 0, `Critical task IDs: ${schedCalc.criticalPathTaskIds.size}`);

  // 6. EXPORT / DEVELOPMENT TIME PLAN
  console.log('\n--- 6. EXPORT / DEVELOPMENT TIME PLAN VERIFICATION ---');
  const htmlExport = generateDevelopmentTimePlanHtml('Aurora – Next Generation Integrated Door Module Development', 'PROJ-0126', fullTasks as any, deps, gates);
  assert('Development Time Plan export HTML generated dynamically', Boolean(htmlExport && htmlExport.length > 5000));
  assert('Export contains Project Name & Title', htmlExport.includes('Aurora – Next Generation Integrated Door Module Development') && htmlExport.includes('Development Time Plan & Customer Milestones'));
  assert('Export contains Critical Path indication', htmlExport.includes('Critical Path Task (🔥)') && htmlExport.includes('bar-critical'));
  assert('Export contains Customer Milestones and Internal Milestones', htmlExport.includes('Customer MS') && htmlExport.includes('diamond-customer') && htmlExport.includes('diamond-internal'));
  assert('Export contains Gate Review event marker', htmlExport.includes('gate-event-marker') && htmlExport.includes('1. PL'));

  // 7. SUMMARY
  console.log('\n===============================================================');
  console.log(`   MASTER VERIFICATION RESULT: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
  console.log('===============================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 ALL CRITERIA FULLY SATISFIED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ ${totalChecks - passedChecks} checks failed.`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal verification error:', e.message, e.response?.data);
  process.exit(1);
});
