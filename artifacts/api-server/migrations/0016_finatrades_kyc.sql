-- 0016: Finatrades KYC migration (Task #124)
-- Collapses 3-tier KYC into Personal + Corporate, and collapses document and
-- trade-request review statuses to a single Pending Review stage.
-- Idempotent: migrator skips duplicate-object/table/column errors automatically.

-- Backfill corporate KYC from legacy tier_3 rows. Reset migrated record to
-- 'In Progress' when the new schema's required fields (company_name and
-- registration_number) are missing, so users cannot retain an Approved status
-- without complete corporate data.
INSERT INTO finatrades_corporate_kyc (user_id, company_name, registration_number, head_office_address, status, created_at, updated_at)
SELECT
  user_id,
  company_name,
  registration_number,
  company_address,
  CASE
    WHEN company_name IS NULL OR btrim(company_name) = ''
      OR registration_number IS NULL OR btrim(registration_number) = ''
      THEN 'In Progress'::kyc_status
    ELSE status
  END,
  created_at,
  updated_at
FROM kyc_submissions
WHERE tier = 'tier_3_corporate'
  AND NOT EXISTS (SELECT 1 FROM finatrades_corporate_kyc fc WHERE fc.user_id = kyc_submissions.user_id)

;

-- Backfill personal KYC from legacy tier_1/tier_2 rows. Reset migrated record
-- to 'In Progress' when the new schema's required fields (full_name and
-- date_of_birth) are missing, so users cannot retain an Approved status
-- without complete personal data.
INSERT INTO finatrades_personal_kyc (user_id, full_name, date_of_birth, nationality, address, city, postal_code, country, status, created_at, updated_at)
SELECT
  user_id,
  full_name,
  date_of_birth,
  nationality,
  address,
  city,
  postal_code,
  country,
  CASE
    WHEN full_name IS NULL OR btrim(full_name) = ''
      OR date_of_birth IS NULL OR btrim(date_of_birth) = ''
      THEN 'In Progress'::kyc_status
    ELSE status
  END,
  created_at,
  updated_at
FROM kyc_submissions
WHERE tier IN ('tier_1_basic','tier_2_enhanced')
  AND NOT EXISTS (SELECT 1 FROM finatrades_personal_kyc fp WHERE fp.user_id = kyc_submissions.user_id)

;

-- Mirror the same downgrade for users.kyc_status when their backing finatrades
-- row got reset above, so the user profile reflects the incomplete state.
UPDATE users u
SET kyc_status = 'In Progress'
FROM finatrades_personal_kyc fp
WHERE fp.user_id = u.id
  AND fp.status = 'In Progress'
  AND u.kyc_status = 'Approved'

;

UPDATE users u
SET kyc_status = 'In Progress'
FROM finatrades_corporate_kyc fc
WHERE fc.user_id = u.id
  AND fc.status = 'In Progress'
  AND u.kyc_status = 'Approved'

;

ALTER TABLE kyc_submissions DROP COLUMN IF EXISTS tier

;

ALTER TYPE document_status RENAME TO document_status_old

;

CREATE TYPE document_status AS ENUM ('Pending','AI Review','Pending Review','Approved','Rejected','AI Rejected')

;

ALTER TABLE trade_documents ALTER COLUMN status DROP DEFAULT

;

ALTER TABLE trade_documents
  ALTER COLUMN status TYPE document_status
  USING (CASE WHEN status::text IN ('Tier 1 Review','Tier 2 Review','Tier 3 Review') THEN 'Pending Review'::document_status ELSE status::text::document_status END)

;

ALTER TABLE trade_documents ALTER COLUMN status SET DEFAULT 'Pending'::document_status

;

DROP TYPE document_status_old

;

ALTER TYPE trade_request_status RENAME TO trade_request_status_old

;

CREATE TYPE trade_request_status AS ENUM ('Draft','Open','Proposal Review','Awaiting Importer','Active Trade','Completed','Cancelled','AI Review','AI Rejected','Pending Review','Rejected')

;

ALTER TABLE trade_requests ALTER COLUMN status DROP DEFAULT

;

ALTER TABLE trade_requests
  ALTER COLUMN status TYPE trade_request_status
  USING (CASE WHEN status::text IN ('Tier 1 Review','Tier 2 Review','Tier 3 Review') THEN 'Pending Review'::trade_request_status ELSE status::text::trade_request_status END)

;

ALTER TABLE trade_requests ALTER COLUMN status SET DEFAULT 'Draft'::trade_request_status

;

DROP TYPE trade_request_status_old

;

INSERT INTO compliance_settings (active_kyc_mode)
SELECT 'finatrades'
WHERE NOT EXISTS (SELECT 1 FROM compliance_settings)

;

UPDATE compliance_settings SET active_kyc_mode = 'finatrades' WHERE active_kyc_mode IS DISTINCT FROM 'finatrades'

;
