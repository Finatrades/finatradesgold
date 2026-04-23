import { pool } from '../server/db';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

async function syncSchema() {
  console.log("Creating all tables on AWS RDS...\n");
  
  const db = drizzle(pool, { schema });
  
  try {
    // Get all table names from schema
    const tableNames = Object.keys(schema).filter(k => 
      schema[k as keyof typeof schema] && 
      typeof schema[k as keyof typeof schema] === 'object' &&
      (schema[k as keyof typeof schema] as any)?._ !== undefined
    );
    
    console.log(`Found ${tableNames.length} tables in schema`);
    
    // Try raw SQL approach - get table creation from existing Replit DB
    const client = await pool.connect();
    
    // First, let's check pg_dump availability
    console.log("Attempting schema sync via drizzle-kit...");
    
    client.release();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

syncSchema();
