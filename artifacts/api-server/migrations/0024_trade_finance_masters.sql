-- Task #172: Trade Finance master data.
-- Bank partners, LC product templates, milestone presets and escrow
-- configuration. All gated by the legacy permission `manage_trade_finance`
-- (mapped to admin_components.slug = 'trade-finance-ops').

-- ── Bank partners directory ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_partners (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  swift_bic VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'issuing',
  supported_currencies TEXT[] NOT NULL DEFAULT ARRAY['USD']::text[],
  rating VARCHAR(16),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(64),
  notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_partners_swift_uq ON bank_partners (swift_bic);
CREATE INDEX IF NOT EXISTS bank_partners_status_idx ON bank_partners (status);

INSERT INTO bank_partners (name, swift_bic, country, role, supported_currencies, rating, contact_email, status)
VALUES
  ('Standard Chartered', 'SCBLGB2L', 'United Kingdom', 'issuing', ARRAY['USD','EUR','GBP'], 'A+', 'tradefinance@sc.example', 'active'),
  ('HSBC', 'HBUKGB4B', 'United Kingdom', 'confirming', ARRAY['USD','EUR','GBP'], 'AA-', 'tradefinance@hsbc.example', 'active'),
  ('Ecobank', 'ECOCGHAC', 'Ghana', 'advising', ARRAY['USD','EUR'], 'BBB', 'lc@ecobank.example', 'active')
ON CONFLICT (swift_bic) DO NOTHING;

-- ── LC product templates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lc_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  lc_type VARCHAR(32) NOT NULL,
  description TEXT,
  default_incoterms VARCHAR(16),
  default_tenor_days INTEGER,
  default_tolerance_pct NUMERIC(5,2) DEFAULT 5.00,
  required_documents TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  default_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS lc_templates_code_uq ON lc_templates (code);

INSERT INTO lc_templates (code, name, lc_type, description, default_incoterms, default_tenor_days, default_tolerance_pct, required_documents, default_terms)
VALUES
  ('SIGHT',     'Sight LC',     'sight',     'Payment on presentation of compliant documents.', 'CIF', 0,   5.00,
    ARRAY['Commercial Invoice','Bill of Lading','Packing List','Certificate of Origin'], '{"partialShipments":false}'::jsonb),
  ('USANCE',    'Usance LC',    'usance',    'Deferred payment after acceptance (e.g. 60/90/180 days).', 'CIF', 90, 5.00,
    ARRAY['Commercial Invoice','Bill of Lading','Packing List','Certificate of Origin','Bill of Exchange'], '{"partialShipments":false,"acceptanceDays":90}'::jsonb),
  ('STANDBY',   'Standby LC',   'standby',   'Performance guarantee — drawn only if the applicant defaults.', NULL, 365, 0.00,
    ARRAY['Statement of Default','Commercial Invoice'], '{"drawingTrigger":"default"}'::jsonb),
  ('REVOLVING', 'Revolving LC', 'revolving', 'Reinstates automatically on each cycle until expiry.', 'CIF', 30,  5.00,
    ARRAY['Commercial Invoice','Bill of Lading','Packing List'], '{"revolves":"monthly","cumulative":false}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ── Milestone presets keyed by commodity ────────────────────────────────
-- A NULL commodity_category row acts as the fallback default.
CREATE TABLE IF NOT EXISTS milestone_presets (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  commodity_category VARCHAR(100),
  schedule JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS milestone_presets_category_idx ON milestone_presets (commodity_category);
CREATE UNIQUE INDEX IF NOT EXISTS milestone_presets_default_uq
  ON milestone_presets ((commodity_category IS NULL)) WHERE is_default = true AND commodity_category IS NULL;

INSERT INTO milestone_presets (name, commodity_category, schedule, is_default)
VALUES
  ('Default 30/40/30', NULL, '[
    {"sequence":1,"label":"Shipment Documents Uploaded","trigger":"shipment_documents_uploaded","percent":30},
    {"sequence":2,"label":"Customs Cleared","trigger":"customs_cleared","percent":40},
    {"sequence":3,"label":"Goods Received","trigger":"goods_received","percent":30}
  ]'::jsonb, true),
  ('Agricultural 30/40/30', 'Agricultural', '[
    {"sequence":1,"label":"Shipment Documents Uploaded","trigger":"shipment_documents_uploaded","percent":30},
    {"sequence":2,"label":"Customs Cleared","trigger":"customs_cleared","percent":40},
    {"sequence":3,"label":"Goods Received","trigger":"goods_received","percent":30}
  ]'::jsonb, false),
  ('Energy 20/30/50', 'Energy', '[
    {"sequence":1,"label":"LC Issued","trigger":"lc_issued","percent":20},
    {"sequence":2,"label":"Shipment Documents Uploaded","trigger":"shipment_documents_uploaded","percent":30},
    {"sequence":3,"label":"Goods Received","trigger":"goods_received","percent":50}
  ]'::jsonb, false),
  ('Metals 50/50', 'Metals', '[
    {"sequence":1,"label":"Shipment Documents Uploaded","trigger":"shipment_documents_uploaded","percent":50},
    {"sequence":2,"label":"Goods Received","trigger":"goods_received","percent":50}
  ]'::jsonb, false),
  ('Soft Commodities 30/40/30', 'Soft Commodities', '[
    {"sequence":1,"label":"Shipment Documents Uploaded","trigger":"shipment_documents_uploaded","percent":30},
    {"sequence":2,"label":"Customs Cleared","trigger":"customs_cleared","percent":40},
    {"sequence":3,"label":"Goods Received","trigger":"goods_received","percent":30}
  ]'::jsonb, false)
ON CONFLICT DO NOTHING;

-- ── Escrow configuration (per currency) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_configurations (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  currency VARCHAR(8) NOT NULL,
  account_holder VARCHAR(255) NOT NULL,
  holding_bank VARCHAR(255) NOT NULL,
  account_number VARCHAR(64),
  swift_bic VARCHAR(20),
  max_hold_per_case_cents BIGINT,
  auto_release_timeout_days INTEGER NOT NULL DEFAULT 30,
  requires_kyc BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS escrow_configurations_currency_uq ON escrow_configurations (currency);

INSERT INTO escrow_configurations (currency, account_holder, holding_bank, max_hold_per_case_cents, auto_release_timeout_days, requires_kyc)
VALUES
  ('USD', 'Finatrades Escrow Trust',     'Standard Chartered', 5000000000, 30, true),
  ('EUR', 'Finatrades Escrow Trust EUR', 'HSBC',               5000000000, 30, true),
  ('GBP', 'Finatrades Escrow Trust GBP', 'HSBC',               5000000000, 30, true)
ON CONFLICT (currency) DO NOTHING;

-- ── Register the admin component for RBAC mapping ───────────────────────
INSERT INTO admin_components (name, slug, category, description, path, icon, sort_order, is_active)
VALUES (
  'Trade Finance Ops', 'trade-finance-ops', 'Trade Finance',
  'Master data for trade-finance: bank partners, LC templates, milestone presets, escrow config.',
  '/admin/trade-finance', 'Landmark', 85, true
)
ON CONFLICT (slug) DO NOTHING;
