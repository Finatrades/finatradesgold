import { cacheGet, cacheSet } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import { db } from '../db';
import { users, userAccountStatus } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { IStorage } from '../storage';
import type { Transaction } from '../../shared/schema';
import { getGoldPricePerGram } from '../gold-price-service';

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

  // Fetch live gold price once for the entire batch (used as portfolio context only)
  const liveGoldPrice: number | null = await getGoldPricePerGram().catch(() => null);
  if (liveGoldPrice !== null) {
    console.log(`[Monthly Statement] Live gold price: $${liveGoldPrice.toFixed(2)}/g`);
  } else {
    console.warn('[Monthly Statement] Live gold price unavailable; portfolio_value_usd will show N/A');
  }

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

      // Compute opening and closing gold balances
      const wallet = await storage.getWallet(user.id);
      const closingGold = parseFloat(wallet?.goldGrams?.toString() || '0');
      let netChange = 0;
      for (const t of monthTxns) {
        const g = parseFloat(t.amountGold?.toString() || '0');
        if (t.type === 'Receive' || t.type === 'Deposit') netChange += g;
        else if (t.type === 'Send' || t.type === 'Withdrawal') netChange -= g;
      }
      const openingGold = closingGold - netChange;

      // Step 1: Average goldPriceUsdPerGram from this month's transactions
      const monthPrices = monthTxns
        .map(t => t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram.toString()) : 0)
        .filter(p => p > 0);
      let goldPrice: number | null = null;
      if (monthPrices.length > 0) {
        goldPrice = monthPrices.reduce((sum, p) => sum + p, 0) / monthPrices.length;
      }

      // Step 2: If no monthly price, fall back to most recent historical transaction with a price
      if (goldPrice === null) {
        const historicalWithPrice = txns
          .filter(t => {
            const p = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram.toString()) : 0;
            return p > 0;
          })
          .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

        if (historicalWithPrice.length > 0) {
          goldPrice = parseFloat(historicalWithPrice[0].goldPriceUsdPerGram!.toString());
        } else {
          // Step 3: Derive from amountUsd / amountGold — use most recent applicable record
          const derivable = txns
            .filter(t => {
              const g = parseFloat(t.amountGold?.toString() || '0');
              const u = parseFloat(t.amountUsd?.toString() || '0');
              return g > 0 && u > 0;
            })
            .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

          if (derivable.length > 0) {
            const g = parseFloat(derivable[0].amountGold!.toString());
            const u = parseFloat(derivable[0].amountUsd!.toString());
            goldPrice = g > 0 ? u / g : null;
          }
        }
      }

      if (goldPrice === null || goldPrice === 0) {
        console.warn(`[Monthly Statement] No gold price found for user ${user.id}; USD balance fields will show N/A`);
        goldPrice = null;
      } else if (goldPrice < 30 || goldPrice > 500) {
        console.warn(
          `[Monthly Statement] Anomalous gold price for user ${user.id}: $${goldPrice.toFixed(4)}/g — verify transaction data (expected $30–$500/g range)`
        );
      }

      // Compute gold market movement % for the month using first/last transaction prices
      const pricesInMonth = monthTxns
        .filter(t => {
          const p = t.goldPriceUsdPerGram ? parseFloat(t.goldPriceUsdPerGram.toString()) : 0;
          return p > 0;
        })
        .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());

      let goldPriceChangePct: string = 'N/A';
      if (pricesInMonth.length >= 2) {
        const openPrice = parseFloat(pricesInMonth[0].goldPriceUsdPerGram!.toString());
        const closePrice = parseFloat(pricesInMonth[pricesInMonth.length - 1].goldPriceUsdPerGram!.toString());
        if (openPrice > 0) {
          const changePct = ((closePrice - openPrice) / openPrice) * 100;
          goldPriceChangePct = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
        }
      } else if (pricesInMonth.length === 1 && liveGoldPrice !== null) {
        // Only one price point — compare start-of-month price vs live price
        const openPrice = parseFloat(pricesInMonth[0].goldPriceUsdPerGram!.toString());
        if (openPrice > 0) {
          const changePct = ((liveGoldPrice - openPrice) / openPrice) * 100;
          goldPriceChangePct = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
        }
      }

      const openingUsd = goldPrice !== null ? (openingGold * goldPrice).toFixed(2) : 'N/A';
      const closingUsd = goldPrice !== null ? (closingGold * goldPrice).toFixed(2) : 'N/A';
      const netChangeGold = netChange >= 0 ? `+${netChange.toFixed(4)}` : netChange.toFixed(4);
      const userName = `${user.firstName} ${user.lastName}`.trim() || 'Valued Client';

      // Portfolio context: use live gold price for "current value as of sending" snapshot
      const currentGoldPriceUsd = liveGoldPrice !== null ? liveGoldPrice.toFixed(2) : 'N/A';
      const portfolioValueUsd =
        liveGoldPrice !== null && closingGold > 0
          ? (closingGold * liveGoldPrice).toFixed(2)
          : 'N/A';

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
        current_gold_price_usd: currentGoldPriceUsd,
        portfolio_value_usd: portfolioValueUsd,
        gold_price_change_pct: goldPriceChangePct,
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
