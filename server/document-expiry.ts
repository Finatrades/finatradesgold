import { db } from './db';
import { kycSubmissions, users, finatradesPersonalKyc, finatradesCorporateKyc, emailLogs } from '@shared/schema';
import { and, lte, gte, eq, isNotNull, count, sql, or, like } from 'drizzle-orm';
import { queueEmailWithTemplate, EMAIL_TEMPLATES } from './email';
import { format, addDays, differenceInCalendarDays, parseISO, startOfDay, endOfDay } from 'date-fns';

const REMINDER_THRESHOLDS = [30, 14, 7, 3, 1];

async function wasReminderSentToday(
  userEmail: string, 
  documentType: string, 
  daysUntilExpiry: number
): Promise<boolean> {
  try {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    const notificationType = `document_expiry_${documentType}_${daysUntilExpiry}d`;
    
    const [existingLog] = await db.select({ id: emailLogs.id })
      .from(emailLogs)
      .where(and(
        eq(emailLogs.recipientEmail, userEmail),
        like(emailLogs.notificationType, `document_expiry_${documentType}%`),
        gte(emailLogs.createdAt, todayStart),
        lte(emailLogs.createdAt, todayEnd)
      ))
      .limit(1);
    
    return !!existingLog;
  } catch (error) {
    console.error('[Document Expiry] Error checking sent reminders:', error);
    return false;
  }
}

export interface ExpiringDocument {
  userId: string;
  userEmail: string;
  userName: string;
  kycSubmissionId: string;
  documentType: 'passport' | 'id' | 'trade_license' | 'director_passport';
  expiryDate: Date;
  daysUntilExpiry: number;
}

export async function getExpiringDocuments(daysAhead: number = 30): Promise<ExpiringDocument[]> {
  const now = new Date();
  const futureDate = addDays(now, daysAhead);
  const expiringDocs: ExpiringDocument[] = [];
  
  // Check legacy KYC submissions
  try {
    const legacyResults = await db
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

    for (const r of legacyResults) {
      expiringDocs.push({
        userId: r.userId,
        userEmail: r.userEmail,
        userName: `${r.firstName} ${r.lastName}`,
        kycSubmissionId: r.kycSubmissionId,
        documentType: 'id',
        expiryDate: r.idExpiryDate!,
        daysUntilExpiry: differenceInCalendarDays(r.idExpiryDate!, now),
      });
    }
  } catch (err) {
    console.error('[Document Expiry] Error checking legacy KYC:', err);
  }
  
  // Check Finatrades Personal KYC - passport expiry
  try {
    const personalResults = await db
      .select({
        kycId: finatradesPersonalKyc.id,
        userId: finatradesPersonalKyc.userId,
        passportExpiryDate: finatradesPersonalKyc.passportExpiryDate,
        userEmail: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(finatradesPersonalKyc)
      .innerJoin(users, eq(users.id, finatradesPersonalKyc.userId))
      .where(
        and(
          isNotNull(finatradesPersonalKyc.passportExpiryDate),
          eq(finatradesPersonalKyc.status, 'Approved')
        )
      );

    for (const r of personalResults) {
      if (r.passportExpiryDate) {
        const expiry = typeof r.passportExpiryDate === 'string' ? parseISO(r.passportExpiryDate) : r.passportExpiryDate;
        if (isNaN(expiry.getTime())) continue;
        const daysUntil = differenceInCalendarDays(expiry, now);
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          expiringDocs.push({
            userId: r.userId,
            userEmail: r.userEmail,
            userName: `${r.firstName} ${r.lastName}`,
            kycSubmissionId: r.kycId,
            documentType: 'passport',
            expiryDate: expiry,
            daysUntilExpiry: daysUntil,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Document Expiry] Error checking personal KYC:', err);
  }
  
  // Check Finatrades Corporate KYC - trade license and director passport expiry
  try {
    const corporateResults = await db
      .select({
        kycId: finatradesCorporateKyc.id,
        userId: finatradesCorporateKyc.userId,
        companyName: finatradesCorporateKyc.companyName,
        tradeLicenseExpiryDate: finatradesCorporateKyc.tradeLicenseExpiryDate,
        directorPassportExpiryDate: finatradesCorporateKyc.directorPassportExpiryDate,
        userEmail: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(finatradesCorporateKyc)
      .innerJoin(users, eq(users.id, finatradesCorporateKyc.userId))
      .where(eq(finatradesCorporateKyc.status, 'Approved'));

    for (const r of corporateResults) {
      const userName = r.companyName || `${r.firstName} ${r.lastName}`;
      
      if (r.tradeLicenseExpiryDate) {
        const expiry = typeof r.tradeLicenseExpiryDate === 'string' ? parseISO(r.tradeLicenseExpiryDate) : r.tradeLicenseExpiryDate;
        if (!isNaN(expiry.getTime())) {
          const daysUntil = differenceInCalendarDays(expiry, now);
          if (daysUntil >= 0 && daysUntil <= daysAhead) {
            expiringDocs.push({
              userId: r.userId,
              userEmail: r.userEmail,
              userName,
              kycSubmissionId: r.kycId,
              documentType: 'trade_license',
              expiryDate: expiry,
              daysUntilExpiry: daysUntil,
            });
          }
        }
      }
      
      if (r.directorPassportExpiryDate) {
        const expiry = typeof r.directorPassportExpiryDate === 'string' ? parseISO(r.directorPassportExpiryDate) : r.directorPassportExpiryDate;
        if (!isNaN(expiry.getTime())) {
          const daysUntil = differenceInCalendarDays(expiry, now);
          if (daysUntil >= 0 && daysUntil <= daysAhead) {
            expiringDocs.push({
              userId: r.userId,
              userEmail: r.userEmail,
              userName,
              kycSubmissionId: r.kycId,
              documentType: 'director_passport',
              expiryDate: expiry,
              daysUntilExpiry: daysUntil,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[Document Expiry] Error checking corporate KYC:', err);
  }

  return expiringDocs;
}

const DOCUMENT_TYPE_LABELS: Record<ExpiringDocument['documentType'], string> = {
  passport: 'Passport',
  id: 'ID Document',
  trade_license: 'Trade License',
  director_passport: 'Director Passport',
};

export async function sendDocumentExpiryReminders(): Promise<{
  sent: number;
  errors: number;
  skipped: number;
  details: Array<{ email: string; daysRemaining: number; documentType: string; success: boolean; skipped?: boolean }>;
}> {
  const expiringDocs = await getExpiringDocuments(30);
  
  const results: Array<{ email: string; daysRemaining: number; documentType: string; success: boolean; skipped?: boolean }> = [];
  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const doc of expiringDocs) {
    const shouldSendReminder = REMINDER_THRESHOLDS.includes(doc.daysUntilExpiry);
    
    if (!shouldSendReminder) {
      continue;
    }

    const documentLabel = DOCUMENT_TYPE_LABELS[doc.documentType];

    // Check if reminder was already sent today to prevent duplicates
    const alreadySent = await wasReminderSentToday(doc.userEmail, doc.documentType, doc.daysUntilExpiry);
    if (alreadySent) {
      console.log(`[Document Expiry] SKIPPED (already sent today): ${doc.userEmail} - ${documentLabel}`);
      results.push({ email: doc.userEmail, daysRemaining: doc.daysUntilExpiry, documentType: documentLabel, success: true, skipped: true });
      skipped++;
      continue;
    }

    try {
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://finatrades.com';
      
      await queueEmailWithTemplate(doc.userEmail, EMAIL_TEMPLATES.DOCUMENT_EXPIRY_REMINDER, {
        user_name: doc.userName,
        document_type: documentLabel,
        expiry_date: format(doc.expiryDate, 'MMMM d, yyyy'),
        days_remaining: doc.daysUntilExpiry.toString(),
        kyc_url: `${baseUrl}/kyc`,
      }, {
        notificationType: `document_expiry_${doc.documentType}_${doc.daysUntilExpiry}d`,
        userId: doc.userId,
      });

      console.log(`[Document Expiry] Queued reminder for ${doc.userEmail} - ${documentLabel} expires in ${doc.daysUntilExpiry} days`);
      results.push({ email: doc.userEmail, daysRemaining: doc.daysUntilExpiry, documentType: documentLabel, success: true });
      sent++;
    } catch (error) {
      console.error(`[Document Expiry] Failed to queue reminder for ${doc.userEmail}:`, error);
      results.push({ email: doc.userEmail, daysRemaining: doc.daysUntilExpiry, documentType: DOCUMENT_TYPE_LABELS[doc.documentType], success: false });
      errors++;
    }
  }

  console.log(`[Document Expiry] Sent ${sent} reminders, ${skipped} skipped (already sent), ${errors} errors`);
  return { sent, errors, skipped, details: results };
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
