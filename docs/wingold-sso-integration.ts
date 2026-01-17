/**
 * WINGOLD SSO INTEGRATION CODE
 * 
 * Copy this code to your Wingold Replit's SSO route handler
 * This will auto-link Finatrades ID and trust KYC from SSO token
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

// Get this from Finatrades: /api/sso/public-key endpoint
const FINATRADES_PUBLIC_KEY = process.env.FINATRADES_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----`;

/**
 * SSO Handler - Receives token from Finatrades
 * URL: /api/sso/finatrades?token=...
 */
router.get('/api/sso/finatrades', async (req, res) => {
  try {
    const { token, redirect } = req.query;

    if (!token || typeof token !== 'string') {
      console.error('[SSO] Missing token');
      return res.status(400).json({ error: 'Token required' });
    }

    // Verify token with Finatrades public key
    let decoded: any;
    try {
      decoded = jwt.verify(token, FINATRADES_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'finatrades.com',
        audience: 'wingoldandmetals.com'
      });
      console.log('[SSO] Token verified:', { 
        email: decoded.email, 
        finatradesId: decoded.finatradesId,
        kycApproved: decoded.kyc?.isApproved 
      });
    } catch (err: any) {
      console.error('[SSO] Token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find or create user by email
    let user = await db.query.users.findFirst({
      where: eq(users.email, decoded.email)
    });

    if (!user) {
      // Create new user from SSO data
      const [newUser] = await db.insert(users).values({
        email: decoded.email,
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
        phone: decoded.phone || null,
        country: decoded.country || null,
        accountType: decoded.accountType || 'personal',
        // AUTO-LINK Finatrades account
        finatradesId: String(decoded.finatradesId),
        finatradesLinked: true,
        finatradesLinkedAt: new Date(),
        // TRUST KYC from Finatrades
        kycVerified: decoded.kyc?.isApproved === true,
        kycSource: decoded.kyc?.isApproved ? 'finatrades_sso' : null,
        kycTier: decoded.kyc?.tier || null,
      }).returning();
      
      user = newUser;
      console.log('[SSO] Created new user:', { id: user.id, email: user.email });
    } else {
      // Update existing user - AUTO-LINK Finatrades
      await db.update(users)
        .set({
          // Always update Finatrades link on SSO login
          finatradesId: String(decoded.finatradesId),
          finatradesLinked: true,
          finatradesLinkedAt: new Date(),
          // Update name if not set
          firstName: user.firstName || decoded.firstName,
          lastName: user.lastName || decoded.lastName,
          // Trust KYC if approved
          ...(decoded.kyc?.isApproved && {
            kycVerified: true,
            kycSource: 'finatrades_sso',
            kycTier: decoded.kyc?.tier || null,
          })
        })
        .where(eq(users.id, user.id));
      
      console.log('[SSO] Updated user with Finatrades link:', { 
        id: user.id, 
        finatradesId: decoded.finatradesId 
      });
    }

    // Create session
    (req as any).session.userId = user.id;
    (req as any).session.ssoSource = 'finatrades';

    // Redirect to requested page or dashboard
    const redirectTo = typeof redirect === 'string' ? redirect : '/dashboard';
    res.redirect(redirectTo);

  } catch (error: any) {
    console.error('[SSO] Error:', error);
    res.status(500).json({ error: 'SSO failed' });
  }
});

/**
 * API to manually link Finatrades account (if user didn't use SSO)
 * This is a fallback for users who signed up directly on Wingold
 */
router.post('/api/finatrades/link', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const { finatradesId } = req.body;
    if (!finatradesId) {
      return res.status(400).json({ error: 'Finatrades ID required' });
    }

    // Verify the Finatrades ID exists by calling Finatrades API
    const verifyRes = await fetch(
      `https://finatrades.replit.app/api/partner/verify-user/${finatradesId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WINGOLD_PARTNER_API_KEY}`
        }
      }
    );

    if (!verifyRes.ok) {
      return res.status(400).json({ error: 'Invalid Finatrades ID' });
    }

    const finatradesUser = await verifyRes.json();

    // Update Wingold user with Finatrades link
    await db.update(users)
      .set({
        finatradesId: String(finatradesId),
        finatradesLinked: true,
        finatradesLinkedAt: new Date(),
        // Trust KYC from Finatrades
        ...(finatradesUser.kycApproved && {
          kycVerified: true,
          kycSource: 'finatrades_api',
        })
      })
      .where(eq(users.id, userId));

    res.json({ success: true, message: 'Finatrades account linked' });

  } catch (error: any) {
    console.error('[Link] Error:', error);
    res.status(500).json({ error: 'Failed to link account' });
  }
});

export default router;

/**
 * WINGOLD DATABASE SCHEMA - Add these columns to users table
 * 
 * In your shared/schema.ts, add to users table:
 * 
 * finatradesId: text('finatrades_id'),
 * finatradesLinked: boolean('finatrades_linked').default(false),
 * finatradesLinkedAt: timestamp('finatrades_linked_at'),
 * kycVerified: boolean('kyc_verified').default(false),
 * kycSource: text('kyc_source'),  // 'finatrades_sso' | 'finatrades_api' | 'manual'
 * kycTier: text('kyc_tier'),
 */
