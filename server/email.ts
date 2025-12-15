import nodemailer from 'nodemailer';
import { db } from './db';
import { templates } from '@shared/schema';
import { eq } from 'drizzle-orm';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_KEY;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@finatrades.com';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
  pool: true,
  maxConnections: 5,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

async function sendMailWithRetry(mailOptions: nodemailer.SendMailOptions, maxRetries = 3): Promise<nodemailer.SentMessageInfo> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      lastError = error as Error;
      console.log(`[Email] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

console.log(`[Email] Configured with host: ${SMTP_HOST}, port: ${SMTP_PORT}, user: ${SMTP_USER ? 'set' : 'not set'}`);

export interface EmailData {
  [key: string]: string | number | undefined;
}

function replaceVariables(template: string, data: EmailData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key]?.toString() || match;
  });
}

export async function getEmailTemplate(slug: string): Promise<{ subject: string; body: string } | null> {
  const [template] = await db.select().from(templates).where(eq(templates.slug, slug)).limit(1);
  if (!template) return null;
  return {
    subject: template.subject || '',
    body: template.body,
  };
}

export async function sendEmail(
  to: string,
  templateSlug: string,
  data: EmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const template = await getEmailTemplate(templateSlug);
    
    if (!template) {
      console.error(`[Email] Template not found: ${templateSlug}`);
      return { success: false, error: `Template not found: ${templateSlug}` };
    }

    const subject = replaceVariables(template.subject, data);
    const htmlBody = replaceVariables(template.body, data);

    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`[Email Preview] To: ${to}`);
      console.log(`[Email Preview] Subject: ${subject}`);
      console.log(`[Email Preview] Body: ${htmlBody.substring(0, 200)}...`);
      console.log(`[Email] SMTP not configured - email logged only`);
      return { success: true, messageId: 'preview-mode' };
    }

    const info = await sendMailWithRetry({
      from: SMTP_FROM,
      to,
      subject,
      html: htmlBody,
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendEmailDirect(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`[Email Preview] To: ${to}`);
      console.log(`[Email Preview] Subject: ${subject}`);
      console.log(`[Email Preview] Body: ${htmlBody.substring(0, 200)}...`);
      console.log(`[Email] SMTP not configured - email logged only`);
      return { success: true, messageId: 'preview-mode' };
    }

    const info = await sendMailWithRetry({
      from: SMTP_FROM,
      to,
      subject,
      html: htmlBody,
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome_email',
  EMAIL_VERIFICATION: 'email_verification',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  GOLD_PURCHASE: 'gold_purchase',
  TRANSFER_RECEIVED: 'transfer_received',
  INVITATION: 'invitation',
  MFA_ENABLED: 'mfa_enabled',
  BNSL_AGREEMENT_SIGNED: 'bnsl_agreement_signed',
  CERTIFICATE_DELIVERY: 'certificate_delivery',
  INVOICE_DELIVERY: 'invoice_delivery',
} as const;

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    slug: EMAIL_TEMPLATES.WELCOME,
    name: 'Welcome Email',
    type: 'email' as const,
    module: 'auth',
    subject: 'Welcome to Finatrades!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Finatrades</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Welcome to Finatrades! Your account has been successfully created.</p>
          <p>You can now access all our gold-backed financial services:</p>
          <ul>
            <li><strong>FinaPay</strong> - Digital gold wallet</li>
            <li><strong>FinaVault</strong> - Secure gold storage</li>
            <li><strong>BNSL</strong> - Buy Now Sell Later plans</li>
            <li><strong>FinaBridge</strong> - Trade finance solutions</li>
          </ul>
          <p>Get started by completing your KYC verification to unlock all features.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{dashboard_url}}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'dashboard_url', description: 'Link to user dashboard' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
    name: 'Email Verification',
    type: 'email' as const,
    module: 'auth',
    subject: 'Verify your Finatrades account',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Email Verification</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316;">{{verification_code}}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'verification_code', description: '6-digit verification code' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.KYC_APPROVED,
    name: 'KYC Approved',
    type: 'email' as const,
    module: 'kyc',
    subject: 'Your KYC verification is approved!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">KYC Approved!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Great news! Your KYC verification has been <strong style="color: #22c55e;">approved</strong>.</p>
          <p>You now have full access to all Finatrades services:</p>
          <ul>
            <li>Buy and sell gold</li>
            <li>Send and receive gold transfers</li>
            <li>Access FinaVault storage</li>
            <li>Create BNSL plans</li>
            <li>Apply for trade finance</li>
          </ul>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{dashboard_url}}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Start Trading</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'dashboard_url', description: 'Link to user dashboard' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.KYC_REJECTED,
    name: 'KYC Rejected',
    type: 'email' as const,
    module: 'kyc',
    subject: 'Your KYC verification requires attention',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">KYC Review Required</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Unfortunately, your KYC verification could not be approved at this time.</p>
          <p><strong>Reason:</strong> {{rejection_reason}}</p>
          <p>Please review and resubmit your documents to continue.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{kyc_url}}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Resubmit Documents</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'rejection_reason', description: 'Reason for rejection' },
      { name: 'kyc_url', description: 'Link to KYC page' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.GOLD_PURCHASE,
    name: 'Gold Purchase Confirmation',
    type: 'email' as const,
    module: 'finapay',
    subject: 'Gold Purchase Confirmed - {{gold_amount}}g',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Purchase Confirmed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold purchase has been confirmed!</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td>Gold Amount:</td><td style="text-align: right; font-weight: bold;">{{gold_amount}}g</td></tr>
              <tr><td>Price per gram:</td><td style="text-align: right;">$\{{price_per_gram}}</td></tr>
              <tr><td>Total Paid:</td><td style="text-align: right; font-weight: bold; color: #f97316;">$\{{total_amount}}</td></tr>
              <tr><td>Reference:</td><td style="text-align: right;">{{reference_id}}</td></tr>
            </table>
          </div>
          <p>The gold has been added to your FinaPay wallet.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'gold_amount', description: 'Amount of gold in grams' },
      { name: 'price_per_gram', description: 'Price per gram in USD' },
      { name: 'total_amount', description: 'Total amount paid' },
      { name: 'reference_id', description: 'Transaction reference' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRANSFER_RECEIVED,
    name: 'Transfer Received',
    type: 'email' as const,
    module: 'finapay',
    subject: 'You received {{amount}} from {{sender_name}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Money Received!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>You have received a transfer!</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; color: #22c55e; margin: 0;">{{amount}}</p>
            <p style="color: #6b7280; margin: 5px 0;">from {{sender_name}}</p>
          </div>
          <p>The funds have been added to your wallet.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{wallet_url}}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Wallet</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'Recipient\'s name' },
      { name: 'amount', description: 'Transfer amount' },
      { name: 'sender_name', description: 'Sender\'s name' },
      { name: 'wallet_url', description: 'Link to wallet' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.INVITATION,
    name: 'Platform Invitation',
    type: 'email' as const,
    module: 'auth',
    subject: '{{sender_name}} invited you to Finatrades',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">You're Invited!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello,</p>
          <p><strong>{{sender_name}}</strong> wants to send you <strong>{{amount}}</strong> via Finatrades!</p>
          <p>Finatrades is a gold-backed digital financial platform where you can:</p>
          <ul>
            <li>Buy and store physical gold digitally</li>
            <li>Send and receive money instantly</li>
            <li>Grow your wealth with BNSL plans</li>
          </ul>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{register_url}}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Join Finatrades</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'sender_name', description: 'Name of the person inviting' },
      { name: 'amount', description: 'Amount they want to send' },
      { name: 'register_url', description: 'Registration link' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.MFA_ENABLED,
    name: 'MFA Enabled',
    type: 'email' as const,
    module: 'security',
    subject: 'Two-Factor Authentication Enabled',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Security Update</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Two-factor authentication has been <strong style="color: #22c55e;">enabled</strong> on your account.</p>
          <p>Your account is now more secure. You'll need your authenticator app to log in.</p>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Keep your backup codes safe. You'll need them if you lose access to your authenticator app.</p>
          </div>
          <p>If you didn't make this change, please contact support immediately.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.BNSL_AGREEMENT_SIGNED,
    name: 'BNSL Agreement Signed',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'Your BNSL Agreement - Plan {{plan_id}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BNSL Agreement Confirmed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Dear {{user_name}},</p>
          <p>Thank you for enrolling in the BNSL (Buy Now Sell Later) Plan. Your signed agreement is attached to this email for your records.</p>
          
          <div style="background: #f8f4fc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8A2BE2;">
            <h3 style="margin: 0 0 15px 0; color: #6B21A8;">Plan Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Plan ID:</td><td style="text-align: right; font-weight: bold;">{{plan_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Sold:</td><td style="text-align: right; font-weight: bold;">{{gold_amount}}g</td></tr>
              <tr><td style="padding: 8px 0;">Tenure:</td><td style="text-align: right; font-weight: bold;">{{tenure_months}} months</td></tr>
              <tr><td style="padding: 8px 0;">Margin Rate:</td><td style="text-align: right; font-weight: bold;">{{margin_rate}}% p.a.</td></tr>
              <tr><td style="padding: 8px 0;">Base Price:</td><td style="text-align: right; font-weight: bold; color: #8A2BE2;">\${{base_price}}</td></tr>
              <tr><td style="padding: 8px 0;">Total Margin:</td><td style="text-align: right; font-weight: bold; color: #22c55e;">\${{total_margin}}</td></tr>
              <tr><td style="padding: 8px 0;">Quarterly Payout:</td><td style="text-align: right; font-weight: bold;">\${{quarterly_payout}}</td></tr>
            </table>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Please keep this email and the attached PDF for your records. This document confirms your irrevocable sale of gold to Wingold and Metals DMCC.</p>
          </div>

          <p><strong>Signed by:</strong> {{signature_name}}</p>
          <p><strong>Date:</strong> {{signed_date}}</p>

          <p style="margin-top: 20px;">Your quarterly margin payments will be credited to your FinaPay wallet according to the disbursement schedule outlined in your agreement.</p>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{dashboard_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Your Plan</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
          <p style="margin-top: 10px;">If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'plan_id', description: 'BNSL Plan ID' },
      { name: 'gold_amount', description: 'Amount of gold sold in grams' },
      { name: 'tenure_months', description: 'Plan tenure in months' },
      { name: 'margin_rate', description: 'Annual margin rate percentage' },
      { name: 'base_price', description: 'Base price component in USD' },
      { name: 'total_margin', description: 'Total margin component in USD' },
      { name: 'quarterly_payout', description: 'Quarterly payout amount in USD' },
      { name: 'signature_name', description: 'Name used for digital signature' },
      { name: 'signed_date', description: 'Date the agreement was signed' },
      { name: 'dashboard_url', description: 'Link to BNSL dashboard' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.CERTIFICATE_DELIVERY,
    name: 'Certificate Delivery',
    type: 'email' as const,
    module: 'finapay',
    subject: 'Your Gold Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Certificate of Ownership</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Dear {{user_name}},</p>
          <p>Congratulations on your gold purchase! Your {{certificate_type}} certificate has been generated and is attached to this email.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
            <h3 style="margin: 0 0 15px 0; color: #ea580c;">Certificate Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Certificate No:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Amount:</td><td style="text-align: right; font-weight: bold;">{{gold_amount}}g</td></tr>
              <tr><td style="padding: 8px 0;">Type:</td><td style="text-align: right; font-weight: bold;">{{certificate_type}}</td></tr>
              <tr><td style="padding: 8px 0;">Issued By:</td><td style="text-align: right;">{{issuer}}</td></tr>
              <tr><td style="padding: 8px 0;">Issue Date:</td><td style="text-align: right;">{{issue_date}}</td></tr>
            </table>
          </div>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Please save the attached PDF certificate for your records. This document certifies your ownership of the specified gold holdings.</p>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="{{dashboard_url}}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Your Holdings</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
          <p style="margin-top: 10px;">If you have any questions, please contact our support team.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'certificate_number', description: 'Certificate reference number' },
      { name: 'gold_amount', description: 'Amount of gold in grams' },
      { name: 'certificate_type', description: 'Digital Ownership or Physical Storage' },
      { name: 'issuer', description: 'Issuing entity name' },
      { name: 'issue_date', description: 'Date certificate was issued' },
      { name: 'dashboard_url', description: 'Link to user dashboard' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.INVOICE_DELIVERY,
    name: 'Invoice Delivery',
    type: 'email' as const,
    module: 'finapay',
    subject: 'Your Gold Purchase Invoice - {{invoice_number}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Purchase Invoice</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Dear {{user_name}},</p>
          <p>Thank you for your gold purchase! Your invoice is attached to this email for your records.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #404040;">Invoice Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Invoice No:</td><td style="text-align: right; font-weight: bold;">{{invoice_number}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Amount:</td><td style="text-align: right; font-weight: bold;">{{gold_amount}}g</td></tr>
              <tr><td style="padding: 8px 0;">Price per Gram:</td><td style="text-align: right;">\${{price_per_gram}}</td></tr>
              <tr><td style="padding: 8px 0; border-top: 1px solid #e5e7eb;"><strong>Total Amount:</strong></td><td style="text-align: right; font-weight: bold; color: #f97316; border-top: 1px solid #e5e7eb;">\${{total_amount}}</td></tr>
            </table>
          </div>

          <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;"><strong>Payment Status:</strong> {{payment_status}}</p>
          </div>

          <p>Please keep this invoice for your records. The attached PDF contains all the details of your transaction.</p>

          <p style="text-align: center; margin-top: 30px;">
            <a href="{{dashboard_url}}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Transaction History</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Wingold and Metals DMCC</p>
          <p style="margin-top: 10px;">For billing inquiries, please contact our support team.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'invoice_number', description: 'Invoice reference number' },
      { name: 'gold_amount', description: 'Amount of gold in grams' },
      { name: 'price_per_gram', description: 'Gold price per gram in USD' },
      { name: 'total_amount', description: 'Total invoice amount in USD' },
      { name: 'payment_status', description: 'Payment status (Paid/Pending)' },
      { name: 'dashboard_url', description: 'Link to user dashboard' },
    ],
    status: 'published' as const,
  },
];

export async function sendEmailWithAttachment(
  to: string,
  templateSlug: string,
  data: EmailData,
  attachment?: { filename: string; content: Buffer; contentType?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const template = await getEmailTemplate(templateSlug);
    
    if (!template) {
      console.error(`[Email] Template not found: ${templateSlug}`);
      return { success: false, error: `Template not found: ${templateSlug}` };
    }

    const subject = replaceVariables(template.subject, data);
    const htmlBody = replaceVariables(template.body, data);

    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`[Email Preview] To: ${to}`);
      console.log(`[Email Preview] Subject: ${subject}`);
      console.log(`[Email Preview] Body: ${htmlBody.substring(0, 200)}...`);
      if (attachment) {
        console.log(`[Email Preview] Attachment: ${attachment.filename} (${attachment.content.length} bytes)`);
      }
      console.log(`[Email] SMTP not configured - email logged only`);
      return { success: true, messageId: 'preview-mode' };
    }

    const mailOptions: any = {
      from: SMTP_FROM,
      to,
      subject,
      html: htmlBody,
    };

    if (attachment) {
      mailOptions.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType || 'application/pdf',
        },
      ];
    }

    const info = await sendMailWithRetry(mailOptions);

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function seedEmailTemplates(): Promise<void> {
  console.log('[Email] Seeding default email templates...');
  
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    const existing = await db.select().from(templates).where(eq(templates.slug, template.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(templates).values(template);
      console.log(`[Email] Created template: ${template.slug}`);
    }
  }
  
  console.log('[Email] Email templates seeded');
}
