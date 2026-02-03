-- =====================================================
-- FINATRADES AWS DATABASE SCHEMA UPDATE
-- Complete Update for ALL changes since 20 Jan 2026
-- =====================================================
-- This script safely adds missing columns, enums, and tables
-- Run on AWS RDS PostgreSQL database
-- Safe and idempotent - can run multiple times
-- =====================================================

-- ==========================================
-- PART 1: CREATE ALL MISSING ENUMS
-- ==========================================

-- user_bank_account_status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_bank_account_status') THEN
        CREATE TYPE user_bank_account_status AS ENUM ('Active', 'Inactive', 'Pending', 'Verified');
        RAISE NOTICE 'Created enum: user_bank_account_status';
    END IF;
END $$;

-- crypto_network enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crypto_network') THEN
        CREATE TYPE crypto_network AS ENUM ('Bitcoin', 'Ethereum', 'BNB_Smart_Chain', 'Polygon', 'Tron', 'Solana', 'Arbitrum', 'Avalanche', 'Optimism', 'Base');
        RAISE NOTICE 'Created enum: crypto_network';
    END IF;
END $$;

-- employee_role enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
        CREATE TYPE employee_role AS ENUM ('super_admin', 'admin', 'manager', 'support', 'finance', 'compliance');
        RAISE NOTICE 'Created enum: employee_role';
    END IF;
END $$;

-- employee_status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
        CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'suspended');
        RAISE NOTICE 'Created enum: employee_status';
    END IF;
END $$;

-- permission_action enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_action') THEN
        CREATE TYPE permission_action AS ENUM ('view', 'create', 'edit', 'approve_l1', 'approve_final', 'reject', 'export', 'delete');
        RAISE NOTICE 'Created enum: permission_action';
    END IF;
END $$;

-- approval_status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending_l1', 'pending_final', 'approved', 'rejected', 'expired', 'cancelled');
        RAISE NOTICE 'Created enum: approval_status';
    END IF;
END $$;

-- risk_level enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
        RAISE NOTICE 'Created enum: risk_level';
    END IF;
END $$;

-- workflow_flow_type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_flow_type') THEN
        CREATE TYPE workflow_flow_type AS ENUM ('ADD_FUNDS', 'INTERNAL_TRANSFER_LGPW_TO_FGPW', 'INTERNAL_TRANSFER_FGPW_TO_LGPW', 'TRANSFER_USER_TO_USER', 'WITHDRAWAL', 'BNSL_ACTIVATION', 'BNSL_PAYOUT', 'FINABRIDGE_LOCK');
        RAISE NOTICE 'Created enum: workflow_flow_type';
    END IF;
END $$;

-- workflow_step_result enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_step_result') THEN
        CREATE TYPE workflow_step_result AS ENUM ('PASS', 'FAIL', 'PENDING', 'SKIPPED');
        RAISE NOTICE 'Created enum: workflow_step_result';
    END IF;
END $$;

-- treasury_cash_entry_type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treasury_cash_entry_type') THEN
        CREATE TYPE treasury_cash_entry_type AS ENUM ('DEPOSIT_CARD', 'DEPOSIT_BANK', 'DEPOSIT_CRYPTO', 'GOLD_PURCHASE', 'GOLD_SALE', 'WITHDRAWAL_PAYOUT', 'FEE_COLLECTED', 'EXPENSE', 'ADJUSTMENT', 'REFUND');
        RAISE NOTICE 'Created enum: treasury_cash_entry_type';
    END IF;
END $$;

-- treasury_gold_entry_type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treasury_gold_entry_type') THEN
        CREATE TYPE treasury_gold_entry_type AS ENUM ('PURCHASE', 'ALLOCATE_TO_USER', 'RETURN_FROM_USER', 'SOLD', 'PHYSICAL_DELIVERY', 'ADJUSTMENT', 'STORAGE_FEE');
        RAISE NOTICE 'Created enum: treasury_gold_entry_type';
    END IF;
END $$;

-- ==========================================
-- PART 2: USERS TABLE - New Columns
-- ==========================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'custom_finatrades_id') THEN
        ALTER TABLE users ADD COLUMN custom_finatrades_id VARCHAR(25) UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'custom_finatrades_id_changed_at') THEN
        ALTER TABLE users ADD COLUMN custom_finatrades_id_changed_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'finatrades_id_otp') THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp VARCHAR(6);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'finatrades_id_otp_expiry') THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp_expiry TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'finatrades_id_otp_attempts') THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- ==========================================
-- PART 3: RBAC & EMPLOYEE MANAGEMENT TABLES
-- ==========================================

-- employees
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

-- role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role employee_role NOT NULL UNIQUE,
    permissions JSON NOT NULL,
    updated_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- admin_roles
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

-- admin_components
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

-- role_component_permissions
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

-- user_role_assignments
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- task_definitions
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

-- approval_queue
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

-- approval_history
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

-- emergency_overrides
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
-- PART 4: WORKFLOW AUDIT TABLES
-- ==========================================

-- workflow_audit_logs
CREATE TABLE IF NOT EXISTS workflow_audit_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    flow_type workflow_flow_type NOT NULL,
    flow_instance_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id),
    transaction_id VARCHAR(255),
    deposit_request_id VARCHAR(255),
    step_key VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    expected TEXT,
    actual TEXT,
    result workflow_step_result NOT NULL DEFAULT 'PENDING',
    mismatch_reason TEXT,
    payload_json JSON,
    wallet_credited VARCHAR(20),
    ledger_entry_id VARCHAR(255),
    certificate_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- workflow_audit_summaries
CREATE TABLE IF NOT EXISTS workflow_audit_summaries (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    flow_type workflow_flow_type NOT NULL,
    flow_instance_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) REFERENCES users(id),
    transaction_id VARCHAR(255),
    total_steps INTEGER NOT NULL DEFAULT 0,
    passed_steps INTEGER NOT NULL DEFAULT 0,
    failed_steps INTEGER NOT NULL DEFAULT 0,
    pending_steps INTEGER NOT NULL DEFAULT 0,
    overall_result workflow_step_result NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- workflow_expected_steps
CREATE TABLE IF NOT EXISTS workflow_expected_steps (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    flow_type workflow_flow_type NOT NULL,
    step_key VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT TRUE
);

-- ==========================================
-- PART 5: TREASURY MANAGEMENT TABLES
-- ==========================================

-- treasury_cash_vault
CREATE TABLE IF NOT EXISTS treasury_cash_vault (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entry_type treasury_cash_entry_type NOT NULL,
    amount_usd DECIMAL(18, 2) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    running_balance_usd DECIMAL(18, 2) NOT NULL,
    source_type VARCHAR(50),
    source_id VARCHAR(255),
    user_id VARCHAR(255) REFERENCES users(id),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    processed_by VARCHAR(255) REFERENCES users(id),
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- treasury_gold_vault
CREATE TABLE IF NOT EXISTS treasury_gold_vault (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entry_type treasury_gold_entry_type NOT NULL,
    gold_grams DECIMAL(18, 6) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    cost_per_gram_usd DECIMAL(18, 4),
    total_cost_usd DECIMAL(18, 2),
    running_balance_grams DECIMAL(18, 6) NOT NULL,
    source_type VARCHAR(50),
    source_id VARCHAR(255),
    user_id VARCHAR(255) REFERENCES users(id),
    supplier VARCHAR(100),
    storage_location VARCHAR(255),
    wingold_order_id VARCHAR(255),
    processed_by VARCHAR(255) REFERENCES users(id),
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- treasury_daily_reconciliation
CREATE TABLE IF NOT EXISTS treasury_daily_reconciliation (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL UNIQUE,
    cash_vault_balance_usd DECIMAL(18, 2) NOT NULL,
    total_deposits_usd DECIMAL(18, 2) NOT NULL,
    total_withdrawals_usd DECIMAL(18, 2) NOT NULL,
    total_fees_collected_usd DECIMAL(18, 2) NOT NULL,
    gold_vault_balance_grams DECIMAL(18, 6) NOT NULL,
    gold_vault_value_usd DECIMAL(18, 2) NOT NULL,
    total_gold_purchased_grams DECIMAL(18, 6) NOT NULL,
    total_gold_purchase_cost_usd DECIMAL(18, 2) NOT NULL,
    total_user_digital_gold_grams DECIMAL(18, 6) NOT NULL,
    total_user_digital_gold_value_usd DECIMAL(18, 2) NOT NULL,
    gold_variance_grams DECIMAL(18, 6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'matched',
    gold_price_per_gram_usd DECIMAL(18, 4) NOT NULL,
    card_deposits_usd DECIMAL(18, 2),
    bank_deposits_usd DECIMAL(18, 2),
    crypto_deposits_usd DECIMAL(18, 2),
    audited_by VARCHAR(255) REFERENCES users(id),
    audit_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- PART 6: ORG CHART & USER ACCOUNTS
-- ==========================================

-- org_positions
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

-- user_bank_accounts
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

-- user_crypto_wallets
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
-- PART 7: SEED DEFAULT DATA
-- ==========================================

-- Default role permissions
INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT gen_random_uuid()::text, 'super_admin'::employee_role,
    '["manage_users","view_users","manage_employees","manage_kyc","view_kyc","manage_transactions","view_transactions","manage_withdrawals","manage_deposits","manage_vault","view_vault","manage_bnsl","view_bnsl","manage_finabridge","view_finabridge","manage_support","view_support","manage_cms","view_cms","manage_settings","view_reports","generate_reports","manage_fees"]'::json,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'super_admin');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT gen_random_uuid()::text, 'admin'::employee_role,
    '["manage_users","view_users","manage_kyc","view_kyc","manage_transactions","view_transactions","manage_withdrawals","manage_deposits","manage_vault","view_vault","manage_bnsl","view_bnsl","manage_finabridge","view_finabridge","manage_support","view_support","view_reports","manage_fees"]'::json,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT gen_random_uuid()::text, 'manager'::employee_role,
    '["view_users","manage_kyc","view_kyc","view_transactions","manage_vault","view_vault","view_bnsl","view_finabridge","view_support","view_reports"]'::json,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'manager');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT gen_random_uuid()::text, 'support'::employee_role,
    '["view_users","view_kyc","view_transactions","manage_support","view_support"]'::json,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'support');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT gen_random_uuid()::text, 'finance'::employee_role,
    '["view_transactions","manage_transactions","manage_withdrawals","manage_deposits","view_reports","generate_reports","manage_fees"]'::json,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'finance');

INSERT INTO role_permissions (id, role, permissions, created_at, updated_at)
SELECT gen_random_uuid()::text, 'compliance'::employee_role,
    '["view_users","manage_kyc","view_kyc","view_transactions","view_reports","generate_reports"]'::json,
    NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'compliance');

-- ==========================================
-- PART 8: PERFORMANCE INDEXES
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
CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_flow_id ON workflow_audit_logs(flow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_user ON workflow_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_treasury_cash_vault_date ON treasury_cash_vault(date);
CREATE INDEX IF NOT EXISTS idx_treasury_gold_vault_date ON treasury_gold_vault(date);
CREATE INDEX IF NOT EXISTS idx_treasury_daily_reconciliation_date ON treasury_daily_reconciliation(date);

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT 'Schema update completed!' as status;

-- Summary of created tables
SELECT 'New tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'employees', 'role_permissions', 'admin_roles', 'admin_components', 
    'role_component_permissions', 'user_role_assignments', 'task_definitions', 
    'approval_queue', 'approval_history', 'emergency_overrides', 'org_positions', 
    'user_bank_accounts', 'user_crypto_wallets', 'workflow_audit_logs',
    'workflow_audit_summaries', 'workflow_expected_steps', 'treasury_cash_vault',
    'treasury_gold_vault', 'treasury_daily_reconciliation'
) ORDER BY table_name;

-- Summary of enums
SELECT 'New enums:' as info;
SELECT typname FROM pg_type 
WHERE typname IN (
    'employee_role', 'employee_status', 'permission_action', 'approval_status',
    'risk_level', 'workflow_flow_type', 'workflow_step_result', 
    'treasury_cash_entry_type', 'treasury_gold_entry_type',
    'user_bank_account_status', 'crypto_network'
) ORDER BY typname;
