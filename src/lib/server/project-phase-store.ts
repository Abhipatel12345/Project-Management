import fs from 'fs';
import path from 'path';
import { ProjectPhase, STANDARD_PROJECT_PHASES, getPhaseBadgeColors, getPhaseNumber } from '@/constants/phases';

const DATA_DIR = path.join(process.cwd(), '.data');
const PHASES_FILE = path.join(DATA_DIR, 'project_custom_phases.json');

const getErpUrl = (): string => {
  return (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
};

const getApiKey = (): string => {
  return process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
};

const getApiSecret = (): string => {
  return process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';
};

const getAuthHeaders = (): Record<string, string> => {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `token ${getApiKey()}:${getApiSecret()}`,
  };
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

/**
 * Load cached custom phases map: { [projectId: string]: ProjectPhase[] }
 */
export function loadCachedCustomProjectPhases(): Record<string, ProjectPhase[]> {
  ensureDataDir();
  if (!fs.existsSync(PHASES_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(PHASES_FILE, 'utf8');
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error('[ProjectPhaseStore] Failed to read custom project phases cache:', err);
    return {};
  }
}

/**
 * Save cached custom phases map
 */
export function saveCachedCustomProjectPhases(data: Record<string, ProjectPhase[]>): void {
  ensureDataDir();
  try {
    fs.writeFileSync(PHASES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[ProjectPhaseStore] Failed to write custom project phases cache:', err);
  }
}

/**
 * Fetch all phases for a project from ERPNext Phase List DocType as the single source of truth,
 * combined with standard Phase 1–5 APQP milestones.
 */
export async function getProjectPhasesFromERP(projectId?: string): Promise<ProjectPhase[]> {
  if (!projectId || projectId === 'ALL') {
    return [...STANDARD_PROJECT_PHASES];
  }

  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();
  let erpPhases: ProjectPhase[] = [];

  try {
    const filters = JSON.stringify([['target_project', '=', projectId]]);
    const fields = JSON.stringify([
      'name',
      'target_project',
      'phase_name',
      'phase_scope_and_objectives',
      'creation',
      'modified',
    ]);
    const url = `${erpUrl}/api/resource/Phase%20List?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=500&order_by=creation asc`;

    const res = await fetch(url, { headers, cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const records = json.data || [];

      erpPhases = records.map((rec: any, idx: number) => {
        const rawName = (rec.phase_name || rec.name || '').trim();
        const pNum = getPhaseNumber(rawName) || (STANDARD_PROJECT_PHASES.length + idx + 1);
        return {
          id: rec.name,
          phase_number: pNum,
          name: rawName,
          description: rec.phase_scope_and_objectives || `Project Phase (${rawName})`,
          color: getPhaseBadgeColors(rawName),
        };
      });

      // Update local cache
      const cached = loadCachedCustomProjectPhases();
      cached[projectId] = erpPhases;
      saveCachedCustomProjectPhases(cached);
    } else {
      console.warn('[ProjectPhaseStore] ERPNext Phase List GET returned status', res.status);
      // Fallback to cache
      const cached = loadCachedCustomProjectPhases();
      erpPhases = cached[projectId] || [];
    }
  } catch (err: any) {
    console.error('[ProjectPhaseStore] ERPNext Phase List fetch failed, using local cache:', err?.message);
    const cached = loadCachedCustomProjectPhases();
    erpPhases = cached[projectId] || [];
  }

  // Deduplicate against STANDARD_PROJECT_PHASES
  const standardNames = new Set(STANDARD_PROJECT_PHASES.map((p) => p.name.toLowerCase()));
  const filteredCustom = erpPhases.filter((cp) => !standardNames.has(cp.name.toLowerCase()));

  return [...STANDARD_PROJECT_PHASES, ...filteredCustom];
}

/**
 * Create a new Phase List record in ERPNext backend
 */
export async function createPhaseInERPNext(
  projectId: string,
  phaseName: string,
  description?: string
): Promise<ProjectPhase> {
  const erpUrl = getErpUrl();
  const headers = getAuthHeaders();

  let formattedName = phaseName.trim();
  // If not already prefixed with "Phase X:" or custom title, compute next phase number
  const existingPhases = await getProjectPhasesFromERP(projectId);
  if (!/^phase\s*\d+/i.test(formattedName)) {
    const nextNumber = existingPhases.length + 1;
    formattedName = `Phase ${nextNumber}: ${formattedName}`;
  }

  const payload = {
    target_project: projectId,
    phase_name: formattedName,
    phase_scope_and_objectives: description?.trim() || '',
  };

  const url = `${erpUrl}/api/resource/Phase%20List`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const resJson = await res.json();

  if (!res.ok) {
    let errMsg = resJson._error_message || resJson.message || resJson.exception || 'Failed to create Phase in ERPNext';
    if (typeof errMsg === 'object') {
      try {
        errMsg = JSON.stringify(errMsg);
      } catch {}
    }
    throw new Error(errMsg);
  }

  const createdData = resJson.data || resJson;
  const pNum = getPhaseNumber(formattedName) || (existingPhases.length + 1);

  const createdPhase: ProjectPhase = {
    id: createdData.name || `phase-${pNum}-${Date.now().toString(36)}`,
    phase_number: pNum,
    name: formattedName,
    description: description?.trim() || `Project Phase (${formattedName})`,
    color: getPhaseBadgeColors(formattedName),
  };

  // Update local cache
  const cached = loadCachedCustomProjectPhases();
  const list = cached[projectId] || [];
  cached[projectId] = [...list.filter((p) => p.name.toLowerCase() !== formattedName.toLowerCase()), createdPhase];
  saveCachedCustomProjectPhases(cached);

  return createdPhase;
}
