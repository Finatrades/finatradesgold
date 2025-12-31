/**
 * Database Backup & Sync Manager (3-DATABASE ARCHITECTURE)
 * 
 * IMPORTANT: Auto-sync is DISABLED by default for safety.
 * This module provides manual backup and restore functions only.
 * 
 * Architecture:
 *   PRODUCTION: AWS RDS Production (AWS_PROD_DATABASE_URL)
 *   DEVELOPMENT: AWS RDS Development (AWS_DEV_DATABASE_URL)
 *   BACKUP: Replit PostgreSQL (DATABASE_URL)
 * 
 * Legacy Support:
 *   AWS_DATABASE_URL is supported for backwards compatibility
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
const MINIMUM_TABLES_FOR_SYNC = 50;
const SYNC_ENABLED = process.env.DB_SYNC_ENABLED === 'true';
const ALLOW_DESTRUCTIVE_SYNC = process.env.ALLOW_DESTRUCTIVE_SYNC === 'true';

// Database role types
type DatabaseRole = 'prod' | 'dev' | 'backup';

interface SyncResult {
  success: boolean;
  timestamp: Date;
  direction: string;
  tablesCount?: number;
  duration?: number;
  error?: string;
}

interface DatabaseStatus {
  url: string;
  name: string;
  role: DatabaseRole;
  tables: number;
  hasData: boolean;
  configured: boolean;
}

let lastSyncResult: SyncResult | null = null;
let isSyncing = false;

/**
 * Get database URL by role
 */
function getDatabaseUrlByRole(role: DatabaseRole): string | null {
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

/**
 * Get database name by role
 */
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
 * Check database status for all 3 databases
 */
export async function getDatabaseStatus(): Promise<{
  prod: DatabaseStatus | null;
  dev: DatabaseStatus | null;
  backup: DatabaseStatus | null;
  syncEnabled: boolean;
  destructiveSyncAllowed: boolean;
  architecture: '3-database' | 'legacy';
}> {
  const roles: DatabaseRole[] = ['prod', 'dev', 'backup'];
  const statuses: Record<string, DatabaseStatus | null> = {};

  for (const role of roles) {
    const url = getDatabaseUrlByRole(role);
    if (url) {
      const tables = await getTableCount(url);
      statuses[role] = {
        url: '***HIDDEN***',
        name: getDatabaseName(role),
        role,
        tables,
        hasData: tables >= MINIMUM_TABLES_FOR_SYNC,
        configured: true
      };
    } else {
      statuses[role] = null;
    }
  }

  // Determine if using new 3-database architecture or legacy
  const hasNewArchitecture = !!(process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DEV_DATABASE_URL);

  return {
    prod: statuses.prod,
    dev: statuses.dev,
    backup: statuses.backup,
    syncEnabled: SYNC_ENABLED,
    destructiveSyncAllowed: ALLOW_DESTRUCTIVE_SYNC,
    architecture: hasNewArchitecture ? '3-database' : 'legacy'
  };
}

// Legacy alias for backwards compatibility
export async function getAwsReplitStatus() {
  const status = await getDatabaseStatus();
  return {
    aws: status.prod,
    replit: status.backup,
    syncEnabled: status.syncEnabled,
    destructiveSyncAllowed: status.destructiveSyncAllowed
  };
}

/**
 * Create a backup of a database to a file (NON-DESTRUCTIVE)
 */
export async function createBackup(source: DatabaseRole | 'aws' | 'replit'): Promise<{
  success: boolean;
  filePath?: string;
  tablesCount?: number;
  error?: string;
}> {
  // Map legacy names to new roles
  let role: DatabaseRole;
  if (source === 'aws') role = 'prod';
  else if (source === 'replit') role = 'backup';
  else role = source;

  const dbUrl = getDatabaseUrlByRole(role);
  
  if (!dbUrl) {
    return { success: false, error: `Missing ${getDatabaseName(role)} database URL` };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `/tmp/backup_${role}_${timestamp}.sql`;

  try {
    const tableCount = await getTableCount(dbUrl);
    
    if (tableCount === 0) {
      return { success: false, error: `${getDatabaseName(role)} has no tables - nothing to backup` };
    }

    console.log(`[DB Backup] Creating backup of ${getDatabaseName(role)} (${tableCount} tables)`);
    
    await runCommand(
      `pg_dump "${dbUrl}" --no-owner --no-acl -f ${backupFile}`,
      `Exporting ${getDatabaseName(role)}`
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
 * Sync from production to backup (SAFE - primary backup flow)
 */
export async function syncProdToBackup(options?: {
  force?: boolean;
}): Promise<SyncResult> {
  if (isSyncing) {
    return {
      success: false,
      timestamp: new Date(),
      direction: 'prod-to-backup',
      error: 'Another sync operation is in progress'
    };
  }

  if (!SYNC_ENABLED) {
    return {
      success: false,
      timestamp: new Date(),
      direction: 'prod-to-backup',
      error: 'Sync is disabled. Set DB_SYNC_ENABLED=true to enable.'
    };
  }

  const prodUrl = getDatabaseUrlByRole('prod');
  const backupUrl = getDatabaseUrlByRole('backup');

  if (!prodUrl || !backupUrl) {
    return {
      success: false,
      timestamp: new Date(),
      direction: 'prod-to-backup',
      error: 'Both production and backup databases must be configured'
    };
  }

  isSyncing = true;
  const startTime = Date.now();

  try {
    const tableCount = await getTableCount(prodUrl);
    
    if (tableCount < MINIMUM_TABLES_FOR_SYNC && !options?.force) {
      throw new Error(`Production has only ${tableCount} tables. Minimum ${MINIMUM_TABLES_FOR_SYNC} required. Use force=true to override.`);
    }

    // Dump production
    console.log('[DB Backup] Dumping production database...');
    const dumpFile = `/tmp/prod_to_backup_${Date.now()}.sql`;
    await runCommand(`pg_dump "${prodUrl}" --no-owner --no-acl -f ${dumpFile}`, 'Dumping production');

    // Restore to backup
    if (ALLOW_DESTRUCTIVE_SYNC) {
      console.log('[DB Backup] Restoring to backup database...');
      await runCommand(`psql "${backupUrl}" -f ${dumpFile}`, 'Restoring to backup');
    } else {
      throw new Error('Destructive sync not allowed. Set ALLOW_DESTRUCTIVE_SYNC=true to enable.');
    }

    const duration = Date.now() - startTime;
    lastSyncResult = {
      success: true,
      timestamp: new Date(),
      direction: 'prod-to-backup',
      tablesCount: tableCount,
      duration
    };

    return lastSyncResult;
  } catch (error: any) {
    lastSyncResult = {
      success: false,
      timestamp: new Date(),
      direction: 'prod-to-backup',
      error: error.message
    };
    return lastSyncResult;
  } finally {
    isSyncing = false;
  }
}

// Legacy aliases for backwards compatibility
export async function syncAwsToReplit(options?: { force?: boolean; skipValidation?: boolean }): Promise<SyncResult> {
  return syncProdToBackup(options);
}

export async function syncReplitToAws(options?: { force?: boolean; skipValidation?: boolean }): Promise<SyncResult> {
  return {
    success: false,
    timestamp: new Date(),
    direction: 'backup-to-prod',
    error: 'Syncing from backup to production is blocked for safety. Use restore command with CONFIRM_PRODUCTION_RESTORE=yes'
  };
}

/**
 * Push schema from one database to another (SCHEMA ONLY, no data)
 */
export async function pushSchema(source: DatabaseRole, target: DatabaseRole): Promise<{
  success: boolean;
  error?: string;
}> {
  const sourceUrl = getDatabaseUrlByRole(source);
  const targetUrl = getDatabaseUrlByRole(target);

  if (!sourceUrl || !targetUrl) {
    return { success: false, error: 'Both source and target databases must be configured' };
  }

  if (target === 'prod' && process.env.CONFIRM_PRODUCTION_SCHEMA_PUSH !== 'yes') {
    return { 
      success: false, 
      error: 'Pushing schema to production requires CONFIRM_PRODUCTION_SCHEMA_PUSH=yes' 
    };
  }

  try {
    console.log(`[DB Backup] Pushing schema from ${getDatabaseName(source)} to ${getDatabaseName(target)}`);
    
    // Dump schema only
    const schemaFile = `/tmp/schema_${source}_${Date.now()}.sql`;
    await runCommand(
      `pg_dump "${sourceUrl}" --schema-only --no-owner --no-acl -f ${schemaFile}`,
      'Dumping schema'
    );

    // Apply schema
    await runCommand(
      `psql "${targetUrl}" -f ${schemaFile}`,
      'Applying schema'
    );

    console.log('[DB Backup] ✅ Schema pushed successfully');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify sync status
 */
export function verifySyncStatus(): { lastSync: SyncResult | null; isSyncing: boolean } {
  return { lastSync: lastSyncResult, isSyncing };
}

/**
 * Get sync status for API
 */
export function getSyncStatus(): {
  enabled: boolean;
  isRunning: boolean;
  lastSync: SyncResult | null;
  architecture: string;
} {
  const hasNewArchitecture = !!(process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DEV_DATABASE_URL);
  
  return {
    enabled: SYNC_ENABLED,
    isRunning: isSyncing,
    lastSync: lastSyncResult,
    architecture: hasNewArchitecture ? '3-database' : 'legacy'
  };
}

/**
 * Start the sync scheduler - DISABLED BY DEFAULT
 */
export function startSyncScheduler(): void {
  console.log('[DB Backup] Auto-sync scheduler is DISABLED for safety.');
  console.log('[DB Backup] To enable, set both:');
  console.log('[DB Backup]   DB_SYNC_ENABLED=true');
  console.log('[DB Backup]   ALLOW_DESTRUCTIVE_SYNC=true');
  console.log('[DB Backup] Manual backups are still available via API.');
}

export function stopSyncScheduler(): void {
  console.log('[DB Backup] Scheduler is already disabled');
}
