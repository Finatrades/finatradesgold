import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

const { Pool } = pg;

/**
 * 3-Database Architecture Configuration
 * 
 * DATABASE ROLES:
 * - PRODUCTION: AWS RDS Production (real users, live transactions)
 * - DEVELOPMENT: AWS RDS Development (testing, staging)
 * - BACKUP: Replit PostgreSQL (cold storage, disaster recovery)
 * 
 * Environment Variables:
 * - AWS_PROD_DATABASE_URL: AWS RDS production connection string
 * - AWS_DEV_DATABASE_URL: AWS RDS development connection string
 * - DATABASE_URL: Replit PostgreSQL (backup, managed by Replit)
 * 
 * Legacy Support:
 * - AWS_DATABASE_URL: Falls back to this if new vars not set (backwards compatibility)
 * 
 * Selection Logic:
 * - NODE_ENV=production → Uses AWS_PROD_DATABASE_URL
 * - NODE_ENV=development → Uses AWS_DEV_DATABASE_URL
 * - Fallback chain: AWS_PROD/DEV → AWS_DATABASE_URL → DATABASE_URL
 */

const isProduction = process.env.NODE_ENV === 'production';

// Determine which database URL to use and its role
interface DatabaseResolution {
  url: string;
  role: string;
  isAws: boolean;
  source: string;
}

function resolvePrimaryDatabase(): DatabaseResolution {
  // Priority 1: New architecture - AWS_PROD_DATABASE_URL for production
  if (isProduction && process.env.AWS_PROD_DATABASE_URL) {
    return {
      url: process.env.AWS_PROD_DATABASE_URL,
      role: 'AWS RDS Production',
      isAws: true,
      source: 'AWS_PROD_DATABASE_URL'
    };
  }
  
  // Priority 2: New architecture - AWS_DEV_DATABASE_URL for development
  if (!isProduction && process.env.AWS_DEV_DATABASE_URL) {
    return {
      url: process.env.AWS_DEV_DATABASE_URL,
      role: 'AWS RDS Development',
      isAws: true,
      source: 'AWS_DEV_DATABASE_URL'
    };
  }
  
  // Priority 3: Legacy - AWS_DATABASE_URL (backwards compatibility)
  if (process.env.AWS_DATABASE_URL) {
    return {
      url: process.env.AWS_DATABASE_URL,
      role: 'AWS RDS (Legacy)',
      isAws: true,
      source: 'AWS_DATABASE_URL'
    };
  }
  
  // Priority 4: Fallback - DATABASE_URL (Replit managed)
  if (process.env.DATABASE_URL) {
    return {
      url: process.env.DATABASE_URL,
      role: 'Replit PostgreSQL',
      isAws: false,
      source: 'DATABASE_URL'
    };
  }
  
  throw new Error(
    "Database URL must be set. Configure AWS_PROD_DATABASE_URL for production, AWS_DEV_DATABASE_URL for development, or DATABASE_URL as fallback.",
  );
}

// Resolve the primary database
const primaryDb = resolvePrimaryDatabase();
let primaryUrl = primaryDb.url;
const databaseRole = primaryDb.role;
const isUsingAws = primaryDb.isAws;

// Backup URL (always Replit if we're using AWS, null if already using Replit)
const backupUrl = isUsingAws ? process.env.DATABASE_URL : null;

// Strip sslmode from AWS connection strings - we'll handle SSL via pool config
if (isUsingAws && primaryUrl.includes('sslmode=')) {
  primaryUrl = primaryUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
  console.log('[Database] Stripped sslmode from connection string - using pool SSL config');
}

// Log database configuration
console.log(`[Database] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[Database] Primary: ${databaseRole} (from ${primaryDb.source})`);
if (backupUrl) {
  console.log(`[Database] Backup: Replit PostgreSQL`);
}

// Warn if using legacy configuration
if (primaryDb.source === 'AWS_DATABASE_URL') {
  console.warn('[Database] WARNING: Using legacy AWS_DATABASE_URL. Consider migrating to AWS_PROD_DATABASE_URL and AWS_DEV_DATABASE_URL for proper environment separation.');
}

// Configure SSL for AWS RDS connections only
function getAwsSslConfig(): pg.PoolConfig['ssl'] {
  // Only apply AWS SSL config when actually using AWS
  if (!isUsingAws) {
    return undefined;
  }
  
  // Check if SSL is explicitly disabled
  const sslDisabled = process.env.AWS_RDS_SSL_DISABLED === 'true';
  if (sslDisabled) {
    console.log('[Database] SSL disabled for AWS RDS connection');
    return false;
  }
  
  // Check if relaxed SSL mode is explicitly requested (development only)
  const relaxedSsl = process.env.AWS_RDS_RELAXED_SSL === 'true' && !isProduction;
  
  if (relaxedSsl) {
    console.log('[Database] Using SSL with relaxed certificate verification (development mode)');
    return { rejectUnauthorized: false };
  }
  
  // Default: Try to load AWS RDS CA bundle for secure certificate verification
  const cwd = process.cwd();
  const caBundlePaths = [
    path.join(cwd, 'certs', 'aws-rds-global-bundle.pem'),
    path.join(cwd, 'dist', 'certs', 'aws-rds-global-bundle.pem'),
    '/etc/ssl/certs/aws-rds-global-bundle.pem',
  ];
  
  for (const caPath of caBundlePaths) {
    try {
      if (fs.existsSync(caPath)) {
        const ca = fs.readFileSync(caPath, 'utf8');
        console.log(`[Database] Using AWS RDS CA bundle from: ${caPath}`);
        return { ca, rejectUnauthorized: true };
      }
    } catch (err) {
      console.warn(`[Database] Failed to read CA bundle from ${caPath}:`, err);
    }
  }
  
  // Fallback: If in development and CA bundle not found, use relaxed mode with warning
  if (!isProduction) {
    console.warn('[Database] WARNING: AWS RDS CA bundle not found. Using relaxed SSL for development.');
    console.warn('[Database] For production, ensure certs/aws-rds-global-bundle.pem exists.');
    return { rejectUnauthorized: false };
  }
  
  // In production without CA bundle, fail securely
  throw new Error('[Database] SECURITY: AWS RDS CA bundle required in production. Add certs/aws-rds-global-bundle.pem');
}

// Primary database pool
export const pool = new Pool({ 
  connectionString: primaryUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: getAwsSslConfig(),
});

// Backup database pool (Replit - only when using AWS as primary)
export const backupPool = backupUrl
  ? new Pool({ 
      connectionString: backupUrl,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  : null;

// Legacy alias for backwards compatibility
export const secondaryPool = backupPool;

// Primary Drizzle instance (used by the app)
export const db = drizzle(pool, { schema });

// Backup Drizzle instance (for backup/sync operations)
export const backupDb = backupPool 
  ? drizzle(backupPool, { schema }) 
  : null;

// Legacy alias for backwards compatibility
export const secondaryDb = backupDb;

// Export database configuration info
export const dbConfig = {
  isProduction,
  databaseRole,
  isUsingAws,
  hasBackup: !!backupPool,
  primarySource: primaryDb.source,
  hasAwsProd: !!process.env.AWS_PROD_DATABASE_URL,
  hasAwsDev: !!process.env.AWS_DEV_DATABASE_URL,
  hasLegacyAws: primaryDb.source === 'AWS_DATABASE_URL',
};

// Health check for database connections
export async function checkDatabaseHealth(): Promise<{
  primary: boolean;
  backup: boolean | null;
  primaryType: string;
  environment: string;
}> {
  let primaryOk = false;
  let backupOk: boolean | null = null;

  try {
    await pool.query('SELECT 1');
    primaryOk = true;
  } catch (error) {
    console.error('[Database] Primary connection failed:', error);
  }

  if (backupPool) {
    try {
      await backupPool.query('SELECT 1');
      backupOk = true;
    } catch (error) {
      console.error('[Database] Backup connection failed:', error);
      backupOk = false;
    }
  }

  return {
    primary: primaryOk,
    backup: backupOk,
    primaryType: databaseRole,
    environment: isProduction ? 'production' : 'development',
  };
}

// Get connection info for specific database role
export function getDatabaseUrl(role: 'prod' | 'dev' | 'backup' | 'current'): string | null {
  switch (role) {
    case 'prod':
      return process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL || null;
    case 'dev':
      return process.env.AWS_DEV_DATABASE_URL || null;
    case 'backup':
      return process.env.DATABASE_URL || null;
    case 'current':
      return primaryUrl;
    default:
      return null;
  }
}
