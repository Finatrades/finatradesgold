-- Task #133: Drop legacy gold-stack tables (Vault/BNSL/Wingold/Tally/Physical).
-- Production rows confirmed to be 0 and dev rows are intentionally dropped.
-- migrate.ts is idempotent on duplicate-object errors so re-running is safe.

-- 1) Drop incoming FK columns from KEPT tables before dropping vault_holdings.
ALTER TABLE IF EXISTS certificates       DROP COLUMN IF EXISTS vault_holding_id;
ALTER TABLE IF EXISTS kyc_submissions    DROP COLUMN IF EXISTS vault_holding_id;
ALTER TABLE IF EXISTS wingold_bar_lots   DROP COLUMN IF EXISTS vault_holding_id;

-- 2) Drop tables (CASCADE handles intra-gold child->parent FKs).
-- Vault
DROP TABLE IF EXISTS vault_ledger_entries        CASCADE;
DROP TABLE IF EXISTS vault_ownership_summary     CASCADE;
DROP TABLE IF EXISTS vault_deposit_requests      CASCADE;
DROP TABLE IF EXISTS vault_withdrawal_requests   CASCADE;
DROP TABLE IF EXISTS vault_holdings              CASCADE;

-- BNSL
DROP TABLE IF EXISTS bnsl_payouts                CASCADE;
DROP TABLE IF EXISTS bnsl_early_terminations     CASCADE;
DROP TABLE IF EXISTS bnsl_agreements             CASCADE;
DROP TABLE IF EXISTS bnsl_plans                  CASCADE;
DROP TABLE IF EXISTS bnsl_template_variants      CASCADE;
DROP TABLE IF EXISTS bnsl_plan_templates         CASCADE;
DROP TABLE IF EXISTS bnsl_wallets                CASCADE;

-- Wingold (only the dropped ones; wingold_purchase_orders/bar_lots/certificates/etc. are KEPT)
DROP TABLE IF EXISTS wingold_bars                CASCADE;
DROP TABLE IF EXISTS wingold_allocations         CASCADE;
DROP TABLE IF EXISTS wingold_checkout_sessions   CASCADE;
DROP TABLE IF EXISTS wingold_vault_locations     CASCADE;

-- Unified Tally / FPGW
DROP TABLE IF EXISTS unified_tally_events        CASCADE;
DROP TABLE IF EXISTS unified_tally_transactions  CASCADE;
DROP TABLE IF EXISTS fpgw_batches                CASCADE;

-- Physical / Deposits / Buy Gold
DROP TABLE IF EXISTS deposit_inspections          CASCADE;
DROP TABLE IF EXISTS deposit_negotiation_messages CASCADE;
DROP TABLE IF EXISTS deposit_items                CASCADE;
DROP TABLE IF EXISTS physical_deposit_requests    CASCADE;
DROP TABLE IF EXISTS physical_storage_certificates CASCADE;
DROP TABLE IF EXISTS buy_gold_requests            CASCADE;

-- 3) Drop enums that became unused. Wingold enums still referenced by KEPT tables
-- (wingold_bar_size, wingold_order_status, wingold_bar_custody_status,
-- wingold_certificate_type, wingold_payment_method, wingold_payment_status)
-- are intentionally retained.
DROP TYPE IF EXISTS bnsl_plan_status;
DROP TYPE IF EXISTS bnsl_payout_status;
DROP TYPE IF EXISTS bnsl_termination_status;
DROP TYPE IF EXISTS bnsl_template_status;
DROP TYPE IF EXISTS wingold_checkout_session_status;
DROP TYPE IF EXISTS unified_tally_txn_type;
DROP TYPE IF EXISTS unified_tally_source_method;
DROP TYPE IF EXISTS unified_tally_pricing_mode;
DROP TYPE IF EXISTS unified_tally_status;
DROP TYPE IF EXISTS unified_tally_event_type;

-- Additional enums tied to dropped tables (no kept table references them).
DROP TYPE IF EXISTS balance_bucket;
DROP TYPE IF EXISTS fpgw_batch_status;
DROP TYPE IF EXISTS vault_deposit_status;
DROP TYPE IF EXISTS vault_withdrawal_status;
DROP TYPE IF EXISTS vault_withdrawal_method;
DROP TYPE IF EXISTS buy_gold_status;
DROP TYPE IF EXISTS physical_storage_certificate_status;
DROP TYPE IF EXISTS gold_item_type;
DROP TYPE IF EXISTS physical_deposit_status;
