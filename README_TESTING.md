# Finatrades Platform Audit Testing

This document describes how to run the comprehensive automated platform audit test system.

## Overview

The AUTO PLATFORM AUDIT system validates:
- All USER site routes/pages load correctly
- All ADMIN site routes/pages load correctly  
- All primary UI components are functional
- All API endpoints respond correctly
- Console errors, network errors, broken navigation detection
- Accessibility checks with axe-core

## Prerequisites

1. Node.js 18+ installed
2. Playwright browsers installed: `npx playwright install`

## Environment Variables

Create a `.env.test` file or set these environment variables:

```env
# Base URLs
USER_BASE_URL=http://localhost:5000
ADMIN_BASE_URL=http://localhost:5000/admin
API_BASE_URL=http://localhost:5000/api

# Test Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
TEST_ADMIN_EMAIL=admin@finatrades.com
TEST_ADMIN_PASSWORD=adminpassword123
```

## Running Tests

### Full Platform Audit
```bash
npx playwright test
```

### UI Tests Only (User + Admin)
```bash
npx playwright test tests/e2e
```

### API Tests Only
```bash
npx playwright test tests/api
```

### Navigation Crawler
```bash
npx playwright test tests/e2e/navigation-crawler.spec.ts
```

### View HTML Report
```bash
npx playwright show-report test-results/html-report
```

## Test Structure

```
tests/
├── e2e/
│   ├── user.spec.ts           # User site route tests
│   ├── admin.spec.ts          # Admin site route tests
│   └── navigation-crawler.spec.ts  # Auto-discovery crawler
├── api/
│   └── api.spec.ts            # API endpoint tests
└── utils/
    ├── auth.ts                # Authentication helpers
    ├── crawl.ts               # Route discovery crawler
    ├── assertions.ts          # Page audit assertions
    └── report.ts              # Summary report generator
```

## Report Artifacts

After running tests, find results in:

| Artifact | Location |
|----------|----------|
| HTML Report | `test-results/html-report/index.html` |
| JSON Results | `test-results/test-results.json` |
| Audit Summary | `test-results/audit-summary.json` |
| Discovered Routes | `test-results/discovered-routes.json` |
| User Session | `test-results/user.storageState.json` |
| Admin Session | `test-results/admin.storageState.json` |
| Screenshots | `test-results/artifacts/` |
| Videos | `test-results/artifacts/` |
| Traces | `test-results/artifacts/` |

## What Gets Tested

### User Routes
- `/` - Homepage
- `/dashboard` - User dashboard
- `/finavault` - Gold vault
- `/finapay` - Payment system
- `/bnsl` - Buy Now Sell Later
- `/finabridge` - Trade finance
- `/profile` - User profile
- `/notifications` - Notifications
- `/transactions` - Transaction history
- `/referral` - Referral program
- `/help` - Help center

### Admin Routes
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/kyc` - KYC approvals
- `/admin/transactions` - Transaction oversight
- `/admin/wallets` - Wallet management
- `/admin/settings` - Platform settings
- `/admin/reports` - Financial reports
- `/admin/support` - Support tickets
- `/admin/security` - Security settings

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/login` - Authentication
- `GET /api/user` - Current user
- `GET /api/gold-price` - Gold price
- `GET /api/wallet` - Wallet balance
- `GET /api/transactions` - Transaction list
- `GET /api/platform-config` - Platform configuration

## Audit Summary

The test suite generates a comprehensive summary including:
- Total routes tested (user/admin)
- Total elements clicked
- Failure breakdown (console/network/navigation/API errors)
- List of failing routes with errors
- List of failing API endpoints
- Pass rate percentage

## CI Integration

The tests are configured to run in CI environments:
- Retries: 2 (CI) / 1 (local)
- Workers: 1 (CI) / auto (local)
- Web server auto-starts if not running
- Traces captured on first retry
- Videos/screenshots on failure

## Troubleshooting

### Tests fail to login
1. Ensure test credentials exist in the database
2. Check that the server is running
3. Verify BASE_URL is correct

### Timeout errors
1. Increase timeout in `playwright.config.ts`
2. Check network connectivity
3. Ensure server is not overloaded

### Missing browsers
```bash
npx playwright install
```

### View failed test traces
```bash
npx playwright show-trace test-results/artifacts/<trace-file>.zip
```
