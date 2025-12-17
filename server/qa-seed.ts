import { db } from './db';
import { users, wallets, employees, transactions, certificates, vaultHoldings, kycSubmissions } from '@shared/schema';
import { eq, like, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { qaLogger } from './qa-logger';

const SUITE = 'SEED';

const TEST_USERS = [
  { email: 'user1@test.finatrades.com', firstName: 'Test', lastName: 'User1', kycStatus: 'Not Started' as const },
  { email: 'user2@test.finatrades.com', firstName: 'Test', lastName: 'User2', kycStatus: 'In Progress' as const },
  { email: 'user3@test.finatrades.com', firstName: 'Test', lastName: 'User3', kycStatus: 'Approved' as const },
];

const TEST_EMPLOYEES = [
  { email: 'ops@test.finatrades.com', firstName: 'Ops', lastName: 'Manager', role: 'support' as const, department: 'Operations', jobTitle: 'Operations Manager' },
  { email: 'compliance@test.finatrades.com', firstName: 'Compliance', lastName: 'Officer', role: 'compliance' as const, department: 'Compliance', jobTitle: 'Compliance Officer' },
  { email: 'admin@test.finatrades.com', firstName: 'Admin', lastName: 'Super', role: 'super_admin' as const, department: 'Administration', jobTitle: 'Super Administrator' },
];

const DEFAULT_PASSWORD = 'Test123!@#';

export async function seedTestUsers(): Promise<{ users: any[]; employees: any[] }> {
  const createdUsers: any[] = [];
  const createdEmployees: any[] = [];
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  qaLogger.info(SUITE, 'seedTestUsers', 'SEED_START', { userCount: TEST_USERS.length + TEST_EMPLOYEES.length });

  for (const testUser of TEST_USERS) {
    try {
      let user = await db.select().from(users).where(eq(users.email, testUser.email)).limit(1);
      
      if (user.length === 0) {
        const [newUser] = await db.insert(users).values({
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          kycStatus: testUser.kycStatus,
          role: 'user',
          isEmailVerified: true,
        }).returning();
        
        await db.insert(wallets).values({
          userId: newUser.id,
          goldGrams: '0.000000',
          usdBalance: '0.00',
          eurBalance: '0.00',
        });
        
        createdUsers.push(newUser);
        qaLogger.info(SUITE, 'seedTestUsers', 'USER_CREATED', { email: testUser.email, kycStatus: testUser.kycStatus });
      } else {
        await db.update(users).set({
          kycStatus: testUser.kycStatus,
          password: hashedPassword,
          isEmailVerified: true,
        }).where(eq(users.id, user[0].id));
        createdUsers.push(user[0]);
        qaLogger.info(SUITE, 'seedTestUsers', 'USER_UPDATED', { email: testUser.email, kycStatus: testUser.kycStatus });
      }
    } catch (error) {
      qaLogger.error(SUITE, 'seedTestUsers', 'USER_CREATE_FAILED', error as Error, { email: testUser.email });
    }
  }

  for (const testEmp of TEST_EMPLOYEES) {
    try {
      let user = await db.select().from(users).where(eq(users.email, testEmp.email)).limit(1);
      
      if (user.length === 0) {
        const [newUser] = await db.insert(users).values({
          email: testEmp.email,
          password: hashedPassword,
          firstName: testEmp.firstName,
          lastName: testEmp.lastName,
          kycStatus: 'Approved',
          role: 'admin',
          isEmailVerified: true,
        }).returning();
        user = [newUser];
        
        await db.insert(wallets).values({
          userId: newUser.id,
          goldGrams: '0.000000',
          usdBalance: '0.00',
          eurBalance: '0.00',
        });
        
        qaLogger.info(SUITE, 'seedTestUsers', 'USER_CREATED', { email: testEmp.email, role: 'admin' });
      } else {
        await db.update(users).set({
          password: hashedPassword,
          role: 'admin',
          isEmailVerified: true,
          kycStatus: 'Approved',
        }).where(eq(users.id, user[0].id));
      }

      let employee = await db.select().from(employees).where(eq(employees.userId, user[0].id)).limit(1);
      
      if (employee.length === 0) {
        const empId = `EMP-QA-${Date.now().toString(36).toUpperCase()}`;
        const [newEmployee] = await db.insert(employees).values({
          userId: user[0].id,
          employeeId: empId,
          role: testEmp.role,
          department: testEmp.department,
          jobTitle: testEmp.jobTitle,
          status: 'active',
          permissions: getPermissionsForRole(testEmp.role),
        }).returning();
        createdEmployees.push(newEmployee);
        qaLogger.info(SUITE, 'seedTestUsers', 'EMPLOYEE_CREATED', { email: testEmp.email, role: testEmp.role, employeeId: empId });
      } else {
        await db.update(employees).set({
          role: testEmp.role,
          department: testEmp.department,
          jobTitle: testEmp.jobTitle,
          status: 'active',
          permissions: getPermissionsForRole(testEmp.role),
        }).where(eq(employees.id, employee[0].id));
        createdEmployees.push(employee[0]);
        qaLogger.info(SUITE, 'seedTestUsers', 'EMPLOYEE_UPDATED', { email: testEmp.email, role: testEmp.role });
      }
    } catch (error) {
      qaLogger.error(SUITE, 'seedTestUsers', 'EMPLOYEE_CREATE_FAILED', error as Error, { email: testEmp.email });
    }
  }

  qaLogger.info(SUITE, 'seedTestUsers', 'SEED_COMPLETE', { 
    usersCreated: createdUsers.length, 
    employeesCreated: createdEmployees.length 
  });

  return { users: createdUsers, employees: createdEmployees };
}

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'super_admin':
      return ['*'];
    case 'admin':
      return ['users:read', 'users:write', 'transactions:read', 'transactions:write', 'kyc:read', 'kyc:write', 'reports:read', 'settings:read', 'qa:access'];
    case 'compliance':
      return ['users:read', 'kyc:read', 'kyc:write', 'audit:read', 'reports:read'];
    case 'support':
      return ['users:read', 'transactions:read', 'deposits:read', 'withdrawals:read'];
    case 'finance':
      return ['transactions:read', 'transactions:write', 'deposits:read', 'deposits:write', 'withdrawals:read', 'withdrawals:write', 'reports:read'];
    default:
      return ['users:read'];
  }
}

export async function resetTestData(): Promise<{ deleted: Record<string, number> }> {
  qaLogger.info(SUITE, 'resetTestData', 'RESET_START', {});
  
  const testEmails = [...TEST_USERS, ...TEST_EMPLOYEES].map(u => u.email);
  const testUsers = await db.select().from(users).where(inArray(users.email, testEmails));
  const testUserIds = testUsers.map(u => u.id);

  const deleted: Record<string, number> = {};

  if (testUserIds.length > 0) {
    const certResult = await db.delete(certificates).where(inArray(certificates.userId, testUserIds));
    deleted.certificates = testUserIds.length;

    const vhResult = await db.delete(vaultHoldings).where(inArray(vaultHoldings.userId, testUserIds));
    deleted.vaultHoldings = testUserIds.length;

    const txResult = await db.delete(transactions).where(inArray(transactions.userId, testUserIds));
    deleted.transactions = testUserIds.length;

    const walletResult = await db.update(wallets).set({
      goldGrams: '0.000000',
      usdBalance: '0.00',
      eurBalance: '0.00',
    }).where(inArray(wallets.userId, testUserIds));
    deleted.walletsReset = testUserIds.length;
  }

  qaLogger.info(SUITE, 'resetTestData', 'RESET_COMPLETE', deleted);
  return { deleted };
}

export async function getTestAccounts() {
  const testEmails = [...TEST_USERS, ...TEST_EMPLOYEES].map(u => u.email);
  const testUsers = await db.select().from(users).where(inArray(users.email, testEmails));
  
  const result = [];
  for (const user of testUsers) {
    const employee = await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1);
    const wallet = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
    
    result.push({
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      kycStatus: user.kycStatus,
      employeeRole: employee[0]?.role || null,
      goldGrams: wallet[0]?.goldGrams || '0',
      usdBalance: wallet[0]?.usdBalance || '0',
    });
  }
  
  return result;
}

export const TEST_PASSWORD = DEFAULT_PASSWORD;
