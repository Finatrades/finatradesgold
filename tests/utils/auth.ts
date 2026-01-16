import { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const USER_STORAGE_PATH = 'test-results/user.storageState.json';
const ADMIN_STORAGE_PATH = 'test-results/admin.storageState.json';

export interface AuthCredentials {
  email: string;
  password: string;
}

export async function loginAsUser(page: Page, credentials?: AuthCredentials): Promise<void> {
  const email = credentials?.email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = credentials?.password || process.env.TEST_USER_PASSWORD || 'testpassword123';

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[data-testid="input-email"], input[type="email"], input[name="email"]', email);
  await page.fill('[data-testid="input-password"], input[type="password"], input[name="password"]', password);
  
  await page.click('[data-testid="button-login"], button[type="submit"]');
  
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

export async function loginAsAdmin(page: Page, credentials?: AuthCredentials): Promise<void> {
  const email = credentials?.email || process.env.TEST_ADMIN_EMAIL || 'admin@finatrades.com';
  const password = credentials?.password || process.env.TEST_ADMIN_PASSWORD || 'adminpassword123';

  // Try admin login page first, fallback to regular login
  const adminLoginUrl = '/admin/login';
  const regularLoginUrl = '/login';
  
  try {
    await page.goto(adminLoginUrl, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Check if we're on admin login or redirected
    if (!page.url().includes('/admin')) {
      await page.goto(regularLoginUrl);
      await page.waitForLoadState('networkidle');
    }
  } catch {
    await page.goto(regularLoginUrl);
    await page.waitForLoadState('networkidle');
  }

  await page.fill('[data-testid="input-email"], input[type="email"], input[name="email"]', email);
  await page.fill('[data-testid="input-password"], input[type="password"], input[name="password"]', password);
  
  await page.click('[data-testid="button-login"], button[type="submit"]');
  
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  
  // Verify admin access by navigating to admin dashboard
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
}

export async function saveUserStorageState(context: BrowserContext): Promise<void> {
  const dir = path.dirname(USER_STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await context.storageState({ path: USER_STORAGE_PATH });
}

export async function saveAdminStorageState(context: BrowserContext): Promise<void> {
  const dir = path.dirname(ADMIN_STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await context.storageState({ path: ADMIN_STORAGE_PATH });
}

export function getUserStoragePath(): string {
  return USER_STORAGE_PATH;
}

export function getAdminStoragePath(): string {
  return ADMIN_STORAGE_PATH;
}

export function hasUserStorageState(): boolean {
  return fs.existsSync(USER_STORAGE_PATH);
}

export function hasAdminStorageState(): boolean {
  return fs.existsSync(ADMIN_STORAGE_PATH);
}
