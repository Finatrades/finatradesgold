# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/finatrades run dev` — run Finatrades frontend

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Finatrades Web App (`artifacts/finatrades/`)
- **Kind**: web (React + Vite)
- **Preview path**: `/`
- **Port**: `$PORT` (injected by Replit, bound in `vite.config.ts`)
- B2B commodity trade platform for Africa — strict role-based 9-step workflow (Registration/KYC → Consignment → Logistics → Inventory → Marketplace → Order/Payment → Government Barter → Trade Finance/Escrow)
- **Role-based architecture**: `users.user_type` enum = `exporter | importer | government` (separate from `role` which stays `user | admin`)
  - Sidebar, dashboard, route guards all driven by `user.userType` via `src/lib/roleMenus.tsx`
  - Exporter = sell-side (consignments, listings, incoming RFQs)
  - Importer = buy-side (marketplace, outgoing RFQs, incoming shipments)
  - Government = sovereign-only (programs, barter, national inventory)
  - Admin = full platform oversight
- Uses wouter for client-side routing
- Theme: redbrick `#C73B22` / cream `#FAFAF8` / dark `#1A1A1A` (rebranded from purple/gold)
- Legacy gold features (BNSL, FinaPay, FinaVault, WinGold) stripped from main routes/sidebar — code remains in tree but unreachable

### KYC Model
- **Finatrades KYC** is the only active mode (`complianceSettings.activeKycMode = 'finatrades'`).
- Two flavors stored in dedicated tables:
  - `finatrades_personal_kyc` — individual importers (ID, address, selfie/liveness).
  - `finatrades_corporate_kyc` — exporters, business importers, and government (incorporation, ownership, banking, signatories).
- Eligibility: exporters/government require Approved Corporate KYC; importers accept Approved Personal **or** Corporate.
- Single-stage admin review. Document statuses: `Pending → AI Review → Pending Review → Approved` (or `Rejected` / `AI Rejected`).
- Legacy 3-tier (`tier_1_basic / tier_2_enhanced / tier_3_corporate`) was migrated and removed in migration `0016_finatrades_kyc.sql`.

### API Server (`artifacts/api-server/`)
- **Kind**: api (Express)
- **Port**: 8080 (default, reads `$PORT`)
- **DB**: PostgreSQL via `DATABASE_URL` env var (Drizzle ORM, schema in `src/shared/schema.ts`)
- **Build**: esbuild via `build.mjs` — externalizes pdfkit, fontkit, tesseract.js, sharp, etc.
- **Migrations**: auto-run on server startup via `src/migrate.ts`
- Session: PostgreSQL-backed (connect-pg-simple)
- Integrations: Redis (Upstash), BullMQ job queues, Cloudflare R2 storage, Brevo email, Wingold partner webhooks
- RBAC, document verification (AI), PDF generation, MRZ scanning

### Finatrades Mobile App (`artifacts/finatrades-mobile/`)
- **Kind**: mobile (Expo / React Native)
- **Preview path**: `/mobile/`
- **Port**: 26026 (assigned dynamically, reads `$PORT`)
- React Native companion app for the Finatrades platform
- Screens: Login, Dashboard (gold balance), FinaVault (holdings), Certificates, Profile
- Bottom tab navigation with NativeTabs (iOS 26 liquid glass) + classic BlurView fallback
- Brand: purple `#8A2BE2`, gold `#D4AF37`, dark bg `#07070A` — synced from web app CSS
- Connects to existing API server at `/api/*` endpoints via `EXPO_PUBLIC_API_BASE` env
- Uses `@react-native-async-storage/async-storage` for auth session persistence
- React Query for all server state fetching
- Fonts: Inter (400/500/600/700) via `@expo-google-fonts/inter`
