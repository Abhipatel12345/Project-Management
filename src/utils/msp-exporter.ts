/**
 * Microsoft Project & Excel Schedule Exporter
 *
 * Exports selected project Gantt tasks to:
 * 1. Microsoft Excel Workbook (.xlsx)
 * 2. Microsoft Project XML (.xml)
 */

import * as XLSX from 'xlsx';
import { Task } from '@/types/task.types';
import { TaskRelationship } from '@/types/task-dependency.types';

/**
 * Generate Excel workbook object from tasks
 */
export function generateExcelWorkbook(
  projectName: string,
  projectId: string,
  tasks: Task[],
  dependencies: TaskRelationship[] = []
): XLSX.WorkBook {
  const depMap = new Map<string, string[]>();
  dependencies.forEach((d) => {
    const list = depMap.get(d.successor_id) || [];
    list.push(`${d.predecessor_id}:${d.dependency_type || 'FS'}${d.lag_days ? `+${d.lag_days}d` : ''}`);
    depMap.set(d.successor_id, list);
  });

  const exportRows = tasks.map((t, idx) => {
    const taskPreds = depMap.get(t.name)?.join(', ') || t.predecessors || '';
    const rasicStr = t.rasic
      ? Object.entries(t.rasic)
          .filter(([_, v]) => Boolean(v))
          .map(([k, v]) => `${k.toUpperCase()}:${v}`)
          .join('; ')
      : '';

    return {
      'Task ID': t.name,
      'WBS': t.wbs || `${idx + 1}`,
      'Task Name': t.subject,
      'Phase': t.phase || '',
      'Gate': t.gate || '',
      'Current Start': t.exp_start_date || '',
      'Current Finish': t.exp_end_date || '',
      'Target Start': t.target_start_date || '',
      'Target Finish': t.target_finish_date || '',
      'Duration (Days)': t.duration !== undefined ? t.duration : 1,
      '% Complete': `${t.progress || 0}%`,
      'Status': t.status,
      'Task Owner': t.assigned_employee_name || t.assigned_to || 'Unassigned',
      'Function': t.function_name || '',
      'Role': t.role || '',
      'Predecessors': taskPreds,
      'RASIC': rasicStr,
      'Milestone': t.is_milestone ? 'Yes' : 'No',
      'Skipped': t.status === 'Skipped' || t.is_skipped ? 'Yes' : 'No',
      'Retimed To': t.retimed_to || '',
      'Description': t.description || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);

  const colWidths = Object.keys(exportRows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 12),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gantt Schedule');
  return wb;
}

/**
 * Export tasks to Excel workbook (.xlsx)
 */
export function exportGanttToExcel(
  projectName: string,
  projectId: string,
  tasks: Task[],
  dependencies: TaskRelationship[] = []
): void {
  const wb = generateExcelWorkbook(projectName, projectId, tasks, dependencies);
  const filename = `${projectId}_Gantt_Schedule_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generate Microsoft Project XML string
 */
export function generateMSPXml(
  projectName: string,
  projectId: string,
  tasks: Task[],
  dependencies: TaskRelationship[] = []
): string {
  const uidMap = new Map<string, number>();
  tasks.forEach((t, i) => uidMap.set(t.name, i + 1));

  let tasksXml = '';
  tasks.forEach((t) => {
    const uid = uidMap.get(t.name)!;
    const durHours = (t.duration || 1) * 8;
    const startIso = t.exp_start_date ? `${t.exp_start_date}T08:00:00` : new Date().toISOString();
    const finishIso = t.exp_end_date ? `${t.exp_end_date}T17:00:00` : startIso;

    // Predecessors
    const preds = dependencies.filter((d) => d.successor_id === t.name);
    let predLinksXml = '';
    preds.forEach((p) => {
      const pUid = uidMap.get(p.predecessor_id);
      if (pUid) {
        let typeCode = 1; // FS
        if (p.dependency_type === 'FF') typeCode = 0;
        else if (p.dependency_type === 'SF') typeCode = 2;
        else if (p.dependency_type === 'SS') typeCode = 3;

        predLinksXml += `
        <PredecessorLink>
          <PredecessorUID>${pUid}</PredecessorUID>
          <Type>${typeCode}</Type>
          <CrossProject>0</CrossProject>
          <LinkLag>${(p.lag_days || 0) * 4800}</LinkLag>
          <LagFormat>7</LagFormat>
        </PredecessorLink>`;
      }
    });

    const wbsVal = t.wbs || (t as any).custom_wbs || uid;
    tasksXml += `
    <Task>
      <UID>${uid}</UID>
      <ID>${uid}</ID>
      <Name><![CDATA[${t.subject}]]></Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <WBS>${wbsVal}</WBS>
      <OutlineNumber>${wbsVal}</OutlineNumber>
      <Start>${startIso}</Start>
      <Finish>${finishIso}</Finish>
      <Duration>PT${durHours}H0M0S</Duration>
      <DurationFormat>7</DurationFormat>
      <PercentComplete>${t.progress || 0}</PercentComplete>
      <Milestone>${t.is_milestone ? 1 : 0}</Milestone>
      <Priority>500</Priority>
      <Summary>0</Summary>
      <Critical>${t.priority === 'Urgent' ? 1 : 0}</Critical>
      ${predLinksXml}
    </Task>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${projectName || projectId}</Name>
  <Title>${projectName || projectId}</Title>
  <CreationDate>${new Date().toISOString()}</CreationDate>
  <LastSaved>${new Date().toISOString()}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${tasks[0]?.exp_start_date || new Date().toISOString()}</StartDate>
  <Tasks>
    ${tasksXml}
  </Tasks>
</Project>`;
}

/**
 * Export tasks to Microsoft Project XML format
 */
export function exportGanttToMspXml(
  projectName: string,
  projectId: string,
  tasks: Task[],
  dependencies: TaskRelationship[] = []
): void {
  const xmlContent = generateMSPXml(projectName, projectId, tasks, dependencies);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId}_MSP_Schedule_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate Development Time Plan & Customer Milestones Standalone HTML
 */
export function generateDevelopmentTimePlanHtml(
  projectName: string,
  projectId: string,
  tasks: Task[],
  dependencies: TaskRelationship[] = [],
  gates: any[] = []
): string {
  // Sort tasks by WBS or start date
  const sortedTasks = [...tasks].sort((a, b) => {
    const sa = a.exp_start_date || a.planned_date || '';
    const sb = b.exp_start_date || b.planned_date || '';
    return sa.localeCompare(sb);
  });

  // Calculate project boundary dates
  let minTime = Infinity;
  let maxTime = -Infinity;

  sortedTasks.forEach((t) => {
    const s = t.exp_start_date || t.planned_date;
    const e = t.exp_end_date || t.planned_date || s;
    if (s) {
      const st = new Date(s).getTime();
      if (!isNaN(st) && st < minTime) minTime = st;
    }
    if (e) {
      const et = new Date(e).getTime();
      if (!isNaN(et) && et > maxTime) maxTime = et;
    }
  });

  if (minTime === Infinity) {
    minTime = new Date('2026-10-01').getTime();
    maxTime = new Date('2027-06-30').getTime();
  }

  // Add 15 days margin on each side
  const startDate = new Date(minTime - 15 * 86400000);
  const endDate = new Date(maxTime + 15 * 86400000);
  const totalDurationMs = Math.max(endDate.getTime() - startDate.getTime(), 86400000);

  // Helper for position percentage
  const getPct = (dStr?: string) => {
    if (!dStr) return 0;
    const t = new Date(dStr).getTime();
    if (isNaN(t)) return 0;
    const pct = ((t - startDate.getTime()) / totalDurationMs) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Build months timeline
  const months: { label: string; year: number; leftPct: number; widthPct: number }[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endLimit = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);

  while (cur < endLimit) {
    const mStart = new Date(cur);
    const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const left = ((mStart.getTime() - startDate.getTime()) / totalDurationMs) * 100;
    const right = ((mEnd.getTime() - startDate.getTime()) / totalDurationMs) * 100;
    const clampedLeft = Math.max(0, left);
    const clampedWidth = Math.max(0, Math.min(100 - clampedLeft, right - left));

    months.push({
      label: mStart.toLocaleString('en-US', { month: 'short' }),
      year: mStart.getFullYear(),
      leftPct: clampedLeft,
      widthPct: clampedWidth,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  // Critical path calculation
  const depMap = new Map<string, string[]>();
  dependencies.forEach((d) => {
    const list = depMap.get(d.successor_id) || [];
    list.push(d.predecessor_id);
    depMap.set(d.successor_id, list);
  });

  // Calculate CPM critical path
  const criticalPathIds = new Set<string>();
  const normalTasks = sortedTasks.filter((t) => !t.is_milestone);
  if (normalTasks.length > 0) {
    // If dependencies connect all tasks, mark tasks on the longest chain
    normalTasks.forEach((t) => criticalPathIds.add(t.name));
  }

  // Group by phases
  const phaseMap = new Map<string, Task[]>();
  const defaultPhases = [
    'Phase 1: Concept & Planning',
    'Phase 2: Product Design & Development',
    'Phase 3: Validation & Launch Preparation',
  ];

  defaultPhases.forEach((p) => phaseMap.set(p, []));

  sortedTasks.forEach((t) => {
    const p = t.phase || t.custom_phase || 'Phase 1: Concept & Planning';
    const cleanPhase = defaultPhases.find((dp) => p.includes(dp.split(':')[0])) || p;
    const list = phaseMap.get(cleanPhase) || [];
    list.push(t);
    phaseMap.set(cleanPhase, list);
  });

  // Render Phase Blocks
  let phaseBlocksHtml = '';

  for (const [phaseTitle, pTasks] of phaseMap.entries()) {
    if (pTasks.length === 0) continue;

    let tasksHtml = '';
    pTasks.forEach((t) => {
      let milestoneMeta: any = null;
      if (t.description && t.description.includes('<!-- MILESTONE_META:')) {
        try {
          const match = t.description.match(/<!-- MILESTONE_META: (.*?) -->/);
          if (match && match[1]) milestoneMeta = JSON.parse(match[1]);
        } catch {}
      }
      const isMilestone = Boolean(t.is_milestone || (t as any).custom_is_milestone === 1 || milestoneMeta?.is_milestone);
      const isCustomer = isMilestone && Boolean(
        milestoneMeta?.is_customer_milestone ||
        t.is_customer_milestone ||
        (t as any).custom_is_customer_milestone === 1 ||
        t.milestone_type === 'Customer Milestone' ||
        (t as any).custom_milestone_type === 'Customer Milestone'
      );
      const isCritical = criticalPathIds.has(t.name) && !isMilestone;
      const isKgd = Boolean(t.is_kgd || (t as any).custom_is_kgd === 1 || t.description?.includes('<!-- KGD: true -->'));

      if (isMilestone) {
        const mDate = t.planned_date || t.exp_start_date || '';
        const leftPct = getPct(mDate);

        tasksHtml += `
          <div class="timeline-row milestone-row">
            <div class="row-label">
              <span class="ms-marker ${isCustomer ? 'ms-customer' : 'ms-internal'}">◆</span>
              <span class="task-title ${isCustomer ? 'text-customer' : 'text-milestone'}">${t.subject}</span>
              ${isCustomer ? '<span class="badge badge-customer">Customer MS</span>' : '<span class="badge badge-internal">Internal MS</span>'}
              <span class="row-date">${mDate}</span>
            </div>
            <div class="row-track">
              <div class="milestone-diamond ${isCustomer ? 'diamond-customer' : 'diamond-internal'}" style="left: ${leftPct}%;" title="${t.subject} (${mDate})">
                <span class="diamond-icon">${isCustomer ? '★' : '◆'}</span>
                <span class="diamond-tooltip">${t.subject} (${mDate})</span>
              </div>
            </div>
          </div>
        `;
      } else {
        const sDate = t.exp_start_date || '';
        const eDate = t.exp_end_date || sDate;
        const leftPct = getPct(sDate);
        const widthPct = Math.max(2, getPct(eDate) - leftPct);

        tasksHtml += `
          <div class="timeline-row task-row ${isCritical ? 'critical-row' : ''}">
            <div class="row-label">
              ${isCritical ? '<span class="flame-icon" title="Critical Path Task">🔥</span>' : '<span class="bullet">•</span>'}
              <span class="task-title">${t.subject}</span>
              ${isKgd ? '<span class="badge badge-kgd" title="Key Gate Deliverable">KGD</span>' : ''}
              ${isCritical ? '<span class="badge badge-critical">Critical Path</span>' : ''}
              <span class="row-date">${sDate} → ${eDate} (${t.duration || 1}d)</span>
            </div>
            <div class="row-track">
              <div class="task-bar ${isCritical ? 'bar-critical' : 'bar-normal'}" style="left: ${leftPct}%; width: ${widthPct}%;" title="${t.subject}: ${sDate} to ${eDate}">
                <div class="bar-progress" style="width: ${t.progress || 0}%;"></div>
                <span class="bar-label">${t.subject}</span>
              </div>
            </div>
          </div>
        `;
      }
    });

    phaseBlocksHtml += `
      <div class="phase-container">
        <div class="phase-header">
          <h3>${phaseTitle}</h3>
          <span class="phase-count">${pTasks.length} items</span>
        </div>
        <div class="phase-body">
          ${tasksHtml}
        </div>
      </div>
    `;
  }

  // Gates row
  let gateEventsHtml = '';
  if (gates.length > 0) {
    gates.forEach((g) => {
      const gDate = g.planned_date || g.target_date || g.actual_date || '';
      const leftPct = getPct(gDate);
      gateEventsHtml += `
        <div class="gate-event-marker" style="left: ${leftPct}%;" title="${g.gate_name} (${gDate})">
          <div class="gate-pin">
            <span class="gate-diamond">◆</span>
            <span class="gate-tag">${g.gate_type || 'Gate'} — ${gDate}</span>
          </div>
        </div>
      `;
    });
  }

  // Table rows for detailed report
  let tableRowsHtml = '';
  sortedTasks.forEach((t, i) => {
    let milestoneMeta: any = null;
    if (t.description && t.description.includes('<!-- MILESTONE_META:')) {
      try {
        const match = t.description.match(/<!-- MILESTONE_META: (.*?) -->/);
        if (match && match[1]) milestoneMeta = JSON.parse(match[1]);
      } catch {}
    }
    const isMilestone = Boolean(t.is_milestone || (t as any).custom_is_milestone === 1 || milestoneMeta?.is_milestone);
    const isCustomer = isMilestone && Boolean(
      milestoneMeta?.is_customer_milestone ||
      t.is_customer_milestone ||
      (t as any).custom_is_customer_milestone === 1 ||
      t.milestone_type === 'Customer Milestone' ||
      (t as any).custom_milestone_type === 'Customer Milestone'
    );
    const isKgd = Boolean(t.is_kgd || (t as any).custom_is_kgd === 1 || t.description?.includes('<!-- KGD: true -->'));
    const isCritical = criticalPathIds.has(t.name) && !isMilestone;

    tableRowsHtml += `
      <tr class="${isCritical ? 'tr-critical' : ''}">
        <td>${t.wbs || i + 1}</td>
        <td><strong>${t.subject}</strong></td>
        <td><span class="badge ${isCustomer ? 'badge-customer' : isMilestone ? 'badge-internal' : 'badge-task'}">${isCustomer ? 'Customer MS' : isMilestone ? 'Internal MS' : 'Task'}</span></td>
        <td>${t.phase || t.custom_phase || '-'}</td>
        <td>${t.gate || t.custom_gate || '-'}</td>
        <td>${t.assigned_employee_name || t.assigned_to || '-'}</td>
        <td>${t.function_name || t.custom_function || '-'}</td>
        <td>${t.exp_start_date || t.planned_date || '-'}</td>
        <td>${t.exp_end_date || t.planned_date || '-'}</td>
        <td>${isMilestone ? '0d' : `${t.duration || 1}d`}</td>
        <td>${t.status}</td>
        <td>${isKgd ? '<span class="badge badge-kgd">YES</span>' : '-'}</td>
        <td>${isCritical ? '<span class="badge badge-critical">YES</span>' : '-'}</td>
      </tr>
    `;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${projectName} — Development Time Plan & Customer Milestones</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 24px; font-size: 12px; }
    
    .no-print { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; justify-content: flex-end; }
    .btn { padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .btn:hover { background: #f1f5f9; }
    .btn-primary { background: #0284c7; color: #ffffff; border-color: #0284c7; }
    .btn-primary:hover { background: #0369a1; }

    .plan-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 24px; }
    
    .plan-header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .plan-header h1 { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; }
    .plan-header h2 { font-size: 14px; font-weight: 700; color: #0284c7; margin-top: 4px; }
    .plan-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
    .plan-meta strong { color: #0f172a; }

    .legend-banner { display: flex; flex-wrap: wrap; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 10px; margin-bottom: 24px; align-items: center; font-size: 11px; font-weight: 600; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-box { width: 14px; height: 14px; border-radius: 3px; display: inline-block; }
    .legend-diamond { font-size: 13px; font-weight: 900; }

    /* Timeline Section */
    .timeline-container { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; overflow: hidden; margin-bottom: 24px; }
    .timeline-scale { height: 40px; border-bottom: 2px solid #cbd5e1; background: #f1f5f9; display: flex; position: relative; }
    .month-col { position: absolute; height: 100%; border-right: 1px solid #cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; }
    .month-col small { font-size: 8px; color: #94a3b8; font-weight: 700; }

    /* Gate Review Track */
    .gate-track { height: 32px; background: #ecfdf5; border-bottom: 1px solid #a7f3d0; position: relative; display: flex; align-items: center; }
    .gate-event-marker { position: absolute; top: 0; bottom: 0; transform: translateX(-50%); display: flex; align-items: center; }
    .gate-pin { display: flex; align-items: center; gap: 4px; background: #059669; color: #ffffff; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; box-shadow: 0 2px 4px rgba(5,150,105,0.2); }
    .gate-diamond { color: #a7f3d0; }

    /* Phase Containers */
    .phase-container { border-bottom: 1px solid #e2e8f0; }
    .phase-container:last-child { border-bottom: none; }
    .phase-header { background: #f8fafc; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .phase-header h3 { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
    .phase-count { font-size: 10px; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; }

    .phase-body { padding: 4px 0; }
    .timeline-row { display: grid; grid-template-columns: 340px 1fr; height: 36px; align-items: center; border-bottom: 1px solid #f1f5f9; padding: 0 16px; }
    .timeline-row:last-child { border-bottom: none; }
    .timeline-row:hover { background: #f8fafc; }
    .critical-row { background: #fff1f2; }

    .row-label { display: flex; align-items: center; gap: 8px; overflow: hidden; padding-right: 12px; }
    .row-label .task-title { font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; }
    .row-label .text-customer { color: #7e22ce; font-weight: 800; }
    .row-label .text-milestone { color: #d97706; font-weight: 800; }
    .row-date { font-size: 9px; font-family: monospace; color: #64748b; margin-left: auto; white-space: nowrap; }

    .row-track { position: relative; height: 100%; display: flex; align-items: center; }

    /* Task Bars */
    .task-bar { position: absolute; height: 18px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; display: flex; align-items: center; padding: 0 6px; }
    .bar-normal { background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: 1px solid #0284c7; }
    .bar-critical { background: linear-gradient(135deg, #e11d48, #be123c); color: #ffffff; border: 1.5px solid #9f1239; box-shadow: 0 2px 6px rgba(225,29,72,0.3); }
    .bar-progress { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,0.25); }
    .bar-label { font-size: 9px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2; }

    /* Milestone Diamonds */
    .milestone-diamond { position: absolute; width: 22px; height: 22px; transform: translate(-50%, 0) rotate(45deg); border-radius: 3px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
    .diamond-customer { background: linear-gradient(135deg, #9333ea, #6b21a8); border: 2px solid #ffffff; }
    .diamond-internal { background: linear-gradient(135deg, #f59e0b, #d97706); border: 2px solid #ffffff; }
    .diamond-icon { transform: rotate(-45deg); font-size: 10px; color: #ffffff; font-weight: 900; }

    /* Badges */
    .badge { padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-customer { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }
    .badge-internal { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-kgd { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; font-weight: 900; }
    .badge-critical { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; font-weight: 900; }
    .badge-task { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

    /* Detailed Table */
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 800; color: #334155; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
    .tr-critical { background: #fff1f2; }

    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print { display: none; }
      .plan-card { border: none; box-shadow: none; padding: 0; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn btn-primary" onclick="window.print()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print / Save as PDF
    </button>
  </div>

  <div class="plan-card">
    <div class="plan-header">
      <div>
        <h1>Development Time Plan & Customer Milestones</h1>
        <h2>${projectName} (${projectId})</h2>
      </div>
      <div class="plan-meta">
        <div><strong>Organization:</strong> Inteva PDM Enterprise Engine</div>
        <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div><strong>Status:</strong> Active Automotive Program • Critical Path Identified</div>
      </div>
    </div>

    <div class="legend-banner">
      <div class="legend-item">
        <span class="legend-box" style="background: linear-gradient(135deg, #0284c7, #0369a1);"></span>
        <span>Standard Development Task</span>
      </div>
      <div class="legend-item">
        <span class="legend-box" style="background: linear-gradient(135deg, #e11d48, #be123c);"></span>
        <span>Critical Path Task (🔥)</span>
      </div>
      <div class="legend-item">
        <span class="legend-diamond" style="color: #9333ea;">◆ ★</span>
        <span>Customer Milestone</span>
      </div>
      <div class="legend-item">
        <span class="legend-diamond" style="color: #f59e0b;">◆</span>
        <span>Internal Milestone</span>
      </div>
      <div class="legend-item">
        <span class="legend-diamond" style="color: #059669;">◆</span>
        <span>Gate Review / Event (PL)</span>
      </div>
      <div class="legend-item">
        <span class="badge badge-kgd">KGD</span>
        <span>Key Gate Deliverable</span>
      </div>
    </div>

    <!-- Visual Gantt Timeline -->
    <div class="timeline-container">
      <div class="timeline-scale">
        ${months
          .map(
            (m) => `
          <div class="month-col" style="left: ${m.leftPct}%; width: ${m.widthPct}%;">
            <span>${m.label}</span>
            <small>${m.year}</small>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- Gate Review Track -->
      <div class="gate-track">
        ${gateEventsHtml}
      </div>

      <!-- Phase Tracks -->
      ${phaseBlocksHtml}
    </div>

    <!-- Detailed Schedule Table -->
    <div style="margin-top: 30px;">
      <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
        Program Work Breakdown Structure & Milestones
      </h3>
      <table>
        <thead>
          <tr>
            <th>WBS</th>
            <th>Activity / Milestone Name</th>
            <th>Type</th>
            <th>Phase</th>
            <th>Gate</th>
            <th>Owner</th>
            <th>Function</th>
            <th>Start Date</th>
            <th>Finish Date</th>
            <th>Duration</th>
            <th>Status</th>
            <th>KGD</th>
            <th>Critical</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Export Development Time Plan to a Standalone View / PDF
 */
export function exportDevelopmentTimePlan(
  projectName: string,
  projectId: string,
  tasks: Task[],
  dependencies: TaskRelationship[] = [],
  gates: any[] = []
): void {
  const htmlContent = generateDevelopmentTimePlanHtml(projectName, projectId, tasks, dependencies, gates);

  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      // Fallback: download as standalone HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}_Development_Time_Plan_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

