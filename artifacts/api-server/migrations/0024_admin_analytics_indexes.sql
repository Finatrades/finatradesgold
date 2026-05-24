-- Task #170 — Admin Analytics & Risk Dashboard
-- Composite (created_at, status) indexes to keep date-range aggregations cheap
-- as the dataset grows. Used by /api/admin/analytics/* and /api/admin/risk/*.

CREATE INDEX IF NOT EXISTS idx_trade_cases_created_status
  ON trade_cases (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_trade_cases_status_created
  ON trade_cases (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consignments_created_status
  ON consignments (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_consignments_origin_country
  ON consignments (origin_country) WHERE origin_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_wallet_tx_created_type
  ON b2b_wallet_transactions (created_at DESC, type);

CREATE INDEX IF NOT EXISTS idx_b2b_wallet_tx_large_amount
  ON b2b_wallet_transactions (created_at DESC) WHERE ABS(amount_cents) >= 10000000;

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_created_status
  ON kyc_submissions (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_finatrades_personal_kyc_created_status
  ON finatrades_personal_kyc (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_finatrades_corporate_kyc_created_status
  ON finatrades_corporate_kyc (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_trade_disputes_created_status
  ON trade_disputes (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_trade_disputes_resolved
  ON trade_disputes (resolved_at) WHERE resolved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sar_reports_created_status
  ON sar_reports (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_severity
  ON fraud_alerts (created_at DESC, severity);

CREATE INDEX IF NOT EXISTS idx_b2b_withdrawals_created_status
  ON b2b_withdrawal_requests (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_users_user_type_created
  ON users (user_type, created_at DESC);
