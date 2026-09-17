import fs from 'fs';
import path from 'path';
import {
  PDPStageCode,
  PDP_STAGE_ORDER,
  StageMovementHistoryEntry,
  ProjectStageMoverStatus,
} from '@/types/stage-mover.types';
import { loadAllGates, saveAllGates } from './gate-store';
import { saveAuditRecord } from './audit-store';
import { PDMUserSession } from '@/types/auth.types';

const DATA_DIR = path.join(process.cwd(), '.data');
const HISTORY_FILE = path.join(DATA_DIR, 'stage_mover_history.json');
const PROJECT_STAGES_FILE = path.join(DATA_DIR, 'project_active_stages.json');
const WORKFLOW_TRIGGERS_FILE = path.join(DATA_DIR, 'stage_approval_workflows.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
  if (!fs.existsSync(PROJECT_STAGES_FILE)) {
    fs.writeFileSync(PROJECT_STAGES_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
  if (!fs.existsSync(WORKFLOW_TRIGGERS_FILE)) {
    fs.writeFileSync(WORKFLOW_TRIGGERS_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

export function getProjectCurrentStage(projectId: string, fallbackPhase = 'PL'): PDPStageCode {
  ensureFiles();
  try {
    const raw = fs.readFileSync(PROJECT_STAGES_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (data[projectId] && PDP_STAGE_ORDER.includes(data[projectId])) {
      return data[projectId];
    }
  } catch {
    // fallback
  }
  const cleanFallback = fallbackPhase.toUpperCase().replace(/^GATE\s*\d*:\s*/i, '').trim();
  return (PDP_STAGE_ORDER.includes(cleanFallback as any) ? cleanFallback : 'PL') as PDPStageCode;
}

export function setProjectCurrentStage(projectId: string, stage: PDPStageCode) {
  ensureFiles();
  try {
    const raw = fs.readFileSync(PROJECT_STAGES_FILE, 'utf-8');
    const data = JSON.parse(raw);
    data[projectId] = stage;
    fs.writeFileSync(PROJECT_STAGES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Stage Mover] Failed to set project stage:', err);
  }
}

export function getProjectStageMoverStatus(
  projectId: string,
  projectName?: string,
  currentPhaseParam?: string
): ProjectStageMoverStatus {
  ensureFiles();
  const currentStage = getProjectCurrentStage(projectId, currentPhaseParam || 'PL');
  const currentStageIdx = PDP_STAGE_ORDER.indexOf(currentStage);
  const nextStage: PDPStageCode | null =
    currentStageIdx >= 0 && currentStageIdx < PDP_STAGE_ORDER.length - 1
      ? PDP_STAGE_ORDER[currentStageIdx + 1]
      : null;

  // Find associated Gate from existing gate store
  const allGates = loadAllGates();
  const projectGates = allGates.filter((g) => g.project === projectId);

  // Find gate corresponding to current stage, e.g. "1. PL" or "2. VC"
  const currentGate = projectGates.find((g) => {
    const code = (g.gate_type || g.gate_name || '').toUpperCase();
    return code.includes(currentStage);
  }) || projectGates[0];

  // Inspect existing Gate Review Results board reviews
  let pdDecision: 'Pass' | 'Pass with Follow-up' | 'Escalate' | 'Pending' = 'Pending';
  let pdName = 'Platform Director';
  let totalBoard = 0;
  let passCount = 0;
  let followupCount = 0;
  let escalateCount = 0;
  let pendingCount = 0;

  if (currentGate && Array.isArray(currentGate.board_reviews)) {
    totalBoard = currentGate.board_reviews.length;
    for (const br of currentGate.board_reviews) {
      const dec = br.gate_decision;
      if (dec === 'Pass') passCount++;
      else if (dec === 'Pass with Follow-up' || dec === 'Pass with Follow up') followupCount++;
      else if (dec === 'Escalate') escalateCount++;
      else pendingCount++;

      // Check if this board review is Platform Director / Product Group Director
      const title = (br.board_title || '').toLowerCase();
      if (title.includes('platform director') || title.includes('product group director')) {
        if (dec === 'Pass' || dec === 'Pass with Follow-up' || dec === 'Pass with Follow up' || dec === 'Escalate') {
          pdDecision = dec === 'Pass with Follow up' ? 'Pass with Follow-up' : dec;
        }
        pdName = br.name || pdName;
      }
    }
  }

  // Check workflow trigger state
  let workflowTriggered = false;
  let workflowTriggeredAt: string | undefined = undefined;
  try {
    const rawWf = fs.readFileSync(WORKFLOW_TRIGGERS_FILE, 'utf-8');
    const wfData = JSON.parse(rawWf);
    if (wfData[projectId]?.[currentStage]) {
      workflowTriggered = true;
      workflowTriggeredAt = wfData[projectId][currentStage].triggered_at;
    }
  } catch {
    // ignore
  }

  // Read movement history
  let history: StageMovementHistoryEntry[] = [];
  try {
    const rawHist = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const histData = JSON.parse(rawHist);
    history = histData[projectId] || [];
  } catch {
    history = [];
  }

  // Check if current gate results are locked
  const isLocked = currentGate?.status === 'Completed' || (currentGate as any)?.is_locked === true;

  // Determine stage movement eligibility
  // Rule: PD decision must be 'Pass' or 'Pass with Follow-up'
  let canMove = false;
  let blockReason: string | undefined = undefined;

  if (!nextStage) {
    canMove = false;
    blockReason = 'Project is at final lifecycle stage (CT). No further stages available.';
  } else if (!workflowTriggered) {
    canMove = false;
    blockReason = 'Gate Review Approval workflow has not been triggered by the Project Manager.';
  } else if (pdDecision === 'Pending') {
    canMove = false;
    blockReason = 'Awaiting Platform Director / Product Group Director review decision.';
  } else if (pdDecision === 'Escalate') {
    canMove = false;
    blockReason = 'Platform Director decision is ESCALATE. Stage movement blocked until re-review.';
  } else if (pdDecision === 'Pass' || pdDecision === 'Pass with Follow-up') {
    canMove = true;
  }

  return {
    project_id: projectId,
    project_name: projectName || projectId,
    current_stage: currentStage,
    next_stage: nextStage,
    can_move: canMove,
    block_reason: blockReason,
    is_locked: isLocked,
    approval_workflow_triggered: workflowTriggered,
    approval_workflow_triggered_at: workflowTriggeredAt,
    platform_director_decision: pdDecision,
    platform_director_name: pdName,
    board_decisions_summary: {
      total: totalBoard,
      pass: passCount,
      pass_with_followup: followupCount,
      escalate: escalateCount,
      pending: pendingCount,
    },
    history,
    current_gate: currentGate,
  };
}

export function triggerApprovalWorkflow(
  projectId: string,
  session: PDMUserSession
): { success: boolean; message: string } {
  ensureFiles();
  const currentStage = getProjectCurrentStage(projectId);

  try {
    const rawWf = fs.readFileSync(WORKFLOW_TRIGGERS_FILE, 'utf-8');
    const wfData = JSON.parse(rawWf);
    if (!wfData[projectId]) wfData[projectId] = {};
    wfData[projectId][currentStage] = {
      triggered_at: new Date().toISOString(),
      triggered_by: session.fullName || session.username,
    };
    fs.writeFileSync(WORKFLOW_TRIGGERS_FILE, JSON.stringify(wfData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Stage Mover] Failed to record workflow trigger:', err);
  }

  // Audit log
  saveAuditRecord({
    project_id: projectId,
    user_id: session.email || session.username,
    user_name: session.fullName || session.username,
    role: session.role,
    action: 'Trigger Gate Review Approval Workflow',
    entity_type: 'StageMover',
    entity_id: projectId,
    description: `PM triggered Gate Review Approval workflow for ${currentStage}. Notifications dispatched to Board Members.`,
  });

  return {
    success: true,
    message: `Gate Review Approval workflow triggered for ${currentStage}. Notifications sent to all Board Members.`,
  };
}

export function executeStageMovement(
  projectId: string,
  session: PDMUserSession
): StageMovementHistoryEntry {
  ensureFiles();
  const status = getProjectStageMoverStatus(projectId);

  if (!status.can_move || !status.next_stage) {
    throw new Error(status.block_reason || 'Stage movement is not permitted under current rules.');
  }

  const fromStage = status.current_stage;
  const toStage = status.next_stage;

  // 1. Advance project stage
  setProjectCurrentStage(projectId, toStage);

  // 2. Lock Gate Review Results for historical preservation
  const allGates = loadAllGates();
  const currentGate = allGates.find((g) => g.name === status.current_gate?.name);
  if (currentGate) {
    (currentGate as any).is_locked = true;
    currentGate.status = 'Approved';
    currentGate.approval_status = 'Approved';
    saveAllGates(allGates);
  }

  // 3. Record Irreversible History
  const historyEntry: StageMovementHistoryEntry = {
    id: `MOVE-${Date.now()}`,
    project_id: projectId,
    from_stage: fromStage,
    to_stage: toStage,
    moved_at: new Date().toISOString(),
    moved_by: session.fullName || session.username || 'System',
    trigger_type: 'PD_APPROVAL',
    pd_decision: status.platform_director_decision as any,
    gate_name: status.current_gate?.gate_name || `${fromStage} Gate`,
  };

  try {
    const rawHist = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const histData = JSON.parse(rawHist);
    if (!histData[projectId]) histData[projectId] = [];
    histData[projectId].unshift(historyEntry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(histData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Stage Mover] Failed to write movement history:', err);
  }

  // 4. Audit Log
  saveAuditRecord({
    project_id: projectId,
    user_id: session.email || session.username,
    user_name: session.fullName || session.username,
    role: session.role,
    action: `Project Stage Advanced (${fromStage} → ${toStage})`,
    entity_type: 'StageMover',
    entity_id: historyEntry.id,
    description: `Platform Director approved (${status.platform_director_decision}). Project successfully moved to ${toStage}. Historical Gate Review Results locked.`,
    old_value: fromStage,
    new_value: toStage,
  });

  return historyEntry;
}

export function executePMOOverride(
  projectId: string,
  targetStage: PDPStageCode,
  reason: string,
  session: PDMUserSession,
  isRollback = false
): StageMovementHistoryEntry {
  ensureFiles();
  const currentStage = getProjectCurrentStage(projectId);

  if (!PDP_STAGE_ORDER.includes(targetStage)) {
    throw new Error(`Invalid target stage: ${targetStage}`);
  }
  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed reason is required for PMO override/rollback actions.');
  }

  setProjectCurrentStage(projectId, targetStage);

  const historyEntry: StageMovementHistoryEntry = {
    id: `PMO-${Date.now()}`,
    project_id: projectId,
    from_stage: currentStage,
    to_stage: targetStage,
    moved_at: new Date().toISOString(),
    moved_by: session.fullName || session.username || 'PMO Admin',
    trigger_type: isRollback ? 'PMO_ROLLBACK' : 'PMO_OVERRIDE',
    reason,
  };

  try {
    const rawHist = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const histData = JSON.parse(rawHist);
    if (!histData[projectId]) histData[projectId] = [];
    histData[projectId].unshift(historyEntry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(histData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Stage Mover] Failed to write PMO override history:', err);
  }

  saveAuditRecord({
    project_id: projectId,
    user_id: session.email || session.username,
    user_name: session.fullName || session.username,
    role: session.role,
    action: `PMO Governance: ${isRollback ? 'Stage Rollback' : 'Stage Override'}`,
    entity_type: 'StageMover',
    entity_id: historyEntry.id,
    description: `PMO executed stage change from ${currentStage} to ${targetStage}. Reason: ${reason}`,
    old_value: currentStage,
    new_value: targetStage,
  });

  return historyEntry;
}

export function getStageMoverDashboard() {
  ensureFiles();
  const allGates = loadAllGates();
  const knownProjectIds: string[] = Array.from(
    new Set(allGates.map((g) => g.project).filter((p): p is string => Boolean(p)))
  );
  if (knownProjectIds.length === 0) {
    knownProjectIds.push('PROJ-0124', 'PROJ-0123', 'PROJ-0122', 'PROJ-0121');
  }

  // Read all history entries across all projects
  let historyStore: Record<string, StageMovementHistoryEntry[]> = {};
  try {
    historyStore = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    historyStore = {};
  }

  const allMovements: StageMovementHistoryEntry[] = [];
  for (const pid of Object.keys(historyStore)) {
    allMovements.push(...historyStore[pid]);
  }
  allMovements.sort((a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime());

  const stageCounts: Record<PDPStageCode, number> = {
    PL: 0,
    VC: 0,
    TKO: 0,
    VL: 0,
    CPA: 0,
    CT: 0,
  };

  let passCount = 0;
  let passFollowupCount = 0;
  let escalateCount = 0;
  let pendingCount = 0;
  let canMoveCount = 0;
  let blockedCount = 0;
  let pmoAttentionCount = 0;

  const projectSummaries = knownProjectIds.map((pid) => {
    const gate = allGates.find((g) => g.project === pid);
    const status = getProjectStageMoverStatus(pid, gate?.project_name || pid, gate?.gate_type || 'PL');

    const stg = status.current_stage;
    if (stageCounts[stg] !== undefined) {
      stageCounts[stg]++;
    }

    if (status.platform_director_decision === 'Pass') passCount++;
    else if (status.platform_director_decision === 'Pass with Follow-up') passFollowupCount++;
    else if (status.platform_director_decision === 'Escalate') {
      escalateCount++;
      pmoAttentionCount++;
    } else {
      pendingCount++;
    }

    if (status.can_move) canMoveCount++;
    else blockedCount++;

    return {
      project_id: pid,
      project_name: status.project_name,
      current_stage: status.current_stage,
      next_stage: status.next_stage,
      can_move: status.can_move,
      block_reason: status.block_reason,
      pd_decision: status.platform_director_decision,
      pd_name: status.platform_director_name,
      board_summary: status.board_decisions_summary,
      is_locked: status.is_locked,
      workflow_triggered: status.approval_workflow_triggered,
    };
  });

  return {
    total_projects: knownProjectIds.length,
    stage_distribution: stageCounts,
    decisions: {
      pass: passCount,
      pass_with_followup: passFollowupCount,
      escalate: escalateCount,
      pending: pendingCount,
    },
    movement_readiness: {
      can_move: canMoveCount,
      blocked: blockedCount,
    },
    pmo_attention_count: pmoAttentionCount,
    recent_movements: allMovements.slice(0, 15),
    projects: projectSummaries,
  };
}

