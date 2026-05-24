-- 0013: Admin review queue for consignments (Task #72)
-- Adds reviewer tracking columns to consignments + consignment_documents.

ALTER TABLE consignments ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(255) REFERENCES users(id);
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS review_notes TEXT;

ALTER TABLE consignment_documents ADD COLUMN IF NOT EXISTS reject_reason TEXT;

ALTER TYPE consignment_doc_status ADD VALUE IF NOT EXISTS 'changes_requested';

CREATE INDEX IF NOT EXISTS idx_consignments_reviewer ON consignments (reviewer_id);
CREATE INDEX IF NOT EXISTS idx_consignments_submitted_at ON consignments (submitted_at);
