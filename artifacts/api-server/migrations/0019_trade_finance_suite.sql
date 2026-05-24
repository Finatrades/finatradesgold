-- 0019_trade_finance_suite.sql
-- Task #146: Trade Finance suite — multi-currency wallet, milestone-based
-- escrow release, Letter of Credit lifecycle and dispute tribunal.
-- Keeps existing b2b_wallets (USD) untouched and introduces a per-currency
-- wallet_balances table for EUR/GBP plus FX rate snapshots and per-case
-- milestone records.

-- ── FX rate snapshots (daily) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currency_rates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(8) NOT NULL,
  quote_currency VARCHAR(8) NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'manual',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_unique_day
  ON currency_rates (base_currency, quote_currency, effective_date);
CREATE INDEX IF NOT EXISTS currency_rates_recent
  ON currency_rates (base_currency, quote_currency, effective_date DESC);

-- Seed sane defaults so the platform always has a quote for USD/EUR/GBP.
INSERT INTO currency_rates (base_currency, quote_currency, rate, source, effective_date)
VALUES
  ('USD','USD',1.0,'seed',CURRENT_DATE),
  ('EUR','EUR',1.0,'seed',CURRENT_DATE),
  ('GBP','GBP',1.0,'seed',CURRENT_DATE),
  ('USD','EUR',0.92,'seed',CURRENT_DATE),
  ('EUR','USD',1.087,'seed',CURRENT_DATE),
  ('USD','GBP',0.79,'seed',CURRENT_DATE),
  ('GBP','USD',1.266,'seed',CURRENT_DATE),
  ('EUR','GBP',0.859,'seed',CURRENT_DATE),
  ('GBP','EUR',1.165,'seed',CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ── Multi-currency wallet balances ──────────────────────────────────────
-- One row per (user, currency). USD remains tracked on b2b_wallets for
-- backward compatibility, while this table mirrors balances for non-USD currencies
-- and is the source of truth for EUR/GBP. Balances are stored as bigint cents.
CREATE TABLE IF NOT EXISTS wallet_balances (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  currency VARCHAR(8) NOT NULL,
  available_cents BIGINT NOT NULL DEFAULT 0,
  locked_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_balances_user_currency_uq
  ON wallet_balances (user_id, currency);

CREATE TABLE IF NOT EXISTS wallet_balance_transactions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_id VARCHAR(255) NOT NULL REFERENCES wallet_balances(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  currency VARCHAR(8) NOT NULL,
  type VARCHAR(48) NOT NULL,
  amount_cents BIGINT NOT NULL,
  balance_after_cents BIGINT NOT NULL,
  locked_after_cents BIGINT NOT NULL DEFAULT 0,
  reference_type VARCHAR(64),
  reference_id VARCHAR(255),
  idempotency_key VARCHAR(128) UNIQUE,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wallet_balance_tx_balance_idx
  ON wallet_balance_transactions (balance_id, created_at DESC);

-- ── Trade case settlement currency + milestone schedule ─────────────────
ALTER TABLE trade_cases
  ADD COLUMN IF NOT EXISTS settlement_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS settlement_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS milestone_schedule JSONB,
  ADD COLUMN IF NOT EXISTS escrow_hold_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS escrow_funded_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP;

-- ── Per-case milestones (release ledger) ────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_milestones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_case_id VARCHAR(255) NOT NULL REFERENCES trade_cases(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  label VARCHAR(255) NOT NULL,
  trigger VARCHAR(64) NOT NULL,
  percent NUMERIC(5,2) NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  released_amount_cents BIGINT NOT NULL DEFAULT 0,
  released_at TIMESTAMP,
  released_by VARCHAR(255) REFERENCES users(id),
  release_reason TEXT,
  evidence_document_ids TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trade_milestones_case_idx
  ON trade_milestones (trade_case_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS trade_milestones_case_seq_uq
  ON trade_milestones (trade_case_id, sequence);

-- ── Letters of Credit ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS letters_of_credit (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_ref VARCHAR(64) NOT NULL UNIQUE,
  trade_case_id VARCHAR(255) NOT NULL REFERENCES trade_cases(id) ON DELETE CASCADE,
  deal_room_id VARCHAR(255) REFERENCES deal_rooms(id),
  issuing_bank_name VARCHAR(255),
  applicant_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  beneficiary_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  amount_cents BIGINT NOT NULL,
  incoterms VARCHAR(32),
  expiry_date DATE,
  latest_shipment_date DATE,
  required_documents TEXT[],
  draft_url TEXT,
  status VARCHAR(48) NOT NULL DEFAULT 'Draft',
  terms_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS letters_of_credit_case_idx
  ON letters_of_credit (trade_case_id);

CREATE TABLE IF NOT EXISTS lc_events (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_id VARCHAR(255) NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
  event_type VARCHAR(48) NOT NULL,
  actor_user_id VARCHAR(255) REFERENCES users(id),
  actor_role VARCHAR(32),
  payload JSONB,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lc_events_lc_idx
  ON lc_events (lc_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lc_presentations (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_id VARCHAR(255) NOT NULL REFERENCES letters_of_credit(id) ON DELETE CASCADE,
  presented_by_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  document_ids TEXT[] NOT NULL,
  status VARCHAR(48) NOT NULL DEFAULT 'Pending Review',
  discrepancies TEXT[],
  reviewed_by VARCHAR(255) REFERENCES users(id),
  reviewed_at TIMESTAMP,
  decision VARCHAR(48),
  decision_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Dispute tribunal extensions ─────────────────────────────────────────
ALTER TABLE trade_disputes
  ADD COLUMN IF NOT EXISTS trade_case_id VARCHAR(255) REFERENCES trade_cases(id),
  ADD COLUMN IF NOT EXISTS panel_member_ids TEXT[],
  ADD COLUMN IF NOT EXISTS importer_allocation_cents BIGINT,
  ADD COLUMN IF NOT EXISTS exporter_allocation_cents BIGINT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(8),
  ADD COLUMN IF NOT EXISTS appeal_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;

-- trade_request_id is NOT NULL on the original schema. Tribunal disputes
-- raised against a trade_case (no underlying request) need to bypass that.
ALTER TABLE trade_disputes
  ALTER COLUMN trade_request_id DROP NOT NULL;
