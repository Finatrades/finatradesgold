-- Task #173 — Admin P6: Platform Settings, CMS & Announcements
-- Adds fee_schedules, supported_countries, supported_currencies,
-- email_template_versions, help_articles, platform_announcements.

DO $$ BEGIN
  CREATE TYPE platform_fee_category AS ENUM (
    'marketplace_commission',
    'trade_finance_fee',
    'wallet_deposit_fee',
    'wallet_withdrawal_fee',
    'fx_spread'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE help_article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform_announcement_channel AS ENUM ('banner', 'in_app', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform_announcement_segment AS ENUM (
    'all', 'exporter', 'importer', 'government', 'warehouse', 'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS fee_schedules (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  category platform_fee_category NOT NULL,
  scope_key VARCHAR(100) NOT NULL DEFAULT '*',
  percent_bps INTEGER NOT NULL DEFAULT 0,
  flat_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP,
  notes TEXT,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fee_schedules_category_scope_idx ON fee_schedules (category, scope_key, effective_from DESC);

CREATE TABLE IF NOT EXISTS supported_countries (
  iso_code VARCHAR(2) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  flag_emoji VARCHAR(10),
  region VARCHAR(80),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_signup BOOLEAN NOT NULL DEFAULT TRUE,
  allow_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by VARCHAR(255) REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_supported_currencies (
  iso_code VARCHAR(3) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  symbol VARCHAR(8),
  decimals INTEGER NOT NULL DEFAULT 2,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_wallet BOOLEAN NOT NULL DEFAULT TRUE,
  allow_escrow BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by VARCHAR(255) REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  merge_vars JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT email_template_versions_slug_version UNIQUE (slug, version)
);
CREATE INDEX IF NOT EXISTS email_template_versions_slug_active_idx ON email_template_versions (slug, is_active, version DESC);

CREATE TABLE IF NOT EXISTS help_articles (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  title VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  status help_article_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  author_id VARCHAR(255) REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS help_articles_status_category_idx ON help_articles (status, category, sort_order);

CREATE TABLE IF NOT EXISTS platform_announcements (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  channel platform_announcement_channel NOT NULL DEFAULT 'banner',
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  audience_segment platform_announcement_segment NOT NULL DEFAULT 'all',
  audience_country VARCHAR(2),
  scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  cta_label VARCHAR(80),
  cta_url VARCHAR(500),
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_announcements_active_audience_idx
  ON platform_announcements (is_active, audience_segment, scheduled_at);

-- Seed supported countries (focus on AfCFTA + key trade partners)
INSERT INTO supported_countries (iso_code, display_name, flag_emoji, region) VALUES
  ('NG', 'Nigeria', E'\U0001F1F3\U0001F1EC', 'West Africa'),
  ('GH', 'Ghana', E'\U0001F1EC\U0001F1ED', 'West Africa'),
  ('CI', E'C\u00f4te d''Ivoire', E'\U0001F1E8\U0001F1EE', 'West Africa'),
  ('SN', 'Senegal', E'\U0001F1F8\U0001F1F3', 'West Africa'),
  ('KE', 'Kenya', E'\U0001F1F0\U0001F1EA', 'East Africa'),
  ('ET', 'Ethiopia', E'\U0001F1EA\U0001F1F9', 'East Africa'),
  ('TZ', 'Tanzania', E'\U0001F1F9\U0001F1FF', 'East Africa'),
  ('UG', 'Uganda', E'\U0001F1FA\U0001F1EC', 'East Africa'),
  ('ZA', 'South Africa', E'\U0001F1FF\U0001F1E6', 'Southern Africa'),
  ('EG', 'Egypt', E'\U0001F1EA\U0001F1EC', 'North Africa'),
  ('MA', 'Morocco', E'\U0001F1F2\U0001F1E6', 'North Africa'),
  ('DZ', 'Algeria', E'\U0001F1E9\U0001F1FF', 'North Africa'),
  ('AE', 'United Arab Emirates', E'\U0001F1E6\U0001F1EA', 'Middle East'),
  ('SA', 'Saudi Arabia', E'\U0001F1F8\U0001F1E6', 'Middle East'),
  ('GB', 'United Kingdom', E'\U0001F1EC\U0001F1E7', 'Europe'),
  ('DE', 'Germany', E'\U0001F1E9\U0001F1EA', 'Europe'),
  ('FR', 'France', E'\U0001F1EB\U0001F1F7', 'Europe'),
  ('NL', 'Netherlands', E'\U0001F1F3\U0001F1F1', 'Europe'),
  ('US', 'United States', E'\U0001F1FA\U0001F1F8', 'North America'),
  ('CN', 'China', E'\U0001F1E8\U0001F1F3', 'Asia'),
  ('IN', 'India', E'\U0001F1EE\U0001F1F3', 'Asia'),
  ('JP', 'Japan', E'\U0001F1EF\U0001F1F5', 'Asia')
ON CONFLICT (iso_code) DO NOTHING;

INSERT INTO platform_supported_currencies (iso_code, display_name, symbol, decimals) VALUES
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', E'\u20AC', 2),
  ('GBP', 'British Pound', E'\u00A3', 2)
ON CONFLICT (iso_code) DO NOTHING;

-- Seed default fee schedules from current platform constants.
INSERT INTO fee_schedules (category, scope_key, percent_bps, flat_cents, currency, notes)
SELECT 'marketplace_commission', '*', 250, 0, 'USD', 'Default 2.5% marketplace commission'
WHERE NOT EXISTS (SELECT 1 FROM fee_schedules WHERE category='marketplace_commission' AND scope_key='*');

INSERT INTO fee_schedules (category, scope_key, percent_bps, flat_cents, currency, notes)
SELECT 'trade_finance_fee', '*', 100, 0, 'USD', 'Default 1.0% trade-finance fee'
WHERE NOT EXISTS (SELECT 1 FROM fee_schedules WHERE category='trade_finance_fee' AND scope_key='*');

INSERT INTO fee_schedules (category, scope_key, percent_bps, flat_cents, currency, notes)
SELECT 'wallet_deposit_fee', 'USD', 0, 0, 'USD', 'No deposit fee for USD'
WHERE NOT EXISTS (SELECT 1 FROM fee_schedules WHERE category='wallet_deposit_fee' AND scope_key='USD');

INSERT INTO fee_schedules (category, scope_key, percent_bps, flat_cents, currency, notes)
SELECT 'wallet_withdrawal_fee', 'USD', 50, 500, 'USD', 'Default 0.5% + $5 withdrawal fee'
WHERE NOT EXISTS (SELECT 1 FROM fee_schedules WHERE category='wallet_withdrawal_fee' AND scope_key='USD');

INSERT INTO fee_schedules (category, scope_key, percent_bps, flat_cents, currency, notes)
SELECT 'fx_spread', 'USD_EUR', 75, 0, 'USD', 'Default 0.75% FX spread USD<>EUR'
WHERE NOT EXISTS (SELECT 1 FROM fee_schedules WHERE category='fx_spread' AND scope_key='USD_EUR');

INSERT INTO fee_schedules (category, scope_key, percent_bps, flat_cents, currency, notes)
SELECT 'fx_spread', 'USD_GBP', 75, 0, 'USD', 'Default 0.75% FX spread USD<>GBP'
WHERE NOT EXISTS (SELECT 1 FROM fee_schedules WHERE category='fx_spread' AND scope_key='USD_GBP');

-- Seed a starter help article so the public page renders something on day-1.
INSERT INTO help_articles (slug, category, title, body, excerpt, status, published_at)
SELECT
  'getting-started',
  'Getting Started',
  'Getting started with Finatrades',
  E'# Welcome to Finatrades\n\nFinatrades is a B2B commodity trade platform connecting exporters, importers and governments across Africa.\n\n## First steps\n\n1. Complete your KYC under **Account / KYC**.\n2. Top up your wallet to fund trades.\n3. Browse the marketplace or list a consignment.',
  'A quick orientation to the platform and how to onboard.',
  'published',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM help_articles WHERE slug='getting-started');
