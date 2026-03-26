-- Migration: Add failure_reason to bnsl_payouts
-- Stores the error message when an automated payout fails, enabling admin review and audit
ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS failure_reason text;
