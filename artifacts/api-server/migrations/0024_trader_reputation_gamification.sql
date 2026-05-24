-- Task #197: Trader Reputation & Gamification
--
-- Adds trader_tiers (computed tier per user with snapshot),
-- trader_badges (achievement badges, auto or manually granted),
-- and seed tables tier_rules / badge_rules so admin can tune
-- thresholds without a code change. All public surfaces stay
-- anonymous — leaderboards / chips reference FT-IDs only.

CREATE TABLE IF NOT EXISTS trader_tiers (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(16) NOT NULL DEFAULT 'bronze',
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Sticky downgrade: when computed tier drops below current, we record the
  -- pending lower tier + when grace ends. We only flip `tier` once
  -- pending_demotion_at <= NOW().
  pending_tier VARCHAR(16),
  pending_demotion_at TIMESTAMP,
  manual_override_tier VARCHAR(16),
  manual_override_by VARCHAR(255) REFERENCES users(id),
  manual_override_at TIMESTAMP,
  manual_override_reason TEXT
);

CREATE INDEX IF NOT EXISTS trader_tiers_tier_idx ON trader_tiers (tier);

CREATE TABLE IF NOT EXISTS trader_badges (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_slug VARCHAR(64) NOT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'auto',
  granted_by VARCHAR(255) REFERENCES users(id),
  reason TEXT,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by VARCHAR(255) REFERENCES users(id),
  revoke_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS trader_badges_user_slug_active_uq
  ON trader_badges (user_id, badge_slug) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS trader_badges_user_idx ON trader_badges (user_id);

CREATE TABLE IF NOT EXISTS tier_rules (
  tier VARCHAR(16) PRIMARY KEY,
  rank INTEGER NOT NULL,
  min_trades INTEGER NOT NULL DEFAULT 0,
  min_rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
  max_dispute_rate_bps INTEGER NOT NULL DEFAULT 10000,
  min_commodity_categories INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tier_rules (tier, rank, min_trades, min_rating, max_dispute_rate_bps, min_commodity_categories, description) VALUES
  ('bronze',   1, 0,   0.0, 10000, 0, 'Default tier for every verified trader.'),
  ('silver',   2, 10,  4.0, 10000, 0, '10+ completed trades with rating >= 4.0.'),
  ('gold',     3, 50,  4.3, 200,   0, '50+ completed trades, rating >= 4.3, <= 2% dispute rate.'),
  ('platinum', 4, 200, 4.5, 100,   3, '200+ trades, rating >= 4.5, <= 1% dispute rate, 3+ commodity categories.')
ON CONFLICT (tier) DO NOTHING;

CREATE TABLE IF NOT EXISTS badge_rules (
  slug VARCHAR(64) PRIMARY KEY,
  label VARCHAR(128) NOT NULL,
  description TEXT,
  category VARCHAR(32) NOT NULL DEFAULT 'milestone',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon VARCHAR(32),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO badge_rules (slug, label, description, category, criteria, icon) VALUES
  ('first_trade',          'First Trade',              'Completed their very first trade on Finatrades.', 'milestone', '{"minCompletedTrades":1}'::jsonb,                  'rocket'),
  ('ten_trade_club',       '10-Trade Club',            'Closed 10+ trades on the platform.',              'milestone', '{"minCompletedTrades":10}'::jsonb,                 'medal'),
  ('hundred_mt_club',      '100 MT Club',              'Shipped 100+ metric tons of commodities.',        'volume',    '{"minVolumeMt":100}'::jsonb,                       'truck'),
  ('sub_seven_settlement', 'Sub-7-Day Settlement',     'Average settlement under 7 days.',                'speed',     '{"maxAvgSettlementDays":7,"minCompletedTrades":5}'::jsonb, 'zap'),
  ('zero_dispute_quarter', 'Zero Dispute Quarter',     'No disputes raised in the last 90 days.',         'quality',   '{"windowDays":90,"maxDisputes":0,"minTradesInWindow":3}'::jsonb, 'shield'),
  ('international_reach',  'International Reach',      'Traded with counterparties in 3+ countries.',     'reach',     '{"minCountries":3}'::jsonb,                        'globe'),
  ('five_star_streak',     '5-Star Streak',            'Earned 5+ consecutive 5-star reviews.',           'quality',   '{"minConsecutiveFiveStar":5}'::jsonb,              'star')
ON CONFLICT (slug) DO NOTHING;
