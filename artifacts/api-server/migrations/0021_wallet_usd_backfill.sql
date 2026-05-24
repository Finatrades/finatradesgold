-- USD backfill from legacy `b2b_wallets` into the multi-currency
-- `wallet_balances` source-of-truth table (task #146 follow-up).
--
-- Background: prior to the Trade Finance suite, USD balances were tracked
-- on `b2b_wallets` (one row per user). The new multi-currency flows read
-- and write `wallet_balances` (one row per (user, currency)). Without this
-- backfill, existing USD holders would see a $0 USD balance in the new
-- trade-finance UI and the LC/escrow flows would refuse to place holds
-- against funds they actually own.
--
-- This migration is one-shot and idempotent — it only inserts a USD row
-- when the user has none, copying available_cents and locked_cents from
-- the legacy wallet, and records a single `legacy_usd_backfill` transaction
-- per inserted balance so the audit trail explains the opening balance.

INSERT INTO wallet_balances (user_id, currency, available_cents, locked_cents, created_at, updated_at)
SELECT
  bw.user_id,
  'USD',
  bw.available_cents,
  bw.locked_cents,
  now(),
  now()
FROM b2b_wallets bw
WHERE bw.currency = 'USD'
  AND NOT EXISTS (
    SELECT 1 FROM wallet_balances wb
     WHERE wb.user_id = bw.user_id AND wb.currency = 'USD'
  );

INSERT INTO wallet_balance_transactions
  (balance_id, user_id, currency, type, amount_cents, balance_after_cents,
   locked_after_cents, reference_type, reference_id, idempotency_key, description)
SELECT
  wb.id,
  wb.user_id,
  'USD',
  'opening_balance',
  wb.available_cents,
  wb.available_cents,
  wb.locked_cents,
  'legacy_usd_backfill',
  bw.id,
  'legacy-usd-backfill:' || wb.user_id,
  'Opening balance migrated from legacy b2b_wallets row'
FROM wallet_balances wb
JOIN b2b_wallets bw
  ON bw.user_id = wb.user_id AND bw.currency = 'USD'
WHERE wb.currency = 'USD'
  AND NOT EXISTS (
    SELECT 1 FROM wallet_balance_transactions t
     WHERE t.idempotency_key = 'legacy-usd-backfill:' || wb.user_id
  );
