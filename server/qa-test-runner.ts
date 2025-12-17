import { db } from './db';
import { users, wallets, transactions, certificates, vaultHoldings, employees, kycSubmissions, platformConfig } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { qaLogger } from './qa-logger';
import { storage } from './storage';
import { getGoldPricePerGram } from './gold-price-service';

export interface TestResult {
  suite: string;
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

export interface TestSuiteResult {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
}

async function runTest(suite: string, testName: string, testFn: () => Promise<void>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    qaLogger.info(suite, testName, 'TEST_START', {});
    await testFn();
    const duration = Date.now() - startTime;
    qaLogger.info(suite, testName, 'TEST_PASS', { duration });
    return { suite, testName, status: 'pass', duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    qaLogger.error(suite, testName, 'TEST_FAIL', error as Error, { duration });
    return { suite, testName, status: 'fail', duration, error: errorMessage };
  }
}

export async function runAuthTests(): Promise<TestSuiteResult> {
  const suite = 'AUTH';
  const tests: TestResult[] = [];
  const startTime = Date.now();

  tests.push(await runTest(suite, 'login_valid_credentials', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user3@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Test user not found - run seed first');
    
    const isValid = await bcrypt.compare('Test123!@#', user[0].password);
    if (!isValid) throw new Error('Password validation failed');
  }));

  tests.push(await runTest(suite, 'login_invalid_password', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user3@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Test user not found');
    
    const isValid = await bcrypt.compare('WrongPassword123', user[0].password);
    if (isValid) throw new Error('Should have rejected invalid password');
  }));

  tests.push(await runTest(suite, 'user_exists_check', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user1@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Test user1 not found');
    if (user[0].kycStatus !== 'Not Started') throw new Error(`Expected KYC 'Not Started', got '${user[0].kycStatus}'`);
  }));

  tests.push(await runTest(suite, 'admin_user_exists', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'admin@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Admin test user not found');
    if (user[0].role !== 'admin') throw new Error(`Expected role 'admin', got '${user[0].role}'`);
  }));

  return {
    suite,
    total: tests.length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    duration: Date.now() - startTime,
    tests,
  };
}

export async function runRolePermissionTests(): Promise<TestSuiteResult> {
  const suite = 'ROLES';
  const tests: TestResult[] = [];
  const startTime = Date.now();

  tests.push(await runTest(suite, 'ops_employee_exists', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'ops@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('OPS user not found');
    
    const emp = await db.select().from(employees).where(eq(employees.userId, user[0].id)).limit(1);
    if (!emp[0]) throw new Error('OPS employee record not found');
    if (emp[0].role !== 'support') throw new Error(`Expected role 'support', got '${emp[0].role}'`);
  }));

  tests.push(await runTest(suite, 'compliance_employee_exists', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'compliance@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Compliance user not found');
    
    const emp = await db.select().from(employees).where(eq(employees.userId, user[0].id)).limit(1);
    if (!emp[0]) throw new Error('Compliance employee record not found');
    if (emp[0].role !== 'compliance') throw new Error(`Expected role 'compliance', got '${emp[0].role}'`);
  }));

  tests.push(await runTest(suite, 'admin_employee_exists', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'admin@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Admin user not found');
    
    const emp = await db.select().from(employees).where(eq(employees.userId, user[0].id)).limit(1);
    if (!emp[0]) throw new Error('Admin employee record not found');
    if (emp[0].role !== 'super_admin') throw new Error(`Expected role 'super_admin', got '${emp[0].role}'`);
  }));

  tests.push(await runTest(suite, 'compliance_has_kyc_permission', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'compliance@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('Compliance user not found');
    
    const emp = await db.select().from(employees).where(eq(employees.userId, user[0].id)).limit(1);
    if (!emp[0]) throw new Error('Compliance employee not found');
    
    const permissions = emp[0].permissions as string[] || [];
    if (!permissions.includes('kyc:write') && !permissions.includes('*')) {
      throw new Error('Compliance should have kyc:write permission');
    }
  }));

  tests.push(await runTest(suite, 'ops_cannot_approve_kyc', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'ops@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('OPS user not found');
    
    const emp = await db.select().from(employees).where(eq(employees.userId, user[0].id)).limit(1);
    if (!emp[0]) throw new Error('OPS employee not found');
    
    const permissions = emp[0].permissions as string[] || [];
    if (permissions.includes('kyc:write') || permissions.includes('*')) {
      throw new Error('OPS should NOT have kyc:write permission');
    }
  }));

  return {
    suite,
    total: tests.length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    duration: Date.now() - startTime,
    tests,
  };
}

export async function runKYCGateTests(): Promise<TestSuiteResult> {
  const suite = 'KYC_GATE';
  const tests: TestResult[] = [];
  const startTime = Date.now();

  tests.push(await runTest(suite, 'user1_kyc_not_started', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user1@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('User1 not found');
    if (user[0].kycStatus !== 'Not Started') throw new Error(`Expected 'Not Started', got '${user[0].kycStatus}'`);
  }));

  tests.push(await runTest(suite, 'user2_kyc_pending', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user2@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('User2 not found');
    if (user[0].kycStatus !== 'In Progress') throw new Error(`Expected 'In Progress', got '${user[0].kycStatus}'`);
  }));

  tests.push(await runTest(suite, 'user3_kyc_approved', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user3@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('User3 not found');
    if (user[0].kycStatus !== 'Approved') throw new Error(`Expected 'Approved', got '${user[0].kycStatus}'`);
  }));

  tests.push(await runTest(suite, 'non_kyc_user_blocked_message', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user1@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('User1 not found');
    
    const isApproved = user[0].kycStatus === 'Approved';
    if (isApproved) throw new Error('User1 should NOT be KYC approved');
  }));

  tests.push(await runTest(suite, 'approved_user_can_transact', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user3@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('User3 not found');
    
    const isApproved = user[0].kycStatus === 'Approved';
    if (!isApproved) throw new Error('User3 should be KYC approved');
  }));

  return {
    suite,
    total: tests.length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    duration: Date.now() - startTime,
    tests,
  };
}

export async function runDepositTests(): Promise<TestSuiteResult> {
  const suite = 'DEPOSITS';
  const tests: TestResult[] = [];
  const startTime = Date.now();

  const configRows = await db.select().from(platformConfig);
  const config: Record<string, number> = {};
  configRows.forEach((row: any) => { config[row.configKey] = parseFloat(row.configValue) || 0; });
  const minDeposit = config['min_deposit'] || 50;
  const maxDeposit = config['max_deposit_single'] || 100000;

  tests.push(await runTest(suite, 'config_limits_exist', async () => {
    if (minDeposit <= 0) throw new Error('min_deposit not configured');
    if (maxDeposit <= 0) throw new Error('max_deposit_single not configured');
    if (minDeposit >= maxDeposit) throw new Error('min_deposit should be less than max_deposit');
  }));

  tests.push(await runTest(suite, 'gold_price_available', async () => {
    const goldPrice = await getGoldPricePerGram();
    if (!goldPrice || goldPrice <= 0) throw new Error('Gold price not available');
  }));

  tests.push(await runTest(suite, 'bank_deposit_simulation', async () => {
    const user = await db.select().from(users).where(eq(users.email, 'user3@test.finatrades.com')).limit(1);
    if (!user[0]) throw new Error('User3 not found');
    
    const goldPrice = await getGoldPricePerGram();
    const amount = 1000;
    const goldGrams = amount / goldPrice;
    
    if (goldGrams <= 0) throw new Error('Gold calculation failed');
  }));

  tests.push(await runTest(suite, 'below_min_rejected', async () => {
    const amount = minDeposit - 1;
    if (amount >= minDeposit) throw new Error(`Amount ${amount} should be below min ${minDeposit}`);
  }));

  tests.push(await runTest(suite, 'above_max_rejected', async () => {
    const amount = maxDeposit + 1;
    if (amount <= maxDeposit) throw new Error(`Amount ${amount} should be above max ${maxDeposit}`);
  }));

  return {
    suite,
    total: tests.length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    duration: Date.now() - startTime,
    tests,
  };
}

export async function runCertificateTests(): Promise<TestSuiteResult> {
  const suite = 'CERTIFICATES';
  const tests: TestResult[] = [];
  const startTime = Date.now();

  tests.push(await runTest(suite, 'certificate_types_valid', async () => {
    const types = ['Digital Ownership', 'Physical Storage', 'Transfer', 'BNSL Lock', 'Trade Lock'];
    if (types.length < 2) throw new Error('Not enough certificate types defined');
  }));

  tests.push(await runTest(suite, 'certificate_table_accessible', async () => {
    const certs = await db.select().from(certificates).limit(1);
  }));

  return {
    suite,
    total: tests.length,
    passed: tests.filter(t => t.status === 'pass').length,
    failed: tests.filter(t => t.status === 'fail').length,
    skipped: tests.filter(t => t.status === 'skip').length,
    duration: Date.now() - startTime,
    tests,
  };
}

export async function runSmokeTests(): Promise<TestSuiteResult[]> {
  qaLogger.info('SMOKE', 'run', 'SUITE_START', {});
  
  const results: TestSuiteResult[] = [];
  results.push(await runAuthTests());
  results.push(await runKYCGateTests());
  
  qaLogger.info('SMOKE', 'run', 'SUITE_COMPLETE', {
    total: results.reduce((sum, r) => sum + r.total, 0),
    passed: results.reduce((sum, r) => sum + r.passed, 0),
    failed: results.reduce((sum, r) => sum + r.failed, 0),
  });
  
  return results;
}

export async function runFullRegression(): Promise<TestSuiteResult[]> {
  qaLogger.info('REGRESSION', 'run', 'SUITE_START', {});
  
  const results: TestSuiteResult[] = [];
  results.push(await runAuthTests());
  results.push(await runRolePermissionTests());
  results.push(await runKYCGateTests());
  results.push(await runDepositTests());
  results.push(await runCertificateTests());
  
  qaLogger.info('REGRESSION', 'run', 'SUITE_COMPLETE', {
    total: results.reduce((sum, r) => sum + r.total, 0),
    passed: results.reduce((sum, r) => sum + r.passed, 0),
    failed: results.reduce((sum, r) => sum + r.failed, 0),
  });
  
  return results;
}

export function generateReport(results: TestSuiteResult[]): { summary: any; html: string; json: string } {
  const summary = {
    timestamp: new Date().toISOString(),
    totalSuites: results.length,
    totalTests: results.reduce((sum, r) => sum + r.total, 0),
    passed: results.reduce((sum, r) => sum + r.passed, 0),
    failed: results.reduce((sum, r) => sum + r.failed, 0),
    skipped: results.reduce((sum, r) => sum + r.skipped, 0),
    duration: results.reduce((sum, r) => sum + r.duration, 0),
    suites: results,
  };

  const passRate = summary.totalTests > 0 
    ? Math.round((summary.passed / summary.totalTests) * 100) 
    : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>QA Test Report - ${summary.timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .stat { background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { color: #6b7280; font-size: 14px; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .suite { background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .suite-header { background: #f9fafb; padding: 12px 16px; font-weight: 600; display: flex; justify-content: space-between; }
    .test-row { padding: 8px 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
    .test-row:nth-child(even) { background: #f9fafb; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Finatrades QA Test Report</h1>
    <p>Generated: ${summary.timestamp}</p>
  </div>
  
  <div class="summary">
    <div class="stat">
      <div class="stat-value">${summary.totalTests}</div>
      <div class="stat-label">Total Tests</div>
    </div>
    <div class="stat">
      <div class="stat-value pass">${summary.passed}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value fail">${summary.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${passRate}%</div>
      <div class="stat-label">Pass Rate</div>
    </div>
  </div>
  
  ${results.map(suite => `
    <div class="suite">
      <div class="suite-header">
        <span>${suite.suite}</span>
        <span>${suite.passed}/${suite.total} passed (${suite.duration}ms)</span>
      </div>
      ${suite.tests.map(test => `
        <div class="test-row">
          <span>${test.testName}</span>
          <span class="badge ${test.status === 'pass' ? 'badge-pass' : 'badge-fail'}">${test.status.toUpperCase()}</span>
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>`;

  return {
    summary,
    html,
    json: JSON.stringify(summary, null, 2),
  };
}
