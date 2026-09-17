import * as XLSX from 'xlsx';
import { GateCriterion, CriterionStatus } from '@/types/gate.types';

export interface ParsedCriterionItem {
  id?: string;
  rowNumber: number;
  name: string;
  description?: string;
  is_required: boolean;
  status: CriterionStatus;
  responsible_person: string;
  due_date?: string;
  comments?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  isValid: boolean;
  error?: string;
}

export interface ChecklistParseResult {
  fileName: string;
  totalRows: number;
  validRowsCount: number;
  duplicateRowsCount: number;
  invalidRowsCount: number;
  itemsToImport: ParsedCriterionItem[];
  duplicateItems: ParsedCriterionItem[];
  rowErrors: Array<{ rowNumber: number; message: string }>;
  columnsFound: string[];
  missingRequiredColumns: string[];
  isValidFile: boolean;
  generalError?: string;
}

// Canonical column synonyms
const COLUMN_SYNONYMS = {
  name: [
    'criterion',
    'criterion name',
    'criterion / checklist name',
    'checklist name',
    'checklist item',
    'item',
    'title',
    'name',
    'exit criterion',
    'criteria',
    'requirement',
    'task name',
  ],
  description: [
    'description',
    'details',
    'specification',
    'spec',
    'notes',
    'scope',
    'exit criteria description',
  ],
  is_required: [
    'required',
    'mandatory',
    'is required',
    'is_required',
    'required?',
    'mandatory?',
    'priority',
    'type',
  ],
  responsible_person: [
    'responsible',
    'responsible person',
    'responsible_person',
    'owner',
    'reviewer',
    'assigned to',
    'lead',
    'responsible / reviewer',
  ],
  due_date: [
    'due date',
    'due_date',
    'target date',
    'target_date',
    'deadline',
    'planned date',
    'date',
  ],
  status: [
    'status',
    'state',
    'approval status',
    'approval_status',
  ],
  comments: [
    'comments',
    'comment',
    'remarks',
    'remark',
    'review remarks',
  ],
};

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
}

function findMatchingField(header: string): keyof typeof COLUMN_SYNONYMS | null {
  const norm = normalizeHeader(header);
  for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    for (const syn of synonyms) {
      if (norm === syn || norm.includes(syn) || syn.includes(norm)) {
        return field as keyof typeof COLUMN_SYNONYMS;
      }
    }
  }
  return null;
}

function parseExcelDate(val: any): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel date serial number
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (!str) return undefined;

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return str;
  }

  // Check MM/DD/YYYY or DD/MM/YYYY
  const slashParts = str.split(/[/.-]/);
  if (slashParts.length === 3) {
    const p1 = parseInt(slashParts[0], 10);
    const p2 = parseInt(slashParts[1], 10);
    const p3 = parseInt(slashParts[2], 10);
    if (p3 > 1000) {
      // MM/DD/YYYY or DD/MM/YYYY
      const year = p3;
      const month = p1 > 12 ? p2 : p1;
      const day = p1 > 12 ? p1 : p2;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return undefined;
}

function parseRequiredBoolean(val: any): boolean {
  if (val === null || val === undefined || val === '') return true; // default mandatory
  const str = String(val).trim().toLowerCase();
  if (['no', 'n', 'false', '0', 'optional'].includes(str)) return false;
  return true;
}

function parseCriterionStatus(val: any): CriterionStatus {
  if (!val) return 'In Progress';
  const str = String(val).trim().toLowerCase();
  if (str.includes('comp') || str === 'done' || str === 'pass' || str === 'approved') return 'Completed';
  if (str.includes('prog') || str === 'working' || str === 'open') return 'In Progress';
  if (str.includes('na') || str.includes('not app') || str === 'n/a') return 'Not Applicable';
  if (str.includes('pend') || str === 'waiting') return 'Pending';
  return 'In Progress';
}

/**
 * Parses an Excel or CSV file buffer/File into structured Exit Criteria checklist items
 */
export async function parseChecklistFile(
  file: File,
  existingCriteria: GateCriterion[] = [],
  defaultResponsiblePerson = 'Gate Owner',
  defaultDueDate?: string
): Promise<ChecklistParseResult> {
  const fileName = file.name;
  const isSupported =
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv');

  if (!isSupported) {
    return {
      fileName,
      totalRows: 0,
      validRowsCount: 0,
      duplicateRowsCount: 0,
      invalidRowsCount: 0,
      itemsToImport: [],
      duplicateItems: [],
      rowErrors: [],
      columnsFound: [],
      missingRequiredColumns: [],
      isValidFile: false,
      generalError: 'Unsupported file format. Please upload an Excel workbook (.xlsx, .xls) or CSV (.csv) file.',
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        fileName,
        totalRows: 0,
        validRowsCount: 0,
        duplicateRowsCount: 0,
        invalidRowsCount: 0,
        itemsToImport: [],
        duplicateItems: [],
        rowErrors: [],
        columnsFound: [],
        missingRequiredColumns: ['Criterion'],
        isValidFile: false,
        generalError: 'The uploaded Excel file contains no worksheets.',
      };
    }

    // Select appropriate sheet (first sheet, or sheet named "checklist" or "exit criteria")
    let targetSheetName = wb.SheetNames[0];
    const preferredSheet = wb.SheetNames.find((s) => {
      const lower = s.toLowerCase();
      return lower.includes('checklist') || lower.includes('exit') || lower.includes('criteria');
    });
    if (preferredSheet) {
      targetSheetName = preferredSheet;
    }

    const worksheet = wb.Sheets[targetSheetName];
    if (!worksheet) {
      return {
        fileName,
        totalRows: 0,
        validRowsCount: 0,
        duplicateRowsCount: 0,
        invalidRowsCount: 0,
        itemsToImport: [],
        duplicateItems: [],
        rowErrors: [],
        columnsFound: [],
        missingRequiredColumns: ['Criterion'],
        isValidFile: false,
        generalError: 'Target worksheet could not be read.',
      };
    }

    // Parse matrix to find headers row (usually row 1, but look for first non-empty header row)
    const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) {
      return {
        fileName,
        totalRows: 0,
        validRowsCount: 0,
        duplicateRowsCount: 0,
        invalidRowsCount: 0,
        itemsToImport: [],
        duplicateItems: [],
        rowErrors: [],
        columnsFound: [],
        missingRequiredColumns: ['Criterion'],
        isValidFile: false,
        generalError: 'The uploaded file is empty. Please add checklist rows and try again.',
      };
    }

    // Find header row index
    let headerRowIdx = -1;
    let headerMap: Record<keyof typeof COLUMN_SYNONYMS, number> = {} as any;
    let columnsFound: string[] = [];

    for (let r = 0; r < Math.min(10, rawMatrix.length); r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const currentMap: Record<keyof typeof COLUMN_SYNONYMS, number> = {} as any;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        if (!cell) continue;
        const matched = findMatchingField(cell);
        if (matched && currentMap[matched] === undefined) {
          currentMap[matched] = c;
        }
      }

      // Check if 'name' field is mapped
      if (currentMap.name !== undefined) {
        headerRowIdx = r;
        headerMap = currentMap;
        columnsFound = row.map((cell) => String(cell || '').trim()).filter(Boolean);
        break;
      }
    }

    if (headerRowIdx === -1 || headerMap.name === undefined) {
      return {
        fileName,
        totalRows: 0,
        validRowsCount: 0,
        duplicateRowsCount: 0,
        invalidRowsCount: 0,
        itemsToImport: [],
        duplicateItems: [],
        rowErrors: [],
        columnsFound,
        missingRequiredColumns: ['Criterion'],
        isValidFile: false,
        generalError: "Checklist upload failed. Required column 'Criterion' is missing.",
      };
    }

    const existingNameSet = new Set(
      existingCriteria.map((c) => (c.name || '').toLowerCase().trim()).filter(Boolean)
    );
    const seenNamesInFile = new Set<string>();

    const itemsToImport: ParsedCriterionItem[] = [];
    const duplicateItems: ParsedCriterionItem[] = [];
    const rowErrors: Array<{ rowNumber: number; message: string }> = [];

    let totalDataRows = 0;

    for (let r = headerRowIdx + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;

      // Skip completely blank rows
      const isBlank = row.every((c) => c === null || c === undefined || String(c).trim() === '');
      if (isBlank) continue;

      totalDataRows++;
      const excelRowNumber = r + 1; // 1-indexed Excel row

      const rawName = row[headerMap.name];
      const nameStr = String(rawName || '').trim();

      if (!nameStr) {
        rowErrors.push({
          rowNumber: excelRowNumber,
          message: 'Criterion name is empty.',
        });
        continue;
      }

      const rawDesc = headerMap.description !== undefined ? row[headerMap.description] : '';
      const description = String(rawDesc || '').trim();

      const rawReq = headerMap.is_required !== undefined ? row[headerMap.is_required] : '';
      const is_required = parseRequiredBoolean(rawReq);

      const rawResp = headerMap.responsible_person !== undefined ? row[headerMap.responsible_person] : '';
      const responsible_person = String(rawResp || '').trim() || defaultResponsiblePerson;

      const rawDue = headerMap.due_date !== undefined ? row[headerMap.due_date] : '';
      let due_date: string | undefined = undefined;
      if (rawDue) {
        due_date = parseExcelDate(rawDue);
        if (!due_date) {
          rowErrors.push({
            rowNumber: excelRowNumber,
            message: `Invalid Due Date '${rawDue}'. Expected valid date format.`,
          });
          continue;
        }
      } else {
        due_date = defaultDueDate;
      }

      const rawStatus = headerMap.status !== undefined ? row[headerMap.status] : '';
      const status = parseCriterionStatus(rawStatus);

      const rawComments = headerMap.comments !== undefined ? row[headerMap.comments] : '';
      const comments = String(rawComments || '').trim() || undefined;

      const normalizedKey = nameStr.toLowerCase();

      // Check duplicates
      let isDuplicate = false;
      let duplicateReason = '';

      if (existingNameSet.has(normalizedKey)) {
        isDuplicate = true;
        duplicateReason = 'Already exists in current Gate checklist';
      } else if (seenNamesInFile.has(normalizedKey)) {
        isDuplicate = true;
        duplicateReason = 'Duplicate row within uploaded file';
      }

      seenNamesInFile.add(normalizedKey);

      const item: ParsedCriterionItem = {
        rowNumber: excelRowNumber,
        name: nameStr,
        description,
        is_required,
        status,
        responsible_person,
        due_date,
        comments,
        isDuplicate,
        duplicateReason,
        isValid: true,
      };

      if (isDuplicate) {
        duplicateItems.push(item);
      } else {
        itemsToImport.push(item);
      }
    }

    return {
      fileName,
      totalRows: totalDataRows,
      validRowsCount: itemsToImport.length,
      duplicateRowsCount: duplicateItems.length,
      invalidRowsCount: rowErrors.length,
      itemsToImport,
      duplicateItems,
      rowErrors,
      columnsFound,
      missingRequiredColumns: [],
      isValidFile: rowErrors.length === 0 && itemsToImport.length > 0,
      generalError:
        itemsToImport.length === 0 && duplicateItems.length > 0
          ? 'All rows in this Excel file already exist in the Gate checklist.'
          : itemsToImport.length === 0 && rowErrors.length > 0
          ? `${rowErrors.length} rows contain invalid data. Please correct the Excel file and re-upload.`
          : itemsToImport.length === 0
          ? 'No checklist items found to import.'
          : undefined,
    };
  } catch (err: any) {
    return {
      fileName,
      totalRows: 0,
      validRowsCount: 0,
      duplicateRowsCount: 0,
      invalidRowsCount: 0,
      itemsToImport: [],
      duplicateItems: [],
      rowErrors: [],
      columnsFound: [],
      missingRequiredColumns: [],
      isValidFile: false,
      generalError: `Failed to read Excel workbook: ${err.message || 'Corrupt or unreadable file'}`,
    };
  }
}

/**
 * Generate and trigger download of a sample Exit Criteria Checklist Excel workbook
 */
export function downloadChecklistSampleTemplate(gateName = 'PL Gate') {
  const sampleData = [
    {
      'Criterion': 'DFMEA High-Risk Items Closed',
      'Description': 'All RPN > 100 or Special Characteristics addressed with mitigation action plans.',
      'Required': 'Yes',
      'Responsible Person': 'Quality Lead',
      'Due Date': '2026-10-15',
      'Status': 'In Progress',
      'Comments': 'Awaiting thermal cycle test results from Tier-1 vendor.',
    },
    {
      'Criterion': 'Component Packaging 3D CAD Freeze',
      'Description': 'Class-A surface release and zero clearance interference sign-off.',
      'Required': 'Yes',
      'Responsible Person': 'Design Lead',
      'Due Date': '2026-10-20',
      'Status': 'Completed',
      'Comments': 'Signed off by Chief Vehicle Architect.',
    },
    {
      'Criterion': 'Bill of Materials (BOM) Cost Rollup Sign-off',
      'Description': 'Commercial piece cost variance within targets agreed at Charter baseline.',
      'Required': 'Yes',
      'Responsible Person': 'Regional Finance Director',
      'Due Date': '2026-10-22',
      'Status': 'In Progress',
      'Comments': 'Target variance currently +0.4%.',
    },
    {
      'Criterion': 'Supplier Tooling Kick-off Authorizations',
      'Description': 'Purchase orders released for long lead-time stamping and injection molds.',
      'Required': 'Yes',
      'Responsible Person': 'Purchasing Lead',
      'Due Date': '2026-10-25',
      'Status': 'Pending',
      'Comments': 'Tooling purchase requisitions submitted.',
    },
    {
      'Criterion': 'Regulatory & Flammability Compliance Certificate',
      'Description': 'ECE / FMVSS material flammability test reports submitted and cataloged.',
      'Required': 'No',
      'Responsible Person': 'Homologation Engineer',
      'Due Date': '2026-10-28',
      'Status': 'In Progress',
      'Comments': 'Preliminary lab test certified.',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Auto-fit columns
  ws['!cols'] = [
    { wch: 38 },
    { wch: 60 },
    { wch: 12 },
    { wch: 25 },
    { wch: 14 },
    { wch: 16 },
    { wch: 45 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exit Criteria Checklist');

  const safeName = gateName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `${safeName}_Checklist_Template.xlsx`);
}
