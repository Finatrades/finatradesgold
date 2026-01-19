import { db } from './db';
import { notifications, userPreferences, users, emailNotificationSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, EMAIL_TEMPLATES } from './email';
import { getIO } from './socket';

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'transaction' | 'kyc' | 'bnsl' | 'trade' | 'system';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  emailTemplate?: string;
  emailData?: Record<string, string>;
  skipEmail?: boolean;
}

async function getUserPreferences(userId: string) {
  try {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  } catch (error) {
    console.error('[NotificationService] Failed to get user preferences:', error);
    return null;
  }
}

async function isEmailTypeEnabled(notificationType: string): Promise<boolean> {
  try {
    const [setting] = await db.select().from(emailNotificationSettings).where(eq(emailNotificationSettings.notificationType, notificationType));
    return setting?.isEnabled !== false;
  } catch (error) {
    return true;
  }
}

async function getUserEmail(userId: string): Promise<{ email: string; firstName: string; lastName: string } | null> {
  try {
    const [user] = await db.select({ 
      email: users.email, 
      firstName: users.firstName,
      lastName: users.lastName 
    }).from(users).where(eq(users.id, userId));
    return user ? { 
      email: user.email, 
      firstName: user.firstName || 'User',
      lastName: user.lastName || ''
    } : null;
  } catch (error) {
    console.error('[NotificationService] Failed to get user email:', error);
    return null;
  }
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const { userId, title, message, type, link, emailTemplate, emailData, skipEmail } = payload;

  try {
    const [notification] = await db.insert(notifications).values({
      userId,
      title,
      message,
      type,
      link: link || null,
      read: false,
    }).returning();

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        title,
        message,
        type,
        link,
        createdAt: notification.createdAt,
      });
    }

    if (!skipEmail && emailTemplate) {
      const prefs = await getUserPreferences(userId);
      const emailTypeEnabled = await isEmailTypeEnabled(emailTemplate);
      const shouldSendEmail = prefs?.emailNotifications !== false && emailTypeEnabled;

      if (shouldSendEmail) {
        const userInfo = await getUserEmail(userId);
        if (userInfo) {
          const data = {
            user_name: `${userInfo.firstName} ${userInfo.lastName}`.trim(),
            ...emailData,
          };
          await sendEmail(userInfo.email, emailTemplate, data);
          console.log(`[NotificationService] Email sent to ${userInfo.email} for ${emailTemplate}`);
        }
      }
    }

    console.log(`[NotificationService] Notification created for user ${userId}: ${title}`);
    return true;
  } catch (error) {
    console.error('[NotificationService] Failed to send notification:', error);
    return false;
  }
}

export async function notifyDepositApproved(userId: string, goldAmount: number, usdAmount: number, depositType: string = 'Digital') {
  await sendNotification({
    userId,
    title: 'Deposit Approved',
    message: `Your ${depositType.toLowerCase()} deposit of ${goldAmount.toFixed(4)}g gold ($${usdAmount.toFixed(2)}) has been approved and credited to your wallet.`,
    type: 'success',
    link: '/dashboard',
    emailTemplate: EMAIL_TEMPLATES.DEPOSIT_RECEIVED,
    emailData: {
      deposit_type: depositType,
      gold_amount: goldAmount.toFixed(4),
      usd_amount: usdAmount.toFixed(2),
    },
  });
}

export async function notifyWithdrawalApproved(userId: string, goldAmount: number, usdAmount: number) {
  await sendNotification({
    userId,
    title: 'Withdrawal Approved',
    message: `Your withdrawal of ${goldAmount.toFixed(4)}g gold ($${usdAmount.toFixed(2)}) has been approved and processed.`,
    type: 'success',
    link: '/transactions',
    emailTemplate: EMAIL_TEMPLATES.WITHDRAWAL_COMPLETED,
    emailData: {
      gold_amount: goldAmount.toFixed(4),
      usd_amount: usdAmount.toFixed(2),
    },
  });
}

export async function notifyPhysicalGoldReceived(userId: string, goldAmount: number, storageLocation: string) {
  await sendNotification({
    userId,
    title: 'Physical Gold Received',
    message: `Your physical gold deposit of ${goldAmount.toFixed(4)}g has been received and verified at ${storageLocation}.`,
    type: 'success',
    link: '/finavault',
    emailTemplate: EMAIL_TEMPLATES.DEPOSIT_RECEIVED,
    emailData: {
      gold_amount: goldAmount.toFixed(4),
      storage_location: storageLocation,
      deposit_type: 'Physical',
    },
  });
}

export async function notifyKycApproved(userId: string) {
  await sendNotification({
    userId,
    title: 'KYC Approved',
    message: 'Your identity verification has been approved. You now have full access to all platform features.',
    type: 'success',
    link: '/dashboard',
    emailTemplate: EMAIL_TEMPLATES.KYC_APPROVED,
  });
}

export async function notifyKycRejected(userId: string, reason: string) {
  await sendNotification({
    userId,
    title: 'KYC Verification Issue',
    message: `Your identity verification requires attention: ${reason}. Please resubmit your documents.`,
    type: 'warning',
    link: '/kyc',
    emailTemplate: EMAIL_TEMPLATES.KYC_REJECTED,
    emailData: {
      rejection_reason: reason,
    },
  });
}

export async function notifyBnslPlanCreated(userId: string, planName: string, goldAmount: number, maturityDate: string) {
  await sendNotification({
    userId,
    title: 'BNSL Plan Created',
    message: `Your BNSL plan with ${goldAmount.toFixed(4)}g gold has been created successfully. Maturity: ${maturityDate}`,
    type: 'bnsl',
    link: '/bnsl',
    emailTemplate: EMAIL_TEMPLATES.BNSL_AGREEMENT_SIGNED,
    emailData: {
      plan_name: planName,
      gold_amount: goldAmount.toFixed(4),
      maturity_date: maturityDate,
    },
  });
}

export async function notifyBnslPlanMatured(userId: string, planName: string, goldAmount: number, profitAmount: number) {
  await sendNotification({
    userId,
    title: 'BNSL Plan Matured',
    message: `Your BNSL plan has matured! Profit earned: $${profitAmount.toFixed(2)}`,
    type: 'success',
    link: '/bnsl',
    emailTemplate: EMAIL_TEMPLATES.BNSL_PLAN_COMPLETED,
    emailData: {
      plan_name: planName,
      gold_amount: goldAmount.toFixed(4),
      profit_amount: profitAmount.toFixed(2),
    },
  });
}

export async function notifyNewDeviceLogin(userId: string, ipAddress: string, deviceInfo: string) {
  await sendNotification({
    userId,
    title: 'New Login Detected',
    message: `New login from ${deviceInfo}. If this wasn't you, please secure your account immediately.`,
    type: 'warning',
    link: '/settings',
    emailTemplate: EMAIL_TEMPLATES.NEW_DEVICE_LOGIN,
    emailData: {
      ip_address: ipAddress,
      device_info: deviceInfo,
      login_time: new Date().toLocaleString(),
    },
  });
}

export async function notifyPasswordChanged(userId: string) {
  await sendNotification({
    userId,
    title: 'Password Changed',
    message: 'Your password has been successfully changed. If this wasn\'t you, contact support immediately.',
    type: 'warning',
    link: '/settings',
    emailTemplate: EMAIL_TEMPLATES.PASSWORD_CHANGED,
  });
}

export async function notifyCertificateIssued(userId: string, certificateType: string, goldAmount: number, certificateNumber: string) {
  await sendNotification({
    userId,
    title: 'Certificate Issued',
    message: `A new ${certificateType} certificate for ${goldAmount.toFixed(4)}g gold has been issued. Certificate #${certificateNumber}`,
    type: 'success',
    link: '/finavault?tab=certificates',
    skipEmail: true,
  });
}

export async function notifyTransferReceived(userId: string, senderName: string, goldAmount: number) {
  await sendNotification({
    userId,
    title: 'Gold Received',
    message: `You received ${goldAmount.toFixed(4)}g gold from ${senderName}.`,
    type: 'success',
    link: '/transactions',
    emailTemplate: EMAIL_TEMPLATES.TRANSFER_RECEIVED,
    emailData: {
      sender_name: senderName,
      gold_amount: goldAmount.toFixed(4),
    },
  });
}

export async function notifyTransferSent(userId: string, recipientName: string, goldAmount: number) {
  await sendNotification({
    userId,
    title: 'Gold Sent',
    message: `You sent ${goldAmount.toFixed(4)}g gold to ${recipientName}.`,
    type: 'transaction',
    link: '/transactions',
    emailTemplate: EMAIL_TEMPLATES.TRANSFER_SENT,
    emailData: {
      recipient_name: recipientName,
      gold_amount: goldAmount.toFixed(4),
    },
  });
}

export {
  sendNotification as notify,
};
