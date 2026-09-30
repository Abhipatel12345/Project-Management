import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
  console.log('=== Cleaning up tasks in PROJ-0126 to ensure EXACTLY 8 unique tasks + 5 milestones ===');

  const projectId = 'PROJ-0126';

  // 1. Fetch all tasks for PROJ-0126
  const q = encodeURIComponent(JSON.stringify([['project', '=', projectId]]));
  const res = await axios.get(`${BASE_URL}/api/resource/Task?filters=${q}&fields=["name","subject"]&limit_page_length=100`, { headers });
  const tasks = res.data.data || [];
  console.log(`Found ${tasks.length} total tasks in ${projectId}:`);

  // Delete all tasks in PROJ-0126 first by setting custom_is_custom: 1, then deleting
  for (const t of tasks) {
    try {
      await axios.put(`${BASE_URL}/api/resource/Task/${t.name}`, { custom_is_custom: 1, custom_is_mandatory_pdp: 0 }, { headers });
      await axios.delete(`${BASE_URL}/api/resource/Task/${t.name}`, { headers });
      console.log(`Deleted ${t.name}: ${t.subject}`);
    } catch (e: any) {
      console.log(`Could not delete ${t.name}:`, e.response?.data?._error_message || e.message);
    }
  }

  // Verify deletion
  const checkRes = await axios.get(`${BASE_URL}/api/resource/Task?filters=${q}&limit_page_length=100`, { headers });
  console.log(`Remaining tasks in ${projectId}: ${checkRes.data.data?.length || 0}`);

  // Now create the EXACT 8 tasks
  console.log('\n--- Creating EXACTLY 8 Unique Tasks ---');
  const taskNameToIdMap: Record<string, string> = {};

  const tasksDefinitions = [
    {
      subject: 'Customer Requirements & RFQ Review',
      phase: 'Phase 1: Concept & Planning',
      start: '2026-10-01',
      end: '2026-10-25',
      duration: 25,
      status: 'Completed',
      progress: 100,
      priority: 'High',
      function: 'PE',
      role: 'Lead Product Engineer',
      assignee: 'teammember@netlink.com',
      gate: '1. PL',
      is_kgd: false,
      wbs: '1.1',
      description: `Review customer requirements, RFQ inputs and project expectations.\n<!-- PHASE: Phase 1 — Concept & Planning -->\n<!-- RASIC: {"r":"teammember@netlink.com","a":"sarahjenkins@gmail.com","s":"aditya@netlink.com","i":"patilabhay717@gmail.com","c":"admin@example.com"} -->`,
    },
    {
      subject: 'Program Charter & Initial Risk Assessment',
      phase: 'Phase 1: Concept & Planning',
      start: '2026-10-15',
      end: '2026-11-20',
      duration: 37,
      status: 'Completed',
      progress: 100,
      priority: 'High',
      function: 'PM',
      role: 'Project Manager',
      assignee: 'sarahjenkins@gmail.com',
      gate: '1. PL',
      is_kgd: true,
      wbs: '1.2',
      description: `Complete project charter and initial program risk assessment.\n<!-- PHASE: Phase 1 — Concept & Planning -->\n<!-- KGD: true -->\n<!-- RASIC: {"r":"sarahjenkins@gmail.com","a":"admin@example.com","s":"teammember@netlink.com","i":"gatereviewer@netlink.com","c":"aditya@netlink.com"} -->`,
    },
    {
      subject: 'System Architecture & Feasibility Definition',
      phase: 'Phase 1: Concept & Planning',
      start: '2026-11-10',
      end: '2026-12-31',
      duration: 52,
      status: 'Working',
      progress: 60,
      priority: 'High',
      function: 'PE',
      role: 'Lead Product Engineer',
      assignee: 'teammember@netlink.com',
      gate: '1. PL',
      is_kgd: true,
      wbs: '1.3',
      description: `Define initial door-module architecture and technical feasibility.\n<!-- PHASE: Phase 1 — Concept & Planning -->\n<!-- KGD: true -->\n<!-- RASIC: {"r":"teammember@netlink.com","a":"sarahjenkins@gmail.com","s":"patilabhay717@gmail.com","i":"warehousemanager@netlink.com","c":"admin@example.com"} -->`,
    },
    {
      subject: 'Door Module Preliminary Design',
      phase: 'Phase 2: Product Design & Development',
      start: '2027-01-02',
      end: '2027-02-15',
      duration: 45,
      status: 'Working',
      progress: 30,
      priority: 'High',
      function: 'PE',
      role: 'Lead Product Engineer',
      assignee: 'teammember@netlink.com',
      gate: '1. PL',
      is_kgd: false,
      wbs: '2.1',
      description: `Develop preliminary mechanical/electrical door module design.\n<!-- PHASE: Phase 2 — Product Design & Development -->\n<!-- RASIC: {"r":"teammember@netlink.com","a":"sarahjenkins@gmail.com","s":"patilabhay717@gmail.com","i":"admin@example.com","c":"aditya@netlink.com"} -->`,
    },
    {
      subject: 'DFMEA & Design Requirements Review',
      phase: 'Phase 2: Product Design & Development',
      start: '2027-01-20',
      end: '2027-03-05',
      duration: 45,
      status: 'Open',
      progress: 0,
      priority: 'High',
      function: 'QA',
      role: 'APQP Engineer',
      assignee: 'aditya@netlink.com',
      gate: '2. VC',
      is_kgd: false,
      wbs: '2.2',
      description: `Complete DFMEA and verify design requirements.\n<!-- PHASE: Phase 2 — Product Design & Development -->\n<!-- RASIC: {"r":"aditya@netlink.com","a":"sarahjenkins@gmail.com","s":"teammember@netlink.com","i":"gatereviewer@netlink.com","c":"admin@example.com"} -->`,
    },
    {
      subject: 'Prototype Design Release',
      phase: 'Phase 2: Product Design & Development',
      start: '2027-02-20',
      end: '2027-03-31',
      duration: 40,
      status: 'Open',
      progress: 0,
      priority: 'High',
      function: 'PE',
      role: 'Lead Product Engineer',
      assignee: 'teammember@netlink.com',
      gate: '2. VC',
      is_kgd: false,
      wbs: '2.3',
      description: `Release prototype design package for build and validation.\n<!-- PHASE: Phase 2 — Product Design & Development -->\n<!-- RASIC: {"r":"teammember@netlink.com","a":"sarahjenkins@gmail.com","s":"patilabhay717@gmail.com","i":"admin@example.com","c":"warehousemanager@netlink.com"} -->`,
    },
    {
      subject: 'Prototype Build & PV Validation',
      phase: 'Phase 3: Validation & Launch Preparation',
      start: '2027-04-01',
      end: '2027-05-15',
      duration: 45,
      status: 'Open',
      progress: 0,
      priority: 'High',
      function: 'ME',
      role: 'Lead Manufacturing Engineer',
      assignee: 'patilabhay717@gmail.com',
      gate: '3. TKO',
      is_kgd: false,
      wbs: '3.1',
      description: `Build prototype units and execute product validation activities.\n<!-- PHASE: Phase 3 — Validation & Launch Preparation -->\n<!-- RASIC: {"r":"patilabhay717@gmail.com","a":"sarahjenkins@gmail.com","s":"teammember@netlink.com","i":"gatereviewer@netlink.com","c":"admin@example.com"} -->`,
    },
    {
      subject: 'Customer PPAP Preparation & Submission',
      phase: 'Phase 3: Validation & Launch Preparation',
      start: '2027-05-05',
      end: '2027-06-25',
      duration: 52,
      status: 'Open',
      progress: 0,
      priority: 'Urgent',
      function: 'QA',
      role: 'APQP Engineer',
      assignee: 'aditya@netlink.com',
      gate: '4. VL',
      is_kgd: false,
      wbs: '3.2',
      description: `Complete PPAP package and prepare customer submission.\n<!-- PHASE: Phase 3 — Validation & Launch Preparation -->\n<!-- RASIC: {"r":"aditya@netlink.com","a":"sarahjenkins@gmail.com","s":"patilabhay717@gmail.com","i":"admin@example.com","c":"teammember@netlink.com"} -->`,
    },
  ];

  for (const tDef of tasksDefinitions) {
    const taskPayload = {
      project: projectId,
      subject: tDef.subject,
      status: tDef.status,
      priority: tDef.priority,
      exp_start_date: tDef.start,
      exp_end_date: tDef.end,
      duration: tDef.duration,
      progress: tDef.progress,
      description: tDef.description,
      is_milestone: 0,
      custom_is_milestone: 0,
      custom_wbs: tDef.wbs,
      custom_phase: tDef.phase,
      custom_gate: tDef.gate,
      custom_function: tDef.function,
      custom_role: tDef.role,
      custom_is_mandatory_pdp: 1,
      custom_is_custom: 0,
      custom_is_kgd: tDef.is_kgd ? 1 : 0,
      _assign: JSON.stringify([tDef.assignee]),
    };

    const createRes = await axios.post(`${BASE_URL}/api/resource/Task`, taskPayload, { headers });
    const createdId = createRes.data.data?.name;
    taskNameToIdMap[tDef.subject] = createdId;
    console.log(`Created Task ${createdId}: ${tDef.subject}`);
  }

  // 5. Create Task Dependencies
  console.log('\n--- Creating Task Dependencies ---');
  const depDefinitions = [
    { pred: 'Customer Requirements & RFQ Review', succ: 'Program Charter & Initial Risk Assessment', type: 'FS', lag: 0 },
    { pred: 'Customer Requirements & RFQ Review', succ: 'System Architecture & Feasibility Definition', type: 'FS', lag: 0 },
    { pred: 'Program Charter & Initial Risk Assessment', succ: 'System Architecture & Feasibility Definition', type: 'FS', lag: 0 },
    { pred: 'System Architecture & Feasibility Definition', succ: 'Door Module Preliminary Design', type: 'FS', lag: 0 },
    { pred: 'Door Module Preliminary Design', succ: 'DFMEA & Design Requirements Review', type: 'SS', lag: 18 },
    { pred: 'Door Module Preliminary Design', succ: 'Prototype Design Release', type: 'FS', lag: 0 },
    { pred: 'DFMEA & Design Requirements Review', succ: 'Prototype Design Release', type: 'FS', lag: 0 },
    { pred: 'Prototype Design Release', succ: 'Prototype Build & PV Validation', type: 'FS', lag: 0 },
    { pred: 'Prototype Build & PV Validation', succ: 'Customer PPAP Preparation & Submission', type: 'FS', lag: 0 },
  ];

  for (const dep of depDefinitions) {
    const predId = taskNameToIdMap[dep.pred];
    const succId = taskNameToIdMap[dep.succ];
    if (predId && succId) {
      try {
        await axios.post(
          `${BASE_URL}/api/projects/${projectId}/dependencies`,
          {
            project: projectId,
            predecessor_id: predId,
            successor_id: succId,
            dependency_type: dep.type,
            lag_days: dep.lag,
          },
          { headers }
        );
        console.log(`Linked dependency: ${dep.pred} -> ${dep.succ}`);
      } catch (err: any) {
        console.log(`Dependency link notice: ${err.message}`);
      }
    }
  }

  // 6. Create 5 Explicit Milestones
  console.log('\n--- Creating 5 Explicit Milestones ---');
  const milestoneDefinitions = [
    {
      subject: 'Business Win Notification',
      is_customer: true,
      milestone_type: 'Customer Milestone',
      date: '2026-10-01',
      phase: 'Phase 1: Concept & Planning',
      status: 'Completed',
      progress: 100,
      priority: 'Urgent',
      linked_gate: '1. PL',
      linked_task: taskNameToIdMap['Customer Requirements & RFQ Review'],
      description: 'Formal customer award and business win notification.\n<!-- MILESTONE_META: {"is_milestone":true,"milestone_type":"Customer Milestone","is_customer_milestone":true,"planned_date":"2026-10-01","actual_date":"2026-10-01"} -->\n<!-- PHASE: Phase 1: Concept & Planning -->',
    },
    {
      subject: 'Design Freeze',
      is_customer: false,
      milestone_type: 'Internal Milestone',
      date: '2027-01-15',
      phase: 'Phase 2: Product Design & Development',
      status: 'Open',
      progress: 0,
      priority: 'High',
      linked_gate: '1. PL',
      linked_task: taskNameToIdMap['Door Module Preliminary Design'],
      description: 'Internal mechanical and packaging geometry design freeze.\n<!-- MILESTONE_META: {"is_milestone":true,"milestone_type":"Internal Milestone","is_customer_milestone":false,"planned_date":"2027-01-15"} -->\n<!-- PHASE: Phase 2: Product Design & Development -->',
    },
    {
      subject: 'Prototype Build Complete',
      is_customer: false,
      milestone_type: 'Internal Milestone',
      date: '2027-03-31',
      phase: 'Phase 2: Product Design & Development',
      status: 'Open',
      progress: 0,
      priority: 'High',
      linked_gate: '2. VC',
      linked_task: taskNameToIdMap['Prototype Design Release'],
      description: 'Tooling design release and prototype parts completion.\n<!-- MILESTONE_META: {"is_milestone":true,"milestone_type":"Internal Milestone","is_customer_milestone":false,"planned_date":"2027-03-31"} -->\n<!-- PHASE: Phase 2: Product Design & Development -->',
    },
    {
      subject: 'Customer PPAP Submission',
      is_customer: true,
      milestone_type: 'Customer Milestone',
      date: '2027-05-30',
      phase: 'Phase 3: Validation & Launch Preparation',
      status: 'Open',
      progress: 0,
      priority: 'Urgent',
      linked_gate: '4. VL',
      linked_task: taskNameToIdMap['Customer PPAP Preparation & Submission'],
      description: 'Customer Part Submission Warrant (PSW) and Level 3 PPAP submittal.\n<!-- MILESTONE_META: {"is_milestone":true,"milestone_type":"Customer Milestone","is_customer_milestone":true,"planned_date":"2027-05-30"} -->\n<!-- PHASE: Phase 3: Validation & Launch Preparation -->',
    },
    {
      subject: 'SOP Readiness',
      is_customer: true,
      milestone_type: 'Customer Milestone',
      date: '2027-06-30',
      phase: 'Phase 3: Validation & Launch Preparation',
      status: 'Open',
      progress: 0,
      priority: 'Urgent',
      linked_gate: '4. VL',
      linked_task: taskNameToIdMap['Customer PPAP Preparation & Submission'],
      description: 'Start of Production (SOP) line trial verification and sign-off.\n<!-- MILESTONE_META: {"is_milestone":true,"milestone_type":"Customer Milestone","is_customer_milestone":true,"planned_date":"2027-06-30"} -->\n<!-- PHASE: Phase 3: Validation & Launch Preparation -->',
    },
  ];

  for (const mDef of milestoneDefinitions) {
    const mPayload = {
      project: projectId,
      subject: mDef.subject,
      status: mDef.status,
      priority: mDef.priority,
      exp_start_date: mDef.date,
      exp_end_date: mDef.date,
      duration: 0,
      progress: mDef.progress,
      description: mDef.description,
      is_milestone: 1,
      custom_is_milestone: 1,
      custom_is_customer_milestone: mDef.is_customer ? 1 : 0,
      custom_milestone_type: mDef.milestone_type,
      custom_phase: mDef.phase,
      custom_gate: mDef.linked_gate,
      custom_linked_gate: mDef.linked_gate,
      custom_linked_task: mDef.linked_task,
      custom_is_custom: 1,
      custom_is_mandatory_pdp: 0,
      custom_is_kgd: 0,
    };

    const createRes = await axios.post(`${BASE_URL}/api/resource/Task`, mPayload, { headers });
    console.log(`Created Milestone ${createRes.data.data?.name}: ${mDef.subject}`);
  }

  // 7. Update Gate Criteria & Deliverables links to match new Task IDs
  console.log('\n--- Updating Gate Management links ---');
  const gateStorePath = path.join(process.cwd(), '.data', 'gates.json');
  let gatesData: any[] = [];
  if (fs.existsSync(gateStorePath)) {
    try {
      gatesData = JSON.parse(fs.readFileSync(gateStorePath, 'utf-8'));
    } catch {
      gatesData = [];
    }
  }

  const plGate = gatesData.find((g: any) => g.project === projectId);
  if (plGate) {
    plGate.criteria.forEach((c: any) => {
      if (c.related_task && taskNameToIdMap[c.related_task]) {
        c.related_task_id = taskNameToIdMap[c.related_task];
      }
    });
    plGate.deliverables.forEach((d: any) => {
      if (d.related_task && taskNameToIdMap[d.related_task]) {
        d.related_task_id = taskNameToIdMap[d.related_task];
      }
    });
    fs.writeFileSync(gateStorePath, JSON.stringify(gatesData, null, 2), 'utf-8');
    console.log(`Updated Gate ${plGate.name} criteria/deliverables links.`);
  }

  // 8. Update task attachments links
  console.log('\n--- Updating Task Attachments links ---');
  const taskDocsPath = path.join(process.cwd(), '.data', 'task-attachments.json');
  let taskDocs: Record<string, any[]> = {};
  if (fs.existsSync(taskDocsPath)) {
    try {
      taskDocs = JSON.parse(fs.readFileSync(taskDocsPath, 'utf-8'));
    } catch {
      taskDocs = {};
    }
  }

  const t1Id = taskNameToIdMap['Customer Requirements & RFQ Review'];
  const t2Id = taskNameToIdMap['Program Charter & Initial Risk Assessment'];
  const t5Id = taskNameToIdMap['DFMEA & Design Requirements Review'];
  const t8Id = taskNameToIdMap['Customer PPAP Preparation & Submission'];

  if (t1Id) {
    taskDocs[t1Id] = [{ id: `DOC-${t1Id}-1`, file_name: 'Customer_Requirements_Review.pdf', file_url: '/documents/Customer_Requirements_Review.pdf', file_size: 2458000, uploaded_by: 'Yash', upload_date: '2026-10-24T11:00:00Z' }];
  }
  if (t2Id) {
    taskDocs[t2Id] = [{ id: `DOC-${t2Id}-1`, file_name: 'Program_Charter.pdf', file_url: '/documents/Program_Charter.pdf', file_size: 4120000, uploaded_by: 'Sarah Jenkins', upload_date: '2026-11-20T16:00:00Z' }];
  }
  if (t5Id) {
    taskDocs[t5Id] = [{ id: `DOC-${t5Id}-1`, file_name: 'DFMEA_Design_Review.xlsx', file_url: '/documents/DFMEA_Design_Review.xlsx', file_size: 1850000, uploaded_by: 'Aditya', upload_date: '2027-01-22T09:30:00Z' }];
  }
  if (t8Id) {
    taskDocs[t8Id] = [{ id: `DOC-${t8Id}-1`, file_name: 'PPAP_Submission_Checklist.xlsx', file_url: '/documents/PPAP_Submission_Checklist.xlsx', file_size: 3200000, uploaded_by: 'Aditya', upload_date: '2027-05-10T14:15:00Z' }];
  }

  fs.writeFileSync(taskDocsPath, JSON.stringify(taskDocs, null, 2), 'utf-8');
  console.log('Task attachments updated.');

  console.log('\n=== DONE: Cleaned and Seeded Aurora Demo Project ===');
}

main().catch(e => {
  console.error('Error:', e.message, e.response?.data);
  process.exit(1);
});
