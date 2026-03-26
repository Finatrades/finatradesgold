import { getRedisClient } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import type { IStorage } from '../storage';

const OVERDUE_IDEMPOTENCY_TTL = 30 * 24 * 60 * 60;   // 30 days
const REMINDER_IDEMPOTENCY_TTL = 2 * 24 * 60 * 60;    // 2 days

export async function runBnslReminderJob(storage: IStorage): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allPlans = await storage.getAllBnslPlans();
  // Include Active and Maturing plans; overdue payouts can exist under either
  const eligiblePlans = allPlans.filter(p => p.status === 'Active' || p.status === 'Maturing');

  const redis = getRedisClient();

  for (const plan of eligiblePlans) {
    const planUser = await storage.getUser(plan.userId).catch(() => null);
    if (!planUser?.email) continue;

    const payouts = await storage.getPlanPayouts(plan.id);
    for (const payout of payouts) {
      const payoutDate = new Date(payout.scheduledDate);
      payoutDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round((payoutDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

      // Overdue check: payout is past-due — either still Scheduled or already flipped to Processing
      // (the BNSL auto-process loop marks Scheduled→Processing for past-due, so we must check both)
      if (payoutDate < today && (payout.status === 'Scheduled' || payout.status === 'Processing')) {
        const overdueKey = `bnsl:overdue:${payout.id}`;
        const alreadyNotified = await redis.get(overdueKey).catch(() => null);
        if (!alreadyNotified) {
          const daysOverdue = Math.abs(daysUntilDue);
          sendEmail(planUser.email, EMAIL_TEMPLATES.BNSL_PAYMENT_OVERDUE, {
            user_name: `${planUser.firstName} ${planUser.lastName}`,
            plan_name: plan.contractId,
            amount: parseFloat(payout.monetaryAmountUsd.toString()).toFixed(2),
            days_overdue: String(daysOverdue),
            late_fee: '0.00',
            payment_url: '/bnsl',
          }, { userId: planUser.id }).catch(err => console.error('[Email] BNSL overdue email failed:', err));
          await redis.set(overdueKey, '1', { ex: OVERDUE_IDEMPOTENCY_TTL }).catch(() => {});
          console.log(`[BNSL Reminder] Overdue email sent to ${planUser.email} for plan ${plan.contractId} (${daysOverdue}d overdue, status: ${payout.status})`);
        }
        continue; // Skip reminder check for past-due payouts
      }

      // Upcoming reminder check: only for Scheduled payouts
      if (payout.status === 'Scheduled' && (daysUntilDue === 7 || daysUntilDue === 1)) {
        const reminderKey = `bnsl:reminder:${payout.id}:${daysUntilDue}d`;
        const alreadySent = await redis.get(reminderKey).catch(() => null);
        if (!alreadySent) {
          sendEmail(planUser.email, EMAIL_TEMPLATES.BNSL_PAYMENT_REMINDER, {
            user_name: `${planUser.firstName} ${planUser.lastName}`,
            plan_name: plan.contractId,
            amount: parseFloat(payout.monetaryAmountUsd.toString()).toFixed(2),
            due_date: payoutDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            payment_url: '/bnsl',
          }, { userId: planUser.id }).catch(err => console.error('[Email] BNSL reminder email failed:', err));
          await redis.set(reminderKey, '1', { ex: REMINDER_IDEMPOTENCY_TTL }).catch(() => {});
          console.log(`[BNSL Reminder] ${daysUntilDue}-day reminder sent to ${planUser.email} for plan ${plan.contractId}`);
        }
      }
    }
  }
}

export function startBnslReminderScheduler(storage: IStorage): void {
  // Run immediately on startup to catch any missed sends
  runBnslReminderJob(storage).catch(err => console.error('[BNSL Reminder] Startup check error:', err));
  // Then re-run every 24 hours
  setInterval(() => {
    runBnslReminderJob(storage).catch(err => console.error('[BNSL Reminder] Scheduler error:', err));
  }, 24 * 60 * 60 * 1000);
  console.log('[BNSL Reminder] Scheduler started (daily cadence)');
}
