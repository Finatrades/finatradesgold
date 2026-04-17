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
- **AI Document Verification Engine**: Automated AI fraud detection for trade finance documents (LC, POL, WR). Documents saved with 'AI Review' status are automatically queued for GPT-4o Vision extraction and 6-point fraud scoring (amount consistency, expiry validity, KYC name match, approved bank list, document consistency, AI anomaly detection). Score < 50 → Tier 1 Review; Score ≥ 50 → AI Rejected. Results saved to `trade_documents` table (`ai_fraud_score`, `ai_extracted_data`, `ai_rejection_reason`, `ai_verified_at`). Admin can view full AI reports in the FinaBridge management panel under the "AI Verification" tab. Implemented as a BullMQ worker with 3-attempt exponential backoff (30s/2min/5min), with fallback inline processing when Redis is unavailable.

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

## Form System (Task #43)

**FileUploadZone** (`client/src/components/ui/FileUploadZone.tsx`):
- Reusable drag-and-drop file upload component
- Props: `label`, `description`, `accept`, `maxSizeMB`, `required`, `disabled`, `file`, `onFile`, `testId`
- Features: drag-and-drop, image thumbnail preview, file size/type validation, remove button
- Used in KYC personal document upload step (ID Front, ID Back, Passport, Address Proof)

**Real-time Registration Validation** (`client/src/pages/Register.tsx`, `client/src/components/mobile/MobileRegister.tsx`):
- `touched` state tracks which fields have been interacted with
- `handleFieldChange` / `handleFieldBlur` for per-field inline validation
- Email validates format on blur with regex
- Password strength: 4-segment colored bar (red→orange→yellow→green) with label (Weak/Fair/Good/Strong)
- Confirm password: live match/mismatch indicator with green border
- All fields show errors on submit (marks all as touched)

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
## Design System (April 2026 — Hynex/Stripe overhaul)

### Typography stack
- **Display**: Geist (Google Fonts) — used by all `<h1>`-`<h6>` automatically via `@layer base`
- **Body**: Inter (Google Fonts) — applied to `<body>`
- **Mono**: Geist Mono — for IDs, transaction codes, tabular figures
- CSS tokens: `--brand-display-font-family`, `--brand-mono-font-family`, `--brand-heading-font-family`

### Utility classes (in `client/src/index.css`)
- `.font-display` — Geist with `ss01 cv05` OpenType features for Stripe-quality numerals
- `.font-mono-ui` — Geist Mono with `tnum` (tabular figures)
- `.text-display-{2xl,xl,lg,md,sm}` — Stripe-style sizes (60/48/38/30/24px)
- `.kpi-value` — bold tabular display for hero KPI numbers
- `.kpi-label` — uppercase 11px micro-caps for KPI labels (e.g. "Gold Balance", "Balance in currencies")

### Dark mode
- Full `.dark` token block in `index.css` (deep zinc base #09090B + brand purple #A342FF)
- All glass utilities (`.glass-card`, `.glass-card-elevated`, `.glass-hero`, `.glass-indigo`, `.glass-teal`, `.mesh-light`, `.premium-card`) have `.dark` overrides
- Bulk sweep: ~290+ instances of `bg-white`/`text-gray-{300..900}`/`bg-gray-{50,100,200}`/`border-gray-{100,200,300}` swept across all 43 user-side pages + components → semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`)
- Theme toggle: `client/src/components/ThemeToggle.tsx` (next-themes Sun/Moon)

### Hynex-style micro-polish patterns
- Hero numbers: `kpi-value text-[52px]` with optional gold gradient via `WebkitBackgroundClip: text`
- Section labels: `kpi-label` (replaces ad-hoc `text-[10px]/[11px] font-bold uppercase tracking-widest`)
- Currency strip values: `font-mono-ui text-[13px] font-semibold` for tabular alignment
- Card backgrounds: `bg-card/70 dark:bg-card/50 backdrop-blur-md border-border/60`
- Avoid: animated shimmer top stripes, heavy 3D tilt + glare overlays (visual noise)

### Installed design skills (global, ~/.agents/skills/)
- `wshobson/agents@kpi-dashboard-design` — KPI selection + hierarchy patterns
- `wshobson/agents@tailwind-design-system` — Tailwind design system patterns
- `nextlevelbuilder/ui-ux-pro-max-skill` — 99 UX guidelines, 50+ styles, color palettes
