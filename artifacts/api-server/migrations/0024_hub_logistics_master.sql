-- Task #168: Hub & Logistics Master
-- Extends warehouse_hubs with new admin-managed columns, adds carriers and
-- shipping_routes master tables, wires carrier_id / route_id onto
-- trade_shipments, and backfills any existing vault_locations rows into
-- warehouse_hubs (skipped on code conflict).

-- ── warehouse_hubs additions ──────────────────────────────────────────────
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS commodity_types JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS hub_incharge_user_id VARCHAR(255) REFERENCES users(id);
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active';
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE warehouse_hubs ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_warehouse_hubs_status ON warehouse_hubs(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_hubs_incharge ON warehouse_hubs(hub_incharge_user_id);

-- ── carriers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carriers (
  id                VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  carrier_type      VARCHAR(20)  NOT NULL,
  registration_no   VARCHAR(100),
  contact_name      VARCHAR(255),
  contact_email     VARCHAR(255),
  contact_phone     VARCHAR(50),
  supported_lanes   JSONB NOT NULL DEFAULT '[]'::jsonb,
  on_time_score     DECIMAL(5,2),
  status            VARCHAR(32) NOT NULL DEFAULT 'active',
  notes             TEXT,
  created_by        VARCHAR(255) REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);
CREATE INDEX IF NOT EXISTS idx_carriers_type ON carriers(carrier_type);

-- ── shipping_routes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_routes (
  id                       VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  code                     VARCHAR(40) UNIQUE,
  origin_hub_id            VARCHAR(255) NOT NULL REFERENCES warehouse_hubs(id),
  destination_name         VARCHAR(255) NOT NULL,
  destination_country      VARCHAR(100) NOT NULL,
  mode                     VARCHAR(20) NOT NULL,
  transit_days             INTEGER,
  base_freight_rate_cents  BIGINT,
  freight_currency         VARCHAR(10) NOT NULL DEFAULT 'USD',
  freight_per_unit         VARCHAR(20) NOT NULL DEFAULT 'MT',
  customs_broker           VARCHAR(255),
  carrier_id               VARCHAR(255) REFERENCES carriers(id),
  status                   VARCHAR(32) NOT NULL DEFAULT 'active',
  notes                    TEXT,
  created_by               VARCHAR(255) REFERENCES users(id),
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_routes_origin ON shipping_routes(origin_hub_id);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_carrier ON shipping_routes(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_status ON shipping_routes(status);

-- ── trade_shipments wiring ────────────────────────────────────────────────
ALTER TABLE trade_shipments ADD COLUMN IF NOT EXISTS carrier_id VARCHAR(255) REFERENCES carriers(id);
ALTER TABLE trade_shipments ADD COLUMN IF NOT EXISTS shipping_route_id VARCHAR(255) REFERENCES shipping_routes(id);

CREATE INDEX IF NOT EXISTS idx_trade_shipments_carrier ON trade_shipments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_trade_shipments_route ON trade_shipments(shipping_route_id);

-- ── Backfill vault_locations → warehouse_hubs (best-effort, no-op on conflict) ──
DO $backfill$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vault_locations') THEN
    INSERT INTO warehouse_hubs (code, name, city, country, address, capacity_mt, contact_email, contact_phone, status)
    SELECT
      UPPER(SUBSTRING(vl.code, 1, 10)),
      vl.name,
      COALESCE(vl.city, vl.name),
      vl.country,
      vl.address,
      CASE WHEN vl.capacity_kg IS NOT NULL THEN GREATEST(1, FLOOR(vl.capacity_kg / 1000)::INTEGER) END,
      vl.contact_email,
      vl.contact_phone,
      CASE WHEN COALESCE(vl.is_active, true) THEN 'active' ELSE 'inactive' END
    FROM vault_locations vl
    ON CONFLICT (code) DO NOTHING;
  END IF;
END
$backfill$;

-- ── Backfill consignments.target_hub_id from target_hub_code ──────────────
UPDATE consignments c
SET target_hub_id = h.id
FROM warehouse_hubs h
WHERE c.target_hub_id IS NULL
  AND c.target_hub_code IS NOT NULL
  AND h.code = c.target_hub_code;
