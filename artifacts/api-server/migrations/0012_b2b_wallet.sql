-- B2B USD Wallet system (separate from legacy gold wallets)
-- All amounts stored as bigint cents.

CREATE TABLE IF NOT EXISTS b2b_wallets (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(255) NOT NULL UNIQUE REFERENCES users(id),
  currency varchar(8) NOT NULL DEFAULT 'USD',
  available_cents bigint NOT NULL DEFAULT 0,
  locked_cents bigint NOT NULL DEFAULT 0,
  pending_cents bigint NOT NULL DEFAULT 0,
  virtual_account_number varchar(64),
  virtual_account_bank varchar(128),
  virtual_account_reference varchar(64),
  stablecoin_address varchar(128),
  stablecoin_network varchar(32) NOT NULL DEFAULT 'polygon',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_wallets_user ON b2b_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_wallets_va ON b2b_wallets(virtual_account_number);

CREATE TABLE IF NOT EXISTS b2b_wallet_transactions (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id varchar(255) NOT NULL REFERENCES b2b_wallets(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL REFERENCES users(id),
  type varchar(48) NOT NULL,
  amount_cents bigint NOT NULL,
  balance_after_cents bigint NOT NULL,
  locked_after_cents bigint NOT NULL DEFAULT 0,
  reference_type varchar(64),
  reference_id varchar(255),
  idempotency_key varchar(128),
  description text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_wtx_wallet ON b2b_wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_wtx_user ON b2b_wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_wtx_type ON b2b_wallet_transactions(type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_wtx_idem ON b2b_wallet_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS b2b_wallet_holds (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id varchar(255) NOT NULL REFERENCES b2b_wallets(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL REFERENCES users(id),
  amount_cents bigint NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'open',
  reference_type varchar(64),
  reference_id varchar(255),
  expires_at timestamp,
  released_at timestamp,
  converted_escrow_id varchar(255),
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_holds_wallet ON b2b_wallet_holds(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_b2b_holds_ref ON b2b_wallet_holds(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS b2b_deposit_intents (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id varchar(255) NOT NULL REFERENCES b2b_wallets(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL REFERENCES users(id),
  rail varchar(32) NOT NULL,
  amount_cents bigint NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'pending',
  external_ref varchar(255),
  proof_object_key varchar(512),
  metadata jsonb,
  credited_transaction_id varchar(255),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_dep_user ON b2b_deposit_intents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_dep_status ON b2b_deposit_intents(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_dep_external ON b2b_deposit_intents(rail, external_ref) WHERE external_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS b2b_withdrawal_requests (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id varchar(255) NOT NULL REFERENCES b2b_wallets(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL REFERENCES users(id),
  amount_cents bigint NOT NULL,
  bank_details_encrypted text NOT NULL,
  bank_details_hint varchar(128),
  hold_id varchar(255) REFERENCES b2b_wallet_holds(id),
  status varchar(32) NOT NULL DEFAULT 'pending',
  reviewer_id varchar(255) REFERENCES users(id),
  reviewed_at timestamp,
  reject_reason text,
  external_ref varchar(255),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_wd_user ON b2b_withdrawal_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_wd_status ON b2b_withdrawal_requests(status);
