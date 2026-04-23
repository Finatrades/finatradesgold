import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  welcome_email: {
    user_name: 'Ahmad Al-Rashid',
    verification_url: 'https://app.finatrades.com/verify?token=abc123',
  },
  email_verification: {
    user_name: 'Ahmad Al-Rashid',
    verification_url: 'https://app.finatrades.com/verify-email?token=xyz789',
    verification_code: '847291',
  },
  password_reset: {
    user_name: 'Ahmad Al-Rashid',
    reset_url: 'https://app.finatrades.com/reset-password?token=rst456',
  },
  password_changed: {
    user_name: 'Ahmad Al-Rashid',
    change_date: '14 April 2026, 09:32 AM GST',
    security_url: 'https://app.finatrades.com/settings/security',
  },
  new_device_login: {
    user_name: 'Ahmad Al-Rashid',
    device_info: 'Chrome 124 on macOS Sequoia',
    location: 'Dubai, United Arab Emirates',
    login_time: '14 April 2026, 10:15 AM GST',
    ip_address: '185.23.108.44',
    security_url: 'https://app.finatrades.com/settings/security',
  },
  account_locked: {
    user_name: 'Ahmad Al-Rashid',
    lock_reason: 'multiple failed login attempts (5 consecutive failures)',
    unlock_time: '30 minutes',
    support_url: 'https://app.finatrades.com/support',
  },
  suspicious_activity: {
    user_name: 'Ahmad Al-Rashid',
    activity_description: 'Unusual login pattern detected — 3 logins from different countries within 2 hours',
    activity_time: '14 April 2026, 08:45 AM GST',
    security_url: 'https://app.finatrades.com/settings/security',
  },
  mfa_enabled: {
    user_name: 'Ahmad Al-Rashid',
  },
  finatrades_id_login_otp: {
    otp_code: '384 921',
  },
  kyc_approved: {
    user_name: 'Ahmad Al-Rashid',
    kyc_tier: 'Tier 2 — Enhanced',
    dashboard_url: 'https://app.finatrades.com/dashboard',
  },
  kyc_rejected: {
    user_name: 'Ahmad Al-Rashid',
    rejection_reason: 'Submitted passport image is blurry and the expiry date is not legible. Please upload a clear, high-resolution copy.',
    resubmit_url: 'https://app.finatrades.com/settings/kyc',
  },
  kyc_changes_requested: {
    user_name: 'Ahmad Al-Rashid',
    changes_required: 'Proof of address document must be dated within the last 3 months. The uploaded utility bill is from January 2025.',
    resubmit_url: 'https://app.finatrades.com/settings/kyc',
  },
  kyc_pending_review: {
    user_name: 'Ahmad Al-Rashid',
  },
  document_expiry_reminder: {
    user_name: 'Ahmad Al-Rashid',
    document_type: 'Passport',
    expiry_date: '28 May 2026',
    days_remaining: '44',
    kyc_url: 'https://app.finatrades.com/settings/kyc',
  },
  gold_purchase: {
    user_name: 'Ahmad Al-Rashid',
    gold_grams: '0.6530',
    gold_price: '153.15',
    amount: '100.00',
    reference_id: 'FT-TXN-2026-041401',
    transaction_date: '14 April 2026, 11:20 AM GST',
    certificate_number: 'FT-CERT-2026-0847',
    total_gold_grams: '5.2140',
    total_value_usd: '798.31',
    dashboard_url: 'https://app.finatrades.com/dashboard',
  },
  gold_sale: {
    user_name: 'Ahmad Al-Rashid',
    gold_grams: '1.0000',
    gold_price: '152.80',
    amount: '152.80',
    reference_id: 'FT-TXN-2026-041402',
    transaction_date: '14 April 2026, 02:45 PM GST',
    total_gold_grams: '4.2140',
    total_value_usd: '643.89',
    dashboard_url: 'https://app.finatrades.com/dashboard',
  },
  card_payment_receipt: {
    user_name: 'Ahmad Al-Rashid',
    amount: '250.00',
    reference_id: 'FT-PAY-2026-041403',
    transaction_date: '14 April 2026, 03:00 PM GST',
    card_last4: '4821',
    certificate_number: 'FT-CERT-2026-0848',
    gold_grams: '1.6335',
    gold_price: '153.05',
    total_gold_grams: '5.8475',
    total_value_usd: '894.97',
    dashboard_url: 'https://app.finatrades.com/dashboard',
  },
  deposit_received: {
    user_name: 'Ahmad Al-Rashid',
    amount: '500.00',
    reference_id: 'FT-DEP-2026-041404',
  },
  deposit_processing: {
    user_name: 'Ahmad Al-Rashid',
    amount: '1,000.00',
    estimated_time: '1–2 business days',
  },
  withdrawal_requested: {
    user_name: 'Ahmad Al-Rashid',
    amount: '200.00',
    withdrawal_method: 'Bank Transfer (Emirates NBD)',
    reference_id: 'FT-WTH-2026-041405',
  },
  withdrawal_processing: {
    user_name: 'Ahmad Al-Rashid',
    amount: '200.00',
    estimated_time: 'Within 1–2 business days',
  },
  withdrawal_completed: {
    user_name: 'Ahmad Al-Rashid',
    amount: '200.00',
    reference_id: 'FT-WTH-2026-041405',
  },
  transaction_failed: {
    user_name: 'Ahmad Al-Rashid',
    transaction_type: 'Gold Purchase',
    amount: '50.00',
    failure_reason: 'Insufficient wallet balance — your FinaPay wallet has $12.30 available',
    support_url: 'https://app.finatrades.com/support',
  },
  low_balance_alert: {
    user_name: 'Ahmad Al-Rashid',
    current_balance: '18.42',
    threshold: '50.00',
    deposit_url: 'https://app.finatrades.com/wallet/deposit',
  },
  transfer_sent: {
    user_name: 'Ahmad Al-Rashid',
    recipient_name: 'Fatima Hassan',
    gold_amount: '0.5000',
    usd_value: '76.53',
    reference_id: 'FT-P2P-2026-041406',
  },
  transfer_received: {
    user_name: 'Fatima Hassan',
    sender_name: 'Ahmad Al-Rashid',
    gold_amount: '0.5000',
    usd_value: '76.53',
    reference_id: 'FT-P2P-2026-041406',
  },
  transfer_pending: {
    user_name: 'Ahmad Al-Rashid',
    recipient_name: 'Fatima Hassan',
    gold_amount: '0.5000',
  },
  transfer_completed: {
    user_name: 'Ahmad Al-Rashid',
    recipient_name: 'Fatima Hassan',
    gold_amount: '0.5000',
  },
  transfer_cancelled: {
    user_name: 'Ahmad Al-Rashid',
    recipient_name: 'Fatima Hassan',
    gold_amount: '0.5000',
    cancellation_reason: 'Recipient has not claimed the transfer within 24 hours',
  },
  invitation: {
    sender_name: 'Ahmad Al-Rashid',
    amount: '0.2500g',
    register_url: 'https://app.finatrades.com/register?ref=AHMAD2026',
  },
  bnsl_agreement_signed: {
    user_name: 'Ahmad Al-Rashid',
    plan_id: 'BNSL-2026-00184',
    gold_amount: '10.0000',
    tenure_months: '12',
    margin_rate: '5.25',
    base_price: '1,531.50',
    total_margin: '80.40',
    quarterly_payout: '20.10',
    signature_name: 'Ahmad Al-Rashid',
    signed_date: '14 April 2026',
    dashboard_url: 'https://app.finatrades.com/bnsl/BNSL-2026-00184',
  },
  bnsl_payment_reminder: {
    user_name: 'Ahmad Al-Rashid',
    plan_name: 'BNSL-2026-00184 (10g Gold)',
    amount: '20.10',
    due_date: '14 July 2026',
    payment_url: 'https://app.finatrades.com/bnsl/payments',
  },
  bnsl_payment_received: {
    user_name: 'Ahmad Al-Rashid',
    plan_name: 'BNSL-2026-00184 (10g Gold)',
    amount: '20.10',
    remaining_balance: '60.30',
    next_due_date: '14 October 2026',
  },
  bnsl_payment_overdue: {
    user_name: 'Ahmad Al-Rashid',
    plan_name: 'BNSL-2026-00184 (10g Gold)',
    amount: '20.10',
    days_overdue: '7',
    late_fee: '2.01',
    payment_url: 'https://app.finatrades.com/bnsl/payments',
  },
  bnsl_plan_completed: {
    user_name: 'Ahmad Al-Rashid',
    gold_amount: '10.0000',
  },
  bnsl_early_exit: {
    user_name: 'Ahmad Al-Rashid',
    plan_name: 'BNSL-2026-00184 (10g Gold)',
    amount_paid: '40.20',
    penalty_amount: '8.04',
    gold_received: '6.4800',
  },
  certificate_delivery: {
    user_name: 'Ahmad Al-Rashid',
    certificate_number: 'FT-CERT-2026-0847',
    gold_amount: '0.6530',
    certificate_type: 'Digital Ownership',
    issue_date: '14 April 2026',
    vault_url: 'https://app.finatrades.com/vault',
  },
  invoice_delivery: {
    user_name: 'Ahmad Al-Rashid',
    invoice_number: 'FT-INV-2026-041401',
    invoice_date: '14 April 2026',
    gold_amount: '0.6530',
    total_amount: '$100.00 USD',
  },
  trade_case_created: {
    user_name: 'Ahmad Al-Rashid',
    case_id: 'FB-TC-2026-00312',
    case_type: 'Letter of Credit (Import)',
    amount: '45,000.00',
  },
  trade_case_status_update: {
    user_name: 'Ahmad Al-Rashid',
    case_id: 'FB-TC-2026-00312',
    new_status: 'Documents Under Review',
    update_date: '16 April 2026',
    status_notes: 'All submitted documents received. Our trade team is reviewing the Letter of Credit terms. Expected completion within 2 business days.',
  },
  trade_document_request: {
    user_name: 'Ahmad Al-Rashid',
    case_id: 'FB-TC-2026-00312',
    required_documents: 'Bill of Lading, Commercial Invoice, Certificate of Origin',
    upload_url: 'https://app.finatrades.com/finabridge/documents/upload',
  },
  trade_document_uploaded: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TC-2026-00312',
    document_type: 'Bill of Lading',
    uploaded_by: 'Dubai Gold Exports LLC',
    upload_date: '17 April 2026',
  },
  trade_case_approved: {
    user_name: 'Ahmad Al-Rashid',
    case_id: 'FB-TC-2026-00312',
    credit_limit: '50,000.00',
    valid_until: '14 October 2026',
  },
  trade_case_rejected: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TC-2026-00312',
    rejection_reason: 'Insufficient trade history — minimum 6 months of import/export activity required',
    rejection_date: '18 April 2026',
  },
  trade_case_completed: {
    user_name: 'Ahmad Al-Rashid',
    case_id: 'FB-TC-2026-00312',
    total_value: '45,000.00',
    completion_date: '28 June 2026',
  },
  finabridge_new_proposal: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    proposed_price: '44,200.00',
    delivery_terms: 'CIF Dubai — 21 days',
    exporter_name: 'Dubai Gold Exports LLC',
    dashboard_url: 'https://app.finatrades.com/finabridge/proposals',
  },
  finabridge_proposal_accepted: {
    user_name: 'Dubai Gold Exports LLC',
    trade_ref: 'FB-TR-2026-00089',
    trade_value: '44,200.00',
    gold_grams: '288.73',
    dashboard_url: 'https://app.finatrades.com/finabridge/deal-room/FB-TR-2026-00089',
  },
  finabridge_proposal_declined: {
    user_name: 'Dubai Gold Exports LLC',
    trade_ref: 'FB-TR-2026-00089',
    proposal_amount: '44,200.00',
    decline_reason: 'Price above market benchmark — requesting revised proposal closer to $43,500',
  },
  finabridge_shipment_update: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    shipment_status: 'In Transit — Departed Port Rashid',
    tracking_number: 'DXB-SHP-2026-8847',
    estimated_arrival: '5 May 2026',
    dashboard_url: 'https://app.finatrades.com/finabridge/shipments',
  },
  finabridge_settlement_locked: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    gold_grams: '288.73',
    usd_value: '44,200.00',
    lock_date: '15 April 2026',
    dashboard_url: 'https://app.finatrades.com/finabridge/settlements',
  },
  finabridge_settlement_released: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    gold_grams: '288.73',
    usd_value: '44,200.00',
    exporter_name: 'Dubai Gold Exports LLC',
  },
  finabridge_deal_room_created: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    deal_room_id: 'DR-2026-00312',
    counterparty_name: 'Dubai Gold Exports LLC',
    created_date: '15 April 2026',
  },
  finabridge_deal_room_closed: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    deal_room_id: 'DR-2026-00312',
    close_reason: 'Trade completed successfully — all milestones fulfilled',
    close_date: '10 June 2026',
  },
  finabridge_request_submitted: {
    admin_name: 'Macy Thompson',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    goods_name: '999.9 Fine Gold Bars (1kg)',
    trade_value: '44,200.00',
    instrument_type: 'Letter of Credit (LC)',
    submitted_at: '14 April 2026, 09:15 AM GST',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_ai_pass_admin: {
    admin_name: 'Macy Thompson',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    fraud_score: '12',
    instrument_type: 'Letter of Credit (LC)',
    extracted_summary: 'LC issuer: Emirates NBD, Amount: $44,200, Beneficiary: Dubai Gold Exports LLC',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_ai_pass_admin_cc: {
    admin_name: 'Farah Khalil',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    fraud_score: '12',
    instrument_type: 'Letter of Credit (LC)',
    extracted_summary: 'LC issuer: Emirates NBD, Amount: $44,200, Beneficiary: Dubai Gold Exports LLC',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_ai_rejected_importer: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    rejection_reason: 'Uploaded Letter of Credit image is partially obscured — key fields (issuing bank, beneficiary) are not legible',
    dashboard_url: 'https://app.finatrades.com/finabridge/applications',
  },
  finabridge_ai_fail_admin: {
    admin_name: 'Macy Thompson',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    rejection_reason: 'Document appears altered — metadata inconsistency detected in PDF creation date',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_under_review_importer: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    goods_name: '999.9 Fine Gold Bars (1kg)',
    trade_value: '44,200.00',
  },
  finabridge_tier1_approved: {
    admin_name: 'Farah Khalil',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    trade_value: '44,200.00',
    instrument_type: 'Letter of Credit (LC)',
    tier1_reviewer: 'Macy Thompson',
    tier1_notes: 'All documents verified. LC terms match application. Recommend Tier 2 approval.',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_tier1_approved_cc: {
    admin_name: 'Reda Benali',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    trade_value: '44,200.00',
    tier1_reviewer: 'Macy Thompson',
    tier1_notes: 'All documents verified. LC terms match application. Recommend Tier 2 approval.',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_tier2_approved: {
    admin_name: 'Reda Benali',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    trade_value: '44,200.00',
    instrument_type: 'Letter of Credit (LC)',
    ai_fraud_score: '12',
    tier1_reviewer: 'Macy Thompson',
    tier1_notes: 'All documents verified. LC terms match application.',
    tier2_reviewer: 'Farah Khalil',
    tier2_notes: 'Compliance checks passed. Counter-party vetted. Ready for Director sign-off.',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_tier2_approved_cc: {
    admin_name: 'Macy Thompson',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    trade_value: '44,200.00',
    tier2_reviewer: 'Farah Khalil',
    tier2_notes: 'Compliance checks passed. Counter-party vetted. Ready for Director sign-off.',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_trade_live: {
    user_name: 'Ahmad Al-Rashid',
    trade_ref: 'FB-TR-2026-00089',
    goods_name: '999.9 Fine Gold Bars (1kg)',
    trade_value: '44,200.00',
    instrument_type: 'Letter of Credit (LC)',
    dashboard_url: 'https://app.finatrades.com/finabridge/my-trades',
  },
  finabridge_trade_live_team: {
    admin_name: 'Macy Thompson',
    trade_ref: 'FB-TR-2026-00089',
    importer_name: 'Ahmad Al-Rashid (Al-Rashid Trading LLC)',
    trade_value: '44,200.00',
    instrument_type: 'Letter of Credit (LC)',
    approved_by: 'Reda Benali (Director)',
    admin_url: 'https://app.finatrades.com/admin/finabridge/FB-TR-2026-00089',
  },
  finabridge_settlement_exporter: {
    user_name: 'Dubai Gold Exports LLC',
    trade_ref: 'FB-TR-2026-00089',
    gold_grams: '288.73',
    usd_value: '44,200.00',
    settlement_date: '10 June 2026',
    dashboard_url: 'https://app.finatrades.com/finabridge/settlements',
  },
  monthly_statement: {
    user_name: 'Ahmad Al-Rashid',
    month: 'March',
    year: '2026',
    opening_gold: '4.5610',
    opening_usd: '695.08',
    closing_gold: '5.2140',
    closing_usd: '798.31',
    total_transactions: '7',
    net_change_gold: '+0.6530',
    current_gold_price_usd: '153.15',
    gold_price_change_pct: '+1.8%',
    portfolio_value_usd: '798.31',
  },
  annual_tax_statement: {
    user_name: 'Ahmad Al-Rashid',
    year: '2025',
    total_purchases_gold: '24.8500',
    total_sales_gold: '12.3200',
    realized_gains: '287.45',
    year_end_gold: '12.5300',
  },
  certificate_digital_ownership: {
    owner_name: 'Ahmad Al-Rashid',
    gold_amount: '5.2140',
    certificate_number: 'FT-CERT-2026-0847',
    purity: '999.9',
    storage_location: 'Wingold & Metals DMCC, Dubai, UAE',
    issue_date: '14 April 2026',
  },
  certificate_transfer: {
    gold_amount: '0.5000',
    certificate_number: 'FT-CERT-TR-2026-0421',
    from_name: 'Ahmad Al-Rashid',
    to_name: 'Fatima Hassan',
    transfer_date: '14 April 2026',
    usd_value: '76.53',
  },
  certificate_bnsl_lock: {
    owner_name: 'Ahmad Al-Rashid',
    gold_amount: '10.0000',
    certificate_number: 'FT-CERT-BNSL-2026-0184',
    lock_price: '153.15',
    lock_date: '14 April 2026',
    maturity_date: '14 April 2027',
    total_value: '1,531.50',
  },
  certificate_trade_lock: {
    owner_name: 'Ahmad Al-Rashid',
    gold_amount: '288.73',
    certificate_number: 'FT-CERT-TL-2026-0089',
    trade_case_id: 'FB-TC-2026-00312',
    lock_date: '15 April 2026',
    collateral_value: '44,200.00',
  },
  certificate_trade_release: {
    owner_name: 'Ahmad Al-Rashid',
    gold_amount: '288.73',
    certificate_number: 'FT-CERT-TR-2026-0089',
    trade_case_id: 'FB-TC-2026-00312',
    release_date: '10 June 2026',
    released_value: '44,200.00',
  },
  invoice_gold_purchase: {
    invoice_number: 'FT-INV-2026-041401',
    invoice_date: '14 April 2026',
    customer_name: 'Ahmad Al-Rashid',
    customer_email: 'ahmad@example.com',
    gold_amount: '0.6530',
    price_per_gram: '153.15',
    subtotal: '100.01',
    fees: '0.00',
    total: '100.00',
  },
  monthly_account_statement: {
    statement_month: 'March',
    statement_year: '2026',
    account_holder: 'Ahmad Al-Rashid',
    account_id: 'FT-ACC-2026-00847',
    period_start: '1 March 2026',
    period_end: '31 March 2026',
    opening_balance: '1,250.00',
    total_deposits: '500.00',
    total_withdrawals: '200.00',
    closing_balance: '1,550.00',
    gold_balance: '5.2140',
    gold_value_usd: '798.31',
    generated_date: '1 April 2026',
  },
};

function replaceVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

function buildEmailWrapper(body: string, subject: string): string {
  const logoSection = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr>
        <td style="padding-right: 12px; vertical-align: middle;">
          <div style="width: 44px; height: 44px; background-color: #8A2BE2; border-radius: 10px; text-align: center; line-height: 44px;">
            <span style="color: #ffffff; font-size: 26px; font-weight: bold; font-family: 'Inter', Arial, sans-serif;">F</span>
          </div>
        </td>
        <td style="vertical-align: middle;">
          <div style="font-size: 26px; font-weight: 800; color: #A78BFA; letter-spacing: 2px; font-family: 'Inter', Arial, sans-serif;">FINATRADES</div>
        </td>
      </tr>
    </table>
    <div style="font-size: 12px; color: #F59E0B; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; font-weight: 600;">Gold-Backed Digital Finance</div>`;

  return `
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15); margin: 0 auto;">
  <tr>
    <td style="background: linear-gradient(135deg, #0D001E 0%, #2A0055 50%, #4B0082 100%); padding: 0;">
      <div style="height: 4px; background: linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B);"></div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 35px 30px 30px;">
            ${logoSection}
            <div style="width: 80px; height: 3px; background: linear-gradient(90deg, transparent, #F59E0B, transparent); margin: 20px auto 0;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 40px 35px; background-color: #ffffff;">
      ${body}
    </td>
  </tr>
  <tr>
    <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td><div style="height: 3px; background: linear-gradient(90deg, #8A2BE2, #A78BFA, #8A2BE2);"></div></td></tr>
        <tr>
          <td align="center" style="padding: 25px 30px 20px;">
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin: 0 0 5px; letter-spacing: 1px;">FINATRADES</p>
            <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0 0 10px;">Wingold and Metals DMCC, Dubai, UAE</p>
            <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 0;">Regulated Gold-Backed Digital Finance Platform</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

async function generateCatalogPdf() {
  console.log('[PDF Catalog] Starting email template catalog generation...');

  const { DEFAULT_EMAIL_TEMPLATES } = await import('../server/email');

  const moduleColors: Record<string, string> = {
    auth: '#3B82F6',
    security: '#EF4444',
    kyc: '#F59E0B',
    transactions: '#22C55E',
    finapay: '#8A2BE2',
    p2p: '#06B6D4',
    bnsl: '#7C3AED',
    trade_finance: '#DC2626',
    account: '#6366F1',
    finavault: '#D4AF37',
    finabridge: '#EC4899',
  };

  const moduleLabels: Record<string, string> = {
    auth: 'Authentication',
    security: 'Security',
    kyc: 'KYC / Compliance',
    transactions: 'Transactions',
    finapay: 'FinaPay',
    p2p: 'P2P Transfers',
    bnsl: 'Buy Now Sell Later',
    trade_finance: 'Trade Finance / FinaBridge',
    account: 'Account & Statements',
    finavault: 'FinaVault',
    finabridge: 'FinaBridge',
  };

  let emailSections = '';
  let tocEntries = '';
  let templateIndex = 0;

  const groupedTemplates: Record<string, typeof DEFAULT_EMAIL_TEMPLATES> = {};
  for (const tmpl of DEFAULT_EMAIL_TEMPLATES) {
    const mod = tmpl.module || 'other';
    if (!groupedTemplates[mod]) groupedTemplates[mod] = [];
    groupedTemplates[mod].push(tmpl);
  }

  for (const [module, templates] of Object.entries(groupedTemplates)) {
    const color = moduleColors[module] || '#6B7280';
    const label = moduleLabels[module] || module.charAt(0).toUpperCase() + module.slice(1);

    tocEntries += `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 15px; font-weight: 700; color: ${color}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">${label}</div>
        <div style="padding-left: 16px;">
          ${templates.map((t, i) => `<div style="font-size: 13px; color: #374151; padding: 3px 0;">${templateIndex + i + 1}. ${t.name} <span style="color: #9CA3AF; font-size: 11px;">(${t.slug})</span></div>`).join('')}
        </div>
      </div>`;

    for (const tmpl of templates) {
      templateIndex++;
      const data = SAMPLE_DATA[tmpl.slug] || {};
      const filledSubject = replaceVariables(tmpl.subject, data);
      const filledBody = replaceVariables(tmpl.body, data);

      const isCertificate = tmpl.type === 'certificate';
      const isInvoice = tmpl.type === 'invoice';
      const isFinancialReport = tmpl.type === 'financial_report';
      const isStandalone = isCertificate || isInvoice || isFinancialReport;

      const renderedEmail = isStandalone
        ? `<div style="background: #f3f4f6; border-radius: 12px; padding: 24px;">${filledBody}</div>`
        : buildEmailWrapper(filledBody, filledSubject);

      const typeBadge = isCertificate ? '<span style="background: #D4AF37; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">CERTIFICATE</span>'
        : isInvoice ? '<span style="background: #8A2BE2; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">INVOICE</span>'
        : isFinancialReport ? '<span style="background: #6366F1; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">FINANCIAL REPORT</span>'
        : '<span style="background: #22C55E; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">EMAIL</span>';

      emailSections += `
        <div class="tmpl-page">
          <div style="margin-bottom: 12px; border-bottom: 2px solid ${color}; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="background: ${color}; color: white; width: 26px; height: 26px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">${templateIndex}</span>
              <span style="font-size: 16px; font-weight: 700; color: #1F2937;">${tmpl.name}</span>
              ${typeBadge}
            </div>
            <div style="font-size: 10px; color: #6B7280; margin-bottom: 4px;">
              <strong>Slug:</strong> ${tmpl.slug} &nbsp;|&nbsp; <strong>Module:</strong> ${label} &nbsp;|&nbsp; <strong>Type:</strong> ${tmpl.type}
            </div>
            <div style="font-size: 11px; color: #374151; background: #F3F4F6; padding: 5px 10px; border-radius: 5px; margin-top: 5px;">
              <strong>Subject:</strong> ${filledSubject}
            </div>
            ${tmpl.variables && tmpl.variables.length > 0 ? `
              <div style="font-size: 10px; color: #6B7280; margin-top: 5px;">
                <strong>Variables:</strong> ${tmpl.variables.map((v: any) => `<code style="background: #EDE9FE; padding: 1px 4px; border-radius: 3px; font-size: 9px;">{{${v.name}}}</code>`).join(', ')}
              </div>
            ` : ''}
          </div>
          <div class="email-shell" style="background: #f3f4f6; padding: 16px; border-radius: 10px;">
            ${renderedEmail}
          </div>
        </div>`;
    }
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FinaTrades Email Template Catalog</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased; }
    @page { margin: 15mm 12mm; size: A4; }
    code { font-family: 'Courier New', monospace; }
    /* Force every template to a fresh page and try to keep its contents together */
    .tmpl-page { page-break-before: always; page-break-inside: avoid; break-inside: avoid; padding: 20px 0; }
    .tmpl-page table, .tmpl-page .email-shell { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #0D001E 0%, #2A0055 50%, #4B0082 100%); color: white; text-align: center; padding: 60px;">
    <div style="width: 80px; height: 80px; background-color: #8A2BE2; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
      <span style="color: white; font-size: 48px; font-weight: bold;">F</span>
    </div>
    <h1 style="font-size: 42px; font-weight: 800; letter-spacing: 4px; margin-bottom: 8px;">FINATRADES</h1>
    <div style="font-size: 14px; color: #F59E0B; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; margin-bottom: 40px;">Gold-Backed Digital Finance</div>
    <div style="width: 120px; height: 3px; background: linear-gradient(90deg, transparent, #F59E0B, transparent); margin-bottom: 40px;"></div>
    <h2 style="font-size: 28px; font-weight: 300; color: #A78BFA; margin-bottom: 12px;">Email Template Catalog</h2>
    <p style="font-size: 16px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">Complete reference of all ${templateIndex} email &amp; document templates</p>
    <p style="font-size: 14px; color: rgba(255,255,255,0.4);">Rendered with realistic sample data</p>
    <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid rgba(139,92,246,0.3); width: 300px;">
      <p style="font-size: 12px; color: rgba(255,255,255,0.5);">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="font-size: 12px; color: rgba(255,255,255,0.4);">Persona: Ahmad Al-Rashid (ahmad@example.com)</p>
    </div>
  </div>

  <!-- Table of Contents -->
  <div style="page-break-before: always; padding: 40px 20px;">
    <h2 style="font-size: 24px; font-weight: 700; color: #4B0082; margin-bottom: 8px;">Table of Contents</h2>
    <div style="width: 60px; height: 3px; background: #8A2BE2; margin-bottom: 24px;"></div>
    <p style="font-size: 13px; color: #6B7280; margin-bottom: 24px;">${templateIndex} templates across ${Object.keys(groupedTemplates).length} modules, grouped by product area.</p>
    ${tocEntries}
  </div>

  <!-- Email Templates -->
  ${emailSections}

  <!-- Back Cover -->
  <div style="page-break-before: always; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #F9FAFB; text-align: center; padding: 60px;">
    <div style="font-size: 20px; font-weight: 700; color: #4B0082; margin-bottom: 12px;">End of Catalog</div>
    <p style="font-size: 14px; color: #6B7280; max-width: 400px; line-height: 1.7;">This document contains all ${templateIndex} email and document templates used across the FinaTrades platform, rendered with realistic sample data for the persona "Ahmad Al-Rashid".</p>
    <div style="margin-top: 30px; font-size: 12px; color: #9CA3AF;">Wingold and Metals DMCC &bull; Dubai, UAE</div>
  </div>
</body>
</html>`;

  const htmlPath = path.resolve('scripts/email-catalog.html');
  fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
  console.log(`[PDF Catalog] HTML written to ${htmlPath}`);

  const pdfPath = path.resolve('email-template-catalog.pdf');

  console.log('[PDF Catalog] Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 60000 });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width: 100%; font-size: 9px; color: #9CA3AF; padding: 0 20mm; display: flex; justify-content: space-between;">
        <span>FinaTrades Email Template Catalog</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
  });

  await browser.close();
  console.log(`[PDF Catalog] PDF saved to ${pdfPath}`);
  console.log(`[PDF Catalog] Done! ${templateIndex} templates rendered.`);
}

generateCatalogPdf().catch((err) => {
  console.error('[PDF Catalog] Fatal error:', err);
  process.exit(1);
});
