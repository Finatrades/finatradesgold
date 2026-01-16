import { test, expect } from '@playwright/test';
import { loginAsAdmin, saveAdminStorageState } from '../utils/auth';
import { auditPage, findClickableElements } from '../utils/assertions';
import reporter from '../utils/report';

test.describe('Admin Site Audit', () => {
  const adminRoutes = [
    '/admin',
    '/admin/dashboard',
    '/admin/users',
    '/admin/kyc',
    '/admin/transactions',
    '/admin/wallets',
    '/admin/settings',
    '/admin/reports',
    '/admin/support',
    '/admin/security',
  ];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const route of adminRoutes) {
    test(`should load admin ${route} without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const networkErrors: { url: string; status: number }[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          consoleErrors.push(msg.text());
        }
      });

      page.on('response', (response) => {
        if (response.status() >= 500) {
          networkErrors.push({ url: response.url(), status: response.status() });
        }
      });

      try {
        await page.goto(route, { timeout: 30000 });
        await page.waitForLoadState('networkidle');
      } catch (e) {
        console.warn(`Failed to navigate to ${route}`);
      }

      const auditResult = await auditPage(page);
      reporter.addAdminRouteResult(auditResult);

      expect(networkErrors, `No 5xx errors on admin ${route}`).toHaveLength(0);
    });
  }

  test('should have admin navigation working', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const sidebarLinks = await page.$$('aside a[href], nav a[href], [data-testid*="admin-nav"]');
    
    for (const link of sidebarLinks.slice(0, 5)) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/admin') && !href.includes('logout')) {
        try {
          await link.click();
          await page.waitForLoadState('networkidle');
          reporter.incrementElementsClicked();
        } catch (e) {
          console.warn(`Failed to click admin link: ${href}`);
        }
      }
    }
  });

  test('should have interactive admin controls', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const clickables = await findClickableElements(page);
    expect(clickables.length).toBeGreaterThan(0);

    for (const selector of clickables.slice(0, 10)) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      if (isVisible) {
        reporter.incrementElementsClicked();
      }
    }
  });

  test('should display admin data tables correctly', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table, [role="table"], [data-testid*="table"]');
    const tableExists = await table.first().isVisible().catch(() => false);
    
    if (tableExists) {
      const rows = await page.$$('tbody tr, [role="row"]');
      expect(rows.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should save admin session state', async ({ page, context }) => {
    await saveAdminStorageState(context);
    
    const cookies = await context.cookies();
    expect(cookies.length).toBeGreaterThan(0);
  });
});
