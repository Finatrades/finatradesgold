-- Migration: Add failure tracking columns to bnsl_payouts
-- failure_reason: error message when an automated payout fails (admin review / audit)
-- failed_at: timestamp when the payout was marked Failed (used for >3-day high-risk escalation)
ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS failure_reason text;

ALTER TABLE bnsl_payouts
  ADD COLUMN IF NOT EXISTS failed_at timestamp;
