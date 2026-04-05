# Threat Model — FinaTrades

## Project Overview

FinaTrades is a gold-backed digital finance platform built on Node.js/Express with a React frontend and PostgreSQL database. It allows individuals and businesses to buy, store, and trade physical gold digitally, send gold-backed payments (FinaPay), conduct import/export trade finance (FinaBridge), obtain FinaCard prepaid accounts, complete KYC verification, and access gold-backed lending (BNSL).

**Tech stack:** Node.js/Express, React (Vite), PostgreSQL (Drizzle ORM), Express sessions (pg-backed), bcryptjs, PASETO tokens, multer (R2/local uploads), Nodemailer (SMTP/Brevo), Groq/GPT-4o (KYC OCR), Metals-API (gold price), Stripe/Binance Pay/NGenius (payments), Helmet, express-rate-limit.

**Users:** Retail individuals (personal KYC), business entities (corporate KYC), and platform admins/reviewers (separate admin portal login).

---

## Assets

### User Credentials & Sessions
Email/password pairs, bcrypt hashes, session tokens, TOTP secrets, backup codes, and step-up auth tokens. Compromise grants full account access, enabling fund theft, identity impersonation, and trading manipulation.

### Financial Balances & Transaction Records
Gold gram balances, USD/fiat equivalents, wallet locks, FinaCard balances, BNSL plan states, FinaBridge trade escrows, and FinaPay transfer records. These are the core monetary assets of the platform. Unauthorised modification constitutes fraud.

### KYC Documents & Identity Data
Passport scans, national ID images, proof of address, company incorporation documents, UBO declarations, and extracted biographic data. Governed by GDPR and CCPA. Exposure or leakage is a regulatory violation with significant liability.

### API Keys & Application Secrets
Groq API key, SMTP credentials (Brevo), Metals-API key, Gold-API key, NGenius API key, Stripe secret key, Cloudflare R2 credentials, PostgreSQL connection string, session signing secret, SSO/SAML private key, PASETO signing key. Compromise of payment provider keys enables fraudulent charges or fund diversion.

### Admin Capabilities
Ability to approve/reject KYC, adjust balances, manage platform settings, view all user data, create/cancel trades. Admin session compromise is equivalent to full platform compromise.

### Gold Price Feed
The real-time gold price is used for all balance calculations, trade valuations, and settlement amounts. Manipulation or poisoning of this feed could enable users to buy gold at artificially low prices.

---

## Trust Boundaries

### Browser ↔ API (Primary boundary)
All user and admin interactions cross this boundary via HTTPS. The browser is untrusted — session tokens authenticate requests, but the server must independently authorise every operation. Client-supplied IDs, amounts, and role claims must never be trusted without server-side verification.

### User ↔ Admin (Privilege boundary)
Admins log in through a dedicated `/admin/login` route that sets `adminPortal: true` in the session. A regular user session — even with admin role — cannot access admin routes without this flag. Role checks are enforced server-side via `ensureAdmin` middleware.

### Authenticated ↔ Public (Auth boundary)
Financial operations, wallet access, KYC submission, FinaBridge, and FinaPay all require authentication. Public routes are limited to marketing pages and the gold price ticker. This boundary is enforced by `ensureAuthenticated` middleware on all sensitive routes.

### User ↔ Own Resources (IDOR boundary)
Users must only access their own wallets, transactions, KYC records, and FinaBridge requests. Enforced by `ensureOwnerOrAdmin` middleware that compares `req.params.userId` to `req.session.userId`. Violation would be an IDOR (Insecure Direct Object Reference) attack.

### API ↔ Database (Data boundary)
The Express server has full database access via Drizzle ORM. All queries use parameterised statements. SQL injection at this boundary would expose the entire database.

### API ↔ External Services (External boundary)
The backend calls Metals-API, Gold-API, Groq, GPT-4o, Brevo SMTP, Stripe, NGenius, Binance Pay, and Cloudflare R2. Credentials are stored in environment variables. SSRF or key leakage would give an attacker control over financial operations or storage.

### File Upload ↔ Storage (Upload boundary)
KYC documents are uploaded via multer with MIME type and extension validation. Files are stored in Cloudflare R2 (production) or local `uploads/` (dev). Uploaded content must not be executable and must only be served to authorised requesters.

---

## Threat Categories

### Spoofing
FinaTrades authenticates users via bcrypt-hashed passwords with sessions persisted in PostgreSQL. TOTP MFA is available and enforceable for admins. Step-up authentication is required for sensitive operations (large transfers, security setting changes).

**Required guarantees:**
- All protected API endpoints MUST check `req.session.userId` exists; absence returns 401.
- Admin routes MUST additionally check `req.session.adminPortal === true`.
- TOTP secrets MUST be stored encrypted at rest; OTP codes MUST expire after 30 seconds.
- Password reset tokens MUST be single-use, time-limited (≤15 min), and HMAC-signed.
- PASETO tokens used for service-to-service auth MUST be verified with the stored public key on every use.

### Tampering
Gold balances and trade settlement amounts are calculated server-side. The client sends intent (e.g., "buy 5g of gold") but the server independently looks up the current gold price and computes the deduction. Client-supplied amounts or prices MUST NOT be trusted.

**Required guarantees:**
- Gold purchase/sale amounts MUST be computed from `currentGoldPrice × gramAmount` server-side; client-supplied totals MUST be ignored.
- FinaBridge trade escrow amounts MUST be validated against the locked wallet balance before settlement.
- Idempotency keys (`x-idempotency-key`) MUST be validated against a Redis/DB store to prevent double-spend on network retries.
- CSRF protection (custom header + double-submit cookie) MUST be enforced on all state-changing routes.

### Repudiation
All admin actions (KYC approvals, balance adjustments, setting changes) are hashed and written to an audit log table with timestamps and the acting user's ID. Financial transactions are immutably recorded.

**Required guarantees:**
- The audit log MUST be append-only; rows MUST NOT be updatable or deletable by any application role.
- All financial state transitions (deposit, withdrawal, trade settlement, FinaPay transfer) MUST create a transaction record before the balance is changed.
- Admin login events MUST be logged separately from user logins with IP address and timestamp.

### Information Disclosure
**Current gaps identified:**
- Server logs expose client IP addresses in multiple middleware files (`geo-restriction-middleware.ts`, `security-middleware.ts`, `email.ts`, `routes.ts`, `wingold-security.ts`). Under GDPR, IP addresses are personal data.
- AI model configuration is logged in `ocr-service.ts:445`, revealing implementation details to anyone with log access.
- HTML template strings in `KYCReview.tsx` and `AttachmentsManagement.tsx` construct HTML from user-submitted KYC data without encoding, creating XSS risk that could expose admin session tokens.

**Required guarantees:**
- API error responses in production MUST NOT include stack traces, database error details, or internal service names.
- KYC document presigned URLs MUST expire within 15 minutes and be scoped to the requesting user's session.
- PII (names, email, gold balances) MUST NOT appear in application logs at any level.
- IP addresses in logs MUST be truncated or hashed in production environments.

### Denial of Service
**Current gaps identified:**
- `path-to-regexp@0.1.12` contains a ReDoS vulnerability that can hang the Express event loop on malformed URLs.
- `new RegExp(userInput)` in `CMSManagement.tsx` allows admin users to construct catastrophic patterns.

**Required guarantees:**
- Rate limiting MUST be applied to all public and authentication endpoints (currently configured: 10 auth attempts/15 min, 5 OTP attempts/5 min, 100 general/min).
- File upload size MUST be capped (currently 10MB via multer) and validated before processing.
- All external API calls (gold price, OCR, payment) MUST have explicit timeouts to prevent event loop starvation.
- `path-to-regexp` MUST be updated to the patched version via Express upgrade.

### Elevation of Privilege
**Current gaps identified:**
- `lodash@4.17.23` contains prototype pollution vulnerabilities. If lodash `merge`/`defaultsDeep` is called with user-controlled data, an attacker could inject into `Object.prototype` and potentially bypass property-based auth checks.
- HTML template string injection in admin KYC review pages could allow a malicious KYC applicant to execute JavaScript in an admin session (stored XSS → privilege escalation).

**Required guarantees:**
- All admin routes MUST check `req.session.userRole === 'admin'` AND `req.session.adminPortal === true` server-side.
- No client-supplied `role`, `permissions`, or `adminPortal` values MUST ever be written to the session; these MUST only be set during authenticated login by server-side lookup.
- File uploads MUST be served with `Content-Disposition: attachment` to prevent MIME-sniffing execution of uploaded PDFs as HTML.
- `dangerouslySetInnerHTML` MUST only be used with DOMPurify-sanitised content in admin pages that render user-submitted data.
- Lodash MUST be updated to ≥4.17.21 to patch prototype pollution.

---

## Dependency Vulnerabilities Summary

| Package | Version | CVE | Severity | Impact |
|---------|---------|-----|----------|--------|
| `path-to-regexp` | 0.1.12 | GHSA-37ch-88jc-xwx2 | High | ReDoS — server hang |
| `lodash` | 4.17.23 | GHSA-f23m-r3pf-42rh | High | Prototype pollution |
| `lodash` | 4.17.23 | GHSA-r5fr-rjxr-66jc | High | Prototype pollution |
| `nodemailer` | 7.0.11 | GHSA-c7w3-x93f-qmm8 | High | Email library vulnerability |
| `esbuild` | 0.18.20 | GHSA-67mh-4wv8-2f99 | Moderate | Build-tool only, not runtime |
| `@xmldom/xmldom` | 0.8.11 | GHSA-wh4c-j3r5-mjhp | Moderate | XML parsing (if used in prod) |
| `brace-expansion` | 5.0.3 | GHSA-f886-m6hf-6m8v | Low | Glob pattern matching |

---

## Prioritised Remediation Plan

### Immediate (P1 — before next production deployment)
1. **Upgrade Express** to v4.21.2+ to patch `path-to-regexp` ReDoS
2. **Upgrade lodash** to ≥4.17.21 to patch prototype pollution
3. **Upgrade nodemailer** to latest to address GHSA-c7w3-x93f-qmm8
4. **Add DOMPurify** to KYC Review and Attachments Management admin pages to prevent stored XSS

### Short-term (P2 — within 2 weeks)
5. **Remove or guard IP address logging** in production (truncate or hash IPs)
6. **Remove verbose AI config logging** from `ocr-service.ts` in production
7. **Add `escape-string-regexp`** guard to all `new RegExp(userInput)` calls in CMS Management
8. **Review all `dangerouslySetInnerHTML` usages** and wrap with DOMPurify

### Ongoing
9. **Enable `npm audit` in CI** to catch new CVEs before deployment
10. **Enable log scrubbing** to ensure no PII (names, emails, gold amounts) appears in server logs
