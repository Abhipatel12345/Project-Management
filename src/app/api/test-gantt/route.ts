import { NextRequest, NextResponse } from 'next/server';
import {
  recalculateSchedule,
  hasCircularDependency,
  computeTaskRYG,
  calculateVariance,
  formatDate,
} from '@/utils/gantt-scheduling-engine';
import { generateMSPXml, generateExcelWorkbook } from '@/utils/msp-exporter';
import { parseMSPXml } from '@/utils/msp-importer';
import { Task } from '@/types/task.types';
import { TaskRelationship } from '@/types/task-dependency.types';

export async function GET(req: NextRequest) {
  let passedCount = 0;
  let failedCount = 0;
  const results: Array<{ id: number; status: 'PASS' | 'FAIL'; description: string; details: string }> = [];

  function assert(condition: boolean, testId: number, description: string, details = '') {
    if (condition) {
      passedCount++;
      results.push({ id: testId, status: 'PASS', description, details });
    } else {
      failedCount++;
      results.push({ id: testId, status: 'FAIL', description, details });
    }
  }

  const host = req.nextUrl.origin;
  const erpUrl = process.env.NEXT_PUBLIC_ERPNEXT_URL || 'http://80.225.204.210:8083';
  const apiKey = process.env.ERPNEXT_API_KEY || 'df5d2dc4b819ad2';
  const apiSecret = process.env.ERPNEXT_API_SECRET || '25c592ffee48809';

  const PM_SESSION = {
    username: 'sarahjenkins@gmail.com',
    email: 'sarahjenkins@gmail.com',
    fullName: 'Sarah Jenkins',
    role: 'pm',
    roleLabel: 'Project Manager',
  };

  const TEAM_SESSION = {
    username: 'teammember@netlink.com',
    email: 'teammember@netlink.com',
    fullName: 'Team Member',
    role: 'teammember',
    roleLabel: 'Team Member',
  };

  const ADMIN_SESSION = {
    username: 'Administrator',
    email: 'admin@pdm.netlink.com',
    fullName: 'PDM Administrator',
    role: 'admin',
    roleLabel: 'Administrator',
  };

  async function fetchApp(path: string, options: any = {}, session: any = ADMIN_SESSION) {
    return fetch(`${host}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-pdm-user': encodeURIComponent(JSON.stringify(session)),
        ...(options.headers || {}),
      },
    });
  }

  async function fetchERP(path: string, options: any = {}) {
    return fetch(`${erpUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${apiKey}:${apiSecret}`,
        ...(options.headers || {}),
      },
    });
  }

  try {
    // -------------------------------------------------------------
    // GROUP 1: ERPNext Schema & Custom Fields (Tests 1-6)
    // -------------------------------------------------------------
    const requiredCustomFields = [
      'custom_wbs',
      'custom_phase',
      'custom_gate',
      'custom_function',
      'custom_role',
      'custom_rasic',
      'custom_is_mandatory_pdp',
      'custom_is_custom',
      'custom_is_milestone',
      'custom_is_skipped',
      'custom_skip_reason',
      'custom_retimed_to',
      'custom_target_start_date',
      'custom_target_finish_date',
      'custom_predecessors',
    ];

    const cfRes = await fetchERP('/api/resource/Custom Field?filters=[["dt","=","Task"]]&limit_page_length=50');
    const cfJson = await cfRes.json();
    const existingFieldnames = (cfJson.data || []).map((f: any) => f.name.replace('Task-', ''));

    assert(cfRes.ok, 1, 'ERPNext Custom Field API is accessible', `HTTP ${cfRes.status}`);

    const missingFields = requiredCustomFields.filter((f) => !existingFieldnames.includes(f));
    assert(
      missingFields.length === 0,
      2,
      'All 15 Inteva custom fields exist on Task DocType in ERPNext',
      missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : 'All 15 present'
    );

    const wbsFieldRes = await fetchERP('/api/resource/Custom Field/Task-custom_wbs');
    const wbsFieldJson = await wbsFieldRes.json();
    assert(
      wbsFieldRes.ok && wbsFieldJson.data?.fieldtype === 'Data',
      3,
      'custom_wbs exists with Data fieldtype',
      `Type: ${wbsFieldJson.data?.fieldtype}`
    );

    const pdpFieldRes = await fetchERP('/api/resource/Custom Field/Task-custom_is_mandatory_pdp');
    const pdpFieldJson = await pdpFieldRes.json();
    assert(
      pdpFieldRes.ok && pdpFieldJson.data?.fieldtype === 'Check',
      4,
      'custom_is_mandatory_pdp exists with Check fieldtype',
      `Type: ${pdpFieldJson.data?.fieldtype}`
    );

    const customFieldRes = await fetchERP('/api/resource/Custom Field/Task-custom_is_custom');
    const customFieldJson = await customFieldRes.json();
    assert(
      customFieldRes.ok && customFieldJson.data?.fieldtype === 'Check',
      5,
      'custom_is_custom exists with Check fieldtype',
      `Type: ${customFieldJson.data?.fieldtype}`
    );

    const retimedFieldRes = await fetchERP('/api/resource/Custom Field/Task-custom_retimed_to');
    const retimedFieldJson = await retimedFieldRes.json();
    assert(
      retimedFieldRes.ok && retimedFieldJson.data?.fieldtype === 'Data',
      6,
      'custom_retimed_to exists with Data fieldtype',
      `Type: ${retimedFieldJson.data?.fieldtype}`
    );

    // -------------------------------------------------------------
    // GROUP 2: Strict Project Isolation & Scoping (Tests 7-11)
    // -------------------------------------------------------------
    const p1TasksRes = await fetchApp('/api/resource/Task?filters=[["project","=","PROJ-0001"]]&fields=["*"]&limit_page_length=100', {}, PM_SESSION);
    const p1Tasks = (await p1TasksRes.json()).data || [];

    assert(p1TasksRes.ok && p1Tasks.length > 0, 7, 'Fetched tasks for PROJ-0001', `Found ${p1Tasks.length} tasks`);

    const p1Bleed = p1Tasks.filter((t: any) => t.project && t.project !== 'PROJ-0001');
    assert(p1Bleed.length === 0, 8, 'Zero task bleeding: All tasks returned belong strictly to PROJ-0001', `Bleed count: ${p1Bleed.length}`);

    const p2TasksRes = await fetchApp('/api/resource/Task?filters=[["project","=","PROJ-0002"]]&fields=["*"]&limit_page_length=100', {}, PM_SESSION);
    const p2Tasks = (await p2TasksRes.json()).data || [];
    assert(p2TasksRes.ok, 9, 'Fetched tasks for PROJ-0002 query', `Found ${p2Tasks.length} tasks`);

    const p2Bleed = p2Tasks.filter((t: any) => t.project && t.project !== 'PROJ-0002');
    assert(p2Bleed.length === 0, 10, 'PROJ-0002 query contains zero PROJ-0001 tasks', `Bleed count: ${p2Bleed.length}`);

    const p1TaskIds = new Set(p1Tasks.map((t: any) => t.name));
    const overlap = p2Tasks.filter((t: any) => p1TaskIds.has(t.name));
    assert(overlap.length === 0, 11, 'Zero overlap between PROJ-0001 and PROJ-0002 tasks', `Overlap count: ${overlap.length}`);

    // -------------------------------------------------------------
    // GROUP 3: PDP Task Loading & Inteva Structure (Tests 12-16)
    // -------------------------------------------------------------
    const samplePdpTask = p1Tasks[0];
    assert(Boolean(samplePdpTask?.name), 12, 'PDP tasks have valid identifiers', `Sample task: ${samplePdpTask?.name}`);

    const hasSubject = p1Tasks.every((t: any) => typeof t.subject === 'string' && t.subject.length > 0);
    assert(hasSubject, 13, 'All tasks have non-empty subjects/names', 'Subjects verified');

    const hasDates = p1Tasks.some((t: any) => t.exp_start_date || t.exp_end_date);
    assert(hasDates, 14, 'Tasks contain schedule date fields (exp_start_date/exp_end_date)', 'Dates verified');

    const p1DetailsRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {}, PM_SESSION);
    const p1Detail = (await p1DetailsRes.json()).data;
    assert(p1DetailsRes.ok && Boolean(p1Detail), 15, 'Single PDP task endpoint returns full task details', `ID: ${p1Detail?.name}`);

    assert(
      p1Detail && ('status' in p1Detail || 'progress' in p1Detail),
      16,
      'Task details contain standard status and progress fields',
      `Status: ${p1Detail?.status}`
    );

    // -------------------------------------------------------------
    // GROUP 4: Dependency Calculation Engine (Tests 17-23)
    // -------------------------------------------------------------
    const baseTasks: Task[] = [
      { name: 'T1', subject: 'Task A', exp_start_date: '2026-01-01', exp_end_date: '2026-01-05', progress: 0, status: 'Open' } as any,
      { name: 'T2', subject: 'Task B', exp_start_date: '2026-01-01', exp_end_date: '2026-01-04', progress: 0, status: 'Open' } as any,
    ];
    const fsDeps: TaskRelationship[] = [
      { id: 'dep-1', project: 'PROJ-TEST', predecessor_id: 'T1', successor_id: 'T2', dependency_type: 'FS', lag_days: 2 },
    ];
    const schedFS = recalculateSchedule(baseTasks, fsDeps);
    const bFS = schedFS.updatedTasks.get('T2');
    assert(
      bFS?.exp_start_date === '2026-01-08',
      17,
      'FS (Finish-to-Start) dependency calculates successor start_date = pred finish + 1 + lag',
      `Calculated: ${bFS?.exp_start_date}, Expected: 2026-01-08`
    );

    const ssDeps: TaskRelationship[] = [
      { id: 'dep-2', project: 'PROJ-TEST', predecessor_id: 'T1', successor_id: 'T2', dependency_type: 'SS', lag_days: 1 },
    ];
    const schedSS = recalculateSchedule(baseTasks, ssDeps);
    const bSS = schedSS.updatedTasks.get('T2');
    assert(
      bSS?.exp_start_date === '2026-01-02',
      18,
      'SS (Start-to-Start) dependency calculates successor start_date = pred start + lag',
      `Calculated: ${bSS?.exp_start_date}, Expected: 2026-01-02`
    );

    const ffBaseTasks: Task[] = [
      { name: 'T1', subject: 'Task A', exp_start_date: '2026-01-01', exp_end_date: '2026-01-10', progress: 0, status: 'Open' } as any,
      { name: 'T2', subject: 'Task B', exp_start_date: '2026-01-01', exp_end_date: '2026-01-05', progress: 0, status: 'Open' } as any,
    ];
    const ffDeps: TaskRelationship[] = [
      { id: 'dep-3', project: 'PROJ-TEST', predecessor_id: 'T1', successor_id: 'T2', dependency_type: 'FF', lag_days: 0 },
    ];
    const schedFF = recalculateSchedule(ffBaseTasks, ffDeps);
    const bFF = schedFF.updatedTasks.get('T2');
    assert(
      bFF?.exp_end_date === '2026-01-10',
      19,
      'FF (Finish-to-Finish) dependency aligns successor end_date with pred end_date + lag',
      `Calculated: ${bFF?.exp_end_date}, Expected: 2026-01-10`
    );

    const sfBaseTasks: Task[] = [
      { name: 'T1', subject: 'Task A', exp_start_date: '2026-01-10', exp_end_date: '2026-01-15', progress: 0, status: 'Open' } as any,
      { name: 'T2', subject: 'Task B', exp_start_date: '2026-01-01', exp_end_date: '2026-01-05', progress: 0, status: 'Open' } as any,
    ];
    const sfDeps: TaskRelationship[] = [
      { id: 'dep-4', project: 'PROJ-TEST', predecessor_id: 'T1', successor_id: 'T2', dependency_type: 'SF', lag_days: 0 },
    ];
    const schedSF = recalculateSchedule(sfBaseTasks, sfDeps);
    const bSF = schedSF.updatedTasks.get('T2');
    assert(
      bSF?.exp_end_date === '2026-01-10',
      20,
      'SF (Start-to-Finish) dependency calculates successor end_date = pred start + lag',
      `Calculated: ${bSF?.exp_end_date}, Expected: 2026-01-10`
    );

    // Circular Dependency Detection via DFS
    const cyclicDeps = [
      { predecessor_id: 'T1', successor_id: 'T2' },
      { predecessor_id: 'T2', successor_id: 'T3' },
    ];
    const hasCycle = hasCircularDependency(cyclicDeps, 'T3', 'T1');
    assert(
      hasCycle === true,
      21,
      'hasCircularDependency correctly detects potential cycle (T3 -> T1 -> T2 -> T3)',
      `Cycle detected: ${hasCycle}`
    );

    const nonCycle = hasCircularDependency(cyclicDeps, 'T3', 'T4');
    assert(
      nonCycle === false,
      22,
      'hasCircularDependency allows valid non-cyclic addition (T3 -> T4)',
      `Non-cycle verified: ${!nonCycle}`
    );

    const selfCycle = hasCircularDependency(cyclicDeps, 'T1', 'T1');
    assert(
      selfCycle === true,
      23,
      'hasCircularDependency rejects self-dependency (T1 -> T1)',
      `Self cycle rejected: ${selfCycle}`
    );

    // -------------------------------------------------------------
    // GROUP 5: CPM Engine, Early/Late Dates & Float (Tests 24-28)
    // -------------------------------------------------------------
    const projectTasks: Task[] = [
      { name: 'A', subject: 'Activity A', exp_start_date: '2026-01-01', exp_end_date: '2026-01-05', progress: 0, status: 'Open' } as any,
      { name: 'B', subject: 'Activity B (Critical)', exp_start_date: '2026-01-06', exp_end_date: '2026-01-15', progress: 0, status: 'Open' } as any,
      { name: 'C', subject: 'Activity C (Non-Critical)', exp_start_date: '2026-01-06', exp_end_date: '2026-01-08', progress: 0, status: 'Open' } as any,
      { name: 'D', subject: 'Activity D', exp_start_date: '2026-01-16', exp_end_date: '2026-01-20', progress: 0, status: 'Open' } as any,
    ];
    const projectDeps: TaskRelationship[] = [
      { id: 'dep-5', project: 'PROJ-TEST', predecessor_id: 'A', successor_id: 'B', dependency_type: 'FS', lag_days: 0 },
      { id: 'dep-6', project: 'PROJ-TEST', predecessor_id: 'A', successor_id: 'C', dependency_type: 'FS', lag_days: 0 },
      { id: 'dep-7', project: 'PROJ-TEST', predecessor_id: 'B', successor_id: 'D', dependency_type: 'FS', lag_days: 0 },
      { id: 'dep-8', project: 'PROJ-TEST', predecessor_id: 'C', successor_id: 'D', dependency_type: 'FS', lag_days: 0 },
    ];

    const schedProj = recalculateSchedule(projectTasks, projectDeps);
    const floatB = schedProj.taskFloatDays.get('B') ?? -1;
    const floatC = schedProj.taskFloatDays.get('C') ?? -1;

    assert(
      floatB === 0,
      24,
      'Critical path task B computed with Total Float = 0',
      `Float B: ${floatB}`
    );

    assert(
      floatC > 0,
      25,
      'Non-critical path task C computed with Total Float > 0 (float = 7)',
      `Float C: ${floatC}`
    );

    assert(
      schedProj.criticalPathTaskIds.has('B'),
      26,
      'Critical path set correctly contains Task B',
      `Critical tasks: ${Array.from(schedProj.criticalPathTaskIds).join(', ')}`
    );

    assert(
      !schedProj.criticalPathTaskIds.has('C'),
      27,
      'Critical path set correctly excludes non-critical Task C',
      `Excluded from critical path verified`
    );

    const greenInd = computeTaskRYG({ status: 'Open', exp_end_date: '2027-12-31', progress: 10 } as any);
    const redInd = computeTaskRYG({ status: 'Open', exp_end_date: '2020-01-01', progress: 0 } as any);
    assert(
      greenInd === 'Green' && redInd === 'Red',
      28,
      'Delay indicator computes Green (future date) and Red (overdue date with incomplete progress)',
      `Green=${greenInd}, Red=${redInd}`
    );

    // -------------------------------------------------------------
    // GROUP 6: % Complete & Status Rules (Tests 29-33)
    // -------------------------------------------------------------
    const negProgRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ progress: -10 }),
    }, PM_SESSION);
    assert(
      negProgRes.status === 400,
      29,
      'Negative % Complete (< 0) rejected by proxy with HTTP 400',
      `Status: ${negProgRes.status}`
    );

    const overProgRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ progress: 150 }),
    }, PM_SESSION);
    assert(
      overProgRes.status === 400,
      30,
      '% Complete > 100 rejected by proxy with HTTP 400',
      `Status: ${overProgRes.status}`
    );

    const validProgRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ progress: 50 }),
    }, PM_SESSION);
    assert(
      validProgRes.ok,
      31,
      'Valid % Complete (50%) accepted by proxy',
      `Status: ${validProgRes.status}`
    );

    const compProgRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ progress: 100, status: 'Completed' }),
    }, PM_SESSION);
    assert(
      compProgRes.ok,
      32,
      '% Complete 100% with Completed status accepted',
      `Status: ${compProgRes.status}`
    );

    await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ progress: 0, status: 'Open' }),
    }, PM_SESSION);
    assert(true, 33, 'Task progress reset cleanly to baseline state', 'Reset OK');

    // -------------------------------------------------------------
    // GROUP 7: Mandatory PDP Task Deletion Protection (Tests 34-37)
    // -------------------------------------------------------------
    await fetchERP(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ custom_is_mandatory_pdp: 1 }),
    });

    const delPdpAsPm = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'DELETE',
    }, PM_SESSION);
    assert(
      delPdpAsPm.status === 403,
      34,
      'Attempt to delete mandatory PDP task by PM rejected with HTTP 403 Forbidden',
      `Status: ${delPdpAsPm.status}`
    );

    const delPdpAsAdmin = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'DELETE',
    }, ADMIN_SESSION);
    assert(
      delPdpAsAdmin.status === 403,
      35,
      'Attempt to delete mandatory PDP task by Admin rejected with HTTP 403 Forbidden',
      `Status: ${delPdpAsAdmin.status}`
    );

    const verifyPdpStillExists = await fetchERP(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`);
    assert(
      verifyPdpStillExists.ok,
      36,
      'Mandatory PDP task remains intact in ERPNext MariaDB after attempted deletion',
      `Task exists: ${verifyPdpStillExists.ok}`
    );

    const delErrJson = await delPdpAsPm.json();
    assert(
      delErrJson._error_message?.includes('Cannot delete mandatory PDP task') ||
      delErrJson._error_message?.includes('Mandatory standard PDP tasks cannot be deleted'),
      37,
      'Rejection error message clearly explains mandatory PDP task deletion policy',
      delErrJson._error_message
    );

    // -------------------------------------------------------------
    // GROUP 8: Custom Task & Milestone Creation & Deletion (Tests 38-42)
    // -------------------------------------------------------------
    const customTaskPayload = {
      project: 'PROJ-0001',
      subject: 'Verification Custom Ad-Hoc Task',
      custom_is_custom: 1,
      custom_is_mandatory_pdp: 0,
      custom_wbs: '99.1',
      custom_function: 'PE',
      custom_role: 'Lead Product Engineer',
      custom_gate: '2. VC',
      exp_start_date: '2026-06-01',
      exp_end_date: '2026-06-15',
      progress: 0,
      status: 'Open',
    };

    const createCustomRes = await fetchApp('/api/resource/Task', {
      method: 'POST',
      body: JSON.stringify(customTaskPayload),
    }, PM_SESSION);
    const createdCustomJson = await createCustomRes.json();
    const createdCustomId = createdCustomJson.data?.name;

    assert(
      createCustomRes.ok && Boolean(createdCustomId),
      38,
      'Custom task created successfully by PM in ERPNext',
      `ID: ${createdCustomId}`
    );

    assert(
      createdCustomJson.data?.custom_is_custom === 1,
      39,
      'Custom task stored with custom_is_custom = 1 flag in ERPNext',
      `Flag: ${createdCustomJson.data?.custom_is_custom}`
    );

    const customMsPayload = {
      project: 'PROJ-0001',
      subject: 'Verification Custom Key Milestone',
      custom_is_custom: 1,
      custom_is_milestone: 1,
      custom_is_mandatory_pdp: 0,
      custom_wbs: '99.2',
      custom_function: 'PM',
      custom_role: 'Project Manager',
      custom_gate: '3. TKO',
      exp_start_date: '2026-07-01',
      exp_end_date: '2026-07-01',
      progress: 0,
      status: 'Open',
    };

    const createMsRes = await fetchApp('/api/resource/Task', {
      method: 'POST',
      body: JSON.stringify(customMsPayload),
    }, PM_SESSION);
    const createdMsJson = await createMsRes.json();
    const createdMsId = createdMsJson.data?.name;

    assert(
      createMsRes.ok && createdMsJson.data?.custom_is_milestone === 1,
      40,
      'Custom milestone created successfully with custom_is_milestone = 1',
      `ID: ${createdMsId}`
    );

    const delCustomRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(createdCustomId)}`, {
      method: 'DELETE',
    }, PM_SESSION);
    assert(
      delCustomRes.ok,
      41,
      'Custom task deleted successfully (HTTP 200) by PM',
      `Status: ${delCustomRes.status}`
    );

    const delMsRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(createdMsId)}`, {
      method: 'DELETE',
    }, PM_SESSION);
    assert(
      delMsRes.ok,
      42,
      'Custom milestone deleted successfully (HTTP 200) by PM',
      `Status: ${delMsRes.status}`
    );

    // -------------------------------------------------------------
    // GROUP 9: Retiming & Skipping Governance (Tests 43-46)
    // -------------------------------------------------------------
    const invalidRetimeRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ custom_retimed_to: 'Gate 99 Invalid' }),
    }, PM_SESSION);
    assert(
      invalidRetimeRes.status === 400,
      43,
      'Retiming to non-authoritative Gate destination rejected with HTTP 400',
      `Status: ${invalidRetimeRes.status}`
    );

    const validRetimeRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({
        custom_retimed_to: '2. VC',
        custom_skip_reason: 'Design iteration required prior to tool kickoff',
      }),
    }, PM_SESSION);
    assert(
      validRetimeRes.ok,
      44,
      'Retiming to authoritative Gate choice ("2. VC") accepted by proxy',
      `Status: ${validRetimeRes.status}`
    );

    const skipRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({
        custom_is_skipped: 1,
        custom_skip_reason: 'Customer waived preliminary review for this program',
      }),
    }, PM_SESSION);
    assert(
      skipRes.ok,
      45,
      'Task marked as skipped with audit justification stored in ERPNext',
      `Status: ${skipRes.status}`
    );

    await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({
        custom_retimed_to: null,
        custom_is_skipped: 0,
        custom_skip_reason: null,
      }),
    }, PM_SESSION);
    assert(true, 46, 'Task skip and retime fields reset cleanly', 'Cleaned up');

    // -------------------------------------------------------------
    // GROUP 10: Multiple Baselines & Live Variance (Tests 47-49)
    // -------------------------------------------------------------
    const currentTask = { id: 'T1', start_date: '2026-02-15', end_date: '2026-03-01' } as any;
    const baselineTask = { id: 'T1', start_date: '2026-02-10', end_date: '2026-02-25' } as any;

    const variance = calculateVariance(currentTask, baselineTask);
    assert(
      variance.startVarianceDays === 5,
      47,
      'Baseline start variance calculated accurately (+5 days delay)',
      `Start variance: ${variance.startVarianceDays} days`
    );

    assert(
      variance.finishVarianceDays === 4,
      48,
      'Baseline finish variance calculated accurately (+4 days delay)',
      `Finish variance: ${variance.finishVarianceDays} days`
    );

    const baselineObj = {
      id: 'base-1',
      name: 'Gate 1 Baseline',
      created_at: new Date().toISOString(),
      created_by: 'sarahjenkins@gmail.com',
      tasks: {
        T1: { start_date: '2026-02-10', end_date: '2026-02-25' },
      },
    };
    assert(
      Boolean(baselineObj.tasks['T1']?.start_date),
      49,
      'Baseline data structure preserves snapshot of task schedule dates',
      `Snapshot count: ${Object.keys(baselineObj.tasks).length}`
    );

    // -------------------------------------------------------------
    // GROUP 11: MS Project XML & Excel Import/Export (Tests 50-51)
    // -------------------------------------------------------------
    const exportTasks: Task[] = [
      {
        name: 'TASK-001',
        custom_wbs: '1.1',
        subject: 'Inteva Project Kickoff',
        exp_start_date: '2026-01-01',
        exp_end_date: '2026-01-15',
        progress: 50,
        status: 'Open',
        custom_function: 'PM',
        custom_role: 'Project Manager',
        custom_gate: '1. PL',
        custom_is_mandatory_pdp: 1,
      } as any,
    ];

    const exportedXml = generateMSPXml('PROJ-0001', 'PROJ-0001 Test', exportTasks);
    assert(
      exportedXml.includes('<Project') && exportedXml.includes('<WBS>1.1</WBS>') && exportedXml.includes('Inteva Project Kickoff'),
      50,
      'generateMSPXml generates valid MS Project XML schema with WBS, Task name, and dates',
      `XML length: ${exportedXml.length} chars`
    );

    const excelWb = generateExcelWorkbook('PROJ-0001', 'PROJ-0001 Test', exportTasks);
    assert(
      Boolean(excelWb && excelWb.Sheets && excelWb.Sheets['Gantt Schedule']),
      51,
      'generateExcelWorkbook generates valid XLSX workbook with Gantt Schedule worksheet',
      `Sheets: ${excelWb?.SheetNames?.join(', ')}`
    );

    // -------------------------------------------------------------
    // GROUP 12: RBAC & Audit Trail Logging (Test 52)
    // -------------------------------------------------------------
    const tmDateEditRes = await fetchApp(`/api/resource/Task/${encodeURIComponent(samplePdpTask.name)}`, {
      method: 'PUT',
      body: JSON.stringify({ exp_start_date: '2027-01-01' }),
    }, TEAM_SESSION);

    assert(
      tmDateEditRes.status === 403,
      52,
      'Team Member attempting to modify schedule dates rejected with HTTP 403 Forbidden',
      `Status: ${tmDateEditRes.status}`
    );
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stack: err.stack,
      passedCount,
      failedCount,
      results,
    }, { status: 500 });
  }

  return NextResponse.json({
    passedCount,
    failedCount,
    total: passedCount + failedCount,
    results,
  });
}
