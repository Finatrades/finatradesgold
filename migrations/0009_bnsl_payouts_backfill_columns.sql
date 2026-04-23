-- Migration: Backfill columns on bnsl_payouts that may be missing on older production databases
-- market_price_usd_per_gram and grams_credited were introduced in schema but never explicitly
-- migrated on production DBs where the table was created before the migration system was in place.
-- Using ADD COLUMN IF NOT EXISTS so this is safe to run on any environment.

ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS market_price_usd_per_gram numeric(12, 2);

ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS grams_credited numeric(18, 6);
