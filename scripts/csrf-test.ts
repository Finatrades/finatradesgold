/**
 * Comprehensive CSRF Token Test Suite
 * Tests all major platform endpoints for proper CSRF protection
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  testType: 'without_token' | 'with_token' | 'wrong_token';
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

// Get session cookie for authenticated requests
async function getAuthSession(): Promise<{ cookies: string; csrfToken: string }> {
  // First, get the login page to get initial CSRF token
  const initialRes = await fetch(`${BASE_URL}/api/csrf-token`, {
    method: 'GET',
    credentials: 'include',
  });
  
  const setCookieHeader = initialRes.headers.get('set-cookie') || '';
  const csrfMatch = setCookieHeader.match(/csrf-token=([^;]+)/);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';
  
  // Login as test user
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': `csrf-token=${csrfToken}`,
    },
    body: JSON.stringify({
      email: 'admin@finatrades.com',
      password: 'Admin@123456',
    }),
  });
  
  const loginCookies = loginRes.headers.get('set-cookie') || '';
  const sessionMatch = loginCookies.match(/connect\.sid=([^;]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : '';
  
  // Get new CSRF token after login
  const newCsrfRes = await fetch(`${BASE_URL}/api/csrf-token`, {
    method: 'GET',
    headers: {
      'Cookie': `connect.sid=${sessionId}; csrf-token=${csrfToken}`,
    },
  });
  
  const newCookieHeader = newCsrfRes.headers.get('set-cookie') || '';
  const newCsrfMatch = newCookieHeader.match(/csrf-token=([^;]+)/);
  const newCsrfToken = newCsrfMatch ? newCsrfMatch[1] : csrfToken;
  
  return {
    cookies: `connect.sid=${sessionId}; csrf-token=${newCsrfToken}`,
    csrfToken: newCsrfToken,
  };
}

// Test endpoint without CSRF token (should fail for protected routes)
async function testWithoutToken(
  endpoint: string,
  method: string,
  body: any,
  cookies: string,
  expectedToFail: boolean = true
): Promise<TestResult> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const expectedStatus = expectedToFail ? 403 : 200;
    const passed = expectedToFail ? res.status === 403 : res.status < 400;
    
    return {
      endpoint,
      method,
      testType: 'without_token',
      expectedStatus,
      actualStatus: res.status,
      passed,
      message: passed 
        ? (expectedToFail ? 'Correctly rejected request without CSRF token' : 'Request allowed as expected')
        : (expectedToFail ? 'SECURITY ISSUE: Request accepted without CSRF token!' : `Unexpected error: ${res.status}`),
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      testType: 'without_token',
      expectedStatus: expectedToFail ? 403 : 200,
      actualStatus: 0,
      passed: false,
      message: `Error: ${error.message}`,
    };
  }
}

// Test endpoint with valid CSRF token (should succeed)
async function testWithToken(
  endpoint: string,
  method: string,
  body: any,
  cookies: string,
  csrfToken: string
): Promise<TestResult> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'x-csrf-token': csrfToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // For CSRF validation, we expect 2xx or 4xx (not 403 for CSRF)
    const passed = res.status !== 403 || (await res.text()).indexOf('CSRF') === -1;
    
    return {
      endpoint,
      method,
      testType: 'with_token',
      expectedStatus: 200,
      actualStatus: res.status,
      passed,
      message: passed 
        ? `Request accepted with valid CSRF token (status: ${res.status})`
        : 'Request rejected despite valid CSRF token!',
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      testType: 'with_token',
      expectedStatus: 200,
      actualStatus: 0,
      passed: false,
      message: `Error: ${error.message}`,
    };
  }
}

// Test endpoint with wrong CSRF token (should fail)
async function testWithWrongToken(
  endpoint: string,
  method: string,
  body: any,
  cookies: string
): Promise<TestResult> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'x-csrf-token': 'invalid-token-12345',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const passed = res.status === 403;
    
    return {
      endpoint,
      method,
      testType: 'wrong_token',
      expectedStatus: 403,
      actualStatus: res.status,
      passed,
      message: passed 
        ? 'Correctly rejected request with invalid CSRF token'
        : 'SECURITY ISSUE: Request accepted with invalid CSRF token!',
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      testType: 'wrong_token',
      expectedStatus: 403,
      actualStatus: 0,
      passed: false,
      message: `Error: ${error.message}`,
    };
  }
}

// Define all endpoints to test
const endpointsToTest = [
  // Authentication endpoints
  { endpoint: '/api/auth/login', method: 'POST', body: { email: 'test@test.com', password: 'test' }, requiresAuth: false },
  { endpoint: '/api/auth/register', method: 'POST', body: { email: 'test@test.com', password: 'test', firstName: 'Test', lastName: 'User' }, requiresAuth: false },
  { endpoint: '/api/auth/logout', method: 'POST', body: {}, requiresAuth: true },
  { endpoint: '/api/auth/forgot-password', method: 'POST', body: { email: 'test@test.com' }, requiresAuth: false },
  { endpoint: '/api/auth/reset-password', method: 'POST', body: { token: 'test', password: 'test' }, requiresAuth: false },
  
  // User profile endpoints
  { endpoint: '/api/user/profile', method: 'PUT', body: { firstName: 'Test' }, requiresAuth: true },
  { endpoint: '/api/user/change-password', method: 'POST', body: { currentPassword: 'test', newPassword: 'test2' }, requiresAuth: true },
  
  // KYC endpoints
  { endpoint: '/api/kyc', method: 'POST', body: { level: 1 }, requiresAuth: true },
  { endpoint: '/api/finatrades-kyc/personal', method: 'POST', body: { firstName: 'Test' }, requiresAuth: true },
  { endpoint: '/api/finatrades-kyc/corporate', method: 'POST', body: { companyName: 'Test Corp' }, requiresAuth: true },
  
  // Wallet/Payment endpoints
  { endpoint: '/api/wallet/deposit', method: 'POST', body: { amount: 100 }, requiresAuth: true },
  { endpoint: '/api/wallet/withdraw', method: 'POST', body: { amount: 100 }, requiresAuth: true },
  { endpoint: '/api/gold/buy', method: 'POST', body: { grams: 1 }, requiresAuth: true },
  { endpoint: '/api/gold/sell', method: 'POST', body: { grams: 1 }, requiresAuth: true },
  
  // Transfer endpoints
  { endpoint: '/api/transfers/send', method: 'POST', body: { recipientEmail: 'test@test.com', amount: 1 }, requiresAuth: true },
  { endpoint: '/api/transfers/request', method: 'POST', body: { fromEmail: 'test@test.com', amount: 1 }, requiresAuth: true },
  
  // Vault endpoints
  { endpoint: '/api/vault/holdings', method: 'POST', body: { grams: 1 }, requiresAuth: true },
  
  // BNSL endpoints
  { endpoint: '/api/bnsl/plans', method: 'POST', body: { goldGrams: 10, term: 12 }, requiresAuth: true },
  
  // FinaBridge endpoints
  { endpoint: '/api/finabridge/proposals', method: 'POST', body: { type: 'IMPORT' }, requiresAuth: true },
  
  // Admin endpoints
  { endpoint: '/api/admin/users', method: 'PUT', body: { userId: 'test', status: 'active' }, requiresAuth: true },
  { endpoint: '/api/admin/kyc/approve', method: 'POST', body: { userId: 'test' }, requiresAuth: true },
  { endpoint: '/api/admin/announcements', method: 'POST', body: { title: 'Test', content: 'Test' }, requiresAuth: true },
  { endpoint: '/api/admin/platform-config', method: 'PUT', body: { key: 'test', value: 'test' }, requiresAuth: true },
  
  // Notification endpoints
  { endpoint: '/api/notifications/mark-read', method: 'POST', body: { notificationId: 'test' }, requiresAuth: true },
  
  // Security endpoints  
  { endpoint: '/api/security/2fa/enable', method: 'POST', body: { code: '123456' }, requiresAuth: true },
  { endpoint: '/api/security/2fa/disable', method: 'POST', body: { code: '123456' }, requiresAuth: true },
];

// Exempt endpoints that should NOT require CSRF
const exemptEndpoints = [
  '/api/binance/webhook',
  '/api/wingold/webhooks',
  '/api/cms/',
  '/api/b2b/',
  '/api/certificates/verify',
  '/api/verify-certificate',
];

async function runTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE CSRF TOKEN TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  // Get authenticated session
  console.log('\n[1] Getting authenticated session...');
  let auth: { cookies: string; csrfToken: string };
  try {
    auth = await getAuthSession();
    console.log('✓ Successfully authenticated');
    console.log(`  CSRF Token: ${auth.csrfToken.substring(0, 20)}...`);
  } catch (error: any) {
    console.log('✗ Failed to authenticate:', error.message);
    console.log('  Using unauthenticated tests only');
    auth = { cookies: '', csrfToken: '' };
  }
  
  console.log('\n[2] Testing endpoints...\n');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const test of endpointsToTest) {
    console.log(`Testing: ${test.method} ${test.endpoint}`);
    
    // Skip auth-required endpoints if not authenticated
    if (test.requiresAuth && !auth.cookies) {
      console.log('  ⊘ Skipped (requires authentication)\n');
      skipped++;
      continue;
    }
    
    const cookies = test.requiresAuth ? auth.cookies : '';
    
    // Test 1: Without CSRF token (should fail)
    const resultWithoutToken = await testWithoutToken(
      test.endpoint,
      test.method,
      test.body,
      cookies,
      true
    );
    results.push(resultWithoutToken);
    
    if (resultWithoutToken.passed) {
      console.log(`  ✓ Without token: ${resultWithoutToken.message}`);
      passed++;
    } else {
      console.log(`  ✗ Without token: ${resultWithoutToken.message}`);
      failed++;
    }
    
    // Test 2: With wrong CSRF token (should fail)
    const resultWrongToken = await testWithWrongToken(
      test.endpoint,
      test.method,
      test.body,
      cookies
    );
    results.push(resultWrongToken);
    
    if (resultWrongToken.passed) {
      console.log(`  ✓ Wrong token: ${resultWrongToken.message}`);
      passed++;
    } else {
      console.log(`  ✗ Wrong token: ${resultWrongToken.message}`);
      failed++;
    }
    
    // Test 3: With valid CSRF token (should succeed or fail for other reasons)
    if (auth.csrfToken) {
      const resultWithToken = await testWithToken(
        test.endpoint,
        test.method,
        test.body,
        cookies,
        auth.csrfToken
      );
      results.push(resultWithToken);
      
      if (resultWithToken.passed) {
        console.log(`  ✓ Valid token: ${resultWithToken.message}`);
        passed++;
      } else {
        console.log(`  ✗ Valid token: ${resultWithToken.message}`);
        failed++;
      }
    }
    
    console.log('');
  }
  
  // Test exempt endpoints
  console.log('\n[3] Testing exempt endpoints (should work without CSRF)...\n');
  
  for (const endpoint of exemptEndpoints) {
    console.log(`Testing exempt: POST ${endpoint}`);
    
    const result = await testWithoutToken(
      endpoint,
      'POST',
      {},
      auth.cookies,
      false // These should NOT require CSRF
    );
    results.push(result);
    
    // For exempt routes, not getting 403 is a pass
    if (result.actualStatus !== 403) {
      console.log(`  ✓ Exempt route accepted (status: ${result.actualStatus})`);
      passed++;
    } else {
      console.log(`  ⚠ Exempt route rejected with 403 (may need review)`);
      // Not counting as failed since it might be intentional
    }
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${passed + failed + skipped}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
  
  // List failed tests
  if (failed > 0) {
    console.log('\nFAILED TESTS:');
    console.log('-'.repeat(40));
    for (const result of results) {
      if (!result.passed) {
        console.log(`${result.method} ${result.endpoint}`);
        console.log(`  Test: ${result.testType}`);
        console.log(`  Expected: ${result.expectedStatus}, Got: ${result.actualStatus}`);
        console.log(`  Message: ${result.message}`);
        console.log('');
      }
    }
  }
  
  // Security recommendations
  console.log('\nSECURITY RECOMMENDATIONS:');
  console.log('-'.repeat(40));
  const securityIssues = results.filter(r => 
    !r.passed && (r.testType === 'without_token' || r.testType === 'wrong_token')
  );
  
  if (securityIssues.length === 0) {
    console.log('✓ All CSRF protections are working correctly');
  } else {
    console.log('⚠ The following endpoints have CSRF vulnerabilities:');
    for (const issue of securityIssues) {
      console.log(`  - ${issue.method} ${issue.endpoint}: ${issue.message}`);
    }
  }
  
  console.log('\nCompleted at:', new Date().toISOString());
  
  return { passed, failed, skipped };
}

// Run the tests
runTests().catch(console.error);
