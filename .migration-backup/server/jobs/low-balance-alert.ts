import { cacheGet, cacheSet } from '../redis-client';
import { sendEmail, EMAIL_TEMPLATES } from '../email';
import type { IStorage } from '../storage';

// Prevent spamming: at most one low-balance alert per user per 24 hours
const LOW_BALANCE_COOLDOWN_TTL = 24 * 60 * 60; // 24 hours

/**
 * Checks if a user's LGPW gold balance has dropped below their configured threshold
 * and sends a LOW_BALANCE_ALERT email if so.
 *
 * Idempotent: at most one alert per user per 24 hours via fallback-safe cacheGet/cacheSet.
 * Call after any LGPW debit transaction completes.
 */
export async function checkAndSendLowBalanceAlert(
  storage: IStorage,
  userId: string,
  userEmail: string,
  userFirstName: string,
  userLastName: string,
  getGoldPricePerGram: () => Promise<number>,
): Promise<void> {
  const wallet = await storage.getWallet(userId);
  const prefs = await storage.getUserPreferences(userId);
  const threshold = parseFloat(prefs?.lowBalanceThresholdGrams?.toString() || '0.1');
  const remainingGrams = parseFloat(wallet?.goldGrams?.toString() || '0');

  if (threshold <= 0 || remainingGrams >= threshold || remainingGrams < 0) return;

  // Idempotency/cooldown: skip if we already sent an alert for this user in the last 24 hours
  const cooldownKey = `lba:${userId}`;
  const alreadySent = await cacheGet(cooldownKey);
  if (alreadySent) return;

  const goldPrice = await getGoldPricePerGram().catch(() => 139.44);
  const userName = `${userFirstName} ${userLastName}`.trim() || 'Valued Client';
  sendEmail(userEmail, EMAIL_TEMPLATES.LOW_BALANCE_ALERT, {
    user_name: userName,
    current_balance: (remainingGrams * goldPrice).toFixed(2),
    threshold: (threshold * goldPrice).toFixed(2),
    deposit_url: '/finapay',
  }, { userId }).catch(err => console.error('[Email] Low balance alert failed:', err));

  await cacheSet(cooldownKey, '1', LOW_BALANCE_COOLDOWN_TTL);
}
