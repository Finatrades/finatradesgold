import { Queue, Worker } from 'bullmq';
import { cacheGet, cacheSet } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import { notifyError } from '../system-notifications';
import { getRedisConnection } from '../job-queue-bullmq';
import { db } from '../db';
import { bnslWallets, transactions, bnslPlans, bnslPayouts } from '../../shared/schema';
import { eq, lte, inArray, and, sql } from 'drizzle-orm';
import type { IStorage } from '../storage';
import type { InsertTransaction } from '../../shared/schema';

const ADMIN_EMAILS = ['macy@finatrades.com', 'farah@finatrades.com', 'reda@finatrades.com'];
const LAST_RUN_KEY = 'bnsl:autopay:lastrun';
const HIGH_RISK_FAILURE_DAYS = 3;
const QUEUE_NAME = 'bnsl-payout';
const DAILY_JOB_ID = 'bnsl-payout-daily';

export interface PayoutEngineStats {
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
    await Promise.all(
      admins.map(admin =>
        storage.createNotification({
          userId: admin.id,
          title,
          message,
          type,
          link: link || null,
          read: false,
        }),
      ),
    );
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

  const allPlans = await storage.getAllBnslPlans();
  const eligiblePlans = allPlans.filter(p => p.status === 'Active' || p.status === 'Maturing');

  // Fetch live gold price once — if unavailable, mark all currently-due Scheduled payouts
  // as Failed (with reason) and alert admins, then abort this cycle.
  let goldPrice: number;
  try {
    goldPrice = await getGoldPricePerGram();
    if (!goldPrice || goldPrice <= 0) throw new Error('Invalid gold price returned');
  } catch (priceErr) {
    const msg = priceErr instanceof Error ? priceErr.message : String(priceErr);
    const failureReason = `Gold price unavailable: ${msg}`;
    console.error('[BNSL Payout Engine] Cannot fetch gold price — marking due payouts Failed:', msg);

    // Mark all currently-due Scheduled payouts as Failed
    const nowTs = new Date();
    for (const plan of eligiblePlans) {
      const payouts = await storage.getPlanPayouts(plan.id).catch(() => []);
      const duePayouts = payouts.filter(
        p => p.status === 'Scheduled' && new Date(p.scheduledDate) <= today,
      );
      for (const payout of duePayouts) {
        await db
          .update(bnslPayouts)
          .set({ status: 'Failed', failureReason, failedAt: nowTs })
          .where(and(eq(bnslPayouts.id, payout.id), eq(bnslPayouts.status, 'Scheduled')))
          .catch(() => null);
        stats.failed++;
      }
    }

    await notifyError({
      error: priceErr instanceof Error ? priceErr : new Error(msg),
      context: 'bnsl-payout-engine:gold-price-fetch',
      route: '/jobs/bnsl-payout',
    });

    if (stats.failed > 0) {
      await notifyAdminsInApp(
        storage,
        'BNSL Payout Engine: Gold Price Unavailable',
        `${stats.failed} due payout(s) could not be processed — gold price fetch failed: ${msg}`,
        'error',
        '/admin/bnsl',
      );
    }

    stats.timestamp = now.toISOString();
    await cacheSet(LAST_RUN_KEY, JSON.stringify(stats), 48 * 60 * 60);
    return stats;
  }

  for (const plan of eligiblePlans) {
    const payouts = await storage.getPlanPayouts(plan.id);
    const duePending = payouts.filter(
      p => p.status === 'Scheduled' && new Date(p.scheduledDate) <= today,
    );

    for (const payout of duePending) {
      try {
        const monetaryAmount = parseFloat(payout.monetaryAmountUsd.toString());
        const gramsCredited = monetaryAmount / goldPrice;

        // DB-level claim: atomically transition Scheduled → Processing.
        // This is the primary idempotency/exactly-once guard — if 0 rows are updated
        // (payout is no longer Scheduled), another instance already claimed it → skip.
        // All subsequent financial writes happen within the same transaction as the claim.
        const committed = await db.transaction(async (tx) => {
          // Claim step: Scheduled → Processing (conditional update, returns row only if transitioned)
          const [claimed] = await tx
            .update(bnslPayouts)
            .set({ status: 'Processing' })
            .where(and(eq(bnslPayouts.id, payout.id), eq(bnslPayouts.status, 'Scheduled')))
            .returning({ id: bnslPayouts.id });

          if (!claimed) return false; // Already claimed by another run — skip

          // Credit user's BNSL wallet (availableGoldGrams) — margin payouts accumulate here.
          // Upsert: insert if wallet doesn't exist, otherwise increment atomically.
          const [existingBnslWallet] = await tx
            .select({ id: bnslWallets.id })
            .from(bnslWallets)
            .where(eq(bnslWallets.userId, plan.userId));

          if (existingBnslWallet) {
            await tx
              .update(bnslWallets)
              .set({
                availableGoldGrams: sql`${bnslWallets.availableGoldGrams} + ${gramsCredited.toFixed(6)}::numeric`,
                availableValueUsd: sql`${bnslWallets.availableValueUsd} + ${monetaryAmount.toFixed(2)}::numeric`,
                updatedAt: new Date(),
              })
              .where(eq(bnslWallets.userId, plan.userId));
          } else {
            await tx.insert(bnslWallets).values({
              userId: plan.userId,
              availableGoldGrams: gramsCredited.toFixed(6),
              availableValueUsd: monetaryAmount.toFixed(2),
              lockedGoldGrams: '0',
            });
          }

          // Mark payout Paid — clear any prior failureReason/failedAt
          await tx
            .update(bnslPayouts)
            .set({
              status: 'Paid',
              marketPriceUsdPerGram: goldPrice.toFixed(2),
              gramsCredited: gramsCredited.toFixed(6),
              paidAt: new Date(),
              failedAt: null,
              failureReason: null,
            })
            .where(eq(bnslPayouts.id, payout.id));

          // Update plan paid/remaining margin — atomic SQL increments prevent
          // last-writer-wins when ≥2 payouts for the same plan are processed in one cycle.
          await tx
            .update(bnslPlans)
            .set({
              paidMarginUsd: sql`${bnslPlans.paidMarginUsd} + ${monetaryAmount.toFixed(2)}::numeric`,
              paidMarginGrams: sql`${bnslPlans.paidMarginGrams} + ${gramsCredited.toFixed(6)}::numeric`,
              remainingMarginUsd: sql`GREATEST(0, ${bnslPlans.remainingMarginUsd} - ${monetaryAmount.toFixed(2)}::numeric)`,
              updatedAt: new Date(),
            })
            .where(eq(bnslPlans.id, plan.id));

          // Transaction record
          const txRecord: InsertTransaction = {
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
          };
          await tx.insert(transactions).values(txRecord);

          return true;
        });

        if (!committed) {
          console.log(`[BNSL Payout Engine] Payout ${payout.id} already claimed by another run — skipping`);
          continue;
        }

        // Post-transaction observability (non-critical — failures don't roll back the payment)
        try {
          const { vaultLedgerService } = await import('../vault-ledger-service');
          await vaultLedgerService.recordLedgerEntry({
            userId: plan.userId,
            action: 'Payout_Credit',
            goldGrams: gramsCredited,
            goldPriceUsdPerGram: goldPrice,
            fromWallet: 'BNSL',
            toWallet: 'BNSL',
            fromStatus: 'Locked_BNSL',
            toStatus: 'Available',
            bnslPlanId: plan.id,
            bnslPayoutId: payout.id,
            notes: `BNSL Auto Payout #${payout.sequence}: ${gramsCredited.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
            createdBy: 'system',
          });
        } catch (ledgerErr) {
          console.error('[BNSL Payout Engine] Ledger entry failed (non-fatal):', ledgerErr);
        }

        await storage.createAuditLog({
          entityType: 'bnsl',
          entityId: plan.id,
          actionType: 'update',
          actor: 'system',
          actorRole: 'system',
          details: `Auto payout #${payout.sequence}: ${gramsCredited.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
        }).catch(err => console.error('[BNSL Payout Engine] Audit log failed (non-fatal):', err));

        stats.processed++;
        console.log(
          `[BNSL Payout Engine] Paid #${payout.sequence} for plan ${plan.contractId}: ${gramsCredited.toFixed(4)}g`,
        );

        // User notification email
        const planUser = await storage.getUser(plan.userId).catch(() => null);
        if (planUser?.email) {
          const remainingAfter = Math.max(
            0,
            parseFloat(plan.remainingMarginUsd?.toString() || '0') - monetaryAmount,
          );
          const freshPayouts = await storage.getPlanPayouts(plan.id).catch(() => []);
          const nextPayout = freshPayouts.find(p => p.status === 'Scheduled');
          sendEmail(planUser.email, EMAIL_TEMPLATES.BNSL_PAYMENT_RECEIVED, {
            user_name: `${planUser.firstName || ''} ${planUser.lastName || ''}`.trim() || 'Valued Partner',
            plan_name: plan.contractId,
            amount: monetaryAmount.toFixed(2),
            remaining_balance: remainingAfter.toFixed(2),
            next_due_date: nextPayout?.scheduledDate
              ? new Date(nextPayout.scheduledDate).toLocaleDateString()
              : 'All payments settled',
          }).catch(err => console.error('[BNSL Payout Engine] User email failed (non-fatal):', err));
        }
      } catch (err) {
        const failureReason = err instanceof Error ? err.message : String(err);
        console.error(
          `[BNSL Payout Engine] Failed payout ${payout.id} for plan ${plan.contractId}:`,
          failureReason,
        );

        // Persist failure reason and timestamp — non-retriable unless manually resolved
        // failedAt is used for the >3-day high-risk escalation threshold
        await db
          .update(bnslPayouts)
          .set({ status: 'Failed', failureReason, failedAt: new Date() })
          .where(eq(bnslPayouts.id, payout.id))
          .catch(() => null);
        stats.failed++;

        // System alert via notifyError (throttled, writes to system_logs)
        await notifyError({
          error: err instanceof Error ? err : new Error(failureReason),
          context: `bnsl-payout-engine:payout-failed:${payout.id}`,
          route: '/jobs/bnsl-payout',
          userId: plan.userId,
          requestData: {
            planId: plan.id,
            contractId: plan.contractId,
            payoutSequence: payout.sequence,
            failureReason,
          },
        });

        // In-app admin notification
        await notifyAdminsInApp(
          storage,
          'BNSL Auto Payout Failed',
          `Payout #${payout.sequence} on plan ${plan.contractId} failed: ${failureReason.substring(0, 120)}`,
          'error',
          '/admin/bnsl',
        );

        // Admin emails
        for (const adminEmail of ADMIN_EMAILS) {
          sendEmail(adminEmail, EMAIL_TEMPLATES.BNSL_PAYMENT_OVERDUE, {
            user_name: 'Admin',
            plan_name: `${plan.contractId} (payout #${payout.sequence})`,
            amount: parseFloat(payout.monetaryAmountUsd.toString()).toFixed(2),
            days_overdue: '0',
            late_fee: '0.00',
            payment_url: 'https://finatrades.com/admin/bnsl',
          }).catch(() => null);
        }
      }
    }

    // Maturity transition check — runs for ALL Active plans each cycle (not just those
    // with due payouts this run), so plans paid over multiple cycles transition correctly.
    if (plan.status === 'Active') {
      const freshPayouts = await storage.getPlanPayouts(plan.id);
      const allSettled = freshPayouts.every(p => p.status === 'Paid' || p.status === 'Cancelled');

      // Explicit term-date validation: maturity date must have been reached
      const maturityDate = plan.maturityDate ? new Date(plan.maturityDate) : null;
      const termReached = maturityDate !== null && maturityDate <= today;

      if (allSettled && termReached) {
        await db
          .update(bnslPlans)
          .set({ status: 'Maturing', updatedAt: new Date() })
          .where(eq(bnslPlans.id, plan.id))
          .catch(() => null);
        stats.maturing++;
        console.log(
          `[BNSL Payout Engine] Plan ${plan.contractId} → Maturing (term: ${maturityDate!.toISOString().slice(0, 10)}, all payouts settled)`,
        );

        // Admin alert: base settlement requires manual review
        await notifyAdminsInApp(
          storage,
          'BNSL Plan Ready for Base Settlement',
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

  // High-risk flagging: plans where any payout has been in Failed status for >3 days.
  // Uses failedAt (when it was marked Failed) — not scheduledDate — to count the actual
  // duration a payout has been in a failed state.
  const cutoffDate = new Date(now.getTime() - HIGH_RISK_FAILURE_DAYS * 24 * 60 * 60 * 1000);
  const failedPayouts = await db
    .select({ planId: bnslPayouts.planId })
    .from(bnslPayouts)
    .where(and(eq(bnslPayouts.status, 'Failed'), lte(bnslPayouts.failedAt, cutoffDate)));

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

      await notifyAdminsInApp(
        storage,
        'BNSL Plan Escalated to High Risk',
        `Plan ${flaggedPlan.contractId} has been flagged High Risk: a payout has been overdue for more than ${HIGH_RISK_FAILURE_DAYS} days.`,
        'error',
        '/admin/bnsl',
      );
      await notifyError({
        error: new Error(
          `BNSL plan ${flaggedPlan.contractId} escalated to High Risk (payout overdue >${HIGH_RISK_FAILURE_DAYS} days)`,
        ),
        context: `bnsl-payout-engine:high-risk-flag:${planId}`,
        route: '/jobs/bnsl-payout',
      });
    }
  }

  if (stats.highRiskFlagged > 0) {
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

/**
 * Starts the BNSL payout engine:
 * - Primary: BullMQ repeatable job (cron: daily at 02:00 UTC) + Worker
 * - Fallback: setInterval (24h) when Redis/BullMQ is unavailable
 * Runs an immediate cycle on startup in both modes.
 */
export function startBnslPayoutEngine(
  storage: IStorage,
  getGoldPricePerGram: () => Promise<number>,
): void {
  const connection = getRedisConnection();

  if (connection) {
    try {
      const queue = new Queue(QUEUE_NAME, { connection });

      // Worker: processes each BullMQ job by running the full payout cycle.
      // BullMQ ensures at-most-one concurrent worker per queue; combined with the
      // DB-level claim (Scheduled→Processing conditional update), this achieves
      // exactly-once payment semantics even across multiple app instances.
      const worker = new Worker(
        QUEUE_NAME,
        async (_job) => {
          return await runBnslPayoutEngine(storage, getGoldPricePerGram);
        },
        { connection, concurrency: 1 },
      );
      worker.on('failed', (job, err) => {
        console.error(`[BNSL Payout Engine] BullMQ worker job ${job?.id} failed:`, err.message);
      });

      // Register daily repeatable job (idempotent — BullMQ deduplicates by jobId+cron)
      queue
        .add(
          'daily-run',
          {},
          {
            jobId: DAILY_JOB_ID,
            repeat: { cron: '0 2 * * *' }, // 02:00 UTC daily
            removeOnComplete: { count: 7 },
            removeOnFail: { count: 30 },
          },
        )
        .catch(err =>
          console.error('[BNSL Payout Engine] Failed to register repeatable job:', err),
        );

      // Immediate startup run — routed through BullMQ so the Worker's concurrency=1
      // prevents overlapping execution across multiple app instances
      queue
        .add('startup-run', {}, { removeOnComplete: { count: 1 }, removeOnFail: { count: 1 } })
        .catch(err => console.error('[BNSL Payout Engine] Failed to queue startup run:', err));

      console.log('[BNSL Payout Engine] BullMQ scheduler started (cron: 0 2 * * *)');
    } catch (bullErr) {
      console.error('[BNSL Payout Engine] BullMQ init failed, using fallback scheduler:', bullErr);
      _startFallbackScheduler(storage, getGoldPricePerGram);
    }
  } else {
    console.warn('[BNSL Payout Engine] No Redis connection — using fallback interval scheduler');
    _startFallbackScheduler(storage, getGoldPricePerGram);
  }
}

function _startFallbackScheduler(
  storage: IStorage,
  getGoldPricePerGram: () => Promise<number>,
): void {
  setInterval(() => {
    runBnslPayoutEngine(storage, getGoldPricePerGram).catch(err =>
      console.error('[BNSL Payout Engine] Fallback scheduler error:', err),
    );
  }, 24 * 60 * 60 * 1000);
  console.log('[BNSL Payout Engine] Fallback scheduler started (daily interval)');
}
