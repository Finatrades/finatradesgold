import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface DiscoveredRoute {
  url: string;
  source: string;
  type: 'link' | 'navigation' | 'button';
}

export interface CrawlResult {
  routes: DiscoveredRoute[];
  timestamp: string;
  baseUrl: string;
}

const DISCOVERED_ROUTES_PATH = 'test-results/discovered-routes.json';

const EXCLUDED_PATTERNS = [
  /logout/i,
  /signout/i,
  /sign-out/i,
  /delete/i,
  /remove/i,
  /^mailto:/,
  /^tel:/,
  /^javascript:/,
  /^#/,
  /\.(pdf|zip|doc|docx|xls|xlsx)$/i,
];

const EXTERNAL_PATTERNS = [
  /^https?:\/\/(?!localhost|127\.0\.0\.1)/,
];

export async function discoverRoutes(page: Page, baseUrl: string): Promise<DiscoveredRoute[]> {
  const discovered: Map<string, DiscoveredRoute> = new Map();

  const links = await page.$$eval('a[href]', (elements) => 
    elements.map(el => ({
      href: el.getAttribute('href') || '',
      text: el.textContent?.trim() || ''
    }))
  );

  for (const link of links) {
    const href = link.href;
    
    if (isExcluded(href) || isExternal(href, baseUrl)) {
      continue;
    }

    const fullUrl = normalizeUrl(href, baseUrl);
    if (fullUrl && !discovered.has(fullUrl)) {
      discovered.set(fullUrl, {
        url: fullUrl,
        source: page.url(),
        type: 'link'
      });
    }
  }

  const navItems = await page.$$eval(
    '[role="button"], [data-testid], button, [aria-label]',
    (elements) => elements.map(el => ({
      testId: el.getAttribute('data-testid') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      text: el.textContent?.trim() || '',
      tagName: el.tagName.toLowerCase()
    }))
  );

  return Array.from(discovered.values());
}

export async function crawlSite(page: Page, startUrl: string, maxPages: number = 50): Promise<CrawlResult> {
  const visited = new Set<string>();
  const toVisit: string[] = [startUrl];
  const allRoutes: DiscoveredRoute[] = [];

  const baseUrl = new URL(startUrl).origin;

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift()!;
    
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const routes = await discoverRoutes(page, baseUrl);
      
      for (const route of routes) {
        if (!allRoutes.some(r => r.url === route.url)) {
          allRoutes.push(route);
          if (!visited.has(route.url) && !toVisit.includes(route.url)) {
            toVisit.push(route.url);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to crawl ${url}:`, error);
    }
  }

  const result: CrawlResult = {
    routes: allRoutes,
    timestamp: new Date().toISOString(),
    baseUrl
  };

  saveDiscoveredRoutes(result);
  return result;
}

function isExcluded(href: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(href));
}

function isExternal(href: string, baseUrl: string): boolean {
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return false;
  }
  try {
    const url = new URL(href, baseUrl);
    const base = new URL(baseUrl);
    return url.origin !== base.origin;
  } catch {
    return false;
  }
}

function normalizeUrl(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    return url.pathname;
  } catch {
    return null;
  }
}

function saveDiscoveredRoutes(result: CrawlResult): void {
  const dir = path.dirname(DISCOVERED_ROUTES_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DISCOVERED_ROUTES_PATH, JSON.stringify(result, null, 2));
}

export function loadDiscoveredRoutes(): CrawlResult | null {
  if (fs.existsSync(DISCOVERED_ROUTES_PATH)) {
    return JSON.parse(fs.readFileSync(DISCOVERED_ROUTES_PATH, 'utf-8'));
  }
  return null;
}
