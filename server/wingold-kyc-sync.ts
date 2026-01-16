/**
 * Wingold KYC Sync Service
 * 
 * Pushes KYC data to Wingold when a user's KYC is approved.
 * Uses HMAC-SHA256 signature for authentication.
 */

import crypto from 'crypto';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users, finatradesPersonalKyc, finatradesCorporateKyc, kycSubmissions } from '@shared/schema';

const WINGOLD_KYC_SYNC_URL = process.env.WINGOLD_KYC_SYNC_URL || 'https://wingold.ae/api/finatrades/kyc/sync';
const FINATRADES_WEBHOOK_SECRET = process.env.FINATRADES_WEBHOOK_SECRET || process.env.WINGOLD_WEBHOOK_SECRET;

interface PersonalKycPayload {
  fullName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  occupation: string | null;
  sourceOfFunds: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  passportUrl?: string | null;
  addressProofUrl?: string | null;
  selfieUrl?: string | null;
  idExpiryDate?: string | null;
  passportExpiryDate?: string | null;
  riskLevel?: string;
  isPep?: boolean;
  pepDetails?: string | null;
}

interface CorporateKycPayload {
  companyName: string | null;
  registrationNumber: string | null;
  incorporationDate: string | null;
  countryOfIncorporation: string | null;
  companyType: string | null;
  natureOfBusiness: string | null;
  numberOfEmployees: string | null;
  headOfficeAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  website: string | null;
  tradingContactName: string | null;
  tradingContactEmail: string | null;
  tradingContactPhone: string | null;
  financeContactName: string | null;
  financeContactEmail: string | null;
  financeContactPhone: string | null;
  beneficialOwners?: Array<{ name: string; nationality?: string; ownership: number }>;
  authorizedSignatories?: Array<{ name: string; role: string }>;
  documents?: {
    tradeLicenseUrl?: string;
    memorandumUrl?: string;
    certificateOfIncorporationUrl?: string;
  };
  tradeLicenseExpiryDate?: string | null;
  riskLevel?: string;
  hasPepOwners?: boolean;
  pepDetails?: string | null;
}

interface KycSyncPayload {
  finatradesId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  accountType: 'personal' | 'corporate';  // Wingold expects 'corporate', not 'business'
  kycStatus: 'pending' | 'approved' | 'rejected';
  kycApprovedAt?: string;
  kycApprovedBy?: string;
  personal?: PersonalKycPayload;
  corporate?: CorporateKycPayload;
}

interface KycSyncResult {
  success: boolean;
  message: string;
  userId?: number;
  finatradesId?: string;
  processingTime?: number;
  error?: string;
}

function generateSignature(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

export async function syncKycToWingold(userId: string): Promise<KycSyncResult> {
  console.log('[KYC Sync] Starting sync for user:', userId);

  if (!FINATRADES_WEBHOOK_SECRET) {
    console.error('[KYC Sync] FINATRADES_WEBHOOK_SECRET not configured');
    return { success: false, message: 'Webhook secret not configured', error: 'CONFIG_ERROR' };
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' };
    }

    // Case-insensitive KYC status check
    if (user.kycStatus?.toLowerCase() !== 'approved') {
      console.log('[KYC Sync] User KYC not approved, skipping sync:', user.kycStatus);
      return { success: false, message: 'KYC not approved', error: 'KYC_NOT_APPROVED' };
    }

    // Map Finatrades 'business' to Wingold's expected 'corporate'
    const wingoldAccountType = user.accountType === 'business' ? 'corporate' : 'personal';
    
    const payload: KycSyncPayload = {
      finatradesId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNumber,
      accountType: wingoldAccountType,
      kycStatus: 'approved',
      kycApprovedAt: new Date().toISOString().split('T')[0],
    };

    if (user.accountType === 'business') {
      const [corporateKyc] = await db.select()
        .from(finatradesCorporateKyc)
        .where(eq(finatradesCorporateKyc.userId, userId))
        .limit(1);

      if (corporateKyc) {
        payload.corporate = {
          companyName: corporateKyc.companyName,
          registrationNumber: corporateKyc.registrationNumber,
          incorporationDate: corporateKyc.incorporationDate,
          countryOfIncorporation: corporateKyc.countryOfIncorporation,
          companyType: corporateKyc.companyType,
          natureOfBusiness: corporateKyc.natureOfBusiness,
          numberOfEmployees: corporateKyc.numberOfEmployees,
          headOfficeAddress: corporateKyc.headOfficeAddress,
          companyPhone: corporateKyc.telephoneNumber,
          companyEmail: corporateKyc.emailAddress,
          website: corporateKyc.website,
          tradingContactName: corporateKyc.tradingContactName,
          tradingContactEmail: corporateKyc.tradingContactEmail,
          tradingContactPhone: corporateKyc.tradingContactPhone,
          financeContactName: corporateKyc.financeContactName,
          financeContactEmail: corporateKyc.financeContactEmail,
          financeContactPhone: corporateKyc.financeContactPhone,
          beneficialOwners: corporateKyc.beneficialOwners?.map(owner => ({
            name: owner.name,
            ownership: owner.shareholdingPercentage,
          })),
          tradeLicenseExpiryDate: corporateKyc.tradeLicenseExpiryDate,
          hasPepOwners: corporateKyc.hasPepOwners || false,
          pepDetails: corporateKyc.pepDetails,
          documents: {
            tradeLicenseUrl: corporateKyc.documents?.tradeLicense?.url,
            certificateOfIncorporationUrl: corporateKyc.documents?.certificateOfIncorporation?.url,
            memorandumUrl: corporateKyc.documents?.memorandumArticles?.url,
          },
        };
      }
    } else {
      const [personalKyc] = await db.select()
        .from(finatradesPersonalKyc)
        .where(eq(finatradesPersonalKyc.userId, userId))
        .limit(1);

      if (personalKyc) {
        const [kycSubmission] = await db.select()
          .from(kycSubmissions)
          .where(eq(kycSubmissions.userId, userId))
          .limit(1);

        payload.personal = {
          fullName: personalKyc.fullName,
          dateOfBirth: personalKyc.dateOfBirth,
          nationality: personalKyc.nationality,
          occupation: personalKyc.occupation,
          sourceOfFunds: personalKyc.sourceOfFunds,
          address: personalKyc.address,
          city: personalKyc.city,
          postalCode: personalKyc.postalCode,
          country: personalKyc.country,
          idFrontUrl: personalKyc.idFrontUrl,
          idBackUrl: personalKyc.idBackUrl,
          passportUrl: personalKyc.passportUrl,
          addressProofUrl: personalKyc.addressProofUrl,
          selfieUrl: personalKyc.livenessCapture,
          passportExpiryDate: personalKyc.passportExpiryDate,
          riskLevel: kycSubmission?.riskLevel || 'low',
          isPep: kycSubmission?.isPep || false,
          pepDetails: null,
        };
      }
    }

    const signature = generateSignature(payload, FINATRADES_WEBHOOK_SECRET);

    console.log('[KYC Sync] Sending to Wingold:', WINGOLD_KYC_SYNC_URL);

    const startTime = Date.now();
    const response = await fetch(WINGOLD_KYC_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Finatrades-Signature': signature,
      },
      body: JSON.stringify(payload),
    });

    const processingTime = Date.now() - startTime;
    const responseData = await response.json();

    if (!response.ok) {
      console.error('[KYC Sync] Wingold returned error:', response.status, responseData);
      return {
        success: false,
        message: responseData.error || 'Wingold sync failed',
        error: `HTTP_${response.status}`,
      };
    }

    console.log('[KYC Sync] Successfully synced to Wingold:', {
      userId,
      processingTime,
      wingoldUserId: responseData.userId,
    });

    return {
      success: true,
      message: 'KYC data synchronized successfully',
      userId: responseData.userId,
      finatradesId: userId,
      processingTime,
    };

  } catch (error: any) {
    console.error('[KYC Sync] Error:', error.message);
    return {
      success: false,
      message: error.message,
      error: 'NETWORK_ERROR',
    };
  }
}

export async function syncKycToWingoldWithRetry(
  userId: string,
  maxRetries: number = 3
): Promise<KycSyncResult> {
  let lastError: KycSyncResult | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await syncKycToWingold(userId);

    if (result.success) {
      return result;
    }

    lastError = result;

    if (result.error === 'CONFIG_ERROR' || result.error === 'USER_NOT_FOUND' || result.error === 'KYC_NOT_APPROVED') {
      return result;
    }

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[KYC Sync] Retry ${attempt}/${maxRetries} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return lastError || { success: false, message: 'Max retries exceeded', error: 'MAX_RETRIES' };
}
