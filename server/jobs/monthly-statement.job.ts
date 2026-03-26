import { cacheGet, cacheSet } from '../redis-client';
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
  const alreadyRan = await cacheGet(monthKey);
  if (alreadyRan) return;

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const monthName = prevMonthStart.toLocaleDateString('en-US', { month: 'long' });
  const yearName = String(prevMonthStart.getFullYear());

  console.log(`[Monthly Statement] Sending monthly statements for ${monthName} ${yearName}`);

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

      const monthTxns = txns.filter(t => {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        return d !== null && d >= prevMonthStart && d <= prevMonthEnd;
      });
      if (monthTxns.length === 0) continue;

      // Compute opening and closing balances from transaction history
      const wallet = await storage.getWallet(user.id);
      const closingGold = parseFloat(wallet?.goldGrams?.toString() || '0');

      // Net change: sum of credited amounts minus debited amounts in the month
      let netChange = 0;
      for (const t of monthTxns) {
        const g = parseFloat(t.amountGold?.toString() || '0');
        if (t.type === 'Receive' || t.type === 'Deposit') netChange += g;
        else if (t.type === 'Send' || t.type === 'Withdrawal') netChange -= g;
      }
      const openingGold = closingGold - netChange;

      const goldPrice = 90; // Approximate fallback; jobs don't have price fn access
      const openingUsd = (openingGold * goldPrice).toFixed(2);
      const closingUsd = (closingGold * goldPrice).toFixed(2);
      const netChangeGold = netChange >= 0 ? `+${netChange.toFixed(4)}` : netChange.toFixed(4);
      const userName = `${user.firstName} ${user.lastName}`.trim() || 'Valued Client';

      sendEmail(user.email, EMAIL_TEMPLATES.MONTHLY_STATEMENT, {
        user_name: userName,
        month: monthName,
        year: yearName,
        opening_gold: openingGold.toFixed(4),
        opening_usd: openingUsd,
        closing_gold: closingGold.toFixed(4),
        closing_usd: closingUsd,
        total_transactions: String(monthTxns.length),
        net_change_gold: netChangeGold,
      }, { userId: user.id }).catch(e => console.error(`[Monthly Statement] Email failed for ${user.email}:`, e));
      sent++;
    } catch (e) {
      // Skip this user; non-fatal
    }
  }

  await cacheSet(monthKey, '1', MONTHLY_STMT_IDEMPOTENCY_TTL);
  console.log(`[Monthly Statement] Sent ${sent} statements for ${monthName} ${yearName}`);
}

export function startMonthlyStatementScheduler(storage: IStorage): void {
  runMonthlyStatementJob(storage).catch(err => console.error('[Monthly Statement] Startup check error:', err));
  setInterval(() => {
    runMonthlyStatementJob(storage).catch(err => console.error('[Monthly Statement] Scheduler error:', err));
  }, 24 * 60 * 60 * 1000);
  console.log('[Monthly Statement] Scheduler started (fires on 1st of each month)');
}
