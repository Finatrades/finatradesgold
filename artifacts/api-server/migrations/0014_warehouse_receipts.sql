-- 0014: Warehouse Tally + Electronic Warehouse Receipts (Task #73)

ALTER TYPE consignment_status ADD VALUE IF NOT EXISTS 'Physically Verified';
ALTER TYPE consignment_status ADD VALUE IF NOT EXISTS 'Listed';

ALTER TABLE consignments ADD COLUMN IF NOT EXISTS marketplace_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS marketplace_published_at TIMESTAMP;

CREATE TYPE warehouse_receipt_status AS ENUM ('active','consumed','cancelled');

CREATE TYPE warehouse_receipt_pdf_status AS ENUM ('pending','generating','ready','failed');

CREATE TABLE IF NOT EXISTS consignment_tallies (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id VARCHAR(255) NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  inspector_id VARCHAR(255) REFERENCES users(id),
  inspector_name VARCHAR(255) NOT NULL,
  inspected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  declared_quantity NUMERIC(15,3) NOT NULL,
  actual_quantity NUMERIC(15,3) NOT NULL,
  variance_pct NUMERIC(8,3),
  actual_grade VARCHAR(20),
  moisture_pct NUMERIC(8,3),
  quality_readings JSONB,
  weighbridge_slip_key TEXT,
  photo_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tallies_consignment ON consignment_tallies (consignment_id);

CREATE TABLE IF NOT EXISTS warehouse_receipts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  wr_number VARCHAR(64) NOT NULL UNIQUE,
  consignment_id VARCHAR(255) NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  tally_id VARCHAR(255) REFERENCES consignment_tallies(id),
  hub_code VARCHAR(20) NOT NULL,
  commodity_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  grade VARCHAR(20),
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  issued_by VARCHAR(255) REFERENCES users(id),
  pdf_object_key TEXT,
  pdf_status warehouse_receipt_pdf_status NOT NULL DEFAULT 'pending',
  pdf_error TEXT,
  qr_payload TEXT NOT NULL,
  status warehouse_receipt_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wr_consignment ON warehouse_receipts (consignment_id);

CREATE INDEX IF NOT EXISTS idx_wr_status ON warehouse_receipts (status);
