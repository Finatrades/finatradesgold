import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db";

// Resolve current directory in ESM context
const _dirname = path.dirname(fileURLToPath(import.meta.url));

// In production the server runs as dist/index.cjs; migrations are copied to dist/migrations
// In development the server runs from project root; migrations are at ./migrations
const MIGRATIONS_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), "migrations"),
    path.join(process.cwd(), "dist", "migrations"),
    path.join(_dirname, "..", "migrations"),
    path.join(_dirname, "migrations"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(process.cwd(), "migrations");
})();

// PostgreSQL error codes that mean "thing already exists" — safe to skip
const IDEMPOTENT_ERROR_CODES = new Set([
  "42710", // duplicate_object (enum/type already exists)
  "42P07", // duplicate_table
  "42701", // duplicate_column
  "42P06", // duplicate_schema
  "23505", // unique_violation (e.g. inserting a duplicate constraint name)
]);

function splitSqlStatements(sql: string): string[] {
  // Split on semicolons, strip leading comment lines from each chunk,
  // then discard chunks that have no actual SQL left.
  return sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS __migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Get list of already-applied migrations
    const { rows: applied } = await client.query(
      `SELECT filename FROM __migrations ORDER BY filename`
    );
    const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

    // Read all SQL migration files, sorted by name
    let files: string[] = [];
    try {
      files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    } catch (err) {
      console.warn("[Migrations] Could not read migrations directory:", err);
      return;
    }

    const pending = files.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log("[Migrations] All migrations already applied.");
      return;
    }

    console.log(`[Migrations] Applying ${pending.length} pending migration(s)...`);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, "utf8");
      const statements = splitSqlStatements(sql);

      let hasError = false;

      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (err: any) {
          if (IDEMPOTENT_ERROR_CODES.has(err.code)) {
            // Schema object already exists — safe to skip
            console.warn(`[Migrations] Skipping already-existing object in ${file}: ${err.message}`);
          } else {
            console.error(`[Migrations] ✗ Error in ${file}:\n  Statement: ${stmt.slice(0, 120)}\n  Error: ${err.message}`);
            hasError = true;
            break;
          }
        }
      }

      if (hasError) {
        throw new Error(`[Migrations] Failed to apply migration: ${file}`);
      }

      // Mark this migration as applied
      await client.query(
        `INSERT INTO __migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
        [file]
      );
      console.log(`[Migrations] ✓ Applied: ${file}`);
    }

    console.log("[Migrations] All pending migrations applied successfully.");
  } finally {
    client.release();
  }
}
