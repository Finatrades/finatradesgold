import { db } from './db';
import { kycSubmissions, users } from '@shared/schema';
import { and, lte, gte, eq, isNotNull, count, sql } from 'drizzle-orm';
import { queueEmailWithTemplate, EMAIL_TEMPLATES } from './email';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

const REMINDER_THRESHOLDS = [30, 14, 7, 3, 1];

export interface ExpiringDocument {
  userId: string;
  userEmail: string;
  userName: string;
  kycSubmissionId: string;
  idExpiryDate: Date;
  daysUntilExpiry: number;
}

export async function getExpiringDocuments(daysAhead: number = 30): Promise<ExpiringDocument[]> {
  const now = new Date();
  const futureDate = addDays(now, daysAhead);
  
  const results = await db
    .select({
      kycSubmissionId: kycSubmissions.id,
      userId: kycSubmissions.userId,
      idExpiryDate: kycSubmissions.idExpiryDate,
      userEmail: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(kycSubmissions)
    .innerJoin(users, eq(users.id, kycSubmissions.userId))
    .where(
      and(
        isNotNull(kycSubmissions.idExpiryDate),
        gte(kycSubmissions.idExpiryDate, now),
        lte(kycSubmissions.idExpiryDate, futureDate),
        eq(kycSubmissions.status, 'Approved')
      )
    );

  return results.map((r) => ({
    userId: r.userId,
    userEmail: r.userEmail,
    userName: `${r.firstName} ${r.lastName}`,
    kycSubmissionId: r.kycSubmissionId,
    idExpiryDate: r.idExpiryDate!,
    daysUntilExpiry: differenceInCalendarDays(r.idExpiryDate!, now),
  }));
}

export async function sendDocumentExpiryReminders(): Promise<{
  sent: number;
  errors: number;
  details: Array<{ email: string; daysRemaining: number; success: boolean }>;
}> {
  const expiringDocs = await getExpiringDocuments(30);
  
  const results: Array<{ email: string; daysRemaining: number; success: boolean }> = [];
  let sent = 0;
  let errors = 0;

  for (const doc of expiringDocs) {
    const shouldSendReminder = REMINDER_THRESHOLDS.includes(doc.daysUntilExpiry);
    
    if (!shouldSendReminder) {
      continue;
    }

    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://finatrades.com';
      
      await queueEmailWithTemplate(doc.userEmail, EMAIL_TEMPLATES.DOCUMENT_EXPIRY_REMINDER, {
        user_name: doc.userName,
        expiry_date: format(doc.idExpiryDate, 'MMMM d, yyyy'),
        days_remaining: doc.daysUntilExpiry.toString(),
        kyc_url: `${baseUrl}/kyc`,
      });

      console.log(`[Document Expiry] Queued reminder for ${doc.userEmail}, expires in ${doc.daysUntilExpiry} days`);
      results.push({ email: doc.userEmail, daysRemaining: doc.daysUntilExpiry, success: true });
      sent++;
    } catch (error) {
      console.error(`[Document Expiry] Failed to queue reminder for ${doc.userEmail}:`, error);
      results.push({ email: doc.userEmail, daysRemaining: doc.daysUntilExpiry, success: false });
      errors++;
    }
  }

  console.log(`[Document Expiry] Sent ${sent} reminders, ${errors} errors`);
  return { sent, errors, details: results };
}

export async function getDocumentExpiryStats(): Promise<{
  expiringSoon: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
  expired: number;
}> {
  const now = new Date();
  const oneWeek = addDays(now, 7);
  const oneMonth = addDays(now, 30);

  const [weekResult] = await db
    .select({ count: count() })
    .from(kycSubmissions)
    .where(
      and(
        isNotNull(kycSubmissions.idExpiryDate),
        gte(kycSubmissions.idExpiryDate, now),
        lte(kycSubmissions.idExpiryDate, oneWeek),
        eq(kycSubmissions.status, 'Approved')
      )
    );

  const [monthResult] = await db
    .select({ count: count() })
    .from(kycSubmissions)
    .where(
      and(
        isNotNull(kycSubmissions.idExpiryDate),
        gte(kycSubmissions.idExpiryDate, now),
        lte(kycSubmissions.idExpiryDate, oneMonth),
        eq(kycSubmissions.status, 'Approved')
      )
    );

  const [expiredResult] = await db
    .select({ count: count() })
    .from(kycSubmissions)
    .where(
      and(
        isNotNull(kycSubmissions.idExpiryDate),
        lte(kycSubmissions.idExpiryDate, now),
        eq(kycSubmissions.status, 'Approved')
      )
    );

  return {
    expiringSoon: Number(weekResult?.count ?? 0),
    expiringThisWeek: Number(weekResult?.count ?? 0),
    expiringThisMonth: Number(monthResult?.count ?? 0),
    expired: Number(expiredResult?.count ?? 0),
  };
}

let expiryCheckInterval: NodeJS.Timeout | null = null;

export function startDocumentExpiryScheduler(): void {
  if (expiryCheckInterval) {
    console.log('[Document Expiry] Scheduler already running');
    return;
  }

  console.log('[Document Expiry] Starting daily scheduler');
  
  sendDocumentExpiryReminders().catch(console.error);
  
  expiryCheckInterval = setInterval(() => {
    sendDocumentExpiryReminders().catch(console.error);
  }, 24 * 60 * 60 * 1000);
}

export function stopDocumentExpiryScheduler(): void {
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
    expiryCheckInterval = null;
    console.log('[Document Expiry] Scheduler stopped');
  }
}
