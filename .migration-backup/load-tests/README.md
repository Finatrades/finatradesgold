# Finatrades Load Testing Suite

Scaled-down load testing for the Finatrades platform (500-1000 virtual users).

## Scripts

### 1. Data Seeder (`data-seeder.ts`)
Seeds the database with test data:
- 1,000 test users (85% regular, 10% corporate, 5% admin)
- 1,000 wallets with varying gold balances
- 5,000 transactions (Buy/Sell)
- 500 peer transfers
- 10,000 notifications

**Run:**
```bash
npx tsx load-tests/data-seeder.ts
```

**Test credentials after seeding:**
- Email: `loadtest_user_0@testmail.com`
- Password: `LoadTest123!`

### 2. Load Test (`load-test.ts`)
Steady-state load test with 100 virtual users for 60 seconds.

**Endpoints tested:**
- Health check (5% weight)
- Gold price (20% weight)
- Platform config (10% weight)
- Fees (10% weight)

**Run:**
```bash
npx tsx load-tests/load-test.ts
```

### 3. Stress Test (`stress-test.ts`)
Progressive stress test with 5 phases:

| Phase | Users | Duration |
|-------|-------|----------|
| Warm-up | 50 | 30s |
| Load | 200 | 60s |
| Stress | 500 | 60s |
| Spike | 800 | 30s |
| Recovery | 100 | 30s |

**Run:**
```bash
npx tsx load-tests/stress-test.ts
```

## Expected Output

### Load Test Report
```
================================================================================
LOAD TEST RESULTS
================================================================================

Configuration:
  Virtual Users: 100
  Duration: 60s
  Ramp-up: 10s

Overall Metrics:
  Total Requests: 15,234
  Successful: 15,180 (99.6%)
  Failed: 54
  Throughput: 253.9 req/s

Endpoint Performance:
--------------------------------------------------------------------------------
Endpoint                   Reqs      OK%   Avg(ms)  P95(ms)  Max(ms)
--------------------------------------------------------------------------------
Health Check                762     100%        12       25       89
Gold Price                3,047     100%        45       95      234
Platform Config           1,523      99%        38       85      187
Fees                      1,523     100%        35       78      165
--------------------------------------------------------------------------------
```

### Stress Test Report
```
==========================================================================================
STRESS TEST REPORT
==========================================================================================

Phase Summary:
------------------------------------------------------------------------------------------
Phase           Requests       RPS   Avg(ms)  P95(ms)  Max(ms)    Errors         Status
------------------------------------------------------------------------------------------
Warm-up             2,450     81.7        35       78      156      0.0%           PASS
Load               15,234    253.9        45       95      234      0.3%           PASS
Stress             28,456    474.3        78      156      567      2.1%       DEGRADED
Spike              18,234    607.8       125      287      890      8.5%           FAIL
Recovery            4,567    152.2        45       89      234      0.1%           PASS
------------------------------------------------------------------------------------------

Breaking Point:
  System degraded during "Spike" phase
  Error rate reached 8.5%

RECOMMENDATIONS
==========================================================================================
- Consider adding Redis caching for frequently accessed data
- Monitor database slow query log during production load
- Implement request coalescing for gold price endpoint
```

## SLO Thresholds

| Metric | Target | Critical |
|--------|--------|----------|
| P95 Latency | < 200ms | < 500ms |
| Error Rate | < 1% | < 5% |
| Throughput | > 100 RPS | > 50 RPS |

## Cleanup

To remove test data after testing:
```sql
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest_%');
DELETE FROM peer_transfers WHERE sender_id IN (SELECT id FROM users WHERE email LIKE 'loadtest_%');
DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest_%');
DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest_%');
DELETE FROM users WHERE email LIKE 'loadtest_%';
```
