const erpUrl = 'http://80.225.204.210:8083';
const headers = { 
  'Authorization': 'token df5d2dc4b819ad2:25c592ffee48809',
  'Content-Type': 'application/json'
};

const standardPermissions = [
  { role: 'System Manager', read: 1, write: 1, create: 1, delete: 1, report: 1, export: 1, import: 0, share: 1 },
  { role: 'All', read: 1, write: 1, create: 1, delete: 1, report: 1, export: 1, import: 0 }
];

async function checkDocTypeExists(name) {
  try {
    const res = await fetch(`${erpUrl}/api/resource/DocType/${encodeURIComponent(name)}`, { headers });
    return res.ok;
  } catch {
    return false;
  }
}

async function createDocType(docTypeDef) {
  const name = docTypeDef.name;
  console.log(`Checking DocType: "${name}"...`);
  const exists = await checkDocTypeExists(name);
  if (exists) {
    console.log(` - DocType "${name}" already exists. Skipping.`);
    return true;
  }

  const payload = {
    doctype: 'DocType',
    name: name,
    module: 'Projects',
    custom: 1,
    istable: docTypeDef.istable ? 1 : 0,
    allow_import: 1,
    is_submittable: 0,
    naming_rule: docTypeDef.naming_rule || '',
    autoname: docTypeDef.autoname || '',
    fields: docTypeDef.fields.map((f, idx) => ({
      ...f,
      idx: idx + 1
    })),
    permissions: docTypeDef.istable ? [] : (docTypeDef.permissions || standardPermissions)
  };

  try {
    const res = await fetch(`${erpUrl}/api/resource/DocType`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(` - DocType "${name}" created successfully!`);
      return true;
    } else {
      const errText = await res.text();
      console.error(` - Failed to create "${name}":`, res.status, errText);
      return false;
    }
  } catch (e) {
    console.error(` - Error creating "${name}":`, e.message);
    return false;
  }
}

async function runPhase2() {
  console.log('=== PHASE 2: CREATING MISSING ERPNEXT DOCTYPES ===\n');

  // 1. Gate Child Tables
  await createDocType({
    name: 'Gate Criteria Item',
    istable: true,
    fields: [
      { fieldname: 'criteria_id', label: 'Criteria ID', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'name_label', label: 'Criteria Name', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Pending\nIn Progress\nCompleted\nBlocked\nNot Applicable', in_list_view: 1 },
      { fieldname: 'is_required', label: 'Is Required', fieldtype: 'Check', default: '1' },
      { fieldname: 'function', label: 'Function', fieldtype: 'Data', in_list_view: 1 },
      { fieldname: 'responsible_person', label: 'Responsible Person', fieldtype: 'Data' },
      { fieldname: 'responsible_user_id', label: 'Responsible User ID', fieldtype: 'Data' },
      { fieldname: 'related_task', label: 'Related Task', fieldtype: 'Data' },
      { fieldname: 'related_task_id', label: 'Related Task ID', fieldtype: 'Link', options: 'Task' },
      { fieldname: 'document_reference', label: 'Document Reference', fieldtype: 'Data' },
      { fieldname: 'linked_document_name', label: 'Linked Document Name', fieldtype: 'Data' },
      { fieldname: 'completion_percentage', label: 'Completion %', fieldtype: 'Percent', in_list_view: 1 },
      { fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Data' },
      { fieldname: 'approved_at', label: 'Approved At', fieldtype: 'Datetime' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Small Text' }
    ]
  });

  await createDocType({
    name: 'Gate Deliverable Item',
    istable: true,
    fields: [
      { fieldname: 'deliverable_id', label: 'Deliverable ID', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'title', label: 'Title', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Not Started\nIn Progress\nSubmitted\nCompleted\nApproved\nRejected', in_list_view: 1 },
      { fieldname: 'completion_percentage', label: 'Completion %', fieldtype: 'Percent', in_list_view: 1 },
      { fieldname: 'is_required', label: 'Is Required', fieldtype: 'Check', default: '1' },
      { fieldname: 'responsible_person', label: 'Responsible Person', fieldtype: 'Data' },
      { fieldname: 'responsible_user_id', label: 'Responsible User ID', fieldtype: 'Data' },
      { fieldname: 'related_task', label: 'Related Task', fieldtype: 'Data' },
      { fieldname: 'related_task_id', label: 'Related Task ID', fieldtype: 'Link', options: 'Task' },
      { fieldname: 'document_reference', label: 'Document Reference', fieldtype: 'Data' },
      { fieldname: 'linked_document_name', label: 'Linked Document Name', fieldtype: 'Data' },
      { fieldname: 'approved_by', label: 'Approved By', fieldtype: 'Data' },
      { fieldname: 'approved_at', label: 'Approved At', fieldtype: 'Datetime' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Small Text' }
    ]
  });

  await createDocType({
    name: 'Gate Board Review Item',
    istable: true,
    fields: [
      { fieldname: 'board_title', label: 'Board Title', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'function', label: 'Function', fieldtype: 'Data', in_list_view: 1 },
      { fieldname: 'reviewer_name', label: 'Reviewer Name', fieldtype: 'Data', in_list_view: 1 },
      { fieldname: 'delegation', label: 'Delegation', fieldtype: 'Data' },
      { fieldname: 'gate_decision', label: 'Gate Decision', fieldtype: 'Select', options: 'Pass\nPass with Follow up\nEscalate\nPending', in_list_view: 1 },
      { fieldname: 'remarks', label: 'Remarks', fieldtype: 'Small Text' }
    ]
  });

  // 2. Parent DocType: Gate
  await createDocType({
    name: 'Gate',
    istable: false,
    fields: [
      { fieldname: 'gate_name', label: 'Gate Name', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'gate_type', label: 'Gate Type', fieldtype: 'Select', options: '1. PL\n2. VC\n3. TKO\n4. VL\n5. CPA\n6. CT', reqd: 1, in_list_view: 1 },
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'project_name', label: 'Project Name', fieldtype: 'Data' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Not Started\nIn Progress\nReady for Review\nApproved\nBlocked\nCompleted', in_list_view: 1 },
      { fieldname: 'approval_status', label: 'Approval Status', fieldtype: 'Select', options: 'Pending\nApproved\nApproved with Conditions\nRejected', in_list_view: 1 },
      { fieldname: 'planned_date', label: 'Planned Date', fieldtype: 'Date' },
      { fieldname: 'target_date', label: 'Target Date', fieldtype: 'Date' },
      { fieldname: 'actual_date', label: 'Actual Date', fieldtype: 'Date' },
      { fieldname: 'gate_owner', label: 'Gate Owner', fieldtype: 'Data' },
      { fieldname: 'gate_owner_id', label: 'Gate Owner ID', fieldtype: 'Data' },
      { fieldname: 'gate_reviewer', label: 'Gate Reviewer', fieldtype: 'Data' },
      { fieldname: 'reviewer_user_id', label: 'Reviewer User ID', fieldtype: 'Data' },
      { fieldname: 'completion_percentage', label: 'Completion %', fieldtype: 'Percent', in_list_view: 1 },
      { fieldname: 'readiness_percentage', label: 'Readiness %', fieldtype: 'Percent', in_list_view: 1 },
      { fieldname: 'is_locked', label: 'Is Locked', fieldtype: 'Check', default: '0' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Small Text' },
      { fieldname: 'criteria', label: 'Criteria', fieldtype: 'Table', options: 'Gate Criteria Item' },
      { fieldname: 'deliverables', label: 'Deliverables', fieldtype: 'Table', options: 'Gate Deliverable Item' },
      { fieldname: 'board_reviews', label: 'Board Reviews', fieldtype: 'Table', options: 'Gate Board Review Item' }
    ]
  });

  // 3. Stage Movement History
  await createDocType({
    name: 'Stage Movement History',
    istable: false,
    fields: [
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'from_stage', label: 'From Stage', fieldtype: 'Select', options: 'PL\nVC\nTKO\nVL\nCPA\nCT', reqd: 1, in_list_view: 1 },
      { fieldname: 'to_stage', label: 'To Stage', fieldtype: 'Select', options: 'PL\nVC\nTKO\nVL\nCPA\nCT', reqd: 1, in_list_view: 1 },
      { fieldname: 'moved_at', label: 'Moved At', fieldtype: 'Datetime', reqd: 1, in_list_view: 1 },
      { fieldname: 'moved_by', label: 'Moved By', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'trigger_type', label: 'Trigger Type', fieldtype: 'Select', options: 'PD_APPROVAL\nPMO_OVERRIDE\nPMO_ROLLBACK', reqd: 1, in_list_view: 1 },
      { fieldname: 'pd_decision', label: 'PD Decision', fieldtype: 'Select', options: 'Pass\nPass with Follow up\nEscalate' },
      { fieldname: 'reason', label: 'Reason / Justification', fieldtype: 'Small Text' },
      { fieldname: 'gate_name', label: 'Gate Name', fieldtype: 'Data' }
    ]
  });

  // 4. Baseline
  await createDocType({
    name: 'Baseline Task Item',
    istable: true,
    fields: [
      { fieldname: 'task_id', label: 'Task ID', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'subject', label: 'Subject', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'start_date', label: 'Start Date', fieldtype: 'Datetime', in_list_view: 1 },
      { fieldname: 'end_date', label: 'End Date', fieldtype: 'Datetime', in_list_view: 1 },
      { fieldname: 'duration_days', label: 'Duration (Days)', fieldtype: 'Int' },
      { fieldname: 'progress', label: 'Progress %', fieldtype: 'Percent' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'is_milestone', label: 'Is Milestone', fieldtype: 'Check' },
      { fieldname: 'wbs', label: 'WBS', fieldtype: 'Data' }
    ]
  });

  await createDocType({
    name: 'Project Baseline',
    istable: false,
    fields: [
      { fieldname: 'baseline_name', label: 'Baseline Name', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'baseline_number', label: 'Baseline Number', fieldtype: 'Int', reqd: 1, in_list_view: 1 },
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'project_name', label: 'Project Name', fieldtype: 'Data' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Active\nArchived', default: 'Active', in_list_view: 1 },
      { fieldname: 'created_by_user', label: 'Created By', fieldtype: 'Data' },
      { fieldname: 'created_at_date', label: 'Created At', fieldtype: 'Datetime' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Small Text' },
      { fieldname: 'tasks', label: 'Tasks Snapshot', fieldtype: 'Table', options: 'Baseline Task Item' }
    ]
  });

  // 5. Task Submissions & Skip Requests
  await createDocType({
    name: 'Task Submission',
    istable: false,
    fields: [
      { fieldname: 'task', label: 'Task', fieldtype: 'Link', options: 'Task', reqd: 1, in_list_view: 1 },
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'submitted_by', label: 'Submitted By (Email)', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'submitted_by_name', label: 'Submitted By Name', fieldtype: 'Data' },
      { fieldname: 'submitted_at', label: 'Submitted At', fieldtype: 'Datetime', reqd: 1, in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Submitted\nApproved\nRejected', default: 'Submitted', in_list_view: 1 },
      { fieldname: 'reviewed_by', label: 'Reviewed By', fieldtype: 'Data' },
      { fieldname: 'reviewed_at', label: 'Reviewed At', fieldtype: 'Datetime' },
      { fieldname: 'file_url', label: 'File URL', fieldtype: 'Data' },
      { fieldname: 'file_name', label: 'File Name', fieldtype: 'Data' },
      { fieldname: 'notes', label: 'Submission Notes', fieldtype: 'Small Text' },
      { fieldname: 'feedback', label: 'Review Feedback', fieldtype: 'Small Text' }
    ]
  });

  await createDocType({
    name: 'Task Skip Request',
    istable: false,
    fields: [
      { fieldname: 'task', label: 'Task', fieldtype: 'Link', options: 'Task', reqd: 1, in_list_view: 1 },
      { fieldname: 'task_subject', label: 'Task Subject', fieldtype: 'Data', in_list_view: 1 },
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'requested_by', label: 'Requested By', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'requested_by_name', label: 'Requested By Name', fieldtype: 'Data' },
      { fieldname: 'requested_at', label: 'Requested At', fieldtype: 'Datetime', reqd: 1, in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'PENDING\nAPPROVED\nREJECTED', default: 'PENDING', in_list_view: 1 },
      { fieldname: 'skip_reason', label: 'Skip Reason', fieldtype: 'Small Text', reqd: 1 },
      { fieldname: 'additional_comment', label: 'Additional Comment', fieldtype: 'Small Text' },
      { fieldname: 'reviewed_by', label: 'Reviewed By', fieldtype: 'Data' },
      { fieldname: 'reviewed_by_name', label: 'Reviewed By Name', fieldtype: 'Data' },
      { fieldname: 'reviewed_at', label: 'Reviewed At', fieldtype: 'Datetime' },
      { fieldname: 'rejection_reason', label: 'Rejection Reason', fieldtype: 'Small Text' }
    ]
  });

  // 6. Design Reviews
  await createDocType({
    name: 'Design Review Finding Item',
    istable: true,
    fields: [
      { fieldname: 'finding_description', label: 'Finding Description', fieldtype: 'Small Text', reqd: 1, in_list_view: 1 },
      { fieldname: 'severity', label: 'Severity', fieldtype: 'Select', options: 'Critical\nMajor\nMinor\nObservation', default: 'Major', in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Open\nIn Progress\nResolved\nClosed', default: 'Open', in_list_view: 1 },
      { fieldname: 'assigned_to', label: 'Assigned To', fieldtype: 'Data' },
      { fieldname: 'due_date', label: 'Due Date', fieldtype: 'Date' },
      { fieldname: 'resolution_notes', label: 'Resolution Notes', fieldtype: 'Small Text' }
    ]
  });

  await createDocType({
    name: 'Design Review',
    istable: false,
    fields: [
      { fieldname: 'title', label: 'Title', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'project_name', label: 'Project Name', fieldtype: 'Data' },
      { fieldname: 'review_type', label: 'Review Type', fieldtype: 'Select', options: 'Concept\nPreliminary\nCritical\nFinal\nPost-Launch', in_list_view: 1 },
      { fieldname: 'phase', label: 'Phase', fieldtype: 'Data' },
      { fieldname: 'planned_date', label: 'Planned Date', fieldtype: 'Date' },
      { fieldname: 'actual_date', label: 'Actual Date', fieldtype: 'Date' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Planned\nIn Progress\nCompleted\nCancelled', default: 'Planned', in_list_view: 1 },
      { fieldname: 'approval_status', label: 'Approval Status', fieldtype: 'Select', options: 'Pending\nApproved\nApproved with Conditions\nRejected', default: 'Pending', in_list_view: 1 },
      { fieldname: 'lead_reviewer', label: 'Lead Reviewer', fieldtype: 'Data' },
      { fieldname: 'lead_reviewer_name', label: 'Lead Reviewer Name', fieldtype: 'Data' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Small Text' },
      { fieldname: 'findings', label: 'Findings', fieldtype: 'Table', options: 'Design Review Finding Item' }
    ]
  });

  // 7. Imperative Scorecard
  await createDocType({
    name: 'Scorecard Metric Item',
    istable: true,
    fields: [
      { fieldname: 'category', label: 'Category', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'metric_name', label: 'Metric Name', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'unit', label: 'Unit', fieldtype: 'Data' },
      { fieldname: 'target_value', label: 'Target Value', fieldtype: 'Float', in_list_view: 1 },
      { fieldname: 'actual_value', label: 'Actual Value', fieldtype: 'Float', in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Green\nYellow\nRed\nNot Applicable', in_list_view: 1 },
      { fieldname: 'weight', label: 'Weight', fieldtype: 'Float' },
      { fieldname: 'comments', label: 'Comments', fieldtype: 'Small Text' }
    ]
  });

  await createDocType({
    name: 'Imperative Scorecard',
    istable: false,
    fields: [
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'project_name', label: 'Project Name', fieldtype: 'Data' },
      { fieldname: 'scorecard_version', label: 'Version', fieldtype: 'Data', default: 'v1.0' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Draft\nPublished\nArchived', default: 'Published', in_list_view: 1 },
      { fieldname: 'evaluated_at', label: 'Evaluated At', fieldtype: 'Datetime' },
      { fieldname: 'evaluated_by', label: 'Evaluated By', fieldtype: 'Data' },
      { fieldname: 'overall_score', label: 'Overall Score %', fieldtype: 'Percent', in_list_view: 1 },
      { fieldname: 'metrics', label: 'Metrics', fieldtype: 'Table', options: 'Scorecard Metric Item' }
    ]
  });

  // 8. Flawless Launch
  await createDocType({
    name: 'Flawless Launch Metric Item',
    istable: true,
    fields: [
      { fieldname: 'gate', label: 'Gate', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'metric_key', label: 'Metric Key', fieldtype: 'Data', reqd: 1 },
      { fieldname: 'metric_name', label: 'Metric Name', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'target_score', label: 'Target Score', fieldtype: 'Float', in_list_view: 1 },
      { fieldname: 'actual_score', label: 'Actual Score', fieldtype: 'Float', in_list_view: 1 },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Met\nAt Risk\nOff Track', in_list_view: 1 },
      { fieldname: 'comments', label: 'Comments', fieldtype: 'Small Text' }
    ]
  });

  await createDocType({
    name: 'Flawless Launch',
    istable: false,
    fields: [
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', reqd: 1, in_list_view: 1 },
      { fieldname: 'project_name', label: 'Project Name', fieldtype: 'Data' },
      { fieldname: 'current_gate', label: 'Current Gate', fieldtype: 'Data', in_list_view: 1 },
      { fieldname: 'overall_readiness', label: 'Overall Readiness %', fieldtype: 'Percent', in_list_view: 1 },
      { fieldname: 'metrics', label: 'Metrics', fieldtype: 'Table', options: 'Flawless Launch Metric Item' }
    ]
  });

  // 9. Document Registry
  await createDocType({
    name: 'PDM Document',
    istable: false,
    fields: [
      { fieldname: 'title', label: 'Title', fieldtype: 'Data', reqd: 1, in_list_view: 1 },
      { fieldname: 'project', label: 'Project', fieldtype: 'Link', options: 'Project', in_list_view: 1 },
      { fieldname: 'document_type', label: 'Document Type', fieldtype: 'Select', options: 'Engineering\nQuality\nAPQP\nTesting\nDesign\nManufacturing\nGeneral', in_list_view: 1 },
      { fieldname: 'version', label: 'Version', fieldtype: 'Data', default: 'v1.0' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Draft\nUnder Review\nApproved\nRejected\nObsolete', default: 'Draft', in_list_view: 1 },
      { fieldname: 'file_url', label: 'File URL', fieldtype: 'Data' },
      { fieldname: 'file_name', label: 'File Name', fieldtype: 'Data' },
      { fieldname: 'file_size', label: 'File Size (Bytes)', fieldtype: 'Int' },
      { fieldname: 'mime_type', label: 'MIME Type', fieldtype: 'Data' },
      { fieldname: 'uploaded_by', label: 'Uploaded By', fieldtype: 'Data' },
      { fieldname: 'upload_date', label: 'Upload Date', fieldtype: 'Date' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Small Text' },
      { fieldname: 'notes', label: 'Notes', fieldtype: 'Small Text' }
    ]
  });

  console.log('\n=== PHASE 2 COMPLETED ===');
}

runPhase2();
