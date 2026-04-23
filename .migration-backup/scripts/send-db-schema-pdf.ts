import PDFDocument from 'pdfkit';
import { sendEmailWithAttachment } from '../server/email';

async function generateDatabaseStructurePDF(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(24).fillColor('#8A2BE2').text('Finatrades Database Structure', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown(2);

    const sections = [
      {
        title: '1. Users & Authentication',
        tables: [
          { name: 'users', desc: 'Main user accounts (email, password, KYC status, role, profile)' },
          { name: 'password_reset_tokens', desc: 'Password reset token management' },
          { name: 'employees', desc: 'Admin/staff accounts with roles' },
          { name: 'role_permissions', desc: 'Permission sets for each role' },
          { name: 'user_account_status', desc: 'Account freeze/suspend status' },
          { name: 'user_preferences', desc: 'User notification & display preferences' },
          { name: 'push_device_tokens', desc: 'Mobile push notification tokens' },
        ]
      },
      {
        title: '2. Security & Authentication',
        tables: [
          { name: 'security_settings', desc: 'Global security configuration' },
          { name: 'otp_verifications', desc: 'OTP codes for verification' },
          { name: 'user_passkeys', desc: 'WebAuthn/passkey credentials' },
          { name: 'transaction_pins', desc: 'Transaction PIN storage' },
          { name: 'pin_verification_tokens', desc: 'PIN verification tokens' },
          { name: 'admin_action_otps', desc: 'Admin action OTP verification' },
        ]
      },
      {
        title: '3. KYC & Compliance',
        tables: [
          { name: 'kyc_submissions', desc: 'KYC document submissions (tiered)' },
          { name: 'finatrades_personal_kyc', desc: 'Personal KYC (Finatrades mode)' },
          { name: 'finatrades_corporate_kyc', desc: 'Corporate KYC submissions' },
          { name: 'compliance_settings', desc: 'KYC mode & country restrictions' },
          { name: 'user_risk_profiles', desc: 'User risk scores & levels' },
          { name: 'aml_screening_logs', desc: 'AML screening results' },
          { name: 'aml_cases', desc: 'AML investigation cases' },
          { name: 'aml_case_activities', desc: 'AML case audit trail' },
          { name: 'aml_monitoring_rules', desc: 'Transaction monitoring rules' },
          { name: 'geo_restrictions', desc: 'Country-level restrictions' },
          { name: 'geo_restriction_settings', desc: 'Geo restriction configuration' },
        ]
      },
      {
        title: '4. FinaPay (Wallets & Transactions)',
        tables: [
          { name: 'wallets', desc: 'User gold & fiat balances' },
          { name: 'transactions', desc: 'All transaction records' },
          { name: 'deposit_requests', desc: 'Fiat deposit requests' },
          { name: 'withdrawal_requests', desc: 'Fiat withdrawal requests' },
          { name: 'gold_requests', desc: 'P2P gold request money' },
          { name: 'qr_payment_invoices', desc: 'QR code payment invoices' },
          { name: 'wallet_adjustments', desc: 'Admin wallet adjustments' },
          { name: 'peer_transfers', desc: 'P2P transfer records' },
          { name: 'peer_requests', desc: 'P2P payment requests' },
          { name: 'buy_gold_requests', desc: 'Buy gold request records' },
          { name: 'platform_bank_accounts', desc: 'Admin-managed bank accounts' },
          { name: 'platform_fees', desc: 'Fee configuration' },
          { name: 'fee_transactions', desc: 'Fee transaction records' },
        ]
      },
      {
        title: '5. Payment Integrations',
        tables: [
          { name: 'binance_transactions', desc: 'Binance Pay transactions' },
          { name: 'ngenius_transactions', desc: 'N-Genius payment transactions' },
          { name: 'payment_gateway_settings', desc: 'Payment gateway configuration' },
          { name: 'crypto_wallet_configs', desc: 'Crypto wallet settings' },
          { name: 'crypto_payment_requests', desc: 'Crypto payment requests' },
        ]
      },
      {
        title: '6. FinaVault (Gold Storage)',
        tables: [
          { name: 'vault_holdings', desc: 'User vault gold holdings' },
          { name: 'certificates', desc: 'Ownership & storage certificates' },
          { name: 'vault_ledger_entries', desc: 'Vault transaction ledger' },
          { name: 'vault_ownership_summary', desc: 'Ownership summary view' },
          { name: 'allocations', desc: 'Gold allocations' },
          { name: 'vault_deposit_requests', desc: 'Vault deposit requests' },
          { name: 'vault_withdrawal_requests', desc: 'Vault withdrawal requests' },
          { name: 'certificate_deliveries', desc: 'Certificate delivery tracking' },
          { name: 'gold_bars', desc: 'Physical gold bar inventory' },
          { name: 'storage_fees', desc: 'Storage fee records' },
          { name: 'physical_delivery_requests', desc: 'Physical gold delivery' },
        ]
      },
      {
        title: '7. BNSL (Buy Now Sell Later)',
        tables: [
          { name: 'bnsl_wallets', desc: 'BNSL-specific wallets' },
          { name: 'bnsl_plan_templates', desc: 'BNSL plan templates' },
          { name: 'bnsl_template_variants', desc: 'Plan variant options' },
          { name: 'bnsl_plans', desc: 'Active BNSL plans' },
          { name: 'bnsl_payouts', desc: 'BNSL payout schedules' },
          { name: 'bnsl_early_terminations', desc: 'Early termination requests' },
          { name: 'bnsl_agreements', desc: 'BNSL agreement documents' },
        ]
      },
      {
        title: '8. FinaBridge (Trade Finance)',
        tables: [
          { name: 'finabridge_agreements', desc: 'FinaBridge agreements' },
          { name: 'trade_cases', desc: 'Trade finance cases' },
          { name: 'trade_documents', desc: 'Trade case documents' },
          { name: 'trade_requests', desc: 'Trade requests' },
          { name: 'trade_proposals', desc: 'Trade proposals' },
          { name: 'forwarded_proposals', desc: 'Forwarded proposals' },
          { name: 'trade_confirmations', desc: 'Trade confirmations' },
          { name: 'finabridge_wallets', desc: 'FinaBridge wallets' },
          { name: 'settlement_holds', desc: 'Gold settlement holds' },
          { name: 'partial_settlements', desc: 'Partial settlement records' },
          { name: 'trade_disputes', desc: 'Trade dispute cases' },
          { name: 'trade_dispute_comments', desc: 'Dispute comments' },
          { name: 'deal_rooms', desc: 'Negotiation rooms' },
          { name: 'deal_room_documents', desc: 'Deal room documents' },
          { name: 'deal_room_messages', desc: 'Deal room chat messages' },
          { name: 'deal_room_agreement_acceptances', desc: 'Agreement acceptances' },
        ]
      },
      {
        title: '9. AI Chat & Support',
        tables: [
          { name: 'chat_agents', desc: 'AI agent configurations' },
          { name: 'chat_sessions', desc: 'Chat session records' },
          { name: 'chat_messages', desc: 'Chat message history' },
          { name: 'chat_agent_workflows', desc: 'Agent workflow definitions' },
          { name: 'knowledge_categories', desc: 'Knowledge base categories' },
          { name: 'knowledge_articles', desc: 'Knowledge base articles' },
        ]
      },
      {
        title: '10. CMS & Content',
        tables: [
          { name: 'content_pages', desc: 'CMS pages' },
          { name: 'content_blocks', desc: 'Page content blocks' },
          { name: 'templates', desc: 'Email/document templates' },
          { name: 'cms_labels', desc: 'Translatable labels' },
          { name: 'media_assets', desc: 'Uploaded media files' },
          { name: 'branding_settings', desc: 'Platform branding config' },
        ]
      },
      {
        title: '11. Notifications & Email',
        tables: [
          { name: 'notifications', desc: 'User notifications' },
          { name: 'email_notification_settings', desc: 'Email toggle settings' },
          { name: 'email_logs', desc: 'Email send history' },
        ]
      },
      {
        title: '12. System & Admin',
        tables: [
          { name: 'platform_config', desc: 'Platform-wide settings' },
          { name: 'audit_logs', desc: 'User action audit trail' },
          { name: 'system_logs', desc: 'System event logs' },
          { name: 'database_backups', desc: 'Backup records' },
          { name: 'backup_audit_logs', desc: 'Backup audit trail' },
          { name: 'invoices', desc: 'Invoice records' },
          { name: 'daily_financial_snapshots', desc: 'Daily financial reports' },
          { name: 'platform_expenses', desc: 'Platform expense tracking' },
          { name: 'referrals', desc: 'Referral program records' },
        ]
      },
    ];

    for (const section of sections) {
      if (doc.y > 680) doc.addPage();
      
      doc.fontSize(14).fillColor('#4B0082').text(section.title);
      doc.moveDown(0.3);
      
      for (const table of section.tables) {
        if (doc.y > 720) doc.addPage();
        doc.fontSize(9).fillColor('#000').text(`• ${table.name}`, { continued: true });
        doc.fillColor('#666').text(` - ${table.desc}`);
      }
      doc.moveDown(0.8);
    }

    doc.addPage();
    doc.fontSize(16).fillColor('#8A2BE2').text('Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).fillColor('#000').text('Total Tables: 100+', { align: 'center' });
    doc.text('Database: PostgreSQL with Drizzle ORM', { align: 'center' });
    doc.text('Schema Location: shared/schema.ts', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('Finatrades Platform - Confidential', { align: 'center' });

    doc.end();
  });
}

async function main() {
  console.log('Generating PDF...');
  const pdfBuffer = await generateDatabaseStructurePDF();
  console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
  
  console.log('Sending email to system@finatrades.com...');
  const result = await sendEmailWithAttachment(
    'system@finatrades.com',
    'Finatrades Database Structure Report',
    `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #8A2BE2;">Database Structure Report</h2>
        <p>Please find attached the complete database structure for the Finatrades platform.</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Tables:</strong> 100+</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Finatrades - Gold-Backed Digital Finance</p>
      </div>
    `,
    {
      filename: 'Finatrades-Database-Structure.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf',
    }
  );
  
  console.log('Email result:', result);
}

main().catch(console.error);
