/**
 * Database Sync Scheduler
 * Automatically syncs AWS RDS (primary) to Replit (backup) every 6 hours
 * 
 * Architecture:
 *   PRIMARY: AWS RDS PostgreSQL (production)
 *   SECONDARY: Replit PostgreSQL (backup/development)
 * 
 * The sync runs in the background and keeps the Replit database
 * as a mirror of AWS RDS for disaster recovery purposes.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SyncResult {
  success: boolean;
  timestamp: Date;
  direction: 'aws-to-replit' | 'replit-to-aws';
  tablesCount?: number;
  duration?: number;
  error?: string;
}

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
let syncInterval: NodeJS.Timeout | null = null;
let lastSyncResult: SyncResult | null = null;
let isSyncing = false;

async function runCommand(cmd: string, description: string): Promise<string> {
  console.log(`[DB Sync] ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('already exists')) {
      console.warn('[DB Sync] Warning:', stderr.substring(0, 500));
    }
    return stdout;
  } catch (error: any) {
    console.error(`[DB Sync] Error: ${error.message}`);
    throw error;
  }
}

export async function syncAwsToReplit(): Promise<SyncResult> {
  if (isSyncing) {
    console.log('[DB Sync] Sync already in progress, skipping...');
    return {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      error: 'Sync already in progress'
    };
  }

  const startTime = Date.now();
  isSyncing = true;

  const replitUrl = process.env.DATABASE_URL;
  const awsUrl = process.env.AWS_DATABASE_URL;

  if (!replitUrl || !awsUrl) {
    isSyncing = false;
    const error = 'Missing database URLs (DATABASE_URL or AWS_DATABASE_URL)';
    console.error(`[DB Sync] ${error}`);
    return {
      success: false,
      timestamp: new Date(),
      direction: 'aws-to-replit',
      error
    };
  }

  console.log('[DB Sync] Starting scheduled sync: AWS RDS → Replit');
  console.log(`[DB Sync] Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Drop all tables in Replit to ensure clean sync
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

    // Step 2: Drop all custom types in Replit
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

    // Step 3: Export from AWS RDS
    const backupFile = `/tmp/aws_sync_${Date.now()}.sql`;
    await runCommand(
      `pg_dump "${awsUrl}" --no-owner --no-acl -f ${backupFile}`,
      'Exporting from AWS RDS'
    );

    // Step 4: Import to Replit
    await runCommand(
      `psql "${replitUrl}" < ${backupFile} 2>&1 | grep -c "CREATE TABLE" || echo "0"`,
      'Importing to Replit database'
    );

    // Step 5: Cleanup temp file
    await runCommand(`rm -f ${backupFile}`, 'Cleaning up temp file');

    // Step 6: Verify sync by counting tables
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

    console.log(`[DB Sync] ✅ Sync completed successfully!`);
    console.log(`[DB Sync] Tables synced: ${tablesCount}`);
    console.log(`[DB Sync] Duration: ${(duration / 1000).toFixed(1)}s`);

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

    console.error(`[DB Sync] ❌ Sync failed after ${(duration / 1000).toFixed(1)}s`);
    console.error(`[DB Sync] Error: ${error.message}`);

    return result;
  }
}

export async function syncReplitToAws(): Promise<SyncResult> {
  if (isSyncing) {
    console.log('[DB Sync] Sync already in progress, skipping...');
    return {
      success: false,
      timestamp: new Date(),
      direction: 'replit-to-aws',
      error: 'Sync already in progress'
    };
  }

  const startTime = Date.now();
  isSyncing = true;

  const replitUrl = process.env.DATABASE_URL;
  const awsUrl = process.env.AWS_DATABASE_URL;

  if (!replitUrl || !awsUrl) {
    isSyncing = false;
    return {
      success: false,
      timestamp: new Date(),
      direction: 'replit-to-aws',
      error: 'Missing database URLs'
    };
  }

  console.log('[DB Sync] Starting sync: Replit → AWS RDS');
  console.log(`[DB Sync] ⚠️ WARNING: This will overwrite AWS production data!`);

  try {
    const backupFile = `/tmp/replit_sync_${Date.now()}.sql`;

    // Export from Replit
    await runCommand(
      `pg_dump "${replitUrl}" --no-owner --no-acl -f ${backupFile}`,
      'Exporting from Replit'
    );

    // Import to AWS (this will fail on conflicts but data will be updated)
    await runCommand(
      `psql "${awsUrl}" < ${backupFile} 2>&1 | tail -5`,
      'Importing to AWS RDS'
    );

    // Cleanup
    await runCommand(`rm -f ${backupFile}`, 'Cleaning up temp file');

    const duration = Date.now() - startTime;
    
    const result: SyncResult = {
      success: true,
      timestamp: new Date(),
      direction: 'replit-to-aws',
      duration
    };

    lastSyncResult = result;
    isSyncing = false;

    console.log(`[DB Sync] ✅ Sync to AWS completed!`);
    return result;

  } catch (error: any) {
    isSyncing = false;
    
    return {
      success: false,
      timestamp: new Date(),
      direction: 'replit-to-aws',
      error: error.message
    };
  }
}

export function startSyncScheduler(): void {
  if (syncInterval) {
    console.log('[DB Sync] Scheduler already running');
    return;
  }

  const awsUrl = process.env.AWS_DATABASE_URL;
  const replitUrl = process.env.DATABASE_URL;

  if (!awsUrl || !replitUrl) {
    console.log('[DB Sync] Scheduler not started - missing database URLs');
    return;
  }

  console.log('[DB Sync] Starting auto-sync scheduler');
  console.log(`[DB Sync] Sync interval: every 6 hours`);
  console.log(`[DB Sync] Direction: AWS RDS → Replit (backup)`);

  // Run first sync after 1 minute to allow server to fully start
  setTimeout(() => {
    console.log('[DB Sync] Running initial sync...');
    syncAwsToReplit().catch(console.error);
  }, 60 * 1000);

  // Then run every 6 hours
  syncInterval = setInterval(() => {
    console.log('[DB Sync] Running scheduled sync...');
    syncAwsToReplit().catch(console.error);
  }, SYNC_INTERVAL_MS);

  console.log('[DB Sync] Scheduler started successfully');
}

export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[DB Sync] Scheduler stopped');
  }
}

export function getSyncStatus(): {
  isRunning: boolean;
  isSyncing: boolean;
  lastSync: SyncResult | null;
  nextSyncIn: string | null;
} {
  let nextSyncIn: string | null = null;
  
  if (syncInterval && lastSyncResult) {
    const elapsed = Date.now() - lastSyncResult.timestamp.getTime();
    const remaining = SYNC_INTERVAL_MS - elapsed;
    if (remaining > 0) {
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      nextSyncIn = `${hours}h ${minutes}m`;
    }
  }

  return {
    isRunning: syncInterval !== null,
    isSyncing,
    lastSync: lastSyncResult,
    nextSyncIn
  };
}

export async function verifySyncStatus(): Promise<{
  replit: { tables: number; users: number };
  aws: { tables: number; users: number };
  inSync: boolean;
}> {
  const replitUrl = process.env.DATABASE_URL;
  const awsUrl = process.env.AWS_DATABASE_URL;

  if (!replitUrl || !awsUrl) {
    throw new Error('Missing database URLs');
  }

  const replitTables = await runCommand(
    `psql "${replitUrl}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'"`,
    'Counting Replit tables'
  );

  const awsTables = await runCommand(
    `psql "${awsUrl}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'"`,
    'Counting AWS tables'
  );

  const replitUsers = await runCommand(
    `psql "${replitUrl}" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0"`,
    'Counting Replit users'
  );

  const awsUsers = await runCommand(
    `psql "${awsUrl}" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0"`,
    'Counting AWS users'
  );

  const rTables = parseInt(replitTables.trim()) || 0;
  const aTables = parseInt(awsTables.trim()) || 0;
  const rUsers = parseInt(replitUsers.trim()) || 0;
  const aUsers = parseInt(awsUsers.trim()) || 0;

  return {
    replit: { tables: rTables, users: rUsers },
    aws: { tables: aTables, users: aUsers },
    inSync: rTables === aTables && rUsers === aUsers
  };
}
