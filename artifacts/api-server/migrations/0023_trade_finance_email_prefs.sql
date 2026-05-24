-- Task #156: Let users choose which trade alerts they want by email.
--
-- Adds a JSONB column on user_preferences storing per-event-kind email opt-outs
-- for trade-finance lifecycle events (lc_issued, lc_compliant, lc_discrepant,
-- escrow_funded, milestone_released, dispute_opened, dispute_resolved).
--
-- An empty object (the default) means "all events emit emails" — preserving the
-- pre-task behaviour of `emitTradeNotification` / `notifyTradeFinanceEvent`.
-- A missing key falls back to TRUE on the server. An explicit `false` mutes
-- email for that event kind while leaving in-app notifications untouched.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS trade_finance_email_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
