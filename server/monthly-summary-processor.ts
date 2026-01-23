import { db } from './db';
import { users, wallets, userPreferences, vaultLedgerEntries, emailLogs } from '@shared/schema';
import { and, eq, gte, lte, sql, or, lt, desc } from 'drizzle-orm';
import { queueEmailWithTemplate, EMAIL_TEMPLATES } from './email';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { getGoldPrice } from './gold-price-service';

async function getUsersWithMonthlySummaryEnabled(): Promise<Array<{
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}>> {
  const results = await db
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      monthlySummaryEmails: userPreferences.monthlySummaryEmails,
    })
    .from(users)
    .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
    .where(
      and(
        eq(users.role, 'user'),
        or(
          eq(userPreferences.monthlySummaryEmails, true),
          sql`${userPreferences.monthlySummaryEmails} IS NULL`
        )
      )
    );

  return results.map(r => ({
    userId: r.userId,
    email: r.email,
    firstName: r.firstName || '',
    lastName: r.lastName || '',
  }));
}

async function wasMonthlySummarySent(userEmail: string, monthYear: string): Promise<boolean> {
  try {
    const notificationType = `monthly_summary_${monthYear}`;
    
    const [existingLog] = await db.select({ id: emailLogs.id })
      .from(emailLogs)
      .where(and(
        eq(emailLogs.recipientEmail, userEmail),
        eq(emailLogs.notificationType, notificationType),
        or(
          eq(emailLogs.status, 'Sent'),
          eq(emailLogs.status, 'Queued'),
          eq(emailLogs.status, 'Sending')
        )
      ))
      .limit(1);
    
    return !!existingLog;
  } catch (error) {
    console.error('[Monthly Summary] Error checking sent status:', error);
    return false;
  }
}

async function getUserMonthlySummary(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  openingBalanceGrams: number;
  closingBalanceGrams: number;
  totalDepositsGrams: number;
  totalWithdrawalsGrams: number;
  totalTransfersInGrams: number;
  totalTransfersOutGrams: number;
  externalTransactionCount: number;
}> {
  const [lastEntryBeforePeriod] = await db
    .select({ balanceAfterGrams: vaultLedgerEntries.balanceAfterGrams })
    .from(vaultLedgerEntries)
    .where(
      and(
        eq(vaultLedgerEntries.userId, userId),
        lt(vaultLedgerEntries.createdAt, periodStart)
      )
    )
    .orderBy(desc(vaultLedgerEntries.createdAt))
    .limit(1);

  const openingBalanceGrams = parseFloat(lastEntryBeforePeriod?.balanceAfterGrams || '0');

  const [lastEntryInPeriod] = await db
    .select({ balanceAfterGrams: vaultLedgerEntries.balanceAfterGrams })
    .from(vaultLedgerEntries)
    .where(
      and(
        eq(vaultLedgerEntries.userId, userId),
        gte(vaultLedgerEntries.createdAt, periodStart),
        lte(vaultLedgerEntries.createdAt, periodEnd)
      )
    )
    .orderBy(desc(vaultLedgerEntries.createdAt))
    .limit(1);

  let closingBalanceGrams: number;
  if (lastEntryInPeriod) {
    closingBalanceGrams = parseFloat(lastEntryInPeriod.balanceAfterGrams || '0');
  } else {
    closingBalanceGrams = openingBalanceGrams;
  }

  const ledgerEntries = await db
    .select({
      action: vaultLedgerEntries.action,
      goldGrams: vaultLedgerEntries.goldGrams,
    })
    .from(vaultLedgerEntries)
    .where(
      and(
        eq(vaultLedgerEntries.userId, userId),
        gte(vaultLedgerEntries.createdAt, periodStart),
        lte(vaultLedgerEntries.createdAt, periodEnd)
      )
    );

  let totalDepositsGrams = 0;
  let totalWithdrawalsGrams = 0;
  let totalTransfersInGrams = 0;
  let totalTransfersOutGrams = 0;
  let externalTransactionCount = 0;

  for (const entry of ledgerEntries) {
    const grams = Math.abs(parseFloat(entry.goldGrams || '0'));
    
    switch (entry.action) {
      case 'Deposit':
        totalDepositsGrams += grams;
        externalTransactionCount++;
        break;
      case 'Withdrawal':
        totalWithdrawalsGrams += grams;
        externalTransactionCount++;
        break;
      case 'Transfer_Receive':
        totalTransfersInGrams += grams;
        externalTransactionCount++;
        break;
      case 'Transfer_Send':
        totalTransfersOutGrams += grams;
        externalTransactionCount++;
        break;
    }
  }

  return {
    openingBalanceGrams,
    closingBalanceGrams,
    totalDepositsGrams,
    totalWithdrawalsGrams,
    totalTransfersInGrams,
    totalTransfersOutGrams,
    externalTransactionCount,
  };
}

export async function sendMonthlySummaryEmails(): Promise<{ sent: number; skipped: number; errors: number }> {
  console.log('[Monthly Summary] Starting monthly summary email processor...');
  
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const periodStart = startOfMonth(lastMonth);
  const periodEnd = endOfMonth(lastMonth);
  const monthName = format(lastMonth, 'MMMM yyyy');
  const monthYear = format(lastMonth, 'yyyy-MM');

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const eligibleUsers = await getUsersWithMonthlySummaryEnabled();
    console.log(`[Monthly Summary] Found ${eligibleUsers.length} users eligible for monthly summary`);

    const goldPrice = await getGoldPrice();
    const currentGoldPriceUsd = goldPrice?.pricePerGram || 0;

    for (const user of eligibleUsers) {
      try {
        const alreadySent = await wasMonthlySummarySent(user.email, monthYear);
        if (alreadySent) {
          skipped++;
          continue;
        }

        const summary = await getUserMonthlySummary(user.userId, periodStart, periodEnd);

        if (summary.externalTransactionCount === 0 && summary.closingBalanceGrams === 0) {
          skipped++;
          continue;
        }

        const closingValueUsd = (summary.closingBalanceGrams * currentGoldPriceUsd).toFixed(2);
        const openingValueUsd = (summary.openingBalanceGrams * currentGoldPriceUsd).toFixed(2);

        await queueEmailWithTemplate(
          user.email,
          EMAIL_TEMPLATES.MONTHLY_STATEMENT,
          {
            firstName: user.firstName || 'Valued Customer',
            lastName: user.lastName || '',
            monthName,
            periodStart: format(periodStart, 'MMM d, yyyy'),
            periodEnd: format(periodEnd, 'MMM d, yyyy'),
            openingBalanceGrams: summary.openingBalanceGrams.toFixed(4),
            openingValueUsd,
            closingBalanceGrams: summary.closingBalanceGrams.toFixed(4),
            closingValueUsd,
            totalDepositsGrams: summary.totalDepositsGrams.toFixed(4),
            totalWithdrawalsGrams: summary.totalWithdrawalsGrams.toFixed(4),
            totalTransfersInGrams: summary.totalTransfersInGrams.toFixed(4),
            totalTransfersOutGrams: summary.totalTransfersOutGrams.toFixed(4),
            transactionCount: summary.externalTransactionCount.toString(),
            currentGoldPriceUsd: currentGoldPriceUsd.toFixed(2),
            balanceChange: (summary.closingBalanceGrams - summary.openingBalanceGrams).toFixed(4),
            balanceChangePercent: summary.openingBalanceGrams > 0 
              ? (((summary.closingBalanceGrams - summary.openingBalanceGrams) / summary.openingBalanceGrams) * 100).toFixed(2)
              : '0.00',
          },
          { notificationType: `monthly_summary_${monthYear}`, userId: user.userId }
        );

        sent++;
      } catch (userError) {
        console.error(`[Monthly Summary] Error sending to user ${user.userId}:`, userError);
        errors++;
      }
    }

    console.log(`[Monthly Summary] Completed: ${sent} sent, ${skipped} skipped, ${errors} errors`);
  } catch (error) {
    console.error('[Monthly Summary] Processor error:', error);
  }

  return { sent, skipped, errors };
}

export function startMonthlySummaryScheduler(): void {
  const checkInterval = 60 * 60 * 1000;
  let lastCheckedMonth = '';

  const checkAndSend = async () => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    if (now.getDate() <= 5 && currentMonth !== lastCheckedMonth) {
      console.log('[Monthly Summary] First week of month detected, checking for pending summaries...');
      await sendMonthlySummaryEmails();
      lastCheckedMonth = currentMonth;
    }
  };

  setInterval(checkAndSend, checkInterval);
  
  setTimeout(async () => {
    const now = new Date();
    if (now.getDate() <= 5) {
      console.log('[Monthly Summary] Startup check for pending summaries...');
      await sendMonthlySummaryEmails();
      lastCheckedMonth = format(now, 'yyyy-MM');
    }
  }, 30000);
  
  console.log('[Monthly Summary] Scheduler started - will send during first 5 days of each month');
}
