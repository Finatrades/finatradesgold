import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Disable SSL certificate validation for AWS RDS connections
// AWS RDS uses certificates that may not be in the system trust store
if (process.env.AWS_DATABASE_URL) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

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
const primaryUrl = process.env.AWS_DATABASE_URL || process.env.DATABASE_URL;
const secondaryUrl = process.env.DATABASE_URL;

if (!primaryUrl) {
  throw new Error(
    "Database URL must be set. Set AWS_DATABASE_URL for production or DATABASE_URL for development.",
  );
}

// Log which database is being used
const isUsingAws = !!process.env.AWS_DATABASE_URL;
console.log(`[Database] Primary: ${isUsingAws ? 'AWS RDS' : 'Replit PostgreSQL'}`);
if (secondaryUrl && isUsingAws) {
  console.log(`[Database] Secondary (backup): Replit PostgreSQL`);
}

// Primary database pool (AWS RDS in production)
export const pool = new Pool({ 
  connectionString: primaryUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Enable SSL for AWS RDS connections with relaxed certificate validation
  ssl: isUsingAws ? { rejectUnauthorized: false } : undefined,
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
