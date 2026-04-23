import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Database URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const secondaryPool = null;

export const db = drizzle(pool, { schema });
export const secondaryDb = null;

export async function checkDatabaseHealth() {
  let primaryOk = false;
  try {
    await pool.query('SELECT 1');
    primaryOk = true;
  } catch (error) {
    console.error('[Database] Primary connection failed:', error);
  }
  return {
    primary: primaryOk,
    secondary: null,
    primaryType: 'Replit PostgreSQL',
  };
}
