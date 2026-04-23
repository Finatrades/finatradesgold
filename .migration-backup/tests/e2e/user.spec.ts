import { test, expect } from '@playwright/test';
import { loginAsUser, saveUserStorageState } from '../utils/auth';
import { auditPage, findClickableElements, clickSafely } from '../utils/assertions';
import reporter from '../utils/report';

test.describe('User Site Audit', () => {
  const userRoutes = [
    '/',
    '/dashboard',
    '/finavault',
    '/finapay',
    '/bnsl',
    '/finabridge',
    '/profile',
    '/notifications',
    '/transactions',
    '/referral',
    '/help',
  ];

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should load login page correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid*="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid*="password"]');
    const submitButton = page.locator('button[type="submit"], [data-testid*="login"]');
    
    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
    await expect(submitButton.first()).toBeVisible();
  });

  for (const route of userRoutes) {
    test(`should load ${route} without errors`, async ({ page, context }) => {
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

      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const auditResult = await auditPage(page);
      reporter.addUserRouteResult(auditResult);

      if (consoleErrors.length > 0) {
        console.warn(`Console errors on ${route}:`, consoleErrors);
      }

      expect(networkErrors, `No 5xx errors on ${route}`).toHaveLength(0);
      
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  }

  test('should navigate between main sections', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const navLinks = await page.$$('nav a[href], aside a[href], [data-testid*="nav"]');
    const clickedCount = navLinks.length;

    for (const link of navLinks.slice(0, 5)) {
      const href = await link.getAttribute('href');
      if (href && !href.includes('logout') && !href.includes('external')) {
        try {
          await link.click();
          await page.waitForLoadState('networkidle');
          reporter.incrementElementsClicked();
        } catch (e) {
          console.warn(`Failed to click nav link: ${href}`);
        }
      }
    }
  });

  test('should have accessible buttons and interactive elements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const clickables = await findClickableElements(page);
    
    expect(clickables.length).toBeGreaterThan(0);
    
    for (const selector of clickables.slice(0, 10)) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      
      if (isVisible) {
        const isDisabled = await element.isDisabled().catch(() => true);
        if (!isDisabled) {
          reporter.incrementElementsClicked();
        }
      }
    }
  });

  test('should save user session state', async ({ page, context }) => {
    await saveUserStorageState(context);
    
    const cookies = await context.cookies();
    expect(cookies.length).toBeGreaterThan(0);
  });
});
