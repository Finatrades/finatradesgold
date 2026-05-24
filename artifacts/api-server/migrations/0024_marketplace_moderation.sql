-- 0024: Marketplace Moderation & Catalog (Task #169)
-- Adds moderation status to consignment listings, plus categories, banners, badges.

CREATE TYPE listing_moderation_status AS ENUM ('pending','live','featured','suspended','rejected');

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS moderation_status listing_moderation_status NOT NULL DEFAULT 'pending';

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS moderated_by VARCHAR(255);

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS featured_at TIMESTAMP;

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS featured_rank INTEGER;

ALTER TABLE consignment_listings ADD COLUMN IF NOT EXISTS category_id VARCHAR(255);

-- Backfill: any existing visible listing is treated as already-approved 'live'
UPDATE consignment_listings SET moderation_status = 'live' WHERE moderation_status = 'pending' AND is_visible = true;

CREATE INDEX IF NOT EXISTS consignment_listings_moderation_idx ON consignment_listings(moderation_status);

CREATE INDEX IF NOT EXISTS consignment_listings_featured_idx ON consignment_listings(featured_rank);

CREATE TABLE IF NOT EXISTS commodity_categories (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id VARCHAR(255),
  icon VARCHAR(50),
  hs_codes TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS commodity_categories_parent_idx ON commodity_categories(parent_id);

-- Seed default top-level categories (idempotent)
INSERT INTO commodity_categories (name, slug, icon, sort_order)
VALUES
  ('Agricultural', 'agricultural', 'wheat', 10),
  ('Soft Commodities', 'soft-commodities', 'coffee', 20),
  ('Metals', 'metals', 'cog', 30),
  ('Energy', 'energy', 'zap', 40),
  ('Industrial', 'industrial', 'factory', 50)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS marketing_banners (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  target_url TEXT,
  cta_label VARCHAR(80),
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_badges (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(64) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(16),
  awarded_by VARCHAR(255),
  awarded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT seller_badges_user_slug_uniq UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS seller_badges_user_idx ON seller_badges(user_id);
