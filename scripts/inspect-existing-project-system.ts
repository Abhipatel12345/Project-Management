import axios from 'axios';

async function main() {
  const adminCookie = 'pdm_session=' + Buffer.from(JSON.stringify({
    username: 'admin',
    email: 'admin@example.com',
    fullName: 'Administrator',
    role: 'admin'
  })).toString('base64');

  const headers = {
    'Cookie': adminCookie,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Check existing projects
    const projRes = await axios.get('http://localhost:3000/api/resource/Project?limit_page_length=10', { headers });
    console.log('Projects count:', projRes.data.data?.length);
    const existing = projRes.data.data?.find((p: any) => p.project_name?.includes('Aurora') || p.name?.includes('Aurora'));
    console.log('Existing Aurora project:', existing);

    // 2. Check gates
    const gatesRes = await axios.get('http://localhost:3000/api/gates', { headers });
    console.log('gatesRes.data keys:', Object.keys(gatesRes.data));
    const gateList = Array.isArray(gatesRes.data) ? gatesRes.data : (gatesRes.data.data || gatesRes.data.gates || []);
    console.log('Total gates:', gateList.length);
    const plGates = gateList.filter((g: any) => g.gate_name?.includes('PL') || g.gate_type?.includes('PL') || g.name?.includes('PL'));
    console.log('PL Gates found:', plGates.length, plGates.map((g: any) => ({ id: g.name, name: g.gate_name, project: g.project_id || g.project, project_name: g.project_name })));

    // 3. Check choices/master data for Project
    const projMetaRes = await axios.get('http://localhost:3000/api/projects/choices', { headers }).catch(e => ({ data: null }));
    if (projMetaRes.data) {
      console.log('Project choices:', Object.keys(projMetaRes.data));
    }
  } catch (err: any) {
    console.error('Error in inspect:', err.message, err.response?.data);
  }
}

main();
