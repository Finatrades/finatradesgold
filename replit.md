# Finatrades Platform

## Overview

Finatrades is a gold-backed digital financial platform offering multiple integrated services for personal and business users. The platform enables users to buy, sell, store, and trade physical gold through digital wallets, with features including:

- **FinaVault**: Secure gold storage and custody management
- **FinaPay**: Digital gold wallet for transactions and payments
- **BNSL (Buy Now Sell Later)**: Deferred price sale agreements for gold
- **FinaBridge**: Trade finance module for importers/exporters
- **FinaCard**: Upcoming debit card functionality

The application follows a client-server architecture with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Core Calculation Rule (Single Source of Truth)

All financial calculations on the Finatrades platform are performed in **USD value**, while the underlying asset is **gold (grams)**.

**USD is used for:**
- User input
- Transaction calculations
- Reporting clarity

**Gold (grams) is the actual asset owned**

This rule applies universally across:
- FinaPay Wallet
- FinaVault Wallet (ledger view)
- BNSL Wallet

**Display Guidelines:**
- USD value is shown as the primary/headline amount
- Gold grams are shown as the actual asset owned
- Cash balances are shown separately from gold holdings

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for meta images and Replit integration
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Context API for global state (Auth, Language, Notifications, Platform settings, Trade Finance, BNSL, FinaPay)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme (orange gradient aesthetic for light mode)
- **Data Fetching**: TanStack React Query for server state management
- **Animations**: Framer Motion for UI transitions
- **Real-time**: Socket.IO client for live chat functionality

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful endpoints under `/api` prefix
- **Authentication**: Session-based with bcrypt password hashing
- **Real-time**: Socket.IO server for chat and notifications
- **Database Access**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with push command (`db:push`)
- **Key Entities**: Users, Wallets, Transactions, Vault Holdings, KYC Submissions, BNSL Plans/Payouts, Trade Cases/Documents, Chat Sessions/Messages, Audit Logs

### Authentication & Authorization
- **Method**: Email/password authentication with bcrypt hashing
- **Session Storage**: PostgreSQL via connect-pg-simple
- **User Roles**: `user` and `admin` roles defined in schema
- **KYC Levels**: Multi-tier KYC status (Not Started, In Progress, Approved, Rejected)
- **Protected Routes**: Client-side route protection with redirect to login

### KYC System (Dual Mode)
The platform supports two KYC modes, configurable via admin compliance settings:

**Mode 1: kycAml (Tiered Verification)**
- Tier 1 Basic: Government ID only ($5,000/month limit)
- Tier 2 Enhanced: ID + Liveness + Proof of Address ($50,000/month limit)
- Tier 3 Corporate: Full business verification (Unlimited)

**Mode 2: Finatrades (Personal Info + Documents)**
- Personal Information: Full name, email, phone, date of birth, nationality, country, city, address, postal code, occupation, source of funds, account type
- Document Uploads: ID front/back, passport (optional), proof of address
- Liveness Verification: Face capture with movement detection
- Country Restrictions: Admin-managed blocked countries list
- Data pre-fills from user profile where available
- Corporate KYC: Comprehensive questionnaire with beneficial owners and corporate documents

### Centralized Platform Configuration
All platform fees, limits, and system settings are managed through a centralized database-driven configuration system:

**Database Table**: `platform_config` stores all settings with keys, categories, and values
**Admin Interface**: `/admin/platform-config` provides a tabbed UI for managing all 12 configuration categories
**Public API**: `GET /api/platform-config/public` exposes non-sensitive settings to frontend
**Admin API**: `GET/POST /api/admin/platform-config` for full CRUD operations (admin only)

**12 Configuration Categories**:
1. **Gold Pricing**: Buy/sell spreads, storage fees, minimum trade amounts
2. **Transaction Limits**: Tier-based daily/monthly limits (Tier 1-3)
3. **Deposits**: Min/max amounts, daily/monthly limits
4. **Withdrawals**: Min/max amounts, fees, pending hours
5. **P2P Transfers**: Min/max amounts, limits, fees
6. **BNSL**: Agreement fees, max terms, early exit penalties
7. **FinaBridge**: Trade finance fees, LC issuance, document processing
8. **Payment Methods**: Bank transfer, card, and crypto fees
9. **KYC**: Auto-approval, expiry days, blocked countries
10. **System**: Maintenance mode, registrations, notifications, session timeout
11. **Vault Inventory**: Physical gold stock, reserved amounts, alerts
12. **Referrals**: Bonus amounts, max referrals, validity periods

**Context Integration**: `PlatformContext` fetches settings from database API on app load

### Email Notification Management
Comprehensive email notification system with admin controls and audit logging:

**Database Tables**:
- `email_notification_settings`: Toggleable notification types by category (auth, transactions, KYC, BNSL, trade finance, documents, system)
- `email_logs`: Complete audit trail of all sent emails with status, recipient, template, and error tracking

**Admin Interface**: `/admin/email-notifications` provides:
- Toggle switches for each notification type by category
- Seed button to populate default notification settings
- Searchable/filterable sent email history with status badges
- Email statistics (total sent, failed, pending)

**API Endpoints**:
- `GET /api/admin/email-notifications`: List all notification settings
- `PATCH /api/admin/email-notifications/:type/toggle`: Enable/disable specific notification
- `POST /api/admin/email-notifications/seed`: Populate default settings
- `GET /api/admin/email-logs`: Retrieve sent email history

**Email Flow**: `sendEmail` function checks notification settings before sending and logs all attempts (success/failure) for audit purposes

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API client
│   └── pages/           # Route page components
├── server/              # Express backend
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database operations interface
│   ├── socket.ts        # Socket.IO handlers
│   └── db.ts            # Database connection
├── shared/              # Shared code (schema, types)
└── migrations/          # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: PostgreSQL session store for Express

### UI Framework
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-built component library configuration
- **Lucide React**: Icon library

### Real-time Communication
- **Socket.IO**: WebSocket-based chat system between users and admin support

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server-side bundling for production
- **TypeScript**: Full-stack type safety

### Validation
- **Zod**: Schema validation for API inputs
- **drizzle-zod**: Auto-generated Zod schemas from Drizzle tables
- **@hookform/resolvers**: Form validation integration

### Payment Integrations

#### Binance Pay
- **Service**: `server/binance-pay.ts` - API service for Binance Pay Merchant integration
- **Database**: `binanceTransactions` table tracks payment orders and status
- **Required Secrets**:
  - `BINANCE_PAY_API_KEY` - Merchant API key from merchant.binance.com
  - `BINANCE_PAY_SECRET_KEY` - Merchant secret key
  - `BINANCE_PAY_MERCHANT_ID` - Merchant ID (sub-merchant ID if applicable)
- **Flow**: 
  1. User selects crypto payment in BuyGoldModal
  2. POST /api/binance-pay/create-order creates order with Binance
  3. User redirected to Binance Pay hosted checkout
  4. Webhook at POST /api/binance-pay/webhook receives payment confirmation
  5. On success, wallet is credited with purchased gold
- **Note**: Requires Binance Pay Merchant credentials (not trading API keys)

### Mobile App (Capacitor)

The app is configured for iOS and Android mobile builds using Capacitor.

#### Configuration
- **Config File**: `capacitor.config.ts`
- **App ID**: `com.finatrades.app`
- **App Name**: Finatrades
- **Web Directory**: `dist/public` (Vite build output)

#### Installed Plugins
- `@capacitor/camera` - KYC document photo capture
- `@capacitor/push-notifications` - Push alerts for transactions
- `@capacitor/haptics` - Touch feedback
- `@capacitor/status-bar` - Mobile status bar styling
- `@capacitor/splash-screen` - App launch branding
- `@capacitor/filesystem` - Local file access
- `@capacitor/preferences` - Local key-value storage

#### Build Commands
```bash
# Build web app and sync to native projects
npm run build && npx cap sync

# Add platforms (requires Xcode/Android Studio)
npx cap add ios
npx cap add android

# Open in IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

#### Development Notes
- Native platforms (ios/android folders) must be added on a machine with Xcode/Android Studio
- After web changes: run `npx cap sync` to update native projects
- Status bar and splash screen configured with orange theme (#f97316)