import pg from 'pg';

// Types that are essentially equivalent in PostgreSQL
const EQUIVALENT_TYPES: [string, string][] = [
  ['jsonb', 'json'],
  ['text', 'character varying'],
  ['character varying', 'text'],
  ['integer', 'int4'],
  ['bigint', 'int8'],
  ['smallint', 'int2'],
  ['double precision', 'float8'],
  ['real', 'float4'],
  ['boolean', 'bool'],
  ['timestamp with time zone', 'timestamptz'],
  ['timestamp without time zone', 'timestamp'],
  ['time with time zone', 'timetz'],
  ['time without time zone', 'time'],
];

function areTypesEquivalent(type1: string, type2: string): boolean {
  if (type1 === type2) return true;
  
  // Normalize types for comparison
  const t1 = type1.toLowerCase().trim();
  const t2 = type2.toLowerCase().trim();
  
  if (t1 === t2) return true;
  
  // Check if they're equivalent
  for (const [a, b] of EQUIVALENT_TYPES) {
    if ((t1 === a && t2 === b) || (t1 === b && t2 === a)) {
      return true;
    }
  }
  
  return false;
}

interface SchemaDiff {
  missingTables: string[];
  missingColumns: { table: string; column: string; dataType: string }[];
  typeMismatches: { table: string; column: string; devType: string; prodType: string }[];
  devTableCount: number;
  prodTableCount: number;
}

interface SyncResult {
  success: boolean;
  tablesCreated: number;
  columnsAdded: number;
  errors: string[];
}

export async function compareSchemas(): Promise<SchemaDiff> {
  const devUrl = process.env.DATABASE_URL;
  const prodUrl = process.env.AWS_DATABASE_URL;
  
  if (!devUrl || !prodUrl) {
    throw new Error('Database URLs not configured');
  }
  
  const devClient = new pg.Client({ connectionString: devUrl });
  const prodClient = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
  
  await devClient.connect();
  await prodClient.connect();
  
  try {
    // Get tables from both databases
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const devTables = (await devClient.query(tablesQuery)).rows.map((r: any) => r.table_name);
    const prodTables = (await prodClient.query(tablesQuery)).rows.map((r: any) => r.table_name);
    
    const missingTables = devTables.filter((t: string) => !prodTables.includes(t));
    
    // Check columns in common tables
    const commonTables = devTables.filter((t: string) => prodTables.includes(t));
    
    const columnsQuery = (table: string) => `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${table}'
      ORDER BY ordinal_position;
    `;
    
    const missingColumns: { table: string; column: string; dataType: string }[] = [];
    const typeMismatches: { table: string; column: string; devType: string; prodType: string }[] = [];
    
    for (const table of commonTables) {
      const devCols = (await devClient.query(columnsQuery(table))).rows;
      const prodCols = (await prodClient.query(columnsQuery(table))).rows;
      
      const prodColMap = new Map(prodCols.map((c: any) => [c.column_name, c]));
      
      for (const devCol of devCols) {
        const prodCol = prodColMap.get(devCol.column_name);
        if (!prodCol) {
          missingColumns.push({
            table,
            column: devCol.column_name,
            dataType: devCol.data_type
          });
        } else if (!areTypesEquivalent(devCol.data_type, prodCol.data_type)) {
          // Only report real type mismatches, not equivalent types
          typeMismatches.push({
            table,
            column: devCol.column_name,
            devType: devCol.data_type,
            prodType: prodCol.data_type
          });
        }
      }
    }
    
    return {
      missingTables,
      missingColumns,
      typeMismatches,
      devTableCount: devTables.length,
      prodTableCount: prodTables.length
    };
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

export async function applyMissingSchema(diff: SchemaDiff): Promise<SyncResult> {
  const devUrl = process.env.DATABASE_URL;
  const prodUrl = process.env.AWS_DATABASE_URL;
  
  if (!devUrl || !prodUrl) {
    throw new Error('Database URLs not configured');
  }
  
  const devClient = new pg.Client({ connectionString: devUrl });
  const prodClient = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
  
  await devClient.connect();
  await prodClient.connect();
  
  const errors: string[] = [];
  let tablesCreated = 0;
  let columnsAdded = 0;
  
  try {
    // Create missing tables by copying structure from dev
    for (const tableName of diff.missingTables) {
      try {
        // Get table definition from dev
        const tableDefQuery = `
          SELECT column_name, data_type, is_nullable, column_default,
                 character_maximum_length, numeric_precision, numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `;
        const cols = (await devClient.query(tableDefQuery, [tableName])).rows;
        
        if (cols.length === 0) continue;
        
        // Build CREATE TABLE statement
        const colDefs = cols.map((col: any) => {
          let def = `"${col.column_name}" `;
          
          // Map data types
          if (col.data_type === 'character varying') {
            def += col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar(255)';
          } else if (col.data_type === 'numeric') {
            def += col.numeric_precision && col.numeric_scale 
              ? `numeric(${col.numeric_precision}, ${col.numeric_scale})`
              : 'numeric(20, 6)';
          } else if (col.data_type === 'ARRAY') {
            def += 'text[]';
          } else {
            def += col.data_type;
          }
          
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default) def += ` DEFAULT ${col.column_default}`;
          
          return def;
        }).join(',\n  ');
        
        // Check for primary key
        const pkQuery = `
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary;
        `;
        let pkCol = null;
        try {
          const pkResult = await devClient.query(pkQuery, [tableName]);
          if (pkResult.rows.length > 0) {
            pkCol = pkResult.rows[0].attname;
          }
        } catch {}
        
        let createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs}`;
        if (pkCol) {
          createSql += `,\n  PRIMARY KEY ("${pkCol}")`;
        }
        createSql += '\n);';
        
        await prodClient.query(createSql);
        tablesCreated++;
      } catch (err: any) {
        errors.push(`Table ${tableName}: ${err.message}`);
      }
    }
    
    // Add missing columns
    for (const { table, column, dataType } of diff.missingColumns) {
      try {
        // Get full column definition from dev
        const colDefQuery = `
          SELECT data_type, is_nullable, column_default,
                 character_maximum_length, numeric_precision, numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2;
        `;
        const colResult = await devClient.query(colDefQuery, [table, column]);
        
        if (colResult.rows.length === 0) continue;
        const col = colResult.rows[0];
        
        let typeDef = '';
        if (col.data_type === 'character varying') {
          typeDef = col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar(255)';
        } else if (col.data_type === 'numeric') {
          typeDef = col.numeric_precision && col.numeric_scale 
            ? `numeric(${col.numeric_precision}, ${col.numeric_scale})`
            : 'numeric(20, 6)';
        } else if (col.data_type === 'ARRAY') {
          typeDef = 'text[]';
        } else {
          typeDef = col.data_type;
        }
        
        let alterSql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${typeDef}`;
        if (col.column_default) {
          alterSql += ` DEFAULT ${col.column_default}`;
        }
        
        await prodClient.query(alterSql);
        columnsAdded++;
      } catch (err: any) {
        errors.push(`Column ${table}.${column}: ${err.message}`);
      }
    }
    
    return {
      success: errors.length === 0,
      tablesCreated,
      columnsAdded,
      errors
    };
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}
