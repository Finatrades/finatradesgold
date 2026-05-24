-- 0013: Consignment-derived marketplace listings (Task #77)
-- Approved consignments are auto-published as buyable marketplace listings.
-- This is separate from the inventory-backed `marketplace_listings` table —
-- consignments publish here as soon as admin approves them, before the goods
-- physically arrive at a hub. Visibility tracks the source consignment status;
-- rejected / in-transit listings are hidden by setting is_visible = false.

CREATE TABLE IF NOT EXISTS consignment_listings (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id varchar(255) NOT NULL UNIQUE REFERENCES consignments(id) ON DELETE CASCADE,
  seller_id varchar(255) NOT NULL REFERENCES users(id),
  commodity_name varchar(255) NOT NULL,
  commodity_category varchar(50),
  hs_code varchar(20),
  hub_code varchar(10),
  origin_country varchar(100),
  quality_grade quality_grade,
  quantity numeric(15,3) NOT NULL,
  unit varchar(20) NOT NULL DEFAULT 'MT',
  min_order_qty numeric(15,3),
  asking_price_cents bigint,
  asking_currency varchar(10) DEFAULT 'USD',
  incoterms varchar(20),
  is_visible boolean NOT NULL DEFAULT true,
  published_at timestamp NOT NULL DEFAULT now(),
  hidden_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consignment_listings_visible
  ON consignment_listings (is_visible, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_consignment_listings_hub
  ON consignment_listings (hub_code);

CREATE INDEX IF NOT EXISTS idx_consignment_listings_category
  ON consignment_listings (commodity_category);
