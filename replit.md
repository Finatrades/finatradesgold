# Finatrades Platform

## Overview

Finatrades is a gold-backed digital financial platform offering integrated services for personal and business users. Its core purpose is to enable users to buy, sell, store, and trade physical gold through digital wallets. Key capabilities include secure gold storage (FinaVault), digital gold transactions (FinaPay), deferred gold sales (BNSL), trade finance (FinaBridge), and upcoming debit card functionality (FinaCard). The platform aims to provide a robust and versatile digital financial ecosystem centered around gold as an asset.

## User Preferences

Preferred communication style: Simple, everyday language.
System Reports Email: System@finatrades.com. All system-generated reports (security audits, CSRF reports, compliance reports, etc.) should be sent to this email address.

## System Architecture

The platform employs a client-server architecture with a React frontend and an Express Node.js backend, utilizing PostgreSQL for data persistence.

**Core Calculation Rule - GOLD-ONLY COMPLIANCE:**
All balances, ledgers, wallets, locks, and certificates exclusively record gold grams. USD values are dynamically computed and displayed as "≈ equivalent" with a disclaimer that gold is the real balance. Historical transactions may store USD for audit purposes.

**Frontend:**
- **Frameworks**: React 18 with TypeScript, Vite, Wouter (routing), React Context API (state), shadcn/ui (components), Tailwind CSS v4, TanStack React Query (data fetching), Framer Motion (animations).
- **Real-time**: Socket.IO client for live features.
- **Data Sync**: Event-driven architecture using Socket.IO `ledger:sync` events to invalidate React Query caches via a `DataSyncProvider`.

**Backend:**
- **Technology**: Node.js with Express, TypeScript (ESM).
- **API**: RESTful endpoints.
- **Authentication**: Session-based with Argon2id hashing (OWASP recommended, bcrypt backward compatible).
- **Real-time**: Socket.IO server.
- **Database Access**: Drizzle ORM with PostgreSQL.
- **Job Queues**: BullMQ for reliable background job processing (settlements, emails, PDFs).
- **Logging**: Pino high-performance structured logging with sensitive data redaction.
- **Tracing**: OpenTelemetry distributed tracing for observability.

**Security Hardening:**
- HTTPS enforcement, Helmet.js for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- CSRF protection via double-submit cookie pattern with `x-csrf-token` header validation.
- Authenticated access required for `/uploads` directory.
- Request sanitization (`sanitizeRequest` middleware) and idempotency middleware for critical payment routes using Redis.
- Rate limiting on sensitive endpoints (auth, OTP, password reset, withdrawals, general API).
- PostgreSQL-backed session store with secure cookie flags and session rotation.
- PII handling includes Argon2id for password hashing (with bcrypt migration support), authenticated access for KYC documents, environment variables for API keys, and audit logging.
- Banking-grade token authentication with PASETO v4 (more secure than JWT for internal services).

**Production Security (Jan 2026):**
- **HTTPS Enforcement**: Automatic redirect via X-Forwarded-Proto in production
- **API Rate Limiting**: Global 100 req/min on /api, stricter limits on auth/OTP/withdrawals
- **Error Handling**: 5xx errors return generic message in production, no stack traces exposed
- **Database SSL**: AWS RDS requires CA bundle verification in production, fails securely if missing
- **Logging**: No sensitive data (passwords, tokens, secrets) logged
- **Session Security**: PostgreSQL store, secure cookies, httpOnly, sameSite=lax

**Data Storage (2-Database Architecture):**
- **Production Database**: AWS RDS PostgreSQL with SSL/TLS (CA bundle required).
- **Development/Backup Database**: Replit PostgreSQL.
- **Schema**: Defined in `shared/schema.ts`, shared across client and server.
- **Safety**: Hourly backup sync from AWS Production to Replit PostgreSQL (configurable), manual backup scripts, and safety guards for destructive operations.

**Transaction Architecture (Jan 2026):**
- **Single Source of Truth**: `unified_tally_transactions` (UTT) table is the PRIMARY source for all deposit/credit transactions.
- **Legacy Table Deprecated**: The `transactions` table is NO LONGER written to for new deposits. Existing code that called `storage.createTransaction()` has been removed.
- **User Transaction History**: The `/api/user/unified-transactions` endpoint derives transaction history from UTT + `physical_deposit_requests` (for pending physical deposits).
- **Physical Deposit Flow**: `physical_deposit_requests` → inspection → negotiation (if RAW) → UTT approval → wallet credit + certificates.
- **Admin Views**: UFM uses UTT, Vault Operations uses `vault_ledger_entries`, and both share transaction visibility.

**Authentication & Authorization:**
- Email/password authentication with mandatory email verification (OTP).
- **Login Gating**: Unverified users are blocked from logging in until email is verified (returns 403 with `requiresEmailVerification: true`).
- Session storage in PostgreSQL.
- Roles: `user` and `admin`.
- Admin accounts must use `/admin/login` portal (blocked from regular login endpoint).
- Multi-tier KYC levels (Not Started, In Progress, Approved, Rejected).

**KYC System:**
Supports `kycAml` (tiered verification) and `Finatrades` (personal info + documents + liveness) modes, configurable via admin settings.

**Custom Finatrades ID System (January 2026):**
- Users can set a personalized Finatrades ID (format: FT-YOURNAME, 4-15 alphanumeric characters)
- Finatrades ID enables passwordless OTP-based login as an alternative to email/password
- **Database Columns**: `customFinatradesId`, `customFinatradesIdChangedAt`, `finatradesIdOtp`, `finatradesIdOtpExpiry`, `finatradesIdOtpAttempts`
- **API Endpoints**: `/api/finatrades-id/check-availability`, `/api/finatrades-id/set`, `/api/finatrades-id/info`, `/api/auth/finatrades-id-login`, `/api/auth/finatrades-id-verify`
- **Security**: 5-minute OTP expiry, 3 attempts before requiring new OTP, 5-attempt 15-minute lockout, reserved word filtering
- **Change Limit**: Users can only change their ID once every 30 days
- **Frontend**: Settings page includes ID customization section; Login page has toggle between email/password and Finatrades ID login methods

**Verifiable Credentials System (W3C VC 2.0 - January 2026):**
- **Standard**: W3C Verifiable Credentials Data Model 2.0 compliant
- **Signing**: RS256 JWT with `typ: "vc+ld+jwt"` header per VC 2.0 §4.4
- **Issuer DID**: `did:web:finatrades.com`
- **Database Tables**: `verifiable_credentials`, `credential_revocations`, `credential_presentations`
- **Auto-Issuance**: VC automatically issued on KYC approval
- **SSO Integration**: SSO tokens include credential reference (id + endpoints), not raw JWT
- **Partner Fetch**: Secure endpoint at `/api/vc/partner/credential/:id` with Bearer token auth
- **Status Check**: Public API at `/api/vc/status/:id` for revocation/expiry checks
- **JWKS**: Public key distribution at `/api/.well-known/jwks.json`
- **Audit Trail**: All credential presentations logged in `credential_presentations` table
- **Environment Variables Required**: `SSO_PRIVATE_KEY`, `SSO_PUBLIC_KEY`, `WINGOLD_PARTNER_API_KEY`
- **Compliance**: Designed for FATF/eIDAS 2.0 regulatory requirements with selective disclosure

**Centralized Platform Configuration:**
All fees, limits, and system settings are managed via a `platform_config` database table and an admin interface. Settings are exposed to the frontend via `PlatformContext`.

**Email Notification Management:**
Comprehensive system with toggleable `email_notification_settings` and `email_logs` for audit trails. Admin interface for management and history.

**Monthly Summary Emails (January 2026):**
- Automated monthly account statements sent during first 5 days of each month
- User preference toggle in Settings (default enabled via `user_preferences.monthlySummaryEmails`)
- Data sourced from `vault_ledger_entries.balanceAfterGrams` for accurate opening/closing balances
- External transactions only: Deposit, Withdrawal, Transfer_Send, Transfer_Receive (excludes internal BNSL/FinaBridge transfers)
- Idempotency via emailLogs with `monthly_summary_{yyyy-MM}` notification type
- Scheduler: `server/monthly-summary-processor.ts` with hourly check + startup catch-up

**Live Chat Support System (February 2026):**
- **Three-Tier Priority System**: normal, high (frustration detected), urgent (security concerns)
- **Security Escalation**: Auto-detects keywords (fraud, hacked, stolen, unauthorized, phishing, scam, compromised, suspicious transaction) → URGENT priority with instant agent handoff
- **Sentiment Detection**: Single frustration keyword (useless, terrible, worst, horrible, angry, frustrated, ridiculous, unacceptable, waste of time) → HIGH priority escalation
- **Context Transfer**: Full handoff context passed to human agents includes userId, userName, goldBalance, vaultGold, kycStatus, chatHistory, escalationReason, priority, sentiment, securityConcern, detectedIssues
- **Human Handoff**: Visible "Speak to Agent" button, escalation workflow in FloatingAgentChat.tsx
- **CSRF Exempt**: Public chatbot endpoints (`/api/chatbot/message`, `/api/chatbot/feedback`) exempt from CSRF protection for widget access
- **Files**: `server/chatbot-service.ts` (FAQ + AI logic), `client/src/components/FloatingAgentChat.tsx` (UI), `client/src/pages/admin/AdminChat.tsx` (admin panel)

**UI/UX Design:**
- **Theme**: Purple gradient aesthetic (light mode).
- **Design Tokens**: Centralized in `client/src/index.css` using CSS variables.
- **Color Palette**: Primary purple (`#8A2BE2`), dark purple, light purple, pink accent, header gradient.
- **Typography**: Inter font family.
- **Component Patterns**: Standardized sidebar, cards, buttons, and status badges using defined tokens. Custom purple/pink gradient scrollbar.

## External Dependencies

**Database:**
- PostgreSQL
- Drizzle ORM
- connect-pg-simple (PostgreSQL session store)

**UI Framework:**
- Radix UI
- shadcn/ui
- Lucide React (Icon library)

**Real-time Communication:**
- Socket.IO

**Build & Development:**
- Vite (frontend)
- esbuild (server-side bundling)
- TypeScript

**Validation:**
- Zod
- drizzle-zod
- @hookform/resolvers

**Payment Integrations:**
- Binance Pay (crypto payments via API and webhooks)

**Gold Price API:**
- Metals-API.com (Copper Pack) with smart caching, usage-based throttling, ETag support, and fallback chain (gold-api.com, last known price).

**Mobile App (Capacitor):**
- Configured for iOS and Android builds with various Capacitor plugins (camera, push-notifications, haptics, status-bar, splash-screen, filesystem, preferences).

## Documentation

**Core Business Logic:**
- See `docs/CORE_LOGIC.md` for detailed explanation of:
  - Gold-First Principle (gold is the only stored value, USD is calculated)
  - Add Funds flow and pending request visibility
  - Chain of Custody (2-step: Physical Storage → Digital Recording)
  - Golden Rule (no wallet credit without physical gold + certificate)
  - Universal Bank Rule (fees deducted from deposit)
  - Ledger entry types and certificate types
  - Admin approval atomic steps