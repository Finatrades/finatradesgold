import { pool } from '../server/db';

async function resetAndSync() {
  console.log("Dropping all tables in AWS RDS and preparing for fresh schema push...\n");
  
  const client = await pool.connect();
  
  try {
    // Get all tables
    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    
    console.log("Found " + tablesResult.rows.length + " tables to drop");
    
    // Disable foreign key checks and drop all tables
    await client.query("SET session_replication_role = 'replica'");
    
    for (const row of tablesResult.rows) {
      console.log("  Dropping: " + row.table_name);
      await client.query("DROP TABLE IF EXISTS \"" + row.table_name + "\" CASCADE");
    }
    
    // Re-enable foreign key checks
    await client.query("SET session_replication_role = 'origin'");
    
    // Also drop any enums
    const enumsResult = await client.query(
      "SELECT typname FROM pg_type WHERE typcategory = 'E'"
    );
    for (const row of enumsResult.rows) {
      console.log("  Dropping enum: " + row.typname);
      await client.query("DROP TYPE IF EXISTS \"" + row.typname + "\" CASCADE");
    }
    
    console.log("\n✅ All tables and enums dropped. Database is now clean.");

    // Verify empty
    const checkResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    console.log("Tables remaining: " + checkResult.rows.length);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetAndSync();
