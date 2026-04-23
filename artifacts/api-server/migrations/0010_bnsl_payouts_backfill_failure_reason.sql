ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS failure_reason text;

ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS failed_at timestamp;
