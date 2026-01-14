/**
 * SSO Routes - Single Sign-On Integration with Wingold & Metals
 * 
 * Uses RSA asymmetric cryptography (RS256):
 * - Finatrades holds the PRIVATE key (signs tokens)
 * - Wingold only needs the PUBLIC key (verifies tokens)
 * 
 * This is more secure than shared secrets because:
 * - Wingold cannot forge tokens even if compromised
 * - Key rotation is simpler (just share new public key)
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { storage } from "./storage";

const router = Router();

const WINGOLD_URL = "https://wingoldandmetals--imcharanpratap.replit.app";

function getPrivateKey(): string {
  const privateKey = process.env.FINATRADES_PRIVATE_KEY || process.env.SSO_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("FINATRADES_PRIVATE_KEY environment variable is required for SSO functionality");
  }
  
  let formattedKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .trim();
  
  if (!formattedKey.includes('-----BEGIN')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  }
  
  if (!formattedKey.includes('\n')) {
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    const keyContent = formattedKey.replace(header, '').replace(footer, '').trim();
    const chunks = keyContent.match(/.{1,64}/g) || [];
    formattedKey = `${header}\n${chunks.join('\n')}\n${footer}`;
  }
  
  return formattedKey;
}

function ensureAuthenticated(req: Request, res: Response, next: any) {
  if (!(req as any).session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

async function getActiveVerifiableCredential(userId: number): Promise<{ credentialId: string } | null> {
  try {
    const credential = await storage.getActiveCredentialByUser(userId);
    if (credential && credential.credentialJwt) {
      return {
        credentialId: credential.credentialId,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching verifiable credential:", error);
    return null;
  }
}

router.get("/api/sso/wingold", ensureAuthenticated, async (req, res) => {
  try {
    const session = (req as any).session;
    const userId = session.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vcData = await getActiveVerifiableCredential(userId);

    const payload: Record<string, any> = {
      sub: String(user.id),
      jti: crypto.randomUUID(),
      aud: "wingoldandmetals.com",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      finatradesId: user.id,
      accountType: user.accountType,
      phone: user.phoneNumber,
      country: user.country,
      kyc: {
        status: user.kycStatus,
        isApproved: user.kycStatus === 'Approved',
        emailVerified: user.isEmailVerified,
      },
      iss: "finatrades.com",
    };

    if (vcData) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      payload.verifiableCredential = {
        id: vcData.credentialId,
        statusEndpoint: `${baseUrl}/api/vc/status/${vcData.credentialId}`,
        fetchEndpoint: `${baseUrl}/api/vc/partner/credential/${vcData.credentialId}`,
      };
    }

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "5m",
    });

    const redirectUrl = `${WINGOLD_URL}/api/sso/finatrades?token=${encodeURIComponent(token)}`;

    res.json({ 
      redirectUrl,
      expiresIn: 300,
      hasVerifiableCredential: !!vcData,
    });
  } catch (error: any) {
    console.error("SSO token generation error:", error);
    res.status(500).json({ error: "Failed to generate SSO token" });
  }
});

router.get("/sso/wingold", ensureAuthenticated, async (req, res) => {
  try {
    const session = (req as any).session;
    const userId = session.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.redirect("/login?error=user_not_found");
    }

    const vcData = await getActiveVerifiableCredential(userId);

    const payload: Record<string, any> = {
      sub: String(user.id),
      jti: crypto.randomUUID(),
      aud: "wingoldandmetals.com",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      finatradesId: user.id,
      accountType: user.accountType,
      phone: user.phoneNumber,
      country: user.country,
      kyc: {
        status: user.kycStatus,
        isApproved: user.kycStatus === 'Approved',
        emailVerified: user.isEmailVerified,
      },
      iss: "finatrades.com",
    };

    if (vcData) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      payload.verifiableCredential = {
        id: vcData.credentialId,
        statusEndpoint: `${baseUrl}/api/vc/status/${vcData.credentialId}`,
        fetchEndpoint: `${baseUrl}/api/vc/partner/credential/${vcData.credentialId}`,
      };
    }

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "5m",
    });

    const redirectUrl = `${WINGOLD_URL}/api/sso/finatrades?token=${encodeURIComponent(token)}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("SSO redirect error:", error);
    res.redirect("/dashboard?error=sso_failed");
  }
});

router.get("/api/sso/wingold/redirect", ensureAuthenticated, async (req, res) => {
  try {
    const session = (req as any).session;
    const userId = session.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.redirect("/login?error=user_not_found");
    }

    const vcData = await getActiveVerifiableCredential(userId);

    const payload: Record<string, any> = {
      sub: String(user.id),
      jti: crypto.randomUUID(),
      aud: "wingoldandmetals.com",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      finatradesId: user.id,
      accountType: user.accountType,
      phone: user.phoneNumber,
      country: user.country,
      kyc: {
        status: user.kycStatus,
        isApproved: user.kycStatus === 'Approved',
        emailVerified: user.isEmailVerified,
      },
      iss: "finatrades.com",
    };

    if (vcData) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      payload.verifiableCredential = {
        id: vcData.credentialId,
        statusEndpoint: `${baseUrl}/api/vc/status/${vcData.credentialId}`,
        fetchEndpoint: `${baseUrl}/api/vc/partner/credential/${vcData.credentialId}`,
      };
    }

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "5m",
    });

    const redirectUrl = `${WINGOLD_URL}/api/sso/finatrades?token=${encodeURIComponent(token)}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("SSO redirect error:", error);
    res.redirect("/dashboard?error=sso_failed");
  }
});

router.get("/api/sso/public-key", (req, res) => {
  const publicKey = process.env.SSO_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "Public key not configured" });
  }
  res.json({ 
    publicKey: publicKey.replace(/\\n/g, '\n'),
    algorithm: "RS256",
    issuer: "finatrades.com"
  });
});

/**
 * SSO redirect specifically for Buy Gold Bar flow
 * Includes permitted_delivery constraint to enforce SecureVault-only on Wingold
 */
router.get("/api/sso/wingold/shop", ensureAuthenticated, async (req, res) => {
  try {
    const session = (req as any).session;
    const userId = session.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.redirect("/login?error=user_not_found");
    }

    const vcData = await getActiveVerifiableCredential(userId);

    const payload: Record<string, any> = {
      sub: String(user.id),
      jti: crypto.randomUUID(),
      aud: "wingoldandmetals.com",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      finatradesId: user.id,
      accountType: user.accountType,
      phone: user.phoneNumber,
      country: user.country,
      kyc: {
        status: user.kycStatus,
        isApproved: user.kycStatus === 'Approved',
        emailVerified: user.isEmailVerified,
      },
      permitted_delivery: ['SECURE_VAULT'],
      source: 'finavault_buy_gold_bar',
      iss: "finatrades.com",
    };

    if (vcData) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      payload.verifiableCredential = {
        id: vcData.credentialId,
        statusEndpoint: `${baseUrl}/api/vc/status/${vcData.credentialId}`,
        fetchEndpoint: `${baseUrl}/api/vc/partner/credential/${vcData.credentialId}`,
      };
    }

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "15m",
    });

    const redirectUrl = `${WINGOLD_URL}/api/sso/finatrades?token=${encodeURIComponent(token)}&redirect=/shop`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("SSO shop redirect error:", error);
    res.redirect("/finavault?error=sso_failed");
  }
});

export function registerSsoRoutes(app: any) {
  app.use(router);
}

export { getPrivateKey, WINGOLD_URL };
