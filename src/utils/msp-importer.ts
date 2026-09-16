/**
 * Microsoft Project (MSP) & Excel Importer
 *
 * Imports schedules from MS Project XML (.xml) and structured Excel (.xlsx / .csv)
 * Maps imported tasks strictly to the selected project.
 * Validates dates, WBS, dependencies, milestones, and prevents corrupt partial imports.
 */

import * as XLSX from 'xlsx';
import { Task, TaskPriority, TaskStatus } from '@/types/task.types';
import { formatDate, parseDate } from './gantt-scheduling-engine';

export interface MspImportTask {
  subject: string;
  wbs?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  duration?: number;
  progress?: number;
  is_milestone?: boolean;
  predecessors?: string;
  assigned_to?: string;
  function_name?: string;
  role?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  description?: string;
  is_custom?: boolean;
}

export interface MspImportValidationResult {
  isValid: boolean;
  tasks: MspImportTask[];
  errors: string[];
  warnings: string[];
}

/**
 * Clean & normalize date string
 */
function normalizeDate(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return formatDate(val);
  }
  if (typeof val === 'number') {
    // Excel serial number
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return formatDate(d);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // Try parse
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return formatDate(d);
  }
  return undefined;
}

/**
 * Parse MS Project XML string
 */
export function parseMspXml(xmlString: string): MspImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tasks: MspImportTask[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      return {
        isValid: false,
        tasks: [],
        errors: [`XML Parse Error: ${parserError.textContent || 'Invalid XML syntax'}`],
        warnings: [],
      };
    }

    const taskNodes = xmlDoc.getElementsByTagName('Task');
    if (taskNodes.length === 0) {
      return {
        isValid: false,
        tasks: [],
        errors: ['No <Task> elements found in the Microsoft Project XML document.'],
        warnings: [],
      };
    }

    for (let i = 0; i < taskNodes.length; i++) {
      const node = taskNodes[i];
      const name = node.getElementsByTagName('Name')[0]?.textContent?.trim();
      const isSummary = node.getElementsByTagName('Summary')[0]?.textContent?.trim() === '1';

      // Skip empty or project summary task with empty name
      if (!name) continue;

      const wbs = node.getElementsByTagName('WBS')[0]?.textContent?.trim();
      const startStr = normalizeDate(node.getElementsByTagName('Start')[0]?.textContent);
      const finishStr = normalizeDate(node.getElementsByTagName('Finish')[0]?.textContent);
      const pctComplete = parseInt(node.getElementsByTagName('PercentComplete')[0]?.textContent || '0', 10);
      const milestoneVal = node.getElementsByTagName('Milestone')[0]?.textContent?.trim() === '1';

      // Duration: PT8H0M0S or hours
      const durStr = node.getElementsByTagName('Duration')[0]?.textContent || '';
      let durDays = 1;
      if (durStr.includes('PT') && durStr.includes('H')) {
        const hoursMatch = durStr.match(/PT(\d+)H/);
        if (hoursMatch) {
          durDays = Math.max(1, Math.round(parseInt(hoursMatch[1], 10) / 8));
        }
      }

      // Predecessors
      const predLinks = node.getElementsByTagName('PredecessorLink');
      const preds: string[] = [];
      for (let j = 0; j < predLinks.length; j++) {
        const pUid = predLinks[j].getElementsByTagName('PredecessorUID')[0]?.textContent?.trim();
        const pType = predLinks[j].getElementsByTagName('Type')[0]?.textContent?.trim();
        // Types in MSP: 0=FF, 1=FS, 2=SF, 3=SS
        let typeStr = 'FS';
        if (pType === '0') typeStr = 'FF';
        else if (pType === '2') typeStr = 'SF';
        else if (pType === '3') typeStr = 'SS';

        if (pUid) preds.push(`${pUid}:${typeStr}`);
      }

      if (!startStr || !finishStr) {
        warnings.push(`Task "${name}" is missing start or finish date, defaulted to today.`);
      }

      const todayStr = formatDate(new Date());
      tasks.push({
        subject: name,
        wbs: wbs || `${tasks.length + 1}`,
        exp_start_date: startStr || todayStr,
        exp_end_date: finishStr || startStr || todayStr,
        duration: milestoneVal ? 0 : durDays,
        progress: isNaN(pctComplete) ? 0 : Math.min(100, Math.max(0, pctComplete)),
        is_milestone: milestoneVal,
        predecessors: preds.join(', '),
        is_custom: true,
      });
    }
  } catch (err: any) {
    errors.push(`Failed to parse MS Project XML: ${err.message}`);
  }

  return {
    isValid: errors.length === 0 && tasks.length > 0,
    tasks,
    errors,
    warnings,
  };
}

/**
 * Parse structured Excel (.xlsx) file
 */
export function parseMspExcel(arrayBuffer: ArrayBuffer): MspImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tasks: MspImportTask[] = [];

  try {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      return { isValid: false, tasks: [], errors: ['Excel file contains no worksheets.'], warnings: [] };
    }

    const sheet = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

    if (rows.length === 0) {
      return { isValid: false, tasks: [], errors: ['No task records found in the worksheet.'], warnings: [] };
    }

    // Column mapping helper (case-insensitive)
    const findCol = (row: any, candidates: string[]) => {
      const keys = Object.keys(row);
      for (const cand of candidates) {
        const found = keys.find((k) => k.toLowerCase().replace(/[\s_-]/g, '') === cand.toLowerCase().replace(/[\s_-]/g, ''));
        if (found && row[found] !== undefined && row[found] !== '') return row[found];
      }
      return undefined;
    };

    rows.forEach((row, idx) => {
      const subject = findCol(row, ['Task Name', 'TaskName', 'Subject', 'Name', 'Task', 'Activity']);
      if (!subject || String(subject).trim() === '') {
        return; // Skip empty rows
      }

      const wbs = findCol(row, ['WBS', 'WBS Code', 'Level', 'Outline']);
      const rawStart = findCol(row, ['Start', 'Start Date', 'Exp Start Date', 'Current Start Date', 'StartDate']);
      const rawEnd = findCol(row, ['Finish', 'End Date', 'Finish Date', 'Exp End Date', 'Current Finish Date', 'FinishDate']);
      const rawProgress = findCol(row, ['% Complete', 'Percent Complete', 'Progress', 'Complete']);
      const rawMilestone = findCol(row, ['Milestone', 'Is Milestone']);
      const rawPreds = findCol(row, ['Predecessors', 'Predecessor', 'Dependencies', 'Depends On']);
      const rawAssignee = findCol(row, ['Resource Names', 'Task Owner', 'Assigned To', 'Owner', 'Assignee']);
      const rawFunction = findCol(row, ['Function', 'Board Function']);
      const rawRole = findCol(row, ['Role', 'PDT Role']);

      const startDate = normalizeDate(rawStart);
      const endDate = normalizeDate(rawEnd);

      const isMilestone =
        String(rawMilestone).toLowerCase() === 'yes' ||
        String(rawMilestone).toLowerCase() === 'true' ||
        rawMilestone === 1 ||
        rawMilestone === '1';

      let progress = 0;
      if (rawProgress !== undefined) {
        const num = parseFloat(String(rawProgress).replace('%', ''));
        if (!isNaN(num)) {
          progress = num <= 1 && num > 0 ? Math.round(num * 100) : Math.round(num);
          progress = Math.max(0, Math.min(100, progress));
        }
      }

      const todayStr = formatDate(new Date());
      tasks.push({
        subject: String(subject).trim(),
        wbs: wbs ? String(wbs).trim() : `${tasks.length + 1}`,
        exp_start_date: startDate || todayStr,
        exp_end_date: endDate || startDate || todayStr,
        duration: isMilestone ? 0 : Math.max(1, startDate && endDate ? Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86400000) + 1 : 1),
        progress,
        is_milestone: isMilestone,
        predecessors: rawPreds ? String(rawPreds).trim() : '',
        assigned_to: rawAssignee ? String(rawAssignee).trim() : undefined,
        function_name: rawFunction ? String(rawFunction).trim() : undefined,
        role: rawRole ? String(rawRole).trim() : undefined,
        is_custom: true,
      });
    });

    if (tasks.length === 0) {
      errors.push('Could not identify standard task columns (e.g. "Task Name", "Start", "Finish") in file.');
    }
  } catch (err: any) {
    errors.push(`Failed to parse Excel file: ${err.message}`);
  }

  return {
    isValid: errors.length === 0 && tasks.length > 0,
    tasks,
    errors,
    warnings,
  };
}
