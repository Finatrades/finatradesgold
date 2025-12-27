const pg = require('pg');
const { Pool } = pg;

// Source: Replit database
const sourcePool = new Pool({ connectionString: process.env.DATABASE_URL });

// Target: AWS RDS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const targetPool = new Pool({ 
  connectionString: process.env.AWS_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Starting migration from Replit to AWS RDS...\n');
  
  // Get list of tables
  const tablesRes = await sourcePool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables to migrate\n`);
  
  // Disable foreign key checks on target
  await targetPool.query('SET session_replication_role = replica;');
  
  let successCount = 0;
  let errorCount = 0;
  let totalRows = 0;
  
  for (const table of tables) {
    try {
      // Get row count from source
      const countRes = await sourcePool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const rowCount = parseInt(countRes.rows[0].cnt);
      
      if (rowCount === 0) {
        console.log(`[SKIP] ${table}: empty`);
        continue;
      }
      
      // Get all data from source
      const dataRes = await sourcePool.query(`SELECT * FROM "${table}"`);
      
      if (dataRes.rows.length === 0) continue;
      
      // Get column names
      const columns = Object.keys(dataRes.rows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');
      
      // Clear target table first
      await targetPool.query(`DELETE FROM "${table}"`);
      
      // Insert rows one by one
      let inserted = 0;
      for (const row of dataRes.rows) {
        const values = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const params = columns.map(c => row[c]);
        
        try {
          await targetPool.query(
            `INSERT INTO "${table}" (${colNames}) VALUES (${values}) ON CONFLICT DO NOTHING`,
            params
          );
          inserted++;
        } catch (insertErr) {
          // Skip individual row errors
        }
      }
      
      console.log(`[OK] ${table}: ${inserted}/${rowCount} rows`);
      successCount++;
      totalRows += inserted;
      
    } catch (err) {
      console.log(`[ERR] ${table}: ${err.message.substring(0, 60)}`);
      errorCount++;
    }
  }
  
  // Re-enable foreign key checks
  await targetPool.query('SET session_replication_role = DEFAULT;');
  
  console.log(`\nMigration complete!`);
  console.log(`Tables: ${successCount} success, ${errorCount} errors`);
  console.log(`Total rows migrated: ${totalRows}`);
  
  await sourcePool.end();
  await targetPool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
