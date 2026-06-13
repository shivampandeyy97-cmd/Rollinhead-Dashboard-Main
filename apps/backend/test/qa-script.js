// =============================================================================
// Rollinhead Dashboard — QA Automated Verification Suite
// =============================================================================

const BASE_URL = 'http://localhost:4000/api';

async function runQA() {
  console.log('🤖 Starting QA Automation Suite for Rollinhead Dashboard API...\n');

  let adminToken = '';
  let publisherToken = '';
  let publisherId = '';
  let websiteId = '';

  const results = [];

  function recordResult(testName, status, details = '') {
    results.push({ testName, status, details });
    console.log(`[${status === 'PASS' ? '✅ PASS' : '❌ FAIL'}] ${testName} ${details ? `- ${details}` : ''}`);
  }

  // Helper fetch function
  async function apiRequest(path, method = 'GET', body = null, token = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return { status: response.status, data };
  }

  // Test 1: Admin Login
  try {
    const res = await apiRequest('/auth/login', 'POST', {
      email: 'contact@rollinhead.com',
      password: 'admin123'
    });
    if (res.status === 201 && res.data.accessToken) {
      adminToken = res.data.accessToken;
      recordResult('Admin Login', 'PASS', `Logged in as ${res.data.user.name}`);
    } else {
      recordResult('Admin Login', 'FAIL', `Status: ${res.status}, Msg: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    recordResult('Admin Login', 'FAIL', err.message);
  }

  // Test 2: Publisher Login
  try {
    const res = await apiRequest('/auth/login', 'POST', {
      email: 'publisher@rollinhead.com',
      password: 'publisher123'
    });
    if (res.status === 201 && res.data.accessToken) {
      publisherToken = res.data.accessToken;
      recordResult('Publisher Login', 'PASS', `Logged in as ${res.data.user.name}`);
    } else {
      recordResult('Publisher Login', 'FAIL', `Status: ${res.status}, Msg: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    recordResult('Publisher Login', 'FAIL', err.message);
  }

  // Test 3: Get Auth Profile (/auth/me)
  try {
    const res = await apiRequest('/auth/me', 'GET', null, publisherToken);
    if (res.status === 200 && res.data.email === 'publisher@rollinhead.com') {
      recordResult('Get Auth Profile (/auth/me)', 'PASS', `Role: ${res.data.role}`);
    } else {
      recordResult('Get Auth Profile (/auth/me)', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Auth Profile (/auth/me)', 'FAIL', err.message);
  }

  // Test 4: Get Publishers List (Admin Only)
  try {
    const res = await apiRequest('/publishers', 'GET', null, adminToken);
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
      publisherId = res.data[0].id;
      recordResult('Get Publishers List', 'PASS', `Found ${res.data.length} publisher(s)`);
    } else {
      recordResult('Get Publishers List', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Publishers List', 'FAIL', err.message);
  }

  // Test 5: Get Revenue Share History (Admin Only)
  if (publisherId) {
    try {
      const res = await apiRequest(`/publishers/${publisherId}/rev-share`, 'GET', null, adminToken);
      if (res.status === 200 && Array.isArray(res.data)) {
        recordResult('Get Revenue Share History', 'PASS', `Found ${res.data.length} config entries`);
      } else {
        recordResult('Get Revenue Share History', 'FAIL', `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Revenue Share History', 'FAIL', err.message);
    }
  }

  // Test 6: Get Websites (Admin access)
  try {
    const res = await apiRequest('/websites', 'GET', null, adminToken);
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
      websiteId = res.data[0].id;
      recordResult('Get Websites (Admin)', 'PASS', `Found ${res.data.length} website(s)`);
    } else {
      recordResult('Get Websites (Admin)', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Websites (Admin)', 'FAIL', err.message);
  }

  // Test 7: Get Websites (Publisher access)
  try {
    const res = await apiRequest('/websites', 'GET', null, publisherToken);
    if (res.status === 200 && Array.isArray(res.data)) {
      recordResult('Get Websites (Publisher)', 'PASS', `Found ${res.data.length} website(s)`);
    } else {
      recordResult('Get Websites (Publisher)', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Websites (Publisher)', 'FAIL', err.message);
  }

  // Test 8: Get Tags for Website
  if (websiteId) {
    try {
      const res = await apiRequest(`/websites/${websiteId}/tags`, 'GET', null, publisherToken);
      if (res.status === 200 && Array.isArray(res.data)) {
        recordResult('Get Tags for Website', 'PASS', `Found ${res.data.length} tag(s)`);
      } else {
        recordResult('Get Tags for Website', 'FAIL', `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Tags for Website', 'FAIL', err.message);
    }
  }

  // Test 9: Get Overview Reports Metrics
  try {
    const res = await apiRequest('/reports/overview', 'GET', null, publisherToken);
    if (res.status === 200 && res.data.impressions !== undefined) {
      const imps = res.data.impressions.current;
      const netRev = res.data.netRevenue.current;
      const clicks = res.data.clicks.current;
      const pageviews = res.data.pageviews.current;
      const netCpm = res.data.netCpm.current;

      const isDataValid = !isNaN(imps) && !isNaN(netRev) && !isNaN(clicks) && !isNaN(pageviews) && !isNaN(netCpm);

      if (isDataValid) {
        recordResult('Get Overview Reports Metrics', 'PASS', 
          `Imps: ${imps}, NetRev: $${Number(netRev).toFixed(2)}, Clicks: ${clicks}, PV: ${pageviews}, NetCPM: $${Number(netCpm).toFixed(2)}`
        );
      } else {
        recordResult('Get Overview Reports Metrics', 'FAIL', `Invalid numeric values returned. Data: ${JSON.stringify(res.data)}`);
      }
    } else {
      recordResult('Get Overview Reports Metrics', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Overview Reports Metrics', 'FAIL', err.message);
  }

  // Test 10: Get Reports Performance Chart
  try {
    const res = await apiRequest('/reports/performance', 'GET', null, publisherToken);
    if (res.status === 200 && Array.isArray(res.data)) {
      recordResult('Get Reports Performance Chart', 'PASS', `Found ${res.data.length} daily chart data points`);
    } else {
      recordResult('Get Reports Performance Chart', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Reports Performance Chart', 'FAIL', err.message);
  }

  // Test 11: Get Reports Breakdown (Group by Website)
  try {
    const res = await apiRequest('/reports/breakdown?groupBy=website', 'GET', null, publisherToken);
    if (res.status === 200 && Array.isArray(res.data)) {
      recordResult('Get Reports Breakdown (groupBy=website)', 'PASS', `Found ${res.data.length} breakdown records`);
    } else {
      recordResult('Get Reports Breakdown (groupBy=website)', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Reports Breakdown (groupBy=website)', 'FAIL', err.message);
  }

  // Test 12: Get Reports Breakdown (Group by Country)
  try {
    const res = await apiRequest('/reports/breakdown?groupBy=country', 'GET', null, publisherToken);
    if (res.status === 200 && Array.isArray(res.data)) {
      recordResult('Get Reports Breakdown (groupBy=country)', 'PASS', `Found ${res.data.length} country records`);
    } else {
      recordResult('Get Reports Breakdown (groupBy=country)', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Reports Breakdown (groupBy=country)', 'FAIL', err.message);
  }

  // Test 13: Get Notifications List
  try {
    const res = await apiRequest('/notifications', 'GET', null, publisherToken);
    if (res.status === 200 && Array.isArray(res.data)) {
      recordResult('Get Notifications List', 'PASS', `Found ${res.data.length} notification(s)`);
    } else {
      recordResult('Get Notifications List', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Notifications List', 'FAIL', err.message);
  }

  // Test 14: Get SMTP Status and Diagnostics
  try {
    const res = await apiRequest('/auth/smtp-status', 'GET', null, adminToken);
    if (res.status === 200) {
      recordResult('SMTP & DB Status check', 'PASS', `DB connection: ${res.data.db?.status || 'UNKNOWN'}`);
    } else {
      recordResult('SMTP & DB Status check', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('SMTP & DB Status check', 'FAIL', err.message);
  }

  // Test 15: Upload Log check (Admin only)
  try {
    const res = await apiRequest('/uploads/logs', 'GET', null, adminToken);
    if (res.status === 200 && Array.isArray(res.data)) {
      recordResult('Get Upload Logs List', 'PASS', `Found ${res.data.length} logs`);
    } else {
      recordResult('Get Upload Logs List', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    recordResult('Get Upload Logs List', 'FAIL', err.message);
  }

  console.log('\n--- QA Automated Verification Summary ---');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  
  if (total - passed === 0) {
    console.log('\n🎉 ALL QA TEST CASES PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.log('\n❌ SOME QA TEST CASES FAILED. CHECK DETAILS ABOVE.');
    process.exit(1);
  }
}

runQA();
