-- Finatrades Production Database Seed Script
-- Run this on your AWS RDS production database to enable admin menus

-- =====================================================
-- Insert Admin Components (Menu Items Only)
-- =====================================================

-- Users Category
INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'User Management', 'user-management', 'users', 'Manage platform users', '/admin/users', 'Users', 1, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'user-management');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Employees', 'employees', 'users', 'Manage admin employees', '/admin/employees', 'UserCog', 2, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'employees');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Role Management', 'role-management', 'users', 'Manage roles and permissions', '/admin/roles', 'Shield', 3, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'role-management');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'KYC Reviews', 'kyc-reviews', 'users', 'Review KYC applications', '/admin/kyc', 'FileCheck', 4, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'kyc-reviews');

-- Finance Category
INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Payment Operations', 'payment-operations', 'finance', 'Manage deposits and withdrawals', '/admin/payments', 'CreditCard', 1, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'payment-operations');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Fee Management', 'fee-management', 'finance', 'Configure platform fees', '/admin/fees', 'Percent', 2, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'fee-management');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Financial Reports', 'financial-reports', 'finance', 'View financial analytics', '/admin/reports', 'BarChart', 3, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'financial-reports');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Treasury', 'treasury', 'finance', 'Treasury management', '/admin/treasury', 'Landmark', 4, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'treasury');

-- Operations Category
INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Vault Management', 'vault-management', 'operations', 'Manage gold vault', '/admin/vault', 'Lock', 1, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'vault-management');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Physical Deposits', 'physical-deposits', 'operations', 'Handle physical gold deposits', '/admin/physical-deposits', 'Package', 2, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'physical-deposits');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Unified Gold Tally', 'unified-gold-tally', 'operations', 'Gold accounting ledger', '/admin/ugt', 'Scale', 3, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'unified-gold-tally');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'BNSL Management', 'bnsl-management', 'operations', 'Manage BNSL plans', '/admin/bnsl', 'TrendingUp', 4, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'bnsl-management');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'FinaBridge Management', 'finabridge-management', 'operations', 'Trade finance operations', '/admin/finabridge', 'Briefcase', 5, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'finabridge-management');

-- Compliance Category
INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Compliance Dashboard', 'compliance-dashboard', 'compliance', 'Compliance overview', '/admin/compliance', 'Shield', 1, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'compliance-dashboard');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'AML Monitoring', 'aml-monitoring', 'compliance', 'Anti-money laundering', '/admin/aml', 'AlertTriangle', 2, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'aml-monitoring');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Audit Logs', 'audit-logs', 'compliance', 'System audit trail', '/admin/audit', 'FileText', 3, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'audit-logs');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Workflow Audit', 'workflow-audit', 'compliance', 'Workflow compliance tracking', '/admin/workflow-audit', 'ClipboardCheck', 4, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'workflow-audit');

-- System Category
INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Platform Settings', 'platform-settings', 'system', 'System configuration', '/admin/settings', 'Settings', 1, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'platform-settings');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Branding', 'branding', 'system', 'Platform branding', '/admin/branding', 'Palette', 2, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'branding');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'CMS Management', 'cms-management', 'system', 'Content management', '/admin/cms', 'FileEdit', 3, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'cms-management');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Security Settings', 'security-settings', 'system', 'Security configuration', '/admin/security', 'Lock', 4, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'security-settings');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Email Notifications', 'email-notifications', 'system', 'Email notification settings', '/admin/email-settings', 'Mail', 5, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'email-notifications');

INSERT INTO admin_components (id, name, slug, category, description, path, icon, sort_order, is_active, created_at)
SELECT gen_random_uuid(), 'Database Sync', 'database-sync', 'system', 'Sync production database', '/admin/database-sync', 'RefreshCw', 6, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_components WHERE slug = 'database-sync');

-- =====================================================
-- Verify Results
-- =====================================================
SELECT 'Admin Components Count:' as label, COUNT(*) as count FROM admin_components;

-- Show all menu items by category
SELECT category, name, path FROM admin_components ORDER BY category, sort_order;
