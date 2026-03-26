-- Migration: Add low_balance_threshold_grams to user_preferences
-- Allows users to configure the gold balance (in grams) at which a low-balance alert is sent
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS low_balance_threshold_grams NUMERIC(18, 6) DEFAULT 0.1;
