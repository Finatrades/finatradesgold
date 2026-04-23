# Threat Model — FinaTrades

**Produced by:** Full three-layer security audit (dependency scan, SAST, HoundDog data-flow analysis)
**Scan artifacts:** `.local/security-scan-results/` (dependency-audit-report.md, sast-scan-report.md, hounddog-scan-report.md)
**Vulnerability files:** `.local/potential_vulnerabilities/`

---

## Project Overview

FinaTrades is a gold-backed digital finance platform built on Node.js/Express with a React frontend and PostgreSQL database. Users can buy and store physical gold digitally, send gold-backed payments (FinaPay), conduct import/export trade finance (FinaBridge), obtain FinaCard prepaid accounts, complete KYC verification, and access gold-backed lending (BNSL).

**Tech stack:** Node.js/Express, React (Vite), PostgreSQL (Drizzle ORM), Express sessions (pg-backed), bcryptjs, PASETO tokens, multer (Cloudflare R2/local uploads), Nodemailer/SMTP (Brevo), Groq/GPT-4o Vision (KYC OCR), Metals-API (gold price), Stripe/Binance Pay/NGenius (payments), Helmet, express-rate-limit, Redis (idempotency).

**User roles:** Retail individuals (personal KYC), business entities (corporate KYC), platform admins/reviewers (separate `/admin/login` portal with `adminPortal: true` session flag), and super-admins.

---

## Assets

### User Credentials & Sessions
Email/password pairs (bcrypt hashes), session tokens (PostgreSQL-backed), TOTP secrets (for MFA), backup codes, and step-up auth tokens. Compromise grants full account access, enabling fund theft, identity impersonation, and trading manipulation.

### Financial Balances & Transaction Records
Gold gram balances (in `wallets` table with `finacard_gold_grams` and other wallet types), USD/fiat equivalents, FinaBridge trade escrows, and FinaPay transfer records. These represent the core monetary assets of the platform. Unauthorised modification constitutes financial fraud.

### KYC Documents & Identity Data
Passport scans, national ID images, proof of address, company incorporation documents, UBO declarations, and OCR-extracted biographic data. Governed by GDPR and CCPA. Unauthorised exposure is a regulatory violation with significant legal liability.

### API Keys & Application Secrets
Groq API key, SMTP credentials (Brevo), Metals-API key, Gold-API key, NGenius API key, Stripe secret key, Cloudflare R2 credentials, PostgreSQL connection string, session signing secret, SSO/SAML private key, PASETO signing key. Compromise of payment provider keys enables fraudulent charges or direct fund diversion.

### Admin Capabilities
The ability to approve/reject KYC, adjust balances, manage platform settings, view all user data, and create/cancel trades. An admin session compromise is equivalent to full platform compromise.

### Gold Price Feed
Real-time gold prices used for all balance calculations, trade valuations, and settlement amounts. A manipulated or poisoned feed could allow users to buy gold at artificially low prices or corrupt settlement calculations.

---

## Trust Boundaries

### Browser ↔ API (Primary boundary)
All user and admin interactions cross this boundary via HTTPS. The browser is untrusted — session tokens authenticate requests, but the server independently authorises every operation. Client-supplied IDs, amounts, and role claims are never trusted without server-side verification.

### User ↔ Admin (Privilege boundary)
Admins log in through `/admin/login` which sets `adminPortal: true` in the session. A regular user session — even with an admin `userRole` — cannot access admin routes without this flag. Role checks are enforced server-side via `ensureAdmin` middleware.

### Authenticated ↔ Public (Auth boundary)
Financial operations, wallet access, KYC submission, FinaBridge, and FinaPay all require authentication. Public routes are limited to marketing pages and the gold price ticker. Enforced by `ensureAuthenticated` middleware on all sensitive routes.

### User ↔ Own Resources (IDOR boundary)
Users may only access their own wallets, transactions, KYC records, and FinaBridge requests. Enforced by `ensureOwnerOrAdmin` middleware comparing `req.params.userId` to `req.session.userId`. Violation is an Insecure Direct Object Reference (IDOR) attack.

### API ↔ Database (Data boundary)
The Express server has full database access via Drizzle ORM. All queries use parameterised statements, preventing SQL injection at this boundary.

### API ↔ External Services (External boundary)
The backend calls Metals-API, Gold-API, Groq, GPT-4o Vision, Brevo SMTP, Stripe, NGenius, Binance Pay, and Cloudflare R2. Credentials are stored in environment variables. SSRF or key leakage would give an attacker control over financial operations or storage.

### File Upload ↔ Storage (Upload boundary)
KYC documents are uploaded via multer with MIME type and extension validation (PDF, DOC, JPEG, PNG; 10 MB limit). Files are stored in Cloudflare R2 (production) or local `uploads/` (dev). The `/uploads` route is session-authenticated.

---

## Threat Analysis (STRIDE)

### Spoofing
FinaTrades authenticates users via bcrypt-hashed passwords with sessions persisted in PostgreSQL. TOTP MFA is available and enforceable for admins. Step-up authentication is required for sensitive operations (large transfers, security setting changes).

**Required guarantees:**
- All protected API endpoints MUST check `req.session.userId` exists; absence returns 401.
- Admin routes MUST additionally check `req.session.adminPortal === true`.
- TOTP secrets MUST be stored encrypted at rest; OTP codes expire after 30 seconds (TOTP window).
- Password reset tokens MUST be single-use, HMAC-signed, and expire within 15 minutes.
- PASETO tokens for service-to-service auth MUST be verified with the stored public key on every use.

### Tampering
Gold balances and trade settlement amounts are computed server-side. The client sends intent (e.g., "buy 5g of gold") while the server independently fetches the current gold price and computes the deduction.

**Required guarantees:**
- Gold purchase/sale amounts MUST be computed from `currentGoldPrice × gramAmount` server-side; client-supplied totals MUST be ignored.
- FinaBridge trade escrow amounts MUST be validated against the locked wallet balance before settlement.
- Idempotency keys (`x-idempotency-key`) MUST be validated against a Redis/DB store to prevent double-spend on network retries.
- CSRF protection (custom `x-requested-with` header + double-submit cookie) MUST be enforced on all state-changing routes.

### Repudiation
All admin actions (KYC approvals, balance adjustments, setting changes) are hashed and written to an audit log table with timestamps and the acting user's ID. Financial transactions are immutably recorded.

**Required guarantees:**
- The audit log MUST be append-only; rows MUST NOT be updatable or deletable by any application role.
- All financial state transitions MUST create a transaction record before the balance is changed.
- Admin login events MUST be logged with IP address and timestamp separately from user logins.

### Information Disclosure
**Identified gaps (confirmed by HoundDog scan):**
- **5 locations** log raw client IP addresses to stdout without anonymisation — violating GDPR Article 5(1)(f): `geo-restriction-middleware.ts:101`, `routes.ts:29033`, `wingold-security.ts:193`, `email.ts:192`, `security-middleware.ts:61`.
- AI service configuration (model name) logged unconditionally in `ocr-service.ts:445`.
- **14 instances** in `KYCReview.tsx` and **4** in `AttachmentsManagement.tsx` render user-submitted data via unencoded HTML template strings, enabling stored XSS that could exfiltrate admin session cookies.

**Required guarantees:**
- API error responses in production MUST NOT include stack traces, database error details, or internal service names.
- KYC document presigned URLs MUST expire within 15 minutes and be scoped to the requesting user's session.
- PII (names, email, gold balances) MUST NOT appear in application logs at any level.
- IP addresses in logs MUST be truncated or hashed in production environments.

### Denial of Service
**Identified gaps (confirmed by SAST + dependency scan):**
- `path-to-regexp@0.1.12` (GHSA-37ch-88jc-xwx2) — crafted URL paths can hang the Express event loop.
- `new RegExp(userInput)` in `CMSManagement.tsx` (lines 1051, 1073, 1193) — admin user could construct catastrophic patterns.

**Required guarantees:**
- Rate limiting MUST be applied to all public and authentication endpoints (current config: 10 auth attempts/15 min, 5 OTP/5 min, 10 withdrawals/hour, 100 general/min).
- File upload size is capped at 10 MB via multer.
- All external API calls MUST have explicit timeouts to prevent event loop starvation.
- `path-to-regexp` MUST be updated to ≥0.1.13 via Express upgrade.

### Elevation of Privilege
**Identified gaps (confirmed by SAST + dependency scan):**
- `lodash@4.17.23` (GHSA-r5fr-rjxr-66jc) — code injection via `_.template` imports key names; fix is lodash 4.18.0.
- `lodash@4.17.23` (GHSA-f23m-r3pf-42rh) — prototype deletion via array path bypass in `_.unset`/`_.omit`; fix is lodash 4.18.0.
- Stored XSS in admin KYC/Attachments pages — a malicious KYC applicant can execute JavaScript in an admin session, achieving full privilege escalation.

**Required guarantees:**
- Admin routes MUST check `req.session.userRole === 'admin'` AND `req.session.adminPortal === true`.
- No client-supplied `role`, `permissions`, or `adminPortal` values MUST ever be written to the session.
- File uploads MUST be served with `Content-Disposition: attachment` to prevent MIME-sniffing execution.
- `dangerouslySetInnerHTML` MUST only be used with DOMPurify-sanitised content in admin pages.
- Lodash MUST be upgraded to 4.18.0 to patch both prototype and code-injection vulnerabilities.

---

## Dependency Vulnerabilities (Full Scanner Output — verbatim from osv-scanner)

Source: `.local/security-scan-results/dependency-audit-report.md`
Summary: 0 critical, 3 high, 3 moderate, 1 low

| Package | Installed | Fixed In | **Scanner Severity** | CVE Aliases | Description |
|---------|-----------|----------|----------|-------------|-------------|
| `path-to-regexp` | 0.1.12 | **0.1.13** | **HIGH** | CVE-2026-4867 | ReDoS via multiple route parameters in a single segment |
| `@xmldom/xmldom` | 0.8.11 | **0.8.12** | **HIGH** | CVE-2026-34601 | XML injection via unsafe CDATA serialization |
| `lodash` | 4.17.23 | **4.18.0** | **HIGH** | CVE-2026-4800 | Code injection via `_.template` imports key names |
| `brace-expansion` | 5.0.3 | **5.0.5** | Moderate | CVE-2026-33750 | Zero-step sequence causes process hang + memory exhaustion |
| `esbuild` | 0.18.20 | **0.25.0** | Moderate | GHSA-67mh-4wv8-2f99 | Dev server CORS allows cross-site request reading |
| `lodash` | 4.17.23 | **4.18.0** | Moderate | CVE-2026-2950 | Prototype deletion via array path bypass in `_.unset`/`_.omit` |
| `nodemailer` | 7.0.11 | **8.0.4** (major) | Low | GHSA-c7w3-x93f-qmm8 | SMTP injection via unsanitized `envelope.size` parameter |

---

## SAST Findings Summary (Main App Only, Excluding Agent Skills)

**Total main-app findings:** 93 (HIGH: 1; MEDIUM: 58; LOW: 34) — scanned with Semgrep; agent skill files excluded.

Note on control status: "Currently enforced" controls are those already implemented in the codebase at time of scan. "Recommended" controls indicate gaps requiring remediation.

| Severity | Rule | Location | Status | Notes |
|----------|------|----------|--------|-------|
| HIGH | `private-key` | `server/sso-routes.ts:38` | **FALSE POSITIVE** | PEM header string template only (not a real key); `// gitleaks:allow` comment present |
| MEDIUM | `html-in-template-string` | `KYCReview.tsx:622-733` (14 instances) | **REAL — Recommended** | User-submitted KYC data rendered as unencoded HTML in admin pages |
| MEDIUM | `html-in-template-string` + `unknown-value-with-script-tag` | `AttachmentsManagement.tsx:164-238` (4 instances) | **REAL — Recommended** | User data in HTML + `<script>` tag context |
| MEDIUM | `detect-non-literal-regexp` | `CMSManagement.tsx:1051,1073,1193` | **REAL — Recommended** | Admin-only; user-controlled RegExp pattern without escaping |
| MEDIUM | `react-href-var` | `Sidebar.tsx:89` | **REAL — Recommended** | Variable href; potential open redirect if not validated |
| LOW | `unsafe-formatstring` | Multiple server files (34 instances) | **REAL — Low priority** | Log format injection via user-controlled strings in console.log calls |

---

## HoundDog Data-Flow Findings Summary

**Total findings:** 38 | **Critical:** 1 (likely false positive — see note) | **Medium:** 5

| Severity | Rule | Location | Status | Finding |
|----------|------|----------|--------|---------|
| CRITICAL | `AUTH-TOKEN` | `ocr-service.ts:445` | **LIKELY FALSE POSITIVE** | HoundDog flagged `console.log(\`Vision model: ${visionModel}\`)` as auth token exposure. `visionModel` is the AI model name string (e.g., `meta-llama/llama-4-scout-17b-16e-instruct`), not a credential. However, unconditional logging of service configuration in production violates GDPR-A5-32 and NIST-800-53; recommend removing in production. |
| MEDIUM | `IP-ADDRESS` | `geo-restriction-middleware.ts:101` | **REAL — Recommended** | Raw IP logged to stdout |
| MEDIUM | `IP-ADDRESS` | `routes.ts:29033` | **REAL — Recommended** | Raw IP logged to stdout |
| MEDIUM | `IP-ADDRESS` | `wingold-security.ts:193` | **REAL — Recommended** | Raw IP logged to stdout |
| MEDIUM | `IP-ADDRESS` | `email.ts:192` | **REAL — Recommended** | Raw IP logged to stdout |
| MEDIUM | `IP-ADDRESS` | `security-middleware.ts:61` | **REAL — Recommended** | Raw IP logged on CSRF mismatch |

---

## Audit Traceability — Finding to Vulnerability File

| Finding | Vulnerability File |
|---------|-------------------|
| path-to-regexp@0.1.12 HIGH ReDoS | `.local/potential_vulnerabilities/dep-path-to-regexp-redos.md` |
| @xmldom/xmldom@0.8.11 HIGH XML injection | `.local/potential_vulnerabilities/dep-xmldom-xml-injection.md` |
| lodash@4.17.23 HIGH code injection | `.local/potential_vulnerabilities/dep-lodash-code-injection.md` |
| lodash@4.17.23 Moderate prototype deletion | `.local/potential_vulnerabilities/dep-lodash-prototype-pollution.md` |
| nodemailer@7.0.11 Low SMTP injection | `.local/potential_vulnerabilities/dep-nodemailer-vulnerability.md` |
| SAST: Unencoded HTML in KYCReview + Attachments | `.local/potential_vulnerabilities/xss-html-template-strings-admin.md` |
| SAST: Non-literal RegExp in CMSManagement | `.local/potential_vulnerabilities/redos-non-literal-regexp-cms.md` |
| HoundDog: AI config logging (ocr-service.ts) | `.local/potential_vulnerabilities/info-disclosure-ocr-api-config-logging.md` |
| HoundDog: IP address logging (5 files) | `.local/potential_vulnerabilities/gdpr-ip-address-logging.md` |

---

## Prioritised Remediation Plan

### Immediate (P1 — before next production deployment)
1. **Upgrade Express** to v4.21.2+ → fixes `path-to-regexp` HIGH ReDoS (`npm install express@latest`)
2. **Upgrade lodash** to 4.18.0 → patches HIGH code injection AND Moderate prototype deletion (`npm install lodash@4.18.0`)
3. **Upgrade `@xmldom/xmldom`** to 0.8.12 → patches HIGH XML injection (`npm install @xmldom/xmldom@0.8.12`)
4. **Add DOMPurify** to `KYCReview.tsx` and `AttachmentsManagement.tsx` → blocks stored XSS admin escalation

### Short-term (P2 — within 2 weeks)
5. **Anonymise IP addresses in logs** → GDPR compliance (truncate or hash before logging)
6. **Guard AI config logging** in `ocr-service.ts` behind `NODE_ENV !== 'production'`
7. **Escape user input** in `CMSManagement.tsx` `RegExp()` calls with `escape-string-regexp`
8. **Upgrade `brace-expansion`** to 5.0.5 (Moderate — zero-step sequence DoS)
9. **Upgrade `nodemailer`** to 8.0.4 (Low severity — SMTP injection; major version, review breaking changes first)

### Ongoing
10. **Enable `npm audit` in CI** to catch new CVEs before deployment
11. **Implement a log scrubber** that redacts PII (email, IP, names, gold amounts) at the transport layer
