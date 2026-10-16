const fs = require('fs');
const path = require('path');

const erpUrl = 'http://80.225.204.210:8083';
const headers = { 
  'Authorization': 'token df5d2dc4b819ad2:25c592ffee48809',
  'Content-Type': 'application/json'
};

const DATA_DIR = path.join(__dirname, '..', '.data');

async function erpPost(docType, data) {
  const res = await fetch(`${erpUrl}/api/resource/${encodeURIComponent(docType)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to insert ${docType}: ${res.status} - ${errText}`);
  }
  return await res.json();
}

async function erpPut(docType, name, data) {
  const res = await fetch(`${erpUrl}/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update ${docType}/${name}: ${res.status} - ${errText}`);
  }
  return await res.json();
}

async function recordExists(docType, filters) {
  try {
    const qs = encodeURIComponent(JSON.stringify(filters));
    const res = await fetch(`${erpUrl}/api/resource/${encodeURIComponent(docType)}?filters=${qs}&limit_page_length=1`, { headers });
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.data) && json.data.length > 0;
  } catch {
    return false;
  }
}

// 1. Migrate Gates
async function migrateGates() {
  console.log('\n--- Migrating Gates (.data/gates.json) ---');
  const filePath = path.join(DATA_DIR, 'gates.json');
  if (!fs.existsSync(filePath)) return console.log('gates.json not found');
  const gates = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${gates.length} gates to process.`);

  let successCount = 0;
  for (const g of gates) {
    try {
      const exists = await recordExists('Gate', [['project', '=', g.project], ['gate_type', '=', g.gate_type]]);
      if (exists) {
        successCount++;
        continue;
      }

      const payload = {
        gate_name: g.gate_name || `${g.gate_type} Gate`,
        gate_type: g.gate_type,
        project: g.project,
        project_name: g.project_name || '',
        status: g.status || 'Not Started',
        approval_status: g.approval_status || 'Pending',
        planned_date: g.planned_date || null,
        target_date: g.target_date || null,
        actual_date: g.actual_date || null,
        gate_owner: g.gate_owner || '',
        gate_owner_id: g.gate_owner_id || '',
        gate_reviewer: g.gate_reviewer || '',
        reviewer_user_id: g.reviewer_user_id || '',
        completion_percentage: g.completion_percentage || 0,
        readiness_percentage: g.readiness_percentage || 0,
        is_locked: g.is_locked ? 1 : 0,
        description: g.description || '',
        criteria: (g.criteria || []).map((c, i) => ({
          criteria_id: c.id || `CRIT-${i + 1}`,
          name_label: c.name || 'Criterion',
          status: c.status || 'Pending',
          is_required: c.is_required ? 1 : 0,
          function: c.function || '',
          responsible_person: c.responsible_person || '',
          responsible_user_id: c.responsible_user_id || '',
          related_task: c.related_task || '',
          related_task_id: c.related_task_id || null,
          document_reference: c.document_reference || '',
          linked_document_name: c.linked_document_name || '',
          completion_percentage: c.completion_percentage || 0,
          approved_by: c.approved_by || '',
          approved_at: c.approved_at || null,
          description: c.description || ''
        })),
        deliverables: (g.deliverables || []).map((d, i) => ({
          deliverable_id: d.id || `DEL-${i + 1}`,
          title: d.name || d.title || 'Deliverable',
          status: d.status || 'Not Started',
          completion_percentage: d.completion_percentage || 0,
          is_required: d.is_required ? 1 : 0,
          responsible_person: d.responsible_person || '',
          responsible_user_id: d.responsible_user_id || '',
          related_task: d.related_task || '',
          related_task_id: d.related_task_id || null,
          document_reference: d.document_reference || '',
          linked_document_name: d.linked_document_name || '',
          approved_by: d.approved_by || '',
          approved_at: d.approved_at || null,
          description: d.description || ''
        })),
        board_reviews: (g.board_reviews || []).map(b => ({
          board_title: b.board_title,
          function: b.function || '',
          reviewer_name: b.name || 'Unassigned',
          delegation: b.delegation || 'Not Applicable',
          gate_decision: b.gate_decision || 'Pending',
          remarks: b.remarks || ''
        }))
      };

      await erpPost('Gate', payload);
      successCount++;
    } catch (e) {
      console.error(`Error migrating gate ${g.project}-${g.gate_type}:`, e.message);
    }
  }
  console.log(`Gates migration complete: ${successCount}/${gates.length} present in ERPNext.`);
}

// 2. Migrate Stage History & Active Stages
async function migrateStageMover() {
  console.log('\n--- Migrating Stage Mover ---');
  // 2a. Update Project.custom_stage
  const activeStagesPath = path.join(DATA_DIR, 'project_active_stages.json');
  if (fs.existsSync(activeStagesPath)) {
    const active = JSON.parse(fs.readFileSync(activeStagesPath, 'utf-8'));
    for (const [projId, stg] of Object.entries(active)) {
      try {
        await erpPut('Project', projId, { custom_stage: stg });
        console.log(` - Project ${projId} custom_stage updated to: ${stg}`);
      } catch (e) {
        console.warn(` - Could not update custom_stage on ${projId}:`, e.message);
      }
    }
  }

  // 2b. Stage Movement History
  const histPath = path.join(DATA_DIR, 'stage_mover_history.json');
  if (fs.existsSync(histPath)) {
    const hist = JSON.parse(fs.readFileSync(histPath, 'utf-8'));
    let count = 0;
    for (const [projId, entries] of Object.entries(hist)) {
      for (const e of entries) {
        try {
          const exists = await recordExists('Stage Movement History', [
            ['project', '=', projId],
            ['from_stage', '=', e.from_stage],
            ['to_stage', '=', e.to_stage],
            ['moved_at', '=', e.moved_at ? e.moved_at.replace('T', ' ').replace('Z', '').split('.')[0] : '']
          ]);
          if (!exists) {
            await erpPost('Stage Movement History', {
              project: projId,
              from_stage: e.from_stage,
              to_stage: e.to_stage,
              moved_at: e.moved_at ? e.moved_at.replace('T', ' ').replace('Z', '').split('.')[0] : new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0],
              moved_by: e.moved_by || 'System',
              trigger_type: e.trigger_type || 'PD_APPROVAL',
              pd_decision: e.pd_decision || 'Pass',
              reason: e.reason || '',
              gate_name: e.gate_name || ''
            });
            count++;
          }
        } catch (err) {
          console.error(`Error migrating stage entry for ${projId}:`, err.message);
        }
      }
    }
    console.log(`Stage Movement History migrated: ${count} new records.`);
  }
}

// 3. Migrate Baselines
async function migrateBaselines() {
  console.log('\n--- Migrating Project Baselines (.data/baselines.json) ---');
  const filePath = path.join(DATA_DIR, 'baselines.json');
  if (!fs.existsSync(filePath)) return console.log('baselines.json not found');
  const baselines = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${baselines.length} baselines to process.`);

  let count = 0;
  for (const b of baselines) {
    try {
      const exists = await recordExists('Project Baseline', [
        ['project', '=', b.project_id],
        ['baseline_number', '=', b.baseline_number]
      ]);
      if (exists) {
        count++;
        continue;
      }

      const payload = {
        baseline_name: b.baseline_name,
        baseline_number: b.baseline_number,
        project: b.project_id,
        project_name: b.project_name || '',
        status: b.status || 'Active',
        created_by_user: b.created_by || '',
        created_at_date: b.created_at ? b.created_at.replace('T', ' ').replace('Z', '').split('.')[0] : null,
        description: b.description || '',
        tasks: (b.tasks || []).map(t => ({
          task_id: t.task_id || t.id,
          subject: t.subject || t.title,
          start_date: t.start_date || t.exp_start_date || null,
          end_date: t.end_date || t.exp_end_date || null,
          duration_days: t.duration || 0,
          progress: t.progress || 0,
          status: t.status || 'Open',
          is_milestone: t.is_milestone ? 1 : 0,
          wbs: t.wbs || ''
        }))
      };

      await erpPost('Project Baseline', payload);
      count++;
    } catch (e) {
      console.error(`Error migrating baseline ${b.id}:`, e.message);
    }
  }
  console.log(`Baselines migration complete: ${count}/${baselines.length} present in ERPNext.`);
}

// 4. Migrate Task Submissions
async function migrateTaskSubmissions() {
  console.log('\n--- Migrating Task Submissions (.data/task_submissions.json) ---');
  const filePath = path.join(DATA_DIR, 'task_submissions.json');
  if (!fs.existsSync(filePath)) return console.log('task_submissions.json not found');
  const subs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let total = 0;
  let count = 0;

  for (const [taskId, list] of Object.entries(subs)) {
    for (const s of list) {
      total++;
      try {
        const exists = await recordExists('Task Submission', [
          ['task', '=', taskId],
          ['submitted_at', '=', s.submitted_at ? s.submitted_at.replace('T', ' ').replace('Z', '').split('.')[0] : '']
        ]);
        if (!exists) {
          await erpPost('Task Submission', {
            task: taskId,
            project: s.project_id || 'PROJ-0126',
            submitted_by: s.submitted_by || 'User',
            submitted_by_name: s.submitted_by_name || s.submitted_by || '',
            submitted_at: s.submitted_at ? s.submitted_at.replace('T', ' ').replace('Z', '').split('.')[0] : new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0],
            status: s.status || 'Submitted',
            reviewed_by: s.reviewed_by || '',
            reviewed_at: s.reviewed_at ? s.reviewed_at.replace('T', ' ').replace('Z', '').split('.')[0] : null,
            file_url: (s.attachments && s.attachments[0]) ? s.attachments[0].file_url : '',
            file_name: (s.attachments && s.attachments[0]) ? s.attachments[0].file_name : '',
            notes: s.notes || '',
            feedback: s.feedback || s.rejection_reason || ''
          });
          count++;
        }
      } catch (e) {
        console.error(`Error migrating submission for ${taskId}:`, e.message);
      }
    }
  }
  console.log(`Task Submissions migrated: ${count}/${total} records.`);
}

// 5. Migrate Skip Requests
async function migrateSkipRequests() {
  console.log('\n--- Migrating Task Skip Requests (.data/skip-requests.json) ---');
  const filePath = path.join(DATA_DIR, 'skip-requests.json');
  if (!fs.existsSync(filePath)) return console.log('skip-requests.json not found');
  const skips = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${skips.length} skip requests to process.`);

  let count = 0;
  for (const s of skips) {
    try {
      const exists = await recordExists('Task Skip Request', [
        ['task', '=', s.task_id],
        ['requested_by', '=', s.requested_by]
      ]);
      if (!exists) {
        await erpPost('Task Skip Request', {
          task: s.task_id,
          task_subject: s.task_subject || '',
          project: s.project_id,
          requested_by: s.requested_by,
          requested_by_name: s.requested_by_name || s.requested_by,
          requested_at: s.requested_at ? s.requested_at.replace('T', ' ').replace('Z', '').split('.')[0] : new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0],
          status: s.status || 'PENDING',
          skip_reason: s.skip_reason,
          additional_comment: s.additional_comment || '',
          reviewed_by: s.reviewed_by || '',
          reviewed_by_name: s.reviewed_by_name || '',
          reviewed_at: s.reviewed_at ? s.reviewed_at.replace('T', ' ').replace('Z', '').split('.')[0] : null,
          rejection_reason: s.rejection_reason || ''
        });
        count++;
      }
    } catch (e) {
      console.error(`Error migrating skip request ${s.id}:`, e.message);
    }
  }
  console.log(`Skip requests migrated: ${count}/${skips.length} new records.`);
}

// 6. Migrate Design Reviews
async function migrateDesignReviews() {
  console.log('\n--- Migrating Design Reviews (.data/design_reviews.json) ---');
  const filePath = path.join(DATA_DIR, 'design_reviews.json');
  if (!fs.existsSync(filePath)) return console.log('design_reviews.json not found');
  const reviews = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${reviews.length} design reviews to process.`);

  let count = 0;
  for (const r of reviews) {
    try {
      const exists = await recordExists('Design Review', [
        ['project', '=', r.project_id || r.project],
        ['title', '=', r.title]
      ]);
      if (!exists) {
        const payload = {
          title: r.title,
          project: r.project_id || r.project,
          project_name: r.project_name || '',
          review_type: r.review_type || 'Preliminary',
          phase: r.phase || '',
          planned_date: r.planned_date || null,
          actual_date: r.actual_date || null,
          status: r.status || 'Planned',
          approval_status: r.approval_status || 'Pending',
          lead_reviewer: r.lead_reviewer || '',
          lead_reviewer_name: r.lead_reviewer_name || '',
          description: r.description || '',
          findings: (r.findings || []).map(f => ({
            finding_description: f.description || f.finding_description || 'Finding',
            severity: f.severity || 'Major',
            status: f.status || 'Open',
            assigned_to: f.assigned_to || '',
            due_date: f.due_date || null,
            resolution_notes: f.resolution_notes || ''
          }))
        };
        await erpPost('Design Review', payload);
        count++;
      }
    } catch (e) {
      console.error(`Error migrating design review ${r.title}:`, e.message);
    }
  }
  console.log(`Design reviews migrated: ${count}/${reviews.length} new records.`);
}

// 7. Migrate Imperative Scorecards
async function migrateScorecards() {
  console.log('\n--- Migrating Imperative Scorecards (.data/imperative_scorecards.json) ---');
  const filePath = path.join(DATA_DIR, 'imperative_scorecards.json');
  if (!fs.existsSync(filePath)) return console.log('imperative_scorecards.json not found');
  const cards = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const cardList = Array.isArray(cards) ? cards : Object.values(cards);
  console.log(`Found ${cardList.length} scorecards to process.`);

  let count = 0;
  for (const sc of cardList) {
    try {
      const projId = sc.project_id || sc.project;
      if (!projId) continue;
      const exists = await recordExists('Imperative Scorecard', [['project', '=', projId]]);
      if (!exists) {
        const metrics = [];
        if (Array.isArray(sc.categories)) {
          for (const cat of sc.categories) {
            for (const m of (cat.metrics || [])) {
              metrics.push({
                category: cat.name || 'General',
                metric_name: m.name || m.metric_name || 'Metric',
                unit: m.unit || '',
                target_value: Number(m.target || m.target_value) || 0,
                actual_value: Number(m.actual || m.actual_value) || 0,
                status: m.status || 'Green',
                weight: Number(m.weight) || 1,
                comments: m.comments || ''
              });
            }
          }
        }
        await erpPost('Imperative Scorecard', {
          project: projId,
          project_name: sc.project_name || '',
          scorecard_version: sc.version || 'v1.0',
          status: sc.status || 'Published',
          evaluated_at: sc.evaluated_at ? sc.evaluated_at.replace('T', ' ').replace('Z', '').split('.')[0] : new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0],
          evaluated_by: sc.evaluated_by || 'PMO',
          overall_score: sc.overall_score || 0,
          metrics
        });
        count++;
      }
    } catch (e) {
      console.error(`Error migrating scorecard:`, e.message);
    }
  }
  console.log(`Scorecards migrated: ${count}/${cardList.length} new records.`);
}

// 8. Migrate Flawless Launch
async function migrateFlawlessLaunch() {
  console.log('\n--- Migrating Flawless Launch (.data/flawless_launches.json) ---');
  const filePath = path.join(DATA_DIR, 'flawless_launches.json');
  if (!fs.existsSync(filePath)) return console.log('flawless_launches.json not found');
  const flmData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const list = Array.isArray(flmData) ? flmData : Object.entries(flmData).map(([proj, d]) => ({ project: proj, ...d }));
  console.log(`Found ${list.length} FLM records to process.`);

  let count = 0;
  for (const f of list) {
    try {
      const exists = await recordExists('Flawless Launch', [['project', '=', f.project]]);
      if (!exists) {
        const metrics = [];
        if (Array.isArray(f.metrics)) {
          for (const m of f.metrics) {
            metrics.push({
              gate: m.gate || '1. PL',
              metric_key: m.key || m.id || m.metric_key || 'm1',
              metric_name: m.name || m.title || m.metric_name || 'Metric',
              target_score: Number(m.target || m.target_score) || 100,
              actual_score: Number(m.actual || m.actual_score) || 0,
              status: m.status || 'Met',
              comments: m.comments || ''
            });
          }
        }
        await erpPost('Flawless Launch', {
          project: f.project,
          project_name: f.project_name || '',
          current_gate: f.current_gate || '1. PL',
          overall_readiness: f.overall_readiness || 0,
          metrics
        });
        count++;
      }
    } catch (e) {
      console.error(`Error migrating FLM for ${f.project}:`, e.message);
    }
  }
  console.log(`Flawless Launch migrated: ${count}/${list.length} new records.`);
}

// 9. Migrate Documents
async function migrateDocuments() {
  console.log('\n--- Migrating PDM Documents (.data/documents.json) ---');
  const filePath = path.join(DATA_DIR, 'documents.json');
  if (!fs.existsSync(filePath)) return console.log('documents.json not found');
  const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Found ${docs.length} documents to process.`);

  let count = 0;
  for (const d of docs) {
    try {
      const exists = await recordExists('PDM Document', [['title', '=', d.title]]);
      if (!exists) {
        await erpPost('PDM Document', {
          title: d.title,
          project: d.project || null,
          document_type: d.document_type || 'General',
          version: d.version || 'v1.0',
          status: d.status || 'Draft',
          file_url: d.file_url || '',
          file_name: d.file_name || '',
          file_size: d.file_size || 0,
          mime_type: d.mime_type || '',
          uploaded_by: d.uploaded_by || '',
          upload_date: d.upload_date || null,
          description: d.description || '',
          notes: d.notes || ''
        });
        count++;
      }
    } catch (e) {
      console.error(`Error migrating document ${d.title}:`, e.message);
    }
  }
  console.log(`PDM Documents migrated: ${count}/${docs.length} new records.`);
}

// 10. Migrate Project Team Custom Fields
async function migrateProjectTeams() {
  console.log('\n--- Migrating Project Teams (.data/project-teams.json) ---');
  const filePath = path.join(DATA_DIR, 'project-teams.json');
  if (!fs.existsSync(filePath)) return console.log('project-teams.json not found');
  const teams = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const [projectId, members] of Object.entries(teams)) {
    try {
      // Fetch current Project from ERPNext
      const projRes = await fetch(`${erpUrl}/api/resource/Project/${encodeURIComponent(projectId)}`, { headers });
      if (!projRes.ok) continue;
      const projData = (await projRes.json()).data;
      const existingUsers = projData.users || [];

      // Merge team member details into Project.users
      const updatedUsers = members.map(m => {
        const match = existingUsers.find(u => (u.user || u.email || '').toLowerCase() === (m.user_email || '').toLowerCase());
        return {
          user: m.user_email,
          email: m.user_email,
          full_name: m.employee_name || (match ? match.full_name : ''),
          custom_role: m.role || '',
          custom_department: m.department || '',
          custom_function: m.function_name || '',
          custom_is_board_member: m.is_board_member ? 1 : 0,
          welcome_email_sent: 1
        };
      });

      await erpPut('Project', projectId, { users: updatedUsers });
      console.log(` - Project ${projectId}: updated ${updatedUsers.length} team members with custom role/dept/function/board flags.`);
    } catch (e) {
      console.warn(` - Could not update team members for ${projectId}:`, e.message);
    }
  }
}

async function runAll() {
  console.log('=====================================================');
  console.log('STARTING PHASE 3: COMPREHENSIVE DATA MIGRATION');
  console.log('=====================================================');

  await migrateGates();
  await migrateStageMover();
  await migrateBaselines();
  await migrateTaskSubmissions();
  await migrateSkipRequests();
  await migrateDesignReviews();
  await migrateScorecards();
  await migrateFlawlessLaunch();
  await migrateDocuments();
  await migrateProjectTeams();

  console.log('\n=====================================================');
  console.log('PHASE 3 DATA MIGRATION COMPLETE');
  console.log('=====================================================');
}

runAll();
