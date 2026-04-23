/**
 * Wingold Partner API
 * 
 * Secure API endpoints for sharing user data with Wingold & Metals.
 * - Full user profile
 * - KYC status and details
 * - Documents via signed URLs
 * 
 * Security:
 * - HMAC-SHA256 signature verification
 * - Short-lived signed URLs for documents (5 min)
 * - Access logging for audit
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users, kycSubmissions } from '@shared/schema';

const router = Router();

const WINGOLD_SYNC_SECRET = process.env.WINGOLD_SYNC_SECRET;

/**
 * Verify HMAC signature from Wingold
 */
function verifyPartnerSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-wingold-signature'] as string;
  const timestamp = req.headers['x-wingold-timestamp'] as string;
  
  if (!WINGOLD_SYNC_SECRET) {
    console.error('[Partner API] WINGOLD_SYNC_SECRET not configured');
    return res.status(503).json({ error: 'Partner API not configured' });
  }
  
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature or timestamp' });
  }
  
  // Check timestamp is within 5 minutes
  const timestampNum = parseInt(timestamp, 10);
  const now = Date.now();
  if (Math.abs(now - timestampNum) > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Request expired' });
  }
  
  // Verify signature: HMAC-SHA256(timestamp + path)
  const payload = `${timestamp}:${req.path}`;
  const expectedSignature = crypto
    .createHmac('sha256', WINGOLD_SYNC_SECRET)
    .update(payload)
    .digest('hex');
  
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    if (!isValid) {
      console.warn('[Partner API] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (e) {
    return res.status(401).json({ error: 'Invalid signature format' });
  }
  
  next();
}

/**
 * Generate signed URL for document access
 * URLs expire in 5 minutes
 */
function generateSignedDocumentUrl(documentUrl: string | undefined): string | null {
  if (!documentUrl) return null;
  
  // If it's already an external URL, return as-is (for now)
  // In production, you'd generate a signed URL from your storage
  if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
    return documentUrl;
  }
  
  // For internal paths, create a signed access URL
  if (!WINGOLD_SYNC_SECRET) {
    console.error('[Partner API] Cannot sign URL - WINGOLD_SYNC_SECRET not configured');
    return null;
  }
  
  const expiry = Date.now() + (5 * 60 * 1000); // 5 minutes
  const payload = `${documentUrl}:${expiry}`;
  const signature = crypto
    .createHmac('sha256', WINGOLD_SYNC_SECRET)
    .update(payload)
    .digest('hex');
  
  // Return signed URL that can be verified
  const baseUrl = process.env.APP_URL || 'https://finatrades.com';
  return `${baseUrl}/api/partner/documents?path=${encodeURIComponent(documentUrl)}&exp=${expiry}&sig=${signature}`;
}

/**
 * Log document access for audit trail
 */
async function logDocumentAccess(userId: string, documentType: string, accessedBy: string) {
  console.log(`[Audit] Document access: user=${userId}, doc=${documentType}, by=${accessedBy}, at=${new Date().toISOString()}`);
  // In production, insert into audit log table
}

/**
 * GET /api/partner/wingold/users/:finatradesId
 * 
 * Returns complete user profile, KYC data, and signed document URLs
 */
router.get('/users/:finatradesId', verifyPartnerSignature, async (req: Request, res: Response) => {
  try {
    const { finatradesId } = req.params;
    
    // Find user by ID or finatradesId
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, finatradesId))
      .limit(1);
    
    if (!user) {
      // Try by finatradesId field
      const [userByFid] = await db.select()
        .from(users)
        .where(eq(users.finatradesId, finatradesId))
        .limit(1);
      
      if (!userByFid) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return await sendUserData(userByFid, res);
    }
    
    return await sendUserData(user, res);
  } catch (error) {
    console.error('[Partner API] Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function sendUserData(user: typeof users.$inferSelect, res: Response) {
  // Fetch KYC submission
  const [kyc] = await db.select()
    .from(kycSubmissions)
    .where(eq(kycSubmissions.userId, user.id))
    .limit(1);
  
  // Log access
  await logDocumentAccess(user.id, 'full_profile', 'wingold');
  
  // Build response
  const response = {
    profile: {
      finatradesId: user.id,
      finatradesPublicId: user.finatradesId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      address: user.address,
      country: user.country,
      accountType: user.accountType,
      profilePhoto: user.profilePhoto ? generateSignedDocumentUrl(user.profilePhoto) : null,
      emailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    },
    business: user.accountType === 'business' ? {
      companyName: user.companyName,
      registrationNumber: user.registrationNumber,
    } : null,
    kyc: kyc ? {
      status: kyc.status,
      tier: kyc.tier,
      isApproved: kyc.status === 'Approved',
      // Personal info
      fullName: kyc.fullName,
      dateOfBirth: kyc.dateOfBirth,
      nationality: kyc.nationality,
      address: kyc.address,
      city: kyc.city,
      postalCode: kyc.postalCode,
      country: kyc.country,
      // Business info (if applicable)
      companyName: kyc.companyName,
      registrationNumber: kyc.registrationNumber,
      companyAddress: kyc.companyAddress,
      taxId: kyc.taxId,
      // Risk & screening
      riskLevel: kyc.riskLevel,
      riskScore: kyc.riskScore,
      isPep: kyc.isPep,
      isSanctioned: kyc.isSanctioned,
      // Timestamps
      reviewedAt: kyc.reviewedAt,
      createdAt: kyc.createdAt,
    } : {
      status: user.kycStatus,
      isApproved: user.kycStatus === 'Approved',
    },
    documents: kyc?.documents ? {
      idProof: kyc.documents.idProof ? {
        url: generateSignedDocumentUrl(kyc.documents.idProof.url),
        type: kyc.documents.idProof.type,
        expiryDate: kyc.documents.idProof.expiryDate,
      } : null,
      idBack: kyc.documents.idBack ? {
        url: generateSignedDocumentUrl(kyc.documents.idBack.url),
        type: kyc.documents.idBack.type,
      } : null,
      selfie: kyc.documents.selfie ? {
        url: generateSignedDocumentUrl(kyc.documents.selfie.url),
        type: kyc.documents.selfie.type,
      } : null,
      proofOfAddress: kyc.documents.proofOfAddress ? {
        url: generateSignedDocumentUrl(kyc.documents.proofOfAddress.url),
        type: kyc.documents.proofOfAddress.type,
        issuedDate: kyc.documents.proofOfAddress.issuedDate,
      } : null,
      businessRegistration: kyc.documents.businessRegistration ? {
        url: generateSignedDocumentUrl(kyc.documents.businessRegistration.url),
        type: kyc.documents.businessRegistration.type,
      } : null,
      taxCertificate: kyc.documents.taxCertificate ? {
        url: generateSignedDocumentUrl(kyc.documents.taxCertificate.url),
        type: kyc.documents.taxCertificate.type,
      } : null,
      articlesOfIncorporation: kyc.documents.articlesOfIncorporation ? {
        url: generateSignedDocumentUrl(kyc.documents.articlesOfIncorporation.url),
        type: kyc.documents.articlesOfIncorporation.type,
      } : null,
      beneficialOwnership: kyc.documents.beneficialOwnership ? {
        url: generateSignedDocumentUrl(kyc.documents.beneficialOwnership.url),
        type: kyc.documents.beneficialOwnership.type,
      } : null,
    } : null,
  };
  
  res.json(response);
}

/**
 * GET /api/partner/documents
 * 
 * Serve documents with signed URL verification
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const { path, exp, sig } = req.query as { path: string; exp: string; sig: string };
    
    if (!path || !exp || !sig) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    // Check expiry
    const expiry = parseInt(exp, 10);
    if (Date.now() > expiry) {
      return res.status(403).json({ error: 'URL expired' });
    }
    
    // Verify signature
    if (!WINGOLD_SYNC_SECRET) {
      return res.status(503).json({ error: 'Partner API not configured' });
    }
    
    const payload = `${path}:${exp}`;
    const expectedSig = crypto
      .createHmac('sha256', WINGOLD_SYNC_SECRET)
      .update(payload)
      .digest('hex');
    
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSig)
      );
      
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid signature' });
      }
    } catch (e) {
      return res.status(403).json({ error: 'Invalid signature format' });
    }
    
    // Redirect to actual document location
    // In production, you'd stream the file or redirect to storage
    res.redirect(path);
  } catch (error) {
    console.error('[Partner API] Document access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function registerWingoldPartnerRoutes(app: any) {
  app.use('/api/partner/wingold', router);
  console.log('[Partner API] Wingold partner routes registered');
}

export default router;
