-- =====================================================
-- FINATRADES AWS DATABASE SCHEMA UPDATE (Post 26 Jan 2026)
-- =====================================================
-- This script safely adds missing columns to your AWS database
-- Data will remain intact - only adds new columns if they don't exist
-- =====================================================

-- ==========================================
-- 1. USERS TABLE - Finatrades ID Login Columns
-- ==========================================

-- Add custom_finatrades_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'custom_finatrades_id'
    ) THEN
        ALTER TABLE users ADD COLUMN custom_finatrades_id VARCHAR(25) UNIQUE;
        RAISE NOTICE 'Added: custom_finatrades_id';
    ELSE
        RAISE NOTICE 'Already exists: custom_finatrades_id';
    END IF;
END $$;

-- Add custom_finatrades_id_changed_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'custom_finatrades_id_changed_at'
    ) THEN
        ALTER TABLE users ADD COLUMN custom_finatrades_id_changed_at TIMESTAMP;
        RAISE NOTICE 'Added: custom_finatrades_id_changed_at';
    ELSE
        RAISE NOTICE 'Already exists: custom_finatrades_id_changed_at';
    END IF;
END $$;

-- Add finatrades_id_otp column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'finatrades_id_otp'
    ) THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp VARCHAR(6);
        RAISE NOTICE 'Added: finatrades_id_otp';
    ELSE
        RAISE NOTICE 'Already exists: finatrades_id_otp';
    END IF;
END $$;

-- Add finatrades_id_otp_expiry column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'finatrades_id_otp_expiry'
    ) THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp_expiry TIMESTAMP;
        RAISE NOTICE 'Added: finatrades_id_otp_expiry';
    ELSE
        RAISE NOTICE 'Already exists: finatrades_id_otp_expiry';
    END IF;
END $$;

-- Add finatrades_id_otp_attempts column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'finatrades_id_otp_attempts'
    ) THEN
        ALTER TABLE users ADD COLUMN finatrades_id_otp_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added: finatrades_id_otp_attempts';
    ELSE
        RAISE NOTICE 'Already exists: finatrades_id_otp_attempts';
    END IF;
END $$;

-- ==========================================
-- 2. NEW ENUMS (Required before tables)
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

-- ==========================================
-- 3. ORG_POSITIONS TABLE (Organization Chart)
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
-- 4. USER_BANK_ACCOUNTS TABLE
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
-- 5. USER_CRYPTO_WALLETS TABLE
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
-- 6. ADD INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crypto_wallets_user_id ON user_crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_parent_id ON org_positions(parent_id);

-- ==========================================
-- VERIFICATION QUERY
-- ==========================================

SELECT 'Schema update completed!' as status;

-- Check users table new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('custom_finatrades_id', 'custom_finatrades_id_changed_at', 'finatrades_id_otp', 'finatrades_id_otp_expiry', 'finatrades_id_otp_attempts')
ORDER BY column_name;

-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('org_positions', 'user_bank_accounts', 'user_crypto_wallets');
