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
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

const router = Router();

const WINGOLD_URL = "https://wingoldandmetals--imcharanpratap.replit.app";

function getPrivateKey(): string {
  const privateKey = process.env.SSO_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SSO_PRIVATE_KEY environment variable is required for SSO functionality");
  }
  return privateKey.replace(/\\n/g, '\n');
}

function ensureAuthenticated(req: Request, res: Response, next: any) {
  if (!(req as any).session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
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

    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName,
      accountType: user.accountType,
      source: "finatrades",
    };

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "5m",
      issuer: "finatrades.com",
      audience: "wingoldandmetals.com"
    });

    const redirectUrl = `${WINGOLD_URL}/sso-login?token=${encodeURIComponent(token)}`;

    res.json({ 
      redirectUrl,
      token,
      expiresIn: 300
    });
  } catch (error: any) {
    console.error("SSO token generation error:", error);
    res.status(500).json({ error: "Failed to generate SSO token" });
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

    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName,
      accountType: user.accountType,
      source: "finatrades",
    };

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "5m",
      issuer: "finatrades.com",
      audience: "wingoldandmetals.com"
    });

    const redirectUrl = `${WINGOLD_URL}/sso-login?token=${encodeURIComponent(token)}`;
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

export function registerSsoRoutes(app: any) {
  app.use(router);
}

export { getPrivateKey, WINGOLD_URL };
