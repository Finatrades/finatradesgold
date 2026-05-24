-- Task #144: Clean out remaining legacy gold backend code.
-- Drops Wingold integration tables, crypto/peer/finacard/withdrawal/qr/wallet-adjustment
-- flows, and gold-themed columns on transactions/certificates/wallets/treasury_gold_vault.
-- migrate.ts is idempotent on duplicate-object errors so re-running is safe.

-- 1) Drop FK-referencing tables first (children) before parents.
-- Crypto flows (crypto_payment_requests references crypto_wallet_configs).
DROP TABLE IF EXISTS crypto_payment_requests CASCADE;
DROP TABLE IF EXISTS crypto_wallet_configs   CASCADE;

-- Card payment + alt-rail gateways
DROP TABLE IF EXISTS ngenius_transactions    CASCADE;
DROP TABLE IF EXISTS binance_transactions    CASCADE;

-- P2P (peer) flows. peer_requests references peer_transfers.
DROP TABLE IF EXISTS peer_requests           CASCADE;
DROP TABLE IF EXISTS peer_transfers          CASCADE;

-- FinaPay request/QR/adjustment flows
DROP TABLE IF EXISTS qr_payment_invoices     CASCADE;
DROP TABLE IF EXISTS gold_requests           CASCADE;
DROP TABLE IF EXISTS wallet_adjustments      CASCADE;

-- FinaCard
DROP TABLE IF EXISTS finacard_spending       CASCADE;
DROP TABLE IF EXISTS finacard_cards          CASCADE;
DROP TABLE IF EXISTS finacard_transfers      CASCADE;

-- Fiat deposit/withdrawal request flows (replaced by B2B wallet rails)
DROP TABLE IF EXISTS deposit_requests        CASCADE;
DROP TABLE IF EXISTS withdrawal_requests     CASCADE;

-- Wingold integration (the remaining 7 tables not handled by 0017).
DROP TABLE IF EXISTS wingold_order_events        CASCADE;
DROP TABLE IF EXISTS wingold_reconciliations     CASCADE;
DROP TABLE IF EXISTS wingold_certificates        CASCADE;
DROP TABLE IF EXISTS wingold_bar_lots            CASCADE;
DROP TABLE IF EXISTS wingold_purchase_orders     CASCADE;
DROP TABLE IF EXISTS wingold_api_credentials     CASCADE;
DROP TABLE IF EXISTS wingold_products            CASCADE;
DROP TABLE IF EXISTS external_purchase_refs      CASCADE;

-- 2) Drop gold-themed columns on kept tables.
ALTER TABLE IF EXISTS transactions          DROP COLUMN IF EXISTS amount_gold;
ALTER TABLE IF EXISTS transactions          DROP COLUMN IF EXISTS gold_price_usd_per_gram;

ALTER TABLE IF EXISTS certificates          DROP COLUMN IF EXISTS gold_grams;
ALTER TABLE IF EXISTS certificates          DROP COLUMN IF EXISTS gold_price_usd_per_gram;
ALTER TABLE IF EXISTS certificates          DROP COLUMN IF EXISTS wingold_storage_ref;
ALTER TABLE IF EXISTS certificates          DROP COLUMN IF EXISTS remaining_grams;

ALTER TABLE IF EXISTS wallets               DROP COLUMN IF EXISTS gold_grams;
ALTER TABLE IF EXISTS wallets               DROP COLUMN IF EXISTS finacard_gold_grams;

ALTER TABLE IF EXISTS treasury_gold_vault   DROP COLUMN IF EXISTS wingold_order_id;

-- 3) Drop enums tied to dropped tables (no kept table references them).
DROP TYPE IF EXISTS crypto_payment_status;
-- NOTE: crypto_network kept — still used by user_crypto_wallets.network.
DROP TYPE IF EXISTS ngenius_order_status;
DROP TYPE IF EXISTS binance_order_status;
DROP TYPE IF EXISTS binance_order_type;
DROP TYPE IF EXISTS peer_request_status;
DROP TYPE IF EXISTS peer_transfer_status;
DROP TYPE IF EXISTS peer_transfer_channel;
DROP TYPE IF EXISTS qr_payment_status;
DROP TYPE IF EXISTS gold_request_status;
DROP TYPE IF EXISTS wallet_adjustment_type;
DROP TYPE IF EXISTS finacard_transfer_type;
DROP TYPE IF EXISTS finacard_card_status;
DROP TYPE IF EXISTS finacard_card_type;
DROP TYPE IF EXISTS finacard_spending_status;
DROP TYPE IF EXISTS deposit_request_status;
DROP TYPE IF EXISTS withdrawal_request_status;
-- NOTE: wingold_bar_size kept — still used by b2b_orders.bar_size and b2b_order_bars.bar_size.
DROP TYPE IF EXISTS wingold_order_status;
DROP TYPE IF EXISTS wingold_bar_custody_status;
DROP TYPE IF EXISTS wingold_certificate_type;
DROP TYPE IF EXISTS wingold_payment_method;
DROP TYPE IF EXISTS wingold_payment_status;
