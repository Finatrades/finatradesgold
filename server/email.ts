import nodemailer from 'nodemailer';
import { db } from './db';
import { templates, emailLogs, emailNotificationSettings, brandingSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { lookup } from 'dns/promises';
import net from 'net';

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

// Creative purple email template wrapper with logo header and footer
function wrapEmailWithBranding(body: string, branding: { logoUrl: string; companyName: string; primaryColor: string }): string {
  const primaryColor = '#8A2BE2'; // Official Finatrades purple
  const secondaryColor = '#A78BFA'; // Light purple
  const darkPurple = '#4B0082'; // Dark purple for accents
  
  // Styled text logo that works in all email clients (images often blocked by default)
  // Using purple gradient text simulation with background for professional look
  const logoSection = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr>
        <td style="padding-right: 12px; vertical-align: middle;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8A2BE2, #A78BFA); border-radius: 8px; text-align: center; line-height: 40px;">
            <span style="color: white; font-size: 24px; font-weight: bold;">F</span>
          </div>
        </td>
        <td style="vertical-align: middle;">
          <div style="font-size: 28px; font-weight: 800; color: #8A2BE2; letter-spacing: 1px; font-family: 'Segoe UI', Arial, sans-serif;">FINATRADES</div>
        </td>
      </tr>
    </table>
    <div style="font-size: 11px; color: rgba(255,255,255,0.85); letter-spacing: 3px; margin-top: 12px; text-transform: uppercase;">Gold-Backed Digital Finance</div>`;

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
                    
                    <!-- Contact & Links -->
                    <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 10px 0 5px;">
                      Need help? Contact us at <a href="mailto:support@finatrades.com" style="color: ${secondaryColor}; text-decoration: none;">support@finatrades.com</a>
                    </p>
                    
                    <!-- Legal -->
                    <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 15px 0 0; line-height: 1.5;">
                      This email was sent by Finatrades. Please do not reply directly to this email.<br/>
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
    htmlBody = wrapEmailWithBranding(htmlBody, branding);

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
  
  queueEmail(to, subject, htmlBody);
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
  
  // KYC
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
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
    subject: 'Welcome to Finatrades!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
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
            <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">Go to Dashboard</a>
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
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Email Verification</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8B5CF6;">{{verification_code}}</span>
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
            <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);">Start Trading</a>
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
            <a href="{{kyc_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Resubmit Documents</a>
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
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Purchase Confirmed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold purchase has been confirmed!</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td>Gold Amount:</td><td style="text-align: right; font-weight: bold;">{{gold_amount}}g</td></tr>
              <tr><td>Price per gram:</td><td style="text-align: right;">$\{{price_per_gram}}</td></tr>
              <tr><td>Total Paid:</td><td style="text-align: right; font-weight: bold; color: #8A2BE2;">$\{{total_amount}}</td></tr>
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
    subject: '{{sender_name}} sent you {{amount}} gold - Claim within 24 hours!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #4B0082); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">You've Received Gold!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello,</p>
          <p><strong>{{sender_name}}</strong> has sent you <strong>{{amount}}</strong> of physical gold via Finatrades!</p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;"><strong>⏰ Important:</strong> This gold is reserved for you for <strong>24 hours</strong>. Claim it before it expires!</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f8f4fc, #ede9fe); padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="font-size: 28px; font-weight: bold; color: #8A2BE2; margin: 0;">{{amount}}</p>
            <p style="color: #6b7280; margin: 5px 0 0 0;">of physical gold waiting for you</p>
          </div>
          
          <p>Finatrades is a gold-backed digital financial platform where you can:</p>
          <ul style="color: #374151;">
            <li>Own and store physical gold digitally</li>
            <li>Send gold to anyone, anywhere</li>
            <li>Access trade finance with gold-backed security</li>
          </ul>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{register_url}}" style="background: linear-gradient(135deg, #8A2BE2, #A342FF); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Claim Your Gold</a>
          </p>
          
          <p style="text-align: center; color: #6b7280; margin-top: 15px; font-size: 13px;">
            After registering, your gold will be automatically credited to your wallet.
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
              <tr><td style="padding: 8px 0;">Base Price:</td><td style="text-align: right; font-weight: bold; color: #8A2BE2;">\${'$'}{{base_price}}</td></tr>
              <tr><td style="padding: 8px 0;">Total Margin:</td><td style="text-align: right; font-weight: bold; color: #22c55e;">\${'$'}{{total_margin}}</td></tr>
              <tr><td style="padding: 8px 0;">Quarterly Payout:</td><td style="text-align: right; font-weight: bold;">\${'$'}{{quarterly_payout}}</td></tr>
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
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Certificate of Ownership</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Dear {{user_name}},</p>
          <p>Congratulations on your gold purchase! Your {{certificate_type}} certificate has been generated and is attached to this email.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8A2BE2;">
            <h3 style="margin: 0 0 15px 0; color: #ea580c;">Certificate Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Certificate No:</td><td style="text-align: right; font-weight: bold;">{{certificate_number}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Amount:</td><td style="text-align: right; font-weight: bold;">{{gold_amount}}g</td></tr>
              <tr><td style="padding: 8px 0;">Type:</td><td style="text-align: right; font-weight: bold;">{{certificate_type}}</td></tr>
              <tr><td style="padding: 8px 0;">Issue Date:</td><td style="text-align: right; font-weight: bold;">{{issue_date}}</td></tr>
            </table>
          </div>

          <p>This certificate serves as proof of your gold ownership stored at Wingold and Metals DMCC, Dubai.</p>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{vault_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View in FinaVault</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Invoice {{invoice_number}} - Gold Purchase',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Invoice</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Dear {{user_name}},</p>
          <p>Please find attached your invoice for the recent gold purchase.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Invoice No:</td><td style="text-align: right; font-weight: bold;">{{invoice_number}}</td></tr>
              <tr><td style="padding: 8px 0;">Date:</td><td style="text-align: right;">{{invoice_date}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Amount:</td><td style="text-align: right;">{{gold_amount}}g</td></tr>
              <tr><td style="padding: 8px 0; border-top: 1px solid #e5e7eb; margin-top: 10px;"><strong>Total Amount:</strong></td><td style="text-align: right; border-top: 1px solid #e5e7eb; font-weight: bold; color: #8A2BE2;">{{total_amount}}</td></tr>
            </table>
          </div>

          <p>Thank you for your purchase!</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Your {{document_type}} is expiring soon - Action Required',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Document Expiry Notice</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>This is a friendly reminder that your <strong>{{document_type}}</strong> is <strong>expiring on {{expiry_date}}</strong>.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>Document:</strong> {{document_type}}</p>
            <p style="margin: 8px 0 0 0;"><strong>Days remaining:</strong> {{days_remaining}} days</p>
          </div>
          
          <p>To continue using Finatrades services without interruption, please update your KYC documents before the expiry date.</p>
          
          <p><strong>What you need to do:</strong></p>
          <ol>
            <li>Obtain a new valid document</li>
            <li>Log in to your Finatrades account</li>
            <li>Go to Settings → KYC Verification</li>
            <li>Upload your new document</li>
          </ol>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{kyc_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Update Documents</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>If you have already renewed your documents, please disregard this message.</p>
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Reset your Finatrades password',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{reset_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Reset Password</a>
          </p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p>If you didn't request this, please ignore this email or contact support if you're concerned.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Your Finatrades password was changed',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Changed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your password was successfully changed on {{change_date}}.</p>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>If you didn't make this change</strong>, please reset your password immediately and contact our support team.</p>
          </div>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{security_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Review Security Settings</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'New login to your Finatrades account',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Login Detected</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>We detected a new login to your account:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Device:</td><td style="text-align: right;">{{device_info}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Location:</td><td style="text-align: right;">{{location}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Time:</td><td style="text-align: right;">{{login_time}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">IP Address:</td><td style="text-align: right;">{{ip_address}}</td></tr>
            </table>
          </div>
          <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{security_url}}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Secure My Account</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Your Finatrades account has been locked',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Account Locked</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your account has been temporarily locked due to <strong>{{lock_reason}}</strong>.</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0;">Your account will be unlocked after {{unlock_time}}.</p>
          </div>
          <p>If you believe this was a mistake, please contact our support team.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{support_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Contact Support</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Suspicious activity detected on your Finatrades account',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Security Alert</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>We detected suspicious activity on your account:</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0;"><strong>Activity:</strong> {{activity_description}}</p>
            <p style="margin: 10px 0 0 0;"><strong>Time:</strong> {{activity_time}}</p>
          </div>
          <p><strong>Recommended actions:</strong></p>
          <ol>
            <li>Change your password immediately</li>
            <li>Enable two-factor authentication</li>
            <li>Review your recent transactions</li>
          </ol>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{security_url}}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Secure My Account</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Gold sale confirmed - {{gold_amount}}g',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Gold Sale Confirmed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold sale has been successfully processed.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Reference:</td><td style="text-align: right; font-weight: bold;">{{reference_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Sold:</td><td style="text-align: right;">{{gold_amount}}g</td></tr>
              <tr><td style="padding: 8px 0;">Price per gram:</td><td style="text-align: right;">${'$'}{{price_per_gram}}</td></tr>
              <tr><td style="padding: 8px 0; border-top: 1px solid #e5e7eb;"><strong>Total Received:</strong></td><td style="text-align: right; border-top: 1px solid #e5e7eb; font-weight: bold; color: #22c55e;">${'$'}{{total_amount}}</td></tr>
            </table>
          </div>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Card Payment Receipt - ${{amount}} | Certificate {{certificate_number}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Receipt</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Card Transaction Successful</p>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Dear {{user_name}},</p>
          <p>Your card payment has been successfully processed. Below are the transaction details and your gold ownership certificate.</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="margin: 0 0 15px 0; color: #16a34a;">Transaction Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td><td style="text-align: right; font-weight: bold;">{{reference_id}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date & Time:</td><td style="text-align: right; font-weight: bold;">{{transaction_date}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Payment Method:</td><td style="text-align: right; font-weight: bold;">Card ending {{card_last4}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td><td style="text-align: right; font-weight: bold; font-size: 18px; color: #22c55e;">\${{amount}} USD</td></tr>
            </table>
          </div>

          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b;">
            <div style="text-align: center; margin-bottom: 15px;">
              <span style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 2px;">Certificate of Gold Ownership</span>
            </div>
            <h2 style="margin: 0 0 20px 0; color: #92400e; text-align: center; font-size: 20px;">Digital Gold Certificate</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px 0; color: #78350f; border-bottom: 1px dashed #d97706;">Certificate Number:</td><td style="text-align: right; font-weight: bold; color: #92400e; border-bottom: 1px dashed #d97706;">{{certificate_number}}</td></tr>
              <tr><td style="padding: 10px 0; color: #78350f; border-bottom: 1px dashed #d97706;">Gold Amount:</td><td style="text-align: right; font-weight: bold; color: #92400e; font-size: 18px; border-bottom: 1px dashed #d97706;">{{gold_grams}}g</td></tr>
              <tr><td style="padding: 10px 0; color: #78350f; border-bottom: 1px dashed #d97706;">Gold Price:</td><td style="text-align: right; font-weight: bold; color: #92400e; border-bottom: 1px dashed #d97706;">\${{gold_price}}/gram</td></tr>
              <tr><td style="padding: 10px 0; color: #78350f; border-bottom: 1px dashed #d97706;">Storage Location:</td><td style="text-align: right; font-weight: bold; color: #92400e; border-bottom: 1px dashed #d97706;">Dubai, UAE</td></tr>
              <tr><td style="padding: 10px 0; color: #78350f;">Custodian:</td><td style="text-align: right; font-weight: bold; color: #92400e;">Wingold & Metals DMCC</td></tr>
            </table>
            <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #d97706;">
              <p style="font-size: 11px; color: #92400e; margin: 0;">This certificate confirms your ownership of physical gold securely stored in insured vaults.</p>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Your Updated Wallet Balance</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; color: #6b7280;">Total Gold Holdings:</td><td style="text-align: right; font-weight: bold;">{{total_gold_grams}}g</td></tr>
              <tr><td style="padding: 5px 0; color: #6b7280;">Estimated Value:</td><td style="text-align: right; font-weight: bold;">\${{total_value_usd}} USD</td></tr>
            </table>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="{{dashboard_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View in Dashboard</a>
          </p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            If you did not authorize this transaction, please contact our support team immediately.
          </p>
        </div>
        <div style="padding: 20px; background: #1f2937; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0 0 10px 0;">Finatrades - Gold-Backed Digital Finance</p>
          <p style="margin: 0; font-size: 10px;">This is an automated receipt. Please keep this email for your records.</p>
        </div>
      </div>
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
    subject: 'Deposit of ${{amount}} received',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Deposit Received</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your deposit has been credited to your account.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 0;">${'$'}{{amount}}</p>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Reference: {{reference_id}}</p>
          </div>
          <p>Your funds are now available for trading.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Your deposit of ${{amount}} is being processed',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Deposit Processing</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>We've received your deposit request and it's currently being processed.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #1d4ed8; margin: 0;">${'$'}{{amount}}</p>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Estimated completion: {{estimated_time}}</p>
          </div>
          <p>You'll receive another email once your deposit has been credited.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Withdrawal request for ${{amount}} received',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Withdrawal Requested</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your withdrawal request has been submitted and is pending review.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right; font-weight: bold;">${'$'}{{amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Method:</td><td style="text-align: right;">{{withdrawal_method}}</td></tr>
              <tr><td style="padding: 8px 0;">Reference:</td><td style="text-align: right;">{{reference_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right;"><span style="color: #f59e0b;">Pending</span></td></tr>
            </table>
          </div>
          <p>Processing typically takes 1-3 business days. You'll receive updates via email.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Your withdrawal of ${{amount}} is being processed',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Withdrawal Processing</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your withdrawal has been approved and is now being processed.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right; font-weight: bold;">${'$'}{{amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right;"><span style="color: #3b82f6;">Processing</span></td></tr>
              <tr><td style="padding: 8px 0;">Expected arrival:</td><td style="text-align: right;">{{estimated_time}}</td></tr>
            </table>
          </div>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Your withdrawal of ${{amount}} is complete',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Withdrawal Complete</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your withdrawal has been successfully processed and sent to your account.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 0;">${'$'}{{amount}}</p>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Reference: {{reference_id}}</p>
          </div>
          <p>The funds should appear in your bank account within 1-2 business days.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Transaction failed - Action required',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Transaction Failed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Unfortunately, your transaction could not be completed.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0;"><strong>Transaction:</strong> {{transaction_type}}</p>
            <p style="margin: 10px 0 0 0;"><strong>Amount:</strong> ${'$'}{{amount}}</p>
            <p style="margin: 10px 0 0 0;"><strong>Reason:</strong> {{failure_reason}}</p>
          </div>
          <p>Please review and try again, or contact support if the issue persists.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{support_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Contact Support</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Low balance alert - Your wallet balance is low',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Low Balance Alert</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your wallet balance has fallen below your alert threshold.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="color: #6b7280; margin: 0;">Current Balance</p>
            <p style="font-size: 32px; font-weight: bold; color: #f59e0b; margin: 5px 0;">${'$'}{{current_balance}}</p>
            <p style="color: #6b7280; margin: 0;">Threshold: ${'$'}{{threshold}}</p>
          </div>
          <p>Consider adding funds to continue trading without interruption.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{deposit_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Add Funds</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'You sent {{gold_amount}}g gold to {{recipient_name}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Transfer Sent</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold transfer has been initiated.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">To:</td><td style="text-align: right; font-weight: bold;">{{recipient_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right;">{{gold_amount}}g gold</td></tr>
              <tr><td style="padding: 8px 0;">Value:</td><td style="text-align: right;">${'$'}{{usd_value}}</td></tr>
              <tr><td style="padding: 8px 0;">Reference:</td><td style="text-align: right;">{{reference_id}}</td></tr>
            </table>
          </div>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Gold transfer pending - {{gold_amount}}g',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Transfer Pending</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold transfer is being processed and awaiting confirmation.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">To:</td><td style="text-align: right;">{{recipient_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right;">{{gold_amount}}g gold</td></tr>
              <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right;"><span style="color: #3b82f6;">Pending</span></td></tr>
            </table>
          </div>
          <p>You'll receive a confirmation email once the transfer is complete.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Transfer completed - {{gold_amount}}g gold',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Transfer Complete</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold transfer has been successfully completed.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">To:</td><td style="text-align: right; font-weight: bold;">{{recipient_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right;">{{gold_amount}}g gold</td></tr>
              <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right;"><span style="color: #22c55e;">Completed</span></td></tr>
            </table>
          </div>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Transfer cancelled - {{gold_amount}}g gold',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Transfer Cancelled</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your gold transfer has been cancelled.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">To:</td><td style="text-align: right;">{{recipient_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right;">{{gold_amount}}g gold</td></tr>
              <tr><td style="padding: 8px 0;">Reason:</td><td style="text-align: right;">{{cancellation_reason}}</td></tr>
            </table>
          </div>
          <p>The gold has been returned to your wallet.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Payment reminder - ${{amount}} due on {{due_date}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Reminder</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>This is a friendly reminder that your BNSL payment is due soon.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Plan:</td><td style="text-align: right; font-weight: bold;">{{plan_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount Due:</td><td style="text-align: right; font-weight: bold; color: #f59e0b;">${'$'}{{amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Due Date:</td><td style="text-align: right;">{{due_date}}</td></tr>
            </table>
          </div>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{payment_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Make Payment</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Payment received - ${{amount}} for {{plan_name}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Received</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your BNSL payment has been successfully processed.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Plan:</td><td style="text-align: right;">{{plan_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount Paid:</td><td style="text-align: right; font-weight: bold; color: #22c55e;">${'$'}{{amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Remaining Balance:</td><td style="text-align: right;">${'$'}{{remaining_balance}}</td></tr>
              <tr><td style="padding: 8px 0;">Next Payment:</td><td style="text-align: right;">{{next_due_date}}</td></tr>
            </table>
          </div>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'URGENT: Payment overdue - ${{amount}} for {{plan_name}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Overdue</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your BNSL payment is <strong>overdue</strong>. Please make payment immediately to avoid penalties.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Plan:</td><td style="text-align: right;">{{plan_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount Overdue:</td><td style="text-align: right; font-weight: bold; color: #ef4444;">${'$'}{{amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Days Overdue:</td><td style="text-align: right;">{{days_overdue}} days</td></tr>
              <tr><td style="padding: 8px 0;">Late Fee:</td><td style="text-align: right;">${'$'}{{late_fee}}</td></tr>
            </table>
          </div>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{payment_url}}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Pay Now</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Congratulations! Your BNSL plan is complete',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Plan Completed!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Congratulations! You have successfully completed your BNSL plan.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; color: #22c55e; margin: 0;">{{gold_amount}}g Gold</p>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Now fully owned!</p>
          </div>
          <p>Your gold has been transferred to your FinaVault. You can now:</p>
          <ul>
            <li>Hold it in your vault</li>
            <li>Sell at market price</li>
            <li>Transfer to another user</li>
            <li>Request physical delivery</li>
          </ul>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'BNSL Plan Early Exit Confirmation',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Early Exit Processed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your early exit from the BNSL plan has been processed.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Plan:</td><td style="text-align: right;">{{plan_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount Paid:</td><td style="text-align: right;">${'$'}{{amount_paid}}</td></tr>
              <tr><td style="padding: 8px 0;">Exit Penalty:</td><td style="text-align: right; color: #ef4444;">${'$'}{{penalty_amount}}</td></tr>
              <tr><td style="padding: 8px 0; border-top: 1px solid #e5e7eb;"><strong>Gold Received:</strong></td><td style="text-align: right; border-top: 1px solid #e5e7eb; font-weight: bold;">{{gold_received}}g</td></tr>
            </table>
          </div>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Trade case created - {{case_id}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Trade Case Created</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your trade finance case has been successfully created.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Case ID:</td><td style="text-align: right; font-weight: bold;">{{case_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Type:</td><td style="text-align: right;">{{case_type}}</td></tr>
              <tr><td style="padding: 8px 0;">Amount:</td><td style="text-align: right;">${'$'}{{amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right;"><span style="color: #3b82f6;">Pending Review</span></td></tr>
            </table>
          </div>
          <p>Our team will review your case and update you on the next steps.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Trade case {{case_id}} - Status update',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Status Update</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your trade case status has been updated.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Case ID:</td><td style="text-align: right; font-weight: bold;">{{case_id}}</td></tr>
              <tr><td style="padding: 8px 0;">New Status:</td><td style="text-align: right; font-weight: bold; color: #3b82f6;">{{new_status}}</td></tr>
              <tr><td style="padding: 8px 0;">Updated:</td><td style="text-align: right;">{{update_date}}</td></tr>
            </table>
          </div>
          <p><strong>Notes:</strong> {{status_notes}}</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Documents required for trade case {{case_id}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Documents Required</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>We need additional documents to proceed with your trade case.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 10px 0;"><strong>Case ID:</strong> {{case_id}}</p>
            <p style="margin: 0;"><strong>Required Documents:</strong></p>
            <p style="margin: 10px 0 0 0;">{{required_documents}}</p>
          </div>
          <p>Please upload the documents as soon as possible to avoid delays.</p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="{{upload_url}}" style="background: #8A2BE2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Upload Documents</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
    subject: 'Trade case {{case_id}} approved!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Case Approved!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Great news! Your trade finance case has been approved.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Case ID:</td><td style="text-align: right; font-weight: bold;">{{case_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Credit Limit:</td><td style="text-align: right; font-weight: bold; color: #22c55e;">${'$'}{{credit_limit}}</td></tr>
              <tr><td style="padding: 8px 0;">Valid Until:</td><td style="text-align: right;">{{valid_until}}</td></tr>
            </table>
          </div>
          <p>You can now proceed with your trade transactions.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Trade case {{case_id}} completed',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Case Completed</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your trade finance case has been successfully completed.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Case ID:</td><td style="text-align: right; font-weight: bold;">{{case_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Total Value:</td><td style="text-align: right;">${'$'}{{total_value}}</td></tr>
              <tr><td style="padding: 8px 0;">Completed:</td><td style="text-align: right;">{{completion_date}}</td></tr>
            </table>
          </div>
          <p>Thank you for using FinaBridge trade finance services.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'New proposal for your trade request {{trade_ref}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Trade Proposal</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>You've received a new proposal for your trade request!</p>
          <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Proposed Price:</td><td style="text-align: right;">\${{proposed_price}}</td></tr>
              <tr><td style="padding: 8px 0;">Delivery Terms:</td><td style="text-align: right;">{{delivery_terms}}</td></tr>
              <tr><td style="padding: 8px 0;">Exporter:</td><td style="text-align: right;">{{exporter_name}}</td></tr>
            </table>
          </div>
          <p>Review this proposal in your FinaBridge dashboard to accept or negotiate.</p>
          <p style="text-align: center; margin-top: 20px;">
            <a href="{{dashboard_url}}" style="background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Proposal</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
      </div>
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
    subject: 'Your proposal has been accepted - {{trade_ref}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Proposal Accepted!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Great news! Your trade proposal has been accepted by the importer.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Trade Value:</td><td style="text-align: right;">\${{trade_value}}</td></tr>
              <tr><td style="padding: 8px 0;">Settlement Gold:</td><td style="text-align: right;">{{gold_grams}}g</td></tr>
            </table>
          </div>
          <p>A Deal Room has been created for this trade. Visit your dashboard to proceed with the next steps.</p>
          <p style="text-align: center; margin-top: 20px;">
            <a href="{{dashboard_url}}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Go to Deal Room</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
      </div>
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
    subject: 'Shipment update for {{trade_ref}} - {{shipment_status}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Shipment Update</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>There's an update on your trade shipment.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right; color: #1d4ed8; font-weight: bold;">{{shipment_status}}</td></tr>
              <tr><td style="padding: 8px 0;">Tracking Number:</td><td style="text-align: right;">{{tracking_number}}</td></tr>
              <tr><td style="padding: 8px 0;">Location:</td><td style="text-align: right;">{{current_location}}</td></tr>
            </table>
          </div>
          <p style="text-align: center; margin-top: 20px;">
            <a href="{{dashboard_url}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Track Shipment</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
      </div>
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
    subject: 'Gold locked for trade {{trade_ref}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Settlement Gold Locked</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Gold has been locked in escrow for your trade.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Locked:</td><td style="text-align: right; font-weight: bold;">{{gold_grams}}g</td></tr>
              <tr><td style="padding: 8px 0;">USD Value:</td><td style="text-align: right;">\${{usd_value}}</td></tr>
              <tr><td style="padding: 8px 0;">Lock Expires:</td><td style="text-align: right;">{{expiry_date}}</td></tr>
            </table>
          </div>
          <p>This gold will be held securely until shipment is confirmed or the trade is completed.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
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
    subject: 'Gold released for trade {{trade_ref}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Gold Released!</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>The settlement gold for your trade has been released to the exporter.</p>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Gold Released:</td><td style="text-align: right; font-weight: bold;">{{gold_grams}}g</td></tr>
              <tr><td style="padding: 8px 0;">USD Value:</td><td style="text-align: right;">\${{usd_value}}</td></tr>
              <tr><td style="padding: 8px 0;">Released To:</td><td style="text-align: right;">{{exporter_name}}</td></tr>
            </table>
          </div>
          <p>Your trade has been successfully completed. Thank you for using FinaBridge!</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
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
    subject: 'Your KYC submission is under review',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">KYC Under Review</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Thank you for submitting your KYC documents. Your application is currently under review.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="color: #3b82f6; font-weight: bold; margin: 0;">Estimated review time: 1-2 business days</p>
          </div>
          <p>We'll notify you via email once the review is complete.</p>
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
  // Trade Case Rejected
  {
    slug: EMAIL_TEMPLATES.TRADE_CASE_REJECTED,
    name: 'Trade Case Rejected',
    type: 'email' as const,
    module: 'trade_finance',
    subject: 'Trade case {{trade_ref}} has been rejected',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Trade Case Rejected</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>We regret to inform you that your trade case has been rejected.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Rejection Reason:</td><td style="text-align: right;">{{rejection_reason}}</td></tr>
              <tr><td style="padding: 8px 0;">Rejected On:</td><td style="text-align: right;">{{rejection_date}}</td></tr>
            </table>
          </div>
          <p>If you have questions about this decision, please contact our support team.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
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
    subject: 'New document uploaded for trade {{trade_ref}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Document Uploaded</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>A new document has been uploaded for your trade case.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Document Type:</td><td style="text-align: right;">{{document_type}}</td></tr>
              <tr><td style="padding: 8px 0;">Uploaded By:</td><td style="text-align: right;">{{uploaded_by}}</td></tr>
              <tr><td style="padding: 8px 0;">Upload Date:</td><td style="text-align: right;">{{upload_date}}</td></tr>
            </table>
          </div>
          <p>Log in to your account to view the document.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
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
    subject: 'Trade proposal for {{trade_ref}} has been declined',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Proposal Declined</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>The trade proposal you submitted has been declined.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Proposal Amount:</td><td style="text-align: right;">\${{proposal_amount}}</td></tr>
              <tr><td style="padding: 8px 0;">Declined Reason:</td><td style="text-align: right;">{{decline_reason}}</td></tr>
            </table>
          </div>
          <p>You may submit a revised proposal if you wish to continue with this trade.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
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
    subject: 'Deal room created for trade {{trade_ref}}',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Deal Room Created</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>A secure deal room has been created for your trade negotiation.</p>
          <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Trade Reference:</td><td style="text-align: right; font-weight: bold;">{{trade_ref}}</td></tr>
              <tr><td style="padding: 8px 0;">Deal Room ID:</td><td style="text-align: right;">{{deal_room_id}}</td></tr>
              <tr><td style="padding: 8px 0;">Counterparty:</td><td style="text-align: right;">{{counterparty_name}}</td></tr>
              <tr><td style="padding: 8px 0;">Created:</td><td style="text-align: right;">{{created_date}}</td></tr>
            </table>
          </div>
          <p>Access your deal room to communicate securely with your counterparty and manage trade documents.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades FinaBridge - Trade Finance Solutions</p>
        </div>
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
    subject: 'Your {{month}} {{year}} Account Statement',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2, #6B21A8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Monthly Statement</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your account statement for {{month}} {{year}} is now available.</p>
          <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #c2410c; margin-top: 0;">Account Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Opening Balance:</td><td style="text-align: right;">{{opening_gold}}g (\${{opening_usd}})</td></tr>
              <tr><td style="padding: 8px 0;">Closing Balance:</td><td style="text-align: right; font-weight: bold;">{{closing_gold}}g (\${{closing_usd}})</td></tr>
              <tr><td style="padding: 8px 0;">Total Transactions:</td><td style="text-align: right;">{{total_transactions}}</td></tr>
              <tr><td style="padding: 8px 0;">Net Change:</td><td style="text-align: right;">{{net_change_gold}}g</td></tr>
            </table>
          </div>
          <p>Your detailed statement is attached to this email.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
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
    subject: 'Your {{year}} Annual Tax Statement',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #047857); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Annual Tax Statement</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>Hello {{user_name}},</p>
          <p>Your annual tax statement for the year {{year}} is now available.</p>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #047857; margin-top: 0;">Annual Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Total Gold Purchased:</td><td style="text-align: right;">{{total_purchases_gold}}g</td></tr>
              <tr><td style="padding: 8px 0;">Total Gold Sold:</td><td style="text-align: right;">{{total_sales_gold}}g</td></tr>
              <tr><td style="padding: 8px 0;">Realized Gains/Losses:</td><td style="text-align: right; font-weight: bold;">\${{realized_gains}}</td></tr>
              <tr><td style="padding: 8px 0;">Year-End Holdings:</td><td style="text-align: right;">{{year_end_gold}}g</td></tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px;"><em>Note: This statement is for informational purposes only. Please consult your tax advisor for filing requirements.</em></p>
          <p>Your detailed tax statement is attached to this email.</p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
        </div>
      </div>
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
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff; border: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="color: #8A2BE2; font-size: 28px; margin: 0;">INVOICE</h1>
            <p style="color: #6b7280; margin: 5px 0;">{{invoice_number}}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; color: #1f2937;">Finatrades</div>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Gold-Backed Digital Finance</p>
          </div>
        </div>
        <div style="margin-bottom: 30px;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
            <p style="margin: 0 0 5px 0;"><strong>Bill To:</strong></p>
            <p style="margin: 0; color: #1f2937;">{{customer_name}}</p>
            <p style="margin: 0; color: #6b7280;">{{customer_email}}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Description</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Quantity</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">999.9 Fine Gold</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">{{gold_amount}}g</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${'$'}{{price_per_gram}}/g</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${'$'}{{subtotal}}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Fees:</td>
              <td style="padding: 12px; text-align: right;">${'$'}{{fees}}</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #8A2BE2;">${'$'}{{total}}</td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align: center; color: #6b7280; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>Thank you for your purchase. | Invoice Date: {{invoice_date}}</p>
        </div>
      </div>
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
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff;">
        <div style="border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #1e40af; font-size: 24px; margin: 0;">ACCOUNT STATEMENT</h1>
          <p style="color: #6b7280; margin: 5px 0;">{{statement_month}} {{statement_year}}</p>
        </div>
        <div style="margin-bottom: 30px;">
          <p><strong>Account Holder:</strong> {{account_holder}}</p>
          <p><strong>Account ID:</strong> {{account_id}}</p>
          <p><strong>Statement Period:</strong> {{period_start}} - {{period_end}}</p>
        </div>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="color: #1e40af; margin: 0 0 15px 0;">Account Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;">Opening Balance:</td><td style="text-align: right;">${'$'}{{opening_balance}}</td></tr>
            <tr><td style="padding: 8px 0;">Total Deposits:</td><td style="text-align: right; color: #16a34a;">+${'$'}{{total_deposits}}</td></tr>
            <tr><td style="padding: 8px 0;">Total Withdrawals:</td><td style="text-align: right; color: #dc2626;">-${'$'}{{total_withdrawals}}</td></tr>
            <tr style="font-weight: bold; border-top: 2px solid #1e40af;"><td style="padding: 12px 0;">Closing Balance:</td><td style="text-align: right; font-size: 18px;">${'$'}{{closing_balance}}</td></tr>
          </table>
        </div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e40af;">Gold Holdings</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;">Gold Balance:</td><td style="text-align: right; font-weight: bold;">{{gold_balance}} grams</td></tr>
            <tr><td style="padding: 8px 0;">Gold Value (USD):</td><td style="text-align: right;">${'$'}{{gold_value_usd}}</td></tr>
          </table>
        </div>
        <div style="text-align: center; color: #6b7280; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>Finatrades - Gold-Backed Digital Finance</p>
          <p>Generated on: {{generated_date}}</p>
        </div>
      </div>
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
      html: htmlBody,
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
