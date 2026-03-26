import { cacheGet, cacheSet } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import { db } from '../db';
import { users, userAccountStatus } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { IStorage } from '../storage';
import type { Transaction } from '../../shared/schema';

const ANNUAL_STMT_IDEMPOTENCY_TTL = 360 * 24 * 60 * 60; // 360 days

export async function runAnnualStatementJob(storage: IStorage): Promise<void> {
  const now = new Date();
  if (now.getMonth() !== 0 || now.getDate() !== 1) return; // Only January 1st

  const yearKey = `stmt:annual:${now.getFullYear()}`;
  const alreadyRan = await cacheGet(yearKey);
  if (alreadyRan) return;

  const prevYear = now.getFullYear() - 1;
  const prevYearStart = new Date(prevYear, 0, 1);
  const prevYearEnd = new Date(prevYear, 11, 31, 23, 59, 59, 999);
  const appBaseUrl = process.env.APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://finatrades.com');

  console.log(`[Annual Statement] Sending annual tax statements for ${prevYear}`);

  // Only email-verified, non-frozen users
  const allUsers = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.isEmailVerified, true));

  const frozenRows = await db
    .select({ userId: userAccountStatus.userId })
    .from(userAccountStatus)
    .where(eq(userAccountStatus.isFrozen, true));
  const frozenIds = new Set(frozenRows.map(r => r.userId));

  let sent = 0;
  for (const user of allUsers) {
    if (!user.email || frozenIds.has(user.id)) continue;
    try {
      const txns: Transaction[] = await storage.getUserTransactions(user.id);
      const hadActivityInYear = txns.some(t => {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        return d !== null && d >= prevYearStart && d <= prevYearEnd;
      });
      if (!hadActivityInYear) continue;

      const wallet = await storage.getWallet(user.id);
      const goldBalance = parseFloat(wallet?.goldGrams?.toString() || '0');
      const userName = `${user.firstName} ${user.lastName}`.trim() || 'Valued Client';

      sendEmail(user.email, EMAIL_TEMPLATES.ANNUAL_TAX_STATEMENT, {
        user_name: userName,
        tax_year: String(prevYear),
        gold_balance: goldBalance.toFixed(4),
        statement_url: `${appBaseUrl}/dashboard`,
      }, { userId: user.id }).catch(e => console.error(`[Annual Statement] Email failed for ${user.email}:`, e));
      sent++;
    } catch (e) {
      // Skip this user; non-fatal
    }
  }

  await cacheSet(yearKey, '1', ANNUAL_STMT_IDEMPOTENCY_TTL);
  console.log(`[Annual Statement] Sent ${sent} annual tax statements for ${prevYear}`);
}

export function startAnnualStatementScheduler(storage: IStorage): void {
  // Run immediately on startup in case the service was down at midnight on Jan 1st
  runAnnualStatementJob(storage).catch(err => console.error('[Annual Statement] Startup check error:', err));
  // Then check once per day
  setInterval(() => {
    runAnnualStatementJob(storage).catch(err => console.error('[Annual Statement] Scheduler error:', err));
  }, 24 * 60 * 60 * 1000);
  console.log('[Annual Statement] Scheduler started (fires on January 1st)');
}
