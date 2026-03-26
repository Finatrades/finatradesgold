import { getRedisClient } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import type { IStorage } from '../storage';

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

  const allUsers = await storage.getAllUsers();
  let sent = 0;

  for (const user of allUsers) {
    if (!user.email || user.status === 'Suspended') continue;
    try {
      const txns = await storage.getUserTransactions(user.id);
      const hadActivityInMonth = txns.some(t => {
        const d = new Date((t as any).createdAt || (t as any).completedAt || 0);
        return d >= prevMonthStart && d <= prevMonthEnd;
      });
      if (!hadActivityInMonth) continue;

      const wallet = await storage.getWallet(user.id);
      const goldBalance = parseFloat(wallet?.goldGrams?.toString() || '0');
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Client';

      sendEmail(user.email, EMAIL_TEMPLATES.MONTHLY_STATEMENT, {
        user_name: userName,
        statement_month: monthName,
        gold_balance: goldBalance.toFixed(4),
        statement_url: `${appBaseUrl}/dashboard`,
      }, { userId: user.id }).catch(e => console.error(`[Monthly Statement] Email failed for ${user.email}:`, e));
      sent++;
    } catch (e) {
      // Skip this user, continue with others
    }
  }

  await redis.set(monthKey, '1', { ex: MONTHLY_STMT_IDEMPOTENCY_TTL }).catch(() => {});
  console.log(`[Monthly Statement] Sent ${sent} statements for ${monthName}`);
}

export function startMonthlyStatementScheduler(storage: IStorage): void {
  const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check once per day
  console.log('[Monthly Statement] Scheduler started (fires on 1st of each month)');
  setInterval(() => {
    runMonthlyStatementJob(storage).catch(err => console.error('[Monthly Statement] Scheduler error:', err));
  }, CHECK_INTERVAL_MS);
}
