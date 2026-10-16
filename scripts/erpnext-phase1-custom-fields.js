const erpUrl = 'http://80.225.204.210:8083';
const headers = { 
  'Authorization': 'token df5d2dc4b819ad2:25c592ffee48809',
  'Content-Type': 'application/json'
};

async function createCustomField(fieldDef) {
  const name = `${fieldDef.dt}-${fieldDef.fieldname}`;
  console.log(`Checking Custom Field: ${name}...`);
  try {
    const checkRes = await fetch(`${erpUrl}/api/resource/Custom%20Field/${encodeURIComponent(name)}`, { headers });
    if (checkRes.ok) {
      console.log(` - Already exists: ${name}`);
      return;
    }

    const payload = {
      doctype: 'Custom Field',
      dt: fieldDef.dt,
      label: fieldDef.label,
      fieldname: fieldDef.fieldname,
      fieldtype: fieldDef.fieldtype,
      options: fieldDef.options || '',
      insert_after: fieldDef.insert_after || '',
      reqd: fieldDef.reqd || 0,
      default: fieldDef.default || '',
      in_list_view: fieldDef.in_list_view || 0,
    };

    const res = await fetch(`${erpUrl}/api/resource/Custom%20Field`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(` - Created successfully: ${name}`);
    } else {
      console.error(` - Failed to create ${name}:`, res.status, await res.text());
    }
  } catch (e) {
    console.error(` - Error for ${name}:`, e.message);
  }
}

async function enhanceRiskAssesmentDocType() {
  console.log('\nChecking Risk Assesment DocType enhancement...');
  try {
    const res = await fetch(`${erpUrl}/api/resource/DocType/Risk%20Assesment`, { headers });
    if (!res.ok) {
      console.error('Could not fetch Risk Assesment DocType:', res.status);
      return;
    }
    const d = await res.json();
    const doc = d.data;
    const fields = doc.fields || [];
    const hasItems = fields.some(f => f.fieldname === 'risk_items');
    if (hasItems) {
      console.log(' - Risk Assesment already has risk_items field.');
      return;
    }

    fields.push({
      label: 'Risk Items',
      fieldname: 'risk_items',
      fieldtype: 'Table',
      options: 'PDM Risk Assessment Item',
      reqd: 0,
      in_list_view: 0
    });

    const updateRes = await fetch(`${erpUrl}/api/resource/DocType/Risk%20Assesment`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ fields })
    });

    if (updateRes.ok) {
      console.log(' - Risk Assesment updated with risk_items table successfully!');
    } else {
      console.error(' - Failed to update Risk Assesment:', updateRes.status, await updateRes.text());
    }
  } catch (e) {
    console.error(' - Error enhancing Risk Assesment:', e.message);
  }
}

async function runPhase1() {
  console.log('=== PHASE 1: CUSTOM FIELDS & SCHEMA ENHANCEMENT ===\n');

  const customFields = [
    { dt: 'Project User', label: 'Role', fieldname: 'custom_role', fieldtype: 'Data', in_list_view: 1 },
    { dt: 'Project User', label: 'Department', fieldname: 'custom_department', fieldtype: 'Data', in_list_view: 1 },
    { dt: 'Project User', label: 'Function', fieldname: 'custom_function', fieldtype: 'Data', in_list_view: 1 },
    { dt: 'Project User', label: 'Is Board Member', fieldname: 'custom_is_board_member', fieldtype: 'Check', in_list_view: 1 },
    { dt: 'Project', label: 'PDP Stage', fieldname: 'custom_stage', fieldtype: 'Select', options: 'PL\nVC\nTKO\nVL\nCPA\nCT', in_list_view: 1 },
    { dt: 'Issue', label: 'Linked Task', fieldname: 'custom_task', fieldtype: 'Link', options: 'Task', in_list_view: 1 },
  ];

  for (const cf of customFields) {
    await createCustomField(cf);
  }

  await enhanceRiskAssesmentDocType();
  console.log('\n=== PHASE 1 COMPLETED ===');
}

runPhase1();
