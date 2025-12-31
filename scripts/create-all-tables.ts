import { pool } from '../server/db';

async function createAllTables() {
  console.log("Creating all tables on AWS RDS using raw SQL...\n");
  
  const client = await pool.connect();
  
  try {
    const coreTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        kyc_status VARCHAR(50) DEFAULT 'not_started',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        balance DECIMAL(20, 8) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'GOLD',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        wallet_id UUID REFERENCES wallets(id),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        reference VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(100) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category, key)
      );

      CREATE TABLE IF NOT EXISTS payment_gateway_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gateway VARCHAR(100) NOT NULL,
        settings JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS geo_restriction_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code VARCHAR(10) NOT NULL,
        is_restricted BOOLEAN DEFAULT false,
        restriction_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_fees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fee_type VARCHAR(100) NOT NULL,
        fee_value DECIMAL(10, 4) NOT NULL,
        fee_unit VARCHAR(20) DEFAULT 'percent',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS peer_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id),
        recipient_id UUID,
        recipient_email VARCHAR(255),
        amount DECIMAL(20, 8) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        transfer_type VARCHAR(50),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        settings JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS knowledge_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        subject VARCHAR(500),
        body TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'email',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        documents JSONB,
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by UUID
      );

      CREATE TABLE IF NOT EXISTS branding_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255),
        tagline TEXT,
        logo_url TEXT,
        favicon_url TEXT,
        primary_color VARCHAR(20),
        primary_foreground VARCHAR(20),
        secondary_color VARCHAR(20),
        secondary_foreground VARCHAR(20),
        accent_color VARCHAR(20),
        button_radius VARCHAR(20),
        button_primary_bg VARCHAR(20),
        button_primary_text VARCHAR(20),
        button_secondary_bg VARCHAR(20),
        button_secondary_text VARCHAR(20),
        font_family VARCHAR(100),
        heading_font_family VARCHAR(100),
        background_color VARCHAR(20),
        card_background VARCHAR(20),
        sidebar_background VARCHAR(20),
        border_radius VARCHAR(20),
        border_color VARCHAR(20),
        nav_link_names JSONB,
        footer_text TEXT,
        social_links JSONB,
        is_active BOOLEAN DEFAULT true,
        updated_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cms_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS finatrades_personal_kyc (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS finatrades_corporate_kyc (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log("Running table creation SQL...");
    await client.query(coreTableSQL);
    console.log("Core tables created successfully!\n");

    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    
    console.log("Total tables: " + result.rows.length);
    result.rows.forEach((row: any) => console.log("  - " + row.table_name));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

createAllTables();
