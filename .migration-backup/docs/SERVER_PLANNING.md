# Finatrades Server Planning Document

## Database Architecture

### Overview

The Finatrades platform uses a 3-database architecture for maximum security and reliability:

| Database | Role | Purpose |
|----------|------|---------|
| AWS RDS (Production) | Primary | Real users, live transactions |
| AWS RDS (Development) | Secondary | Testing, development, staging |
| Replit PostgreSQL | Backup | Cold storage, disaster recovery |

---

## Environment Variables Configuration

| Variable | Purpose | Environment |
|----------|---------|-------------|
| `AWS_PROD_DATABASE_URL` | Production database (real users) | Production only |
| `AWS_DEV_DATABASE_URL` | Development database (testing) | Development only |
| `DATABASE_URL` | Replit backup database | Managed by Replit |

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐         ┌──────────────┐                │
│   │  AWS RDS     │         │  AWS RDS     │                │
│   │  Development │ ←─────→ │  Production  │                │
│   │  (Testing)   │  Schema │  (Live)      │                │
│   └──────────────┘  Sync   └──────┬───────┘                │
│                                   │                         │
│                                   │ Backup                  │
│                                   ↓                         │
│                          ┌──────────────┐                   │
│                          │   Replit     │                   │
│                          │  PostgreSQL  │                   │
│                          │  (Backup)    │                   │
│                          └──────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Rules

### Access Control

| Environment | Can Access | Cannot Access |
|-------------|------------|---------------|
| Development | AWS Dev DB, Replit Backup | AWS Prod DB |
| Production | AWS Prod DB | AWS Dev DB |
| Backup Scripts | All (with explicit flags) | N/A |

### Credential Isolation

- Production credentials NEVER stored in development environment
- Development credentials NEVER stored in production environment
- Backup operations require explicit confirmation flags

---

## Sync/Backup Strategy

### Allowed Operations

| Source | Destination | Operation | Safety Level |
|--------|-------------|-----------|--------------|
| Production → Backup | Replit | Cold backup | Safe |
| Production → Development | AWS Dev | Schema sync | Requires confirmation |
| Development → Production | AWS Prod | Migration only | Requires admin approval |

### Blocked Operations

| Operation | Reason |
|-----------|--------|
| Dev → Prod data sync | Risk of corrupting production |
| Backup → Prod restore | Requires manual intervention |
| Auto-sync scheduler | Disabled by default |

---

## Files Configuration

### Core Database Files

| File | Purpose |
|------|---------|
| `server/db.ts` | Database connection logic |
| `server/database-sync-scheduler.ts` | Sync operations (disabled by default) |
| `scripts/database-backup.ts` | Manual backup/restore commands |

### Backup Commands

```bash
# Check status of all databases
npx tsx scripts/database-backup.ts status

# Backup production to file
npx tsx scripts/database-backup.ts backup aws

# Backup development to file
npx tsx scripts/database-backup.ts backup replit

# Push schema to production (requires confirmation)
npx tsx scripts/database-backup.ts push-schema aws
```

---

## Implementation Checklist

### Environment Setup

- [ ] Create AWS RDS Production database
- [ ] Create AWS RDS Development database
- [ ] Configure `AWS_PROD_DATABASE_URL` secret
- [ ] Configure `AWS_DEV_DATABASE_URL` secret
- [ ] Let Replit manage `DATABASE_URL` for backup

### Code Changes

- [ ] Update `server/db.ts` for 3-database support
- [ ] Update backup scripts for all 3 targets
- [ ] Update `replit.md` documentation

### Security

- [ ] Rotate all database passwords
- [ ] Verify credential isolation
- [ ] Test backup/restore procedures

---

## Estimated Effort

| Task | Time | Difficulty |
|------|------|------------|
| Environment variable setup | 15 min | Easy |
| Code modifications | 45 min | Medium |
| Testing | 30 min | Easy |
| Documentation | 15 min | Easy |
| **Total** | **~2 hours** | |

---

## Contact

**Author:** Charan Pratap Singh  
**Contact:** +971568474843  
**System Email:** System@finatrades.com

---

*Document Version: 1.0*  
*Last Updated: December 31, 2025*
