import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

const adminSession = {
  username: 'admin',
  email: 'admin@example.com',
  fullName: 'Administrator',
  role: 'admin',
  permissions: {
    manageUsers: true,
    manageProjects: true,
    manageTasks: true,
    manageDeliverables: true,
    manageTeamMembers: true,
    manageBoardMembers: true,
    manageProjectSettings: true,
    reviewGates: true,
    approveGates: true,
    reviewDesign: true,
    approveDesign: true,
    manageWarehouse: true,
    viewReports: true,
  }
};

const adminCookie = 'pdm_session=' + Buffer.from(JSON.stringify(adminSession)).toString('base64');
const headers = {
  'Cookie': adminCookie,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('--- Step 1: Checking or Creating Aurora Demo Project ---');
  
  // 1. Check if Aurora project already exists
  const projListRes = await axios.get(`${BASE_URL}/api/resource/Project?fields=["name","project_name"]&limit_page_length=100`, { headers });
  const allProjects = projListRes.data.data || [];
  let auroraProject = allProjects.find((p: any) => 
    p.project_name?.includes('Aurora') ||
    p.name?.includes('Aurora') ||
    p.name === 'PROJ-0126'
  );

  let projectId = auroraProject?.name;

  if (!projectId) {
    console.log('Aurora project not found. Creating in ERPNext...');
    const projectPayload = {
      project_name: 'Aurora – Next Generation Integrated Door Module Development',
      project_type: 'A',
      custom_pdp_category: 'A',
      custom_project_category: 'New Product Development',
      custom_product_group: 'Door Systems',
      custom_project_manager: 'sarahjenkins@gmail.com',
      company: 'Netlink',
      status: 'Open',
      priority: 'High',
      percent_complete: 35,
      expected_start_date: '2026-10-01',
      expected_end_date: '2027-06-30',
      custom_sop_date: '2027-06-30',
      custom_vehicle: 'Aurora SUV EV Platform',
      custom_segment: 'C-Segment Premium',
      custom_region: 'North America',
      custom_country: 'US',
      custom_manufacturing_plant: 'Adrian',
      notes: 'Automotive PDM Demonstration Project — Inteva Development Time Plan & Customer Milestones',
    };

    const createProjRes = await axios.post(`${BASE_URL}/api/resource/Project`, projectPayload, { headers });
    projectId = createProjRes.data.data?.name;
    console.log(`Created Project in ERPNext: ${projectId}`);
  } else {
    console.log(`Found Existing Project: ${projectId}`);
  }

  // 2. Set Project Team Members in .data/project-teams.json
  console.log('--- Step 2: Setting Project Team Members ---');
  const teamsFilePath = path.join(process.cwd(), '.data', 'project-teams.json');
  let teamsData: Record<string, any[]> = {};
  if (fs.existsSync(teamsFilePath)) {
    try {
      teamsData = JSON.parse(fs.readFileSync(teamsFilePath, 'utf-8'));
    } catch (e) {
      teamsData = {};
    }
  }

  const demoTeamMembers = [
    {
      id: `TM-${projectId}-1`,
      project_id: projectId,
      user_email: 'sarahjenkins@gmail.com',
      employee_name: 'Sarah Jenkins',
      department: 'Program Management',
      function_name: 'PM',
      role: 'Project Manager',
      is_board_member: true,
      status: 'Active',
      creation: '2026-10-01T08:00:00Z',
    },
    {
      id: `TM-${projectId}-2`,
      project_id: projectId,
      user_email: 'teammember@netlink.com',
      employee_name: 'Yash',
      department: 'Product Engineering',
      function_name: 'PE',
      role: 'Lead Product Engineer',
      is_board_member: false,
      status: 'Active',
      creation: '2026-10-01T08:00:00Z',
    },
    {
      id: `TM-${projectId}-3`,
      project_id: projectId,
      user_email: 'aditya@netlink.com',
      employee_name: 'Aditya',
      department: 'Quality Assurance',
      function_name: 'QA',
      role: 'APQP Engineer',
      is_board_member: false,
      status: 'Active',
      creation: '2026-10-01T08:00:00Z',
    },
    {
      id: `TM-${projectId}-4`,
      project_id: projectId,
      user_email: 'patilabhay717@gmail.com',
      employee_name: 'Abhay Patil',
      department: 'Manufacturing Engineering',
      function_name: 'ME',
      role: 'Lead Manufacturing Engineer',
      is_board_member: false,
      status: 'Active',
      creation: '2026-10-01T08:00:00Z',
    },
    {
      id: `TM-${projectId}-5`,
      project_id: projectId,
      user_email: 'warehousemanager@netlink.com',
      employee_name: 'Robert Sterling',
      department: 'Supply Chain Management',
      function_name: 'SCM',
      role: 'Supply Chain Program Manager',
      is_board_member: false,
      status: 'Active',
      creation: '2026-10-01T08:00:00Z',
    },
    {
      id: `TM-${projectId}-6`,
      project_id: projectId,
      user_email: 'gatereviewer@netlink.com',
      employee_name: 'Reviewer',
      department: 'Reliability & Test',
      function_name: 'RE',
      role: 'Reliability & Test Engineer',
      is_board_member: true,
      status: 'Active',
      creation: '2026-10-01T08:00:00Z',
    },
  ];

  teamsData[projectId] = demoTeamMembers;
  fs.writeFileSync(teamsFilePath, JSON.stringify(teamsData, null, 2), 'utf-8');
  console.log(`Saved ${demoTeamMembers.length} team members for project ${projectId}.`);

  // 3. Fetch existing tasks for this project
  console.log('--- Step 3: Inspecting Existing Project Tasks in ERPNext ---');
  const taskQuery = encodeURIComponent(JSON.stringify([['project', '=', projectId]]));
  const existingTasksRes = await axios.get(
    `${BASE_URL}/api/resource/Task?filters=${taskQuery}&limit_page_length=100`,
    { headers }
  );
  const existingTasks = existingTasksRes.data.data || [];
  console.log(`Current tasks in project ${projectId}: ${existingTasks.length}`);

  // Map to hold taskId for created/existing tasks
  const taskNameToIdMap: Record<string, string> = {};
  existingTasks.forEach((t: any) => {
    taskNameToIdMap[t.subject] = t.name;
  });

  // 4. Create the 8 Unique Project Tasks
  console.log('--- Step 4: Creating 8 Unique Project Tasks ---');
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
      description: `Release prototype design package for build and validation.\n<!-- PHASE: Phase 2 — Product Design & Development -->\n<!-- RASIC: {"r":"teammember@netlink.com","a":"sarahjenkins@gmail.com","s":"patilabhay717@gmail.com","i":"admin@example.com","c":"warehouse@pdm.netlink.com"} -->`,
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
    const existing = existingTasks.find((et: any) => et.subject === tDef.subject);
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

    if (existing) {
      console.log(`Updating existing task: ${existing.name} (${tDef.subject})`);
      await axios.put(`${BASE_URL}/api/resource/Task/${existing.name}`, taskPayload, { headers });
      taskNameToIdMap[tDef.subject] = existing.name;
    } else {
      console.log(`Creating task: ${tDef.subject}`);
      const createRes = await axios.post(`${BASE_URL}/api/resource/Task`, taskPayload, { headers });
      const createdId = createRes.data.data?.name;
      taskNameToIdMap[tDef.subject] = createdId;
      console.log(`Created Task ${createdId} for ${tDef.subject}`);
    }
  }

  // 5. Create Task Dependencies
  console.log('--- Step 5: Creating Task Dependencies for Critical Path ---');
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
        console.log(`Linked dependency: ${dep.pred} -> ${dep.succ} (${dep.type}+${dep.lag}d)`);
      } catch (err: any) {
        console.log(`Dependency notice for ${dep.pred} -> ${dep.succ}: ${err.response?.data?._error_message || err.message}`);
      }
    }
  }

  // 6. Create 5 Explicit Milestones (is_milestone: 1, duration: 0)
  console.log('--- Step 6: Creating 5 Explicit Milestones ---');
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
    const existing = existingTasks.find((et: any) => et.subject === mDef.subject);
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

    if (existing) {
      console.log(`Updating existing milestone: ${existing.name} (${mDef.subject})`);
      await axios.put(`${BASE_URL}/api/resource/Task/${existing.name}`, mPayload, { headers });
    } else {
      console.log(`Creating milestone: ${mDef.subject}`);
      const createRes = await axios.post(`${BASE_URL}/api/resource/Task`, mPayload, { headers });
      console.log(`Created Milestone ${createRes.data.data?.name} for ${mDef.subject}`);
    }
  }

  // 7. Create/Link PL Gate in Gate Management
  console.log('--- Step 7: Creating & Linking PL Gate ---');
  const gateStorePath = path.join(process.cwd(), '.data', 'gates.json');
  let gatesData: any[] = [];
  if (fs.existsSync(gateStorePath)) {
    try {
      gatesData = JSON.parse(fs.readFileSync(gateStorePath, 'utf-8'));
    } catch {
      gatesData = [];
    }
  }

  let plGate = gatesData.find((g: any) => (g.project === projectId || g.project_id === projectId) && (g.gate_type === '1. PL' || g.gate_name?.includes('PL')));

  const plCriteria = [
    {
      id: `CRIT-${projectId}-1`,
      name: 'Customer Requirements & RFQ Sign-off',
      description: 'Review and sign-off of initial customer specifications, technical CTRS and requirements.',
      status: 'Completed',
      is_required: true,
      function: 'PE',
      responsible_person: 'Yash',
      responsible_user_id: 'teammember@netlink.com',
      related_task: 'Customer Requirements & RFQ Review',
      related_task_id: taskNameToIdMap['Customer Requirements & RFQ Review'],
      document_reference: 'Customer_Requirements_Review.pdf',
      linked_document_name: 'Customer_Requirements_Review.pdf',
      completion_percentage: 100,
      approved_by: 'Sarah Jenkins',
      approved_at: '2026-10-26T14:30:00Z',
    },
    {
      id: `CRIT-${projectId}-2`,
      name: 'Program Charter & Initial Risk Assessment (KGD)',
      description: 'Approved project charter, staffing plan, initial risk matrix and boundary diagrams.',
      status: 'Completed',
      is_required: true,
      function: 'PM',
      responsible_person: 'Sarah Jenkins',
      responsible_user_id: 'sarahjenkins@gmail.com',
      related_task: 'Program Charter & Initial Risk Assessment',
      related_task_id: taskNameToIdMap['Program Charter & Initial Risk Assessment'],
      document_reference: 'Program_Charter.pdf',
      linked_document_name: 'Program_Charter.pdf',
      completion_percentage: 100,
      approved_by: 'Administrator',
      approved_at: '2026-11-21T10:00:00Z',
    },
    {
      id: `CRIT-${projectId}-3`,
      name: 'System Architecture & Feasibility Definition (KGD)',
      description: 'Initial door module packaging architecture, electrical topology and preliminary feasibility study.',
      status: 'In Progress',
      is_required: true,
      function: 'PE',
      responsible_person: 'Yash',
      responsible_user_id: 'teammember@netlink.com',
      related_task: 'System Architecture & Feasibility Definition',
      related_task_id: taskNameToIdMap['System Architecture & Feasibility Definition'],
      document_reference: 'Door_Module_Feasibility_Report.pdf',
      linked_document_name: 'Door_Module_Feasibility_Report.pdf',
      completion_percentage: 60,
    },
    {
      id: `CRIT-${projectId}-4`,
      name: 'Financial Business Case & Budget Allocation',
      description: 'Program tooling investment, piece-cost targets, IRR and initial capital budget sign-off.',
      status: 'Completed',
      is_required: true,
      function: 'FIN',
      responsible_person: 'Administrator',
      responsible_user_id: 'admin@example.com',
      completion_percentage: 100,
      approved_by: 'Sarah Jenkins',
      approved_at: '2026-11-15T09:00:00Z',
    },
  ];

  const plDeliverables = [
    {
      id: `DEL-${projectId}-1`,
      name: 'Approved Program Charter',
      title: 'Approved Program Charter',
      description: 'Finalized and signed program charter document.',
      status: 'Approved',
      completion_percentage: 100,
      is_required: true,
      responsible_person: 'Sarah Jenkins',
      responsible_user_id: 'sarahjenkins@gmail.com',
      related_task: 'Program Charter & Initial Risk Assessment',
      related_task_id: taskNameToIdMap['Program Charter & Initial Risk Assessment'],
      document_reference: 'Program_Charter.pdf',
      linked_document_name: 'Program_Charter.pdf',
      approved_by: 'Administrator',
      approved_at: '2026-11-21T10:00:00Z',
    },
    {
      id: `DEL-${projectId}-2`,
      name: 'Door Module Architecture & Feasibility Package',
      title: 'Door Module Architecture & Feasibility Package',
      description: 'Mechanical packaging, clearance models and EE schematics.',
      status: 'In Progress',
      completion_percentage: 60,
      is_required: true,
      responsible_person: 'Yash',
      responsible_user_id: 'teammember@netlink.com',
      related_task: 'System Architecture & Feasibility Definition',
      related_task_id: taskNameToIdMap['System Architecture & Feasibility Definition'],
      document_reference: 'Door_Module_Feasibility_Report.pdf',
      linked_document_name: 'Door_Module_Feasibility_Report.pdf',
    },
  ];

  if (!plGate) {
    const newGateId = `GATE-2026-${String(gatesData.length + 1).padStart(5, '0')}`;
    plGate = {
      name: newGateId,
      gate_name: 'PL — Product Launch Review',
      project: projectId,
      project_name: 'Aurora – Next Generation Integrated Door Module Development',
      gate_type: '1. PL',
      planned_date: '2026-12-15',
      target_date: '2026-12-15',
      actual_date: undefined,
      status: 'In Progress',
      gate_owner: 'Sarah Jenkins',
      gate_owner_id: 'sarahjenkins@gmail.com',
      gate_reviewer: 'Reviewer',
      reviewer_user_id: 'gatereviewer@netlink.com',
      approval_status: 'Pending',
      completion_percentage: 75,
      readiness_percentage: 75,
      description: 'Concept & Planning Exit Gate Review for Aurora Door Module Program',
      criteria: plCriteria,
      deliverables: plDeliverables,
      reviews: [],
      activity_log: [
        {
          id: `ACT-${Date.now()}`,
          timestamp: '2026-10-01 09:00',
          user: 'Sarah Jenkins',
          action: 'Created APQP Gate Milestone 1. PL',
        },
      ],
    };
    gatesData.unshift(plGate);
  } else {
    plGate.gate_name = 'PL — Product Launch Review';
    plGate.planned_date = '2026-12-15';
    plGate.target_date = '2026-12-15';
    plGate.criteria = plCriteria;
    plGate.deliverables = plDeliverables;
    plGate.completion_percentage = 75;
    plGate.readiness_percentage = 75;
  }

  fs.writeFileSync(gateStorePath, JSON.stringify(gatesData, null, 2), 'utf-8');
  console.log(`Saved Gate ${plGate.name} (${plGate.gate_name}) for project ${projectId}.`);

  // 8. Add Document attachments for Tasks in .data/task-attachments.json if available
  console.log('--- Step 8: Associating Task Evidence / Documents ---');
  const taskDocsPath = path.join(process.cwd(), '.data', 'task-attachments.json');
  let taskDocs: Record<string, any[]> = {};
  if (fs.existsSync(taskDocsPath)) {
    try {
      taskDocs = JSON.parse(fs.readFileSync(taskDocsPath, 'utf-8'));
    } catch {
      taskDocs = {};
    }
  }

  const task1Id = taskNameToIdMap['Customer Requirements & RFQ Review'];
  const task2Id = taskNameToIdMap['Program Charter & Initial Risk Assessment'];
  const task5Id = taskNameToIdMap['DFMEA & Design Requirements Review'];
  const task8Id = taskNameToIdMap['Customer PPAP Preparation & Submission'];

  if (task1Id) {
    taskDocs[task1Id] = [
      {
        id: `DOC-${task1Id}-1`,
        file_name: 'Customer_Requirements_Review.pdf',
        file_url: '/documents/Customer_Requirements_Review.pdf',
        file_size: 2458000,
        uploaded_by: 'Yash',
        upload_date: '2026-10-24T11:00:00Z',
      },
    ];
  }
  if (task2Id) {
    taskDocs[task2Id] = [
      {
        id: `DOC-${task2Id}-1`,
        file_name: 'Program_Charter.pdf',
        file_url: '/documents/Program_Charter.pdf',
        file_size: 4120000,
        uploaded_by: 'Sarah Jenkins',
        upload_date: '2026-11-20T16:00:00Z',
      },
    ];
  }
  if (task5Id) {
    taskDocs[task5Id] = [
      {
        id: `DOC-${task5Id}-1`,
        file_name: 'DFMEA_Design_Review.xlsx',
        file_url: '/documents/DFMEA_Design_Review.xlsx',
        file_size: 1850000,
        uploaded_by: 'Aditya',
        upload_date: '2027-01-22T09:30:00Z',
      },
    ];
  }
  if (task8Id) {
    taskDocs[task8Id] = [
      {
        id: `DOC-${task8Id}-1`,
        file_name: 'PPAP_Submission_Checklist.xlsx',
        file_url: '/documents/PPAP_Submission_Checklist.xlsx',
        file_size: 3200000,
        uploaded_by: 'Aditya',
        upload_date: '2027-05-10T14:15:00Z',
      },
    ];
  }

  fs.writeFileSync(taskDocsPath, JSON.stringify(taskDocs, null, 2), 'utf-8');
  console.log('Task evidence documents configured successfully.');

  console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
  console.log(`Project ID: ${projectId}`);
  console.log(`Tasks: 8 Unique Tasks`);
  console.log(`Milestones: 5 Real Milestones`);
  console.log(`Gate: 1. PL Gate with 4 Criteria & 2 Deliverables`);
  console.log(`Team: 6 Automotive Team Members`);
}

main().catch((e) => {
  console.error('Seed error:', e.message, e.response?.data);
  process.exit(1);
});
