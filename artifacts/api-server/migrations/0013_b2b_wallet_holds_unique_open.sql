-- Enforce at-most-one open wallet hold per (user, reference_type, reference_id).
-- Protects the trade-request margin-hold flow from concurrent submit/retry
-- producing multiple open holds for the same trade request, which would
-- leave extra rows stranded after release/convert (each of which only
-- touches a single row).
CREATE UNIQUE INDEX IF NOT EXISTS b2b_wallet_holds_open_unique_ref
  ON b2b_wallet_holds (user_id, reference_type, reference_id)
  WHERE status = 'open' AND reference_id IS NOT NULL;
