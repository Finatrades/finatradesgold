-- Task #8: Fix cash_ledger_entry_type enum values
-- Migration 0003 defined FGPW_LOCK/FGPW_UNLOCK (typo — F-G-P-W).
-- Correct values are FPGW_LOCK/FPGW_UNLOCK (F-P-G-W).
-- This migration adds the correct values and cleans up orphan fpgw_batches.

-- Step 1: Add correct enum values (idempotent — no-op if already present)
ALTER TYPE "public"."cash_ledger_entry_type" ADD VALUE IF NOT EXISTS 'FPGW_LOCK';--> statement-breakpoint
ALTER TYPE "public"."cash_ledger_entry_type" ADD VALUE IF NOT EXISTS 'FPGW_UNLOCK';--> statement-breakpoint

-- Step 2: Clean up orphan fpgw_batches (Active rows with zero remaining grams)
-- These rows were stuck due to a bug in the old FIFO unlock path.
DELETE FROM fpgw_batches WHERE id LIKE 'd482c0ec%' OR id LIKE '533778cd%';--> statement-breakpoint
DELETE FROM fpgw_batches WHERE status = 'Active' AND remaining_grams = '0.000000';--> statement-breakpoint

-- Step 3: Reconcile fpgwAvailableGrams for all users from their Active batches
UPDATE vault_ownership_summary v
SET fpgw_available_grams = (
  SELECT COALESCE(SUM(remaining_grams::numeric), 0)
  FROM fpgw_batches b
  WHERE b.user_id = v.user_id AND b.status = 'Active'
);
