-- =====================================================
-- FINATRADES AWS DATABASE SCHEMA UPDATE (Post 26 Jan 2026)
-- =====================================================
-- This script safely adds missing columns, enums, and tables to your AWS database
-- Data will remain intact - only adds new items if they don't exist
-- Run this on your AWS RDS PostgreSQL database
-- =====================================================

-- ==========================================
-- 1. CREATE MISSING ENUMS (Required First)
-- ==========================================

-- user_bank_account_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_bank_account_status') THEN
        CREATE TYPE user_bank_account_status AS ENUM ('Active', 'Inactive', 'Pending', 'Verified');
        RAISE NOTICE 'Created enum: user_bank_account_status';
    ELSE
        RAISE NOTICE 'Already exists enum: user_bank_account_status';
    END IF;
END $$;

-- crypto_network enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crypto_network') THEN
        CREATE TYPE crypto_network AS ENUM ('Bitcoin', 'Ethereum', 'BNB_Smart_Chain', 'Polygon', 'Tron', 'Solana', 'Arbitrum', 'Avalanche', 'Optimism', 'Base');
        RAISE NOTICE 'Created enum: crypto_network';
    ELSE
        RAISE NOTICE 'Already exists enum: crypto_network';
    END IF;
END $$;

-- employee_role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
        CREATE TYPE employee_role AS ENUM ('super_admin', 'admin', 'manager', 'support', 'finance', 'compliance');
        RAISE NOTICE 'Created enum: employee_role';
    ELSE
        RAISE NOTICE 'Already exists enum: employee_role';
    END IF;
END $$;

-- employee_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
        CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'suspended');
        RAISE NOTICE 'Created enum: employee_status';
    ELSE
        RAISE NOTICE 'Already exists enum: employee_status';
    END IF;
END $$;

-- permission_action enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_action') THEN
        CREATE TYPE permission_action AS ENUM ('view', 'create', 'edit', 'approve_l1', 'approve_final', 'reject', 'export', 'delete');
        RAISE NOTICE 'Created enum: permission_action';
    ELSE
        RAISE NOTICE 'Already exists enum: permission_action';
    END IF;
END $$;

-- approval_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending_l1', 'pending_final', 'approved', 'rejected', 'expired', 'cancelled');
        RAISE NOTICE 'Created enum: approval_status';
    ELSE
        RAISE NOTICE 'Already exists enum: approval_status';
    END IF;
END $$;

-- risk_level enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
        RAISE NOTICE 'Created enum: risk_level';
    ELSE
        RAISE NOTICE 'Already exists enum: risk_level';
    END IF;
END $$;

-- ==========================================
-- 2. USERS TABLE - Finatrades ID Login Columns
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'custom_finatrades_id') THEN
        ALTER TABLE users ADD COLUMN custom_finatrades_id VARCHAR(25) UNIQUE;
        RAISE NOTICE 'Added: custom_finatrades_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'custom_finatrades_id_changed_at') THEN
        ALTER TABLE users ADD COLUMN custom_finatrades_id_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: custom_finatrades_id_changed_at';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'finatrades_id_otp') THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp VARCHAR(6);
        RAISE NOTICE 'Added: finatrades_id_otp';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'finatrades_id_otp_expiry') THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp_expiry TIMESTAMP;
        RAISE NOTICE 'Added: finatrades_id_otp_expiry';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'finatrades_id_otp_attempts') THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: finatrades_id_otp_attempts';
    END IF;
END $$;

-- ==========================================
-- 3. EMPLOYEES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) REFERENCES users(id),
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    role employee_role NOT NULL DEFAULT 'support',
    rbac_role_id VARCHAR(255),
    department VARCHAR(100),
    job_title VARCHAR(255),
    status employee_status NOT NULL DEFAULT 'active',
    permissions JSON,
    hired_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 4. ROLE_PERMISSIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role employee_role NOT NULL UNIQUE,
    permissions JSON NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 5. ADMIN_ROLES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_roles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    department VARCHAR(100),
    risk_level risk_level NOT NULL DEFAULT 'Low',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 6. ADMIN_COMPONENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_components (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    path VARCHAR(255),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 7. ROLE_COMPONENT_PERMISSIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS role_component_permissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role_id VARCHAR(255) NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    component_id VARCHAR(255) NOT NULL REFERENCES admin_components(id) ON DELETE CASCADE,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_l1 BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_final BOOLEAN NOT NULL DEFAULT FALSE,
    can_reject BOOLEAN NOT NULL DEFAULT FALSE,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 8. USER_ROLE_ASSIGNMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ==========================================
-- 9. TASK_DEFINITIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS task_definitions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    component_id VARCHAR(255) REFERENCES admin_components(id),
    category VARCHAR(100),
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    first_approver_role_id VARCHAR(255) REFERENCES admin_roles(id),
    final_approver_role_id VARCHAR(255) REFERENCES admin_roles(id),
    sla_hours INTEGER DEFAULT 24,
    auto_expire_hours INTEGER DEFAULT 72,
    requires_reason BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_initiator_roles JSON,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 10. APPROVAL_QUEUE TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS approval_queue (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    task_definition_id VARCHAR(255) NOT NULL REFERENCES task_definitions(id),
    initiator_id VARCHAR(255) NOT NULL REFERENCES users(id),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    task_data JSON,
    status approval_status NOT NULL DEFAULT 'pending_l1',
    priority VARCHAR(20) DEFAULT 'normal',
    reason TEXT,
    l1_approver_id VARCHAR(255) REFERENCES users(id),
    l1_approved_at TIMESTAMP,
    l1_comments TEXT,
    final_approver_id VARCHAR(255) REFERENCES users(id),
    final_approved_at TIMESTAMP,
    final_comments TEXT,
    rejected_by VARCHAR(255) REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    expires_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 11. APPROVAL_HISTORY TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS approval_history (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    approval_queue_id VARCHAR(255) NOT NULL REFERENCES approval_queue(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    actor_role VARCHAR(100),
    old_value JSON,
    new_value JSON,
    comments TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 12. EMERGENCY_OVERRIDES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS emergency_overrides (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    approval_queue_id VARCHAR(255) REFERENCES approval_queue(id),
    reason TEXT NOT NULL,
    approver1_id VARCHAR(255) NOT NULL REFERENCES users(id),
    approver1_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approver2_id VARCHAR(255) REFERENCES users(id),
    approver2_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_second',
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 13. ORG_POSITIONS TABLE (Organization Chart)
-- ==========================================

CREATE TABLE IF NOT EXISTS org_positions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    parent_id VARCHAR(255),
    photo_url TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 14. USER_BANK_ACCOUNTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    bank_name VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    iban VARCHAR(50),
    swift_code VARCHAR(20),
    routing_number VARCHAR(20),
    bank_address TEXT,
    bank_country VARCHAR(100),
    account_type VARCHAR(50) DEFAULT 'Savings',
    currency VARCHAR(10) DEFAULT 'USD',
    label VARCHAR(100),
    status user_bank_account_status NOT NULL DEFAULT 'Active',
    is_primary BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 15. USER_CRYPTO_WALLETS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS user_crypto_wallets (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    network crypto_network NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    label VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 16. SEED DEFAULT ROLE PERMISSIONS (Super Admin)
-- ==========================================

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    'super_admin'::employee_role,
    '["manage_users","view_users","manage_employees","manage_kyc","view_kyc","manage_transactions","view_transactions","manage_withdrawals","manage_deposits","manage_vault","view_vault","manage_bnsl","view_bnsl","manage_finabridge","view_finabridge","manage_support","view_support","manage_cms","view_cms","manage_settings","view_reports","generate_reports","manage_fees"]'::json,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'super_admin');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    'admin'::employee_role,
    '["manage_users","view_users","manage_kyc","view_kyc","manage_transactions","view_transactions","manage_withdrawals","manage_deposits","manage_vault","view_vault","manage_bnsl","view_bnsl","manage_finabridge","view_finabridge","manage_support","view_support","view_reports","manage_fees"]'::json,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    'manager'::employee_role,
    '["view_users","manage_kyc","view_kyc","view_transactions","manage_vault","view_vault","view_bnsl","view_finabridge","view_support","view_reports"]'::json,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'manager');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    'support'::employee_role,
    '["view_users","view_kyc","view_transactions","manage_support","view_support"]'::json,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'support');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    'finance'::employee_role,
    '["view_transactions","manage_transactions","manage_withdrawals","manage_deposits","view_reports","generate_reports","manage_fees"]'::json,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'finance');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    'compliance'::employee_role,
    '["view_users","manage_kyc","view_kyc","view_transactions","view_reports","generate_reports"]'::json,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'compliance');

-- ==========================================
-- 17. ADD INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_initiator ON approval_queue(initiator_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crypto_wallets_user_id ON user_crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_parent_id ON org_positions(parent_id);

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

SELECT 'Schema update completed!' as status;

-- Check users table new columns
SELECT 'Users table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('custom_finatrades_id', 'custom_finatrades_id_changed_at', 'finatrades_id_otp', 'finatrades_id_otp_expiry', 'finatrades_id_otp_attempts')
ORDER BY column_name;

-- Check new tables exist
SELECT 'New tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'role_permissions', 'admin_roles', 'admin_components', 'role_component_permissions', 'user_role_assignments', 'task_definitions', 'approval_queue', 'approval_history', 'emergency_overrides', 'org_positions', 'user_bank_accounts', 'user_crypto_wallets')
ORDER BY table_name;

-- Check role permissions seeded
SELECT 'Role permissions:' as info;
SELECT role, permissions FROM role_permissions;
