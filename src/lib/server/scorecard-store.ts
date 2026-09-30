import fs from 'fs';
import path from 'path';
import { ProjectScorecard, ScorecardRow } from '@/types/scorecard.types';
import { saveAuditRecord } from './audit-store';
import { PDMUserSession } from '@/types/auth.types';
import * as xlsx from 'xlsx';

const DATA_DIR = path.join(process.cwd(), '.data');
const SCORECARD_FILE = path.join(DATA_DIR, 'imperative_scorecards.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCORECARD_FILE)) {
    fs.writeFileSync(SCORECARD_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

export const DEFAULT_INTEVA_SCORECARD_ROWS: Omit<ScorecardRow, 'prb' | 'ar_target' | 'pl_current' | 'pl_ro' | 'vc_current' | 'vc_ro' | 'tko_current' | 'tko_ro' | 'vl_current' | 'vl_ro' | 'cpa_current' | 'cpa_ro' | 'ct_current' | 'ct_ro'>[] = [
  { id: 'sop_date', category: 'General', line_item: 'Program SOP date', unit: 'Date' },
  { id: 'vol_annual', category: 'Volume', line_item: "Annual Volume / Life Avg. (000's Vehicles)", unit: "000's Vehicles" },
  { id: 'vol_cust', category: 'Volume', line_item: 'Customer Volume/Program Annual Life Avg. (Vehicles)', unit: 'Vehicles' },
  { id: 'vol_bc', category: 'Volume', line_item: 'Business Case Volume, Annual Life Avg. (Vehicles)', unit: 'Vehicles' },
  { id: 'vol_peak', category: 'Volume', line_item: 'Sustained Peak Weekly Volume (Units per week)', unit: 'Units/week' },
  { id: 'oem_equip', category: 'Tooling & Equipment', line_item: "Automotive OEM Owned Equipment ($ 000's)", unit: "$ 000's" },
  { id: 'oem_tool', category: 'Tooling & Equipment', line_item: "Automotive OEM Owned Tooling ($ 000's)", unit: "$ 000's" },
  { id: 'cust_tool', category: 'Tooling & Equipment', line_item: "Customer Owned Tooling ($ 000's)", unit: "$ 000's" },
  { id: 'tool_lump', category: 'Tooling & Equipment', line_item: "Tooling Paid by Customer - Lumpsum ($ 000's)", unit: "$ 000's" },
  { id: 'tool_amort', category: 'Tooling & Equipment', line_item: "Tooling Paid by Customer - Amortized ($ 000's)", unit: "$ 000's" },
  { id: 'cust_bai', category: 'Investment', line_item: "Customer BAI (Business Award Incentive ($ 000's))", unit: "$ 000's" },
  { id: 'supp_bai', category: 'Investment', line_item: "Supplier BAI (Business Award Incentive ($ 000's))", unit: "$ 000's" },
  { id: 'ops_launch', category: 'Expenses', line_item: "Operations and Launch Expenses ($ 000's)", unit: "$ 000's" },
  { id: 'fin_life_units', category: 'Financial Statistics', line_item: 'Financial Statistics (per unit) - Total Life units', unit: 'Units' },
  { id: 'unit_sales_price', category: 'Financial Statistics', line_item: '($) Unit Sales Price-Program Life Avg.', unit: '$' },
  { id: 'unit_ops_cost', category: 'Financial Statistics', line_item: '($) Unit Operating Cost-Program Life Avg.', unit: '$' },
  { id: 'cbom_first_yr', category: 'Financial Statistics', line_item: '($) First Year Bill of Material Cost - DDP', unit: '$' },
  { id: 'labor_time', category: 'Financial Statistics', line_item: 'First year Labor time per Unit - (seconds)', unit: 'Seconds' },
  { id: 'gross_margin', category: 'Financial Statistics', line_item: '(%) Gross Margin, Program Life Avg.', unit: '%' },
  { id: 'gross_profit', category: 'Financial Statistics', line_item: '($) Gross Profit, Program Life Avg.', unit: '$' },
  { id: 'oi_pct', category: 'Financial Statistics', line_item: '(%) OI-Program Life Avg.', unit: '%', is_mandatory: true },
  { id: 'oi_amt', category: 'Financial Statistics', line_item: '($) OI-Program Life Avg.', unit: '$' },
  { id: 'irr', category: 'Financial Statistics', line_item: '(%) Project: Internal Rate of Return', unit: '%' },
  { id: 'npv', category: 'Financial Statistics', line_item: "Net Present Value (NPV@15%, in 000's)", unit: "$ 000's" },
  { id: 'payback', category: 'Financial Statistics', line_item: 'Payback in years', unit: 'Years' },
  { id: 'prog_life', category: 'Financial Statistics', line_item: 'Program Life', unit: 'Years' },
  { id: 'oee_pct', category: 'Financial Statistics', line_item: '(%) OEE - Overall Equipment Effectiveness', unit: '%' },
  { id: 'otd_pct', category: 'Financial Statistics', line_item: '(%) OTD - On-Time Delivery', unit: '%' },
];

export function getProjectScorecard(projectId: string, projectName?: string): ProjectScorecard {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(SCORECARD_FILE, 'utf-8');
    const store = JSON.parse(raw);
    if (store[projectId]) {
      return store[projectId];
    }
  } catch (err) {
    console.error(`[Scorecard Store] Failed to read scorecard for ${projectId}:`, err);
  }

  // Generate initial default template for project
  const initialRows: ScorecardRow[] = DEFAULT_INTEVA_SCORECARD_ROWS.map((def) => {
    let prb = '';
    let ar = '';
    let pl = '';
    let vc = '';

    if (def.id === 'sop_date') {
      prb = '2026-11-30';
      ar = '2026-11-15';
      pl = '2026-11-15';
    } else if (def.id === 'oi_pct') {
      prb = '14.5%';
      ar = '15.0%';
      pl = '15.6%';
      vc = '15.6%';
    } else if (def.id === 'gross_margin') {
      prb = '22.0%';
      ar = '24.0%';
      pl = '24.5%';
      vc = '24.8%';
    } else if (def.id === 'oee_pct') {
      prb = '80.0%';
      ar = '85.0%';
      pl = '87.4%';
      vc = '87.4%';
    } else if (def.id === 'otd_pct') {
      prb = '95.0%';
      ar = '98.0%';
      pl = '98.5%';
      vc = '98.5%';
    } else if (def.id === 'vol_annual') {
      prb = '350';
      ar = '365';
      pl = '365';
    } else if (def.id === 'unit_sales_price') {
      prb = '48.50';
      ar = '49.20';
      pl = '49.20';
    }

    return {
      ...def,
      prb,
      ar_target: ar,
      pl_current: pl,
      pl_ro: pl,
      vc_current: vc,
      vc_ro: vc,
    };
  });

  const initialScorecard: ProjectScorecard = {
    project_id: projectId,
    project_name: projectName || projectId,
    version: 'v1.0',
    sop_date: '2026-11-15',
    oi_percentage_target: '15.0%',
    oi_percentage_current: '15.6%',
    oee_target: '85.0%',
    oee_current: '87.4%',
    otd_target: '98.0%',
    otd_current: '98.5%',
    rows: initialRows,
  };

  saveProjectScorecard(projectId, initialScorecard);
  return initialScorecard;
}

export function saveProjectScorecard(
  projectId: string,
  scorecard: ProjectScorecard,
  session?: PDMUserSession
): ProjectScorecard {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(SCORECARD_FILE, 'utf-8');
    const store = JSON.parse(raw);

    // Extract key metrics for FLM synchronization
    const oiRow = scorecard.rows.find((r) => r.id === 'oi_pct');
    const oeeRow = scorecard.rows.find((r) => r.id === 'oee_pct');
    const otdRow = scorecard.rows.find((r) => r.id === 'otd_pct');
    const sopRow = scorecard.rows.find((r) => r.id === 'sop_date');

    const updated: ProjectScorecard = {
      ...scorecard,
      project_id: projectId,
      sop_date: sopRow?.pl_current || sopRow?.ar_target || scorecard.sop_date || '2026-11-15',
      oi_percentage_target: oiRow?.ar_target || scorecard.oi_percentage_target || '15.0%',
      oi_percentage_current: oiRow?.pl_current || scorecard.oi_percentage_current || '15.6%',
      oee_target: oeeRow?.ar_target || scorecard.oee_target || '85.0%',
      oee_current: oeeRow?.pl_current || scorecard.oee_current || '87.4%',
      otd_target: otdRow?.ar_target || scorecard.otd_target || '98.0%',
      otd_current: otdRow?.pl_current || scorecard.otd_current || '98.5%',
    };

    store[projectId] = updated;
    fs.writeFileSync(SCORECARD_FILE, JSON.stringify(store, null, 2), 'utf-8');

    if (session) {
      saveAuditRecord({
        project_id: projectId,
        user_id: session.email || session.username,
        user_name: session.fullName || session.username,
        role: session.role,
        action: 'Updated Imperative Scorecard',
        entity_type: 'Scorecard',
        entity_id: projectId,
        description: `Updated Imperative Scorecard data for project ${projectId}. Version: ${updated.version || 'v1.0'}`,
      });
    }

    return updated;
  } catch (err) {
    console.error(`[Scorecard Store] Failed to save scorecard for ${projectId}:`, err);
    throw err;
  }
}

/**
 * Parse an Excel workbook buffer and populate the scorecard rows according to the predefined template
 */
export function importScorecardExcel(
  projectId: string,
  fileBuffer: Buffer,
  session?: PDMUserSession
): ProjectScorecard {
  const wb = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName =
    wb.SheetNames.find((s) => /imperative.*scorecard/i.test(s) || /template/i.test(s)) ||
    wb.SheetNames[0];

  const sheet = wb.Sheets[sheetName];
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const existing = getProjectScorecard(projectId);
  const updatedRows = [...existing.rows];

  // Match rows based on line_item name
  rawRows.forEach((row) => {
    if (!row || row.length === 0) return;
    const lineItemName = String(row[0] || '').trim();
    if (!lineItemName) return;

    const matchedRow = updatedRows.find(
      (r) =>
        r.line_item.toLowerCase().includes(lineItemName.toLowerCase()) ||
        lineItemName.toLowerCase().includes(r.line_item.toLowerCase())
    );

    if (matchedRow) {
      if (row[1] !== undefined && row[1] !== '') matchedRow.prb = String(row[1]).trim();
      if (row[2] !== undefined && row[2] !== '') matchedRow.ar_target = String(row[2]).trim();
      if (row[3] !== undefined && row[3] !== '') matchedRow.pl_current = String(row[3]).trim();
      if (row[4] !== undefined && row[4] !== '') matchedRow.pl_ro = String(row[4]).trim();
      if (row[5] !== undefined && row[5] !== '') matchedRow.vc_current = String(row[5]).trim();
      if (row[6] !== undefined && row[6] !== '') matchedRow.vc_ro = String(row[6]).trim();
      if (row[7] !== undefined && row[7] !== '') matchedRow.tko_current = String(row[7]).trim();
      if (row[8] !== undefined && row[8] !== '') matchedRow.tko_ro = String(row[8]).trim();
      if (row[9] !== undefined && row[9] !== '') matchedRow.vl_current = String(row[9]).trim();
      if (row[10] !== undefined && row[10] !== '') matchedRow.vl_ro = String(row[10]).trim();
      if (row[11] !== undefined && row[11] !== '') matchedRow.cpa_current = String(row[11]).trim();
      if (row[12] !== undefined && row[12] !== '') matchedRow.cpa_ro = String(row[12]).trim();
      if (row[13] !== undefined && row[13] !== '') matchedRow.ct_current = String(row[13]).trim();
      if (row[14] !== undefined && row[14] !== '') matchedRow.ct_ro = String(row[14]).trim();
    }
  });

  const updatedScorecard: ProjectScorecard = {
    ...existing,
    rows: updatedRows,
    last_imported_at: new Date().toISOString(),
    last_imported_by: session?.fullName || session?.username || 'Administrator',
    version: `v${(parseFloat(existing.version?.replace('v', '') || '1.0') + 0.1).toFixed(1)}`,
  };

  return saveProjectScorecard(projectId, updatedScorecard, session);
}

/**
 * Generate an Excel export workbook of the current project scorecard
 */
export function generateScorecardExcel(scorecard: ProjectScorecard): Buffer {
  const headers = [
    'Imperative Line Item',
    'Category',
    'Unit',
    'PRB (Commitment)',
    'Appropriation Request (Target)',
    'PL (Current)',
    'PL (R&O)',
    'VC (Current)',
    'VC (R&O)',
    'TKO (Current)',
    'TKO (R&O)',
    'VL (Current)',
    'VL (R&O)',
    'CPA (Current)',
    'CPA (R&O)',
    'CT (Current)',
    'CT (R&O)',
  ];

  const dataRows = scorecard.rows.map((r) => [
    r.line_item,
    r.category,
    r.unit || '',
    r.prb || '',
    r.ar_target || '',
    r.pl_current || '',
    r.pl_ro || '',
    r.vc_current || '',
    r.vc_ro || '',
    r.tko_current || '',
    r.tko_ro || '',
    r.vl_current || '',
    r.vl_ro || '',
    r.cpa_current || '',
    r.cpa_ro || '',
    r.ct_current || '',
    r.ct_ro || '',
  ]);

  const ws = xlsx.utils.aoa_to_sheet([headers, ...dataRows]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Imperative Scorecard');

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
