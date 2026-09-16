import fs from 'fs';
import path from 'path';
import { formatPhaseName } from '@/constants/phases';

const DATA_DIR = path.join(process.cwd(), '.data');
const PHASES_FILE = path.join(DATA_DIR, 'task_phases.json');

let inMemoryPhases: Record<string, string> | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load all task phase mappings
 */
export function loadAllTaskPhases(): Record<string, string> {
  if (inMemoryPhases !== null) {
    return inMemoryPhases;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(PHASES_FILE)) {
      const raw = fs.readFileSync(PHASES_FILE, 'utf-8');
      inMemoryPhases = JSON.parse(raw);
      return inMemoryPhases || {};
    }
  } catch (err) {
    console.error('[Task Phase Store] Error loading phases file:', err);
  }
  inMemoryPhases = {};
  return inMemoryPhases;
}

/**
 * Save all task phase mappings
 */
export function saveAllTaskPhases(data: Record<string, string>): void {
  ensureDataDir();
  inMemoryPhases = data;
  try {
    fs.writeFileSync(PHASES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Task Phase Store] Error saving phases file:', err);
  }
}

/**
 * Get phase for a specific task ID
 */
export function getTaskPhase(taskId: string): string | null {
  if (!taskId) return null;
  const all = loadAllTaskPhases();
  return all[taskId] || null;
}

/**
 * Save or update phase for a specific task ID
 */
export function saveTaskPhase(taskId: string, phase: string): void {
  if (!taskId || !phase) return;
  const all = loadAllTaskPhases();
  all[taskId] = formatPhaseName(phase);
  saveAllTaskPhases(all);
}

/**
 * Delete phase for a specific task ID
 */
export function deleteTaskPhase(taskId: string): void {
  if (!taskId) return;
  const all = loadAllTaskPhases();
  if (all[taskId]) {
    delete all[taskId];
    saveAllTaskPhases(all);
  }
}
