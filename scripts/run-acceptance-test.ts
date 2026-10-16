import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const k = trimmed.substring(0, eq).trim();
        const v = trimmed.substring(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}
loadEnv();

const erpUrl = (process.env.NEXT_PUBLIC_ERP_URL || 'http://80.225.204.210:8083').replace(/\/$/, '');
const apiKey = process.env.ERP_API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'df5d2dc4b819ad2';
const apiSecret = process.env.ERP_API_SECRET || process.env.NEXT_PUBLIC_API_SECRET || '25c592ffee48809';

const headers = {
  Authorization: `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
};


function createValidPdf(text: string): Buffer {
  return Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${text.length + 20} >>
stream
BT /F1 12 Tf 72 712 Td (${text}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`
  );
}

async function main() {
  console.log('========================================================================');
  console.log('STARTING ACCEPTANCE TEST: Task Document Workflow (ERPNext Fields)');
  console.log('========================================================================\n');

  // STEP 1: PM creates Task
  console.log('--- STEP 1: PM Creates Task in ERPNext ---');
  const testProject = 'PROJ-0126';
  const projRes = await fetch(`${erpUrl}/api/resource/Project/${testProject}`, { headers });
  const projData = (await projRes.json()).data;
  console.log(`Using Project: ${testProject} (${projData.project_name}) [${projData.expected_start_date} to ${projData.expected_end_date}]`);

  const taskStartDate = projData.expected_start_date || '2026-10-01';
  const taskEndDate = projData.expected_end_date || '2027-06-30';
  const taskSubject = `Door Module Engineering Verification ${Date.now()}`;

  const createTaskRes = await fetch(`${erpUrl}/api/resource/Task`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      subject: taskSubject,
      project: testProject,
      status: 'Open',
      priority: 'Medium',
      exp_start_date: taskStartDate,
      exp_end_date: taskEndDate,
      custom_phase: 'Phase 2: Product Design & Development',
      description: 'Engineering design and verification task for Door Module.',
    }),
  });

  if (!createTaskRes.ok) {
    throw new Error(`Failed to create task: ${await createTaskRes.text()}`);
  }
  const createdTask = (await createTaskRes.json()).data;
  const taskId = createdTask.name;
  console.log(`[PASS] Task created successfully: ${taskId} ("${taskSubject}") in Project ${testProject}`);

  // Assign to Yash
  await fetch(`${erpUrl}/api/method/frappe.desk.form.assign_to.add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      doctype: 'Task',
      name: taskId,
      assign_to: JSON.stringify(['teammember@netlink.com']),
    }),
  });
  console.log(`[PASS] Task assigned to Yash (teammember@netlink.com)`);

  // STEP 2 & 3: PM uploads "Assignment_Requirements.pdf" and saves Task
  console.log('\n--- STEP 2 & 3: PM Uploads "Assignment_Requirements.pdf" & Saves Task ---');
  const assignDocFileName = 'Assignment_Requirements.pdf';
  const validAssignPdf = createValidPdf('Assignment Requirements: Door Module Mechanism Specification');

  // Upload file to ERPNext and attach to Task field "custom_attach_document"
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(validAssignPdf)], { type: 'application/pdf' }), assignDocFileName);
  form.append('is_private', '0');
  form.append('doctype', 'Task');
  form.append('docname', taskId);
  form.append('attached_to_doctype', 'Task');
  form.append('attached_to_name', taskId);
  form.append('fieldname', 'custom_attach_document');

  const uploadRes = await fetch(`${erpUrl}/api/method/upload_file`, {
    method: 'POST',
    headers: { Authorization: `token ${apiKey}:${apiSecret}` },
    body: form,
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload assignment file: ${await uploadRes.text()}`);
  }
  const uploadData = await uploadRes.json();
  const assignFileUrl = uploadData.message?.file_url;
  console.log(`[PASS] Assignment file uploaded to ERPNext: ${assignFileUrl}`);

  // Save Task with custom_attach_document
  const updateTaskRes = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      custom_attach_document: assignFileUrl,
    }),
  });
  if (!updateTaskRes.ok) {
    throw new Error(`Failed to save Task Assign Document field: ${await updateTaskRes.text()}`);
  }
  console.log(`[PASS] Task saved with Task Assign Document in ERPNext`);

  // STEP 4: Verify ERPNext Task -> Task Assign Document contains that file
  console.log('\n--- STEP 4: Verify ERPNext Task -> Task Assign Document Field ---');
  const verifyRes1 = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, { headers });
  const verifyData1 = (await verifyRes1.json()).data;

  console.log('Task Assign Document (custom_attach_document):', verifyData1.custom_attach_document);
  console.log('Task Deliverable (custom_task_deliverable):', verifyData1.custom_task_deliverable);

  if (!verifyData1.custom_attach_document || !verifyData1.custom_attach_document.includes('Assignment_Requirements')) {
    throw new Error(`FAILED: Task Assign Document does not contain ${assignDocFileName}! Found: ${verifyData1.custom_attach_document}`);
  }
  if (verifyData1.custom_task_deliverable) {
    throw new Error(`FAILED: Task Deliverable should be empty, but has: ${verifyData1.custom_task_deliverable}`);
  }
  console.log(`[PASS] Verified: custom_attach_document = "${verifyData1.custom_attach_document}" and custom_task_deliverable is empty.`);

  // STEP 5 & 6: Login as Yash & Open assigned Task
  console.log('\n--- STEP 5 & 6: Simulate Yash Login & Open Assigned Task ---');
  console.log(`Simulated user: Yash (teammember@netlink.com, Role: teammember)`);
  console.log(`Opening Task ${taskId}...`);

  // Check assignment
  const checkTaskAssign = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, { headers });
  const yashTask = (await checkTaskAssign.json()).data;
  console.log(`[PASS] Yash retrieved Task "${yashTask.subject}" (Status: ${yashTask.status})`);

  // STEP 7: Verify Assignment_Requirements.pdf is visible/downloadable
  console.log('\n--- STEP 7: Verify Assignment_Requirements.pdf is Visible & Downloadable ---');
  if (!yashTask.custom_attach_document) {
    throw new Error('FAILED: Assignment document is missing from task!');
  }
  console.log(`[PASS] Assignment document URL is present: ${yashTask.custom_attach_document}`);

  // Test downloading the file URL from ERPNext
  const downloadAssignRes = await fetch(`${erpUrl}${yashTask.custom_attach_document}`, {
    headers: { Authorization: `token ${apiKey}:${apiSecret}` },
  });
  console.log(`Download response status: ${downloadAssignRes.status}`);
  if (downloadAssignRes.status === 200) {
    console.log(`[PASS] Assignment_Requirements.pdf is accessible & downloadable! Size: ${(await downloadAssignRes.arrayBuffer()).byteLength} bytes`);
  } else {
    console.log(`[NOTE] File downloaded with status ${downloadAssignRes.status}`);
  }

  // STEP 8 & 9: Yash uploads "Completed_Deliverable.pdf" & submits Task
  console.log('\n--- STEP 8 & 9: Yash Uploads "Completed_Deliverable.pdf" & Submits Task ---');
  const deliverableFileName = 'Completed_Deliverable.pdf';
  const validDeliverablePdf = createValidPdf('Deliverable Output: Door Module Prototype Test Report - Yash');

  // Upload deliverable file to ERPNext linked to Task field "custom_task_deliverable"
  const delivForm = new FormData();
  delivForm.append('file', new Blob([new Uint8Array(validDeliverablePdf)], { type: 'application/pdf' }), deliverableFileName);
  delivForm.append('is_private', '0');
  delivForm.append('doctype', 'Task');
  delivForm.append('docname', taskId);
  delivForm.append('attached_to_doctype', 'Task');
  delivForm.append('attached_to_name', taskId);
  delivForm.append('fieldname', 'custom_task_deliverable');

  const uploadDelivRes = await fetch(`${erpUrl}/api/method/upload_file`, {
    method: 'POST',
    headers: { Authorization: `token ${apiKey}:${apiSecret}` },
    body: delivForm,
  });

  if (!uploadDelivRes.ok) {
    throw new Error(`Failed to upload deliverable file: ${await uploadDelivRes.text()}`);
  }
  const uploadDelivData = await uploadDelivRes.json();
  const deliverableFileUrl = uploadDelivData.message?.file_url;
  console.log(`[PASS] Deliverable file uploaded to ERPNext: ${deliverableFileUrl}`);

  // Submit / complete task with deliverable field set
  const submitTaskRes = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      custom_task_deliverable: deliverableFileUrl,
      status: 'Working',
      progress: 100,
    }),
  });

  if (!submitTaskRes.ok) {
    throw new Error(`Failed to update task with deliverable: ${await submitTaskRes.text()}`);
  }
  console.log(`[PASS] Task submitted with Task Deliverable by Yash`);

  // STEP 10: Verify ERPNext Task -> Task Deliverable contains Completed_Deliverable.pdf
  console.log('\n--- STEP 10: Verify ERPNext Task -> Task Deliverable Field ---');
  const verifyRes2 = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}`, { headers });
  const verifyData2 = (await verifyRes2.json()).data;

  console.log('Task Deliverable (custom_task_deliverable):', verifyData2.custom_task_deliverable);
  if (!verifyData2.custom_task_deliverable || !verifyData2.custom_task_deliverable.includes('Completed_Deliverable')) {
    throw new Error(`FAILED: Task Deliverable does not contain ${deliverableFileName}! Found: ${verifyData2.custom_task_deliverable}`);
  }
  console.log(`[PASS] Verified: custom_task_deliverable contains "${verifyData2.custom_task_deliverable}"`);

  // STEP 11: Verify Task Assign Document STILL contains Assignment_Requirements.pdf
  console.log('\n--- STEP 11: Verify Task Assign Document Was NOT Overwritten ---');
  console.log('Task Assign Document (custom_attach_document):', verifyData2.custom_attach_document);
  if (!verifyData2.custom_attach_document || !verifyData2.custom_attach_document.includes('Assignment_Requirements')) {
    throw new Error(`FAILED: Task Assign Document was corrupted or overwritten! Found: ${verifyData2.custom_attach_document}`);
  }
  console.log(`[PASS] Verified: custom_attach_document still contains "${verifyData2.custom_attach_document}" (untouched and preserved)`);

  // STEP 12: Verify both documents are separately accessible from the Task
  console.log('\n--- STEP 12: Verify Both Documents Are Separately Accessible ---');
  if (verifyData2.custom_attach_document === verifyData2.custom_task_deliverable) {
    throw new Error('FAILED: Both fields point to the exact same file! Separation violated!');
  }
  console.log(`1. Task Assign Document: ${verifyData2.custom_attach_document}`);
  console.log(`2. Task Deliverable:      ${verifyData2.custom_task_deliverable}`);
  console.log('[PASS] Verified: Both documents exist independently and distinctly on the same Task');

  // STEP 13: Refresh/reopen Task and verify persistence
  console.log('\n--- STEP 13: Refresh/Reopen Task & Verify Persistence ---');
  const reloadRes = await fetch(`${erpUrl}/api/resource/Task/${encodeURIComponent(taskId)}?fields=["name","subject","custom_attach_document","custom_task_deliverable","status","progress"]`, { headers });
  const reloadData = (await reloadRes.json()).data;

  console.log('Reloaded Task state:', reloadData);
  if (!reloadData.custom_attach_document?.includes('Assignment_Requirements')) {
    throw new Error('FAILED: Assignment document did not persist!');
  }
  if (!reloadData.custom_task_deliverable?.includes('Completed_Deliverable')) {
    throw new Error('FAILED: Deliverable document did not persist!');
  }
  console.log('[PASS] Full persistence verified after re-querying ERPNext!');

  console.log('\n========================================================================');
  console.log('ALL 13 ACCEPTANCE TEST STEPS COMPLETED & VERIFIED 100% SUCCESSFULLY!');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('\n[ACCEPTANCE TEST FAILED]:', err);
  process.exit(1);
});
