/**
 * Wingold Webhook Routes - Receives webhooks from Wingold
 * 
 * Handles POST /api/unified/callback/wingold-order from Wingold
 * for various order lifecycle events.
 * 
 * Wingold Events:
 * - order.confirmed: Order placed and payment received
 * - order.approved: Admin approves the order
 * - bar.allocated: Physical bar assigned with serial number
 * - certificate.issued: Storage/bar certificate generated
 * - order.fulfilled: Order complete (Finatrades credits wallet here)
 * - order.cancelled: Order cancelled
 * 
 * Security Features:
 * - HMAC-SHA256 signature verification (X-Wingold-Signature header)
 * - Idempotency via orderId + event combo
 * - Audit logging for all events
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { 
  wingoldOrderEvents, 
  users,
  wallets,
  vaultHoldings,
  certificates,
  transactions,
  notifications,
  unifiedTallyTransactions
} from "@shared/schema";
import { storage } from "./storage";

const router = Router();

// Wingold event types
const WINGOLD_EVENTS = [
  "order.confirmed",
  "order.approved", 
  "bar.allocated",
  "certificate.issued",
  "order.fulfilled",
  "order.cancelled"
] as const;

type WingoldEventType = typeof WINGOLD_EVENTS[number];

// Zod schemas for each event type's data payload
const OrderConfirmedDataSchema = z.object({
  finatradesId: z.string(),
  barSize: z.string(),
  barCount: z.number(),
  totalGrams: z.string(),
  usdAmount: z.string(),
  goldPricePerGram: z.string(),
  vaultLocationId: z.string().optional(),
  wingoldReference: z.string()
});

const BarAllocatedDataSchema = z.object({
  barId: z.string(),
  serialNumber: z.string(),
  barSize: z.string(),
  weightGrams: z.string(),
  purity: z.string(),
  mint: z.string(),
  vaultLocationId: z.string(),
  vaultLocationName: z.string()
});

const CertificateIssuedDataSchema = z.object({
  certificateNumber: z.string(),
  certificateType: z.enum(["storage", "bar"]),
  barId: z.string().optional(),
  pdfUrl: z.string().optional(),
  issuedAt: z.string(),
  signature: z.string().optional(),
  jsonData: z.record(z.any()).optional()
});

const OrderFulfilledDataSchema = z.object({
  finatradesId: z.string(),
  totalGrams: z.string(),
  barCount: z.number(),
  vaultLocation: z.string().optional(),
  wingoldReference: z.string(),
  storageCertificateNumber: z.string().optional(),
  storageCertificatePdfUrl: z.string().optional()
});

const OrderCancelledDataSchema = z.object({
  finatradesId: z.string().optional(),
  reason: z.string(),
  refundAmount: z.string().optional(),
  refundCurrency: z.string().optional()
});

// Base webhook payload schema
const WingoldWebhookBaseSchema = z.object({
  event: z.enum(WINGOLD_EVENTS),
  orderId: z.string(),
  timestamp: z.string(),
  signature: z.string().optional(),
  data: z.record(z.any())
});

type WingoldWebhookPayload = z.infer<typeof WingoldWebhookBaseSchema>;

// HMAC signature verification (matches Wingold's signing method)
// Uses raw body for exact byte comparison to prevent JSON serialization differences
function verifyWebhookSignature(
  rawBody: string | Buffer | undefined,
  payload: Record<string, any>,
  receivedSignature: string | undefined,
  secret: string
): { valid: boolean; error?: string } {
  if (!receivedSignature) {
    return { valid: false, error: "Missing X-Wingold-Signature header" };
  }
  
  // Wingold signs: JSON.stringify({...payload, signature: undefined})
  // Try raw body first if available, otherwise reconstruct from parsed body
  let payloadStr: string;
  
  if (rawBody) {
    // Use raw body for exact byte comparison
    const rawStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    // Parse and re-stringify without signature field
    try {
      const parsed = JSON.parse(rawStr);
      delete parsed.signature;
      payloadStr = JSON.stringify(parsed);
    } catch {
      // Fallback to raw body as-is
      payloadStr = rawStr;
    }
  } else {
    // Fallback: reconstruct from parsed body
    const payloadToSign = { ...payload };
    delete payloadToSign.signature;
    payloadStr = JSON.stringify(payloadToSign);
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("hex");
  
  // Constant-time comparison
  try {
    const receivedBuffer = Buffer.from(receivedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    
    if (receivedBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: "Invalid signature length" };
    }
    
    if (!crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
      return { valid: false, error: "Signature mismatch" };
    }
  } catch {
    return { valid: false, error: "Invalid signature format" };
  }
  
  return { valid: true };
}

// Replay protection: verify timestamp is recent (within 5 minutes)
function verifyTimestamp(timestamp: string): { valid: boolean; error?: string } {
  try {
    const timestampMs = new Date(timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (isNaN(timestampMs)) {
      return { valid: false, error: "Invalid timestamp format" };
    }
    
    if (Math.abs(now - timestampMs) > fiveMinutes) {
      return { valid: false, error: "Timestamp expired (replay attack protection)" };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to parse timestamp" };
  }
}

// Generate certificate number
function generateCertificateNumber(type: string): string {
  const prefix = type === "Physical Storage" ? "WG-PSC" : "FT-DOC";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
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
    console.error("[Wingold Webhook] Failed to create audit log:", error);
  }
}

// Store webhook event for idempotency - ALWAYS stores regardless of user status
// This ensures replay protection even for webhooks with unknown users
async function storeWebhookEvent(
  payload: WingoldWebhookPayload,
  userId: string | null,
  finatradesIdFromPayload: string | null
): Promise<{ isNew: boolean; eventRecord?: any; alreadyProcessed: boolean }> {
  const eventKey = `${payload.orderId}:${payload.event}`;
  
  // Check if already processed (idempotency check)
  const [existing] = await db.select()
    .from(wingoldOrderEvents)
    .where(eq(wingoldOrderEvents.eventId, eventKey))
    .limit(1);
  
  if (existing) {
    return { 
      isNew: false, 
      eventRecord: existing, 
      alreadyProcessed: existing.processedAt !== null 
    };
  }
  
  // Always store event for idempotency - userId is nullable in schema
  try {
    const [eventRecord] = await db.insert(wingoldOrderEvents).values({
      eventId: eventKey,
      wingoldOrderId: payload.orderId,
      userId: userId, // Can be null - schema allows it
      finatradesIdFromPayload: finatradesIdFromPayload, // Store for later lookup if user not found
      eventType: payload.event,
      amount: payload.data.usdAmount || null,
      currency: "USD",
      totalGrams: payload.data.totalGrams || null,
      paymentMethod: null, // Optional - not all events have this
      paymentStatus: null,
      payloadJson: payload,
      processedAt: null, // Will be set after successful processing
    }).returning();
    
    return { isNew: true, eventRecord, alreadyProcessed: false };
  } catch (error: any) {
    // If insert fails due to unique constraint, event was already stored (race condition)
    if (error.code === '23505') { // Postgres unique violation
      const [existing] = await db.select()
        .from(wingoldOrderEvents)
        .where(eq(wingoldOrderEvents.eventId, eventKey))
        .limit(1);
      return { 
        isNew: false, 
        eventRecord: existing, 
        alreadyProcessed: existing?.processedAt !== null 
      };
    }
    console.error("[Wingold Webhook] Failed to store event:", error);
    throw error; // Re-throw to prevent processing without idempotency
  }
}

/**
 * POST /api/unified/callback/wingold-order
 * 
 * Main webhook endpoint for all Wingold order events
 */
router.post("/api/unified/callback/wingold-order", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const signature = req.headers["x-wingold-signature"] as string | undefined;
    const eventHeader = req.headers["x-wingold-event"] as string | undefined;
    const rawBody = (req as any).rawBody as Buffer | undefined;
    
    console.log("[Wingold Webhook] Received:", { 
      event: eventHeader || req.body?.event,
      orderId: req.body?.orderId,
      hasSignature: !!signature,
      hasRawBody: !!rawBody
    });
    
    // Verify webhook signature
    const webhookSecret = process.env.WINGOLD_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Wingold Webhook] WINGOLD_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook configuration error" });
    }
    
    const signatureResult = verifyWebhookSignature(rawBody, req.body, signature, webhookSecret);
    if (!signatureResult.valid) {
      console.error("[Wingold Webhook] Signature verification failed:", signatureResult.error);
      await createAuditLog(
        "wingold-webhook",
        "WEBHOOK_SIGNATURE_FAILED",
        "wingold_order_event",
        req.body?.orderId || "unknown",
        { error: signatureResult.error }
      );
      return res.status(401).json({ error: signatureResult.error });
    }
    
    // Validate base payload
    const parseResult = WingoldWebhookBaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error("[Wingold Webhook] Invalid payload:", parseResult.error.errors);
      return res.status(400).json({ 
        error: "Invalid payload", 
        details: parseResult.error.errors 
      });
    }
    
    const payload = parseResult.data;
    
    // Verify timestamp for replay protection
    const timestampResult = verifyTimestamp(payload.timestamp);
    if (!timestampResult.valid) {
      console.error("[Wingold Webhook] Timestamp verification failed:", timestampResult.error);
      await createAuditLog(
        "wingold-webhook",
        "WEBHOOK_REPLAY_BLOCKED",
        "wingold_order_event",
        payload.orderId,
        { error: timestampResult.error, timestamp: payload.timestamp }
      );
      return res.status(401).json({ error: timestampResult.error });
    }
    
    // Get finatradesId from data if available
    const finatradesId = payload.data.finatradesId as string | undefined;
    
    // Look up user if finatradesId provided
    let user = null;
    if (finatradesId) {
      const [foundUser] = await db.select()
        .from(users)
        .where(eq(users.id, finatradesId))
        .limit(1);
      user = foundUser;
    }
    
    // Store event for idempotency (always stores, even without user)
    const { isNew, eventRecord, alreadyProcessed } = await storeWebhookEvent(
      payload, 
      user?.id || null, 
      finatradesId || null
    );
    
    if (!isNew || alreadyProcessed) {
      console.log("[Wingold Webhook] Duplicate event, already processed:", payload.orderId, payload.event);
      return res.status(200).json({ 
        status: "already_processed",
        orderId: payload.orderId,
        event: payload.event,
        processedAt: eventRecord?.processedAt
      });
    }
    
    // Process based on event type
    let result: { success: boolean; message: string; walletCredited?: boolean; creditedGrams?: number } = {
      success: true,
      message: "Event received"
    };
    
    switch (payload.event) {
      case "order.confirmed":
        result = await handleOrderConfirmed(payload, user);
        break;
        
      case "order.approved":
        result = await handleOrderApproved(payload, user);
        break;
        
      case "bar.allocated":
        result = await handleBarAllocated(payload, user);
        break;
        
      case "certificate.issued":
        result = await handleCertificateIssued(payload, user);
        break;
        
      case "order.fulfilled":
        result = await handleOrderFulfilled(payload, user);
        break;
        
      case "order.cancelled":
        result = await handleOrderCancelled(payload, user);
        break;
        
      default:
        console.warn("[Wingold Webhook] Unknown event type:", payload.event);
    }
    
    // Mark event as processed
    await db.update(wingoldOrderEvents)
      .set({ 
        processedAt: new Date(),
        walletCredited: result.walletCredited || false,
        creditedGrams: result.creditedGrams ? String(result.creditedGrams) : null
      })
      .where(eq(wingoldOrderEvents.eventId, `${payload.orderId}:${payload.event}`));
    
    const processingTime = Date.now() - startTime;
    
    console.log("[Wingold Webhook] Processed:", {
      event: payload.event,
      orderId: payload.orderId,
      result: result.message,
      processingTimeMs: processingTime
    });
    
    return res.status(200).json({
      status: "processed",
      orderId: payload.orderId,
      event: payload.event,
      ...result,
      processingTimeMs: processingTime
    });
    
  } catch (error: any) {
    console.error("[Wingold Webhook] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Event Handlers

async function handleOrderConfirmed(
  payload: WingoldWebhookPayload, 
  user: any
): Promise<{ success: boolean; message: string }> {
  const dataResult = OrderConfirmedDataSchema.safeParse(payload.data);
  if (!dataResult.success) {
    console.error("[Wingold Webhook] Invalid order.confirmed data:", dataResult.error);
    return { success: false, message: "Invalid data format" };
  }
  
  const data = dataResult.data;
  
  await createAuditLog(
    "wingold-webhook",
    "ORDER_CONFIRMED",
    "wingold_order",
    payload.orderId,
    { 
      finatradesId: data.finatradesId,
      totalGrams: data.totalGrams,
      usdAmount: data.usdAmount,
      wingoldReference: data.wingoldReference
    }
  );
  
  // Send notification to user if found
  if (user) {
    await db.insert(notifications).values({
      userId: user.id,
      title: "Gold Purchase Confirmed",
      message: `Your order of ${data.totalGrams}g gold has been confirmed by Wingold. We're processing your order.`,
      type: "transaction",
      link: "/dashboard"
    });
  }
  
  return { success: true, message: "Order confirmed notification sent" };
}

async function handleOrderApproved(
  payload: WingoldWebhookPayload,
  user: any
): Promise<{ success: boolean; message: string }> {
  const dataResult = OrderConfirmedDataSchema.safeParse(payload.data);
  
  await createAuditLog(
    "wingold-webhook", 
    "ORDER_APPROVED",
    "wingold_order",
    payload.orderId,
    { data: payload.data }
  );
  
  // Create UTT entry for Finatrades admin to approve (appears in UFM)
  if (user && dataResult.success) {
    const data = dataResult.data;
    
    // Generate UTT reference number
    const year = new Date().getFullYear();
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM unified_tally_transactions WHERE txn_id LIKE ${'UGT-' + year + '-%'}`);
    const count = parseInt((countResult.rows[0] as any)?.count || '0') + 1;
    const txnId = `UGT-${year}-${String(count).padStart(6, '0')}`;
    
    // Check if UTT already exists for this Wingold order
    const existingUtt = await db.select()
      .from(unifiedTallyTransactions)
      .where(eq(unifiedTallyTransactions.wingoldOrderId, payload.orderId))
      .limit(1);
    
    if (existingUtt.length === 0) {
      // Create new UTT entry for Finatrades admin approval
      await db.insert(unifiedTallyTransactions).values({
        txnId,
        userId: user.id,
        userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        userEmail: user.email,
        txnType: 'FIAT_CRYPTO_DEPOSIT',
        sourceMethod: 'CARD', // Wingold purchases treated as card payments
        walletType: 'LGPW',
        status: 'PHYSICAL_ORDERED', // Will appear in UFM for Finatrades admin
        depositCurrency: 'USD',
        depositAmount: data.usdAmount,
        netAmount: data.usdAmount,
        goldRateValue: data.goldPricePerGram,
        goldEquivalentG: data.totalGrams,
        wingoldOrderId: payload.orderId,
        wingoldBuyRate: data.goldPricePerGram,
        notes: `Wingold order approved. Reference: ${data.wingoldReference}. Awaiting Finatrades admin approval.`,
      });
      
      console.log("[Wingold Webhook] UTT created for Finatrades approval:", {
        txnId,
        userId: user.id,
        totalGrams: data.totalGrams,
        wingoldOrderId: payload.orderId
      });
      
      // Notify user
      await db.insert(notifications).values({
        userId: user.id,
        title: "Wingold Order Approved",
        message: `Your Wingold order for ${data.totalGrams}g has been approved. Awaiting final processing.`,
        type: "transaction",
        link: "/dashboard"
      });
    }
  }
  
  return { success: true, message: "Order approved - UTT created for Finatrades approval" };
}

async function handleBarAllocated(
  payload: WingoldWebhookPayload,
  user: any
): Promise<{ success: boolean; message: string }> {
  const dataResult = BarAllocatedDataSchema.safeParse(payload.data);
  if (!dataResult.success) {
    console.error("[Wingold Webhook] Invalid bar.allocated data:", dataResult.error);
    return { success: false, message: "Invalid data format" };
  }
  
  const data = dataResult.data;
  
  await createAuditLog(
    "wingold-webhook",
    "BAR_ALLOCATED", 
    "wingold_bar",
    data.barId,
    {
      serialNumber: data.serialNumber,
      barSize: data.barSize,
      weightGrams: data.weightGrams,
      purity: data.purity,
      mint: data.mint,
      vaultLocation: data.vaultLocationName
    }
  );
  
  return { success: true, message: `Bar ${data.serialNumber} allocated` };
}

async function handleCertificateIssued(
  payload: WingoldWebhookPayload,
  user: any  
): Promise<{ success: boolean; message: string }> {
  const dataResult = CertificateIssuedDataSchema.safeParse(payload.data);
  if (!dataResult.success) {
    console.error("[Wingold Webhook] Invalid certificate.issued data:", dataResult.error);
    return { success: false, message: "Invalid data format" };
  }
  
  const data = dataResult.data;
  
  await createAuditLog(
    "wingold-webhook",
    "CERTIFICATE_ISSUED",
    "wingold_certificate", 
    data.certificateNumber,
    {
      type: data.certificateType,
      barId: data.barId,
      pdfUrl: data.pdfUrl
    }
  );
  
  return { success: true, message: `Certificate ${data.certificateNumber} issued` };
}

async function handleOrderFulfilled(
  payload: WingoldWebhookPayload,
  user: any
): Promise<{ success: boolean; message: string; walletCredited?: boolean; creditedGrams?: number }> {
  const dataResult = OrderFulfilledDataSchema.safeParse(payload.data);
  if (!dataResult.success) {
    console.error("[Wingold Webhook] Invalid order.fulfilled data:", dataResult.error);
    return { success: false, message: "Invalid data format" };
  }
  
  const data = dataResult.data;
  
  if (!user) {
    console.error("[Wingold Webhook] User not found for order.fulfilled:", data.finatradesId);
    return { success: false, message: "User not found" };
  }
  
  const totalGrams = parseFloat(data.totalGrams);
  
  try {
    // Check if UTT exists for this Wingold order
    const existingUtt = await db.select()
      .from(unifiedTallyTransactions)
      .where(eq(unifiedTallyTransactions.wingoldOrderId, payload.orderId))
      .limit(1);
    
    if (existingUtt.length > 0) {
      // Update existing UTT with fulfillment data - mark ready for Finatrades admin approval
      await db.update(unifiedTallyTransactions)
        .set({
          status: 'CERT_RECEIVED', // Ready for Finatrades admin to approve
          storageCertificateId: data.storageCertificateNumber || null,
          physicalGoldAllocatedG: data.totalGrams,
          notes: `Wingold order fulfilled. Reference: ${data.wingoldReference}. Certificate: ${data.storageCertificateNumber || 'pending'}. Ready for Finatrades admin approval.`,
          updatedAt: new Date(),
        })
        .where(eq(unifiedTallyTransactions.wingoldOrderId, payload.orderId));
      
      console.log("[Wingold Webhook] UTT updated for Finatrades approval:", {
        wingoldOrderId: payload.orderId,
        totalGrams,
        storageCertificate: data.storageCertificateNumber
      });
    } else {
      // Create new UTT if it doesn't exist (fallback for direct orders)
      const year = new Date().getFullYear();
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM unified_tally_transactions WHERE txn_id LIKE ${'UGT-' + year + '-%'}`);
      const count = parseInt((countResult.rows[0] as any)?.count || '0') + 1;
      const txnId = `UGT-${year}-${String(count).padStart(6, '0')}`;
      
      await db.insert(unifiedTallyTransactions).values({
        txnId,
        userId: user.id,
        userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
        userEmail: user.email,
        txnType: 'FIAT_CRYPTO_DEPOSIT',
        sourceMethod: 'CARD', // Wingold purchases treated as card payments
        walletType: 'LGPW',
        status: 'CERT_RECEIVED',
        goldEquivalentG: data.totalGrams,
        physicalGoldAllocatedG: data.totalGrams,
        storageCertificateId: data.storageCertificateNumber || null,
        wingoldOrderId: payload.orderId,
        notes: `Wingold order fulfilled. Reference: ${data.wingoldReference}. Ready for Finatrades admin approval.`,
      });
      
      console.log("[Wingold Webhook] UTT created from order.fulfilled:", {
        txnId,
        userId: user.id,
        totalGrams
      });
    }
    
    // Notify user that order is ready for final processing
    await db.insert(notifications).values({
      userId: user.id,
      title: "Wingold Order Fulfilled",
      message: `Your ${data.totalGrams}g gold purchase from Wingold has been fulfilled and is being processed.`,
      type: "transaction",
      link: "/dashboard"
    });
    
    await createAuditLog(
      "wingold-webhook",
      "ORDER_FULFILLED_PENDING_APPROVAL",
      "unified_tally",
      payload.orderId,
      {
        orderId: payload.orderId,
        grams: totalGrams,
        wingoldReference: data.wingoldReference,
        storageCertificate: data.storageCertificateNumber
      }
    );
    
    console.log("[Wingold Webhook] Order fulfilled - awaiting Finatrades admin approval:", {
      userId: user.id,
      grams: totalGrams,
      wingoldReference: data.wingoldReference
    });
    
    // NOTE: Wallet is NOT credited here. Finatrades admin must approve in UFM first.
    return { 
      success: true, 
      message: `Order fulfilled - pending Finatrades admin approval in UFM`,
      walletCredited: false,
      creditedGrams: 0
    };
    
  } catch (error) {
    console.error("[Wingold Webhook] Failed to process order.fulfilled:", error);
    return { success: false, message: "Failed to process order" };
  }
}

async function handleOrderCancelled(
  payload: WingoldWebhookPayload,
  user: any
): Promise<{ success: boolean; message: string }> {
  const dataResult = OrderCancelledDataSchema.safeParse(payload.data);
  if (!dataResult.success) {
    console.error("[Wingold Webhook] Invalid order.cancelled data:", dataResult.error);
    return { success: false, message: "Invalid data format" };
  }
  
  const data = dataResult.data;
  
  await createAuditLog(
    "wingold-webhook",
    "ORDER_CANCELLED",
    "wingold_order",
    payload.orderId,
    { reason: data.reason, refundAmount: data.refundAmount }
  );
  
  // Notify user if found
  if (user) {
    await db.insert(notifications).values({
      userId: user.id,
      title: "Order Cancelled",
      message: `Your Wingold order has been cancelled. Reason: ${data.reason}`,
      type: "warning",
      link: "/dashboard"
    });
  }
  
  return { success: true, message: "Order cancellation logged" };
}

/**
 * GET /api/unified/wingold-orders/:orderId/events
 * 
 * Get all events for a Wingold order
 */
router.get("/api/unified/wingold-orders/:orderId/events", async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    const events = await db.select()
      .from(wingoldOrderEvents)
      .where(eq(wingoldOrderEvents.wingoldOrderId, orderId));
    
    return res.json({
      orderId,
      events: events.map(e => ({
        eventType: e.eventType,
        processedAt: e.processedAt,
        walletCredited: e.walletCredited,
        creditedGrams: e.creditedGrams ? parseFloat(e.creditedGrams) : null,
        createdAt: e.createdAt
      }))
    });
  } catch (error: any) {
    console.error("[Wingold Orders] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export function registerWingoldWebhookRoutes(app: any) {
  app.use(router);
  console.log("[Partner API] Wingold webhook routes registered (v2 - matches Wingold format)");
}

export default router;
