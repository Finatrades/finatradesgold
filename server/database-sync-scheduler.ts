/**
 * Database Backup & Sync Manager (SAFE VERSION)
 * 
 * IMPORTANT: Auto-sync is DISABLED by default for safety.
 * This module provides manual backup and restore functions only.
 * 
 * 3-Database Architecture:
 *   PRODUCTION: AWS RDS (AWS_PROD_DATABASE_URL) - Real users
 *   DEVELOPMENT: AWS RDS (AWS_DEV_DATABASE_URL) - Testing
 *   BACKUP: Replit PostgreSQL (DATABASE_URL) - Cold storage
 * 
 * Legacy support:
 *   AWS_DATABASE_URL - Falls back for backward compatibility
 * 
 * Safety Features:
 *   - Auto-sync DISABLED by default
 *   - Minimum table count validation before any sync
 *   - Explicit confirmation required for destructive operations
 *   - Source database validation before sync
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Safety constants
const MINIMUM_TABLES_FOR_SYNC = 50; // Don't sync if source has fewer tables
const SYNC_ENABLED = process.env.DB_SYNC_ENABLED === 'true';
const ALLOW_DESTRUCTIVE_SYNC = process.env.ALLOW_DESTRUCTIVE_SYNC === 'true';

interface SyncResult {
  success: boolean;
  timestamp: Date;
  direction: 'aws-to-replit' | 'replit-to-aws' | 'backup-only';
  tablesCount?: number;
  duration?: number;
  error?: string;
}

interface DatabaseStatus {
  url: string;
  name: string;
  tables: number;
  hasData: boolean;
}

let lastSyncResult: SyncResult | null = null;
let isSyncing = false;

async function runCommand(cmd: string, description: string): Promise<string> {
  console.log(`[DB Backup] ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('already exists')) {
      console.warn('[DB Backup] Warning:', stderr.substring(0, 500));
    }
    return stdout;
  } catch (error: any) {
    console.error(`[DB Backup] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get table count for a database
 */
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

/**
 * Check database status safely
 */
export async function getDatabaseStatus(): Promise<{
  awsProd: DatabaseStatus | null;
  awsDev: DatabaseStatus | null;
  backup: DatabaseStatus | null;
  syncEnabled: boolean;
  destructiveSyncAllowed: boolean;
}> {
  const awsProdUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
  const awsDevUrl = process.env.AWS_DEV_DATABASE_URL;
  const backupUrl = process.env.DATABASE_URL;

  let awsProdStatus: DatabaseStatus | null = null;
  let awsDevStatus: DatabaseStatus | null = null;
  let backupStatus: DatabaseStatus | null = null;

  if (awsProdUrl) {
    const tables = await getTableCount(awsProdUrl);
    awsProdStatus = {
      url: '***HIDDEN***',
      name: 'AWS RDS (Production)',
      tables,
      hasData: tables >= MINIMUM_TABLES_FOR_SYNC
    };
  }

  if (awsDevUrl) {
    const tables = await getTableCount(awsDevUrl);
    awsDevStatus = {
      url: '***HIDDEN***',
      name: 'AWS RDS (Development)',
      tables,
      hasData: tables >= MINIMUM_TABLES_FOR_SYNC
    };
  }

  if (backupUrl) {
    const tables = await getTableCount(backupUrl);
    backupStatus = {
      url: '***HIDDEN***',
      name: 'Replit PostgreSQL (Backup)',
      tables,
      hasData: tables >= MINIMUM_TABLES_FOR_SYNC
    };
  }

  return {
    awsProd: awsProdStatus,
    awsDev: awsDevStatus,
    backup: backupStatus,
    syncEnabled: SYNC_ENABLED,
    destructiveSyncAllowed: ALLOW_DESTRUCTIVE_SYNC
  };
}

/**
 * Create a backup of a database to a file (NON-DESTRUCTIVE)
 * This is the SAFE way to backup - just creates a dump file
 */
export async function createBackup(source: 'aws-prod' | 'aws-dev' | 'backup'): Promise<{
  success: boolean;
  filePath?: string;
  tablesCount?: number;
  error?: string;
}> {
  let dbUrl: string | undefined;
  let dbName: string;
  
  switch (source) {
    case 'aws-prod':
      dbUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
      dbName = 'AWS Production';
      break;
    case 'aws-dev':
      dbUrl = process.env.AWS_DEV_DATABASE_URL;
      dbName = 'AWS Development';
      break;
    case 'backup':
      dbUrl = process.env.DATABASE_URL;
      dbName = 'Replit Backup';
      break;
  }
  
  if (!dbUrl) {
    return { success: false, error: `Missing ${dbName} database URL` };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `/tmp/backup_${source}_${timestamp}.sql`;

  try {
    // First check table count
    const tableCount = await getTableCount(dbUrl);
    
    if (tableCount === 0) {
      return { success: false, error: `${source.toUpperCase()} database has no tables - nothing to backup` };
    }

    console.log(`[DB Backup] Creating backup of ${source.toUpperCase()} database (${tableCount} tables)`);
    
    await runCommand(
      `pg_dump "${dbUrl}" --no-owner --no-acl -f ${backupFile}`,
      `Exporting ${source.toUpperCase()} database`
    );

    console.log(`[DB Backup] ✅ Backup created: ${backupFile}`);
    
    return {
      success: true,
      filePath: backupFile,
      tablesCount: tableCount
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * SAFE sync from AWS to Replit (with safety checks)
 * This is the ONLY way to sync - with explicit validation
 */
export async function syncAwsToReplit(options?: {
  force?: boolean;
  skipValidation?: boolean;
}): Promise<SyncResult> {
  if (isSyncing) {
    return {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      error: 'Sync already in progress'
    };
  }

  // Check if sync is enabled
  if (!SYNC_ENABLED && !options?.force) {
    console.log('[DB Backup] ⚠️ Sync is DISABLED. Set DB_SYNC_ENABLED=true to enable.');
    return {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      error: 'Sync is disabled. Set DB_SYNC_ENABLED=true environment variable to enable.'
    };
  }

  // Check if destructive sync is allowed
  if (!ALLOW_DESTRUCTIVE_SYNC && !options?.force) {
    console.log('[DB Backup] ⚠️ Destructive sync is DISABLED. Set ALLOW_DESTRUCTIVE_SYNC=true to enable.');
    return {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      error: 'Destructive sync is disabled. Set ALLOW_DESTRUCTIVE_SYNC=true to enable table dropping.'
    };
  }

  const startTime = Date.now();
  isSyncing = true;

  const replitUrl = process.env.DATABASE_URL;
  // Support new 3-database architecture with legacy fallback
  const awsUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;

  if (!replitUrl || !awsUrl) {
    isSyncing = false;
    return {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      error: 'Missing database URLs. Set AWS_PROD_DATABASE_URL (or AWS_DATABASE_URL) and DATABASE_URL.'
    };
  }

  try {
    // SAFETY CHECK 1: Verify AWS has tables
    console.log('[DB Backup] Running safety checks...');
    const awsTableCount = await getTableCount(awsUrl);
    
    if (awsTableCount < MINIMUM_TABLES_FOR_SYNC && !options?.skipValidation) {
      isSyncing = false;
      const error = `SAFETY BLOCK: AWS RDS has only ${awsTableCount} tables (minimum: ${MINIMUM_TABLES_FOR_SYNC}). ` +
        `This looks like an empty or corrupted database. Sync aborted to prevent data loss.`;
      console.error(`[DB Backup] ❌ ${error}`);
      return {
        success: false,
        timestamp: new Date(),
        direction: 'aws-to-replit',
        error
      };
    }

    console.log(`[DB Backup] ✓ AWS RDS has ${awsTableCount} tables - proceeding with sync`);
    console.log('[DB Backup] Starting sync: AWS RDS → Replit');

    // Step 1: Create backup of Replit first (safety measure)
    const replitBackup = await createBackup('backup');
    if (replitBackup.success) {
      console.log(`[DB Backup] Created safety backup of Replit: ${replitBackup.filePath}`);
    }

    // Step 2: Drop tables in Replit
    await runCommand(
      `psql "${replitUrl}" -c "
        DO \\$\\$ 
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \\$\\$;
      "`,
      'Dropping existing tables in Replit'
    );

    // Step 3: Drop custom types in Replit
    await runCommand(
      `psql "${replitUrl}" -c "
        DO \\$\\$ 
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
        END \\$\\$;
      "`,
      'Dropping custom types in Replit'
    );

    // Step 4: Export from AWS RDS
    const backupFile = `/tmp/aws_sync_${Date.now()}.sql`;
    await runCommand(
      `pg_dump "${awsUrl}" --no-owner --no-acl -f ${backupFile}`,
      'Exporting from AWS RDS'
    );

    // Step 5: Import to Replit
    await runCommand(
      `psql "${replitUrl}" < ${backupFile} 2>&1 | grep -c "CREATE TABLE" || echo "0"`,
      'Importing to Replit database'
    );

    // Step 6: Cleanup temp file
    await runCommand(`rm -f ${backupFile}`, 'Cleaning up temp file');

    // Step 7: Verify sync
    const tableCountResult = await runCommand(
      `psql "${replitUrl}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'"`,
      'Verifying sync'
    );
    const tablesCount = parseInt(tableCountResult.trim()) || 0;

    const duration = Date.now() - startTime;
    
    const result: SyncResult = {
      success: true,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      tablesCount,
      duration
    };

    lastSyncResult = result;
    isSyncing = false;

    console.log(`[DB Backup] ✅ Sync completed successfully!`);
    console.log(`[DB Backup] Tables synced: ${tablesCount}`);
    console.log(`[DB Backup] Duration: ${(duration / 1000).toFixed(1)}s`);

    return result;

  } catch (error: any) {
    isSyncing = false;
    const duration = Date.now() - startTime;
    
    const result: SyncResult = {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      duration,
      error: error.message
    };

    lastSyncResult = result;
    console.error(`[DB Backup] ❌ Sync failed: ${error.message}`);

    return result;
  }
}

/**
 * DISABLED: This function is too dangerous for a financial application
 * Syncing TO production should only be done manually with extreme caution
 */
export async function syncReplitToAws(): Promise<SyncResult> {
  console.error('[DB Backup] ❌ syncReplitToAws is DISABLED for safety.');
  console.error('[DB Backup] Syncing development data to production is not allowed.');
  console.error('[DB Backup] To restore production, use manual pg_restore with explicit approval.');
  
  return {
    success: false,
    timestamp: new Date(),
    direction: 'replit-to-aws',
    error: 'This operation is disabled for safety. Syncing to production requires manual intervention.'
  };
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the hourly sync scheduler
 * Syncs AWS Production → Replit PostgreSQL (backup) every hour
 * Only starts if DB_SYNC_ENABLED=true AND ALLOW_DESTRUCTIVE_SYNC=true
 */
export function startSyncScheduler(): void {
  if (!SYNC_ENABLED) {
    console.log('[DB Backup] Hourly backup sync is DISABLED.');
    console.log('[DB Backup] To enable hourly AWS Prod → Replit backup, set:');
    console.log('[DB Backup]   DB_SYNC_ENABLED=true');
    console.log('[DB Backup]   ALLOW_DESTRUCTIVE_SYNC=true');
    console.log('[DB Backup] Manual backups are still available via API.');
    return;
  }

  if (!ALLOW_DESTRUCTIVE_SYNC) {
    console.log('[DB Backup] Hourly sync requires ALLOW_DESTRUCTIVE_SYNC=true');
    return;
  }

  if (syncInterval) {
    console.log('[DB Backup] Scheduler already running');
    return;
  }

  const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  console.log('[DB Backup] ✅ Starting hourly backup scheduler (AWS Prod → Replit)');
  console.log('[DB Backup] Next sync in 1 hour');

  syncInterval = setInterval(async () => {
    console.log('[DB Backup] Running scheduled hourly backup...');
    try {
      // Use normal sync (not forced) so safety checks remain effective
      const result = await syncAwsToReplit();
      if (result.success) {
        console.log(`[DB Backup] ✅ Hourly backup complete: ${result.tablesCount} tables synced`);
      } else {
        console.error(`[DB Backup] ❌ Hourly backup failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error(`[DB Backup] ❌ Hourly backup error: ${error.message}`);
    }
  }, SYNC_INTERVAL_MS);
}

export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[DB Backup] Scheduler stopped');
  } else {
    console.log('[DB Backup] Scheduler was not running');
  }
}

export function getSyncStatus(): {
  isRunning: boolean;
  isSyncing: boolean;
  lastSync: SyncResult | null;
  syncEnabled: boolean;
  destructiveSyncAllowed: boolean;
} {
  return {
    isRunning: syncInterval !== null,
    isSyncing,
    lastSync: lastSyncResult,
    syncEnabled: SYNC_ENABLED,
    destructiveSyncAllowed: ALLOW_DESTRUCTIVE_SYNC
  };
}

export async function verifySyncStatus(): Promise<{
  replit: { tables: number; users: number };
  aws: { tables: number; users: number };
  inSync: boolean;
}> {
  const replitUrl = process.env.DATABASE_URL;
  // Support new 3-database architecture with legacy fallback
  const awsUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;

  if (!replitUrl || !awsUrl) {
    throw new Error('Missing database URLs. Set AWS_PROD_DATABASE_URL (or AWS_DATABASE_URL) and DATABASE_URL.');
  }

  const replitTables = await getTableCount(replitUrl);
  const awsTables = await getTableCount(awsUrl);

  let replitUsers = 0;
  let awsUsers = 0;

  try {
    const rUsers = await execAsync(`psql "${replitUrl}" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0"`);
    replitUsers = parseInt(rUsers.stdout.trim()) || 0;
  } catch {}

  try {
    const aUsers = await execAsync(`psql "${awsUrl}" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0"`);
    awsUsers = parseInt(aUsers.stdout.trim()) || 0;
  } catch {}

  return {
    replit: { tables: replitTables, users: replitUsers },
    aws: { tables: awsTables, users: awsUsers },
    inSync: replitTables === awsTables && replitUsers === awsUsers
  };
}
