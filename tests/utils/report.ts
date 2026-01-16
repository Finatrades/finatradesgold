import * as fs from 'fs';
import * as path from 'path';
import { PageAuditResult, NetworkError, BrokenElement } from './assertions';

export interface AuditSummary {
  timestamp: string;
  duration: number;
  totalRoutesTested: {
    user: number;
    admin: number;
  };
  totalElementsClicked: number;
  totalFailures: {
    console: number;
    network: number;
    navigation: number;
    api: number;
  };
  failingRoutes: FailingRoute[];
  failingElements: BrokenElement[];
  failingEndpoints: FailingEndpoint[];
  passRate: number;
}

export interface FailingRoute {
  url: string;
  type: 'user' | 'admin';
  errors: string[];
}

export interface FailingEndpoint {
  method: string;
  path: string;
  status: number;
  error: string;
}

const SUMMARY_PATH = 'test-results/audit-summary.json';

class AuditReporter {
  private startTime: number = Date.now();
  private userRoutes: PageAuditResult[] = [];
  private adminRoutes: PageAuditResult[] = [];
  private elementsClicked: number = 0;
  private failingEndpoints: FailingEndpoint[] = [];

  addUserRouteResult(result: PageAuditResult): void {
    this.userRoutes.push(result);
  }

  addAdminRouteResult(result: PageAuditResult): void {
    this.adminRoutes.push(result);
  }

  incrementElementsClicked(count: number = 1): void {
    this.elementsClicked += count;
  }

  addFailingEndpoint(endpoint: FailingEndpoint): void {
    this.failingEndpoints.push(endpoint);
  }

  generateSummary(): AuditSummary {
    const duration = Date.now() - this.startTime;
    
    const allRoutes = [...this.userRoutes, ...this.adminRoutes];
    const failingRoutes: FailingRoute[] = [];
    const brokenElements: BrokenElement[] = [];
    
    let consoleErrors = 0;
    let networkErrors = 0;
    let navigationErrors = 0;

    for (const route of this.userRoutes) {
      consoleErrors += route.consoleErrors.length;
      networkErrors += route.networkErrors.length;
      brokenElements.push(...route.brokenElements);
      
      if (!route.passed) {
        failingRoutes.push({
          url: route.url,
          type: 'user',
          errors: [...route.consoleErrors, ...route.visibleErrors]
        });
      }
    }

    for (const route of this.adminRoutes) {
      consoleErrors += route.consoleErrors.length;
      networkErrors += route.networkErrors.length;
      brokenElements.push(...route.brokenElements);
      
      if (!route.passed) {
        failingRoutes.push({
          url: route.url,
          type: 'admin',
          errors: [...route.consoleErrors, ...route.visibleErrors]
        });
      }
    }

    const totalTests = allRoutes.length + this.failingEndpoints.length;
    const passedTests = allRoutes.filter(r => r.passed).length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 100;

    const summary: AuditSummary = {
      timestamp: new Date().toISOString(),
      duration,
      totalRoutesTested: {
        user: this.userRoutes.length,
        admin: this.adminRoutes.length
      },
      totalElementsClicked: this.elementsClicked,
      totalFailures: {
        console: consoleErrors,
        network: networkErrors,
        navigation: navigationErrors,
        api: this.failingEndpoints.length
      },
      failingRoutes,
      failingElements: brokenElements,
      failingEndpoints: this.failingEndpoints,
      passRate
    };

    this.saveSummary(summary);
    return summary;
  }

  private saveSummary(summary: AuditSummary): void {
    const dir = path.dirname(SUMMARY_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
    console.log(`\n📊 Audit Summary saved to: ${SUMMARY_PATH}`);
  }

  printSummary(summary: AuditSummary): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 PLATFORM AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${summary.timestamp}`);
    console.log(`⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log(`\n📄 Routes Tested:`);
    console.log(`   User: ${summary.totalRoutesTested.user}`);
    console.log(`   Admin: ${summary.totalRoutesTested.admin}`);
    console.log(`\n🖱️  Elements Clicked: ${summary.totalElementsClicked}`);
    console.log(`\n❌ Failures:`);
    console.log(`   Console Errors: ${summary.totalFailures.console}`);
    console.log(`   Network Errors: ${summary.totalFailures.network}`);
    console.log(`   Navigation Errors: ${summary.totalFailures.navigation}`);
    console.log(`   API Errors: ${summary.totalFailures.api}`);
    console.log(`\n✅ Pass Rate: ${summary.passRate.toFixed(1)}%`);
    
    if (summary.failingRoutes.length > 0) {
      console.log(`\n🚨 Failing Routes:`);
      for (const route of summary.failingRoutes.slice(0, 10)) {
        console.log(`   - ${route.url} (${route.type})`);
      }
    }

    if (summary.failingEndpoints.length > 0) {
      console.log(`\n🚨 Failing Endpoints:`);
      for (const endpoint of summary.failingEndpoints.slice(0, 10)) {
        console.log(`   - ${endpoint.method} ${endpoint.path}: ${endpoint.status}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📁 Report Location: test-results/html-report/index.html');
    console.log('📁 Summary JSON: test-results/audit-summary.json');
    console.log('='.repeat(60) + '\n');
  }
}

export const reporter = new AuditReporter();
export default reporter;
