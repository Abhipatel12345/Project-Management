const BASE_URL = 'http://localhost:3000';

async function verifyFixes() {
  console.log('=== VERIFYING LOGIN FIXES ===\n');

  // Test A: Wrong credentials return proper message and NOT "session has expired"
  console.log('Test A: Bad credentials message inspection...');
  const resBad = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'IncorrectPassword999' })
  });
  const dataBad = await resBad.json();
  console.log('Status:', resBad.status);
  console.log('Error message in body:', dataBad._error_message);
  if (dataBad._error_message?.toLowerCase().includes('session has expired')) {
    console.error('FAIL: Error message still mentions session expiration!');
    process.exit(1);
  }
  if (!dataBad._error_message?.includes('Invalid username or password')) {
    console.error('FAIL: Expected "Invalid username or password"');
    process.exit(1);
  }
  console.log('PASS: Proper credential error returned.\n');

  // Test B: Login as Administrator with alias 'admin'
  console.log('Test B: Login as "admin"...');
  const resAdmin = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'admin', pwd: 'AdminPassword123!' })
  });
  const dataAdmin = await resAdmin.json();
  const cookieAdmin = resAdmin.headers.get('set-cookie');
  console.log('Status:', resAdmin.status, 'User:', dataAdmin.user?.username, 'Role:', dataAdmin.user?.role);
  if (resAdmin.status !== 200 || dataAdmin.user?.role !== 'admin' || !cookieAdmin) {
    console.error('FAIL: Admin login failed');
    process.exit(1);
  }
  console.log('PASS: Admin login succeeded.\n');

  // Test C: Session check using issued cookie
  console.log('Test C: Verify session with cookie...');
  const rawCookie = cookieAdmin.split(';')[0];
  const resSession = await fetch(`${BASE_URL}/api/auth/pdm-session`, {
    headers: { 'Cookie': rawCookie, 'Accept': 'application/json' }
  });
  const dataSession = await resSession.json();
  console.log('Status:', resSession.status, 'Session User:', dataSession.user?.username);
  if (resSession.status !== 200 || dataSession.user?.username !== 'Administrator') {
    console.error('FAIL: Session verification failed');
    process.exit(1);
  }
  console.log('PASS: Session verification succeeded.\n');

  // Test D: Protected resource access with issued cookie
  console.log('Test D: Protected resource /api/resource/Project with cookie...');
  const resProjects = await fetch(`${BASE_URL}/api/resource/Project?limit_page_length=5`, {
    headers: { 'Cookie': rawCookie, 'Accept': 'application/json' }
  });
  const dataProjects = await resProjects.json();
  console.log('Status:', resProjects.status, 'Projects count:', dataProjects.data?.length);
  if (resProjects.status !== 200) {
    console.error('FAIL: Resource access failed');
    process.exit(1);
  }
  console.log('PASS: Resource access succeeded.\n');

  // Test E: Unauthenticated session check returns 401 with clean message
  console.log('Test E: Unauthenticated session check...');
  const resGuest = await fetch(`${BASE_URL}/api/auth/pdm-session`);
  const dataGuest = await resGuest.json();
  console.log('Status:', resGuest.status, 'Body:', dataGuest);
  if (resGuest.status !== 401) {
    console.error('FAIL: Unauthenticated check should return 401');
    process.exit(1);
  }
  console.log('PASS: Unauthenticated check returned 401 as expected.\n');

  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

verifyFixes();
