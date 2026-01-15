/**
 * Wingold Webhook Routes - Admin Approval Webhook Endpoint
 * 
 * Handles POST /api/unified/callback/wingold-order from Wingold
 * when admin approves an order.
 * 
 * Security Features:
 * - HMAC-SHA256 signature verification (X-WINGOLD-SIGNATURE header)
 * - Timestamp validation to prevent replay attacks (X-WINGOLD-TIMESTAMP header)
 * - Idempotency via event_id (duplicate events return 200 "already processed")
 * - Audit logging for all events
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  wingoldOrderEvents, 
  externalPurchaseRefs, 
  users,
  vaultLedgerEntries,
  wallets 
} from "@shared/schema";
import { storage } from "./storage";

const router = Router();

// Zod schema for webhook payload validation
const GoldItemSchema = z.object({
  sku: z.string(),
  weight_g: z.number().positive(),
  purity: z.string(),
  qty: z.number().int().positive(),
});

const WingoldOrderWebhookSchema = z.object({
  event: z.literal("WINGOLD_ORDER_APPROVED"),
  event_id: z.string().uuid(),
  wingold_order_id: z.string(),
  finatrades_user_id: z.string(),
  amount: z.number().positive(),
  currency: z.enum(["AED", "USD"]),
  gold_items: z.array(GoldItemSchema),
  payment_method: z.enum(["CARD", "BANK", "CRYPTO"]),
  payment_status: z.enum(["PAID", "PENDING", "VERIFIED"]),
  bank_reference: z.string().optional().nullable(),
  crypto_tx_hash: z.string().optional().nullable(),
  gateway_ref: z.string().optional().nullable(),
  timestamps: z.object({
    order_created_at: z.string(),
    payment_confirmed_at: z.string().optional(),
    approved_at: z.string(),
  }),
});

type WingoldOrderWebhook = z.infer<typeof WingoldOrderWebhookSchema>;

// HMAC signature verification
function verifyWebhookSignature(
  rawBody: string, 
  signature: string | undefined, 
  timestamp: string | undefined,
  secret: string
): { valid: boolean; error?: string } {
  if (!signature) {
    return { valid: false, error: "Missing X-WINGOLD-SIGNATURE header" };
  }
  
  if (!timestamp) {
    return { valid: false, error: "Missing X-WINGOLD-TIMESTAMP header" };
  }
  
  // Verify timestamp is within 5 minutes to prevent replay attacks
  const timestampMs = parseInt(timestamp, 10);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
    return { valid: false, error: "Timestamp expired or invalid" };
  }
  
  // Compute expected signature: HMAC-SHA256(secret, rawBody + timestamp)
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody + timestamp)
    .digest("hex");
  
  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  
  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: "Invalid signature" };
  }
  
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, error: "Signature mismatch" };
  }
  
  return { valid: true };
}

// Calculate total grams from gold items
function calculateTotalGrams(items: Array<{ weight_g: number; qty: number }>): number {
  return items.reduce((sum, item) => sum + (item.weight_g * item.qty), 0);
}

// Create audit log entry
async function createAuditLog(
  actor: string,
  actionType: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any>
) {
  try {
    await storage.createAuditLog({
      actor,
      actorRole: "system",
      actionType,
      entityType,
      entityId,
      details: JSON.stringify(metadata),
    });
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}

/**
 * POST /api/unified/callback/wingold-order
 * 
 * Webhook endpoint for Wingold admin order approval events
 */
router.post("/api/unified/callback/wingold-order", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-wingold-signature"] as string | undefined;
    const timestamp = req.headers["x-wingold-timestamp"] as string | undefined;
    
    console.log("[Wingold Webhook] Received:", { 
      hasSignature: !!signature, 
      hasTimestamp: !!timestamp,
      contentLength: rawBody.length 
    });
    
    // Verify webhook signature
    const webhookSecret = process.env.WINGOLD_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Wingold Webhook] WINGOLD_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook configuration error" });
    }
    
    const signatureResult = verifyWebhookSignature(rawBody, signature, timestamp, webhookSecret);
    if (!signatureResult.valid) {
      console.error("[Wingold Webhook] Signature verification failed:", signatureResult.error);
      await createAuditLog(
        "wingold-webhook",
        "WEBHOOK_SIGNATURE_FAILED",
        "wingold_order_event",
        "unknown",
        { error: signatureResult.error, headers: { hasSignature: !!signature, hasTimestamp: !!timestamp } }
      );
      return res.status(401).json({ error: signatureResult.error });
    }
    
    // Validate payload schema
    const parseResult = WingoldOrderWebhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error("[Wingold Webhook] Invalid payload:", parseResult.error.errors);
      return res.status(400).json({ 
        error: "Invalid payload", 
        details: parseResult.error.errors 
      });
    }
    
    const payload = parseResult.data;
    
    // Check idempotency - has this event already been processed?
    const [existingEvent] = await db.select()
      .from(wingoldOrderEvents)
      .where(eq(wingoldOrderEvents.eventId, payload.event_id))
      .limit(1);
    
    if (existingEvent) {
      console.log("[Wingold Webhook] Duplicate event, already processed:", payload.event_id);
      return res.status(200).json({ 
        status: "already_processed",
        event_id: payload.event_id,
        processed_at: existingEvent.processedAt 
      });
    }
    
    // Verify user exists
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, payload.finatrades_user_id))
      .limit(1);
    
    if (!user) {
      console.error("[Wingold Webhook] User not found:", payload.finatrades_user_id);
      return res.status(400).json({ error: "User not found" });
    }
    
    // Calculate total grams
    const totalGrams = calculateTotalGrams(payload.gold_items);
    
    // Transform gold items for storage
    const goldItemsForStorage = payload.gold_items.map(item => ({
      sku: item.sku,
      weightGrams: item.weight_g,
      purity: item.purity,
      quantity: item.qty,
    }));
    
    // Store the event
    const [orderEvent] = await db.insert(wingoldOrderEvents).values({
      eventId: payload.event_id,
      wingoldOrderId: payload.wingold_order_id,
      userId: payload.finatrades_user_id,
      eventType: payload.event,
      amount: String(payload.amount),
      currency: payload.currency,
      totalGrams: String(totalGrams),
      paymentMethod: payload.payment_method,
      paymentStatus: payload.payment_status,
      bankReference: payload.bank_reference || null,
      cryptoTxHash: payload.crypto_tx_hash || null,
      gatewayRef: payload.gateway_ref || null,
      goldItems: goldItemsForStorage,
      payloadJson: payload,
      processedAt: new Date(),
    }).returning();
    
    // Process based on payment method
    let creditedWallet = false;
    let creditedGrams = 0;
    
    if (payload.payment_method === "CARD") {
      // CARD payments: Store reference only, no wallet credit
      await db.insert(externalPurchaseRefs).values({
        userId: payload.finatrades_user_id,
        wingoldOrderId: payload.wingold_order_id,
        paymentMethod: "CARD",
        gatewayRef: payload.gateway_ref || null,
        amount: String(payload.amount),
        currency: payload.currency,
        totalGrams: String(totalGrams),
        goldItems: goldItemsForStorage,
        note: "External purchase via Wingold - Card payment (no wallet credit)",
      });
      
      console.log("[Wingold Webhook] CARD payment - stored reference only:", {
        orderId: payload.wingold_order_id,
        userId: payload.finatrades_user_id,
        amount: payload.amount,
        grams: totalGrams,
      });
      
      await createAuditLog(
        "wingold-webhook",
        "EXTERNAL_PURCHASE_RECORDED",
        "external_purchase_ref",
        payload.wingold_order_id,
        { paymentMethod: "CARD", amount: payload.amount, grams: totalGrams }
      );
      
    } else if (payload.payment_method === "BANK" || payload.payment_method === "CRYPTO") {
      // BANK/CRYPTO payments: Credit user's wallet with gold
      if (payload.payment_status === "PAID" || payload.payment_status === "VERIFIED") {
        try {
          // Get user's primary wallet
          const [wallet] = await db.select()
            .from(wallets)
            .where(eq(wallets.userId, payload.finatrades_user_id))
            .limit(1);
          
          if (wallet) {
            // Credit the wallet with gold grams
            const currentBalance = parseFloat(wallet.goldGrams || "0");
            const newBalance = currentBalance + totalGrams;
            
            await db.update(wallets)
              .set({ 
                goldGrams: String(newBalance),
                updatedAt: new Date() 
              })
              .where(eq(wallets.id, wallet.id));
            
            // Create ledger entry for the deposit
            await db.insert(vaultLedgerEntries).values({
              userId: payload.finatrades_user_id,
              action: "Deposit",
              goldGrams: String(totalGrams),
              balanceAfterGrams: String(newBalance),
              transactionId: payload.wingold_order_id,
            });
            
            creditedWallet = true;
            creditedGrams = totalGrams;
            
            console.log("[Wingold Webhook] Wallet credited:", {
              orderId: payload.wingold_order_id,
              userId: payload.finatrades_user_id,
              walletId: wallet.id,
              creditedGrams: totalGrams,
              newBalance,
            });
            
            await createAuditLog(
              "wingold-webhook",
              "WALLET_CREDITED",
              "wallet",
              wallet.id,
              { 
                paymentMethod: payload.payment_method, 
                grams: totalGrams, 
                orderId: payload.wingold_order_id,
                reference: payload.bank_reference || payload.crypto_tx_hash 
              }
            );
          } else {
            console.error("[Wingold Webhook] User has no wallet:", payload.finatrades_user_id);
          }
        } catch (creditError) {
          console.error("[Wingold Webhook] Failed to credit wallet:", creditError);
          // Don't fail the webhook - the event is stored, can be retried manually
        }
      }
    }
    
    // Update event with credit status
    if (creditedWallet) {
      await db.update(wingoldOrderEvents)
        .set({ 
          walletCredited: true,
          creditedGrams: String(creditedGrams),
        })
        .where(eq(wingoldOrderEvents.eventId, payload.event_id));
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log("[Wingold Webhook] Processed successfully:", {
      eventId: payload.event_id,
      orderId: payload.wingold_order_id,
      paymentMethod: payload.payment_method,
      walletCredited: creditedWallet,
      creditedGrams,
      processingTimeMs: processingTime,
    });
    
    return res.status(200).json({
      status: "processed",
      event_id: payload.event_id,
      order_id: payload.wingold_order_id,
      wallet_credited: creditedWallet,
      credited_grams: creditedGrams,
      processing_time_ms: processingTime,
    });
    
  } catch (error: any) {
    console.error("[Wingold Webhook] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/unified/wingold-orders/:eventId
 * 
 * Check status of a processed webhook event
 */
router.get("/api/unified/wingold-orders/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const [event] = await db.select()
      .from(wingoldOrderEvents)
      .where(eq(wingoldOrderEvents.eventId, eventId))
      .limit(1);
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    return res.json({
      eventId: event.eventId,
      wingoldOrderId: event.wingoldOrderId,
      userId: event.userId,
      eventType: event.eventType,
      paymentMethod: event.paymentMethod,
      paymentStatus: event.paymentStatus,
      totalGrams: parseFloat(event.totalGrams),
      walletCredited: event.walletCredited,
      creditedGrams: event.creditedGrams ? parseFloat(event.creditedGrams) : null,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
    });
  } catch (error: any) {
    console.error("[Wingold Orders] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export function registerWingoldWebhookRoutes(app: any) {
  app.use(router);
  console.log("[Partner API] Wingold webhook routes registered");
}

export default router;
