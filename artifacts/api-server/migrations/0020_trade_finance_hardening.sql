-- Trade Finance round-2 hardening (task #146 follow-up):
--   * Dedicated trade_dispute_evidence table (spec requirement).
--   * Tribunal decision fields: decision (release_to_seller|refund_to_buyer|split),
--     split_bps, decision_notes. Decided-by/at aliases the existing
--     resolved_by/resolved_at columns to avoid duplication.
--   * Re-align default milestone triggers to the spec event names
--     (shipment_documents_uploaded, customs_cleared, goods_received).
--     Pre-existing rows are migrated in place.

CREATE TABLE IF NOT EXISTS trade_dispute_evidence (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id varchar(255) NOT NULL REFERENCES trade_disputes(id) ON DELETE CASCADE,
  uploaded_by_user_id varchar(255) NOT NULL REFERENCES users(id),
  uploaded_by_role varchar(20) NOT NULL,
  file_url text NOT NULL,
  file_name varchar(255),
  description text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_dispute_evidence_dispute ON trade_dispute_evidence(dispute_id);

ALTER TABLE trade_disputes ADD COLUMN IF NOT EXISTS decision varchar(48);
ALTER TABLE trade_disputes ADD COLUMN IF NOT EXISTS split_bps integer;
ALTER TABLE trade_disputes ADD COLUMN IF NOT EXISTS decision_notes text;

-- Migrate any milestones using the round-1 trigger vocabulary onto the spec
-- vocabulary so the trigger engine resolves them.
UPDATE trade_milestones SET trigger = 'shipment_documents_uploaded' WHERE trigger = 'shipment_dispatched';
UPDATE trade_milestones SET trigger = 'manual_admin_release' WHERE trigger = 'manual';
-- lc_issued and goods_received are unchanged.
