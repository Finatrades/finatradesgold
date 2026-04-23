import crypto from 'crypto';
import { db } from './db';
import { users, kycSubmissions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { syncKycToWingoldWithRetry } from './wingold-kyc-sync';

const WINGOLD_API_URL = process.env.WINGOLD_API_URL || 'https://wingoldandmetals--imcharanpratap.replit.app';
const WINGOLD_SYNC_SECRET = process.env.WINGOLD_SYNC_SECRET;

interface UserSyncPayload {
  event: 'user.registered' | 'user.updated' | 'kyc.submitted' | 'kyc.approved' | 'kyc.rejected';
  timestamp: string;
  data: {
    externalUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    country?: string;
    accountType?: string;
    emailVerified?: boolean;
    kycStatus?: string;
    kycLevel?: string;
    kycApprovedAt?: string;
    kycDocuments?: {
      idType?: string;
      idNumber?: string;
      idExpiry?: string;
      addressVerified?: boolean;
    };
  };
}

export class WingoldUserSyncService {
  private static signPayload(payload: string): string {
    if (!WINGOLD_SYNC_SECRET) {
      console.warn('[WingoldSync] No sync secret configured, using empty signature');
      return '';
    }
    return crypto
      .createHmac('sha256', WINGOLD_SYNC_SECRET)
      .update(payload)
      .digest('hex');
  }

  private static async sendWebhook(payload: UserSyncPayload): Promise<boolean> {
    try {
      const payloadString = JSON.stringify(payload);
      const signature = this.signPayload(payloadString);

      console.log(`[WingoldSync] Sending ${payload.event} for user ${payload.data.externalUserId}`);

      const response = await fetch(`${WINGOLD_API_URL}/api/b2b/user-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Finatrades-Signature': signature,
          'X-Finatrades-Timestamp': payload.timestamp
        },
        body: payloadString
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WingoldSync] Webhook failed: ${response.status} - ${errorText}`);
        return false;
      }

      console.log(`[WingoldSync] Successfully sent ${payload.event}`);
      return true;
    } catch (error) {
      console.error('[WingoldSync] Webhook error:', error);
      return false;
    }
  }

  static async onUserRegistered(userId: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        console.error(`[WingoldSync] User not found: ${userId}`);
        return;
      }

      const payload: UserSyncPayload = {
        event: 'user.registered',
        timestamp: new Date().toISOString(),
        data: {
          externalUserId: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          phone: user.phoneNumber || undefined,
          country: user.country || undefined,
          accountType: user.accountType || 'personal',
          emailVerified: user.isEmailVerified || false,
          kycStatus: user.kycStatus || 'not_started'
        }
      };

      await this.sendWebhook(payload);
    } catch (error) {
      console.error('[WingoldSync] onUserRegistered error:', error);
    }
  }

  static async onUserUpdated(userId: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const payload: UserSyncPayload = {
        event: 'user.updated',
        timestamp: new Date().toISOString(),
        data: {
          externalUserId: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          phone: user.phoneNumber || undefined,
          country: user.country || undefined,
          accountType: user.accountType || 'personal',
          emailVerified: user.isEmailVerified || false,
          kycStatus: user.kycStatus || 'not_started'
        }
      };

      await this.sendWebhook(payload);
    } catch (error) {
      console.error('[WingoldSync] onUserUpdated error:', error);
    }
  }

  static async onKycSubmitted(userId: string, submissionId?: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      let kycData: UserSyncPayload['data']['kycDocuments'] = {};
      
      if (submissionId) {
        const [submission] = await db.select()
          .from(kycSubmissions)
          .where(eq(kycSubmissions.id, submissionId));
        
        if (submission && submission.documents) {
          const docs = submission.documents as { idProof?: { type?: string; expiryDate?: string }; proofOfAddress?: { url?: string } };
          kycData = {
            idType: docs.idProof?.type || undefined,
            idExpiry: docs.idProof?.expiryDate || undefined,
            addressVerified: !!docs.proofOfAddress?.url
          };
        }
      }

      const payload: UserSyncPayload = {
        event: 'kyc.submitted',
        timestamp: new Date().toISOString(),
        data: {
          externalUserId: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          kycStatus: 'pending',
          kycDocuments: kycData
        }
      };

      await this.sendWebhook(payload);
    } catch (error) {
      console.error('[WingoldSync] onKycSubmitted error:', error);
    }
  }

  static async onKycApproved(userId: string, kycLevel?: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const payload: UserSyncPayload = {
        event: 'kyc.approved',
        timestamp: new Date().toISOString(),
        data: {
          externalUserId: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          phone: user.phoneNumber || undefined,
          country: user.country || undefined,
          kycStatus: 'approved',
          kycLevel: kycLevel || 'basic',
          kycApprovedAt: new Date().toISOString()
        }
      };

      await this.sendWebhook(payload);

      // Also push full KYC data to Wingold's /api/finatrades/kyc/sync endpoint
      // Uses retry logic for transient failures
      const syncResult = await syncKycToWingoldWithRetry(userId, 3);
      if (syncResult.success) {
        console.log('[WingoldSync] Full KYC data synced successfully:', syncResult);
      } else {
        console.warn('[WingoldSync] Full KYC sync failed after retries:', syncResult.message);
      }
    } catch (error) {
      console.error('[WingoldSync] onKycApproved error:', error);
    }
  }

  static async onKycRejected(userId: string, reason?: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const payload: UserSyncPayload = {
        event: 'kyc.rejected',
        timestamp: new Date().toISOString(),
        data: {
          externalUserId: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          kycStatus: 'rejected'
        }
      };

      await this.sendWebhook(payload);
    } catch (error) {
      console.error('[WingoldSync] onKycRejected error:', error);
    }
  }

  static async syncAllUsers(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      const allUsers = await db.select().from(users);
      
      for (const user of allUsers) {
        const payload: UserSyncPayload = {
          event: 'user.registered',
          timestamp: new Date().toISOString(),
          data: {
            externalUserId: user.id,
            email: user.email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            phone: user.phoneNumber || undefined,
            country: user.country || undefined,
            accountType: user.accountType || 'personal',
            emailVerified: user.isEmailVerified || false,
            kycStatus: user.kycStatus || 'not_started'
          }
        };

        const success = await this.sendWebhook(payload);
        if (success) {
          synced++;
        } else {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`[WingoldSync] Bulk sync complete: ${synced} synced, ${failed} failed`);
    } catch (error) {
      console.error('[WingoldSync] Bulk sync error:', error);
    }

    return { synced, failed };
  }
}
