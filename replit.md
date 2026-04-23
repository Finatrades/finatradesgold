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
- Full finance platform with landing pages, login/signup, trading dashboard, KYC/document upload, gold certificates (BNSL), WinGold partner integration, and more
- Uses wouter for client-side routing
- Theme: purple/gradient branding with custom CSS vars in `src/index.css`
- Fonts: loaded from Google Fonts / local assets

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
