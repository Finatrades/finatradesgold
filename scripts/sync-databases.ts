/**
 * Database Sync Utility
 * Syncs data between Replit and AWS RDS databases
 * 
 * Usage:
 *   npx tsx scripts/sync-databases.ts [direction]
 * 
 * Directions:
 *   to-aws    - Sync from Replit to AWS (Replit is primary)
 *   from-aws  - Sync from AWS to Replit (AWS is primary)
 *   verify    - Compare record counts between databases
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Environment variables needed:
// DATABASE_URL - Replit PostgreSQL connection string
// AWS_DATABASE_URL - AWS RDS connection string

interface SyncConfig {
  replitUrl: string;
  awsUrl: string;
}

async function getConfig(): Promise<SyncConfig> {
  const replitUrl = process.env.DATABASE_URL;
  const awsUrl = process.env.AWS_DATABASE_URL;

  if (!replitUrl) {
    throw new Error('DATABASE_URL (Replit) not set');
  }

  if (!awsUrl) {
    console.log('AWS_DATABASE_URL not set. Set it to enable sync.');
    console.log('Format: postgresql://user:password@host:5432/database');
    process.exit(1);
  }

  return { replitUrl, awsUrl };
}

async function runCommand(cmd: string, description: string): Promise<string> {
  console.log(`\n→ ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('Warning:', stderr);
    }
    return stdout;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

async function syncToAws(config: SyncConfig) {
  console.log('\n=== Syncing Replit → AWS RDS ===\n');

  const backupFile = `/tmp/replit_backup_${Date.now()}.sql`;

  // Export from Replit
  await runCommand(
    `pg_dump "${config.replitUrl}" --no-owner --no-acl > ${backupFile}`,
    'Exporting from Replit database'
  );

  // Import to AWS
  await runCommand(
    `psql "${config.awsUrl}" < ${backupFile}`,
    'Importing to AWS RDS'
  );

  // Cleanup
  await runCommand(`rm ${backupFile}`, 'Cleaning up temp file');

  console.log('\n✓ Sync to AWS completed successfully!');
}

async function syncFromAws(config: SyncConfig) {
  console.log('\n=== Syncing AWS RDS → Replit ===\n');

  const backupFile = `/tmp/aws_backup_${Date.now()}.sql`;

  // Export from AWS
  await runCommand(
    `pg_dump "${config.awsUrl}" --no-owner --no-acl > ${backupFile}`,
    'Exporting from AWS RDS'
  );

  // Import to Replit
  await runCommand(
    `psql "${config.replitUrl}" < ${backupFile}`,
    'Importing to Replit database'
  );

  // Cleanup
  await runCommand(`rm ${backupFile}`, 'Cleaning up temp file');

  console.log('\n✓ Sync from AWS completed successfully!');
}

async function verifySync(config: SyncConfig) {
  console.log('\n=== Verifying Database Sync ===\n');

  const tables = [
    'users',
    'wallets', 
    'transactions',
    'vault_holdings',
    'bnsl_plans',
    'trade_cases'
  ];

  console.log('Table                  | Replit    | AWS RDS   | Status');
  console.log('-----------------------|-----------|-----------|--------');

  for (const table of tables) {
    try {
      const replitCount = await runCommand(
        `psql "${config.replitUrl}" -t -c "SELECT COUNT(*) FROM ${table}" 2>/dev/null`,
        `Counting ${table}`
      );
      
      const awsCount = await runCommand(
        `psql "${config.awsUrl}" -t -c "SELECT COUNT(*) FROM ${table}" 2>/dev/null`,
        `Counting ${table} on AWS`
      );

      const rCount = replitCount.trim();
      const aCount = awsCount.trim();
      const status = rCount === aCount ? '✓ Match' : '✗ Diff';

      console.log(`${table.padEnd(22)} | ${rCount.padStart(9)} | ${aCount.padStart(9)} | ${status}`);
    } catch {
      console.log(`${table.padEnd(22)} | Error     | Error     | ✗ Failed`);
    }
  }
}

async function main() {
  const direction = process.argv[2] || 'help';

  console.log('╔════════════════════════════════════════╗');
  console.log('║   Finatrades Database Sync Utility     ║');
  console.log('╚════════════════════════════════════════╝');

  if (direction === 'help') {
    console.log(`
Usage: npx tsx scripts/sync-databases.ts [command]

Commands:
  to-aws     Sync Replit database → AWS RDS
  from-aws   Sync AWS RDS → Replit database
  verify     Compare record counts between databases
  help       Show this help message

Environment Variables Required:
  DATABASE_URL      Replit PostgreSQL connection string
  AWS_DATABASE_URL  AWS RDS connection string

Example:
  AWS_DATABASE_URL="postgresql://user:pass@host:5432/db" npx tsx scripts/sync-databases.ts to-aws
`);
    return;
  }

  const config = await getConfig();

  switch (direction) {
    case 'to-aws':
      await syncToAws(config);
      break;
    case 'from-aws':
      await syncFromAws(config);
      break;
    case 'verify':
      await verifySync(config);
      break;
    default:
      console.error(`Unknown command: ${direction}`);
      console.log('Use "help" to see available commands');
  }
}

main().catch(console.error);
