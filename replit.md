# Finatrades Platform

## Overview

Finatrades is a gold-backed digital financial platform offering integrated services for personal and business users. Its core purpose is to enable users to buy, sell, store, and trade physical gold through digital wallets. Key capabilities include secure gold storage (FinaVault), digital gold transactions (FinaPay), deferred gold sales (BNSL), trade finance (FinaBridge), gold-backed card spending (FinaCard), and a Verifiable Credentials System. The platform aims to provide a robust and versatile digital financial ecosystem centered around gold as an asset.

## User Preferences

Preferred communication style: Simple, everyday language.
System Reports Email: System@finatrades.com. All system-generated reports (security audits, CSRF reports, compliance reports, etc.) should be sent to this email address.

## Branding Requirements (MANDATORY)

**Finatrades Logo — Center-Top Placement Rule:**
Every Certificate (Digital Ownership, Physical Storage, Conversion, and any future cert types), every Document (PDF exports, reports, statements), and every Email template MUST display the Finatrades logo prominently at the center-top. This is a non-negotiable brand standard.
- Logo placement: horizontally centered, top of the document/certificate/email body
- Apply to: all certificate modal views, PDF/print renderings, email HTML templates, regulatory reports, account statements, and any other document output
- Use the official Finatrades brand mark with brand purple (#8A2BE2) and gold (#D4AF37) color scheme
- When implementing any new certificate, document, or email feature, always include the logo header as the first design step

## System Architecture

The platform employs a client-server architecture with a React frontend and an Express Node.js backend, utilizing PostgreSQL for data persistence.

**Core Calculation Rule - GOLD-ONLY COMPLIANCE:**
All balances, ledgers, wallets, locks, and certificates exclusively record gold grams. USD values are dynamically computed and displayed as "≈ equivalent" with a disclaimer that gold is the real balance. Historical transactions may store USD for audit purposes.

**Frontend:**
- **Frameworks**: React 18 with TypeScript, Vite, Wouter, React Context API, shadcn/ui, Tailwind CSS v4, TanStack React Query, Framer Motion.
- **Real-time**: Socket.IO client for live features and event-driven data synchronization.
- **UI/UX Design**: Premium fintech dashboard with purple brand (#8A2BE2) and gold accents (#D4AF37) using Inter font family. Features glassmorphism cards (glass-card-elevated), holographic shimmer effects, animated gradient borders, and staggered entrance animations. Dashboard uses 3-column layout (Hero Balance+Wallets | Stats | FinaCard+Chart) with activity table below. CSS utilities include hover-lift, glow-border-hover, mesh-gradient, holo-shimmer, gold-shimmer. Reduced-motion and focus-visible accessibility supported.

**Backend:**
- **Technology**: Node.js with Express, TypeScript (ESM).
- **API**: RESTful endpoints and Socket.IO server for real-time functionality.
- **Authentication**: Session-based with Argon2id hashing and multi-tier KYC levels.
- **Authorization**: Role-Based Access Control (RBAC) enforced on all admin routes with a granular permission matrix.
- **Database Access**: Drizzle ORM with PostgreSQL.
- **Job Queues**: BullMQ for background processing.
- **Observability**: Pino for logging and OpenTelemetry for distributed tracing.
- **Security Hardening**: HTTPS, Helmet.js, CSRF protection, request sanitization, idempotency, rate limiting, secure session management, PII handling, and PASETO v4 for internal service authentication.

**Deposit Architecture — Golden Rule:**
All deposit approvals (bank transfer, card, crypto, physical gold) must go through the Unified Payment Management (UFM) screen at `/admin/unified-payments`. The UFM creates: (1) Physical Storage Certificate (issuer: Wingold & Metals DMCC), (2) Digital Ownership Certificate (issuer: Finatrades Finance SA), (3) unified_tally_transaction record, and credits the user's MPGW (wallet.goldGrams) or FPGW batch. Old individual deposit approval handlers enforce the Golden Rule by redirecting to UFM. The old crypto approval handler (`/api/admin/crypto-payments/:id/approve`) also creates both certificates as a fallback path. FinaVault certificates page shows certificates from ALL deposit types.

**Gold Wallet Types:**
- **MPGW (Market Price Gold Wallet)** = `vault_ownership_summary.mpgwAvailableGrams` — liquid gold valued at live market price. Regular deposits credit here.
- **FPGW (Fixed Price Gold Wallet)** = `fpgw_batches` table — gold locked at a specific price, protects against market fluctuation. Admin can select LGPW/FGPW at deposit approval time in UFM.
- **MPGW → FPGW Lock**: Users can lock MPGW gold at the current market price via `POST /api/wallet/mpgw-to-fpgw` (or `/api/dual-wallet/transfer` with `fromWalletType='LGPW'`). Creates a new `fpgw_batch` record at the live gold price.
- **FPGW → MPGW Unlock**: Users can unlock FPGW gold back to market price via `POST /api/wallet/fpgw-to-mpgw` (or `/api/dual-wallet/transfer` with `fromWalletType='FGPW'`). Consumes FIFO batches and credits MPGW.
- Both operations create `Swap` type transactions with `sourceModule='dual-wallet'` and vault ledger entries with actions `LGPW_To_FGPW` / `FGPW_To_LGPW`.
- Transaction history displays these as "Price Protection Activated" and "Price Protection Removed" with smart subtitles per transaction type.
- **BNSL Wallet** = `bnsl_wallets` table — gold transferred from FinaPay for BNSL plans (available + locked sub-balances).
- **FinaBridge** = `vault_ownership_summary.finaBridgeAvailableGrams` — gold reserved for trade finance.
- **FinaCard** = `finacard_accounts.goldGrams` — gold backing the physical card.

**Key Features:**
- **Transaction Architecture**: `unified_tally_transactions` (UTT) table as the primary source for all deposit/credit transactions, replacing legacy systems.
- **KYC System**: Supports tiered verification with versioned submissions, section-wise review (approve/reject with reason codes), and audit trails for all decisions.
- **FinaCard System**: Gold-backed debit card with full lifecycle management (application, approval, activation, spending simulation), separate gold balance, and comprehensive admin controls.
- **Custom Finatrades ID System**: Allows users to set a personalized ID for alternative passwordless OTP-based login.
- **Verifiable Credentials System (W3C VC 2.0)**: Automatic VC issuance on KYC approval, signed with RS256 JWT, and compliant with FATF/eIDAS 2.0.
- **Centralized Platform Configuration**: All fees, limits, and system settings managed via a database table and admin interface.
- **Email Notification Management**: Comprehensive system with user preferences and audit logs, including automated monthly account statements.

**Data Storage:**
- Two-database architecture: AWS RDS PostgreSQL for production (SSL/TLS) and Replit PostgreSQL for development/backup, with hourly backup sync.

## External Dependencies

**Database:**
- PostgreSQL
- Drizzle ORM
- connect-pg-simple

**UI Framework:**
- Radix UI
- shadcn/ui
- Lucide React

**Real-time Communication:**
- Socket.IO

**Build & Development:**
- Vite
- esbuild
- TypeScript

**Validation:**
- Zod
- drizzle-zod
- @hookform/resolvers

**Gold Price API:**
- Metals-API.com (Copper Pack) with caching and fallback mechanisms.

**Mobile App:**
- Capacitor (for iOS and Android builds).

## Demo Users

50 demo users are seeded via `scripts/demo-seeder.ts` (run: `npx tsx scripts/demo-seeder.ts`). Password for all: `Demo@2025!`

- **demo1-3@finatrades.com**: Admin accounts (Super Admin RBAC). Must log in via `/admin/login`.
- **demo4-13@finatrades.com**: Business accounts (FinaBridge-enabled).
- **demo14-50@finatrades.com**: Personal accounts.
- KYC pattern: indices 0,1,2,5,6,7,10,11,12... = Approved; 3,8,13... = Not Started; 4,9,14... = Rejected.

**RBAC Setup**: Admin users require entries in both `employees` table (with `rbacRoleId`) and `user_role_assignments` table (linked to `admin_roles`). The seeder dynamically resolves the Super Admin role ID from `admin_roles`.