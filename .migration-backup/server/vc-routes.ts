import { Router, Request, Response, NextFunction } from 'express';
import { credentialIssuer } from './services/credential-issuer';
import { storage } from './storage';

const router = Router();

const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session?.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/.well-known/jwks.json', async (_req: Request, res: Response) => {
  try {
    const jwks = await credentialIssuer.getJwks();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(jwks);
  } catch (error: any) {
    console.error('JWKS endpoint error:', error);
    res.status(500).json({ error: 'Failed to retrieve JWKS' });
  }
});

router.get('/vc/status/:credentialId', async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.params;
    
    if (!credentialId) {
      return res.status(400).json({ error: 'Credential ID required' });
    }

    const status = await credentialIssuer.checkCredentialStatus(credentialId);
    
    res.json({
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: 'CredentialStatusResponse',
      credentialId,
      issuer: 'did:web:finatrades.com',
      statusCheckTime: new Date().toISOString(),
      ...status
    });
  } catch (error: any) {
    console.error('Credential status check error:', error);
    res.status(500).json({ error: 'Failed to check credential status' });
  }
});

router.post('/vc/verify', async (req: Request, res: Response) => {
  try {
    const { vcJwt } = req.body;
    
    if (!vcJwt) {
      return res.status(400).json({ error: 'vcJwt is required' });
    }

    const result = await credentialIssuer.verifyCredential(vcJwt);
    
    if (result.valid) {
      const verifierDomain = req.get('origin') || req.get('host') || 'unknown';
      const verifierName = req.get('x-verifier-name');
      
      if (result.credentialId) {
        const credential = await storage.getVerifiableCredentialByCredentialId(result.credentialId);
        if (credential) {
          await credentialIssuer.recordPresentation(
            result.credentialId,
            credential.userId,
            verifierDomain,
            verifierName || undefined,
            result.payload ? Object.keys(result.payload.credentialSubject) : undefined,
            {
              presentationContext: 'api_request',
              ipAddress: req.ip || undefined,
              userAgent: req.get('user-agent') || undefined
            }
          );
        }
      }
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Credential verification error:', error);
    res.status(500).json({ error: 'Failed to verify credential' });
  }
});

router.post('/vc/issue', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, claims, expiresInDays = 365 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.kycStatus !== 'Approved') {
      return res.status(400).json({ 
        error: 'User must have approved KYC to issue credential',
        currentStatus: targetUser.kycStatus
      });
    }

    const existingCredential = await credentialIssuer.getUserActiveCredential(userId);
    if (existingCredential) {
      await credentialIssuer.revokeCredential(
        existingCredential.credentialId,
        'data_update',
        req.session?.userId
      );
    }

    const defaultClaims = {
      kycLevel: 'tier_1_basic',
      kycStatus: 'Approved',
      idVerified: true,
      addressVerified: true,
      amlPassed: true,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      country: targetUser.country || undefined,
      accountType: targetUser.accountType
    };

    const credential = await credentialIssuer.issueKycCredential(
      targetUser,
      { ...defaultClaims, ...claims },
      expiresInDays
    );

    res.json({
      success: true,
      credentialId: credential.credentialId,
      expiresAt: credential.expiresAt,
      vcJwt: credential.vcJwt
    });
  } catch (error: any) {
    console.error('Credential issuance error:', error);
    res.status(500).json({ error: 'Failed to issue credential' });
  }
});

router.post('/vc/revoke', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const { credentialId, reason } = req.body;
    
    if (!credentialId || !reason) {
      return res.status(400).json({ error: 'credentialId and reason are required' });
    }

    const validReasons = [
      'user_request', 'kyc_expired', 'kyc_rejected', 'security_concern',
      'data_update', 'key_rotation', 'compliance', 'admin_action'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ 
        error: 'Invalid reason',
        validReasons 
      });
    }

    const credential = await storage.getVerifiableCredentialByCredentialId(credentialId);
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    if (credential.status === 'revoked') {
      return res.status(400).json({ error: 'Credential is already revoked' });
    }

    await credentialIssuer.revokeCredential(credentialId, reason, req.session?.userId);

    res.json({
      success: true,
      message: 'Credential revoked successfully'
    });
  } catch (error: any) {
    console.error('Credential revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke credential' });
  }
});

router.get('/vc/user/:userId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (req.session?.userRole !== 'admin' && req.session?.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const credentials = await credentialIssuer.getUserCredentials(userId);
    const activeCredential = await credentialIssuer.getUserActiveCredential(userId);

    res.json({
      credentials: credentials.map(c => ({
        id: c.id,
        credentialId: c.credentialId,
        credentialType: c.credentialType,
        status: c.status,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        presentationCount: c.presentationCount,
        lastPresentedAt: c.lastPresentedAt
      })),
      activeCredentialId: activeCredential?.credentialId || null
    });
  } catch (error: any) {
    console.error('Get user credentials error:', error);
    res.status(500).json({ error: 'Failed to get user credentials' });
  }
});

router.get('/vc/my-credential', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const activeCredential = await credentialIssuer.getUserActiveCredential(req.session!.userId);

    if (!activeCredential) {
      return res.json({
        hasCredential: false,
        message: 'No active credential found'
      });
    }

    res.json({
      hasCredential: true,
      credentialId: activeCredential.credentialId,
      status: activeCredential.status,
      issuedAt: activeCredential.issuedAt,
      expiresAt: activeCredential.expiresAt,
      vcJwt: activeCredential.vcJwt,
      claimsSummary: activeCredential.claimsSummary,
      presentationCount: activeCredential.presentationCount
    });
  } catch (error: any) {
    console.error('Get my credential error:', error);
    res.status(500).json({ error: 'Failed to get credential' });
  }
});

router.get('/vc/presentations/:credentialId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.params;
    
    const credential = await storage.getVerifiableCredentialByCredentialId(credentialId);
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    if (req.session?.userRole !== 'admin' && req.session?.userId !== credential.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const presentations = await storage.getCredentialPresentations(credentialId);

    res.json({
      credentialId,
      presentations: presentations.map(p => ({
        id: p.id,
        verifierDomain: p.verifierDomain,
        verifierName: p.verifierName,
        claimsShared: p.claimsShared,
        verificationSuccessful: p.verificationSuccessful,
        presentationContext: p.presentationContext,
        presentedAt: p.presentedAt
      }))
    });
  } catch (error: any) {
    console.error('Get presentations error:', error);
    res.status(500).json({ error: 'Failed to get presentations' });
  }
});

router.get('/vc/partner/credential/:credentialId', async (req: Request, res: Response) => {
  try {
    const { credentialId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Partner authentication required',
        message: 'Include Bearer token in Authorization header'
      });
    }
    
    const partnerToken = authHeader.substring(7);
    const partnerApiKey = process.env.WINGOLD_PARTNER_API_KEY;
    
    if (!partnerApiKey || partnerToken !== partnerApiKey) {
      return res.status(403).json({ 
        error: 'Invalid partner credentials',
        message: 'Partner API key not recognized'
      });
    }
    
    const credential = await storage.getVerifiableCredentialByCredentialId(credentialId);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    
    if (credential.status !== 'active') {
      return res.status(410).json({ 
        error: 'Credential not active',
        status: credential.status,
        message: 'This credential has been revoked or expired'
      });
    }
    
    const verifierDomain = req.get('origin') || req.get('host') || 'wingold-partner-api';
    await credentialIssuer.recordPresentation(
      credentialId,
      credential.userId,
      verifierDomain,
      'Wingold Partner API',
      undefined,
      {
        presentationContext: 'partner_api_fetch',
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined
      }
    );
    
    res.json({
      '@context': 'https://www.w3.org/2018/credentials/v1',
      credentialId: credential.credentialId,
      vcJwt: credential.credentialJwt,
      status: credential.status,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
      issuer: 'did:web:finatrades.com'
    });
  } catch (error: any) {
    console.error('Partner credential fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch credential' });
  }
});

export default router;
