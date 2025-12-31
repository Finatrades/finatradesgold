#!/usr/bin/env tsx
/**
 * Manual Database Backup Script (3-DATABASE ARCHITECTURE)
 * 
 * Safe backup/restore operations for Finatrades databases.
 * 
 * Architecture:
 *   PRODUCTION: AWS RDS Production (AWS_PROD_DATABASE_URL)
 *   DEVELOPMENT: AWS RDS Development (AWS_DEV_DATABASE_URL)
 *   BACKUP: Replit PostgreSQL (DATABASE_URL)
 * 
 * Usage:
 *   npx tsx scripts/database-backup.ts status
 *   npx tsx scripts/database-backup.ts backup prod
 *   npx tsx scripts/database-backup.ts backup dev
 *   npx tsx scripts/database-backup.ts backup backup
 *   npx tsx scripts/database-backup.ts restore <backup-file> <target>
 *   npx tsx scripts/database-backup.ts push-schema <source> <target>
 *   npx tsx scripts/database-backup.ts sync prod-to-backup
 * 
 * Legacy support:
 *   npx tsx scripts/database-backup.ts backup aws   (maps to 'prod')
 *   npx tsx scripts/database-backup.ts backup replit (maps to 'backup')
 * 
 * This script is the SAFE way to handle database operations.
 * Auto-sync has been disabled for safety.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = '/tmp/finatrades_backups';

type DatabaseRole = 'prod' | 'dev' | 'backup';

function getDatabaseUrl(role: DatabaseRole): string | null {
  switch (role) {
    case 'prod':
      return process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL || null;
    case 'dev':
      return process.env.AWS_DEV_DATABASE_URL || null;
    case 'backup':
      return process.env.DATABASE_URL || null;
    default:
      return null;
  }
}

function getDatabaseName(role: DatabaseRole): string {
  switch (role) {
    case 'prod':
      return 'AWS RDS Production';
    case 'dev':
      return 'AWS RDS Development';
    case 'backup':
      return 'Replit PostgreSQL (Backup)';
    default:
      return 'Unknown';
  }
}

function mapLegacyRole(input: string): DatabaseRole {
  if (input === 'aws') return 'prod';
  if (input === 'replit') return 'backup';
  return input as DatabaseRole;
}

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

async function getTableCount(dbUrl: string): Promise<number> {
  try {
    const result = await execAsync(
      `psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'"`,
      { maxBuffer: 1024 * 1024 }
    );
    return parseInt(result.stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function getUserCount(dbUrl: string): Promise<number> {
  try {
    const result = await execAsync(
      `psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0"`,
      { maxBuffer: 1024 * 1024 }
    );
    return parseInt(result.stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function status() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           FINATRADES DATABASE STATUS (3-DB ARCHITECTURE)      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const roles: DatabaseRole[] = ['prod', 'dev', 'backup'];
  
  for (const role of roles) {
    const url = getDatabaseUrl(role);
    const name = getDatabaseName(role);
    
    if (url) {
      const tables = await getTableCount(url);
      const users = await getUserCount(url);
      const statusIcon = tables > 0 ? '✅' : '⚠️';
      
      console.log(`${role.toUpperCase().padEnd(8)} │ ${name}`);
      console.log(`         │ Tables: ${tables} │ Users: ${users} │ Status: ${statusIcon} ${tables > 0 ? 'OK' : 'EMPTY'}`);
      console.log('─────────┼────────────────────────────────────────────────────');
    } else {
      console.log(`${role.toUpperCase().padEnd(8)} │ ${name}`);
      console.log(`         │ ❌ Not configured`);
      console.log('─────────┼────────────────────────────────────────────────────');
    }
  }

  // Architecture info
  console.log('\n📋 Configuration:');
  console.log(`   AWS_PROD_DATABASE_URL: ${process.env.AWS_PROD_DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   AWS_DEV_DATABASE_URL:  ${process.env.AWS_DEV_DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   DATABASE_URL:          ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   AWS_DATABASE_URL:      ${process.env.AWS_DATABASE_URL ? '⚠️ Legacy (use AWS_PROD_DATABASE_URL)' : '❌ Not set'}`);

  // List existing backups
  await ensureBackupDir();
  const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
  console.log('\n📦 Available Backups:');
  if (backups.length > 0) {
    for (const backup of backups.slice(-10)) {
      const stats = fs.statSync(path.join(BACKUP_DIR, backup));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${backup} (${sizeMB} MB)`);
    }
  } else {
    console.log(`   No backups found in ${BACKUP_DIR}`);
  }
  console.log();
}

async function backup(source: string) {
  const role = mapLegacyRole(source);
  const dbUrl = getDatabaseUrl(role);
  const dbName = getDatabaseName(role);
  
  if (!dbUrl) {
    console.error(`❌ ${dbName} database URL not configured`);
    console.error(`   Set the appropriate environment variable:`);
    if (role === 'prod') console.error('   AWS_PROD_DATABASE_URL or AWS_DATABASE_URL');
    if (role === 'dev') console.error('   AWS_DEV_DATABASE_URL');
    if (role === 'backup') console.error('   DATABASE_URL');
    process.exit(1);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  CREATING BACKUP: ${dbName.padEnd(42)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  const tables = await getTableCount(dbUrl);
  if (tables === 0) {
    console.error(`❌ ${dbName} has no tables - nothing to backup`);
    process.exit(1);
  }

  await ensureBackupDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `backup_${role}_${timestamp}.sql`);

  console.log(`📊 Tables to backup: ${tables}`);
  console.log(`📁 Output file: ${backupFile}`);
  console.log(`⏳ Backing up...`);

  try {
    await execAsync(
      `pg_dump "${dbUrl}" --no-owner --no-acl -f "${backupFile}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`   File: ${backupFile}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Tables: ${tables}`);
  } catch (error: any) {
    console.error(`\n❌ Backup failed: ${error.message}`);
    process.exit(1);
  }
}

async function restore(backupFile: string, target: string) {
  const role = mapLegacyRole(target);
  const dbUrl = getDatabaseUrl(role);
  const dbName = getDatabaseName(role);
  
  if (!dbUrl) {
    console.error(`❌ ${dbName} database URL not configured`);
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    // Check if it's in the backup directory
    const fullPath = path.join(BACKUP_DIR, backupFile);
    if (fs.existsSync(fullPath)) {
      backupFile = fullPath;
    } else {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }
  }

  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                    ⚠️  RESTORE OPERATION                      ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
  console.log(`⚠️  WARNING: This will REPLACE all data in ${dbName}!`);
  console.log(`📁 Source: ${backupFile}`);
  console.log(`🎯 Target: ${dbName}`);
  console.log();

  // Safety check for production
  if (role === 'prod') {
    console.log('🚨 DANGER: You are about to restore to PRODUCTION database!');
    console.log('   This operation cannot be undone.');
    console.log('\n   To proceed, set: CONFIRM_PRODUCTION_RESTORE=yes');
    
    if (process.env.CONFIRM_PRODUCTION_RESTORE !== 'yes') {
      console.log('\n❌ Restore aborted - safety check failed');
      process.exit(1);
    }
    console.log('\n✅ Production restore confirmed');
  }

  // Safety check for dev
  if (role === 'dev') {
    console.log('⚠️  You are about to restore to DEVELOPMENT database.');
    console.log('   To proceed, set: CONFIRM_DEV_RESTORE=yes');
    
    if (process.env.CONFIRM_DEV_RESTORE !== 'yes') {
      console.log('\n❌ Restore aborted - safety check failed');
      process.exit(1);
    }
    console.log('\n✅ Development restore confirmed');
  }

  console.log('\n⏳ Restoring...');

  try {
    await execAsync(
      `psql "${dbUrl}" -f "${backupFile}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    const tables = await getTableCount(dbUrl);
    console.log(`\n✅ Restore completed successfully!`);
    console.log(`   Tables: ${tables}`);
  } catch (error: any) {
    console.error(`\n❌ Restore failed: ${error.message}`);
    process.exit(1);
  }
}

async function pushSchema(source: string, target: string) {
  const sourceRole = mapLegacyRole(source);
  const targetRole = mapLegacyRole(target);
  
  const sourceUrl = getDatabaseUrl(sourceRole);
  const targetUrl = getDatabaseUrl(targetRole);
  
  if (!sourceUrl) {
    console.error(`❌ Source ${getDatabaseName(sourceRole)} not configured`);
    process.exit(1);
  }
  
  if (!targetUrl) {
    console.error(`❌ Target ${getDatabaseName(targetRole)} not configured`);
    process.exit(1);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║                    PUSH SCHEMA                                ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
  console.log(`📤 Source: ${getDatabaseName(sourceRole)}`);
  console.log(`📥 Target: ${getDatabaseName(targetRole)}`);
  console.log(`ℹ️  This pushes SCHEMA ONLY (no data)`);

  if (targetRole === 'prod') {
    console.log('\n🚨 DANGER: Pushing schema to PRODUCTION!');
    console.log('   Set: CONFIRM_PRODUCTION_SCHEMA_PUSH=yes');
    
    if (process.env.CONFIRM_PRODUCTION_SCHEMA_PUSH !== 'yes') {
      console.log('\n❌ Aborted - safety check failed');
      process.exit(1);
    }
  }

  console.log('\n⏳ Pushing schema...');

  try {
    const schemaFile = `/tmp/schema_push_${Date.now()}.sql`;
    
    await execAsync(
      `pg_dump "${sourceUrl}" --schema-only --no-owner --no-acl -f "${schemaFile}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    await execAsync(
      `psql "${targetUrl}" -f "${schemaFile}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    console.log(`\n✅ Schema pushed successfully!`);
  } catch (error: any) {
    console.error(`\n❌ Schema push failed: ${error.message}`);
    process.exit(1);
  }
}

async function syncProdToBackup() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║              SYNC: PRODUCTION → BACKUP                        ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  const prodUrl = getDatabaseUrl('prod');
  const backupUrl = getDatabaseUrl('backup');

  if (!prodUrl) {
    console.error('❌ Production database not configured');
    process.exit(1);
  }

  if (!backupUrl) {
    console.error('❌ Backup database not configured');
    process.exit(1);
  }

  console.log(`📤 Source: ${getDatabaseName('prod')}`);
  console.log(`📥 Target: ${getDatabaseName('backup')}`);
  console.log('\n⚠️  This will REPLACE all data in backup database!');
  console.log('   Set: DB_SYNC_ENABLED=true and ALLOW_DESTRUCTIVE_SYNC=true');

  if (process.env.DB_SYNC_ENABLED !== 'true') {
    console.log('\n❌ Sync disabled - set DB_SYNC_ENABLED=true');
    process.exit(1);
  }

  if (process.env.ALLOW_DESTRUCTIVE_SYNC !== 'true') {
    console.log('\n❌ Destructive sync not allowed - set ALLOW_DESTRUCTIVE_SYNC=true');
    process.exit(1);
  }

  console.log('\n⏳ Syncing production to backup...');

  try {
    const dumpFile = `/tmp/prod_backup_sync_${Date.now()}.sql`;
    
    await execAsync(
      `pg_dump "${prodUrl}" --no-owner --no-acl -f "${dumpFile}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    await execAsync(
      `psql "${backupUrl}" -f "${dumpFile}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    const tables = await getTableCount(backupUrl);
    console.log(`\n✅ Sync completed successfully!`);
    console.log(`   Tables synced: ${tables}`);
  } catch (error: any) {
    console.error(`\n❌ Sync failed: ${error.message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           FINATRADES DATABASE BACKUP TOOL                    ║
║           3-Database Architecture                            ║
╚══════════════════════════════════════════════════════════════╝

COMMANDS:
  status                          Show status of all databases
  backup <role>                   Create backup (prod|dev|backup)
  restore <file> <role>           Restore backup to database
  push-schema <source> <target>   Push schema only (no data)
  sync prod-to-backup             Sync production to backup

ROLES:
  prod    - AWS RDS Production (AWS_PROD_DATABASE_URL)
  dev     - AWS RDS Development (AWS_DEV_DATABASE_URL)
  backup  - Replit PostgreSQL (DATABASE_URL)

LEGACY ALIASES:
  aws     - Maps to 'prod'
  replit  - Maps to 'backup'

EXAMPLES:
  npx tsx scripts/database-backup.ts status
  npx tsx scripts/database-backup.ts backup prod
  npx tsx scripts/database-backup.ts backup dev
  npx tsx scripts/database-backup.ts restore backup_prod_2025-01-01.sql dev
  npx tsx scripts/database-backup.ts push-schema prod dev
  npx tsx scripts/database-backup.ts sync prod-to-backup

SAFETY FLAGS:
  CONFIRM_PRODUCTION_RESTORE=yes    Required for prod restore
  CONFIRM_DEV_RESTORE=yes           Required for dev restore
  CONFIRM_PRODUCTION_SCHEMA_PUSH=yes Required for prod schema push
  DB_SYNC_ENABLED=true              Enable sync operations
  ALLOW_DESTRUCTIVE_SYNC=true       Allow destructive syncs
`);
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      await status();
      break;
    case 'backup':
      if (!args[1]) {
        console.error('Usage: backup <prod|dev|backup>');
        process.exit(1);
      }
      await backup(args[1]);
      break;
    case 'restore':
      if (!args[1] || !args[2]) {
        console.error('Usage: restore <backup-file> <prod|dev|backup>');
        process.exit(1);
      }
      await restore(args[1], args[2]);
      break;
    case 'push-schema':
      if (!args[1] || !args[2]) {
        console.error('Usage: push-schema <source> <target>');
        process.exit(1);
      }
      await pushSchema(args[1], args[2]);
      break;
    case 'sync':
      if (args[1] === 'prod-to-backup') {
        await syncProdToBackup();
      } else {
        console.error('Usage: sync prod-to-backup');
        process.exit(1);
      }
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      showHelp();
      if (command) {
        console.error(`\nUnknown command: ${command}`);
      }
      process.exit(command ? 1 : 0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
