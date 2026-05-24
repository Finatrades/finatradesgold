-- 0012: Consignment listing wizard tables (Task #71)
-- Creates: consignment_status, quality_grade, consignment_doc_type,
--          consignment_doc_status enums and the consignments,
--          consignment_documents, consignment_status_history tables.
-- Plain CREATE / ALTER only so the simple statement splitter handles it,
-- and duplicate_object errors are treated as idempotent by the runner.

CREATE TYPE quality_grade AS ENUM ('A+', 'A', 'B+', 'B', 'C', 'D');

CREATE TYPE consignment_status AS ENUM (
  'Draft',
  'Submitted',
  'Pending Review',
  'Under Review',
  'Approved',
  'Rejected',
  'Needs More Info',
  'In Transit',
  'At Warehouse',
  'Verified'
);

ALTER TYPE consignment_status ADD VALUE IF NOT EXISTS 'Pending Review';
ALTER TYPE consignment_status ADD VALUE IF NOT EXISTS 'Needs More Info';

CREATE TYPE consignment_doc_type AS ENUM (
  'commercial_invoice',
  'packing_list',
  'phytosanitary_certificate',
  'certificate_of_origin',
  'quality_inspection_report',
  'mining_license',
  'export_license',
  'bill_of_lading',
  'fumigation_certificate',
  'weight_certificate',
  'other'
);

CREATE TYPE consignment_doc_status AS ENUM (
  'pending', 'uploaded', 'verified', 'rejected'
);

CREATE TABLE IF NOT EXISTS consignments (
  id                       VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no             VARCHAR(50) UNIQUE,
  user_id                  VARCHAR(255) NOT NULL REFERENCES users(id),
  commodity_id             VARCHAR(255),
  commodity_name           VARCHAR(255) NOT NULL,
  hs_code                  VARCHAR(20),
  quantity                 DECIMAL(15, 3) NOT NULL,
  unit                     VARCHAR(20) NOT NULL DEFAULT 'MT',
  quality_grade            quality_grade,
  origin_country           VARCHAR(100) NOT NULL,
  packing_type             VARCHAR(100),
  target_hub_id            VARCHAR(255),
  target_hub_code          VARCHAR(10),
  incoterms                VARCHAR(20),
  estimated_value          DECIMAL(20, 2),
  value_currency           VARCHAR(10) DEFAULT 'USD',
  asking_price_cents       BIGINT,
  asking_currency          VARCHAR(10) DEFAULT 'USD',
  estimated_value_cents    BIGINT,
  harvest_date             DATE,
  batch_number             VARCHAR(100),
  commodity_category       VARCHAR(50),
  compliance_declarations  JSONB,
  metadata                 JSONB,
  status                   consignment_status NOT NULL DEFAULT 'Draft',
  notes                    TEXT,
  admin_notes              TEXT,
  submitted_at             TIMESTAMP,
  approved_at              TIMESTAMP,
  approved_by              VARCHAR(255) REFERENCES users(id),
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE consignments ADD COLUMN IF NOT EXISTS asking_price_cents BIGINT;
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS asking_currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS estimated_value_cents BIGINT;
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS harvest_date DATE;
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS commodity_category VARCHAR(50);
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS compliance_declarations JSONB;
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_consignments_user ON consignments (user_id);
CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments (status);

CREATE TABLE IF NOT EXISTS consignment_documents (
  id              VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id  VARCHAR(255) NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  doc_type        consignment_doc_type NOT NULL,
  doc_label       VARCHAR(255),
  is_required     BOOLEAN NOT NULL DEFAULT false,
  status          consignment_doc_status NOT NULL DEFAULT 'pending',
  file_name       VARCHAR(500),
  file_size       INTEGER,
  mime_type       VARCHAR(100),
  storage_key     TEXT,
  storage_url     TEXT,
  uploaded_at     TIMESTAMP,
  reviewed_at     TIMESTAMP,
  reviewer_id     VARCHAR(255) REFERENCES users(id),
  review_notes    TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_documents_consignment
  ON consignment_documents (consignment_id);

CREATE TABLE IF NOT EXISTS consignment_status_history (
  id              VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id  VARCHAR(255) NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  from_status     consignment_status,
  to_status       consignment_status NOT NULL,
  actor_id        VARCHAR(255) REFERENCES users(id),
  note            TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_status_history_consignment
  ON consignment_status_history (consignment_id);
