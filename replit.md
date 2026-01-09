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
- **Authentication**: Session-based with bcrypt hashing.
- **Real-time**: Socket.IO server.
- **Database Access**: Drizzle ORM with PostgreSQL.

**Security Hardening:**
- HTTPS enforcement, Helmet.js for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- CSRF protection via double-submit cookie pattern with `x-csrf-token` header validation.
- Authenticated access required for `/uploads` directory.
- Request sanitization (`sanitizeRequest` middleware) and idempotency middleware for critical payment routes using Redis.
- Rate limiting on sensitive endpoints (auth, OTP, password reset, withdrawals, general API).
- PostgreSQL-backed session store with secure cookie flags and session rotation.
- PII handling includes bcrypt for passwords, authenticated access for KYC documents, environment variables for API keys, and audit logging.

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

**Authentication & Authorization:**
- Email/password authentication with mandatory email verification (OTP).
- Session storage in PostgreSQL.
- Roles: `user` and `admin`.
- Multi-tier KYC levels (Not Started, In Progress, Approved, Rejected).

**KYC System:**
Supports `kycAml` (tiered verification) and `Finatrades` (personal info + documents + liveness) modes, configurable via admin settings.

**Centralized Platform Configuration:**
All fees, limits, and system settings are managed via a `platform_config` database table and an admin interface. Settings are exposed to the frontend via `PlatformContext`.

**Email Notification Management:**
Comprehensive system with toggleable `email_notification_settings` and `email_logs` for audit trails. Admin interface for management and history.

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