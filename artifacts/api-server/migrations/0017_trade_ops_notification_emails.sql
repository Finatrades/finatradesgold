-- Migration: Add trade_ops_notification_emails platform_config entry
-- Replaces the hardcoded list of trade ops admin recipients in trade-emails.job.ts
-- with a configurable list managed from the admin platform-config panel.
INSERT INTO platform_config (
  category, config_key, config_value, config_type,
  display_name, description, display_order, is_active
) VALUES (
  'system_settings',
  'trade_ops_notification_emails',
  '["macy@finatrades.com","farah@finatrades.com","reda@finatrades.com"]',
  'json',
  'Trade Ops Notification Recipients',
  'Email addresses notified when a user uploads a trade finance document. Stored as a JSON array of email strings.',
  20,
  true
)
ON CONFLICT (config_key) DO NOTHING;
