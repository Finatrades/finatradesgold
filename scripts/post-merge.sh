#!/bin/bash
set -e

echo "[post-merge] Installing any missing npm packages..."
npm install

echo "[post-merge] Ensuring scheduled_jobs enum type exists before schema push..."
# Create the scheduled_job_status enum type if it doesn't exist
# This prevents drizzle-kit from asking whether 'scheduled_jobs' is a rename
psql "$DATABASE_URL" -c "
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_job_status') THEN
      CREATE TYPE scheduled_job_status AS ENUM ('active', 'paused', 'completed', 'failed', 'running');
    END IF;
  END
  \$\$;
" 2>&1 || echo "[post-merge] Note: enum pre-create step skipped (non-fatal)"

echo "[post-merge] Pushing schema changes to database..."
# Use --force to skip data-loss confirmations
# The scheduled_jobs table will be created (not renamed) since we pre-created its enum above
yes "" | npx drizzle-kit push --force 2>&1
echo "[post-merge] Schema push complete."
