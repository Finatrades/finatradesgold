import { Page, expect } from '@playwright/test';

export interface PageAuditResult {
  url: string;
  passed: boolean;
  consoleErrors: string[];
  networkErrors: NetworkError[];
  visibleErrors: string[];
  brokenElements: BrokenElement[];
  loadTime: number;
}

export interface NetworkError {
  url: string;
  status: number;
  statusText: string;
}

export interface BrokenElement {
  selector: string;
  text: string;
  error: string;
}

export async function auditPage(page: Page): Promise<PageAuditResult> {
  const startTime = Date.now();
  const consoleErrors: string[] = [];
  const networkErrors: NetworkError[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  const visibleErrors = await page.$$eval(
    'body',
    (elements) => {
      const errorPatterns = ['Error', 'Something went wrong', 'Unhandled', 'failed to load', '500'];
      const texts: string[] = [];
      elements.forEach(el => {
        const text = el.textContent || '';
        for (const pattern of errorPatterns) {
          if (text.includes(pattern)) {
            const match = text.match(new RegExp(`.{0,50}${pattern}.{0,50}`, 'i'));
            if (match) {
              texts.push(match[0]);
            }
          }
        }
      });
      return texts.slice(0, 5);
    }
  );

  return {
    url: page.url(),
    passed: consoleErrors.length === 0 && networkErrors.length === 0 && visibleErrors.length === 0,
    consoleErrors,
    networkErrors,
    visibleErrors,
    brokenElements: [],
    loadTime
  };
}

export async function assertNoConsoleErrors(page: Page, errors: string[]): Promise<void> {
  const filteredErrors = errors.filter(err => 
    !err.includes('favicon') &&
    !err.includes('DevTools') &&
    !err.includes('[HMR]') &&
    !err.includes('[vite]')
  );
  
  expect(filteredErrors, 'Page should have no console errors').toHaveLength(0);
}

export async function assertNoNetworkErrors(page: Page, errors: NetworkError[]): Promise<void> {
  expect(errors, 'Page should have no 5xx errors').toHaveLength(0);
}

export async function assertPageLoads(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  const title = await page.title();
  expect(title).toBeTruthy();
}

const DANGEROUS_PATTERNS = [
  /delete/i,
  /remove/i,
  /terminate/i,
  /cancel/i,
  /destroy/i,
  /logout/i,
  /sign.?out/i,
  /transfer/i,
  /withdraw/i,
  /submit/i,
  /confirm/i,
  /approve/i,
  /reject/i,
  /send/i,
  /pay/i,
  /buy/i,
  /sell/i,
];

export async function clickSafely(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 5000 });
    
    const isDisabled = await element.isDisabled();
    if (isDisabled) {
      return false;
    }

    // Safety check: avoid clicking destructive elements
    const testId = await element.getAttribute('data-testid').catch(() => '');
    const text = await element.textContent().catch(() => '');
    const ariaLabel = await element.getAttribute('aria-label').catch(() => '');
    const combinedText = `${testId || ''} ${text || ''} ${ariaLabel || ''}`;
    
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(combinedText)) {
        console.log(`[Safety] Skipping potentially destructive element: ${combinedText.slice(0, 50)}`);
        return false;
      }
    }

    await element.scrollIntoViewIfNeeded();
    await element.click({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function findClickableElements(page: Page): Promise<string[]> {
  const selectors = await page.$$eval(
    'button:not([disabled]), [role="button"]:not([disabled]), a[href], [data-testid]',
    (elements) => {
      const dangerousPatterns = [
        /delete/i, /remove/i, /terminate/i, /cancel/i, /destroy/i,
        /logout/i, /sign.?out/i, /transfer/i, /withdraw/i, /submit/i,
        /confirm/i, /approve/i, /reject/i, /send/i, /pay/i, /buy/i, /sell/i
      ];
      
      return elements
        .filter(el => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          
          // Skip potentially destructive elements
          const testId = el.getAttribute('data-testid') || '';
          const text = el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const combinedText = `${testId} ${text} ${ariaLabel}`;
          
          for (const pattern of dangerousPatterns) {
            if (pattern.test(combinedText)) return false;
          }
          
          // Skip form submit buttons
          if (el.tagName === 'INPUT' && el.getAttribute('type') === 'submit') return false;
          if (el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit') return false;
          
          return true;
        })
        .map((el, index) => {
          const testId = el.getAttribute('data-testid');
          if (testId) return `[data-testid="${testId}"]`;
          
          const id = el.getAttribute('id');
          if (id) return `#${id}`;
          
          return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        })
        .slice(0, 50);
    }
  );
  return selectors;
}
