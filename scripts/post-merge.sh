#!/bin/bash
set -e

echo "[post-merge] Installing any missing npm packages..."
npm install

# Pre-create the scheduled_job_status enum type so drizzle-kit does not prompt
# about whether 'scheduled_jobs' is a new table or a rename of an existing table.
# This step requires psql and DATABASE_URL — it is intentionally non-fatal if either
# is unavailable, since drizzle-kit push with 'yes' piped in provides a fallback.
if command -v psql &>/dev/null && [ -n "$DATABASE_URL" ]; then
  echo "[post-merge] Pre-creating scheduled_job_status enum type (if not exists)..."
  psql "$DATABASE_URL" -c "
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_job_status') THEN
        CREATE TYPE scheduled_job_status AS ENUM ('active', 'paused', 'completed', 'failed', 'running');
      END IF;
    END
    \$\$;
  " && echo "[post-merge] Enum check complete." || echo "[post-merge] Enum pre-create step skipped (non-fatal)."
else
  echo "[post-merge] psql not available or DATABASE_URL not set — skipping enum pre-create step."
fi

echo "[post-merge] Pushing schema changes to database..."
# Pipe 'yes' to accept the default choice on any remaining interactive prompts
# (e.g. drizzle-kit detecting an ambiguous table rename vs. create).
# --force skips data-loss confirmations.
yes "" | npx drizzle-kit push --force 2>&1
echo "[post-merge] Schema push complete."
