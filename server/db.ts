import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

/**
 * Multi-Database Configuration
 * 
 * PRIMARY: AWS RDS (production)
 * SECONDARY: Replit PostgreSQL (backup/fallback)
 * 
 * Environment Variables:
 * - AWS_DATABASE_URL: AWS RDS connection string (primary)
 * - DATABASE_URL: Replit PostgreSQL connection string (secondary/fallback)
 */

// Determine primary database URL
let primaryUrl = process.env.AWS_DATABASE_URL || process.env.DATABASE_URL;
const secondaryUrl = process.env.DATABASE_URL;

if (!primaryUrl) {
  throw new Error(
    "Database URL must be set. Set AWS_DATABASE_URL for production or DATABASE_URL for development.",
  );
}

// Log which database is being used
const isUsingAws = !!process.env.AWS_DATABASE_URL;

// Strip sslmode from connection string if present - we'll handle SSL via pool config
if (isUsingAws && primaryUrl.includes('sslmode=')) {
  primaryUrl = primaryUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
  console.log('[Database] Stripped sslmode from connection string - using pool SSL config');
}
console.log(`[Database] Primary: ${isUsingAws ? 'AWS RDS' : 'Replit PostgreSQL'}`);
if (secondaryUrl && isUsingAws) {
  console.log(`[Database] Secondary (backup): Replit PostgreSQL`);
}

// Configure SSL for AWS RDS connections
function getAwsSslConfig(): pg.PoolConfig['ssl'] {
  if (!isUsingAws) return undefined;
  
  // Check if relaxed SSL mode is explicitly requested (development only)
  const relaxedSsl = process.env.AWS_RDS_RELAXED_SSL === 'true' && process.env.NODE_ENV !== 'production';
  
  if (relaxedSsl) {
    console.log('[Database] Using SSL with relaxed certificate verification (development mode)');
    return { rejectUnauthorized: false };
  }
  
  // Default: Try to load AWS RDS CA bundle for secure certificate verification
  // Check multiple locations for production (dist/) and development environments
  const caBundlePaths = [
    path.join(process.cwd(), 'certs', 'aws-rds-global-bundle.pem'),
    path.join(process.cwd(), 'dist', 'certs', 'aws-rds-global-bundle.pem'),
    path.join(__dirname, 'certs', 'aws-rds-global-bundle.pem'),
    path.join(__dirname, '..', 'certs', 'aws-rds-global-bundle.pem'),
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

// Secondary database pool (Replit - for backup sync)
export const secondaryPool = secondaryUrl && isUsingAws
  ? new Pool({ 
      connectionString: secondaryUrl,
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
