import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

const { Pool } = pg;

/**
 * Multi-Database Configuration (3-Database Architecture)
 * 
 * PRODUCTION: AWS RDS (AWS_PROD_DATABASE_URL) - Real users
 * DEVELOPMENT: AWS RDS (AWS_DEV_DATABASE_URL) - Testing/Development
 * BACKUP: Replit PostgreSQL (DATABASE_URL) - Cold storage backup
 * 
 * Environment Variables:
 * - AWS_PROD_DATABASE_URL: AWS RDS production database
 * - AWS_DEV_DATABASE_URL: AWS RDS development database
 * - DATABASE_URL: Replit PostgreSQL backup database
 * 
 * Legacy support:
 * - AWS_DATABASE_URL: Falls back for backward compatibility
 */

const isProduction = process.env.NODE_ENV === 'production';

// Detect Replit environment - Replit intercepts AWS RDS DNS, so we must use their DATABASE_URL
const isReplitEnv = !!(process.env.REPL_ID || process.env.REPL_SLUG || process.env.REPLIT);

// Determine primary database URL based on environment
let primaryUrl: string | undefined;
let databaseRole: 'production' | 'development' | 'legacy' | 'replit' = 'legacy';

if (isProduction) {
  // Production: Use AWS_PROD_DATABASE_URL
  primaryUrl = process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DATABASE_URL;
  databaseRole = process.env.AWS_PROD_DATABASE_URL ? 'production' : 'legacy';
} else if (isReplitEnv && process.env.DATABASE_URL) {
  // Replit Development: Use DATABASE_URL because Replit intercepts AWS RDS connections
  primaryUrl = process.env.DATABASE_URL;
  databaseRole = 'replit';
  console.log('[Database] Replit environment detected - using Replit PostgreSQL');
} else {
  // External Development: Use AWS_DEV_DATABASE_URL, fallback to DATABASE_URL
  primaryUrl = process.env.AWS_DEV_DATABASE_URL || process.env.AWS_DATABASE_URL || process.env.DATABASE_URL;
  databaseRole = process.env.AWS_DEV_DATABASE_URL ? 'development' : 'legacy';
}

// Backup database is always Replit's DATABASE_URL
const backupUrl = process.env.DATABASE_URL;

if (!primaryUrl) {
  throw new Error(
    "Database URL must be set. Set AWS_PROD_DATABASE_URL for production or AWS_DEV_DATABASE_URL for development.",
  );
}

// Log which database is being used
// In Replit development, we use Replit's DATABASE_URL even if AWS vars are set
const isUsingAws = databaseRole !== 'replit' && !!(process.env.AWS_PROD_DATABASE_URL || process.env.AWS_DEV_DATABASE_URL || process.env.AWS_DATABASE_URL);

// Strip sslmode from connection string if present - we'll handle SSL via pool config
if (isUsingAws && primaryUrl.includes('sslmode=')) {
  primaryUrl = primaryUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
  console.log('[Database] Stripped sslmode from connection string - using pool SSL config');
}
console.log(`[Database] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
if (databaseRole === 'replit') {
  console.log('[Database] Primary: Replit PostgreSQL (Replit environment)');
} else {
  console.log(`[Database] Primary: ${isUsingAws ? `AWS RDS (${databaseRole})` : 'Replit PostgreSQL'}`);
}
if (backupUrl && isUsingAws) {
  console.log(`[Database] Backup: Replit PostgreSQL`);
}

// Configure SSL for AWS RDS connections
function getAwsSslConfig(): pg.PoolConfig['ssl'] {
  if (!isUsingAws) return undefined;
  
  // Check if SSL is explicitly disabled
  const sslDisabled = process.env.AWS_RDS_SSL_DISABLED === 'true';
  if (sslDisabled) {
    console.log('[Database] SSL disabled for AWS RDS connection');
    return false;
  }
  
  // Check if relaxed SSL mode is explicitly requested (development only)
  const relaxedSsl = process.env.AWS_RDS_RELAXED_SSL === 'true' && process.env.NODE_ENV !== 'production';
  
  if (relaxedSsl) {
    console.log('[Database] Using SSL with relaxed certificate verification (development mode)');
    return { rejectUnauthorized: false };
  }
  
  // Default: Try to load AWS RDS CA bundle for secure certificate verification
  // Check multiple locations for production (dist/) and development environments
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
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Database] WARNING: AWS RDS CA bundle not found. Using relaxed SSL for development.');
    console.warn('[Database] For production, ensure certs/aws-rds-global-bundle.pem exists.');
    return { rejectUnauthorized: false };
  }
  
  // In production without CA bundle, fail securely
  throw new Error('[Database] SECURITY: AWS RDS CA bundle required in production. Add certs/aws-rds-global-bundle.pem');
}

// Primary database pool (AWS RDS in production)
export const pool = new Pool({ 
  connectionString: primaryUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: getAwsSslConfig(),
});

// Backup database pool (Replit - for backup sync)
export const secondaryPool = backupUrl && isUsingAws
  ? new Pool({ 
      connectionString: backupUrl,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  : null;

// Primary Drizzle instance (used by the app)
export const db = drizzle(pool, { schema });

// Secondary Drizzle instance (for backup operations)
export const secondaryDb = secondaryPool 
  ? drizzle(secondaryPool, { schema }) 
  : null;

// Health check for database connections
export async function checkDatabaseHealth(): Promise<{
  primary: boolean;
  secondary: boolean | null;
  primaryType: string;
}> {
  let primaryOk = false;
  let secondaryOk: boolean | null = null;

  try {
    await pool.query('SELECT 1');
    primaryOk = true;
  } catch (error) {
    console.error('[Database] Primary connection failed:', error);
  }

  if (secondaryPool) {
    try {
      await secondaryPool.query('SELECT 1');
      secondaryOk = true;
    } catch (error) {
      console.error('[Database] Secondary connection failed:', error);
      secondaryOk = false;
    }
  }

  return {
    primary: primaryOk,
    secondary: secondaryOk,
    primaryType: isUsingAws ? 'AWS RDS' : 'Replit PostgreSQL',
  };
}
