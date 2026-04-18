import { db } from './db';
import { pushDeviceTokens, userPreferences, notifications } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
};

export type TradePushEvent = 
  | 'new_proposal'
  | 'proposal_accepted'
  | 'proposal_declined'
  | 'shipment_update'
  | 'settlement_locked'
  | 'settlement_released'
  | 'dispute_raised'
  | 'dispute_resolved'
  | 'document_uploaded'
  | 'deal_room_message';

export type FinancialPushEvent =
  | 'gold_purchased'
  | 'gold_sold'
  | 'gold_transferred_sent'
  | 'gold_transferred_received'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_rejected'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'kyc_changes_requested'
  | 'bnsl_payment_received'
  | 'bnsl_payment_overdue'
  | 'bnsl_plan_completed'
  | 'bnsl_early_exit_settled'
  | 'deposit_received';

const FINANCIAL_PUSH_MESSAGES: Record<FinancialPushEvent, (data: Record<string, string>) => PushNotificationPayload> = {
  gold_purchased: (data) => ({
    title: 'Gold Purchase Confirmed',
    body: `You successfully purchased ${data.goldGrams}g of gold for $${data.amountUsd}`,
    data,
    link: '/finapay',
  }),
  gold_sold: (data) => ({
    title: 'Gold Sale Confirmed',
    body: `You sold ${data.goldGrams}g of gold for $${data.amountUsd}`,
    data,
    link: '/finapay',
  }),
  gold_transferred_sent: (data) => ({
    title: 'Gold Transfer Sent',
    body: `You sent ${data.goldGrams}g gold to ${data.recipientName || 'recipient'}`,
    data,
    link: '/finapay',
  }),
  gold_transferred_received: (data) => ({
    title: 'Gold Transfer Received',
    body: `You received ${data.goldGrams}g gold from ${data.senderName || 'sender'}`,
    data,
    link: '/finapay',
  }),
  withdrawal_requested: (data) => ({
    title: 'Withdrawal Request Submitted',
    body: `Your withdrawal of ${data.goldGrams}g gold ($${data.amountUsd}) is under review`,
    data,
    link: '/finavault',
  }),
  withdrawal_completed: (data) => ({
    title: 'Withdrawal Completed',
    body: `Your withdrawal of ${data.goldGrams}g gold has been processed successfully`,
    data,
    link: '/finavault',
  }),
  withdrawal_rejected: (data) => ({
    title: 'Withdrawal Rejected',
    body: `Your withdrawal request ${data.referenceNumber} was not approved. ${data.reason ? `Reason: ${data.reason}` : ''}`,
    data,
    link: '/finavault',
  }),
  kyc_approved: (data) => ({
    title: 'KYC Approved',
    body: 'Your identity verification has been approved. All platform features are now unlocked.',
    data,
    link: '/profile',
  }),
  kyc_rejected: (data) => ({
    title: 'KYC Rejected',
    body: `Your KYC submission was rejected. ${data.reason ? `Reason: ${data.reason}` : 'Please resubmit your documents.'}`,
    data,
    link: '/kyc',
  }),
  kyc_changes_requested: (data) => ({
    title: 'KYC Changes Requested',
    body: 'Additional information is required for your KYC verification. Please review and update.',
    data,
    link: '/kyc',
  }),
  bnsl_payment_received: (data) => ({
    title: 'BNSL Payment Received',
    body: `Your BNSL margin payment of $${data.amountUsd} for plan ${data.contractId} was received`,
    data,
    link: '/bnsl',
  }),
  bnsl_payment_overdue: (data) => ({
    title: 'BNSL Payment Overdue',
    body: `Your BNSL payment of $${data.amountUsd} for plan ${data.contractId} is overdue. Please pay promptly.`,
    data,
    link: '/bnsl',
  }),
  bnsl_plan_completed: (data) => ({
    title: 'BNSL Plan Completed',
    body: `Congratulations! Your BNSL plan ${data.contractId} is complete. Your gold is now available.`,
    data,
    link: '/bnsl',
  }),
  bnsl_early_exit_settled: (data) => ({
    title: 'BNSL Early Exit Settled',
    body: `Your BNSL plan ${data.contractId} early termination has been settled. ${data.goldGrams}g credited.`,
    data,
    link: '/bnsl',
  }),
  deposit_received: (data) => ({
    title: 'Deposit Received',
    body: `Your deposit of $${data.amountUsd} has been received and is being processed`,
    data,
    link: '/finapay',
  }),
};

const TRADE_PUSH_MESSAGES: Record<TradePushEvent, (data: Record<string, string>) => PushNotificationPayload> = {
  new_proposal: (data) => ({
    title: 'New Trade Proposal',
    body: `You have received a new proposal for trade ${data.tradeRef}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  proposal_accepted: (data) => ({
    title: 'Proposal Accepted',
    body: `Your proposal for trade ${data.tradeRef} has been accepted`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  proposal_declined: (data) => ({
    title: 'Proposal Declined',
    body: `Your proposal for trade ${data.tradeRef} has been declined`,
    data,
    link: `/finabridge`
  }),
  shipment_update: (data) => ({
    title: 'Shipment Update',
    body: `Shipment for trade ${data.tradeRef} is now ${data.status}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  settlement_locked: (data) => ({
    title: 'Gold Locked in Escrow',
    body: `${data.goldGrams}g gold has been locked for trade ${data.tradeRef}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  settlement_released: (data) => ({
    title: 'Gold Released',
    body: `${data.goldGrams}g gold has been released for trade ${data.tradeRef}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  dispute_raised: (data) => ({
    title: 'Dispute Raised',
    body: `A dispute has been raised for trade ${data.tradeRef}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  dispute_resolved: (data) => ({
    title: 'Dispute Resolved',
    body: `The dispute for trade ${data.tradeRef} has been resolved`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  document_uploaded: (data) => ({
    title: 'New Document',
    body: `A new document has been uploaded for trade ${data.tradeRef}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  }),
  deal_room_message: (data) => ({
    title: 'New Message',
    body: `You have a new message in trade ${data.tradeRef}`,
    data,
    link: `/finabridge/deal-room/${data.dealRoomId}`
  })
};

export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
  deviceName?: string,
  deviceId?: string
): Promise<void> {
  const existingToken = await db
    .select()
    .from(pushDeviceTokens)
    .where(and(
      eq(pushDeviceTokens.userId, userId),
      eq(pushDeviceTokens.token, token)
    ))
    .limit(1);

  if (existingToken.length > 0) {
    await db
      .update(pushDeviceTokens)
      .set({ 
        isActive: true, 
        lastUsedAt: new Date(),
        deviceName,
        deviceId
      })
      .where(eq(pushDeviceTokens.id, existingToken[0].id));
  } else {
    await db.insert(pushDeviceTokens).values({
      userId,
      token,
      platform,
      deviceName,
      deviceId,
      isActive: true
    });
  }
}

export async function unregisterDeviceToken(userId: string, token: string): Promise<void> {
  await db
    .update(pushDeviceTokens)
    .set({ isActive: false })
    .where(and(
      eq(pushDeviceTokens.userId, userId),
      eq(pushDeviceTokens.token, token)
    ));
}

export async function unregisterAllDeviceTokens(userId: string): Promise<number> {
  const result = await db
    .update(pushDeviceTokens)
    .set({ isActive: false })
    .where(and(
      eq(pushDeviceTokens.userId, userId),
      eq(pushDeviceTokens.isActive, true)
    ));
  
  return result.rowCount || 0;
}

export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  const tokens = await db
    .select({ token: pushDeviceTokens.token })
    .from(pushDeviceTokens)
    .where(and(
      eq(pushDeviceTokens.userId, userId),
      eq(pushDeviceTokens.isActive, true)
    ));
  
  return tokens.map(t => t.token);
}

export async function checkUserPushEnabled(userId: string): Promise<boolean> {
  const prefs = await db
    .select({ pushNotifications: userPreferences.pushNotifications })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  
  return prefs.length > 0 ? prefs[0].pushNotifications : true;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: boolean; tokens: number }> {
  const isPushEnabled = await checkUserPushEnabled(userId);
  if (!isPushEnabled) {
    return { sent: false, tokens: 0 };
  }

  const tokens = await getUserDeviceTokens(userId);
  if (tokens.length === 0) {
    return { sent: false, tokens: 0 };
  }

  await db.insert(notifications).values({
    userId,
    title: payload.title,
    message: payload.body,
    type: 'trade',
    link: payload.link,
    read: false
  });

  console.log(`[Push] Would send to ${tokens.length} device(s) for user ${userId}:`, payload);

  return { sent: true, tokens: tokens.length };
}

export async function sendTradePushNotification(
  userId: string,
  event: TradePushEvent,
  data: Record<string, string>
): Promise<{ sent: boolean; tokens: number }> {
  // SECURITY: Use hasOwn to prevent prototype-pollution lookup (e.g. event === '__proto__')
  if (!Object.prototype.hasOwnProperty.call(TRADE_PUSH_MESSAGES, event)) {
    console.error(`[Push] Unknown trade event: ${event}`);
    return { sent: false, tokens: 0 };
  }
  const payloadGenerator = TRADE_PUSH_MESSAGES[event];
  if (typeof payloadGenerator !== 'function') {
    console.error(`[Push] Invalid trade event handler: ${event}`);
    return { sent: false, tokens: 0 };
  }

  const payload = payloadGenerator(data);
  return sendPushNotification(userId, payload);
}

export async function sendBulkTradePushNotifications(
  userIds: string[],
  event: TradePushEvent,
  data: Record<string, string>
): Promise<{ totalSent: number; totalTokens: number }> {
  let totalSent = 0;
  let totalTokens = 0;

  for (const userId of userIds) {
    const result = await sendTradePushNotification(userId, event, data);
    if (result.sent) {
      totalSent++;
      totalTokens += result.tokens;
    }
  }

  return { totalSent, totalTokens };
}

export async function sendFinancialPushNotification(
  userId: string,
  event: FinancialPushEvent,
  data: Record<string, string>
): Promise<{ sent: boolean; tokens: number }> {
  // SECURITY: Use hasOwn to prevent prototype-pollution lookup
  if (!Object.prototype.hasOwnProperty.call(FINANCIAL_PUSH_MESSAGES, event)) {
    console.error(`[Push] Unknown financial event: ${event}`);
    return { sent: false, tokens: 0 };
  }
  const payloadGenerator = FINANCIAL_PUSH_MESSAGES[event];
  if (typeof payloadGenerator !== 'function') {
    console.error(`[Push] Invalid financial event handler: ${event}`);
    return { sent: false, tokens: 0 };
  }

  const payload = payloadGenerator(data);
  return sendPushNotification(userId, payload);
}
