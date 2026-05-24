-- 0015: Buyer Marketplace — RFQ/Order tables + Watchlist (Task #75)
-- Idempotent: migrator skips duplicate-object/table/column errors automatically.

CREATE TYPE rfq_status AS ENUM ('Open','Offers Received','Negotiating','Accepted','Expired','Cancelled');

CREATE TYPE quality_grade AS ENUM ('A+','A','B+','B','C','D');

CREATE TABLE IF NOT EXISTS rfqs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no VARCHAR(50) UNIQUE,
  buyer_id VARCHAR(255) NOT NULL REFERENCES users(id),
  listing_id VARCHAR(255),
  commodity_name VARCHAR(255) NOT NULL,
  hub_id VARCHAR(255) REFERENCES warehouse_hubs(id),
  requested_quantity NUMERIC(15,3) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'MT',
  target_price_per_unit NUMERIC(15,2),
  currency VARCHAR(10) DEFAULT 'USD',
  quality_required quality_grade,
  incoterms VARCHAR(20),
  delivery_deadline DATE,
  notes TEXT,
  status rfq_status NOT NULL DEFAULT 'Open',
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rfqs_buyer_idx ON rfqs(buyer_id);

CREATE INDEX IF NOT EXISTS rfqs_status_idx ON rfqs(status);

CREATE TABLE IF NOT EXISTS rfq_offers (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id VARCHAR(255) NOT NULL REFERENCES rfqs(id),
  seller_id VARCHAR(255) NOT NULL REFERENCES users(id),
  offered_quantity NUMERIC(15,3) NOT NULL,
  price_per_unit NUMERIC(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  valid_until TIMESTAMP,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rfq_offers_rfq_idx ON rfq_offers(rfq_id);

CREATE INDEX IF NOT EXISTS rfq_offers_seller_idx ON rfq_offers(seller_id);

CREATE TABLE IF NOT EXISTS trade_orders (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE,
  rfq_id VARCHAR(255) REFERENCES rfqs(id),
  buyer_id VARCHAR(255) NOT NULL REFERENCES users(id),
  seller_id VARCHAR(255) NOT NULL REFERENCES users(id),
  hub_id VARCHAR(255) REFERENCES warehouse_hubs(id),
  commodity_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'MT',
  price_per_unit NUMERIC(15,2) NOT NULL,
  total_amount NUMERIC(20,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'Pending Payment',
  payment_method VARCHAR(50),
  paid_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trade_orders_buyer_idx ON trade_orders(buyer_id);

CREATE INDEX IF NOT EXISTS trade_orders_seller_idx ON trade_orders(seller_id);

ALTER TABLE trade_orders ADD COLUMN IF NOT EXISTS listing_id VARCHAR(255);

ALTER TABLE trade_orders ADD COLUMN IF NOT EXISTS consignment_id VARCHAR(255) REFERENCES consignments(id);

ALTER TABLE trade_orders ADD COLUMN IF NOT EXISTS wallet_hold_id VARCHAR(255);

ALTER TABLE trade_orders ADD COLUMN IF NOT EXISTS margin_cents BIGINT;

ALTER TABLE trade_orders ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS b2b_watchlist (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consignment_id VARCHAR(255) NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS b2b_watchlist_user_consignment_idx
  ON b2b_watchlist(user_id, consignment_id);

CREATE INDEX IF NOT EXISTS b2b_watchlist_user_idx ON b2b_watchlist(user_id);
