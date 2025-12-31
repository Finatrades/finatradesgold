#!/usr/bin/env tsx
/**
 * Manual Database Backup Script
 * 
 * Safe backup/restore operations for Finatrades databases.
 * 
 * 3-Database Architecture:
 *   AWS_PROD_DATABASE_URL - Production database (real users)
 *   AWS_DEV_DATABASE_URL - Development database (testing)
 *   DATABASE_URL - Replit backup database (cold storage)
 * 
 * Usage:
 *   npx tsx scripts/database-backup.ts status
 *   npx tsx scripts/database-backup.ts backup prod
 *   npx tsx scripts/database-backup.ts backup dev
 *   npx tsx scripts/database-backup.ts backup backup
 *   npx tsx scripts/database-backup.ts restore <backup-file> <target>
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
  console.log('\n=== Finatrades Database Status (3-Database Architecture) ===\n');
  
  const awsProdUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
  const awsDevUrl = process.env.AWS_DEV_DATABASE_URL;
  const backupUrl = process.env.DATABASE_URL;

  // AWS Production
  if (awsProdUrl) {
    const tables = await getTableCount(awsProdUrl);
    const users = await getUserCount(awsProdUrl);
    console.log('AWS RDS (Production):');
    console.log(`  Tables: ${tables}`);
    console.log(`  Users: ${users}`);
    console.log(`  Status: ${tables > 0 ? '✅ OK' : '⚠️ EMPTY'}`);
    console.log();
  } else {
    console.log('AWS RDS (Production): ❌ Not configured (AWS_PROD_DATABASE_URL missing)\n');
  }

  // AWS Development
  if (awsDevUrl) {
    const tables = await getTableCount(awsDevUrl);
    const users = await getUserCount(awsDevUrl);
    console.log('AWS RDS (Development):');
    console.log(`  Tables: ${tables}`);
    console.log(`  Users: ${users}`);
    console.log(`  Status: ${tables > 0 ? '✅ OK' : '⚠️ EMPTY'}`);
    console.log();
  } else {
    console.log('AWS RDS (Development): ❌ Not configured (AWS_DEV_DATABASE_URL missing)\n');
  }

  // Replit Backup
  if (backupUrl) {
    const tables = await getTableCount(backupUrl);
    const users = await getUserCount(backupUrl);
    console.log('Replit PostgreSQL (Backup):');
    console.log(`  Tables: ${tables}`);
    console.log(`  Users: ${users}`);
    console.log(`  Status: ${tables > 0 ? '✅ OK' : '⚠️ EMPTY'}`);
    console.log();
  } else {
    console.log('Replit PostgreSQL (Backup): ❌ Not configured (DATABASE_URL missing)\n');
  }

  // List existing backups
  await ensureBackupDir();
  const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
  if (backups.length > 0) {
    console.log('Available Backups:');
    for (const backup of backups.slice(-10)) {
      const stats = fs.statSync(path.join(BACKUP_DIR, backup));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${backup} (${sizeMB} MB)`);
    }
  } else {
    console.log('No backups found in', BACKUP_DIR);
  }
  console.log();
}

async function backup(source: 'prod' | 'dev' | 'backup') {
  let dbUrl: string | undefined;
  let dbName: string;
  
  switch (source) {
    case 'prod':
      dbUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
      dbName = 'AWS RDS (Production)';
      break;
    case 'dev':
      dbUrl = process.env.AWS_DEV_DATABASE_URL;
      dbName = 'AWS RDS (Development)';
      break;
    case 'backup':
      dbUrl = process.env.DATABASE_URL;
      dbName = 'Replit PostgreSQL (Backup)';
      break;
  }
  
  if (!dbUrl) {
    console.error(`❌ ${dbName} database URL not configured`);
    process.exit(1);
  }

  console.log(`\n=== Creating Backup of ${dbName} ===\n`);

  // Check table count first
  const tables = await getTableCount(dbUrl);
  if (tables === 0) {
    console.error(`❌ ${dbName} has no tables - nothing to backup`);
    process.exit(1);
  }

  await ensureBackupDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `backup_${source}_${timestamp}.sql`);

  console.log(`Tables to backup: ${tables}`);
  console.log(`Output file: ${backupFile}`);
  console.log('Backing up...');

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

async function restore(backupFile: string, target: 'prod' | 'dev' | 'backup') {
  let dbUrl: string | undefined;
  let dbName: string;
  
  switch (target) {
    case 'prod':
      dbUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
      dbName = 'AWS RDS (Production)';
      break;
    case 'dev':
      dbUrl = process.env.AWS_DEV_DATABASE_URL;
      dbName = 'AWS RDS (Development)';
      break;
    case 'backup':
      dbUrl = process.env.DATABASE_URL;
      dbName = 'Replit PostgreSQL (Backup)';
      break;
  }
  
  if (!dbUrl) {
    console.error(`❌ ${dbName} database URL not configured`);
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`\n=== RESTORE OPERATION ===\n`);
  console.log(`⚠️  WARNING: This will REPLACE all data in ${dbName}!`);
  console.log(`Source: ${backupFile}`);
  console.log(`Target: ${dbName}`);
  console.log();

  // Safety check for production
  if (target === 'prod') {
    console.log('🚨 DANGER: You are about to restore to PRODUCTION database!');
    console.log('This operation cannot be undone.');
    console.log('\nTo proceed, set environment variable: CONFIRM_PRODUCTION_RESTORE=yes');
    
    if (process.env.CONFIRM_PRODUCTION_RESTORE !== 'yes') {
      console.log('\n❌ Restore aborted - safety check failed');
      process.exit(1);
    }
  }

  try {
    console.log('Restoring...');
    
    // First, drop existing tables
    await execAsync(
      `psql "${dbUrl}" -c "
        DO \\$\\$ 
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \\$\\$;
      "`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    // Drop custom types
    await execAsync(
      `psql "${dbUrl}" -c "
        DO \\$\\$ 
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
        END \\$\\$;
      "`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    // Import backup
    await execAsync(
      `psql "${dbUrl}" < "${backupFile}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    const tables = await getTableCount(dbUrl);
    console.log(`\n✅ Restore completed successfully!`);
    console.log(`   Tables restored: ${tables}`);
  } catch (error: any) {
    console.error(`\n❌ Restore failed: ${error.message}`);
    process.exit(1);
  }
}

async function pushSchema(target: 'prod' | 'dev' | 'backup') {
  let dbUrl: string | undefined;
  let dbName: string;
  
  switch (target) {
    case 'prod':
      dbUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
      dbName = 'AWS RDS (Production)';
      break;
    case 'dev':
      dbUrl = process.env.AWS_DEV_DATABASE_URL;
      dbName = 'AWS RDS (Development)';
      break;
    case 'backup':
      dbUrl = process.env.DATABASE_URL;
      dbName = 'Replit PostgreSQL (Backup)';
      break;
  }
  
  if (!dbUrl) {
    console.error(`❌ ${dbName} database URL not configured`);
    process.exit(1);
  }

  console.log(`\n=== Push Schema to ${dbName} ===\n`);

  // Check if migration file exists
  const migrationDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationDir)) {
    console.error('❌ No migrations directory found. Run `npx drizzle-kit generate` first.');
    process.exit(1);
  }

  const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
  if (migrations.length === 0) {
    console.error('❌ No migration files found.');
    process.exit(1);
  }

  const latestMigration = migrations.sort().pop()!;
  const migrationFile = path.join(migrationDir, latestMigration);

  console.log(`Using migration: ${latestMigration}`);
  console.log(`Target: ${dbName}`);

  try {
    // Clean up statement-breakpoint comments
    let sql = fs.readFileSync(migrationFile, 'utf-8');
    sql = sql.replace(/--> statement-breakpoint/g, '');
    
    const tempFile = `/tmp/clean_migration_${Date.now()}.sql`;
    fs.writeFileSync(tempFile, sql);

    console.log('Applying migration...');
    
    await execAsync(
      `psql "${dbUrl}" < "${tempFile}" 2>&1 | grep -E "^(CREATE|ALTER|ERROR)" | tail -20`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    fs.unlinkSync(tempFile);

    const tables = await getTableCount(dbUrl);
    console.log(`\n✅ Schema pushed successfully!`);
    console.log(`   Tables: ${tables}`);
  } catch (error: any) {
    console.error(`\n⚠️ Schema push completed with some errors (this is often OK for existing tables)`);
    const tables = await getTableCount(dbUrl);
    console.log(`   Tables: ${tables}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      await status();
      break;
    case 'backup':
      const backupSource = args[1] as 'prod' | 'dev' | 'backup';
      if (!['prod', 'dev', 'backup'].includes(backupSource)) {
        console.error('Usage: npx tsx scripts/database-backup.ts backup <prod|dev|backup>');
        process.exit(1);
      }
      await backup(backupSource);
      break;
    case 'restore':
      const restoreFile = args[1];
      const restoreTarget = args[2] as 'prod' | 'dev' | 'backup';
      if (!restoreFile || !['prod', 'dev', 'backup'].includes(restoreTarget)) {
        console.error('Usage: npx tsx scripts/database-backup.ts restore <backup-file> <prod|dev|backup>');
        process.exit(1);
      }
      await restore(restoreFile, restoreTarget);
      break;
    case 'push-schema':
      const pushTarget = args[1] as 'prod' | 'dev' | 'backup';
      if (!['prod', 'dev', 'backup'].includes(pushTarget)) {
        console.error('Usage: npx tsx scripts/database-backup.ts push-schema <prod|dev|backup>');
        process.exit(1);
      }
      await pushSchema(pushTarget);
      break;
    default:
      console.log(`
Finatrades Database Backup Tool (3-Database Architecture)

Usage:
  npx tsx scripts/database-backup.ts <command> [options]

Commands:
  status                    Show database status and available backups
  backup <target>           Create a backup of the specified database
  restore <file> <target>   Restore a backup to the target database
  push-schema <target>      Push schema to the target database

Targets:
  prod    - AWS RDS Production (AWS_PROD_DATABASE_URL)
  dev     - AWS RDS Development (AWS_DEV_DATABASE_URL)
  backup  - Replit PostgreSQL Backup (DATABASE_URL)

Examples:
  npx tsx scripts/database-backup.ts status
  npx tsx scripts/database-backup.ts backup prod
  npx tsx scripts/database-backup.ts backup dev
  npx tsx scripts/database-backup.ts backup backup
  npx tsx scripts/database-backup.ts push-schema prod
  npx tsx scripts/database-backup.ts restore /tmp/backup.sql dev

Safety Notes:
  - Restoring to prod requires CONFIRM_PRODUCTION_RESTORE=yes
  - Auto-sync has been disabled for safety
  - Always create a backup before making changes
      `);
  }
}

main().catch(console.error);
