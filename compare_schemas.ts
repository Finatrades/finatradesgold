import pg from 'pg';

async function compareSchemas() {
  const devUrl = process.env.DATABASE_URL;
  const prodUrl = process.env.AWS_DATABASE_URL;
  
  if (!devUrl || !prodUrl) {
    console.log("Missing database URLs");
    return;
  }
  
  const devClient = new pg.Client({ connectionString: devUrl });
  const prodClient = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
  
  await devClient.connect();
  await prodClient.connect();
  
  // Get tables from both databases
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const devTables = (await devClient.query(tablesQuery)).rows.map((r: any) => r.table_name);
  const prodTables = (await prodClient.query(tablesQuery)).rows.map((r: any) => r.table_name);
  
  console.log("=== DEVELOPMENT DATABASE ===");
  console.log(`Total tables: ${devTables.length}`);
  
  console.log("\n=== PRODUCTION DATABASE ===");
  console.log(`Total tables: ${prodTables.length}`);
  
  // Find missing tables in production
  const missingTables = devTables.filter((t: string) => !prodTables.includes(t));
  
  console.log("\n=== MISSING TABLES IN PRODUCTION ===");
  console.log(`Count: ${missingTables.length}`);
  if (missingTables.length > 0) {
    missingTables.forEach((t: string) => console.log(`  - ${t}`));
  }
  
  // For common tables, check for missing columns
  const commonTables = devTables.filter((t: string) => prodTables.includes(t));
  
  console.log("\n=== CHECKING COLUMNS IN COMMON TABLES ===");
  
  const columnsQuery = (table: string) => `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = '${table}'
    ORDER BY ordinal_position;
  `;
  
  let missingColumnsList: string[] = [];
  
  for (const table of commonTables) {
    const devCols = (await devClient.query(columnsQuery(table))).rows;
    const prodCols = (await prodClient.query(columnsQuery(table))).rows;
    
    const devColNames = devCols.map((c: any) => c.column_name);
    const prodColNames = prodCols.map((c: any) => c.column_name);
    
    const missingCols = devColNames.filter((c: string) => !prodColNames.includes(c));
    
    if (missingCols.length > 0) {
      console.log(`\n[${table}] Missing columns: ${missingCols.join(', ')}`);
      missingCols.forEach((col: string) => {
        const colInfo = devCols.find((c: any) => c.column_name === col);
        missingColumnsList.push(`${table}.${col} (${colInfo?.data_type})`);
      });
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Missing tables: ${missingTables.length}`);
  console.log(`Missing columns in existing tables: ${missingColumnsList.length}`);
  
  await devClient.end();
  await prodClient.end();
}

compareSchemas().catch(console.error);
