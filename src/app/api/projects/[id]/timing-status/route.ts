import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/server/session';
import { saveAuditRecord } from '@/lib/server/audit-store';
import {
  PDP_TIMING_MILESTONES,
  getBenchmarkWeeks,
  calculateTimingWeeks,
  calculateBenchmarkFinishDate,
  calculateWeekVariance,
  evaluateTimingStatus,
  TIMING_STATUS_CHOICES,
  TimingStatusChoice,
} from '@/config/timing-benchmark.config';
import {
  ProjectStatusTimingChart,
  ProjectStatusTimingLineItem,
} from '@/types/timing-status.types';

const ERP_URL = process.env.NEXT_PUBLIC_ERPNEXT_URL || 'http://80.225.204.210:8083';
const API_KEY = process.env.ERPNEXT_API_KEY || 'df5d2dc4b819ad2';
const API_SECRET = process.env.ERPNEXT_API_SECRET || '25c592ffee48809';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `token ${API_KEY}:${API_SECRET}`,
  };
}

/**
 * Helper to match Gantt task to PDP timing milestone
 */
function findMatchingTaskDate(tasks: any[], milestone: (typeof PDP_TIMING_MILESTONES)[number]): {
  currentDate?: string;
  baseDate?: string;
  isCompleted: boolean;
  taskId?: string;
} {
  const code = milestone.reference_code.toLowerCase();
  const name = milestone.pdp_line_item.toLowerCase();

  // 1. Direct match on custom_gate or subject
  for (const t of tasks) {
    const subj = (t.subject || '').toLowerCase();
    const gate = (t.custom_gate || '').toLowerCase();
    const wbs = (t.custom_wbs || '').toLowerCase();

    const isMatch =
      subj.includes(name) ||
      (code === 'ko' && (subj.includes('kickoff') || subj.includes('kick off') || subj.includes('launch'))) ||
      (code === 'ar' && (subj.includes('ar approval') || subj.includes('appropriation'))) ||
      (code === '1. pl' && (gate.includes('1. pl') || subj.includes('gate 1') || subj.includes('pl gate'))) ||
      (code === '2. vc' && (gate.includes('2. vc') || subj.includes('gate 2') || subj.includes('vc gate'))) ||
      (code === '3. tko' && (gate.includes('3. tko') || subj.includes('gate 3') || subj.includes('tool kickoff') || subj.includes('tko gate'))) ||
      (code === '4. vl' && (gate.includes('4. vl') || subj.includes('gate 4') || subj.includes('vl gate'))) ||
      (code === 'ppap' && (subj.includes('ppap') || subj.includes('production part approval'))) ||
      (code === '5. cpa' && (gate.includes('5. cpa') || subj.includes('gate 5') || subj.includes('cpa gate'))) ||
      (code === 'sop' && (subj.includes('sop') || subj.includes('start of production')));

    if (isMatch) {
      return {
        currentDate: t.exp_end_date || t.exp_start_date,
        baseDate: t.custom_target_finish_date || t.exp_end_date || t.exp_start_date,
        isCompleted: t.status === 'Completed' || (t.progress || 0) >= 100,
        taskId: t.name,
      };
    }
  }

  return { isCompleted: false };
}

/**
 * GET: Retrieve project timing chart with dynamic Gantt synchronization
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id?: string }> }
) {
  const { id: projectId } = await props.params;
  if (!projectId) {
    return NextResponse.json({ _error_message: 'Project ID is required' }, { status: 400 });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ _error_message: '401 Unauthorized: Session required' }, { status: 401 });
  }

  try {
    // 1. Fetch Project Details from ERPNext
    const projRes = await fetch(`${ERP_URL}/api/resource/Project/${encodeURIComponent(projectId)}`, {
      headers: getHeaders(),
      cache: 'no-store',
    });
    if (!projRes.ok) {
      return NextResponse.json(
        { _error_message: `Project "${projectId}" not found in ERPNext.` },
        { status: projRes.status }
      );
    }
    const project = (await projRes.json()).data;
    const productGroup = project.custom_product_group || 'Door Systems';
    const startDate = project.expected_start_date || project.creation?.split('T')[0] || new Date().toISOString().split('T')[0];

    // 2. Fetch Tasks for this Project from Gantt
    const tasksRes = await fetch(
      `${ERP_URL}/api/resource/Task?filters=[["project","=","${encodeURIComponent(projectId)}"]]&fields=["*"]&limit_page_length=200`,
      { headers: getHeaders(), cache: 'no-store' }
    );
    const tasks = tasksRes.ok ? (await tasksRes.json()).data || [] : [];

    // 3. Query existing Project Status Timing Chart
    const chartListRes = await fetch(
      `${ERP_URL}/api/resource/Project%20Status%20Timing%20Chart?filters=[["project","=","${encodeURIComponent(projectId)}"]]&limit_page_length=1`,
      { headers: getHeaders(), cache: 'no-store' }
    );
    const chartList = chartListRes.ok ? (await chartListRes.json()).data || [] : [];

    let chartDoc: any = null;

    if (chartList.length > 0) {
      // Fetch full chart document with child rows
      const chartDetailRes = await fetch(
        `${ERP_URL}/api/resource/Project%20Status%20Timing%20Chart/${encodeURIComponent(chartList[0].name)}`,
        { headers: getHeaders(), cache: 'no-store' }
      );
      if (chartDetailRes.ok) {
        chartDoc = (await chartDetailRes.json()).data;
      }
    }

    // 4. Build / Synchronize Line Items
    const existingItemsMap = new Map<string, ProjectStatusTimingLineItem>();
    if (chartDoc && Array.isArray(chartDoc.timing_line_items)) {
      chartDoc.timing_line_items.forEach((item: ProjectStatusTimingLineItem) => {
        existingItemsMap.set(item.reference_code, item);
      });
    }

    const synchronizedLineItems: ProjectStatusTimingLineItem[] = PDP_TIMING_MILESTONES.map((def, idx) => {
      const existing = existingItemsMap.get(def.reference_code);
      const match = findMatchingTaskDate(tasks, def);

      // Benchmarks driven by Product Group
      const benchmarkWeeks = getBenchmarkWeeks(productGroup, def.reference_code);
      const benchmarkFinishDate = calculateBenchmarkFinishDate(startDate, benchmarkWeeks);

      // Current Plan Date: pull dynamically from Gantt task
      const currentFinishDate = match.currentDate || existing?.current_plan_finish_date || benchmarkFinishDate;
      const baseFinishDate = existing?.base_plan_finish_date || match.baseDate || benchmarkFinishDate;

      // Calculate weeks duration
      const currentWeeks = calculateTimingWeeks(currentFinishDate, startDate);
      const weekVariance = calculateWeekVariance(currentWeeks, benchmarkWeeks);

      // Status: keep PM manual selection if exists, else auto-evaluate
      const status: TimingStatusChoice = existing?.status || evaluateTimingStatus(currentFinishDate, baseFinishDate, match.isCompleted);

      return {
        name: existing?.name,
        idx: idx + 1,
        category: def.category,
        pdp_line_item: def.pdp_line_item,
        reference_code: def.reference_code,
        status,
        base_plan_finish_date: baseFinishDate,
        current_plan_finish_date: currentFinishDate,
        benchmark_plan_finish_date: benchmarkFinishDate,
        current_plan_weeks: currentWeeks,
        benchmark_weeks: benchmarkWeeks,
        week_variance: weekVariance,
        comments: existing?.comments || '',
        task_id: match.taskId,
        is_synced_from_gantt: Boolean(match.currentDate),
      };
    });

    // 5. If chart does not exist, initialize idempotently in ERPNext
    if (!chartDoc) {
      const createPayload = {
        project: projectId,
        product_group: productGroup,
        program_manager: project.custom_project_manager || session.fullName || 'PM',
        template: 'Inteva Standard Timing',
        comments: 'Auto-initialized from Gantt schedule and PMO benchmark',
        timing_line_items: synchronizedLineItems,
      };

      const createRes = await fetch(`${ERP_URL}/api/resource/Project%20Status%20Timing%20Chart`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(createPayload),
      });

      if (createRes.ok) {
        chartDoc = (await createRes.json()).data;
      } else {
        // Fallback to in-memory representation if ERPNext insert had transient issue
        chartDoc = createPayload;
      }
    } else {
      // Update chart with re-synchronized dates while preserving comments
      chartDoc.timing_line_items = synchronizedLineItems;
      chartDoc.product_group = productGroup;
    }

    return NextResponse.json({ data: chartDoc }, { status: 200 });
  } catch (error: any) {
    console.error('[Timing Status GET Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to retrieve project timing status' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update permitted fields (status & comments) in ERPNext MariaDB
 */
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id?: string }> }
) {
  const { id: projectId } = await props.params;
  if (!projectId) {
    return NextResponse.json({ _error_message: 'Project ID is required' }, { status: 400 });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ _error_message: '401 Unauthorized: Session required' }, { status: 401 });
  }

  // RBAC Check: Team members are view-only
  const role = session.role?.toLowerCase() || '';
  if (role === 'teammember' || role === 'guest') {
    return NextResponse.json(
      { _error_message: '403 Forbidden: Team members have view-only access to the Project Status Timing Chart.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // 1. Find existing chart in ERPNext
    const chartListRes = await fetch(
      `${ERP_URL}/api/resource/Project%20Status%20Timing%20Chart?filters=[["project","=","${encodeURIComponent(projectId)}"]]&limit_page_length=1`,
      { headers: getHeaders(), cache: 'no-store' }
    );
    const chartList = chartListRes.ok ? (await chartListRes.json()).data || [] : [];
    if (chartList.length === 0) {
      return NextResponse.json(
        { _error_message: `Timing chart for project "${projectId}" not found.` },
        { status: 404 }
      );
    }
    const chartId = chartList[0].name;

    // 2. Fetch full current document
    const currentRes = await fetch(
      `${ERP_URL}/api/resource/Project%20Status%20Timing%20Chart/${encodeURIComponent(chartId)}`,
      { headers: getHeaders(), cache: 'no-store' }
    );
    if (!currentRes.ok) {
      return NextResponse.json({ _error_message: 'Failed to fetch current timing chart' }, { status: 500 });
    }
    const currentChart = (await currentRes.json()).data;

    // Verify project isolation: ensure we are modifying the matching project
    if (currentChart.project !== projectId) {
      return NextResponse.json(
        { _error_message: '403 Forbidden: Cross-project timing modification is prohibited.' },
        { status: 403 }
      );
    }

    // 3. Validate and apply updates
    const updatesMap = new Map<string, { status?: string; comments?: string }>();
    if (Array.isArray(body.timing_line_items)) {
      for (const item of body.timing_line_items) {
        if (item.status && !TIMING_STATUS_CHOICES.includes(item.status)) {
          return NextResponse.json(
            { _error_message: `400 Bad Request: Invalid status "${item.status}". Allowed: ${TIMING_STATUS_CHOICES.join(', ')}` },
            { status: 400 }
          );
        }
        updatesMap.set(item.reference_code, { status: item.status, comments: item.comments });
      }
    }

    // Update child line items in-place preserving system-derived dates
    const updatedLineItems = (currentChart.timing_line_items || []).map((row: any) => {
      const update = updatesMap.get(row.reference_code);
      if (update) {
        if (update.status) row.status = update.status;
        if (update.comments !== undefined) row.comments = update.comments;
      }
      return row;
    });

    const updatePayload: any = {
      timing_line_items: updatedLineItems,
    };
    if (body.comments !== undefined) {
      updatePayload.comments = body.comments;
    }

    // 4. Persist to ERPNext MariaDB
    const putRes = await fetch(
      `${ERP_URL}/api/resource/Project%20Status%20Timing%20Chart/${encodeURIComponent(chartId)}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatePayload),
      }
    );

    if (!putRes.ok) {
      const errText = await putRes.text();
      return NextResponse.json(
        { _error_message: `Failed to update timing chart in ERPNext: ${errText}` },
        { status: putRes.status }
      );
    }

    const updatedChart = (await putRes.json()).data;

    // 5. Audit trail logging
    saveAuditRecord({
      project_id: projectId,
      user_id: session.email || session.username || 'user',
      user_name: session.fullName || 'User',
      role: session.roleLabel || session.role || 'PM',
      action: 'Timing Status Updated',
      entity_type: 'Project Status Timing Chart',
      entity_id: chartId,
      description: `Updated Project Status Timing Chart for ${projectId}`,
      new_value: JSON.stringify(body).slice(0, 200),
    });

    return NextResponse.json({ data: updatedChart }, { status: 200 });
  } catch (error: any) {
    console.error('[Timing Status PUT Error]', error);
    return NextResponse.json(
      { _error_message: error.message || 'Failed to update timing status' },
      { status: 500 }
    );
  }
}
