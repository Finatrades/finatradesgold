import { db } from './db';
import { priceAlerts, users } from '@shared/schema';
import { eq, and, lte, gte, isNull } from 'drizzle-orm';
import { getGoldPricePerGram } from './gold-price-service';
import { sendEmail, EMAIL_TEMPLATES } from './email';
import { sendPushNotification } from './push-notifications';

interface ProcessedAlert {
  alertId: string;
  userId: string;
  triggered: boolean;
  notificationsSent: {
    email: boolean;
    push: boolean;
  };
}

export async function processPriceAlerts(): Promise<{
  processed: number;
  triggered: number;
  errors: number;
}> {
  console.log('[PriceAlertProcessor] Starting price alert check...');

  const result = {
    processed: 0,
    triggered: 0,
    errors: 0,
  };

  try {
    const currentPrice = await getGoldPricePerGram();
    console.log(`[PriceAlertProcessor] Current gold price: $${currentPrice.toFixed(4)}/gram`);

    const activeAlerts = await db
      .select({
        alert: priceAlerts,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(priceAlerts)
      .innerJoin(users, eq(priceAlerts.userId, users.id))
      .where(
        and(
          eq(priceAlerts.isActive, true),
          isNull(priceAlerts.triggeredAt)
        )
      );

    console.log(`[PriceAlertProcessor] Found ${activeAlerts.length} active alerts to check`);

    for (const { alert, user } of activeAlerts) {
      result.processed++;

      try {
        const targetPrice = parseFloat(alert.targetPricePerGram);
        let isTriggered = false;

        if (alert.direction === 'above' && currentPrice >= targetPrice) {
          isTriggered = true;
        } else if (alert.direction === 'below' && currentPrice <= targetPrice) {
          isTriggered = true;
        }

        if (isTriggered) {
          console.log(`[PriceAlertProcessor] Alert ${alert.id} triggered! Target: $${targetPrice}, Current: $${currentPrice.toFixed(4)}, Direction: ${alert.direction}`);

          await db
            .update(priceAlerts)
            .set({
              triggeredAt: new Date(),
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(priceAlerts.id, alert.id));

          await sendAlertNotifications(alert, user, currentPrice);

          result.triggered++;
        }
      } catch (alertError: any) {
        console.error(`[PriceAlertProcessor] Error processing alert ${alert.id}:`, alertError);
        result.errors++;
      }
    }
  } catch (error: any) {
    console.error('[PriceAlertProcessor] Error fetching alerts:', error);
    result.errors++;
  }

  console.log(`[PriceAlertProcessor] Completed. Processed: ${result.processed}, Triggered: ${result.triggered}, Errors: ${result.errors}`);
  return result;
}

async function sendAlertNotifications(
  alert: typeof priceAlerts.$inferSelect,
  user: { id: string; email: string; firstName: string; lastName: string },
  currentPrice: number
): Promise<void> {
  const targetPrice = parseFloat(alert.targetPricePerGram);
  const direction = alert.direction === 'above' ? 'risen above' : 'dropped below';

  const shouldSendEmail = alert.channel === 'email' || alert.channel === 'all';
  const shouldSendPush = alert.channel === 'push' || alert.channel === 'all';
  const shouldSendInApp = alert.channel === 'in_app' || alert.channel === 'all';

  if (shouldSendEmail) {
    try {
      await sendEmail(
        user.email,
        'price_alert',
        {
          recipientName: user.firstName,
          alertType: 'Gold Price Alert',
          targetPrice: targetPrice.toFixed(4),
          currentPrice: currentPrice.toFixed(4),
          direction: direction,
          note: alert.note || '',
        },
        { userId: user.id }
      );
      console.log(`[PriceAlertProcessor] Email sent to ${user.email} for alert ${alert.id}`);

      await db
        .update(priceAlerts)
        .set({ notificationSentAt: new Date() })
        .where(eq(priceAlerts.id, alert.id));
    } catch (emailError: any) {
      console.error(`[PriceAlertProcessor] Failed to send email for alert ${alert.id}:`, emailError);
    }
  }

  if (shouldSendPush) {
    try {
      await sendPushNotification(user.id, {
        title: '🔔 Gold Price Alert',
        body: `Gold price has ${direction} $${targetPrice.toFixed(2)}/gram. Current: $${currentPrice.toFixed(2)}/gram`,
        data: {
          type: 'price_alert',
          alertId: alert.id,
          currentPrice: currentPrice.toFixed(4),
          targetPrice: targetPrice.toFixed(4),
        },
        link: '/finapay',
      });
      console.log(`[PriceAlertProcessor] Push notification sent to user ${user.id} for alert ${alert.id}`);
    } catch (pushError: any) {
      console.error(`[PriceAlertProcessor] Failed to send push for alert ${alert.id}:`, pushError);
    }
  }
}

export function startPriceAlertProcessor(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[PriceAlertProcessor] Starting with ${intervalMinutes} minute interval`);

  setTimeout(() => {
    processPriceAlerts().catch(console.error);
  }, 10000);

  const intervalId = setInterval(
    () => {
      processPriceAlerts().catch(console.error);
    },
    intervalMinutes * 60 * 1000
  );

  return intervalId;
}

export async function checkSingleAlert(alertId: string): Promise<ProcessedAlert | null> {
  try {
    const currentPrice = await getGoldPricePerGram();

    const [alertData] = await db
      .select({
        alert: priceAlerts,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(priceAlerts)
      .innerJoin(users, eq(priceAlerts.userId, users.id))
      .where(eq(priceAlerts.id, alertId));

    if (!alertData) {
      return null;
    }

    const { alert, user } = alertData;
    const targetPrice = parseFloat(alert.targetPricePerGram);
    let isTriggered = false;

    if (alert.direction === 'above' && currentPrice >= targetPrice) {
      isTriggered = true;
    } else if (alert.direction === 'below' && currentPrice <= targetPrice) {
      isTriggered = true;
    }

    const result: ProcessedAlert = {
      alertId: alert.id,
      userId: user.id,
      triggered: isTriggered,
      notificationsSent: {
        email: false,
        push: false,
      },
    };

    if (isTriggered && alert.isActive && !alert.triggeredAt) {
      await db
        .update(priceAlerts)
        .set({
          triggeredAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(priceAlerts.id, alert.id));

      await sendAlertNotifications(alert, user, currentPrice);
      result.notificationsSent = {
        email: alert.channel === 'email' || alert.channel === 'all',
        push: alert.channel === 'push' || alert.channel === 'all',
      };
    }

    return result;
  } catch (error: any) {
    console.error(`[PriceAlertProcessor] Error checking alert ${alertId}:`, error);
    throw error;
  }
}
