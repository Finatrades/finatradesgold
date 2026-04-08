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

  console.log(`[Annual Statement] Sending annual tax statements for ${prevYear}`);

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

      const yearTxns = txns.filter(t => {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        return d !== null && d >= prevYearStart && d <= prevYearEnd;
      });
      if (yearTxns.length === 0) continue;

      // Compute weighted-average cost basis per gram from ALL buy transactions (not just this year)
      const allBuyTxns = txns.filter(t =>
        (t.type === 'Receive' || t.type === 'Deposit') && parseFloat(t.amountGold?.toString() || '0') > 0
      );
      let wacgTotalGold = 0;
      let wacgTotalUsd = 0;
      for (const bt of allBuyTxns) {
        const g = parseFloat(bt.amountGold?.toString() || '0');
        // Prefer stored goldPriceUsdPerGram; fall back to amountUsd / amountGold ratio
        const pricePerGram = bt.goldPriceUsdPerGram
          ? parseFloat(bt.goldPriceUsdPerGram.toString())
          : (g > 0 ? parseFloat(bt.amountUsd?.toString() || '0') / g : 0);
        wacgTotalGold += g;
        wacgTotalUsd += g * pricePerGram;
      }
      const wacgPerGram = wacgTotalGold > 0 ? wacgTotalUsd / wacgTotalGold : 0;
      if (wacgPerGram > 0 && (wacgPerGram < 30 || wacgPerGram > 500)) {
        console.warn(
          `[Annual Statement] Anomalous WACG price for user ${user.id}: $${wacgPerGram.toFixed(4)}/g — verify transaction data (expected $30–$500/g range)`
        );
      }

      // Compute summary values from this year's transactions
      let totalPurchasesGold = 0;
      let totalSalesGold = 0;
      let realizedGains = 0;
      for (const t of yearTxns) {
        const g = parseFloat(t.amountGold?.toString() || '0');
        const usd = parseFloat(t.amountUsd?.toString() || '0');
        if (t.type === 'Receive' || t.type === 'Deposit') {
          totalPurchasesGold += g;
        } else if (t.type === 'Send' || t.type === 'Withdrawal') {
          totalSalesGold += g;
          const costBasis = g * wacgPerGram;
          realizedGains += usd - costBasis;
        }
      }

      const wallet = await storage.getWallet(user.id);
      const yearEndGold = parseFloat(wallet?.goldGrams?.toString() || '0');
      const userName = `${user.firstName} ${user.lastName}`.trim() || 'Valued Client';

      sendEmail(user.email, EMAIL_TEMPLATES.ANNUAL_TAX_STATEMENT, {
        user_name: userName,
        year: String(prevYear),
        total_purchases_gold: totalPurchasesGold.toFixed(4),
        total_sales_gold: totalSalesGold.toFixed(4),
        realized_gains: realizedGains.toFixed(2),
        year_end_gold: yearEndGold.toFixed(4),
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
  runAnnualStatementJob(storage).catch(err => console.error('[Annual Statement] Startup check error:', err));
  setInterval(() => {
    runAnnualStatementJob(storage).catch(err => console.error('[Annual Statement] Scheduler error:', err));
  }, 24 * 60 * 60 * 1000);
  console.log('[Annual Statement] Scheduler started (fires on January 1st)');
}
