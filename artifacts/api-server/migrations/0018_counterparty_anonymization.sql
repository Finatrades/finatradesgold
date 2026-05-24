-- 0018_counterparty_anonymization.sql
-- Task #145: anonymize counterparty across Deal Room / Marketplace / RFQ / Trade Cases.
-- Adds rating + completed-trade counters on users, plus trade_reviews and
-- trade_identity_consents tables. Backfills completed_trades_count from
-- historical settled trade_cases and completed trade_requests so existing
-- users see accurate counters immediately.

-- ── users: rating + completed trade counters ─────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_trades_count INTEGER NOT NULL DEFAULT 0;

-- ── trade_reviews ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_reviews (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_case_id VARCHAR(255) REFERENCES trade_cases(id) ON DELETE CASCADE,
  trade_request_id VARCHAR(255) REFERENCES trade_requests(id) ON DELETE CASCADE,
  reviewer_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  reviewee_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS trade_reviews_case_reviewer_uq
  ON trade_reviews (trade_case_id, reviewer_user_id) WHERE trade_case_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS trade_reviews_request_reviewer_uq
  ON trade_reviews (trade_request_id, reviewer_user_id) WHERE trade_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS trade_reviews_reviewee_idx ON trade_reviews (reviewee_user_id);

-- ── trade_identity_consents ──────────────────────────────────────────────
-- Each row = one party (importer OR exporter) consenting to reveal their
-- own real identity to the other on a finalised trade. Real names appear in
-- the settlement contract PDF only when BOTH parties have consented.
CREATE TABLE IF NOT EXISTS trade_identity_consents (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_case_id VARCHAR(255) REFERENCES trade_cases(id) ON DELETE CASCADE,
  trade_request_id VARCHAR(255) REFERENCES trade_requests(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  consented_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS trade_identity_consents_case_user_uq
  ON trade_identity_consents (trade_case_id, user_id) WHERE trade_case_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS trade_identity_consents_request_user_uq
  ON trade_identity_consents (trade_request_id, user_id) WHERE trade_request_id IS NOT NULL;

-- ── backfill completed_trades_count ──────────────────────────────────────
-- Count Settled trade_cases per user
WITH case_counts AS (
  SELECT user_id, COUNT(*)::int AS c
  FROM trade_cases
  WHERE status IN ('Settled', 'Completed', 'Approved')
  GROUP BY user_id
),
-- Count Completed trade_requests per importer
importer_counts AS (
  SELECT importer_user_id AS user_id, COUNT(*)::int AS c
  FROM trade_requests
  WHERE status = 'Completed'
  GROUP BY importer_user_id
),
-- Count Completed trade_requests per accepted exporter (via tradeConfirmations → tradeProposals)
exporter_counts AS (
  SELECT tp.exporter_user_id AS user_id, COUNT(*)::int AS c
  FROM trade_confirmations tc
  JOIN trade_proposals tp ON tp.id = tc.accepted_proposal_id
  JOIN trade_requests tr ON tr.id = tc.trade_request_id
  WHERE tr.status = 'Completed'
  GROUP BY tp.exporter_user_id
),
combined AS (
  SELECT user_id, SUM(c)::int AS total FROM (
    SELECT * FROM case_counts
    UNION ALL SELECT * FROM importer_counts
    UNION ALL SELECT * FROM exporter_counts
  ) x
  GROUP BY user_id
)
UPDATE users u
SET completed_trades_count = COALESCE(c.total, 0)
FROM combined c
WHERE u.id = c.user_id;
