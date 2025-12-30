# Finatrades Attack Surface Map

**Date:** 2025-12-30  
**Platform:** Gold-backed fintech platform with digital wallet, vault storage, P2P transfers, and trade finance

## Attack Surface Summary

| Category | Endpoints | Auth Required | Attack Priority |
|----------|-----------|---------------|-----------------|
| Total API Routes | 533 | 396 (74%) | - |
| Money Movement | 25+ | Yes | CRITICAL |
| Admin Actions | 150+ | Admin Only | HIGH |
| User Data (IDOR targets) | 100+ | User/Admin | HIGH |
| Public Endpoints | 137 | No | MEDIUM |

## Critical Attack Paths (Fastest Path to Money)

### 1. Direct Money Theft
```
ENTRY: POST /api/withdrawals
EXPLOIT: Double-submit, negative amounts, race condition
ESCALATION: Drain wallet, overdraw
PROFIT: Steal gold/USD from platform
```

### 2. Account Takeover
```
ENTRY: POST /api/auth/login, /api/auth/forgot-password
EXPLOIT: Brute force, OTP bypass, password reset abuse
ESCALATION: Access victim's wallet
PROFIT: Transfer victim's gold to attacker
```

### 3. Admin Privilege Escalation
```
ENTRY: POST /api/admin/* 
EXPLOIT: Missing auth check, role bypass
ESCALATION: Approve own deposits, manipulate ledger
PROFIT: Create money from nothing
```

### 4. Transaction Manipulation
```
ENTRY: POST /api/transactions, /api/peer-transfers
EXPLOIT: IDOR, amount manipulation, status tampering
ESCALATION: Modify transaction records
PROFIT: Alter gold amounts in your favor
```

## High-Value Endpoints

### Authentication (Identity Attacks)
- `POST /api/auth/register` - Rate limited: 10/15min
- `POST /api/auth/login` - Rate limited: 10/15min
- `POST /api/auth/verify-email` - Rate limited: 5/5min (OTP)
- `POST /api/auth/forgot-password` - Rate limited: 5/hour
- `POST /api/auth/reset-password` - Rate limited: 5/hour
- `POST /api/mfa/verify` - Challenge-based (5 attempts)
- `POST /api/biometric/login` - Device-bound

### Money Movement (Critical)
- `POST /api/transactions` - Idempotency protected
- `POST /api/deposit-requests` - Idempotency protected
- `POST /api/withdrawal-requests` - Idempotency protected, rate limited
- `POST /api/peer-transfers` - Idempotency protected
- `POST /api/bnsl/plans` - Idempotency protected
- `POST /api/buy-gold/submit` - Idempotency protected

### Admin Actions (High Value)
- `PATCH /api/admin/deposit-requests/:id/approve`
- `PATCH /api/admin/withdrawal-requests/:id/approve`
- `POST /api/admin/wallet-adjustments`
- `POST /api/admin/backups/:id/restore`
- `DELETE /api/admin/backups/:id`

### IDOR Targets
- `GET /api/dashboard/:userId`
- `GET /api/wallets/:userId`
- `GET /api/transactions/:userId`
- `GET /api/certificates/:userId`
- `GET /api/kyc/:userId`

## Security Controls Observed

### Rate Limiting
- Auth: 10 req/15min
- OTP: 5 req/5min
- Password reset: 5 req/hour
- Withdrawals: 10 req/hour
- General API: 100 req/min

### Authentication
- Session-based with PostgreSQL store
- MFA with TOTP and backup codes
- Session regeneration on login (session fixation protection)
- bcrypt password hashing (cost factor 12)

### Authorization
- `ensureAuthenticated` - Session check
- `ensureOwnerOrAdmin` - Ownership + admin fallback
- `ensureAdminAsync` - Admin role + admin portal flag + active employee
- `requirePermission` - Granular permission check

### Input Validation
- Zod schemas for request bodies
- File upload: MIME + extension validation
- 10MB file size limit

### Protection Mechanisms
- Helmet security headers
- CSRF protection via custom header
- Idempotency keys for payments
- DOMPurify for HTML sanitization
