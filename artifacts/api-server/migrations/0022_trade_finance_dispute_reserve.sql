-- Trade Finance round-4 hardening (task #146):
--
--  (a) wallet_balances.pending_cents — spec parity. Three-tier balance model:
--      available (spendable) / locked (escrow / LC reserve) / pending
--      (in-flight credit waiting on payment-rail confirmation).
--
--  (b) trade_cases.dispute_reserve_cents — running balance of locked funds
--      held back AFTER the `goods_received` milestone is approved by the
--      importer. Funds remain locked until either:
--        * the 30-day dispute window closes and `POST .../finalize` releases
--          the reserve to the exporter, OR
--        * a tribunal decision spends the reserve per its split.
--      This is what fixes the round-3 finding that the tribunal had no
--      escrow left to disburse after goods_received released.
--
--  (c) Backfill: any existing milestones with status='released' whose
--      trigger='goods_received' had already disbursed under the old model,
--      so we don't migrate them into the reserve.

ALTER TABLE wallet_balances
  ADD COLUMN IF NOT EXISTS pending_cents bigint NOT NULL DEFAULT 0;

ALTER TABLE trade_cases
  ADD COLUMN IF NOT EXISTS dispute_reserve_cents bigint NOT NULL DEFAULT 0;
