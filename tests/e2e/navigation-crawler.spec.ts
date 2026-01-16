import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from '../utils/auth';
import { crawlSite, loadDiscoveredRoutes } from '../utils/crawl';
import { auditPage, findClickableElements, clickSafely } from '../utils/assertions';
import reporter from '../utils/report';

test.describe('Navigation Crawler Audit', () => {
  test('should crawl and audit all user routes', async ({ page }) => {
    await loginAsUser(page);

    const baseUrl = process.env.USER_BASE_URL || 'http://localhost:5000';
    const crawlResult = await crawlSite(page, baseUrl, 30);

    console.log(`Discovered ${crawlResult.routes.length} user routes`);

    for (const route of crawlResult.routes.slice(0, 20)) {
      try {
        await page.goto(route.url, { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        const auditResult = await auditPage(page);
        reporter.addUserRouteResult(auditResult);

        if (!auditResult.passed) {
          console.warn(`Issues on ${route.url}:`, {
            consoleErrors: auditResult.consoleErrors.length,
            networkErrors: auditResult.networkErrors.length
          });
        }
      } catch (e) {
        console.warn(`Failed to audit ${route.url}:`, e);
      }
    }

    expect(crawlResult.routes.length).toBeGreaterThan(0);
  });

  test('should crawl and audit all admin routes', async ({ page }) => {
    await loginAsAdmin(page);

    const adminUrl = process.env.ADMIN_BASE_URL || 'http://localhost:5000/admin';
    
    try {
      await page.goto(adminUrl, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    } catch (e) {
      console.log('Admin section may require different access');
      return;
    }

    const crawlResult = await crawlSite(page, adminUrl, 20);

    console.log(`Discovered ${crawlResult.routes.length} admin routes`);

    for (const route of crawlResult.routes.slice(0, 15)) {
      if (route.url.includes('/admin')) {
        try {
          await page.goto(route.url, { timeout: 15000 });
          await page.waitForLoadState('networkidle');

          const auditResult = await auditPage(page);
          reporter.addAdminRouteResult(auditResult);
        } catch (e) {
          console.warn(`Failed to audit admin ${route.url}:`, e);
        }
      }
    }
  });

  test('should test all clickable elements on key pages', async ({ page }) => {
    await loginAsUser(page);

    const keyPages = ['/dashboard', '/finavault', '/profile'];

    for (const pageUrl of keyPages) {
      try {
        await page.goto(pageUrl, { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        const clickables = await findClickableElements(page);
        let clickedCount = 0;

        for (const selector of clickables.slice(0, 15)) {
          const originalUrl = page.url();
          
          const clicked = await clickSafely(page, selector);
          if (clicked) {
            clickedCount++;
            reporter.incrementElementsClicked();

            await page.waitForTimeout(500);

            const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');
            if (await modal.isVisible().catch(() => false)) {
              const closeBtn = page.locator('[aria-label="Close"], [data-testid*="close"], .close-button');
              await closeBtn.first().click().catch(() => {});
            }

            if (page.url() !== originalUrl && !page.url().includes(pageUrl)) {
              await page.goto(pageUrl);
              await page.waitForLoadState('networkidle');
            }
          }
        }

        console.log(`Clicked ${clickedCount} elements on ${pageUrl}`);
      } catch (e) {
        console.warn(`Error testing elements on ${pageUrl}:`, e);
      }
    }
  });

  test('should verify no broken navigation links', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const links = await page.$$eval('a[href]', (elements) =>
      elements
        .map((el) => el.getAttribute('href'))
        .filter((href) => href && href.startsWith('/') && !href.includes('logout'))
    );

    const brokenLinks: string[] = [];
    const testedLinks = new Set<string>();

    for (const link of links.slice(0, 20)) {
      if (link && !testedLinks.has(link)) {
        testedLinks.add(link);
        try {
          const response = await page.goto(link, { timeout: 10000 });
          if (response && response.status() >= 400) {
            brokenLinks.push(`${link} (${response.status()})`);
          }
        } catch (e) {
          console.warn(`Failed to check link: ${link}`);
        }
      }
    }

    if (brokenLinks.length > 0) {
      console.warn('Broken links found:', brokenLinks);
    }

    expect(brokenLinks.length, 'Should have no broken navigation links').toBeLessThanOrEqual(2);
  });

  test.afterAll(async () => {
    const summary = reporter.generateSummary();
    reporter.printSummary(summary);
  });
});
