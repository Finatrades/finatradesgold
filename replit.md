# Finatrades Platform

## Author

**Charan Pratap Singh**  
Contact: +971568474843

## Overview

Finatrades is a gold-backed digital financial platform offering integrated services for personal and business users. Its core purpose is to enable users to buy, sell, store, and trade physical gold through digital wallets. Key capabilities include FinaVault for secure gold storage, FinaPay for digital gold transactions, BNSL (Buy Now Sell Later) for deferred gold sales, FinaBridge for trade finance, and upcoming FinaCard debit card functionality. The platform aims to provide a robust and versatile digital financial ecosystem centered around gold as an asset.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The platform uses a client-server architecture with a React frontend and an Express Node.js backend. Data persistence is handled by PostgreSQL.

**Core Calculation Rule:** All financial calculations are performed in **USD value**, while the underlying asset is **gold (grams)**. USD is used for user input, transaction calculations, and reporting, while gold grams represent the actual owned asset.

**Frontend:**
- **Framework & Libraries**: React 18 with TypeScript, Vite, Wouter for routing, React Context API for state management, shadcn/ui (Radix UI) for components, Tailwind CSS v4 for styling, TanStack React Query for data fetching, Framer Motion for animations.
- **Real-time**: Socket.IO client for live features.
- **Data Sync Strategy**: Event-driven architecture with centralized cache invalidation:
  1. **Socket Events**: Server emits `ledger:sync` events on data changes (wallet updates, transactions, etc.)
  2. **DataSyncProvider** (`client/src/hooks/useDataSync.tsx`): Central listener that maps socket events to React Query invalidation
  3. **Query Key Mapping**: Events auto-invalidate related queries (e.g., `balance_update` invalidates `['dashboard']`, `['wallet']`, `['user']`)
  4. **Deduplication**: Uses `syncVersion` timestamps to prevent duplicate invalidations
  5. **Fallback**: React Query's `refetchOnWindowFocus: true` provides backup sync on tab focus

**Backend:**
- **Technology**: Node.js with Express, TypeScript (ESM modules).
- **API**: RESTful endpoints.
- **Authentication**: Session-based with bcrypt hashing.
- **Real-time**: Socket.IO server.
- **Database Access**: Drizzle ORM with PostgreSQL.

**Data Storage:**
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema**: Defined in `shared/schema.ts`, shared across client and server.
- **Key Entities**: Users, Wallets, Transactions, Vault Holdings, KYC Submissions, BNSL Plans/Payouts, Trade Cases/Documents, Chat Sessions/Messages, Audit Logs.

**Authentication & Authorization:**
- **Method**: Email/password authentication.
- **Session Storage**: PostgreSQL.
- **Roles**: `user` and `admin`.
- **KYC Levels**: Multi-tier status (Not Started, In Progress, Approved, Rejected).

**KYC System:**
- Supports two modes: `kycAml` (tiered verification: Basic, Enhanced, Corporate) and `Finatrades` (personal info + documents + liveness verification). Configurable via admin settings, including country restrictions.

**Centralized Platform Configuration:**
- All fees, limits, and system settings are managed via a `platform_config` database table.
- An admin interface (`/admin/platform-config`) allows management of 12 categories: Gold Pricing, Transaction Limits, Deposits, Withdrawals, P2P Transfers, BNSL, FinaBridge, Payment Methods, KYC, System, Vault Inventory, Referrals.
- Settings are exposed to the frontend via `PlatformContext`.

**Email Notification Management:**
- Comprehensive system with `email_notification_settings` (toggleable types) and `email_logs` (audit trail) tables.
- Admin interface (`/admin/email-notifications`) to manage notification toggles, seed defaults, and view email history/statistics.
- `sendEmail` function logs all attempts.

**UI/UX Design:**
- **Theme**: Purple gradient aesthetic for light mode (rebranded from orange in Dec 2025).
- **Design Tokens**: Centralized in `client/src/index.css` using CSS variables.
- **Color Palette**: 
  - Primary purple: #8A2BE2
  - Dark purple: #4B0082
  - Light purple: #A342FF
  - Pink accent: #FF2FBF
  - Header gradient: from #0D001E via #2A0055 to #4B0082
- **Typography**: Inter font family.
- **Component Patterns**: Standardized sidebar, cards, buttons, and status badges using defined tokens.
- **Custom Scrollbar**: Purple/pink gradient scrollbar styling globally applied.

## External Dependencies

**Database:**
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: For database interactions.
- **connect-pg-simple**: PostgreSQL session store.

**UI Framework:**
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-built component library.
- **Lucide React**: Icon library.

**Real-time Communication:**
- **Socket.IO**: For WebSocket-based chat and notifications.

**Build & Development:**
- **Vite**: Frontend build tool.
- **esbuild**: Server-side bundling.
- **TypeScript**: For full-stack type safety.

**Validation:**
- **Zod**: Schema validation.
- **drizzle-zod**: Zod schemas from Drizzle tables.
- **@hookform/resolvers**: Form validation integration.

**Payment Integrations:**
- **Binance Pay**: Integrated for crypto payments via API and webhooks. Requires `BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET_KEY`, and `BINANCE_PAY_MERCHANT_ID`.

**Mobile App (Capacitor):**
- Configured for iOS and Android builds.
- **Installed Plugins**: `@capacitor/camera`, `@capacitor/push-notifications`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/filesystem`, `@capacitor/preferences`.

## UI Theme Report

### Design Token System

**Primary Token Location**: `client/src/index.css`
- `:root` selector - light mode tokens
- `.dark` selector - dark mode tokens  
- `@theme inline` block - maps CSS vars to Tailwind utility classes

### Token Reference

#### Core Colors
| CSS Variable | Light | Dark | Tailwind | Usage |
|--------------|-------|------|----------|-------|
| `--primary` | #8A2BE2 | #A342FF | `bg-primary` | Brand purple |
| `--background` | #FAFBFF | #0D001E | `bg-background` | Page background |
| `--foreground` | #0D0D0D | #f9fafb | `text-foreground` | Primary text |
| `--muted` | #F4F6FC | #2A0055 | `bg-muted` | Subtle backgrounds |
| `--border` | #e5e7eb | #4B0082 | `border-border` | Borders |
| `--destructive` | #dc2626 | #dc2626 | `bg-destructive` | Danger actions |

#### Semantic Status Colors
| Status | Base | Muted (Light) | Muted (Dark) |
|--------|------|---------------|--------------|
| Success | #22c55e | #f0fdf4 | #052e16 |
| Warning | #f59e0b | #fffbeb | #451a03 |
| Info | #3b82f6 | #eff6ff | #172554 |
| Error | (aliases destructive) | #fef2f2 | #450a0a |

### Component Patterns

**Sidebar**: `w-72`, `bg-background`, `border-r border-border`
- Active: `bg-primary text-primary-foreground rounded-xl`
- Hover: `hover:bg-secondary`

**Cards**: `bg-card`, `border-border`, `rounded-lg`, `shadow-sm`, `p-4`

**Status Badges**: Use semantic tokens
- Success: `bg-success-muted text-success-muted-foreground`
- Warning: `bg-warning-muted text-warning-muted-foreground`
- Info: `bg-info-muted text-info-muted-foreground`
- Error: `bg-error-muted text-error-muted-foreground`

### Migration Guide

| Legacy Pattern | Semantic Pattern |
|----------------|------------------|
| `bg-green-100 text-green-700` | `bg-success-muted text-success-muted-foreground` |
| `bg-yellow-100 text-yellow-700` | `bg-warning-muted text-warning-muted-foreground` |
| `bg-blue-100 text-blue-700` | `bg-info-muted text-info-muted-foreground` |
| `bg-red-100 text-red-700` | `bg-error-muted text-error-muted-foreground` |

**Note**: `--error` aliases `--destructive` for consistency. Use either `bg-destructive` or `bg-error`.