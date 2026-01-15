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
import { users, wingoldVaultLocations } from "@shared/schema";
import { storage } from "./storage";

const router = Router();

const WINGOLD_URL = process.env.WINGOLD_URL || "https://wingoldandmetals--imcharanpratap.replit.app";

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
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`; // gitleaks:allow
  }
  
  if (!formattedKey.includes('\n')) {
    const header = '-----BEGIN PRIVATE KEY-----'; // gitleaks:allow
    const footer = '-----END PRIVATE KEY-----'; // gitleaks:allow
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
    const credential = await storage.getActiveUserCredential(String(userId));
    if (credential && credential.vcJwt) {
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
  try {
    // Try to derive public key from private key first
    const privateKey = getPrivateKey();
    const keyObject = crypto.createPrivateKey(privateKey);
    const publicKey = crypto.createPublicKey(keyObject).export({ type: 'spki', format: 'pem' }) as string;
    
    res.json({ 
      publicKey,
      algorithm: "RS256",
      issuer: "finatrades.com",
      audience: "wingoldandmetals.com",
      note: "Configure this public key in Wingold to verify SSO tokens from Finatrades"
    });
  } catch (error: any) {
    console.error("Failed to derive public key:", error);
    
    // Fallback to SSO_PUBLIC_KEY env var if private key derivation fails
    const publicKey = process.env.SSO_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "Could not derive public key. Check FINATRADES_PRIVATE_KEY configuration." });
    }
    res.json({ 
      publicKey: publicKey.replace(/\\n/g, '\n'),
      algorithm: "RS256",
      issuer: "finatrades.com"
    });
  }
});

/**
 * Token verification endpoint for debugging
 * Wingold can POST a token here to verify it's configured correctly
 */
router.post("/api/sso/verify-token", (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        valid: false, 
        error: "Token is required in request body" 
      });
    }
    
    const privateKey = getPrivateKey();
    const keyObject = crypto.createPrivateKey(privateKey);
    const publicKey = crypto.createPublicKey(keyObject).export({ type: 'spki', format: 'pem' }) as string;
    
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'finatrades.com',
      audience: 'wingoldandmetals.com'
    });
    
    res.json({
      valid: true,
      payload: {
        sub: (decoded as any).sub,
        email: (decoded as any).email,
        nonce: (decoded as any).nonce,
        jti: (decoded as any).jti,
        exp: (decoded as any).exp,
        iat: (decoded as any).iat,
        iss: (decoded as any).iss,
        aud: (decoded as any).aud,
      },
      message: "Token verified successfully. Use the same public key and verification options in Wingold."
    });
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ 
      valid: false, 
      error: error.message,
      hint: "Ensure you are using RS256 algorithm, issuer: 'finatrades.com', audience: 'wingoldandmetals.com'"
    });
  }
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

const GOLD_PRICE_MARGIN = 0.02;
const VALID_BAR_SIZES: Record<string, number> = {
  '1g': 1,
  '10g': 10,
  '100g': 100,
  '1kg': 1000,
};

async function getServerGoldPrice(): Promise<number> {
  try {
    const res = await fetch('https://metals-api.com/api/latest?access_key=' + process.env.METALS_API_KEY + '&base=USD&symbols=XAU');
    const data = await res.json();
    if (data.success && data.rates?.XAU) {
      return 1 / data.rates.XAU;
    }
  } catch (e) {
    console.error('[SSO Checkout] Failed to fetch gold price:', e);
  }
  return 148;
}

// In-memory store for pending checkout orders (in production, use Redis or database)
const pendingCheckoutOrders = new Map<string, {
  userId: string;
  orderId: string;
  nonce: string;
  totalGrams: number;
  totalUsd: number;
  totalAed: number;
  items: any[];
  vaultLocationId: string | null;
  createdAt: Date;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
}>();

// Clean up old pending orders every 30 minutes
setInterval(() => {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const entries = Array.from(pendingCheckoutOrders.entries());
  for (const [orderId, order] of entries) {
    if (now - order.createdAt.getTime() > THIRTY_MINUTES) {
      pendingCheckoutOrders.delete(orderId);
    }
  }
}, 30 * 60 * 1000);

/**
 * SSO endpoint for Wingold checkout with redirect flow
 * Returns a URL that redirects user to Wingold for payment
 * After payment, Wingold redirects back to our callback URL
 * Server-side validates and recalculates all prices for security
 */
router.post("/api/sso/wingold/checkout", ensureAuthenticated, async (req, res) => {
  try {
    const session = (req as any).session;
    const userId = session.userId;
    const { cartItems, vaultLocationId } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart items are required" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    console.log('[SSO Checkout] User lookup:', { userId, user: user ? { id: user.id, email: user.email, kycStatus: user.kycStatus } : null });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.kycStatus !== 'Approved') {
      console.log('[SSO Checkout] KYC not approved:', { userId, kycStatus: user.kycStatus });
      return res.status(403).json({ error: "KYC approval required" });
    }

    const goldPricePerGram = await getServerGoldPrice();
    const USD_TO_AED = 3.67;

    const validatedItems: Array<{
      barSize: string;
      grams: number;
      quantity: number;
      priceUsd: number;
      priceAed: number;
    }> = [];

    let serverTotalGrams = 0;
    let serverTotalUsd = 0;

    for (const item of cartItems) {
      const barSize = String(item.barSize);
      const grams = VALID_BAR_SIZES[barSize];
      
      if (!grams) {
        return res.status(400).json({ error: `Invalid bar size: ${barSize}` });
      }

      const quantity = Math.max(1, Math.min(100, parseInt(item.quantity) || 1));
      const itemPriceUsd = grams * goldPricePerGram * (1 + GOLD_PRICE_MARGIN);
      const itemPriceAed = itemPriceUsd * USD_TO_AED;

      validatedItems.push({
        barSize,
        grams,
        quantity,
        priceUsd: itemPriceUsd,
        priceAed: itemPriceAed,
      });

      serverTotalGrams += grams * quantity;
      serverTotalUsd += itemPriceUsd * quantity;
    }

    const serverTotalAed = serverTotalUsd * USD_TO_AED;

    let validatedVaultId: string | null = null;
    if (vaultLocationId) {
      const vaultLocations = await db.select().from(wingoldVaultLocations).where(eq(wingoldVaultLocations.isActive, true));
      const validVault = vaultLocations.find((v) => v.id === vaultLocationId);
      if (!validVault) {
        console.log('[SSO Checkout] Vault validation failed:', { 
          receivedVaultId: vaultLocationId, 
          availableVaults: vaultLocations.map((v) => ({ id: v.id, name: v.name }))
        });
        return res.status(400).json({ error: "Invalid vault location" });
      }
      validatedVaultId = validVault.id;
    }

    const vcData = await getActiveVerifiableCredential(userId);

    const orderId = crypto.randomUUID();
    const nonce = crypto.randomBytes(16).toString('hex');

    // Build the callback URL for redirect flow
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/wingold/callback`;

    const payload: Record<string, any> = {
      sub: String(user.id),
      jti: orderId,
      nonce,
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
      source: 'finatrades_redirect_checkout',
      embedded: false,
      callbackUrl,
      iss: "finatrades.com",
      cart: {
        items: validatedItems,
        vaultLocationId: validatedVaultId,
        totalGrams: serverTotalGrams,
        totalUsd: serverTotalUsd,
        totalAed: serverTotalAed,
        goldPricePerGram,
        calculatedAt: new Date().toISOString(),
      },
    };

    if (vcData) {
      payload.verifiableCredential = {
        id: vcData.credentialId,
        statusEndpoint: `${baseUrl}/api/vc/status/${vcData.credentialId}`,
        fetchEndpoint: `${baseUrl}/api/vc/partner/credential/${vcData.credentialId}`,
      };
    }

    const token = jwt.sign(payload, getPrivateKey(), { 
      algorithm: "RS256",
      expiresIn: "30m",
    });

    // Store the pending order for verification on callback
    pendingCheckoutOrders.set(orderId, {
      userId: String(user.id),
      orderId,
      nonce,
      totalGrams: serverTotalGrams,
      totalUsd: serverTotalUsd,
      totalAed: serverTotalAed,
      items: validatedItems,
      vaultLocationId: validatedVaultId,
      createdAt: new Date(),
      status: 'pending',
    });

    // Use redirect checkout URL (full page, not embedded)
    const checkoutUrl = `${WINGOLD_URL}/checkout?token=${encodeURIComponent(token)}`;

    console.log('[SSO Checkout] Generated redirect checkout:', { orderId, checkoutUrl: checkoutUrl.substring(0, 100) + '...' });

    res.json({ 
      checkoutUrl,
      expiresIn: 1800,
      orderId,
      nonce,
      callbackUrl,
      serverCalculatedTotal: {
        grams: serverTotalGrams,
        usd: serverTotalUsd,
        aed: serverTotalAed,
      },
    });
  } catch (error: any) {
    console.error("SSO redirect checkout error:", error);
    res.status(500).json({ error: "Failed to generate checkout URL" });
  }
});

/**
 * Callback endpoint for Wingold to redirect back after payment
 * Verifies the order and updates status
 */
router.get("/api/sso/wingold/callback", async (req, res) => {
  try {
    const { orderId, status, signature, referenceNumber, error: errorMsg } = req.query;

    console.log('[Wingold Callback] Received:', { orderId, status, referenceNumber });

    if (!orderId || typeof orderId !== 'string') {
      return res.redirect('/dashboard?error=missing_order_id');
    }

    const pendingOrder = pendingCheckoutOrders.get(orderId);
    if (!pendingOrder) {
      console.log('[Wingold Callback] Order not found:', orderId);
      return res.redirect('/dashboard?error=order_not_found');
    }

    // Verify the signature from Wingold (HMAC-SHA256 with webhook secret)
    const webhookSecret = process.env.WINGOLD_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${orderId}:${status}:${pendingOrder.nonce}`)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.log('[Wingold Callback] Signature mismatch:', { expected: expectedSignature, received: signature });
        return res.redirect('/dashboard?error=invalid_signature');
      }
    }

    // Update order status
    if (status === 'success') {
      pendingOrder.status = 'completed';
      console.log('[Wingold Callback] Payment successful:', { orderId, referenceNumber });
      
      // Redirect to success page with order details
      const successParams = new URLSearchParams({
        orderId: orderId,
        referenceNumber: String(referenceNumber || ''),
        grams: String(pendingOrder.totalGrams),
        usd: String(pendingOrder.totalUsd.toFixed(2)),
      });
      return res.redirect(`/wingold/callback?status=success&${successParams.toString()}`);
      
    } else if (status === 'cancelled') {
      pendingOrder.status = 'cancelled';
      console.log('[Wingold Callback] Payment cancelled:', { orderId });
      return res.redirect('/wingold/callback?status=cancelled');
      
    } else {
      pendingOrder.status = 'failed';
      console.log('[Wingold Callback] Payment failed:', { orderId, error: errorMsg });
      return res.redirect(`/wingold/callback?status=failed&error=${encodeURIComponent(String(errorMsg || 'Payment failed'))}`);
    }
  } catch (error: any) {
    console.error('[Wingold Callback] Error:', error);
    return res.redirect('/dashboard?error=callback_error');
  }
});

/**
 * API endpoint for checking order status (for frontend polling)
 */
router.get("/api/sso/wingold/order/:orderId", ensureAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const session = (req as any).session;
    const userId = String(session.userId);

    const order = pendingCheckoutOrders.get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify the order belongs to this user
    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      orderId: order.orderId,
      status: order.status,
      totalGrams: order.totalGrams,
      totalUsd: order.totalUsd,
      totalAed: order.totalAed,
      createdAt: order.createdAt,
    });
  } catch (error: any) {
    console.error('[Order Status] Error:', error);
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// Returns allowed origins for postMessage validation
router.get("/api/sso/wingold/allowed-origins", (req, res) => {
  // Build the allowed origins list from configured WINGOLD_URL and additional known domains
  const origins = [
    WINGOLD_URL,
    'https://wingoldandmetals.com',
    'https://www.wingoldandmetals.com',
    'https://wingoldandmetals.replit.app',
  ];
  
  // Add any additional origins from environment (comma-separated)
  const additionalOrigins = process.env.WINGOLD_ALLOWED_ORIGINS;
  if (additionalOrigins) {
    origins.push(...additionalOrigins.split(',').map(o => o.trim()).filter(Boolean));
  }
  
  // Remove duplicates and return
  const uniqueOrigins = Array.from(new Set(origins));
  res.json({ 
    origins: uniqueOrigins,
    primary: WINGOLD_URL
  });
});

export function registerSsoRoutes(app: any) {
  app.use(router);
}

export { getPrivateKey, WINGOLD_URL };
