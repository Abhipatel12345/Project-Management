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

