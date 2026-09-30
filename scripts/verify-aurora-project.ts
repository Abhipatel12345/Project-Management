import axios from 'axios';
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
  console.log('--- Verifying Aurora Demo Project Data ---');

  // 1. Project Record
  const projRes = await axios.get(`${BASE_URL}/api/resource/Project/PROJ-0126`, { headers });
  const project = projRes.data.data;
  console.log('Project Name:', project.project_name);
  console.log('Project Type:', project.project_type);
  console.log('PDP Category:', project.custom_pdp_category);
  console.log('Start Date:', project.expected_start_date);
  console.log('End Date:', project.expected_end_date);
  console.log('SOP Date:', project.custom_sop_date);

  // 2. Fetch full tasks
  const taskQuery = encodeURIComponent(JSON.stringify([['project', '=', 'PROJ-0126']]));
  const taskRes = await axios.get(
    `${BASE_URL}/api/resource/Task?filters=${taskQuery}&limit_page_length=50`,
    { headers }
  );
  const taskSummaryList = taskRes.data.data || [];
  console.log(`Total records in PROJ-0126: ${taskSummaryList.length}`);

  const rawTasks = await Promise.all(
    taskSummaryList.map(async (st: any) => {
      const single = await axios.get(`${BASE_URL}/api/resource/Task/${st.name}`, { headers });
      return single.data.data;
    })
  );

  // Normalize tasks
  const normalizedTasks = rawTasks.map((t: any) => {
    let milestoneMeta: any = null;
    if (t.description && t.description.includes('<!-- MILESTONE_META:')) {
      try {
        const match = t.description.match(/<!-- MILESTONE_META: (.*?) -->/);
        if (match && match[1]) milestoneMeta = JSON.parse(match[1]);
      } catch {}
    }
    const is_milestone = Boolean(
      (t.custom_is_milestone === 1 || t.is_milestone === 1 || t.is_milestone === true || milestoneMeta?.is_milestone) &&
      t.custom_is_milestone !== 0 &&
      t.is_milestone !== 0 &&
      t.is_milestone !== false
    );
    const is_customer_milestone = is_milestone && Boolean(
      milestoneMeta?.is_customer_milestone ||
      t.custom_is_customer_milestone === 1 ||
      t.is_customer_milestone === true ||
      t.custom_milestone_type === 'Customer Milestone' ||
      t.milestone_type === 'Customer Milestone'
    );
    const is_kgd = Boolean(
      t.custom_is_kgd === 1 ||
      t.is_kgd === true ||
      milestoneMeta?.is_kgd === true ||
      (t.description && (t.description.includes('<!-- KGD: true -->') || t.description.toLowerCase().includes('[kgd]')))
    );
    return {
      name: t.name,
      subject: t.subject,
      is_milestone,
      is_customer_milestone,
      milestone_type: milestoneMeta?.milestone_type || t.custom_milestone_type || (is_customer_milestone ? 'Customer Milestone' : 'Internal Milestone'),
      is_kgd,
      phase: t.custom_phase,
      gate: t.custom_gate,
      duration: is_milestone ? 0 : t.duration || 1,
      status: t.status,
      exp_start_date: t.exp_start_date,
      exp_end_date: t.exp_end_date,
    };
  });

  const normalTasks = normalizedTasks.filter((t: any) => !t.is_milestone);
  const milestones = normalizedTasks.filter((t: any) => t.is_milestone);

  console.log(`\nNormal Tasks (${normalTasks.length}):`);
  normalTasks.forEach((t: any) => {
    console.log(`- [${t.name}] ${t.subject} | Phase: ${t.phase} | Dates: ${t.exp_start_date} -> ${t.exp_end_date} | Dur: ${t.duration}d | Status: ${t.status} | KGD: ${t.is_kgd}`);
  });

  console.log(`\nMilestones (${milestones.length}):`);
  milestones.forEach((t: any) => {
    console.log(`- [${t.name}] ${t.subject} | Type: ${t.milestone_type} | Customer: ${t.is_customer_milestone} | Date: ${t.exp_start_date} | Dur: ${t.duration}d | Status: ${t.status}`);
  });

  // 3. Dependencies & Critical Path
  const depRes = await axios.get(`${BASE_URL}/api/projects/PROJ-0126/dependencies`, { headers });
  const deps = depRes.data?.data || depRes.data || [];
  console.log(`\nDependencies count: ${deps.length}`);

  const schedCalc = recalculateSchedule(normalizedTasks as any, deps);
  console.log(`Critical Path Task IDs (${schedCalc.criticalPathTaskIds.size}):`, Array.from(schedCalc.criticalPathTaskIds));
  const criticalTaskNames = normalizedTasks
    .filter((t: any) => schedCalc.criticalPathTaskIds.has(t.name))
    .map((t: any) => t.subject);
  console.log('Critical Path Task Names:\n', criticalTaskNames.map(n => `  -> ${n}`).join('\n'));

  // 4. Gates
  const gateRes = await axios.get(`${BASE_URL}/api/gates?project=PROJ-0126`, { headers });
  const gates = gateRes.data?.gates || [];
  console.log(`\nGates found for PROJ-0126: ${gates.length}`);
  gates.forEach((g: any) => {
    console.log(`Gate: ${g.name} (${g.gate_name}) | Type: ${g.gate_type} | Readiness: ${g.readiness_percentage}% | Criteria: ${g.criteria?.length} | Deliverables: ${g.deliverables?.length}`);
  });
}

main().catch(e => {
  console.error('Verification error:', e.message, e.response?.data);
});
