import nodemailer from 'nodemailer';
import { db } from './db';
import { templates, emailLogs, emailNotificationSettings, brandingSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { lookup } from 'dns/promises';
import net from 'net';
import crypto from 'crypto';

const UNSUBSCRIBE_HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Email] WARNING: UNSUBSCRIBE_HMAC_SECRET is not set in production. Using fallback — set this env var for secure token signing.');
  }
  return 'finatrades-unsubscribe-secret-dev-only';
})();

export function generateUnsubscribeToken(email: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${email}:${ts}`;
  const sig = crypto.createHmac('sha256', UNSUBSCRIBE_HMAC_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): { email: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return { email: '', valid: false };
    const [email, ts, sig] = parts;
    const payload = `${email}:${ts}`;
    const expectedSig = crypto.createHmac('sha256', UNSUBSCRIBE_HMAC_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return { email: '', valid: false };
    const tokenAge = Math.floor(Date.now() / 1000) - parseInt(ts, 10);
    if (tokenAge > 60 * 60 * 24 * 90) return { email: '', valid: false }; // 90-day expiry
    return { email, valid: true };
  } catch {
    return { email: '', valid: false };
  }
}

// Cache branding settings to avoid repeated DB calls
let brandingCache: { logoUrl?: string; companyName?: string; primaryColor?: string } | null = null;
let brandingCacheTime = 0;
const BRANDING_CACHE_TTL = 60000; // 1 minute

async function getBrandingForEmail(): Promise<{ logoUrl: string; companyName: string; primaryColor: string }> {
  const now = Date.now();
  
  // Helper to convert relative URLs to full URLs for email clients
  const getFullLogoUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Use APP_URL or REPLIT_DOMAINS for full URL
    const baseUrl = process.env.APP_URL || 
                    (process.env.REPL_SLUG && process.env.REPL_OWNER 
                      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER.toLowerCase()}.repl.co`
                      : process.env.REPLIT_DOMAINS?.split(',')[0] 
                        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
                        : '');
    return baseUrl ? `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}` : '';
  };
  
  if (brandingCache && (now - brandingCacheTime) < BRANDING_CACHE_TTL) {
    return {
      logoUrl: getFullLogoUrl(brandingCache.logoUrl || ''),
      companyName: brandingCache.companyName || 'Finatrades',
      primaryColor: brandingCache.primaryColor || '#8A2BE2'
    };
  }
  
  try {
    const [settings] = await db.select().from(brandingSettings).where(eq(brandingSettings.isActive, true)).limit(1);
    brandingCache = {
      logoUrl: settings?.logoUrl || '',
      companyName: settings?.companyName || 'Finatrades',
      primaryColor: settings?.primaryColor || '#8A2BE2'
    };
    brandingCacheTime = now;
  } catch (error) {
    console.error('[Email] Failed to get branding:', error);
    brandingCache = { logoUrl: '', companyName: 'Finatrades', primaryColor: '#8A2BE2' };
  }
  
  return {
    logoUrl: getFullLogoUrl(brandingCache.logoUrl || ''),
    companyName: brandingCache.companyName || 'Finatrades',
    primaryColor: brandingCache.primaryColor || '#8A2BE2'
  };
}

// Email logging helper
async function logEmail(params: {
  userId?: string;
  recipientEmail: string;
  recipientName?: string;
  notificationType: string;
  templateSlug?: string;
  subject: string;
  status: 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Bounced';
  messageId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  sentAt?: Date;
}) {
  try {
    const [log] = await db.insert(emailLogs).values({
      userId: params.userId || null,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName || null,
      notificationType: params.notificationType,
      templateSlug: params.templateSlug || null,
      subject: params.subject,
      status: params.status,
      messageId: params.messageId || null,
      errorMessage: params.errorMessage || null,
      metadata: params.metadata || null,
      sentAt: params.sentAt || null,
    }).returning();
    return log;
  } catch (error) {
    console.error('[Email] Failed to log email:', error);
    return null;
  }
}

// Check if notification type is enabled
async function isNotificationEnabled(notificationType: string): Promise<boolean> {
  try {
    // First check global email notifications setting
    const { getSystemSettings } = await import("./index");
    const systemSettings = await getSystemSettings();
    if (!systemSettings.emailNotificationsEnabled) {
      return false; // Global toggle is off
    }
    
    // Then check per-notification-type setting
    const [setting] = await db.select()
      .from(emailNotificationSettings)
      .where(eq(emailNotificationSettings.notificationType, notificationType));
    return setting?.isEnabled ?? true; // Default to enabled if setting not found
  } catch (error) {
    console.error('[Email] Failed to check notification setting:', error);
    return true; // Default to enabled on error
  }
}

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_KEY;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@finatrades.com';

console.log(`[Email] Configured with host: ${SMTP_HOST}, port: ${SMTP_PORT}, user: ${SMTP_USER ? 'set' : 'not set'}`);

// Resolve SMTP host IP manually using Google DNS to avoid local DNS issues
let resolvedSmtpHost: string | null = null;

async function resolveSmtpHost(): Promise<string> {
  if (resolvedSmtpHost) {
    return resolvedSmtpHost;
  }
  
  try {
    // Try to resolve the SMTP host to an IP address
    const result = await lookup(SMTP_HOST, { family: 4 });
    resolvedSmtpHost = result.address;
    console.log(`[Email] Resolved ${SMTP_HOST} to ${resolvedSmtpHost}`);
    return resolvedSmtpHost;
  } catch (error) {
    console.log(`[Email] Could not resolve ${SMTP_HOST}, using direct connection`);
    // Fallback to known Brevo IP addresses
    const brevoIps = ['185.107.232.1', '185.107.232.2', '185.107.232.3'];
    for (const ip of brevoIps) {
      try {
        // Test if we can connect to this IP
        await new Promise<void>((resolve, reject) => {
          const socket = net.createConnection({ host: ip, port: SMTP_PORT, timeout: 5000 });
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', reject);
          socket.on('timeout', () => reject(new Error('Connection timeout')));
        });
        console.log(`[Email] Using fallback IP: ${ip}`);
        resolvedSmtpHost = ip;
        return resolvedSmtpHost;
      } catch {
        continue;
      }
    }
    // If all fallbacks fail, try using the hostname directly
    console.log(`[Email] All fallbacks failed, using hostname directly: ${SMTP_HOST}`);
    return SMTP_HOST;
  }
}

// Create a fresh transporter for each send to avoid connection pooling issues
async function createTransporter() {
  const host = await resolveSmtpHost();
  
  const transportOptions: nodemailer.TransportOptions = {
    host: host,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? {
      user: SMTP_USER,
      pass: SMTP_PASS,
    } : undefined,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      servername: SMTP_HOST,
      rejectUnauthorized: false,
    },
  } as any;
  
  return nodemailer.createTransport(transportOptions);
}

async function sendMailWithRetry(mailOptions: nodemailer.SendMailOptions, maxRetries = 3): Promise<nodemailer.SentMessageInfo> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Email] Attempt ${attempt}/${maxRetries} to send email to ${mailOptions.to}`);
      const transporter = await createTransporter();
      const result = await transporter.sendMail(mailOptions);
      transporter.close();
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`[Email] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      // Reset resolved host on DNS-related errors to force re-resolution
      if (lastError.message.includes('getaddrinfo') || lastError.message.includes('EAI_AGAIN')) {
        resolvedSmtpHost = null;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[Email] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export interface EmailData {
  [key: string]: string | number | undefined;
}

function replaceVariables(template: string, data: EmailData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key]?.toString() || match;
  });
}

function buildUnsubscribeUrl(recipientEmail?: string): string {
  const baseUrl = process.env.APP_URL ||
    (process.env.REPLIT_DOMAINS?.split(',')[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://finatrades.com');
  const token = recipientEmail ? generateUnsubscribeToken(recipientEmail) : '';
  return `${baseUrl}/api/unsubscribe?token=${token}`;
}

// Creative purple email template wrapper with logo header and footer
function wrapEmailWithBranding(body: string, branding: { logoUrl: string; companyName: string; primaryColor: string }, recipientEmail?: string): string {
  const primaryColor = '#8A2BE2'; // Official Finatrades purple
  const secondaryColor = '#A78BFA'; // Light purple
  const darkPurple = '#4B0082'; // Dark purple for accents
  
  // Logo section: use actual FinaTrades logo image when logoUrl is available, fall back to styled text
  const logoSection = branding.logoUrl ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr>
        <td align="center">
          <img src="${branding.logoUrl}" alt="FinaTrades" width="160" style="display: block; max-width: 160px; height: auto; border: 0;" />
        </td>
      </tr>
    </table>
    <div style="font-size: 12px; color: #F59E0B; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; font-weight: 600;">Gold-Backed Digital Finance</div>` : `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr>
        <td style="padding-right: 12px; vertical-align: middle;">
          <div style="width: 44px; height: 44px; background-color: #8A2BE2; border-radius: 10px; text-align: center; line-height: 44px;">
            <span style="color: #ffffff; font-size: 26px; font-weight: bold; font-family: Arial, sans-serif;">F</span>
          </div>
        </td>
        <td style="vertical-align: middle;">
          <div style="font-size: 26px; font-weight: 800; color: #A78BFA; letter-spacing: 2px; font-family: 'Segoe UI', Arial, sans-serif;">FINATRADES</div>
        </td>
      </tr>
    </table>
    <div style="font-size: 12px; color: #F59E0B; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; font-weight: 600;">Gold-Backed Digital Finance</div>`;

  // Check if body already has the full wrapper structure - extract inner content
  let innerContent = body;
  if (body.includes('max-width: 600px') && body.includes('font-family:')) {
    // Extract content between the main wrapper divs
    const contentMatch = body.match(/<div style="padding:\s*30px[^>]*>([\s\S]*?)<\/div>\s*<div style="padding:\s*20px/);
    if (contentMatch) {
      innerContent = contentMatch[1];
    } else {
      // Try to get content after header div
      const headerEndMatch = body.match(/<\/div>\s*<div style="padding:\s*30px[^>]*>([\s\S]*)/);
      if (headerEndMatch) {
        innerContent = headerEndMatch[1].replace(/<div style="padding:\s*20px[^>]*>[\s\S]*$/, '');
      }
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finatrades</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15);">
          
          <!-- Creative Purple Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D001E 0%, #2A0055 50%, #4B0082 100%); padding: 0;">
              <!-- Gold accent line at top -->
              <div style="height: 4px; background: linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B);"></div>
              
              <!-- Header content -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 35px 30px 30px;">
                    <!-- Logo/Brand -->
                    ${logoSection}
                    
                    <!-- Decorative gold bar -->
                    <div style="width: 80px; height: 3px; background: linear-gradient(90deg, transparent, #F59E0B, transparent); margin: 20px auto 0;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Email Content -->
          <tr>
            <td style="padding: 40px 35px; background-color: #ffffff;">
              ${innerContent}
            </td>
          </tr>
          
          <!-- Creative Purple Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <!-- Purple accent line -->
                <tr>
                  <td>
                    <div style="height: 3px; background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${primaryColor});"></div>
                  </td>
                </tr>
                
                <!-- Footer content -->
                <tr>
                  <td align="center" style="padding: 30px 30px 25px;">
                    <!-- Services icons row -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                      <tr>
                        <td align="center" style="padding: 0 12px;">
                          <div style="width: 40px; height: 40px; background: rgba(139, 92, 246, 0.2); border-radius: 10px; display: inline-block; line-height: 40px; text-align: center;">
                            <span style="color: ${secondaryColor}; font-size: 18px;">💳</span>
                          </div>
                          <div style="color: rgba(255,255,255,0.7); font-size: 10px; margin-top: 5px;">FinaPay</div>
                        </td>
                        <td align="center" style="padding: 0 12px;">
                          <div style="width: 40px; height: 40px; background: rgba(139, 92, 246, 0.2); border-radius: 10px; display: inline-block; line-height: 40px; text-align: center;">
                            <span style="color: ${secondaryColor}; font-size: 18px;">🔐</span>
                          </div>
                          <div style="color: rgba(255,255,255,0.7); font-size: 10px; margin-top: 5px;">FinaVault</div>
                        </td>
                        <td align="center" style="padding: 0 12px;">
                          <div style="width: 40px; height: 40px; background: rgba(139, 92, 246, 0.2); border-radius: 10px; display: inline-block; line-height: 40px; text-align: center;">
                            <span style="color: ${secondaryColor}; font-size: 18px;">📈</span>
                          </div>
                          <div style="color: rgba(255,255,255,0.7); font-size: 10px; margin-top: 5px;">BNSL</div>
                        </td>
                        <td align="center" style="padding: 0 12px;">
                          <div style="width: 40px; height: 40px; background: rgba(139, 92, 246, 0.2); border-radius: 10px; display: inline-block; line-height: 40px; text-align: center;">
                            <span style="color: ${secondaryColor}; font-size: 18px;">🌉</span>
                          </div>
                          <div style="color: rgba(255,255,255,0.7); font-size: 10px; margin-top: 5px;">FinaBridge</div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Divider -->
                    <div style="width: 100%; height: 1px; background: rgba(139, 92, 246, 0.3); margin: 15px 0;"></div>
                    
                    <!-- Company info -->
                    <p style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; margin: 15px 0 5px; letter-spacing: 1px;">
                      FINATRADES
                    </p>
                    <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0 0 15px; letter-spacing: 0.5px;">
                      Gold-Backed Digital Finance Platform
                    </p>
                    
                    <!-- Address -->
                    <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 10px 0 5px;">
                      Finatrades Finance SA &mdash; Rue Robert-Céard 6, 1204 Geneva, Switzerland
                    </p>
                    
                    <!-- Contact & Links -->
                    <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 10px 0 5px;">
                      Need help? Contact us at <a href="mailto:support@finatrades.com" style="color: ${secondaryColor}; text-decoration: none;">support@finatrades.com</a>
                    </p>
                    
                    <!-- Unsubscribe -->
                    <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 10px 0 5px;">
                      You are receiving this email because you have an account on the FinaTrades platform.<br/>
                      <a href="${buildUnsubscribeUrl(recipientEmail)}" style="color: rgba(167,139,250,0.7); text-decoration: underline;">Unsubscribe</a> from marketing emails
                    </p>
                    
                    <!-- Legal -->
                    <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 10px 0 0; line-height: 1.5;">
                      This email was sent by FinaTrades. Please do not reply directly to this email.<br/>
                      &copy; ${new Date().getFullYear()} Finatrades Finance SA. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  data: EmailData,
  options?: { userId?: string; recipientName?: string; metadata?: Record<string, any> }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check if this notification type is enabled (admin-level)
  const isEnabled = await isNotificationEnabled(templateSlug);
  if (!isEnabled) {
    console.log(`[Email] Notification type ${templateSlug} is disabled, skipping email to ${to}`);
    return { success: true, messageId: 'notification-disabled' };
  }
  
  // Check user preferences if userId is provided
  if (options?.userId) {
    try {
      const { storage } = await import("./storage");
      const userPrefs = await storage.getUserPreferences(options.userId);
      
      if (userPrefs) {
        // Check global email notifications toggle
        if (!userPrefs.emailNotifications) {
          console.log(`[Email] User ${options.userId} has email notifications disabled, skipping`);
          return { success: true, messageId: 'user-disabled-emails' };
        }
        
        // Check specific notification type preferences - using exact template slug matching
        const transactionSlugs = [
          'gold_purchase', 'gold_sale', 'card_payment_receipt', 'deposit_received', 
          'deposit_processing', 'withdrawal_requested', 'withdrawal_processing', 
          'withdrawal_completed', 'transaction_failed', 'low_balance_alert',
          'transfer_sent', 'transfer_received', 'transfer_pending', 'transfer_completed',
          'transfer_cancelled', 'bnsl_payment_received', 'bnsl_payment_reminder',
          'bnsl_plan_completed', 'bnsl_early_exit'
        ];
        const securitySlugs = [
          'password_reset', 'password_changed', 'new_device_login', 'account_locked',
          'suspicious_activity', 'mfa_enabled', 'email_verification'
        ];
        const marketingSlugs = ['newsletter', 'promotion', 'marketing', 'announcement', 'invitation'];
        
        const isTransactionEmail = transactionSlugs.includes(templateSlug);
        const isSecurityEmail = securitySlugs.includes(templateSlug);
        const isMarketingEmail = marketingSlugs.includes(templateSlug);
        
        if (isTransactionEmail && !userPrefs.transactionAlerts) {
          console.log(`[Email] User ${options.userId} has transaction alerts disabled, skipping`);
          return { success: true, messageId: 'user-disabled-transaction-alerts' };
        }
        
        if (isSecurityEmail && !userPrefs.securityAlerts) {
          console.log(`[Email] User ${options.userId} has security alerts disabled, skipping`);
          return { success: true, messageId: 'user-disabled-security-alerts' };
        }
        
        if (isMarketingEmail && !userPrefs.marketingEmails) {
          console.log(`[Email] User ${options.userId} has marketing emails disabled, skipping`);
          return { success: true, messageId: 'user-disabled-marketing' };
        }
      }
    } catch (error) {
      console.error('[Email] Error checking user preferences:', error);
      // Continue sending if preference check fails
    }
  }

  try {
    // Get branding for email
    const branding = await getBrandingForEmail();
    
    // Inject branding variables into data
    const enrichedData: EmailData = {
      ...data,
      company_name: branding.companyName,
      company_logo: branding.logoUrl,
      primary_color: branding.primaryColor,
    };
    
    const template = await getEmailTemplate(templateSlug);
    
    if (!template) {
      console.error(`[Email] Template not found: ${templateSlug}`);
      await logEmail({
        userId: options?.userId,
        recipientEmail: to,
        recipientName: options?.recipientName,
        notificationType: templateSlug,
        templateSlug,
        subject: `Template: ${templateSlug}`,
        status: 'Failed',
        errorMessage: `Template not found: ${templateSlug}`,
        metadata: options?.metadata,
      });
      return { success: false, error: `Template not found: ${templateSlug}` };
    }

    const subject = replaceVariables(template.subject, enrichedData);
    let htmlBody = replaceVariables(template.body, enrichedData);
    
    // Add logo and branding to email
    htmlBody = wrapEmailWithBranding(htmlBody, branding, to);

    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`[Email Preview] To: ${to}`);
      console.log(`[Email Preview] Subject: ${subject}`);
      console.log(`[Email Preview] Body: ${htmlBody.substring(0, 200)}...`);
      console.log(`[Email] SMTP not configured - email logged only`);
      await logEmail({
        userId: options?.userId,
        recipientEmail: to,
        recipientName: options?.recipientName,
        notificationType: templateSlug,
        templateSlug,
        subject,
        status: 'Sent',
        messageId: 'preview-mode',
        sentAt: new Date(),
        metadata: { ...options?.metadata, previewMode: true },
      });
      return { success: true, messageId: 'preview-mode' };
    }

    const info = await sendMailWithRetry({
      from: SMTP_FROM,
      to,
      subject,
      html: htmlBody,
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    await logEmail({
      userId: options?.userId,
      recipientEmail: to,
      recipientName: options?.recipientName,
      notificationType: templateSlug,
      templateSlug,
      subject,
      status: 'Sent',
      messageId: info.messageId,
      sentAt: new Date(),
      metadata: options?.metadata,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logEmail({
      userId: options?.userId,
      recipientEmail: to,
      recipientName: options?.recipientName,
      notificationType: templateSlug,
      templateSlug,
      subject: templateSlug,
      status: 'Failed',
      errorMessage,
      metadata: options?.metadata,
    });
    return { success: false, error: errorMessage };
  }
}

export async function sendEmailDirect(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const branding = await getBrandingForEmail();
    const wrappedHtml = wrapEmailWithBranding(htmlBody, branding, to);

    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`[Email Preview] To: ${to}`);
      console.log(`[Email Preview] Subject: ${subject}`);
      console.log(`[Email Preview] Body: ${wrappedHtml.substring(0, 200)}...`);
      console.log(`[Email] SMTP not configured - email logged only`);
      return { success: true, messageId: 'preview-mode' };
    }

    const info = await sendMailWithRetry({
      from: SMTP_FROM,
      to,
      subject,
      html: wrappedHtml,
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Queue-based async email sending that doesn't block registration
const emailQueue: Array<{ to: string; subject: string; html: string }> = [];
let isProcessingQueue = false;

async function processEmailQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (emailQueue.length > 0) {
    const email = emailQueue.shift();
    if (!email) continue;
    
    try {
      await sendMailWithRetry({
        from: SMTP_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
      });
      console.log(`[Email Queue] Successfully sent to ${email.to}`);
    } catch (error) {
      console.error(`[Email Queue] Failed to send to ${email.to}:`, error);
    }
    
    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isProcessingQueue = false;
}

export function queueEmail(to: string, subject: string, html: string) {
  emailQueue.push({ to, subject, html });
  // Process queue in background without blocking
  setImmediate(() => processEmailQueue().catch(console.error));
}

export async function queueEmailWithTemplate(
  to: string, 
  templateSlug: string, 
  data: EmailData,
  options?: { notificationType?: string; userId?: string; metadata?: Record<string, any> }
): Promise<void> {
  const template = await getEmailTemplate(templateSlug);
  if (!template) {
    console.error(`[Email Queue] Template not found: ${templateSlug}`);
    return;
  }
  
  const subject = replaceVariables(template.subject, data);
  const htmlBody = replaceVariables(template.body, data);

  const branding = await getBrandingForEmail();
  const wrappedHtml = wrapEmailWithBranding(htmlBody, branding, to);

  // Log to email_logs table if notificationType is provided (for duplicate prevention)
  if (options?.notificationType) {
    try {
      const { emailLogs } = await import('@shared/schema');
      const { db } = await import('./db');
      await db.insert(emailLogs).values({
        recipientEmail: to,
        userId: options.userId || null,
        notificationType: options.notificationType,
        templateSlug: templateSlug,
        subject: subject,
        status: 'Queued',
        metadata: options.metadata || null,
      });
    } catch (error) {
      console.error('[Email Queue] Failed to log email:', error);
    }
  }
  
  queueEmail(to, subject, wrappedHtml);
}

export const EMAIL_TEMPLATES = {
  // Authentication & Security
  WELCOME: 'welcome_email',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  NEW_DEVICE_LOGIN: 'new_device_login',
  ACCOUNT_LOCKED: 'account_locked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  MFA_ENABLED: 'mfa_enabled',
  FINATRADES_ID_LOGIN_OTP: 'finatrades_id_login_otp',
  
  // KYC
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  KYC_CHANGES_REQUESTED: 'kyc_changes_requested',
  KYC_PENDING_REVIEW: 'kyc_pending_review',
  DOCUMENT_EXPIRY_REMINDER: 'document_expiry_reminder',
  
  // Transactions
  GOLD_PURCHASE: 'gold_purchase',
  GOLD_SALE: 'gold_sale',
  CARD_PAYMENT_RECEIPT: 'card_payment_receipt',
  DEPOSIT_RECEIVED: 'deposit_received',
  DEPOSIT_PROCESSING: 'deposit_processing',
  WITHDRAWAL_REQUESTED: 'withdrawal_requested',
  WITHDRAWAL_PROCESSING: 'withdrawal_processing',
  WITHDRAWAL_COMPLETED: 'withdrawal_completed',
  TRANSACTION_FAILED: 'transaction_failed',
  LOW_BALANCE_ALERT: 'low_balance_alert',
  
  // P2P Transfers
  TRANSFER_SENT: 'transfer_sent',
  TRANSFER_RECEIVED: 'transfer_received',
  TRANSFER_PENDING: 'transfer_pending',
  TRANSFER_COMPLETED: 'transfer_completed',
  TRANSFER_CANCELLED: 'transfer_cancelled',
  INVITATION: 'invitation',
  
  // BNSL
  BNSL_AGREEMENT_SIGNED: 'bnsl_agreement_signed',
  BNSL_PAYMENT_REMINDER: 'bnsl_payment_reminder',
  BNSL_PAYMENT_RECEIVED: 'bnsl_payment_received',
  BNSL_PAYMENT_OVERDUE: 'bnsl_payment_overdue',
  BNSL_PLAN_COMPLETED: 'bnsl_plan_completed',
  BNSL_EARLY_EXIT: 'bnsl_early_exit',
  
  // FinaBridge Trade Finance
  TRADE_CASE_CREATED: 'trade_case_created',
  TRADE_CASE_STATUS_UPDATE: 'trade_case_status_update',
  TRADE_DOCUMENT_REQUEST: 'trade_document_request',
  TRADE_DOCUMENT_UPLOADED: 'trade_document_uploaded',
  TRADE_CASE_APPROVED: 'trade_case_approved',
  TRADE_CASE_REJECTED: 'trade_case_rejected',
  TRADE_CASE_COMPLETED: 'trade_case_completed',
  
  // FinaBridge Trade Proposals & Settlements
  FINABRIDGE_NEW_PROPOSAL: 'finabridge_new_proposal',
  FINABRIDGE_PROPOSAL_ACCEPTED: 'finabridge_proposal_accepted',
  FINABRIDGE_PROPOSAL_DECLINED: 'finabridge_proposal_declined',
  FINABRIDGE_SHIPMENT_UPDATE: 'finabridge_shipment_update',
  FINABRIDGE_SETTLEMENT_LOCKED: 'finabridge_settlement_locked',
  FINABRIDGE_SETTLEMENT_RELEASED: 'finabridge_settlement_released',
  FINABRIDGE_DEAL_ROOM_CREATED: 'finabridge_deal_room_created',
  
  // Documents & Certificates
  CERTIFICATE_DELIVERY: 'certificate_delivery',
  INVOICE_DELIVERY: 'invoice_delivery',
  MONTHLY_STATEMENT: 'monthly_statement',
  ANNUAL_TAX_STATEMENT: 'annual_tax_statement',
} as const;

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    slug: EMAIL_TEMPLATES.WELCOME,
    name: 'Welcome Email',
    type: 'email' as const,
    module: 'auth',
    subject: 'Welcome to FinaTrades — Your Gold Account is Ready',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Welcome to <strong>FinaTrades</strong> — the gold-backed digital finance platform built for serious investors. Your account is live and ready to go.</p>

      <div style="background: linear-gradient(135deg, #f8f4fc, #ede9fe); border-left: 4px solid #8A2BE2; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #4B0082; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">What you can do on FinaTrades</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #374151;"><strong style="color: #8A2BE2;">FinaPay</strong> &mdash; Buy, sell, and send digital gold</td></tr>
          <tr><td style="padding: 6px 0; color: #374151;"><strong style="color: #8A2BE2;">FinaVault</strong> &mdash; Secure allocated physical gold storage</td></tr>
          <tr><td style="padding: 6px 0; color: #374151;"><strong style="color: #8A2BE2;">BNSL</strong> &mdash; Buy Now Sell Later structured gold plans</td></tr>
          <tr><td style="padding: 6px 0; color: #374151;"><strong style="color: #8A2BE2;">FinaBridge</strong> &mdash; Gold-backed trade finance</td></tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">To unlock full access, complete your KYC verification — it takes fewer than 5 minutes and our compliance team reviews submissions within 1–2 business days.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; letter-spacing: 0.5px;">Go to My Dashboard</a>
      </p>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">Welcome aboard,<br/><strong style="color: #374151;">The FinaTrades Team</strong></p>
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
    subject: 'Your FinaTrades Verification Code',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Use the code below to verify your email address. This code is valid for <strong>10 minutes</strong>.</p>

      <div style="background: linear-gradient(135deg, #f8f4fc, #ede9fe); border: 2px solid #8A2BE2; border-radius: 12px; padding: 30px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">Your Verification Code</p>
        <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #8A2BE2; font-family: 'Courier New', monospace;">{{verification_code}}</span>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">For your security, never share this code with anyone — FinaTrades will never ask for it. If you did not request this, you can safely ignore this email.</p>
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
    subject: 'KYC Approved — Full Access Unlocked',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your identity verification is complete. Your account now has <strong>full access</strong> to all FinaTrades services.</p>

      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #166534; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">You can now</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #374151;">&#10003; &nbsp; Buy and sell 24K fine gold at live market prices</td></tr>
          <tr><td style="padding: 5px 0; color: #374151;">&#10003; &nbsp; Send and receive instant gold transfers</td></tr>
          <tr><td style="padding: 5px 0; color: #374151;">&#10003; &nbsp; Store physical gold in FinaVault secure custody</td></tr>
          <tr><td style="padding: 5px 0; color: #374151;">&#10003; &nbsp; Enroll in BNSL structured gold plans</td></tr>
          <tr><td style="padding: 5px 0; color: #374151;">&#10003; &nbsp; Access FinaBridge trade finance</td></tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Start Trading Gold</a>
      </p>
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
    subject: 'Action Required: Your KYC Verification Could Not Be Approved',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">After reviewing your submission, our compliance team was unable to approve your KYC verification at this time. You can resubmit with the required corrections.</p>

      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #991b1b; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reason for Rejection</p>
        <p style="color: #374151; margin: 0; line-height: 1.6;">{{rejection_reason}}</p>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">Please review the feedback above, prepare the required documentation, and resubmit. Our team will process your updated submission promptly.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{kyc_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Resubmit Documents</a>
      </p>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">If you believe this decision was made in error, please contact our support team at <a href="mailto:support@finatrades.com" style="color: #8A2BE2;">support@finatrades.com</a>.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'rejection_reason', description: 'Reason for rejection' },
      { name: 'kyc_url', description: 'Link to KYC page' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.KYC_CHANGES_REQUESTED,
    name: 'KYC Changes Requested',
    type: 'email' as const,
    module: 'kyc',
    subject: 'Action Required: Updates Needed for Your Verification',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Our compliance team has reviewed your verification submission and requires a few updates before your account can be fully approved. Sections already verified will remain locked — only the items below need attention.</p>

      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Required Updates</p>
        {{section_reasons}}
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">Log in to complete the updates — the process should only take a few minutes.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{kyc_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Update Your Submission</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User full name' },
      { name: 'section_reasons', description: 'HTML list of section-level rejection reasons' },
      { name: 'kyc_url', description: 'Deep link to KYC resubmission page' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.KYC_PENDING_REVIEW,
    name: 'KYC Submission Confirmation',
    type: 'email' as const,
    module: 'kyc',
    subject: 'KYC Submitted — Under Review',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your <strong>{{kyc_type}}</strong> verification documents have been received. Our compliance team is reviewing your submission.</p>

      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #166534; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">What happens next</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #374151;">1. &nbsp; Our compliance team reviews your documents</td></tr>
          <tr><td style="padding: 6px 0; color: #374151;">2. &nbsp; Expected review time: <strong>{{processing_time}}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #374151;">3. &nbsp; You will receive an email with the decision</td></tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">No further action is required from you at this stage. We appreciate your patience.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View Dashboard</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User full name' },
      { name: 'kyc_type', description: 'Type of KYC (Personal or Corporate)' },
      { name: 'processing_time', description: 'Expected processing time' },
      { name: 'dashboard_url', description: 'Link to user dashboard' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.GOLD_PURCHASE,
    name: 'Gold Purchase Confirmation',
    type: 'email' as const,
    module: 'finapay',
    subject: 'Purchase Confirmed — {{gold_amount}}g Gold',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your gold purchase has been confirmed and the gold has been credited to your FinaVault.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #F59E0B; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Purchase Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 10px 0; color: #6b7280;">Gold Purchased</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #1a1a1a; font-size: 16px;">{{gold_amount}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 10px 0; color: #6b7280;">Price per Gram</td>
            <td style="padding: 10px 0; text-align: right; color: #374151;">${'$'}{{price_per_gram}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 10px 0; color: #6b7280;">Total Paid</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{total_amount}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280;">Reference</td>
            <td style="padding: 10px 0; text-align: right; color: #6b7280; font-size: 12px; font-family: monospace;">{{reference_id}}</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0;">Your gold is held in secure allocated custody. View your full portfolio in your FinaVault dashboard.</p>
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
    subject: 'You Received {{amount}} from {{sender_name}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;"><strong>{{sender_name}}</strong> has sent you a gold transfer. It has been credited to your wallet.</p>

      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #22c55e; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Amount Received</p>
        <p style="font-size: 36px; font-weight: 800; color: #166534; margin: 0 0 8px 0;">{{amount}}</p>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">from {{sender_name}}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{wallet_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View Wallet</a>
      </p>
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
    subject: '{{sender_name}} Has Sent You {{amount}} in Gold — Claim in 24 Hours',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">You have received a gold transfer.</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;"><strong>{{sender_name}}</strong> has sent you <strong>{{amount}}</strong> of physical gold through FinaTrades. Create your free account to claim it — the reservation expires in <strong>24 hours</strong>.</p>

      <div style="background: linear-gradient(135deg, #f8f4fc, #ede9fe); border: 2px solid #8A2BE2; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Gold Reserved for You</p>
        <p style="font-size: 40px; font-weight: 800; color: #8A2BE2; margin: 0 0 8px 0;">{{amount}}</p>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">from {{sender_name}}</p>
      </div>

      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px;"><strong>Claim before expiry:</strong> This reservation is held for 24 hours. After that, the gold will be returned to the sender.</p>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">FinaTrades is a regulated gold-backed digital finance platform trusted by investors across the globe. Registration takes under 3 minutes.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{register_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 16px 44px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px;">Claim Your Gold</a>
      </p>

      <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">After registering, your gold will be automatically credited to your wallet.</p>
    `,
    variables: [
      { name: 'sender_name', description: 'Name of the person inviting' },
      { name: 'amount', description: 'Amount of gold being sent' },
      { name: 'register_url', description: 'Registration link with referral code' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.MFA_ENABLED,
    name: 'MFA Enabled',
    type: 'email' as const,
    module: 'security',
    subject: 'Security Update — Two-Factor Authentication Enabled',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Two-factor authentication has been successfully <strong style="color: #22c55e;">enabled</strong> on your FinaTrades account. Your account is now significantly more secure.</p>

      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Important Security Reminder</p>
        <p style="color: #374151; margin: 0; font-size: 14px; line-height: 1.6;">Store your backup recovery codes in a safe, offline location. You will need them if you ever lose access to your authenticator app.</p>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">From now on, every login will require a code from your authenticator app. This protects your account even if your password is ever compromised.</p>

      <p style="color: #ef4444; font-size: 13px; margin: 0;">If you did not enable this feature, please contact our security team immediately at <a href="mailto:security@finatrades.com" style="color: #ef4444;">security@finatrades.com</a>.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.FINATRADES_ID_LOGIN_OTP,
    name: 'Finatrades ID Login OTP',
    type: 'email' as const,
    module: 'auth',
    subject: 'Your FinaTrades Login Code',
    body: `
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">You requested to sign in to your FinaTrades account. Use the one-time code below to complete your login. This code expires in <strong>5 minutes</strong>.</p>

      <div style="background: linear-gradient(135deg, #f8f4fc, #ede9fe); border: 2px solid #8A2BE2; border-radius: 12px; padding: 30px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">One-Time Login Code</p>
        <span style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #8A2BE2; font-family: 'Courier New', monospace;">{{otp_code}}</span>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">For your security, never share this code with anyone — FinaTrades will never ask for it. If you did not attempt to sign in, you can safely ignore this email and your account remains secure.</p>
    `,
    variables: [
      { name: 'otp_code', description: 'One-time login code' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.BNSL_AGREEMENT_SIGNED,
    name: 'BNSL Agreement Signed',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'BNSL Agreement Confirmed — Plan {{plan_id}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Dear {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your Buy Now Sell Later (BNSL) agreement has been signed and confirmed. Your signed agreement PDF is attached to this email — please retain it for your records.</p>

      <div style="background: linear-gradient(135deg, #f8f4fc, #ede9fe); border-left: 4px solid #8A2BE2; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #4B0082; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Plan Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd8fe;">
            <td style="padding: 9px 0; color: #6b7280;">Plan ID</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #374151;">{{plan_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd8fe;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Sold</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #374151;">{{gold_amount}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd8fe;">
            <td style="padding: 9px 0; color: #6b7280;">Tenure</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{tenure_months}} months</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd8fe;">
            <td style="padding: 9px 0; color: #6b7280;">Annual Margin Rate</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{margin_rate}}% p.a.</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd8fe;">
            <td style="padding: 9px 0; color: #6b7280;">Base Price</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{base_price}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd8fe;">
            <td style="padding: 9px 0; color: #6b7280;">Total Margin Earned</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #22c55e;">${'$'}{{total_margin}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Quarterly Payout</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #8A2BE2;">${'$'}{{quarterly_payout}}</td>
          </tr>
        </table>
      </div>

      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 20px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;"><strong>Important:</strong> This agreement confirms your irrevocable gold sale to Wingold and Metals DMCC. Quarterly margin payments will be credited to your FinaPay wallet per the disbursement schedule in your agreement.</p>
      </div>

      <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>Signed by:</strong> {{signature_name}}</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;"><strong>Date:</strong> {{signed_date}}</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View My Plan</a>
      </p>
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
    subject: 'Your Gold Ownership Certificate — {{certificate_number}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Dear {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your <strong>{{certificate_type}}</strong> certificate has been issued and is attached to this email as a PDF. This document serves as official proof of your gold ownership held in allocated custody at Wingold and Metals DMCC, Dubai.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #F59E0B; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Certificate Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #6b7280;">Certificate Number</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{certificate_number}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">{{gold_amount}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #6b7280;">Certificate Type</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{certificate_type}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Issue Date</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{issue_date}}</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{vault_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View in FinaVault</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'gold_amount', description: 'Amount of gold in grams' },
      { name: 'certificate_type', description: 'Type of certificate' },
      { name: 'issue_date', description: 'Date of issue' },
      { name: 'vault_url', description: 'Link to FinaVault' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.INVOICE_DELIVERY,
    name: 'Invoice Delivery',
    type: 'email' as const,
    module: 'finapay',
    subject: 'Invoice {{invoice_number}} — Gold Purchase',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Dear {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Thank you for your purchase. Your invoice is attached to this email as a PDF for your records.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Invoice Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Invoice Number</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{invoice_number}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Date</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{invoice_date}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Purchased</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{gold_amount}}g</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #374151; font-weight: 700;">Total Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #8A2BE2; font-size: 16px;">{{total_amount}}</td>
          </tr>
        </table>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">For any questions about this invoice, please contact <a href="mailto:support@finatrades.com" style="color: #8A2BE2;">support@finatrades.com</a>.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'invoice_number', description: 'Invoice number' },
      { name: 'invoice_date', description: 'Invoice date' },
      { name: 'gold_amount', description: 'Amount of gold in grams' },
      { name: 'total_amount', description: 'Total amount paid' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.DOCUMENT_EXPIRY_REMINDER,
    name: 'Document Expiry Reminder',
    type: 'email' as const,
    module: 'kyc',
    subject: 'Action Required: Your {{document_type}} Expires in {{days_remaining}} Days',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your <strong>{{document_type}}</strong> on file is expiring on <strong>{{expiry_date}}</strong> — in <strong>{{days_remaining}} days</strong>. To continue using all FinaTrades services without interruption, please upload a renewed document before the expiry date.</p>

      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">What to do</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #374151;">1. &nbsp; Obtain a new, valid {{document_type}}</td></tr>
          <tr><td style="padding: 6px 0; color: #374151;">2. &nbsp; Log in to your FinaTrades account</td></tr>
          <tr><td style="padding: 6px 0; color: #374151;">3. &nbsp; Go to <strong>Settings &rarr; KYC Verification</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #374151;">4. &nbsp; Upload the renewed document</td></tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{kyc_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Update Documents Now</a>
      </p>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">If you have already renewed your documents, you can disregard this message.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'document_type', description: 'Type of document (Passport, Trade License, etc.)' },
      { name: 'expiry_date', description: 'Document expiry date' },
      { name: 'days_remaining', description: 'Number of days until expiry' },
      { name: 'kyc_url', description: 'Link to KYC page' },
    ],
    status: 'published' as const,
  },
  // Security Emails
  {
    slug: EMAIL_TEMPLATES.PASSWORD_RESET,
    name: 'Password Reset',
    type: 'email' as const,
    module: 'auth',
    subject: 'Reset Your FinaTrades Password',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">We received a request to reset the password for your FinaTrades account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{reset_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Reset My Password</a>
      </p>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">If you did not request a password reset, you can safely ignore this email — your password has not been changed. If you are concerned about your account security, please contact us at <a href="mailto:security@finatrades.com" style="color: #8A2BE2;">security@finatrades.com</a>.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'reset_url', description: 'Password reset link' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.PASSWORD_CHANGED,
    name: 'Password Changed',
    type: 'email' as const,
    module: 'auth',
    subject: 'Your FinaTrades Password Has Been Changed',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your FinaTrades account password was successfully changed on <strong>{{change_date}}</strong>.</p>

      <div style="background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>Did not make this change?</strong> Reset your password immediately and contact our security team at <a href="mailto:security@finatrades.com" style="color: #92400e;">security@finatrades.com</a>.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{security_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Review Security Settings</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'change_date', description: 'Date and time of password change' },
      { name: 'security_url', description: 'Link to security settings' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.NEW_DEVICE_LOGIN,
    name: 'New Device Login',
    type: 'email' as const,
    module: 'auth',
    subject: 'New Sign-In to Your FinaTrades Account',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">We detected a new sign-in to your FinaTrades account. If this was you, no action is needed.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Sign-In Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Device</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{device_info}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Location</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{location}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Time</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{login_time}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">IP Address</td>
            <td style="padding: 9px 0; text-align: right; color: #374151; font-family: monospace;">{{ip_address}}</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">Do not recognise this activity? Secure your account immediately by changing your password and enabling two-factor authentication.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{security_url}}" style="background: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Secure My Account</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'device_info', description: 'Device/browser information' },
      { name: 'location', description: 'Approximate location' },
      { name: 'login_time', description: 'Time of login' },
      { name: 'ip_address', description: 'IP address' },
      { name: 'security_url', description: 'Link to security settings' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.ACCOUNT_LOCKED,
    name: 'Account Locked',
    type: 'email' as const,
    module: 'auth',
    subject: 'Your FinaTrades Account Has Been Temporarily Locked',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your FinaTrades account has been temporarily locked due to <strong>{{lock_reason}}</strong>.</p>

      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">Your account will be automatically unlocked after <strong>{{unlock_time}}</strong>. No further action is required on your part if you recognise this activity.</p>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">If you believe this was applied in error, please contact our support team and we will assist you promptly.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{support_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Contact Support</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'lock_reason', description: 'Reason for account lock' },
      { name: 'unlock_time', description: 'Time until unlock' },
      { name: 'support_url', description: 'Link to support' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.SUSPICIOUS_ACTIVITY,
    name: 'Suspicious Activity Alert',
    type: 'email' as const,
    module: 'auth',
    subject: 'Security Alert: Suspicious Activity on Your FinaTrades Account',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Our security systems have detected unusual activity on your FinaTrades account. Please review the details below and take immediate action if you do not recognise this activity.</p>

      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #991b1b; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Suspicious Activity Detected</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 8px 0; color: #6b7280;">Activity</td>
            <td style="padding: 8px 0; text-align: right; color: #374151;">{{activity_description}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Detected at</td>
            <td style="padding: 8px 0; text-align: right; color: #374151;">{{activity_time}}</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; font-weight: 700; margin: 0 0 12px 0;">Recommended immediate actions:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
        <tr><td style="padding: 6px 0; color: #374151;">1. &nbsp; Change your password immediately</td></tr>
        <tr><td style="padding: 6px 0; color: #374151;">2. &nbsp; Enable two-factor authentication if not already active</td></tr>
        <tr><td style="padding: 6px 0; color: #374151;">3. &nbsp; Review your recent transactions and account activity</td></tr>
      </table>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{security_url}}" style="background: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Secure My Account Now</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'activity_description', description: 'Description of suspicious activity' },
      { name: 'activity_time', description: 'Time of activity' },
      { name: 'security_url', description: 'Link to security settings' },
    ],
    status: 'published' as const,
  },
  // Transaction Emails
  {
    slug: EMAIL_TEMPLATES.GOLD_SALE,
    name: 'Gold Sale Confirmation',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Sale Confirmed — {{gold_amount}}g Gold',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your gold sale has been completed and the proceeds have been credited to your wallet.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Sale Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{reference_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Sold</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{gold_amount}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Price per Gram</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{price_per_gram}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #374151; font-weight: 700;">Total Received</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #22c55e; font-size: 16px;">${'$'}{{total_amount}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'reference_id', description: 'Transaction reference' },
      { name: 'gold_amount', description: 'Amount of gold sold' },
      { name: 'price_per_gram', description: 'Price per gram' },
      { name: 'total_amount', description: 'Total amount received' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.CARD_PAYMENT_RECEIPT,
    name: 'Card Payment Receipt',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Payment Receipt — ${{amount}} Gold Purchase',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Dear {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your card payment has been successfully processed and your gold has been added to your wallet. Please retain this receipt for your records.</p>

      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #166534; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Transaction Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Transaction ID</td>
            <td style="padding: 9px 0; text-align: right; font-family: monospace; color: #374151;">{{reference_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Date &amp; Time</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{transaction_date}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Payment Method</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">Card ending {{card_last4}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #374151; font-weight: 700;">Amount Paid</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #22c55e; font-size: 18px;">${'$'}{{amount}} USD</td>
          </tr>
        </table>
      </div>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #F59E0B; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0; text-align: center;">Certificate of Gold Ownership</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px dashed #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Certificate Number</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #92400e; font-family: monospace;">{{certificate_number}}</td>
          </tr>
          <tr style="border-bottom: 1px dashed #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Gold Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #92400e; font-size: 18px;">{{gold_grams}}g</td>
          </tr>
          <tr style="border-bottom: 1px dashed #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Price per Gram</td>
            <td style="padding: 9px 0; text-align: right; color: #92400e;">${'$'}{{gold_price}}</td>
          </tr>
          <tr style="border-bottom: 1px dashed #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Storage Location</td>
            <td style="padding: 9px 0; text-align: right; color: #92400e;">Dubai, UAE</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #78350f;">Custodian</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #92400e;">Wingold &amp; Metals DMCC</td>
          </tr>
        </table>
      </div>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 10px 0; font-size: 13px;">Updated Wallet Balance</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 7px 0; color: #6b7280;">Total Gold Holdings</td>
            <td style="padding: 7px 0; text-align: right; font-weight: 600; color: #374151;">{{total_gold_grams}}g</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #6b7280;">Estimated Value</td>
            <td style="padding: 7px 0; text-align: right; font-weight: 600; color: #374151;">${'$'}{{total_value_usd}} USD</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View Dashboard</a>
      </p>

      <p style="color: #6b7280; font-size: 13px; margin: 0;">If you did not authorise this transaction, please contact our security team at <a href="mailto:security@finatrades.com" style="color: #8A2BE2;">security@finatrades.com</a> immediately.</p>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'amount', description: 'Payment amount in USD' },
      { name: 'reference_id', description: 'Transaction reference' },
      { name: 'transaction_date', description: 'Date and time of transaction' },
      { name: 'card_last4', description: 'Last 4 digits of card' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'gold_grams', description: 'Gold amount purchased' },
      { name: 'gold_price', description: 'Gold price per gram' },
      { name: 'total_gold_grams', description: 'Total gold in wallet' },
      { name: 'total_value_usd', description: 'Total wallet value in USD' },
      { name: 'dashboard_url', description: 'Dashboard URL' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.DEPOSIT_RECEIVED,
    name: 'Deposit Received',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Deposit Confirmed — ${{amount}} Credited',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your deposit has been received and credited to your FinaTrades account. Funds are now available for trading.</p>

      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #22c55e; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Amount Deposited</p>
        <p style="font-size: 40px; font-weight: 800; color: #166534; margin: 0 0 8px 0;">${'$'}{{amount}}</p>
        <p style="color: #6b7280; margin: 0; font-size: 13px; font-family: monospace;">Ref: {{reference_id}}</p>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'amount', description: 'Deposit amount' },
      { name: 'reference_id', description: 'Transaction reference' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.DEPOSIT_PROCESSING,
    name: 'Deposit Processing',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Deposit of ${{amount}} Is Being Processed',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">We have received your deposit of <strong>${'$'}{{amount}}</strong> and it is currently being processed. You will receive another notification once the funds are credited to your account.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Deposit Amount</p>
        <p style="font-size: 36px; font-weight: 800; color: #374151; margin: 0 0 12px 0;">${'$'}{{amount}}</p>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Estimated completion: <strong>{{estimated_time}}</strong></p>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'amount', description: 'Deposit amount' },
      { name: 'estimated_time', description: 'Estimated processing time' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.WITHDRAWAL_REQUESTED,
    name: 'Withdrawal Requested',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Withdrawal Request Received — ${{amount}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your withdrawal request has been submitted successfully and is pending review. Processing typically takes <strong>1–3 business days</strong>.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Withdrawal Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{amount}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Method</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{withdrawal_method}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Reference</td>
            <td style="padding: 9px 0; text-align: right; color: #374151; font-family: monospace;">{{reference_id}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #F59E0B;">Pending Review</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0;">You will receive email updates as your withdrawal progresses.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'amount', description: 'Withdrawal amount' },
      { name: 'withdrawal_method', description: 'Payment method' },
      { name: 'reference_id', description: 'Transaction reference' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.WITHDRAWAL_PROCESSING,
    name: 'Withdrawal Processing',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Withdrawal of ${{amount}} Is Being Processed',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your withdrawal has been approved and is now being sent. Funds are expected to arrive in your account within the timeframe below.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{amount}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #8A2BE2;">Processing</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Expected Arrival</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{estimated_time}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'amount', description: 'Withdrawal amount' },
      { name: 'estimated_time', description: 'Estimated arrival time' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.WITHDRAWAL_COMPLETED,
    name: 'Withdrawal Completed',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Withdrawal Complete — ${{amount}} Sent',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your withdrawal has been successfully processed and dispatched to your bank account. Funds typically appear within <strong>1–2 business days</strong>, depending on your bank.</p>

      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #22c55e; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Amount Withdrawn</p>
        <p style="font-size: 40px; font-weight: 800; color: #166534; margin: 0 0 8px 0;">${'$'}{{amount}}</p>
        <p style="color: #6b7280; margin: 0; font-size: 13px; font-family: monospace;">Ref: {{reference_id}}</p>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'amount', description: 'Withdrawal amount' },
      { name: 'reference_id', description: 'Transaction reference' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRANSACTION_FAILED,
    name: 'Transaction Failed',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Transaction Failed — Action Required',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Unfortunately, your transaction could not be completed. No funds have been debited from your account.</p>

      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #991b1b; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Failed Transaction</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 8px 0; color: #6b7280;">Transaction Type</td>
            <td style="padding: 8px 0; text-align: right; color: #374151;">{{transaction_type}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 8px 0; color: #6b7280;">Amount</td>
            <td style="padding: 8px 0; text-align: right; color: #374151;">${'$'}{{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Reason</td>
            <td style="padding: 8px 0; text-align: right; color: #ef4444;">{{failure_reason}}</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 24px 0;">Please review the details above and try again. If the issue persists, our support team is available to help.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{support_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Contact Support</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'transaction_type', description: 'Type of transaction' },
      { name: 'amount', description: 'Transaction amount' },
      { name: 'failure_reason', description: 'Reason for failure' },
      { name: 'support_url', description: 'Link to support' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.LOW_BALANCE_ALERT,
    name: 'Low Balance Alert',
    type: 'email' as const,
    module: 'transactions',
    subject: 'Low Balance Alert — Your FinaTrades Wallet',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your wallet balance has fallen below your alert threshold. Consider topping up to ensure uninterrupted access to trading.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #F59E0B; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Current Balance</p>
        <p style="font-size: 40px; font-weight: 800; color: #92400e; margin: 0 0 8px 0;">${'$'}{{current_balance}}</p>
        <p style="color: #6b7280; margin: 0; font-size: 13px;">Alert threshold: ${'$'}{{threshold}}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{deposit_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Add Funds</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'current_balance', description: 'Current wallet balance' },
      { name: 'threshold', description: 'Alert threshold' },
      { name: 'deposit_url', description: 'Link to deposit page' },
    ],
    status: 'published' as const,
  },
  // P2P Transfer Emails
  {
    slug: EMAIL_TEMPLATES.TRANSFER_SENT,
    name: 'Transfer Sent',
    type: 'email' as const,
    module: 'p2p',
    subject: 'Transfer Confirmed — {{gold_amount}}g Gold Sent',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your gold transfer has been successfully sent to <strong>{{recipient_name}}</strong>.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Transfer Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Recipient</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">{{recipient_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Transferred</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #F59E0B;">{{gold_amount}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Approximate Value</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{usd_value}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Reference</td>
            <td style="padding: 9px 0; text-align: right; color: #374151; font-family: monospace;">{{reference_id}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'Sender\'s name' },
      { name: 'recipient_name', description: 'Recipient\'s name' },
      { name: 'gold_amount', description: 'Amount of gold transferred' },
      { name: 'usd_value', description: 'USD value' },
      { name: 'reference_id', description: 'Transaction reference' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRANSFER_PENDING,
    name: 'Transfer Pending',
    type: 'email' as const,
    module: 'p2p',
    subject: 'Gold Transfer Pending — {{gold_amount}}g',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your gold transfer is being processed and awaiting final confirmation. You will receive a follow-up email once complete.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Recipient</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{recipient_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #F59E0B;">{{gold_amount}}g</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #8A2BE2;">Pending</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'Sender\'s name' },
      { name: 'recipient_name', description: 'Recipient\'s name' },
      { name: 'gold_amount', description: 'Amount of gold' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRANSFER_COMPLETED,
    name: 'Transfer Completed',
    type: 'email' as const,
    module: 'p2p',
    subject: 'Transfer Complete — {{gold_amount}}g Gold Delivered',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your gold transfer has been completed successfully and the gold has been credited to <strong>{{recipient_name}}</strong>'s wallet.</p>

      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Recipient</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">{{recipient_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Transferred</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #F59E0B;">{{gold_amount}}g</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #22c55e;">Completed</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'Sender\'s name' },
      { name: 'recipient_name', description: 'Recipient\'s name' },
      { name: 'gold_amount', description: 'Amount of gold' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRANSFER_CANCELLED,
    name: 'Transfer Cancelled',
    type: 'email' as const,
    module: 'p2p',
    subject: 'Transfer Cancelled — Gold Returned to Wallet',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your gold transfer has been cancelled and the gold has been returned to your wallet.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Intended Recipient</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{recipient_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Amount</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{gold_amount}}g</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Reason</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{cancellation_reason}}</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0;">Your balance has been fully restored. If you have questions, please contact our support team.</p>
    `,
    variables: [
      { name: 'user_name', description: 'Sender\'s name' },
      { name: 'recipient_name', description: 'Recipient\'s name' },
      { name: 'gold_amount', description: 'Amount of gold' },
      { name: 'cancellation_reason', description: 'Reason for cancellation' },
    ],
    status: 'published' as const,
  },
  // BNSL Emails
  {
    slug: EMAIL_TEMPLATES.BNSL_PAYMENT_REMINDER,
    name: 'BNSL Payment Reminder',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'Payment Reminder — ${{amount}} Due on {{due_date}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">This is a friendly reminder that your Buy Now, Save Later (BNSL) payment is due soon. Keeping your plan on track ensures continued progress toward full gold ownership.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #F59E0B; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Payment Due</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Plan</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #92400e;">{{plan_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Amount Due</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #92400e; font-size: 18px;">${'$'}{{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #78350f;">Due Date</td>
            <td style="padding: 9px 0; text-align: right; color: #92400e;">{{due_date}}</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{payment_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Make Payment</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'plan_name', description: 'BNSL plan name' },
      { name: 'amount', description: 'Payment amount' },
      { name: 'due_date', description: 'Payment due date' },
      { name: 'payment_url', description: 'Link to make payment' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.BNSL_PAYMENT_RECEIVED,
    name: 'BNSL Payment Received',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'BNSL Payment Confirmed — ${{amount}} Received',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your BNSL instalment payment has been received and applied to your plan. You are one step closer to full gold ownership.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Payment Confirmation</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Plan</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{plan_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Amount Paid</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #22c55e; font-size: 18px;">${'$'}{{amount}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Remaining Balance</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{remaining_balance}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Next Payment Due</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{next_due_date}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'plan_name', description: 'BNSL plan name' },
      { name: 'amount', description: 'Amount paid' },
      { name: 'remaining_balance', description: 'Remaining balance' },
      { name: 'next_due_date', description: 'Next payment due date' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.BNSL_PAYMENT_OVERDUE,
    name: 'BNSL Payment Overdue',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'Urgent: BNSL Payment Overdue — Action Required',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your BNSL payment is overdue. Please settle the outstanding balance immediately to avoid late fees and protect your gold ownership progress.</p>

      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #991b1b; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Overdue Payment</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 9px 0; color: #6b7280;">Plan</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{plan_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 9px 0; color: #6b7280;">Amount Overdue</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #ef4444; font-size: 18px;">${'$'}{{amount}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 9px 0; color: #6b7280;">Days Overdue</td>
            <td style="padding: 9px 0; text-align: right; color: #ef4444;">{{days_overdue}} days</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Late Fee</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{late_fee}}</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{payment_url}}" style="background: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Pay Now</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'plan_name', description: 'BNSL plan name' },
      { name: 'amount', description: 'Overdue amount' },
      { name: 'days_overdue', description: 'Days past due' },
      { name: 'late_fee', description: 'Late fee amount' },
      { name: 'payment_url', description: 'Link to make payment' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.BNSL_PLAN_COMPLETED,
    name: 'BNSL Plan Completed',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'Congratulations — Your BNSL Plan Is Complete!',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Congratulations — you have successfully completed your Buy Now, Save Later plan and are now the proud full owner of your gold.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px solid #F59E0B; border-radius: 10px; padding: 30px 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Now Fully Owned</p>
        <p style="font-size: 44px; font-weight: 800; color: #92400e; margin: 0 0 4px 0;">{{gold_amount}}g</p>
        <p style="font-size: 16px; color: #78350f; margin: 0;">Physical Gold — Secured in Vault</p>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0 0 12px 0;">Your gold is now in your FinaVault and fully available. You can choose to:</p>
      <ul style="color: #374151; line-height: 2; padding-left: 20px; margin: 0 0 24px 0;">
        <li>Hold it in your vault as a store of value</li>
        <li>Sell at the current market price</li>
        <li>Transfer to another FinaTrades user</li>
        <li>Request physical delivery to your address</li>
      </ul>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'gold_amount', description: 'Total gold amount' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.BNSL_EARLY_EXIT,
    name: 'BNSL Early Exit',
    type: 'email' as const,
    module: 'bnsl',
    subject: 'BNSL Early Exit Confirmed',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your early exit from the BNSL plan has been processed. The proportional gold earned to date has been transferred to your FinaVault, less the applicable early exit fee.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Exit Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Plan</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{plan_name}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Total Paid</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{amount_paid}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Early Exit Fee</td>
            <td style="padding: 9px 0; text-align: right; color: #ef4444;">${'$'}{{penalty_amount}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #374151; font-weight: 700;">Gold Received</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #F59E0B; font-size: 16px;">{{gold_received}}g</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'plan_name', description: 'BNSL plan name' },
      { name: 'amount_paid', description: 'Total amount paid' },
      { name: 'penalty_amount', description: 'Early exit penalty' },
      { name: 'gold_received', description: 'Gold received after penalty' },
    ],
    status: 'published' as const,
  },
  // Trade Finance Emails
  {
    slug: EMAIL_TEMPLATES.TRADE_CASE_CREATED,
    name: 'Trade Case Created',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade Finance Case Opened — {{case_id}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your trade finance case has been successfully submitted and is now under review by our trade specialists. You will receive updates as your case progresses.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Case Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Case ID</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{case_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Type</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{case_type}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Amount</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 600; color: #8A2BE2;">Pending Review</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'case_id', description: 'Trade case ID' },
      { name: 'case_type', description: 'Type of trade case' },
      { name: 'amount', description: 'Trade amount' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRADE_CASE_STATUS_UPDATE,
    name: 'Trade Case Status Update',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade Case {{case_id}} — Status Updated',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">There has been an update to your trade finance case. Please review the latest status below.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Case ID</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{case_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">New Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #8A2BE2;">{{new_status}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Updated</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{update_date}}</td>
          </tr>
        </table>
      </div>

      <div style="background: #f9fafb; border-left: 4px solid #8A2BE2; border-radius: 4px; padding: 16px 20px; margin: 0;">
        <p style="font-weight: 600; color: #374151; margin: 0 0 4px 0; font-size: 13px;">Notes from our team</p>
        <p style="color: #374151; margin: 0; line-height: 1.7;">{{status_notes}}</p>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'case_id', description: 'Trade case ID' },
      { name: 'new_status', description: 'New case status' },
      { name: 'update_date', description: 'Date of update' },
      { name: 'status_notes', description: 'Additional notes' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRADE_DOCUMENT_REQUEST,
    name: 'Trade Document Request',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Documents Required — Trade Case {{case_id}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">To proceed with your trade finance case, we require additional documentation. Please upload the requested documents at your earliest convenience to avoid delays in processing.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #92400e; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Case ID: {{case_id}}</p>
        <p style="font-weight: 600; color: #374151; margin: 0 0 8px 0;">Documents Required:</p>
        <p style="color: #374151; margin: 0; line-height: 1.7;">{{required_documents}}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{upload_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Upload Documents</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'case_id', description: 'Trade case ID' },
      { name: 'required_documents', description: 'List of required documents' },
      { name: 'upload_url', description: 'Link to upload documents' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRADE_CASE_APPROVED,
    name: 'Trade Case Approved',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade Case Approved — {{case_id}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">We are pleased to inform you that your trade finance case has been approved. You may now proceed with your trade transactions within the approved terms.</p>

      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #166534; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Approval Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Case ID</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{case_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Credit Limit</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #22c55e; font-size: 18px;">${'$'}{{credit_limit}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Valid Until</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{valid_until}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'case_id', description: 'Trade case ID' },
      { name: 'credit_limit', description: 'Approved credit limit' },
      { name: 'valid_until', description: 'Validity date' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.TRADE_CASE_COMPLETED,
    name: 'Trade Case Completed',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade Case Complete — {{case_id}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your trade finance case has been completed successfully. All settlements and documentation have been finalised. Thank you for choosing FinaBridge.</p>

      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Case ID</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{case_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Total Value</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{total_value}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Completed</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{completion_date}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
      { name: 'case_id', description: 'Trade case ID' },
      { name: 'total_value', description: 'Total trade value' },
      { name: 'completion_date', description: 'Completion date' },
    ],
    status: 'published' as const,
  },
  // FinaBridge Trade Proposals & Settlements
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_NEW_PROPOSAL,
    name: 'New Trade Proposal Received',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'New Trade Proposal Received — Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">You have received a new proposal from an exporter for your trade request. Review the terms below and respond via your FinaBridge dashboard.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Proposal Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Proposed Price</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{proposed_price}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Delivery Terms</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{delivery_terms}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Exporter</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{exporter_name}}</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View Proposal</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'proposed_price', description: 'Proposed trade price' },
      { name: 'delivery_terms', description: 'Delivery terms' },
      { name: 'exporter_name', description: 'Exporter name' },
      { name: 'dashboard_url', description: 'Dashboard URL' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_PROPOSAL_ACCEPTED,
    name: 'Trade Proposal Accepted',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Proposal Accepted — Trade Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your trade proposal has been accepted by the importer. A secure Deal Room has been created for this transaction. Please log in to your dashboard to proceed with the next steps.</p>

      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #166534; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Deal Summary</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Value</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${'$'}{{trade_value}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Settlement Gold</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #F59E0B;">{{gold_grams}}g</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Go to Deal Room</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'trade_value', description: 'Trade value in USD' },
      { name: 'gold_grams', description: 'Settlement gold in grams' },
      { name: 'dashboard_url', description: 'Dashboard URL' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_SHIPMENT_UPDATE,
    name: 'Shipment Status Update',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Shipment Update — Trade Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">There is an update on the shipment for your trade. Please review the latest tracking information below.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-weight: 700; color: #374151; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Shipment Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Status</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #8A2BE2;">{{shipment_status}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Tracking Number</td>
            <td style="padding: 9px 0; text-align: right; color: #374151; font-family: monospace;">{{tracking_number}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Current Location</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{current_location}}</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8A2BE2, #6D28D9); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Track Shipment</a>
      </p>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'shipment_status', description: 'Current shipment status' },
      { name: 'tracking_number', description: 'Shipment tracking number' },
      { name: 'current_location', description: 'Current location' },
      { name: 'dashboard_url', description: 'Dashboard URL' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_SETTLEMENT_LOCKED,
    name: 'Settlement Gold Locked',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Settlement Gold Locked in Escrow — Trade Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">The settlement gold for your trade has been securely locked in escrow. It will be held until shipment confirmation or trade completion.</p>

      <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #F59E0B; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #92400e; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">Gold Locked</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #92400e; font-size: 18px;">{{gold_grams}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #fde68a;">
            <td style="padding: 9px 0; color: #78350f;">USD Value</td>
            <td style="padding: 9px 0; text-align: right; color: #92400e;">${'$'}{{usd_value}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #78350f;">Lock Expires</td>
            <td style="padding: 9px 0; text-align: right; color: #92400e;">{{expiry_date}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'gold_grams', description: 'Gold locked in grams' },
      { name: 'usd_value', description: 'USD value' },
      { name: 'expiry_date', description: 'Lock expiry date' },
    ],
    status: 'published' as const,
  },
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_SETTLEMENT_RELEASED,
    name: 'Settlement Gold Released',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Settlement Gold Released — Trade Complete',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">The settlement gold has been released from escrow and transferred to the exporter. Your trade is now complete. Thank you for using FinaBridge.</p>

      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">Gold Released</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #F59E0B; font-size: 18px;">{{gold_grams}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #bbf7d0;">
            <td style="padding: 9px 0; color: #6b7280;">USD Value</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{usd_value}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Released To</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{exporter_name}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'gold_grams', description: 'Gold released in grams' },
      { name: 'usd_value', description: 'USD value' },
      { name: 'exporter_name', description: 'Exporter name' },
    ],
    status: 'published' as const,
  },
  // KYC Pending
  {
    slug: EMAIL_TEMPLATES.KYC_PENDING_REVIEW,
    name: 'KYC Pending Review',
    type: 'email' as const,
    module: 'kyc',
    subject: 'Your Identity Verification Is Under Review',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Thank you for submitting your identity verification documents. Our compliance team is currently reviewing your application and we will notify you of the outcome within the timeframe below.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Estimated Review Time</p>
        <p style="font-size: 22px; font-weight: 800; color: #374151; margin: 0;">1–2 Business Days</p>
      </div>

      <p style="color: #374151; line-height: 1.7; margin: 0;">You will receive a confirmation email once your verification is complete. If you have any questions, please contact our support team.</p>
    `,
    variables: [
      { name: 'user_name', description: 'User\'s full name' },
    ],
    status: 'published' as const,
  },
  // Trade Case Rejected
  {
    slug: EMAIL_TEMPLATES.TRADE_CASE_REJECTED,
    name: 'Trade Case Rejected',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade Case Unsuccessful — Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">We regret to inform you that your trade finance application was unsuccessful. Please review the details below. If you believe this decision is in error or wish to discuss your options, our team is here to help.</p>

      <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fecaca;">
            <td style="padding: 9px 0; color: #6b7280;">Reason</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{rejection_reason}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Date</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{rejection_date}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'rejection_reason', description: 'Reason for rejection' },
      { name: 'rejection_date', description: 'Date of rejection' },
    ],
    status: 'published' as const,
  },
  // Trade Document Uploaded
  {
    slug: EMAIL_TEMPLATES.TRADE_DOCUMENT_UPLOADED,
    name: 'Trade Document Uploaded',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'New Document Uploaded — Trade Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">A new document has been uploaded to your trade case. Please log in to review the document at your earliest convenience.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Document Type</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{document_type}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Uploaded By</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{uploaded_by}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Upload Date</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{upload_date}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'document_type', description: 'Type of document' },
      { name: 'uploaded_by', description: 'Name of uploader' },
      { name: 'upload_date', description: 'Date of upload' },
    ],
    status: 'published' as const,
  },
  // FinaBridge Proposal Declined
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_PROPOSAL_DECLINED,
    name: 'Trade Proposal Declined',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade Proposal Declined — Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">The importer has declined your trade proposal. You may submit a revised proposal if you wish to continue with this trade request.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Proposal Amount</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">${'$'}{{proposal_amount}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Reason</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{decline_reason}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'proposal_amount', description: 'Proposal amount' },
      { name: 'decline_reason', description: 'Reason for decline' },
    ],
    status: 'published' as const,
  },
  // FinaBridge Deal Room Created
  {
    slug: EMAIL_TEMPLATES.FINABRIDGE_DEAL_ROOM_CREATED,
    name: 'Deal Room Created',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Deal Room Created — Trade Ref {{trade_ref}}',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">A secure Deal Room has been set up for your trade negotiation. You can now communicate directly with your counterparty, share documents, and manage trade milestones — all in one secure environment.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Trade Reference</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151; font-family: monospace;">{{trade_ref}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Deal Room ID</td>
            <td style="padding: 9px 0; text-align: right; color: #374151; font-family: monospace;">{{deal_room_id}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Counterparty</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{counterparty_name}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Created</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{created_date}}</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'trade_ref', description: 'Trade reference ID' },
      { name: 'deal_room_id', description: 'Deal room identifier' },
      { name: 'counterparty_name', description: 'Counterparty name' },
      { name: 'created_date', description: 'Creation date' },
    ],
    status: 'published' as const,
  },
  // Monthly Statement
  {
    slug: EMAIL_TEMPLATES.MONTHLY_STATEMENT,
    name: 'Monthly Account Statement',
    type: 'email' as const,
    module: 'account',
    subject: 'Your {{month}} {{year}} Account Statement Is Ready',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your FinaTrades account statement for <strong>{{month}} {{year}}</strong> is now available. A full detailed statement is attached to this email.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px 0; font-weight: 700;">Account Summary — {{month}} {{year}}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Opening Balance</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{opening_gold}}g (${`$`}{{opening_usd}})</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Closing Balance</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">{{closing_gold}}g (${`$`}{{closing_usd}})</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Total Transactions</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{total_transactions}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Net Change</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{net_change_gold}}g</td>
          </tr>
        </table>
      </div>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'month', description: 'Statement month' },
      { name: 'year', description: 'Statement year' },
      { name: 'opening_gold', description: 'Opening gold balance' },
      { name: 'opening_usd', description: 'Opening USD value' },
      { name: 'closing_gold', description: 'Closing gold balance' },
      { name: 'closing_usd', description: 'Closing USD value' },
      { name: 'total_transactions', description: 'Total transactions' },
      { name: 'net_change_gold', description: 'Net change in gold' },
    ],
    status: 'published' as const,
  },
  // Annual Tax Statement
  {
    slug: EMAIL_TEMPLATES.ANNUAL_TAX_STATEMENT,
    name: 'Annual Tax Statement',
    type: 'email' as const,
    module: 'account',
    subject: 'Your {{year}} Annual Tax Statement Is Ready',
    body: `
      <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 20px 0;">Hello {{user_name}},</p>
      <p style="color: #374151; line-height: 1.7; margin: 0 0 20px 0;">Your FinaTrades annual tax statement for the year <strong>{{year}}</strong> is now available. Your detailed statement is attached to this email for your records and tax filing purposes.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
        <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px 0; font-weight: 700;">Annual Summary — {{year}}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Total Gold Purchased</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{total_purchases_gold}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Total Gold Sold</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{total_sales_gold}}g</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 9px 0; color: #6b7280;">Realized Gains / Losses</td>
            <td style="padding: 9px 0; text-align: right; font-weight: 700; color: #374151;">${`$`}{{realized_gains}}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #6b7280;">Year-End Holdings</td>
            <td style="padding: 9px 0; text-align: right; color: #374151;">{{year_end_gold}}g</td>
          </tr>
        </table>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;"><em>This statement is provided for informational purposes only. Please consult your tax advisor regarding your specific filing obligations.</em></p>
    `,
    variables: [
      { name: 'user_name', description: "User's full name" },
      { name: 'year', description: 'Tax year' },
      { name: 'total_purchases_gold', description: 'Total gold purchased' },
      { name: 'total_sales_gold', description: 'Total gold sold' },
      { name: 'realized_gains', description: 'Realized gains/losses' },
      { name: 'year_end_gold', description: 'Year-end gold holdings' },
    ],
    status: 'published' as const,
  },
  // Certificate Templates
  {
    slug: 'certificate_digital_ownership',
    name: 'Digital Ownership Certificate',
    type: 'certificate' as const,
    module: 'finavault',
    subject: 'Digital Ownership Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; border: 3px double #f97316; padding: 40px; background: linear-gradient(135deg, #fffbeb, #fef3c7);">
        <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 14px; color: #92400e; letter-spacing: 2px; margin-bottom: 10px;">FINATRADES</div>
          <h1 style="color: #92400e; font-size: 32px; margin: 0; letter-spacing: 3px;">DIGITAL OWNERSHIP CERTIFICATE</h1>
          <p style="color: #78350f; font-size: 14px; margin-top: 10px;">Certificate of Gold Ownership</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #44403c;">This certifies that</p>
          <p style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 15px 0;">{{owner_name}}</p>
          <p style="font-size: 16px; color: #44403c;">is the rightful owner of</p>
          <p style="font-size: 36px; font-weight: bold; color: #8A2BE2; margin: 15px 0;">{{gold_amount}} grams</p>
          <p style="font-size: 16px; color: #44403c;">of 999.9 Fine Gold</p>
        </div>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #78350f;">Certificate Number:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
            <tr><td style="padding: 8px 0; color: #78350f;">Issue Date:</td><td style="text-align: right;">{{issue_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #78350f;">Value (USD):</td><td style="text-align: right;">${'$'}{{usd_value}}</td></tr>
            <tr><td style="padding: 8px 0; color: #78350f;">Issuer:</td><td style="text-align: right;">{{issuer}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #d97706;">
          <p style="font-size: 12px; color: #78350f;">This certificate is digitally issued and verified by Finatrades.</p>
          <p style="font-size: 12px; color: #78350f;">Gold is stored in secure allocated vaults in partnership with LBMA-accredited refiners.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'owner_name', description: 'Certificate owner name' },
      { name: 'gold_amount', description: 'Gold amount in grams' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'issue_date', description: 'Issue date' },
      { name: 'usd_value', description: 'USD value' },
      { name: 'issuer', description: 'Certificate issuer' },
    ],
    status: 'published' as const,
  },
  {
    slug: 'certificate_physical_storage',
    name: 'Physical Storage Certificate',
    type: 'certificate' as const,
    module: 'finavault',
    subject: 'Physical Storage Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; border: 3px double #1e40af; padding: 40px; background: linear-gradient(135deg, #eff6ff, #dbeafe);">
        <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 14px; color: #1e3a8a; letter-spacing: 2px; margin-bottom: 10px;">FINATRADES VAULT</div>
          <h1 style="color: #1e3a8a; font-size: 32px; margin: 0; letter-spacing: 3px;">PHYSICAL STORAGE CERTIFICATE</h1>
          <p style="color: #1e40af; font-size: 14px; margin-top: 10px;">Certificate of Secure Gold Storage</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #44403c;">This certifies that</p>
          <p style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 15px 0;">{{owner_name}}</p>
          <p style="font-size: 16px; color: #44403c;">has the following gold securely stored</p>
          <p style="font-size: 36px; font-weight: bold; color: #1e40af; margin: 15px 0;">{{gold_amount}} grams</p>
          <p style="font-size: 16px; color: #44403c;">999.9 Fine Gold Bar</p>
        </div>
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #1e3a8a;">Certificate Number:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
            <tr><td style="padding: 8px 0; color: #1e3a8a;">Bar Serial:</td><td style="text-align: right;">{{bar_serial}}</td></tr>
            <tr><td style="padding: 8px 0; color: #1e3a8a;">Vault Location:</td><td style="text-align: right;">{{vault_location}}</td></tr>
            <tr><td style="padding: 8px 0; color: #1e3a8a;">Storage Date:</td><td style="text-align: right;">{{storage_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #1e3a8a;">Value (USD):</td><td style="text-align: right;">${'$'}{{usd_value}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #3b82f6;">
          <p style="font-size: 12px; color: #1e3a8a;">Physical gold is stored in LBMA-accredited secure vault facilities.</p>
          <p style="font-size: 12px; color: #1e3a8a;">Fully insured and audited quarterly.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'owner_name', description: 'Certificate owner name' },
      { name: 'gold_amount', description: 'Gold amount in grams' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'bar_serial', description: 'Gold bar serial number' },
      { name: 'vault_location', description: 'Vault location' },
      { name: 'storage_date', description: 'Storage start date' },
      { name: 'usd_value', description: 'USD value' },
    ],
    status: 'published' as const,
  },
  {
    slug: 'certificate_transfer',
    name: 'Transfer Certificate',
    type: 'certificate' as const,
    module: 'finapay',
    subject: 'Gold Transfer Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; border: 3px double #059669; padding: 40px; background: linear-gradient(135deg, #ecfdf5, #d1fae5);">
        <div style="text-align: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 14px; color: #065f46; letter-spacing: 2px; margin-bottom: 10px;">FINATRADES</div>
          <h1 style="color: #065f46; font-size: 32px; margin: 0; letter-spacing: 3px;">TRANSFER CERTIFICATE</h1>
          <p style="color: #059669; font-size: 14px; margin-top: 10px;">Certificate of Gold Ownership Transfer</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #44403c;">This certifies the transfer of</p>
          <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 15px 0;">{{gold_amount}} grams</p>
          <p style="font-size: 16px; color: #44403c;">of 999.9 Fine Gold</p>
        </div>
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #065f46;">Certificate Number:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
            <tr><td style="padding: 8px 0; color: #065f46;">From:</td><td style="text-align: right;">{{from_name}}</td></tr>
            <tr><td style="padding: 8px 0; color: #065f46;">To:</td><td style="text-align: right; font-weight: bold;">{{to_name}}</td></tr>
            <tr><td style="padding: 8px 0; color: #065f46;">Transfer Date:</td><td style="text-align: right;">{{transfer_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #065f46;">Value (USD):</td><td style="text-align: right;">${'$'}{{usd_value}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #10b981;">
          <p style="font-size: 12px; color: #065f46;">This transfer is recorded on the Finatrades blockchain-verified ledger.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'gold_amount', description: 'Gold amount transferred' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'from_name', description: 'Sender name' },
      { name: 'to_name', description: 'Recipient name' },
      { name: 'transfer_date', description: 'Transfer date' },
      { name: 'usd_value', description: 'USD value' },
    ],
    status: 'published' as const,
  },
  {
    slug: 'certificate_bnsl_lock',
    name: 'BNSL Lock Certificate',
    type: 'certificate' as const,
    module: 'bnsl',
    subject: 'BNSL Lock Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; border: 3px double #7c3aed; padding: 40px; background: linear-gradient(135deg, #faf5ff, #ede9fe);">
        <div style="text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 14px; color: #5b21b6; letter-spacing: 2px; margin-bottom: 10px;">FINATRADES BNSL</div>
          <h1 style="color: #5b21b6; font-size: 32px; margin: 0; letter-spacing: 3px;">PRICE LOCK CERTIFICATE</h1>
          <p style="color: #7c3aed; font-size: 14px; margin-top: 10px;">Buy Now Sell Later Agreement</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #44403c;">This certifies that</p>
          <p style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 15px 0;">{{owner_name}}</p>
          <p style="font-size: 16px; color: #44403c;">has locked the following gold under BNSL agreement</p>
          <p style="font-size: 36px; font-weight: bold; color: #7c3aed; margin: 15px 0;">{{gold_amount}} grams</p>
        </div>
        <div style="background: #ede9fe; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #5b21b6;">Certificate Number:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
            <tr><td style="padding: 8px 0; color: #5b21b6;">Lock Price (per gram):</td><td style="text-align: right;">${'$'}{{lock_price}}</td></tr>
            <tr><td style="padding: 8px 0; color: #5b21b6;">Lock Date:</td><td style="text-align: right;">{{lock_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #5b21b6;">Maturity Date:</td><td style="text-align: right;">{{maturity_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #5b21b6;">Total Value:</td><td style="text-align: right; font-weight: bold;">${'$'}{{total_value}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #8b5cf6;">
          <p style="font-size: 12px; color: #5b21b6;">Gold is locked at the specified price until the maturity date.</p>
          <p style="font-size: 12px; color: #5b21b6;">Early exit may incur penalties as per agreement terms.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'owner_name', description: 'Certificate owner name' },
      { name: 'gold_amount', description: 'Gold amount locked' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'lock_price', description: 'Locked price per gram' },
      { name: 'lock_date', description: 'Lock date' },
      { name: 'maturity_date', description: 'Maturity date' },
      { name: 'total_value', description: 'Total locked value' },
    ],
    status: 'published' as const,
  },
  {
    slug: 'certificate_trade_lock',
    name: 'Trade Lock Certificate',
    type: 'certificate' as const,
    module: 'finabridge',
    subject: 'Trade Lock Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; border: 3px double #dc2626; padding: 40px; background: linear-gradient(135deg, #fef2f2, #fee2e2);">
        <div style="text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 14px; color: #991b1b; letter-spacing: 2px; margin-bottom: 10px;">FINABRIDGE</div>
          <h1 style="color: #991b1b; font-size: 32px; margin: 0; letter-spacing: 3px;">TRADE LOCK CERTIFICATE</h1>
          <p style="color: #dc2626; font-size: 14px; margin-top: 10px;">Trade Finance Collateral Lock</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #44403c;">This certifies that</p>
          <p style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 15px 0;">{{owner_name}}</p>
          <p style="font-size: 16px; color: #44403c;">has locked the following gold as trade collateral</p>
          <p style="font-size: 36px; font-weight: bold; color: #dc2626; margin: 15px 0;">{{gold_amount}} grams</p>
        </div>
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #991b1b;">Certificate Number:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
            <tr><td style="padding: 8px 0; color: #991b1b;">Trade Case ID:</td><td style="text-align: right;">{{trade_case_id}}</td></tr>
            <tr><td style="padding: 8px 0; color: #991b1b;">Lock Date:</td><td style="text-align: right;">{{lock_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #991b1b;">Collateral Value:</td><td style="text-align: right; font-weight: bold;">${'$'}{{collateral_value}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ef4444;">
          <p style="font-size: 12px; color: #991b1b;">Gold is locked as collateral for the associated trade finance case.</p>
          <p style="font-size: 12px; color: #991b1b;">Release subject to successful trade completion.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'owner_name', description: 'Certificate owner name' },
      { name: 'gold_amount', description: 'Gold amount locked' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'trade_case_id', description: 'Trade case ID' },
      { name: 'lock_date', description: 'Lock date' },
      { name: 'collateral_value', description: 'Collateral value in USD' },
    ],
    status: 'published' as const,
  },
  {
    slug: 'certificate_trade_release',
    name: 'Trade Release Certificate',
    type: 'certificate' as const,
    module: 'finabridge',
    subject: 'Trade Release Certificate - {{certificate_number}}',
    body: `
      <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; border: 3px double #16a34a; padding: 40px; background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
        <div style="text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="font-size: 14px; color: #166534; letter-spacing: 2px; margin-bottom: 10px;">FINABRIDGE</div>
          <h1 style="color: #166534; font-size: 32px; margin: 0; letter-spacing: 3px;">TRADE RELEASE CERTIFICATE</h1>
          <p style="color: #16a34a; font-size: 14px; margin-top: 10px;">Trade Finance Collateral Release</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #44403c;">This certifies that</p>
          <p style="font-size: 24px; font-weight: bold; color: #1c1917; margin: 15px 0;">{{owner_name}}</p>
          <p style="font-size: 16px; color: #44403c;">has successfully released the following gold from trade collateral</p>
          <p style="font-size: 36px; font-weight: bold; color: #16a34a; margin: 15px 0;">{{gold_amount}} grams</p>
        </div>
        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #166534;">Certificate Number:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
            <tr><td style="padding: 8px 0; color: #166534;">Trade Case ID:</td><td style="text-align: right;">{{trade_case_id}}</td></tr>
            <tr><td style="padding: 8px 0; color: #166534;">Release Date:</td><td style="text-align: right;">{{release_date}}</td></tr>
            <tr><td style="padding: 8px 0; color: #166534;">Released Value:</td><td style="text-align: right; font-weight: bold;">${'$'}{{released_value}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #22c55e;">
          <p style="font-size: 12px; color: #166534;">Trade completed successfully. Gold collateral has been released.</p>
          <p style="font-size: 12px; color: #166534;">Funds are now available in your Finatrades wallet.</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'owner_name', description: 'Certificate owner name' },
      { name: 'gold_amount', description: 'Gold amount released' },
      { name: 'certificate_number', description: 'Certificate number' },
      { name: 'trade_case_id', description: 'Trade case ID' },
      { name: 'release_date', description: 'Release date' },
      { name: 'released_value', description: 'Released value in USD' },
    ],
    status: 'published' as const,
  },
  // Invoice Template
  {
    slug: 'invoice_gold_purchase',
    name: 'Gold Purchase Invoice',
    type: 'invoice' as const,
    module: 'finapay',
    subject: 'Invoice #{{invoice_number}} - Gold Purchase',
    body: `
<h2 style="color:#8A2BE2;margin:0 0 4px;">Invoice #{{invoice_number}}</h2>
<p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Invoice Date: {{invoice_date}}</p>

<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(167,139,250,0.2);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0 0 4px;font-size:13px;color:#A78BFA;">Bill To</p>
  <p style="margin:0;font-weight:600;">{{customer_name}}</p>
  <p style="margin:0;color:#9ca3af;font-size:14px;">{{customer_email}}</p>
</div>

<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <thead>
    <tr style="border-bottom:1px solid rgba(167,139,250,0.3);">
      <th style="padding:10px 0;text-align:left;color:#A78BFA;font-size:13px;font-weight:600;">Description</th>
      <th style="padding:10px 0;text-align:right;color:#A78BFA;font-size:13px;font-weight:600;">Qty</th>
      <th style="padding:10px 0;text-align:right;color:#A78BFA;font-size:13px;font-weight:600;">Price</th>
      <th style="padding:10px 0;text-align:right;color:#A78BFA;font-size:13px;font-weight:600;">Total</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
      <td style="padding:12px 0;">999.9 Fine Gold</td>
      <td style="padding:12px 0;text-align:right;">{{gold_amount}}g</td>
      <td style="padding:12px 0;text-align:right;">\${{price_per_gram}}/g</td>
      <td style="padding:12px 0;text-align:right;">\${{subtotal}}</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="3" style="padding:10px 0;text-align:right;color:#9ca3af;font-size:14px;">Fees:</td>
      <td style="padding:10px 0;text-align:right;color:#9ca3af;font-size:14px;">\${{fees}}</td>
    </tr>
    <tr style="border-top:2px solid #8A2BE2;">
      <td colspan="3" style="padding:14px 0;text-align:right;font-weight:700;font-size:16px;">Total:</td>
      <td style="padding:14px 0;text-align:right;font-weight:700;font-size:18px;color:#A78BFA;">\${{total}}</td>
    </tr>
  </tfoot>
</table>

<p style="color:#9ca3af;font-size:13px;margin:0;">Thank you for your purchase. Your invoice is attached to this email as a PDF.</p>
    `,
    variables: [
      { name: 'invoice_number', description: 'Invoice number' },
      { name: 'customer_name', description: 'Customer name' },
      { name: 'customer_email', description: 'Customer email' },
      { name: 'gold_amount', description: 'Gold amount purchased' },
      { name: 'price_per_gram', description: 'Price per gram' },
      { name: 'subtotal', description: 'Subtotal amount' },
      { name: 'fees', description: 'Transaction fees' },
      { name: 'total', description: 'Total amount' },
      { name: 'invoice_date', description: 'Invoice date' },
    ],
    status: 'published' as const,
  },
  // Financial Statement Template
  {
    slug: 'monthly_account_statement',
    name: 'Monthly Account Statement',
    type: 'financial_report' as const,
    module: 'finapay',
    subject: 'Monthly Statement - {{statement_month}} {{statement_year}}',
    body: `
<h2 style="color:#A78BFA;margin:0 0 4px;">Account Statement</h2>
<p style="color:#9ca3af;margin:0 0 24px;font-size:14px;">{{statement_month}} {{statement_year}}</p>

<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(167,139,250,0.2);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0 0 6px;font-size:14px;"><span style="color:#A78BFA;">Account Holder:</span> {{account_holder}}</p>
  <p style="margin:0 0 6px;font-size:14px;"><span style="color:#A78BFA;">Account ID:</span> {{account_id}}</p>
  <p style="margin:0;font-size:14px;"><span style="color:#A78BFA;">Statement Period:</span> {{period_start}} – {{period_end}}</p>
</div>

<h3 style="color:#A78BFA;font-size:15px;margin:0 0 12px;">Account Summary</h3>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:8px 0;color:#9ca3af;font-size:14px;">Opening Balance</td><td style="text-align:right;font-size:14px;">\${{opening_balance}}</td></tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:8px 0;color:#9ca3af;font-size:14px;">Total Deposits</td><td style="text-align:right;color:#10b981;font-size:14px;">+\${{total_deposits}}</td></tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:8px 0;color:#9ca3af;font-size:14px;">Total Withdrawals</td><td style="text-align:right;color:#ef4444;font-size:14px;">–\${{total_withdrawals}}</td></tr>
  <tr style="border-top:2px solid #8A2BE2;"><td style="padding:12px 0;font-weight:700;">Closing Balance</td><td style="text-align:right;font-weight:700;font-size:18px;color:#A78BFA;">\${{closing_balance}}</td></tr>
</table>

<h3 style="color:#A78BFA;font-size:15px;margin:0 0 12px;">Gold Holdings</h3>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:8px 0;color:#9ca3af;font-size:14px;">Gold Balance</td><td style="text-align:right;font-weight:600;">{{gold_balance}} g</td></tr>
  <tr><td style="padding:8px 0;color:#9ca3af;font-size:14px;">Gold Value (USD)</td><td style="text-align:right;">\${{gold_value_usd}}</td></tr>
</table>

<p style="color:#9ca3af;font-size:13px;margin:0;">Generated on {{generated_date}}. Your full statement PDF is attached to this email.</p>
    `,
    variables: [
      { name: 'statement_month', description: 'Statement month' },
      { name: 'statement_year', description: 'Statement year' },
      { name: 'account_holder', description: 'Account holder name' },
      { name: 'account_id', description: 'Account ID' },
      { name: 'period_start', description: 'Period start date' },
      { name: 'period_end', description: 'Period end date' },
      { name: 'opening_balance', description: 'Opening balance' },
      { name: 'total_deposits', description: 'Total deposits' },
      { name: 'total_withdrawals', description: 'Total withdrawals' },
      { name: 'closing_balance', description: 'Closing balance' },
      { name: 'gold_balance', description: 'Gold balance in grams' },
      { name: 'gold_value_usd', description: 'Gold value in USD' },
      { name: 'generated_date', description: 'Statement generation date' },
    ],
    status: 'published' as const,
  },
];

// Seed email templates to database
export async function seedEmailTemplates(): Promise<void> {
  try {
    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      const existing = await getEmailTemplate(template.slug);
      if (!existing) {
        await db.insert(templates).values({
          slug: template.slug,
          name: template.name,
          type: template.type,
          module: template.module,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          status: template.status,
        });
        console.log(`[Email] Seeded template: ${template.slug}`);
      } else {
        await db.update(templates)
          .set({
            name: template.name,
            subject: template.subject,
            body: template.body,
            variables: template.variables,
            status: template.status,
          })
          .where(eq(templates.slug, template.slug));
      }
    }
    console.log('[Email] Template seeding complete');
  } catch (error) {
    console.error('[Email] Failed to seed templates:', error);
  }
}

// Send email with attachment
export async function sendEmailWithAttachment(
  to: string,
  templateSlugOrSubject: string,
  dataOrHtmlBody: Record<string, string> | string,
  attachments: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }> | {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Normalize attachments to always be an array
    const attachmentsArray = Array.isArray(attachments) ? attachments : [attachments];
    
    let subject: string;
    let htmlBody: string;
    
    // Check if second param is a template slug or direct subject
    if (typeof dataOrHtmlBody === 'object') {
      // Template-based email: templateSlugOrSubject is a template slug, dataOrHtmlBody is variables
      const template = await getEmailTemplate(templateSlugOrSubject);
      if (!template) {
        console.error(`[Email] Template not found: ${templateSlugOrSubject}`);
        return { success: false, error: `Email template not found: ${templateSlugOrSubject}` };
      }
      subject = template.subject;
      htmlBody = template.body;
      
      // Replace template variables
      for (const [key, value] of Object.entries(dataOrHtmlBody)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, value);
        htmlBody = htmlBody.replace(placeholder, value);
      }
    } else {
      // Direct email: templateSlugOrSubject is the subject, dataOrHtmlBody is the HTML body
      subject = templateSlugOrSubject;
      htmlBody = dataOrHtmlBody;
    }
    
    const branding = await getBrandingForEmail();
    const wrappedHtml = wrapEmailWithBranding(htmlBody, branding, to);

    if (!SMTP_USER || !SMTP_PASS) {
      console.log(`[Email Preview] To: ${to}`);
      console.log(`[Email Preview] Subject: ${subject}`);
      console.log(`[Email Preview] Attachments: ${attachmentsArray.map(a => a.filename).join(', ')}`);
      console.log(`[Email] SMTP not configured - email logged only`);
      return { success: true, messageId: 'preview-mode' };
    }

    const info = await sendMailWithRetry({
      from: SMTP_FROM,
      to,
      subject,
      html: wrappedHtml,
      attachments: attachmentsArray.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    console.log(`[Email] Sent with attachment to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send with attachment to ${to}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
