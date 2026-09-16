import http from 'http';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: data, json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STEP 1: LOGIN AS TEAM MEMBER (YASH) ===');
  const yashLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/pdm-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ username: 'teammember@netlink.com', password: '123' }));

  console.log('Yash Login Status:', yashLoginRes.statusCode);
  console.log('Yash Session Role:', yashLoginRes.json?.user?.role);
  console.log('Yash manageTasks permission:', yashLoginRes.json?.user?.permissions?.manageTasks);

  const yashCookies = yashLoginRes.headers['set-cookie'];
  const yashCookieHeader = yashCookies ? yashCookies.map(c => c.split(';')[0]).join('; ') : '';

  console.log('\n=== STEP 2: VERIFY YASH CANNOT CREATE TASKS (POST /api/resource/Task) ===');
  const yashCreateRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/resource/Task',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': yashCookieHeader,
    },
  }, JSON.stringify({
    subject: 'Unauthorized Task Creation by Yash',
    project: 'PROJ-0043',
    status: 'Open',
  }));

  console.log('Yash Create Task Status (Expect 403):', yashCreateRes.statusCode);
  console.log('Yash Create Task Error Message:', yashCreateRes.json?.error || yashCreateRes.body);

  console.log('\n=== STEP 3: VERIFY YASH CANNOT REVIEW SUBMISSIONS (PUT /api/tasks/TASK-2026-00021/submissions) ===');
  const yashReviewRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/TASK-2026-00021/submissions',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': yashCookieHeader,
    },
  }, JSON.stringify({
    action: 'APPROVED',
    review_comments: 'Yash trying to approve',
  }));

  console.log('Yash Review Submission Status (Expect 403):', yashReviewRes.statusCode);
  console.log('Yash Review Submission Error:', yashReviewRes.json?.error || yashReviewRes.body);

  console.log('\n=== STEP 4: VERIFY YASH CANNOT DIRECTLY MARK TASK COMPLETED (PUT /api/resource/Task/TASK-2026-00021) ===');
  const yashCompleteRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/resource/Task/TASK-2026-00021',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': yashCookieHeader,
    },
  }, JSON.stringify({
    status: 'Completed',
  }));

  console.log('Yash Direct Complete Status (Expect 403):', yashCompleteRes.statusCode);
  console.log('Yash Direct Complete Error:', yashCompleteRes.json?.error || yashCompleteRes.body);

  console.log('\n=== STEP 5: LOGIN AS PROJECT MANAGER (SARAH JENKINS) ===');
  const pmLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/pdm-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ username: 'sarahjenkins@gmail.com', password: '123' }));

  console.log('Sarah Login Status:', pmLoginRes.statusCode);
  console.log('Sarah Session Role:', pmLoginRes.json?.user?.role);
  console.log('Sarah manageTasks permission:', pmLoginRes.json?.user?.permissions?.manageTasks);

  const pmCookies = pmLoginRes.headers['set-cookie'];
  const pmCookieHeader = pmCookies ? pmCookies.map(c => c.split(';')[0]).join('; ') : '';

  console.log('\n=== STEP 6: VERIFY SARAH CAN REVIEW / MANAGE SUBMISSIONS ===');
  const pmReviewRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tasks/TASK-2026-00021/submissions',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': pmCookieHeader,
    },
  }, JSON.stringify({
    action: 'APPROVED',
    review_comments: 'Approved by Project Manager Sarah',
  }));
  console.log('Sarah Review Submission Status (Should NOT be 403):', pmReviewRes.statusCode);

  console.log('\n=== ALL RBAC BACKEND CHECKS COMPLETED ===');
}

runTests().catch(console.error);
