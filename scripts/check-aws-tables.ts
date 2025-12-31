import { pool } from '../server/db';

async function checkTables() {
  console.log("Checking tables in AWS RDS...");
  
  try {
    const client = await pool.connect();
    
    // Check which tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`\nExisting tables (${result.rows.length}):`);
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    client.release();
  } finally {
    await pool.end();
  }
}

checkTables();
