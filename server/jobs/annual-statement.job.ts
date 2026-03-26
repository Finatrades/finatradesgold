import { getRedisClient } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import type { IStorage } from '../storage';

const ANNUAL_STMT_IDEMPOTENCY_TTL = 360 * 24 * 60 * 60; // 360 days

export async function runAnnualStatementJob(storage: IStorage): Promise<void> {
  const now = new Date();
  if (now.getMonth() !== 0 || now.getDate() !== 1) return; // Only January 1st

  const yearKey = `stmt:annual:${now.getFullYear()}`;
  const redis = getRedisClient();
  const alreadyRan = await redis.get(yearKey).catch(() => null);
  if (alreadyRan) return;

  const prevYear = now.getFullYear() - 1;
  const prevYearStart = new Date(prevYear, 0, 1);
  const prevYearEnd = new Date(prevYear, 11, 31, 23, 59, 59, 999);
  const appBaseUrl = process.env.APP_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'https://finatrades.com');

  console.log(`[Annual Statement] Sending annual tax statements for ${prevYear}`);

  const allUsers = await storage.getAllUsers();
  let sent = 0;

  for (const user of allUsers) {
    if (!user.email || user.status === 'Suspended') continue;
    try {
      const txns = await storage.getUserTransactions(user.id);
      const hadActivityInYear = txns.some(t => {
        const d = new Date((t as any).createdAt || (t as any).completedAt || 0);
        return d >= prevYearStart && d <= prevYearEnd;
      });
      if (!hadActivityInYear) continue;

      const wallet = await storage.getWallet(user.id);
      const goldBalance = parseFloat(wallet?.goldGrams?.toString() || '0');
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Client';

      sendEmail(user.email, EMAIL_TEMPLATES.ANNUAL_TAX_STATEMENT, {
        user_name: userName,
        tax_year: String(prevYear),
        gold_balance: goldBalance.toFixed(4),
        statement_url: `${appBaseUrl}/dashboard`,
      }, { userId: user.id }).catch(e => console.error(`[Annual Statement] Email failed for ${user.email}:`, e));
      sent++;
    } catch (e) {
      // Skip this user, continue with others
    }
  }

  await redis.set(yearKey, '1', { ex: ANNUAL_STMT_IDEMPOTENCY_TTL }).catch(() => {});
  console.log(`[Annual Statement] Sent ${sent} annual tax statements for ${prevYear}`);
}

export function startAnnualStatementScheduler(storage: IStorage): void {
  const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check once per day
  console.log('[Annual Statement] Scheduler started (fires on January 1st)');
  setInterval(() => {
    runAnnualStatementJob(storage).catch(err => console.error('[Annual Statement] Scheduler error:', err));
  }, CHECK_INTERVAL_MS);
}
