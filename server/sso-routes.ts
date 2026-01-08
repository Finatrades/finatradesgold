/**
 * SSO Routes - Single Sign-On Integration with Wingold & Metals
 * 
 * JWT-based SSO flow:
 * 1. User clicks "Access Wingold Portal" on Finatrades
 * 2. Finatrades generates a signed JWT token with user info
 * 3. User is redirected to Wingold with the token
 * 4. Wingold verifies the token and logs user in
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

const router = Router();

const WINGOLD_URL = "https://wingoldandmetals--imcharanpratap.replit.app";

function getSsoSecret(): string {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) {
    throw new Error("SSO_SHARED_SECRET environment variable is required for SSO functionality");
  }
  return secret;
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
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, getSsoSecret(), { 
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
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, getSsoSecret(), { 
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

export function registerSsoRoutes(app: any) {
  app.use(router);
}

export { getSsoSecret, WINGOLD_URL };
