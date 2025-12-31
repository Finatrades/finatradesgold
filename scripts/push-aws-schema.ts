import { pool, secondaryPool } from '../server/db';
import pg from 'pg';

async function getTableDDL(client: pg.PoolClient): Promise<string[]> {
  // Get all table creation statements from the Replit DB (which has the schema)
  const result = await client.query(`
    SELECT 
      'CREATE TABLE IF NOT EXISTS "' || tablename || '" (' ||
      string_agg(
        '"' || column_name || '" ' || 
        data_type || 
        CASE WHEN character_maximum_length IS NOT NULL 
          THEN '(' || character_maximum_length || ')' 
          ELSE '' 
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
      ) || ');' as ddl
    FROM pg_tables t
    JOIN information_schema.columns c ON c.table_name = t.tablename AND c.table_schema = 'public'
    WHERE t.schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename;
  `);
  
  return result.rows.map(r => r.ddl);
}

async function pushSchema() {
  console.log("Syncing schema from Replit DB → AWS RDS...\n");
  
  try {
    // First check Replit DB has tables
    const replitClient = await secondaryPool.connect();
    const replitTables = await replitClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Replit DB has ${replitTables.rows.length} tables`);
    replitClient.release();
    
    if (replitTables.rows.length === 0) {
      console.log("Replit DB is also empty! Running drizzle push to Replit first...");
      return;
    }
    
    // Use pg_dump from Replit and restore to AWS
    console.log("\nReplit tables exist. Use db:push with AWS_DATABASE_URL override.");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
    await secondaryPool.end();
  }
}

pushSchema();
