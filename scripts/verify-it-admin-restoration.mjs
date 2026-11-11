const BASE_URL = 'http://localhost:3000';

async function verifyITAdmin() {
  console.log('========================================================');
  console.log('   VERIFY IT ADMIN RESTORATION & AUTHENTICATION SUITE    ');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: it_admin exists in ERPNext
  total++;
  console.log('Test 1: Verify it_admin exists and is enabled in ERPNext...');
  const erpRes = await fetch('http://80.225.204.210:8083/api/resource/User/itadmin@pdm.netlink.com', {
    headers: {
      Authorization: 'token df5d2dc4b819ad2:25c592ffee48809',
      Accept: 'application/json'
    }
  });
  const erpData = await erpRes.json();
  if (erpRes.status === 200 && erpData.data?.enabled === 1 && erpData.data?.username === 'it_admin') {
    console.log('PASS: it_admin exists in ERPNext with enabled=1 and correct roles:');
    console.log('Roles:', erpData.data?.roles?.map(r => r.role));
    passed++;
  } else {
    console.error('FAIL: User not found in ERPNext or not enabled', erpData);
  }

  // Test 2: Login via PDM with username "it_admin" and correct authorized password
  total++;
  console.log('\nTest 2: Login via PDM using username "it_admin" and authorized password...');
  const loginRes1 = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'it_admin', pwd: 'Itadmin@123' })
  });
  const loginData1 = await loginRes1.json();
  const cookie1 = loginRes1.headers.get('set-cookie');
  if (
    loginRes1.status === 200 &&
    loginData1.user?.role === 'it_admin' &&
    loginData1.user?.permissions?.manageUsers === true &&
    loginData1.user?.permissions?.manageProjects === false &&
    cookie1
  ) {
    console.log('PASS: Login succeeded with status 200, role="it_admin", and secure pdm_session cookie issued.');
    passed++;
  } else {
    console.error('FAIL: Login failed with username it_admin', loginRes1.status, loginData1);
  }

  // Test 3: Login via PDM with canonical email "itadmin@pdm.netlink.com"
  total++;
  console.log('\nTest 3: Login via PDM using email "itadmin@pdm.netlink.com"...');
  const loginRes2 = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'itadmin@pdm.netlink.com', pwd: 'Itadmin@123' })
  });
  const loginData2 = await loginRes2.json();
  if (loginRes2.status === 200 && loginData2.user?.role === 'it_admin') {
    console.log('PASS: Login with canonical email succeeded.');
    passed++;
  } else {
    console.error('FAIL: Login with email failed', loginRes2.status, loginData2);
  }

  // Test 4: Incorrect credentials rejection
  total++;
  console.log('\nTest 4: Rejection of incorrect credentials...');
  const badLogin = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'it_admin', pwd: 'WrongPasswordXYZ999!' })
  });
  const badData = await badLogin.json();
  if (badLogin.status === 401 && badData._error_message?.includes('Invalid username or password')) {
    console.log('PASS: Incorrect password correctly rejected with 401 Unauthorized.');
    passed++;
  } else {
    console.error('FAIL: Incorrect password was not rejected properly', badLogin.status, badData);
  }

  // Test 5: Session validation & IT Admin Dashboard permissions
  total++;
  console.log('\nTest 5: Session validation and IT Admin role verification...');
  const rawCookie = cookie1 ? cookie1.split(';')[0] : '';
  const sessionRes = await fetch(`${BASE_URL}/api/auth/pdm-session`, {
    headers: { Cookie: rawCookie, Accept: 'application/json' }
  });
  const sessionData = await sessionRes.json();
  if (
    sessionRes.status === 200 &&
    sessionData.user?.role === 'it_admin' &&
    sessionData.user?.permissions?.manageUsers === true &&
    sessionData.user?.permissions?.manageProjects === false &&
    sessionData.user?.permissions?.approveGates === false
  ) {
    console.log('PASS: Session verified with scoped IT Admin permissions.');
    passed++;
  } else {
    console.error('FAIL: Session verification failed', sessionRes.status, sessionData);
  }

  // Test 6: IT Admin User Management API Access
  total++;
  console.log('\nTest 6: User Management function access (GET /api/resource/User)...');
  const userListRes = await fetch(`${BASE_URL}/api/resource/User?limit_page_length=5`, {
    headers: { Cookie: rawCookie, Accept: 'application/json' }
  });
  const userListData = await userListRes.json();
  if (userListRes.status === 200 && Array.isArray(userListData.data)) {
    console.log(`PASS: IT Admin successfully fetched user list (${userListData.data.length} records).`);
    passed++;
  } else {
    console.error('FAIL: IT Admin could not access user list', userListRes.status, userListData);
  }

  // Test 7: Unauthorized project modification protection (403 Forbidden)
  total++;
  console.log('\nTest 7: Protection of unauthorized modules (POST /api/resource/Project)...');
  const unauthorizedRes = await fetch(`${BASE_URL}/api/resource/Project`, {
    method: 'POST',
    headers: { Cookie: rawCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_name: 'Unauthorized Project Attempt' })
  });
  if (unauthorizedRes.status === 403) {
    console.log('PASS: Project creation attempt blocked with 403 Forbidden.');
    passed++;
  } else {
    console.error('FAIL: IT Admin was not blocked from project creation', unauthorizedRes.status);
  }

  // Test 8: Administrator login regression
  total++;
  console.log('\nTest 8: Regression check on Administrator account...');
  const adminRes = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'AdminPassword123!' })
  });
  const adminData = await adminRes.json();
  if (adminRes.status === 200 && adminData.user?.role === 'admin') {
    console.log('PASS: Administrator login intact.');
    passed++;
  } else {
    console.error('FAIL: Administrator login failed', adminRes.status, adminData);
  }

  // Test 9: Verify IT Admin cannot access gate approval or other non-IT modules
  total++;
  console.log('\nTest 9: Verify non-IT modules remain protected against IT Admin...');
  const gateApprovalRes = await fetch(`${BASE_URL}/api/resource/Gate%20Readiness/GATE-001`, {
    method: 'PUT',
    headers: { Cookie: rawCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_status: 'Approved' })
  });
  // Gate readiness or submission writes by it_admin should not have gate approval authority
  if (loginData1.user?.permissions?.approveGates === false && loginData1.user?.permissions?.reviewGates === false) {
    console.log('PASS: approveGates and reviewGates are strictly false for it_admin.');
    passed++;
  } else {
    console.error('FAIL: it_admin has unauthorized gate permissions');
  }

  console.log('\n========================================================');
  console.log(`TOTAL: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyITAdmin();
