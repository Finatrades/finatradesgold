-- 0013: Warehouse tally + verification flow (Task #78)
-- Adds 'warehouse' user_type, hub assignment on users, warehouse_hubs and
-- inventory_items tables (used by tally → inventory), and the
-- consignment_tally table that records arrival, weights, packages, samples,
-- and verify/reject decisions.

ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'warehouse';

ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_hub_code VARCHAR(10);

CREATE TABLE IF NOT EXISTS warehouse_hubs (
  id            VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(10) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  country       VARCHAR(100) NOT NULL,
  address       TEXT,
  capacity_mt   INTEGER,
  operator_name VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO warehouse_hubs (code, name, city, country) VALUES
  ('LOS', 'Lagos Hub',          'Lagos',          'Nigeria'),
  ('NBI', 'Nairobi Hub',        'Nairobi',        'Kenya'),
  ('ACC', 'Accra Hub',          'Accra',          'Ghana'),
  ('ABJ', 'Abidjan Hub',        'Abidjan',        'Côte d''Ivoire'),
  ('DKR', 'Dakar Hub',          'Dakar',          'Senegal'),
  ('ADD', 'Addis Ababa Hub',    'Addis Ababa',    'Ethiopia'),
  ('CAI', 'Cairo Hub',          'Cairo',          'Egypt'),
  ('CMN', 'Casablanca Hub',     'Casablanca',     'Morocco'),
  ('JNB', 'Johannesburg Hub',   'Johannesburg',   'South Africa'),
  ('DAR', 'Dar es Salaam Hub',  'Dar es Salaam',  'Tanzania'),
  ('KLA', 'Kampala Hub',        'Kampala',        'Uganda'),
  ('KAN', 'Kano Hub',           'Kano',           'Nigeria'),
  ('DLA', 'Douala Hub',         'Douala',         'Cameroon'),
  ('MBA', 'Mombasa Hub',        'Mombasa',        'Kenya')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS inventory_items (
  id                    VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_receipt_no  VARCHAR(100) UNIQUE,
  consignment_id        VARCHAR(255) REFERENCES consignments(id),
  hub_id                VARCHAR(255) NOT NULL REFERENCES warehouse_hubs(id),
  commodity_id          VARCHAR(255),
  commodity_name        VARCHAR(255) NOT NULL,
  owner_id              VARCHAR(255) NOT NULL REFERENCES users(id),
  quantity_received     DECIMAL(15, 3) NOT NULL,
  quantity_available    DECIMAL(15, 3) NOT NULL,
  quantity_reserved     DECIMAL(15, 3) DEFAULT '0',
  unit                  VARCHAR(20) NOT NULL DEFAULT 'MT',
  quality_grade         quality_grade,
  valuation_per_unit    DECIMAL(15, 2),
  valuation_currency    VARCHAR(10) DEFAULT 'USD',
  is_listed             BOOLEAN NOT NULL DEFAULT false,
  received_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_hub ON inventory_items (hub_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_owner ON inventory_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_consignment ON inventory_items (consignment_id);

CREATE TYPE consignment_tally_status AS ENUM ('Draft', 'Tallied', 'Verified', 'Rejected');

CREATE TABLE IF NOT EXISTS consignment_tally (
  id                    VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id        VARCHAR(255) NOT NULL UNIQUE REFERENCES consignments(id) ON DELETE CASCADE,
  hub_code              VARCHAR(10) NOT NULL,
  operator_id           VARCHAR(255) NOT NULL REFERENCES users(id),
  arrived_at            TIMESTAMP,
  declared_quantity     DECIMAL(15, 3) NOT NULL,
  actual_quantity       DECIMAL(15, 3),
  unit                  VARCHAR(20) NOT NULL DEFAULT 'MT',
  package_count         INTEGER,
  package_type          VARCHAR(100),
  quality_grade         quality_grade,
  moisture_pct          DECIMAL(5, 2),
  sample_notes          TEXT,
  damage_notes          TEXT,
  photos                JSONB,
  status                consignment_tally_status NOT NULL DEFAULT 'Draft',
  verified_at           TIMESTAMP,
  verified_by           VARCHAR(255) REFERENCES users(id),
  rejected_at           TIMESTAMP,
  rejection_reason      TEXT,
  inventory_item_id     VARCHAR(255) REFERENCES inventory_items(id),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consignment_tally_consignment ON consignment_tally (consignment_id);
CREATE INDEX IF NOT EXISTS idx_consignment_tally_hub ON consignment_tally (hub_code);
CREATE INDEX IF NOT EXISTS idx_consignment_tally_status ON consignment_tally (status);
