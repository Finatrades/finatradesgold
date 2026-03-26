import { cacheGet, cacheSet } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import { notifyError } from '../system-notifications';
import { db } from '../db';
import { bnslPlans, bnslPayouts } from '../../shared/schema';
import { eq, lte, inArray, and } from 'drizzle-orm';
import type { IStorage } from '../storage';

const ADMIN_EMAILS = ['macy@finatrades.com', 'farah@finatrades.com', 'reda@finatrades.com'];
const LAST_RUN_KEY = 'bnsl:autopay:lastrun';
const HIGH_RISK_FAILURE_DAYS = 3;

interface PayoutEngineStats {
  timestamp: string;
  processed: number;
  failed: number;
  maturing: number;
  highRiskFlagged: number;
}

async function notifyAdminsInApp(
  storage: IStorage,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error',
  link?: string,
): Promise<void> {
  try {
    const allUsers = await storage.getAllUsers();
    const admins = allUsers.filter(u => u.role === 'admin');
    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        title,
        message,
        type,
        link: link || null,
        read: false,
      });
    }
  } catch (err) {
    console.error('[BNSL Payout Engine] notifyAdminsInApp failed:', err);
  }
}

export async function runBnslPayoutEngine(
  storage: IStorage,
  getGoldPricePerGram: () => Promise<number>,
): Promise<PayoutEngineStats> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const stats: PayoutEngineStats = {
    timestamp: now.toISOString(),
    processed: 0,
    failed: 0,
    maturing: 0,
    highRiskFlagged: 0,
  };

  console.log('[BNSL Payout Engine] Running automated payout cycle...');

  // Fetch all active or maturing plans
  const allPlans = await storage.getAllBnslPlans();
  const eligiblePlans = allPlans.filter(p => p.status === 'Active' || p.status === 'Maturing');

  // Get live gold price once for this run — abort if unavailable
  let goldPrice: number;
  try {
    goldPrice = await getGoldPricePerGram();
    if (!goldPrice || goldPrice <= 0) throw new Error('Invalid gold price returned');
  } catch (priceErr) {
    const errMsg = priceErr instanceof Error ? priceErr.message : String(priceErr);
    console.error('[BNSL Payout Engine] Cannot fetch gold price — aborting run:', errMsg);
    await notifyError({
      error: priceErr instanceof Error ? priceErr : new Error(errMsg),
      context: 'bnsl-payout-engine:gold-price-fetch',
      route: '/jobs/bnsl-payout',
    });
    stats.timestamp = now.toISOString();
    await cacheSet(LAST_RUN_KEY, JSON.stringify(stats), 48 * 60 * 60);
    return stats;
  }

  for (const plan of eligiblePlans) {
    const payouts = await storage.getPlanPayouts(plan.id);
    const duePending = payouts.filter(p =>
      p.status === 'Scheduled' && new Date(p.scheduledDate) <= today,
    );

    for (const payout of duePending) {
      const idempotencyKey = `bnsl:autopay:payout:${payout.id}`;
      const alreadyDone = await cacheGet(idempotencyKey);
      if (alreadyDone) continue;

      try {
        const monetaryAmount = parseFloat(payout.monetaryAmountUsd.toString());
        const gramsCredited = monetaryAmount / goldPrice;

        // Credit user's FinaPay wallet
        const wallet = await storage.getWallet(plan.userId);
        if (!wallet) throw new Error(`Wallet not found for user ${plan.userId}`);

        const currentGold = parseFloat(wallet.goldGrams);
        await storage.updateWallet(wallet.id, {
          goldGrams: (currentGold + gramsCredited).toFixed(6),
        });

        // Mark payout as Paid
        await storage.updateBnslPayout(payout.id, {
          status: 'Paid',
          marketPriceUsdPerGram: goldPrice.toFixed(2),
          gramsCredited: gramsCredited.toFixed(6),
          paidAt: new Date(),
          failureReason: null,
        });

        // Update plan paid/remaining margin tracking
        const currentPaidUsd = parseFloat(plan.paidMarginUsd?.toString() || '0');
        const currentPaidGrams = parseFloat(plan.paidMarginGrams?.toString() || '0');
        await storage.updateBnslPlan(plan.id, {
          paidMarginUsd: (currentPaidUsd + monetaryAmount).toFixed(2),
          paidMarginGrams: (currentPaidGrams + gramsCredited).toFixed(6),
          remainingMarginUsd: (parseFloat(plan.remainingMarginUsd?.toString() || '0') - monetaryAmount).toFixed(2),
        });

        // Transaction record
        await storage.createTransaction({
          userId: plan.userId,
          type: 'Receive',
          status: 'Completed',
          amountGold: gramsCredited.toFixed(6),
          amountUsd: monetaryAmount.toFixed(2),
          goldPriceUsdPerGram: goldPrice.toFixed(2),
          description: `BNSL Auto Payout #${payout.sequence} — ${plan.contractId}`,
          sourceModule: 'bnsl',
          bnslPlanId: plan.id,
          bnslPayoutId: payout.id,
        });

        // Vault ledger entry
        const { vaultLedgerService } = await import('../vault-ledger-service');
        await vaultLedgerService.recordLedgerEntry({
          userId: plan.userId,
          action: 'Payout_Credit',
          goldGrams: gramsCredited,
          goldPriceUsdPerGram: goldPrice,
          fromWallet: 'BNSL',
          toWallet: 'FinaPay',
          fromStatus: 'Locked_BNSL',
          toStatus: 'Available',
          bnslPlanId: plan.id,
          bnslPayoutId: payout.id,
          notes: `BNSL Auto Payout #${payout.sequence}: ${gramsCredited.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
          createdBy: 'system',
        });

        // Audit log
        await storage.createAuditLog({
          entityType: 'bnsl',
          entityId: plan.id,
          actionType: 'update',
          actor: 'system',
          actorRole: 'system',
          details: `Auto payout #${payout.sequence}: ${gramsCredited.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
        });

        // Idempotency: mark this payout as processed (60-day TTL)
        await cacheSet(idempotencyKey, '1', 60 * 24 * 60 * 60);
        stats.processed++;
        console.log(`[BNSL Payout Engine] Paid #${payout.sequence} for plan ${plan.contractId}: ${gramsCredited.toFixed(4)}g`);

        // Notify user of successful payout credit
        const planUser = await storage.getUser(plan.userId).catch(() => null);
        if (planUser?.email) {
          const remainingUsd = parseFloat(plan.remainingMarginUsd?.toString() || '0') - monetaryAmount;
          const freshPayouts = await storage.getPlanPayouts(plan.id).catch(() => []);
          const nextPayout = freshPayouts.find(p => p.status === 'Scheduled');
          sendEmail(planUser.email, EMAIL_TEMPLATES.BNSL_PAYMENT_RECEIVED, {
            user_name: `${planUser.firstName || ''} ${planUser.lastName || ''}`.trim() || 'Valued Partner',
            plan_name: plan.contractId,
            amount: monetaryAmount.toFixed(2),
            remaining_balance: Math.max(0, remainingUsd).toFixed(2),
            next_due_date: nextPayout?.scheduledDate
              ? new Date(nextPayout.scheduledDate).toLocaleDateString()
              : 'All payments settled',
          }).catch(err => console.error('[BNSL Payout Engine] User email failed:', err));
        }
      } catch (err) {
        const failureReason = err instanceof Error ? err.message : String(err);
        console.error(`[BNSL Payout Engine] Failed payout ${payout.id} for plan ${plan.contractId}:`, failureReason);

        // Persist failure reason on the payout record
        await storage.updateBnslPayout(payout.id, {
          status: 'Failed',
          failureReason,
        }).catch(() => null);
        stats.failed++;

        // System error alert via notifyError (throttled, writes to system_logs)
        await notifyError({
          error: err instanceof Error ? err : new Error(failureReason),
          context: `bnsl-payout-engine:payout-failed:${payout.id}`,
          route: '/jobs/bnsl-payout',
          userId: plan.userId,
          requestData: { planId: plan.id, contractId: plan.contractId, payoutSequence: payout.sequence },
        });

        // Admin in-app notification + email
        await notifyAdminsInApp(
          storage,
          `BNSL Auto Payout Failed`,
          `Payout #${payout.sequence} on plan ${plan.contractId} failed: ${failureReason.substring(0, 120)}`,
          'error',
          '/admin/bnsl',
        );
        const planUser = await storage.getUser(plan.userId).catch(() => null);
        const userName = planUser ? `${planUser.firstName} ${planUser.lastName}` : plan.userId;
        for (const adminEmail of ADMIN_EMAILS) {
          sendEmail(adminEmail, EMAIL_TEMPLATES.BNSL_PAYMENT_OVERDUE, {
            user_name: `Admin`,
            plan_name: `${plan.contractId} (payout #${payout.sequence}) — ${userName}`,
            amount: parseFloat(payout.monetaryAmountUsd.toString()).toFixed(2),
            days_overdue: '0',
            late_fee: '0.00',
            payment_url: `https://finatrades.com/admin/bnsl`,
          }).catch(() => null);
        }
      }
    }

    // After processing due payouts, check maturity transition:
    // Plan is eligible to become Maturing only if:
    //   1. All payouts are Paid or Cancelled (no more scheduled/pending)
    //   2. The plan's maturityDate is on or before today (term has been reached)
    if (duePending.length > 0) {
      const freshPayouts = await storage.getPlanPayouts(plan.id);
      const allSettled = freshPayouts.every(p => p.status === 'Paid' || p.status === 'Cancelled');
      const maturityDate = plan.maturityDate ? new Date(plan.maturityDate) : null;
      const termReached = maturityDate !== null && maturityDate <= today;

      if (allSettled && termReached && plan.status === 'Active') {
        await storage.updateBnslPlan(plan.id, { status: 'Maturing' }).catch(() => null);
        stats.maturing++;
        console.log(`[BNSL Payout Engine] Plan ${plan.contractId} moved to Maturing — term date ${maturityDate!.toISOString().slice(0,10)} reached`);

        // Admin notification: base settlement requires manual review
        await notifyAdminsInApp(
          storage,
          `BNSL Plan Ready for Base Settlement`,
          `Plan ${plan.contractId} has completed all margin payouts and reached term. Base settlement review required.`,
          'warning',
          '/admin/bnsl',
        );
        for (const adminEmail of ADMIN_EMAILS) {
          sendEmail(adminEmail, EMAIL_TEMPLATES.BNSL_PAYMENT_RECEIVED, {
            user_name: 'Admin',
            plan_name: `${plan.contractId} — BASE SETTLEMENT REQUIRED`,
            amount: parseFloat(plan.basePriceComponentUsd?.toString() || '0').toFixed(2),
            remaining_balance: '0.00',
            next_due_date: 'Immediate — manual base settlement required',
          }).catch(() => null);
        }
      }
    }
  }

  // High-risk flagging: plans with any Failed payout whose scheduled date is >3 days old
  const cutoffDate = new Date(now.getTime() - HIGH_RISK_FAILURE_DAYS * 24 * 60 * 60 * 1000);
  const failedPayouts = await db
    .select({ planId: bnslPayouts.planId })
    .from(bnslPayouts)
    .where(and(eq(bnslPayouts.status, 'Failed'), lte(bnslPayouts.scheduledDate, cutoffDate)));

  const highRiskPlanIds = [...new Set(failedPayouts.map(p => p.planId))];
  for (const planId of highRiskPlanIds) {
    const updated = await db
      .update(bnslPlans)
      .set({ planRiskLevel: 'High Risk' })
      .where(and(eq(bnslPlans.id, planId), inArray(bnslPlans.status, ['Active', 'Maturing'])))
      .returning()
      .catch(() => []);

    if (updated.length > 0) {
      const flaggedPlan = updated[0];
      stats.highRiskFlagged++;

      // Emit in-app admin alert for high-risk escalation
      await notifyAdminsInApp(
        storage,
        `BNSL Plan Escalated to High Risk`,
        `Plan ${flaggedPlan.contractId} has been flagged High Risk: a payout has been overdue for more than ${HIGH_RISK_FAILURE_DAYS} days.`,
        'error',
        '/admin/bnsl',
      );

      await notifyError({
        error: new Error(`BNSL plan ${flaggedPlan.contractId} escalated to High Risk (payout overdue >${HIGH_RISK_FAILURE_DAYS} days)`),
        context: `bnsl-payout-engine:high-risk-flag:${planId}`,
        route: '/jobs/bnsl-payout',
      });
    }
  }

  if (highRiskPlanIds.length > 0) {
    console.log(`[BNSL Payout Engine] Flagged ${stats.highRiskFlagged} plan(s) as High Risk`);
  }

  stats.timestamp = now.toISOString();
  await cacheSet(LAST_RUN_KEY, JSON.stringify(stats), 48 * 60 * 60);

  console.log(
    `[BNSL Payout Engine] Cycle complete — processed: ${stats.processed}, failed: ${stats.failed}, maturing: ${stats.maturing}, high-risk: ${stats.highRiskFlagged}`,
  );
  return stats;
}

export async function getPayoutEngineStatus(): Promise<PayoutEngineStats | null> {
  const raw = await cacheGet(LAST_RUN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PayoutEngineStats;
  } catch {
    return null;
  }
}

export function startBnslPayoutEngine(
  storage: IStorage,
  getGoldPricePerGram: () => Promise<number>,
): void {
  runBnslPayoutEngine(storage, getGoldPricePerGram).catch(err =>
    console.error('[BNSL Payout Engine] Startup run error:', err),
  );
  setInterval(() => {
    runBnslPayoutEngine(storage, getGoldPricePerGram).catch(err =>
      console.error('[BNSL Payout Engine] Scheduler error:', err),
    );
  }, 24 * 60 * 60 * 1000);
  console.log('[BNSL Payout Engine] Scheduler started (daily cadence)');
}
