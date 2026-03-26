import { getRedisClient } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import { db } from '../db';
import { users, userAccountStatus } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { IStorage } from '../storage';
import type { Transaction } from '../../shared/schema';

const MONTHLY_STMT_IDEMPOTENCY_TTL = 25 * 24 * 60 * 60; // 25 days

export async function runMonthlyStatementJob(storage: IStorage): Promise<void> {
  const now = new Date();
  if (now.getDate() !== 1) return;

  const monthKey = `stmt:monthly:${now.getFullYear()}-${now.getMonth()}`;
  const redis = getRedisClient();
  const alreadyRan = await redis.get(monthKey).catch(() => null);
  if (alreadyRan) return;

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const monthName = prevMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const appBaseUrl = process.env.APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://finatrades.com');

  console.log(`[Monthly Statement] Sending monthly statements for ${monthName}`);

  // Fetch only active (email-verified, non-frozen) users
  const allUsers = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.isEmailVerified, true));

  // Fetch all frozen user IDs for exclusion
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
      const hadActivityInMonth = txns.some(t => {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        return d !== null && d >= prevMonthStart && d <= prevMonthEnd;
      });
      if (!hadActivityInMonth) continue;

      const wallet = await storage.getWallet(user.id);
      const goldBalance = parseFloat(wallet?.goldGrams?.toString() || '0');
      const userName = `${user.firstName} ${user.lastName}`.trim() || 'Valued Client';

      sendEmail(user.email, EMAIL_TEMPLATES.MONTHLY_STATEMENT, {
        user_name: userName,
        statement_month: monthName,
        gold_balance: goldBalance.toFixed(4),
        statement_url: `${appBaseUrl}/dashboard`,
      }, { userId: user.id }).catch(e => console.error(`[Monthly Statement] Email failed for ${user.email}:`, e));
      sent++;
    } catch (e) {
      // Skip this user; non-fatal
    }
  }

  await redis.set(monthKey, '1', { ex: MONTHLY_STMT_IDEMPOTENCY_TTL }).catch(() => {});
  console.log(`[Monthly Statement] Sent ${sent} statements for ${monthName}`);
}

export function startMonthlyStatementScheduler(storage: IStorage): void {
  // Run immediately on startup in case the service was down at midnight on the 1st
  runMonthlyStatementJob(storage).catch(err => console.error('[Monthly Statement] Startup check error:', err));
  // Then check once per day
  setInterval(() => {
    runMonthlyStatementJob(storage).catch(err => console.error('[Monthly Statement] Scheduler error:', err));
  }, 24 * 60 * 60 * 1000);
  console.log('[Monthly Statement] Scheduler started (fires on 1st of each month)');
}
