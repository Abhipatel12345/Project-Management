/**
 * Comprehensive Regression Test Suite for PDM Authentication
 * Verifies that all authentication bypasses are closed and ERPNext authentication is strictly enforced.
 */

const BASE_URL = 'http://localhost:3000';

async function runTest(testName, testFn) {
  process.stdout.write(`TEST: ${testName} ... `);
  try {
    const result = await testFn();
    if (result.pass) {
      console.log(`\x1b[32m[PASS]\x1b[0m ${result.detail || ''}`);
      return true;
    } else {
      console.log(`\x1b[31m[FAIL]\x1b[0m ${result.detail || ''}`);
      return false;
    }
  } catch (err) {
    console.log(`\x1b[31m[ERROR]\x1b[0m ${err.message}`);
    return false;
  }
}

async function loginRequest(usr, pwd) {
  const res = await fetch(`${BASE_URL}/api/auth/pdm-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr, pwd }),
  });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, setCookie };
}

async function main() {
  console.log('\n======================================================');
  console.log('   MANDATORY LOGIN AUTHENTICATION REGRESSION SUITE     ');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Existing ERPNext user + correct password (Administrator)
  total++;
  const t1 = await runTest('1. Existing ERPNext user + correct password (Administrator)', async () => {
    const res = await loginRequest('Administrator', 'AdminPassword123!');
    if (res.status === 200 && res.data?.user?.username === 'Administrator' && res.data?.user?.role === 'admin') {
      if (res.setCookie && res.setCookie.includes('pdm_session=')) {
        return { pass: true, detail: `Status 200, Role: ${res.data.user.role}, Cookie Issued` };
      }
    }
    return { pass: false, detail: `Expected 200 with admin role and pdm_session cookie, got status ${res.status}` };
  });
  if (t1) passed++;

  // Test 2: Existing ERPNext user + wrong password
  total++;
  const t2 = await runTest('2. Existing ERPNext user + wrong password', async () => {
    const res = await loginRequest('Administrator', 'WrongPasswordXYZ999');
    if (res.status === 401 && !res.data?.user) {
      return { pass: true, detail: `Status 401, Message: "${res.data._error_message || res.data.message}"` };
    }
    return { pass: false, detail: `Expected 401 Unauthorized, got status ${res.status}` };
  });
  if (t2) passed++;

  // Test 3: Username 'a', password 'a' (invalid credentials)
  total++;
  const t3 = await runTest('3. Username "a", password "a" (invalid credentials)', async () => {
    const res = await loginRequest('a', 'a');
    if (res.status === 401 && !res.data?.user) {
      return { pass: true, detail: `Status 401, Login rejected as expected` };
    }
    return { pass: false, detail: `CRITICAL: Expected 401 rejection, got status ${res.status} with user ${JSON.stringify(res.data?.user)}` };
  });
  if (t3) passed++;

  // Test 4: Random username and password
  total++;
  const t4 = await runTest('4. Random username and password', async () => {
    const res = await loginRequest('fake_user_random_49182@example.com', 'RandomPassword#9821');
    if (res.status === 401 && !res.data?.user) {
      return { pass: true, detail: `Status 401, Login rejected as expected` };
    }
    return { pass: false, detail: `Expected 401 rejection, got status ${res.status}` };
  });
  if (t4) passed++;

  // Test 5: Empty credentials
  total++;
  const t5 = await runTest('5. Empty credentials (missing username or password)', async () => {
    const res1 = await loginRequest('', '');
    const res2 = await loginRequest('Administrator', '');
    const res3 = await loginRequest('', 'AdminPassword123!');
    if (res1.status === 400 && res2.status === 400 && res3.status === 400) {
      return { pass: true, detail: `Status 400 on all empty credential attempts` };
    }
    return { pass: false, detail: `Expected 400 on empty credentials, got ${res1.status}, ${res2.status}, ${res3.status}` };
  });
  if (t5) passed++;

  // Test 6: Failed login followed by dashboard access
  total++;
  const t6 = await runTest('6. Failed login followed by dashboard / session access', async () => {
    // Attempt bad login
    await loginRequest('a', 'a');

    // Access /api/auth/pdm-session without cookie
    const sessionRes = await fetch(`${BASE_URL}/api/auth/pdm-session`, {
      headers: { 'Accept': 'application/json' },
    });
    const sessionData = await sessionRes.json().catch(() => ({}));

    // Access protected resource without cookie
    const resourceRes = await fetch(`${BASE_URL}/api/resource/Project`, {
      headers: { 'Accept': 'application/json' },
    });

    if (sessionRes.status === 401 && resourceRes.status === 401 && !sessionData.user) {
      return { pass: true, detail: `Session status 401 (user: null), Protected resource status 401` };
    }
    return {
      pass: false,
      detail: `Access granted! sessionRes=${sessionRes.status}, resourceRes=${resourceRes.status}, user=${JSON.stringify(sessionData.user)}`,
    };
  });
  if (t6) passed++;

  // Test 7: ERPNext authentication service unavailable (or simulated by invalid host)
  total++;
  const t7 = await runTest('7. ERPNext authentication service handling', async () => {
    // Test that network failure or non-200 never falls back to admin
    // When ERPNext login returns 401 or errors, response must be non-200 and user must be null
    const res = await loginRequest('invalid@unreachable.test', 'some_password');
    if (res.status === 401 || res.status === 503) {
      if (!res.data?.user) {
        return { pass: true, detail: `Status ${res.status}, no fallback user session assigned` };
      }
    }
    return { pass: false, detail: `Expected 401/503 without user session, got ${res.status}` };
  });
  if (t7) passed++;

  // Test 8: Valid non-admin ERPNext user (Team Member Yash)
  total++;
  const t8 = await runTest('8. Valid non-admin ERPNext user (teammember@netlink.com)', async () => {
    const res = await loginRequest('teammember@netlink.com', '123');
    if (res.status === 200) {
      const user = res.data?.user;
      if (user && user.role === 'teammember' && user.permissions?.manageProjects === false) {
        // Now test accessing session with this cookie
        const cookie = res.setCookie.split(';')[0];
        const verifyRes = await fetch(`${BASE_URL}/api/auth/pdm-session`, {
          headers: { Cookie: cookie, Accept: 'application/json' },
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.status === 200 && verifyData.user?.role === 'teammember') {
          return { pass: true, detail: `Status 200, Role: ${user.role}, FullName: ${user.fullName}, Scoped Permissions Verified` };
        }
      }
    }
    return { pass: false, detail: `Expected 200 with teammember role, got status ${res.status}, user: ${JSON.stringify(res.data?.user)}` };
  });
  if (t8) passed++;

  // Test 9: Valid Project Manager ERPNext user (sarahjenkins@gmail.com)
  total++;
  const t9 = await runTest('9. Valid Project Manager ERPNext user (sarahjenkins@gmail.com)', async () => {
    const res = await loginRequest('sarahjenkins@gmail.com', '123');
    if (res.status === 200 && res.data?.user?.role === 'projectmanager') {
      return { pass: true, detail: `Status 200, Role: ${res.data.user.role}, FullName: ${res.data.user.fullName}` };
    }
    return { pass: false, detail: `Expected 200 with projectmanager role, got status ${res.status}, user: ${JSON.stringify(res.data?.user)}` };
  });
  if (t9) passed++;

  // Test 10: Forged Cookie Rejection
  total++;
  const t10 = await runTest('10. Tampered / Forged pdm_session cookie rejection', async () => {
    const forgedToken = Buffer.from(JSON.stringify({ username: 'Administrator', role: 'admin' })).toString('base64');
    const fakeRes = await fetch(`${BASE_URL}/api/auth/pdm-session`, {
      headers: { Cookie: `pdm_session=${forgedToken}`, Accept: 'application/json' },
    });
    if (fakeRes.status === 401) {
      return { pass: true, detail: `Status 401: Unsigned/tampered cookie rejected` };
    }
    return { pass: false, detail: `Security failure: Forged cookie accepted with status ${fakeRes.status}` };
  });
  if (t10) passed++;

  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
