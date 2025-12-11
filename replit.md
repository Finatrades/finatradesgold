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