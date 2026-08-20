/**
 * Normalizes any date input string (ISO, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc.)
 * into a clean YYYY-MM-DD string for consistent lexicographical comparison.
 */
export function normalizeDateStr(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim().split(' ')[0].split('T')[0];
  if (!trimmed || trimmed === 'N/A') return null;

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

export interface TaskDateValidationResult {
  isValid: boolean;
  startDateError?: string;
  endDateError?: string;
}

/**
 * Validates task start and end dates against each other and against project boundaries.
 */
export function validateTaskDatesAgainstProject(
  taskStart?: string | null,
  taskEnd?: string | null,
  projectStart?: string | null,
  projectEnd?: string | null,
  projectName?: string | null
): TaskDateValidationResult {
  const normTaskStart = normalizeDateStr(taskStart);
  const normTaskEnd = normalizeDateStr(taskEnd);
  const normProjStart = normalizeDateStr(projectStart);
  const normProjEnd = normalizeDateStr(projectEnd);

  // 1. Task Start Date vs Task End Date
  if (normTaskStart && normTaskEnd && normTaskStart > normTaskEnd) {
    return {
      isValid: false,
      endDateError: `Task Expected End Date (${normTaskEnd}) cannot be before Task Start Date (${normTaskStart}).`,
      startDateError: `Task Start Date (${normTaskStart}) cannot be after Task End Date (${normTaskEnd}).`,
    };
  }

  // 2. Task End Date vs Project End Date
  if (normTaskEnd && normProjEnd && normTaskEnd > normProjEnd) {
    const projLabel = projectName ? ` for project "${projectName}"` : '';
    return {
      isValid: false,
      endDateError: `Task Expected End Date (${normTaskEnd}) cannot be after Project Expected End Date (${normProjEnd}${projLabel}).`,
    };
  }

  // 3. Task Start Date vs Project Start Date (Warning / Soft bound check if project start exists)
  if (normTaskStart && normProjStart && normTaskStart < normProjStart) {
    const projLabel = projectName ? ` for project "${projectName}"` : '';
    return {
      isValid: false,
      startDateError: `Task Start Date (${normTaskStart}) cannot be before Project Start Date (${normProjStart}${projLabel}).`,
    };
  }

  return { isValid: true };
}
