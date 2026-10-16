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

async function getValidERPProjects() {
  const res = await fetch(`${erpUrl}/api/resource/Project?limit_page_length=1000&fields=["name","project_name"]`, { headers });
  const data = await res.json();
  const map = new Map();
  for (const p of data.data) {
    map.set(p.name, p.project_name);
  }
  return map;
}

// 1. GATES
async function migrateGates(validProjects) {
  console.log('\n--- 1. Migrating Gates ---');
  const filePath = path.join(DATA_DIR, 'gates.json');
  if (!fs.existsSync(filePath)) return;
  const gates = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let success = 0;
  let skipped = 0;
  for (const g of gates) {
    if (!validProjects.has(g.project)) {
      skipped++;
      continue;
    }

    try {
      const exists = await recordExists('Gate', [
        ['project', '=', g.project],
        ['gate_type', '=', g.gate_type]
      ]);
      if (exists) {
        success++;
        continue;
      }

      const payload = {
        gate_name: g.gate_name || `${g.gate_type} Gate`,
        gate_type: g.gate_type,
        project: g.project,
        project_name: validProjects.get(g.project) || g.project_name || '',
        status: g.status || 'Not Started',
        approval_status: g.approval_status || 'Pending',
        planned_date: g.planned_date || null,
        target_date: g.target_date || null,
        actual_date: g.actual_date || null,
        gate_owner: g.gate_owner || '',
        gate_owner_id: g.gate_owner_id || '',
        gate_reviewer: g.gate_reviewer || '',
        reviewer_user_id: g.reviewer_user_id || '',
        completion_percentage: Number(g.completion_percentage) || 0,
        readiness_percentage: Number(g.readiness_percentage) || 0,
        gate_locked: g.is_locked ? 1 : 0,
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
          completion_percentage: Number(c.completion_percentage) || 0,
          approved_by: c.approved_by || '',
          approved_at: c.approved_at || null,
          description: c.description || ''
        })),
        deliverables: (g.deliverables || []).map((d, i) => ({
          deliverable_id: d.id || `DEL-${i + 1}`,
          title: d.name || d.title || 'Deliverable',
          status: d.status || 'Not Started',
          completion_percentage: Number(d.completion_percentage) || 0,
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
          board_title: b.board_title || 'Reviewer',
          function: b.function || '',
          reviewer_name: b.name || 'Unassigned',
          delegation: b.delegation || 'Not Applicable',
          gate_decision: b.gate_decision || 'Pending',
          remarks: b.remarks || ''
        }))
      };

      await erpPost('Gate', payload);
      success++;
    } catch (e) {
      console.error(`Error migrating gate ${g.project}-${g.gate_type}:`, e.message);
    }
  }
  console.log(`Gates migrated/verified: ${success} (Skipped ${skipped} referencing non-existent projects)`);
}

// 2. BASELINES
async function migrateBaselines(validProjects) {
  console.log('\n--- 2. Migrating Baselines ---');
  const filePath = path.join(DATA_DIR, 'baselines.json');
  if (!fs.existsSync(filePath)) return;
  const baselines = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let count = 0;
  for (const b of baselines) {
    if (!validProjects.has(b.project_id)) continue;
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
        baseline_name: b.baseline_name || `Baseline ${b.baseline_number}`,
        baseline_number: b.baseline_number,
        project: b.project_id,
        project_name: validProjects.get(b.project_id) || b.project_name || '',
        status: b.status || 'Active',
        created_by_user: b.created_by || 'Administrator',
        created_at_date: b.created_at ? b.created_at.replace('T', ' ').replace('Z', '').split('.')[0] : null,
        description: b.description || '',
        tasks: (b.tasks || []).map(t => ({
          task_id: t.task_id || t.id || 'TASK',
          subject: t.task_subject || t.subject || t.title || 'Untitled Task',
          start_date: t.planned_start_date || t.start_date || t.exp_start_date || null,
          end_date: t.planned_end_date || t.end_date || t.exp_end_date || null,
          duration_days: Number(t.duration) || 0,
          progress: Number(t.progress) || 0,
          status: t.status || 'Open',
          is_milestone: (t.milestone || t.is_milestone) ? 1 : 0,
          wbs: t.wbs || ''
        }))
      };

      await erpPost('Project Baseline', payload);
      count++;
    } catch (e) {
      console.error(`Error migrating baseline ${b.id}:`, e.message);
    }
  }
  console.log(`Baselines migrated/verified: ${count}/${baselines.length}`);
}

// 3. DESIGN REVIEWS
async function migrateDesignReviews(validProjects) {
  console.log('\n--- 3. Migrating Design Reviews ---');
  const filePath = path.join(DATA_DIR, 'design_reviews.json');
  if (!fs.existsSync(filePath)) return;
  const reviews = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let count = 0;
  let skipped = 0;
  for (const r of reviews) {
    const projId = r.project_id || r.project;
    if (!validProjects.has(projId)) {
      skipped++;
      continue;
    }

    try {
      const exists = await recordExists('Design Review', [
        ['project', '=', projId],
        ['title', '=', r.title]
      ]);
      if (exists) {
        count++;
        continue;
      }

      const payload = {
        title: r.title,
        project: projId,
        project_name: validProjects.get(projId) || r.project_name || '',
        review_type: r.review_type || 'Preliminary',
        phase: r.phase || '',
        planned_date: r.planned_date || r.review_date || null,
        actual_date: r.actual_date || r.review_date || null,
        status: r.status || 'Planned',
        approval_status: r.approval_status || 'Pending',
        lead_reviewer: r.reviewer || r.lead_reviewer || '',
        lead_reviewer_id: r.reviewer_id || '',
        description: r.description || '',
        notes: r.notes || '',
        findings: (r.findings || []).map(f => ({
          finding_description: f.description || f.finding_description || f.title || 'Finding description',
          severity: f.severity || 'Medium',
          status: f.status || 'Open',
          assigned_to: f.assigned_to || '',
          due_date: f.due_date || null,
          resolution_notes: f.resolution_notes || f.recommendation || ''
        }))
      };

      await erpPost('Design Review', payload);
      count++;
    } catch (e) {
      console.error(`Error migrating design review ${r.title}:`, e.message);
    }
  }
  console.log(`Design Reviews migrated/verified: ${count} (Skipped ${skipped} non-existent projects)`);
}

// 4. DOCUMENTS
async function migrateDocuments(validProjects) {
  console.log('\n--- 4. Migrating PDM Documents ---');
  const filePath = path.join(DATA_DIR, 'documents.json');
  if (!fs.existsSync(filePath)) return;
  const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let count = 0;
  for (const d of docs) {
    const proj = (d.project && validProjects.has(d.project)) ? d.project : null;
    try {
      const exists = await recordExists('PDM Document', [['title', '=', d.title]]);
      if (exists) {
        count++;
        continue;
      }

      await erpPost('PDM Document', {
        title: d.title,
        project: proj,
        document_type: d.document_type || 'General',
        version: d.version || 'v1.0',
        status: d.status || 'Draft',
        file_url: d.file_url || '',
        file_name: d.file_name || '',
        file_size: Number(d.file_size) || 0,
        mime_type: d.mime_type || '',
        uploaded_by: d.uploaded_by || '',
        upload_date: d.upload_date ? d.upload_date.replace('T', ' ').replace('Z', '').split('.')[0] : null,
        description: d.description || '',
        notes: d.notes || ''
      });
      count++;
    } catch (e) {
      console.error(`Error migrating document ${d.title}:`, e.message);
    }
  }
  console.log(`PDM Documents migrated/verified: ${count}/${docs.length}`);
}

// 5. RISK ASSESSMENTS
async function migrateRiskAssessments(validProjects) {
  console.log('\n--- 5. Migrating Risk Assessments ---');
  const filePath = path.join(DATA_DIR, 'risk_assessments.json');
  if (!fs.existsSync(filePath)) return;
  const risks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const list = Array.isArray(risks) ? risks : Object.values(risks);

  let count = 0;
  for (const r of list) {
    const projId = r.project_id || r.project;
    if (!validProjects.has(projId)) continue;

    try {
      const exists = await recordExists('Risk Assesment', [['project', '=', projId]]);
      if (exists) {
        count++;
        continue;
      }

      // Flatten items from all areas
      const risk_items = [];
      let highCount = 0;
      if (Array.isArray(r.areas)) {
        for (const area of r.areas) {
          const areaName = (area.name || area.id || '').toUpperCase();
          let erpArea = 'PROJECT MANAGEMENT';
          if (areaName.includes('DESIGN') && areaName.includes('PROCESS')) erpArea = 'PROCESS/SYSTEM DESIGN';
          else if (areaName.includes('DESIGN')) erpArea = 'PRODUCT/SYSTEM DESIGN';
          else if (areaName.includes('TEST') || areaName.includes('VALIDATION')) erpArea = 'TEST/VALIDATION';
          else if (areaName.includes('SOURCING') || areaName.includes('PURCHASING')) erpArea = 'SOURCING';
          else if (areaName.includes('MANUFACTURING') || areaName.includes('OPERATIONS')) erpArea = 'MANUFACTURING';

          if (Array.isArray(area.items)) {
            for (const item of area.items) {
              let rating = item.rating || 'OK';
              if (rating === 'High' || rating === 'HIGH' || rating === 'H') {
                rating = 'H';
                highCount++;
              } else if (rating === 'Medium' || rating === 'Low' || rating === 'L') {
                rating = 'L';
              } else {
                rating = 'OK';
              }

              risk_items.push({
                risk_area: erpArea,
                category: item.category || '',
                risk_item: item.question || item.risk_item || 'Item',
                response: item.selected_value || item.response || '',
                risk_rating: rating,
                risk_description: item.mitigation_plan || item.risk_description || '',
                risk_resolution_plan: item.mitigation_plan || '',
                target_completion_date: item.target_date || null
              });
            }
          }
        }
      }

      await erpPost('Risk Assesment', {
        project: projId,
        project_name: validProjects.get(projId) || r.project_name || '',
        pdp_phase: 'PL',
        number_of_items_rated_as_high: highCount,
        escalation_recommendation: highCount > 0 ? 'Y' : 'N',
        risk_items
      });
      count++;
    } catch (e) {
      console.error(`Error migrating risk assessment for ${projId}:`, e.message);
    }
  }
  console.log(`Risk Assessments migrated/verified: ${count} projects`);
}

async function run() {
  const validProjects = await getValidERPProjects();
  console.log(`Loaded ${validProjects.size} valid projects from ERPNext.`);

  await migrateGates(validProjects);
  await migrateBaselines(validProjects);
  await migrateDesignReviews(validProjects);
  await migrateDocuments(validProjects);
  await migrateRiskAssessments(validProjects);

  console.log('\n=== COMPREHENSIVE MIGRATION COMPLETE ===');
}

run();
