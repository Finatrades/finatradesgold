import { db } from './db';
import { 
  wingoldPurchaseOrders, wingoldBarLots, wingoldCertificates, 
  wingoldVaultLocations, wingoldReconciliations,
  vaultHoldings, transactions, wallets, users, certificates,
  unifiedTallyTransactions, unifiedTallyEvents, kycSubmissions
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

const WINGOLD_API_URL = process.env.WINGOLD_URL || process.env.WINGOLD_API_URL || 'https://wingoldandmetals--imcharanpratap.replit.app';
const WINGOLD_WEBHOOK_SECRET = process.env.WINGOLD_WEBHOOK_SECRET;

interface WingoldOrderRequest {
  userId: string;
  barSize: '1g' | '10g' | '100g' | '1kg';
  barCount: number;
  totalGrams: string;
  usdAmount: string;
  goldPricePerGram: string;
  transactionId?: string;
  preferredVaultLocation?: string;
}

interface WingoldOrderResponse {
  success: boolean;
  orderId?: string;
  message?: string;
  estimatedFulfillmentTime?: string;
}

interface WingoldWebhookPayload {
  event: 'order.confirmed' | 'order.fulfilled' | 'order.cancelled' | 'bar.allocated' | 'certificate.issued';
  orderId: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature: string;
}

interface BarAllocation {
  barId: string;
  serialNumber: string;
  barSize: '1g' | '10g' | '100g' | '1kg';
  weightGrams: string;
  purity: string;
  mint: string;
  vaultLocationId: string;
  vaultLocationName: string;
}

interface CertificateData {
  certificateNumber: string;
  certificateType: 'bar' | 'storage';
  barId?: string;
  pdfUrl: string;
  jsonData: Record<string, unknown>;
  issuedAt: string;
  signature: string;
}

export class WingoldIntegrationService {
  private static generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `WG-${timestamp}-${random}`;
  }

  private static barSizeToGrams(barSize: '1g' | '10g' | '100g' | '1kg'): number {
    const sizeMap = { '1g': 1, '10g': 10, '100g': 100, '1kg': 1000 };
    return sizeMap[barSize];
  }

  static async createPurchaseOrder(request: WingoldOrderRequest): Promise<{ orderId: string; referenceNumber: string }> {
    const referenceNumber = this.generateReferenceNumber();
    
    const [order] = await db.insert(wingoldPurchaseOrders).values({
      referenceNumber,
      userId: request.userId,
      transactionId: request.transactionId,
      barSize: request.barSize,
      barCount: request.barCount,
      totalGrams: request.totalGrams,
      usdAmount: request.usdAmount,
      goldPriceUsdPerGram: request.goldPricePerGram,
      status: 'pending',
      wingoldVaultLocationId: request.preferredVaultLocation,
      metadata: { source: 'finatrades_deposit' }
    }).returning();
    
    console.log(`[Wingold] Created purchase order ${referenceNumber} for ${request.totalGrams}g (${request.barCount}x ${request.barSize})`);
    
    return { orderId: order.id, referenceNumber };
  }

  static async submitOrderToWingold(orderId: string): Promise<WingoldOrderResponse> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    if (order.status !== 'pending') {
      throw new Error(`Order ${orderId} is not in pending status`);
    }

    const [user] = await db.select().from(users).where(eq(users.id, order.userId));
    
    try {
      const payload = {
        referenceNumber: order.referenceNumber,
        barSize: order.barSize,
        barCount: order.barCount,
        totalGrams: order.totalGrams,
        usdAmount: order.usdAmount,
        goldPricePerGram: order.goldPriceUsdPerGram,
        preferredVaultLocation: order.wingoldVaultLocationId,
        customer: {
          externalId: order.userId,
          email: user?.email,
          name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email
        },
        webhookUrl: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/wingold/webhooks`,
        timestamp: new Date().toISOString()
      };

      console.log(`[Wingold] Submitting order ${order.referenceNumber} to Wingold API`);
      
      const response = await fetch(`${WINGOLD_API_URL}/api/b2b/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.WINGOLD_API_KEY || '',
          'X-Request-ID': order.referenceNumber
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as WingoldOrderResponse;

      if (result.success && result.orderId) {
        await db.update(wingoldPurchaseOrders)
          .set({
            status: 'submitted',
            wingoldOrderId: result.orderId,
            submittedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(wingoldPurchaseOrders.id, orderId));
        
        console.log(`[Wingold] Order ${order.referenceNumber} submitted successfully, Wingold ID: ${result.orderId}`);
      } else {
        await db.update(wingoldPurchaseOrders)
          .set({
            status: 'failed',
            errorMessage: result.message || 'Unknown error from Wingold',
            updatedAt: new Date()
          })
          .where(eq(wingoldPurchaseOrders.id, orderId));
        
        console.error(`[Wingold] Order ${order.referenceNumber} submission failed: ${result.message}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      await db.update(wingoldPurchaseOrders)
        .set({
          status: 'failed',
          errorMessage,
          updatedAt: new Date()
        })
        .where(eq(wingoldPurchaseOrders.id, orderId));
      
      console.error(`[Wingold] Order ${order.referenceNumber} submission error:`, error);
      throw error;
    }
  }

  static verifyWebhookSignature(payload: string, signature: string, timestamp?: string): boolean {
    if (!WINGOLD_WEBHOOK_SECRET) {
      console.warn('[Wingold] Webhook secret not configured, skipping signature verification');
      return true;
    }
    
    const dataToSign = timestamp ? `${timestamp}.${payload}` : payload;
    
    const expectedSignature = crypto
      .createHmac('sha256', WINGOLD_WEBHOOK_SECRET)
      .update(dataToSign)
      .digest('hex');
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return signature === expectedSignature;
    }
  }

  static async handleWebhook(payload: WingoldWebhookPayload): Promise<void> {
    console.log(`[Wingold] Received webhook: ${payload.event} for order ${payload.orderId}`);
    
    let [order] = await db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.wingoldOrderId, payload.orderId));
    
    // If order doesn't exist locally, create it from webhook data (for SSO-redirect purchases)
    // Wingold MUST include complete order data in the webhook payload
    if (!order) {
      const orderData = payload.data as {
        finatradesId?: string;
        userId?: string;
        barSize?: string;
        barCount?: number;
        totalGrams?: string;
        usdAmount?: string;
        vaultLocationId?: string;
        goldPricePerGram?: string;
        wingoldReference?: string;
      };
      
      // Prefer userId (UUID) over finatradesId (legacy format)
      // finatradesId should be a UUID, not a legacy ID like "FT-TEST-001"
      const userId = orderData.userId || orderData.finatradesId;
      if (!userId) {
        console.error(`[Wingold] Cannot create order - no userId in webhook payload: ${payload.orderId}`);
        throw new Error(`Missing userId in webhook: ${payload.orderId}`);
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error(`[Wingold] Invalid userId format - expected UUID, got: ${userId}`);
        throw new Error(`Invalid userId format in webhook: ${userId}`);
      }
      
      // Validate required fields from Wingold
      if (!orderData.barSize || !orderData.totalGrams || !orderData.usdAmount) {
        console.error(`[Wingold] Incomplete order data in webhook - missing barSize, totalGrams, or usdAmount: ${payload.orderId}`);
        throw new Error(`Incomplete order data in webhook: ${payload.orderId}`);
      }
      
      // Validate bar size
      const validBarSizes = ['1g', '10g', '100g', '1kg'];
      if (!validBarSizes.includes(orderData.barSize)) {
        console.error(`[Wingold] Invalid barSize in webhook: ${orderData.barSize}`);
        throw new Error(`Invalid barSize: ${orderData.barSize}`);
      }
      
      // Create the order locally with complete data from Wingold
      const referenceNumber = orderData.wingoldReference || 
        `WG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Calculate goldPricePerGram if not provided
      const goldPrice = orderData.goldPricePerGram || 
        (parseFloat(orderData.usdAmount) / parseFloat(orderData.totalGrams)).toFixed(6);
      
      const [newOrder] = await db.insert(wingoldPurchaseOrders).values({
        userId,
        referenceNumber,
        wingoldOrderId: payload.orderId,
        barSize: orderData.barSize as '1g' | '10g' | '100g' | '1kg',
        barCount: orderData.barCount || 1,
        totalGrams: orderData.totalGrams,
        usdAmount: orderData.usdAmount,
        goldPriceUsdPerGram: goldPrice,
        wingoldVaultLocationId: orderData.vaultLocationId,
        status: 'confirmed',
        confirmedAt: new Date()
      }).returning();
      
      order = newOrder;
      console.log(`[Wingold] Created local order ${referenceNumber} from webhook for Wingold ID: ${payload.orderId} (user: ${userId}, ${orderData.barCount}x ${orderData.barSize}, $${orderData.usdAmount})`);
    }

    switch (payload.event) {
      case 'order.confirmed':
        await this.handleOrderConfirmed(order.id);
        break;
      case 'bar.allocated':
        await this.handleBarAllocated(order.id, payload.data as unknown as BarAllocation);
        break;
      case 'certificate.issued':
        await this.handleCertificateIssued(order.id, payload.data as unknown as CertificateData);
        break;
      case 'order.fulfilled':
        await this.handleOrderFulfilled(order.id);
        break;
      case 'order.cancelled':
        await this.handleOrderCancelled(order.id, payload.data as { reason?: string });
        break;
    }
  }

  private static async handleOrderConfirmed(orderId: string): Promise<void> {
    await db.update(wingoldPurchaseOrders)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(wingoldPurchaseOrders.id, orderId));
    
    console.log(`[Wingold] Order ${orderId} confirmed`);
  }

  private static async handleBarAllocated(orderId: string, barData: BarAllocation): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    
    if (!order) return;

    const [barLot] = await db.insert(wingoldBarLots).values({
      orderId,
      userId: order.userId,
      barId: barData.barId,
      serialNumber: barData.serialNumber,
      barSize: barData.barSize,
      weightGrams: barData.weightGrams,
      purity: barData.purity,
      mint: barData.mint,
      vaultLocationId: barData.vaultLocationId,
      vaultLocationName: barData.vaultLocationName,
      custodyStatus: 'in_vault'
    }).returning();

    await this.updateOrCreateVaultLocation(barData.vaultLocationId, barData.vaultLocationName);
    
    console.log(`[Wingold] Bar ${barData.barId} (${barData.serialNumber}) allocated for order ${orderId}`);
  }

  private static async handleCertificateIssued(orderId: string, certData: CertificateData): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    
    if (!order) return;

    let barLotId: string | undefined;
    if (certData.barId) {
      const [barLot] = await db.select()
        .from(wingoldBarLots)
        .where(eq(wingoldBarLots.barId, certData.barId));
      barLotId = barLot?.id;
      
      if (barLotId) {
        const updateField = certData.certificateType === 'bar' 
          ? { barCertificateId: certData.certificateNumber }
          : { storageCertificateId: certData.certificateNumber };
        
        await db.update(wingoldBarLots)
          .set({ ...updateField, updatedAt: new Date() })
          .where(eq(wingoldBarLots.id, barLotId));
      }
    }

    await db.insert(wingoldCertificates).values({
      orderId,
      barLotId: barLotId || null,
      userId: order.userId,
      certificateType: certData.certificateType,
      certificateNumber: certData.certificateNumber,
      pdfUrl: certData.pdfUrl,
      jsonData: certData.jsonData,
      signature: certData.signature,
      issuedAt: new Date(certData.issuedAt)
    });
    
    console.log(`[Wingold] Certificate ${certData.certificateNumber} (${certData.certificateType}) issued for order ${orderId}`);
  }

  private static async handleOrderFulfilled(orderId: string): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    
    if (!order) return;

    // Update order status to wingold_approved (awaiting Finatrades admin approval)
    await db.update(wingoldPurchaseOrders)
      .set({
        status: 'wingold_approved',
        fulfilledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(wingoldPurchaseOrders.id, orderId));

    // Create vault holdings to track physical gold
    await this.createFinaVaultHolding(orderId);
    
    // Create UTT entry for Finatrades admin to review in UFM
    await this.createUttEntryForApproval(orderId);
    
    console.log(`[Wingold] Order ${orderId} approved by Wingold - awaiting Finatrades admin approval in UFM`);
  }

  private static async createUttEntryForApproval(orderId: string): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    if (!order) return;

    const [user] = await db.select().from(users).where(eq(users.id, order.userId));
    if (!user) return;

    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    const physicalGoldAllocatedG = barLots.reduce((sum, bar) => sum + parseFloat(bar.weightGrams || '0'), 0);

    // Check if UTT entry already exists for this order
    const existingUtt = await db.select()
      .from(unifiedTallyTransactions)
      .where(eq(unifiedTallyTransactions.wingoldOrderId, order.wingoldOrderId || orderId))
      .limit(1);

    if (existingUtt.length > 0) {
      const previousStatus = existingUtt[0].status;
      
      // Update existing UTT to PHYSICAL_ALLOCATED
      await db.update(unifiedTallyTransactions)
        .set({
          status: 'PHYSICAL_ALLOCATED',
          physicalGoldAllocatedG: physicalGoldAllocatedG.toFixed(6),
          barLotSerialsJson: barLots.map(bar => ({
            serial: bar.serialNumber,
            purity: parseFloat(bar.purity || '999.9'),
            weightG: parseFloat(bar.weightGrams || '0'),
          })),
          updatedAt: new Date()
        })
        .where(eq(unifiedTallyTransactions.id, existingUtt[0].id));
      
      // Log the event for complete audit trail
      await db.insert(unifiedTallyEvents).values({
        tallyId: existingUtt[0].id,
        eventType: 'PHYSICAL_ALLOCATED',
        previousStatus: previousStatus,
        newStatus: 'PHYSICAL_ALLOCATED',
        details: {
          wingoldOrderId: order.wingoldOrderId,
          referenceNumber: order.referenceNumber,
          barsAllocated: barLots.length,
          totalGrams: physicalGoldAllocatedG,
        },
        notes: `Wingold approved order ${order.referenceNumber} - physical gold allocated`,
      });
      
      console.log(`[Wingold] Updated UTT ${existingUtt[0].txnId} to PHYSICAL_ALLOCATED`);
      return;
    }

    // Generate human-readable transaction ID
    const year = new Date().getFullYear();
    const sequence = await db.select({ count: sql<number>`COUNT(*)` })
      .from(unifiedTallyTransactions);
    const txnId = `UGT-${year}-${String((sequence[0]?.count || 0) + 1).padStart(6, '0')}`;

    // Create new UTT entry
    const [uttEntry] = await db.insert(unifiedTallyTransactions).values({
      txnId,
      userId: order.userId,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      userEmail: user.email,
      txnType: 'FIAT_CRYPTO_DEPOSIT',
      sourceMethod: 'CARD', // Wingold purchases are treated as card payments
      walletType: 'LGPW',
      status: 'PHYSICAL_ALLOCATED', // Awaiting Finatrades admin approval
      depositCurrency: 'USD',
      depositAmount: order.usdAmount,
      netAmount: order.usdAmount,
      goldRateValue: order.goldPriceUsdPerGram,
      goldEquivalentG: order.totalGrams,
      wingoldOrderId: order.wingoldOrderId || orderId,
      physicalGoldAllocatedG: physicalGoldAllocatedG.toFixed(6),
      wingoldBuyRate: order.goldPriceUsdPerGram,
      wingoldCostUsd: order.usdAmount,
      barLotSerialsJson: barLots.map(bar => ({
        serial: bar.serialNumber,
        purity: parseFloat(bar.purity || '999.9'),
        weightG: parseFloat(bar.weightGrams || '0'),
      })),
    }).returning();

    // Log the event
    await db.insert(unifiedTallyEvents).values({
      tallyId: uttEntry.id,
      eventType: 'PHYSICAL_ALLOCATED',
      newStatus: 'PHYSICAL_ALLOCATED',
      details: {
        wingoldOrderId: order.wingoldOrderId,
        referenceNumber: order.referenceNumber,
        barsAllocated: barLots.length,
        totalGrams: physicalGoldAllocatedG,
      },
      notes: `Wingold approved order ${order.referenceNumber} - awaiting Finatrades admin approval`,
    });

    console.log(`[Wingold] Created UTT ${txnId} for Finatrades admin approval (${physicalGoldAllocatedG}g physical gold allocated)`);
  }

  static async approveAndCreditWingoldOrder(orderId: string, adminId: string): Promise<{ success: boolean; message: string; txnId?: string }> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.status !== 'wingold_approved') {
      return { success: false, message: `Order is not ready for approval (status: ${order.status})` };
    }

    // GOLDEN RULE GUARD: Re-verify physical gold allocation before crediting
    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    const physicalGoldAllocatedG = barLots.reduce((sum, bar) => sum + parseFloat(bar.weightGrams || '0'), 0);
    
    if (physicalGoldAllocatedG <= 0) {
      console.error(`[Wingold] GOLDEN RULE VIOLATION BLOCKED: No physical gold allocated for order ${orderId}`);
      return { success: false, message: 'Cannot approve: No physical gold bars allocated to this order' };
    }

    const barsWithVaultHoldings = barLots.filter(bar => bar.vaultHoldingId);
    if (barsWithVaultHoldings.length === 0) {
      console.error(`[Wingold] GOLDEN RULE VIOLATION BLOCKED: No vault holdings for order ${orderId}`);
      return { success: false, message: 'Cannot approve: No vault holdings registered for allocated bars' };
    }

    // Credit the wallet
    const creditResult = await this.creditLGPWWallet(orderId);
    if (!creditResult.success) {
      return { success: false, message: creditResult.message };
    }
    
    // Issue digital ownership certificate
    await this.issueDigitalOwnershipCertificate(orderId);

    // Update order status to fulfilled
    await db.update(wingoldPurchaseOrders)
      .set({
        status: 'fulfilled',
        updatedAt: new Date()
      })
      .where(eq(wingoldPurchaseOrders.id, orderId));

    // Update UTT status to CREDITED/COMPLETED
    const [uttEntry] = await db.select()
      .from(unifiedTallyTransactions)
      .where(eq(unifiedTallyTransactions.wingoldOrderId, order.wingoldOrderId || orderId));

    if (uttEntry) {
      const [admin] = await db.select().from(users).where(eq(users.id, adminId));
      
      await db.update(unifiedTallyTransactions)
        .set({
          status: 'COMPLETED',
          goldCreditedG: order.totalGrams,
          goldCreditedValueUsd: order.usdAmount,
          updatedAt: new Date()
        })
        .where(eq(unifiedTallyTransactions.id, uttEntry.id));

      await db.insert(unifiedTallyEvents).values({
        tallyId: uttEntry.id,
        eventType: 'CREDITED',
        previousStatus: 'PHYSICAL_ALLOCATED',
        newStatus: 'COMPLETED',
        details: {
          creditedGrams: order.totalGrams,
          creditedValueUsd: order.usdAmount,
        },
        notes: `Finatrades admin approved and credited ${order.totalGrams}g to user wallet`,
        triggeredBy: adminId,
        triggeredByName: admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : 'Admin',
      });

      console.log(`[Wingold] Order ${order.referenceNumber} approved by Finatrades admin - ${order.totalGrams}g credited to wallet`);
      return { success: true, message: 'Order approved and gold credited to wallet', txnId: uttEntry.txnId };
    }

    console.log(`[Wingold] Order ${order.referenceNumber} approved (no UTT entry found)`);
    return { success: true, message: 'Order approved and gold credited to wallet' };
  }

  private static async handleOrderCancelled(orderId: string, data: { reason?: string }): Promise<void> {
    await db.update(wingoldPurchaseOrders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        errorMessage: data.reason || 'Order cancelled by Wingold',
        updatedAt: new Date()
      })
      .where(eq(wingoldPurchaseOrders.id, orderId));
    
    console.log(`[Wingold] Order ${orderId} cancelled: ${data.reason || 'No reason provided'}`);
  }

  private static async createFinaVaultHolding(orderId: string): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    if (!order) return;

    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    
    for (const bar of barLots) {
      const wingoldStorageRef = `WG-${bar.serialNumber}`;
      
      const [holding] = await db.insert(vaultHoldings).values({
        userId: order.userId,
        goldGrams: bar.weightGrams,
        vaultLocation: bar.vaultLocationName || 'Dubai - Wingold & Metals DMCC',
        wingoldStorageRef,
        purchasePriceUsdPerGram: order.goldPriceUsdPerGram,
        isPhysicallyDeposited: true
      }).returning();

      await db.update(wingoldBarLots)
        .set({ 
          vaultHoldingId: holding.id,
          updatedAt: new Date()
        })
        .where(eq(wingoldBarLots.id, bar.id));
      
      console.log(`[Wingold] Created FinaVault holding ${wingoldStorageRef} for bar ${bar.serialNumber}`);
    }
  }

  private static async creditLGPWWallet(orderId: string): Promise<{ success: boolean; message: string; creditedGrams?: number }> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    if (!order) return { success: false, message: 'Order not found' };

    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    
    const physicalGoldAllocatedG = barLots.reduce((sum, bar) => {
      const weight = parseFloat(bar.weightGrams || '0');
      return sum + (isNaN(weight) ? 0 : weight);
    }, 0);
    
    if (physicalGoldAllocatedG <= 0) {
      console.error(`[Wingold] GOLDEN RULE VIOLATION: Cannot credit wallet - no physical gold allocated for order ${orderId}`);
      return { success: false, message: 'No physical gold allocated for this order' };
    }

    const barsWithCertificates = barLots.filter(bar => bar.storageCertificateId || bar.barCertificateId || bar.vaultHoldingId);
    if (barsWithCertificates.length === 0) {
      console.error(`[Wingold] GOLDEN RULE VIOLATION: Cannot credit wallet - no storage certificates or vault holdings for order ${orderId}`);
      return { success: false, message: 'No storage certificates or vault holdings for this order' };
    }

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, order.userId));
    if (!wallet) {
      console.error(`[Wingold] No wallet found for user ${order.userId}`);
      return { success: false, message: 'No wallet found for user' };
    }

    const currentBalance = parseFloat(wallet.goldGrams || '0');
    const creditAmount = physicalGoldAllocatedG;
    const newBalance = currentBalance + creditAmount;

    await db.update(wallets)
      .set({
        goldGrams: newBalance.toFixed(6),
        updatedAt: new Date()
      })
      .where(eq(wallets.id, wallet.id));

    await db.insert(transactions).values({
      userId: order.userId,
      type: 'Deposit',
      status: 'Completed',
      amountGold: String(creditAmount),
      goldPriceUsdPerGram: order.goldPriceUsdPerGram,
      amountUsd: order.usdAmount,
      goldWalletType: 'LGPW',
      description: `Wingold physical gold purchase - ${order.referenceNumber}`,
      sourceModule: 'wingold'
    });

    console.log(`[Wingold] GOLDEN RULE SATISFIED: Credited ${creditAmount}g to LGPW wallet for user ${order.userId} (physical allocation: ${physicalGoldAllocatedG}g, certificates: ${barsWithCertificates.length})`);
    return { success: true, message: 'Gold credited successfully', creditedGrams: creditAmount };
  }

  private static async issueDigitalOwnershipCertificate(orderId: string): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    if (!order) return;

    const [user] = await db.select().from(users).where(eq(users.id, order.userId));
    if (!user) return;

    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    if (barLots.length === 0) return;
    
    const perBarValueUsd = (parseFloat(order.usdAmount || '0') / barLots.length).toFixed(2);
    
    for (const bar of barLots) {
      if (!bar.vaultHoldingId || !bar.serialNumber) {
        console.warn(`[Wingold] Skipping certificate for bar without vaultHoldingId or serialNumber in order ${orderId}`);
        continue;
      }
      
      const existingCert = await db.select()
        .from(certificates)
        .where(eq(certificates.wingoldStorageRef, `WG-${bar.serialNumber}`))
        .limit(1);
      
      if (existingCert.length > 0) {
        console.log(`[Wingold] Digital Ownership Certificate already exists for bar ${bar.serialNumber}, skipping`);
        continue;
      }

      const certificateNumber = `FT-DOC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      await db.insert(certificates).values({
        certificateNumber,
        userId: order.userId,
        vaultHoldingId: bar.vaultHoldingId,
        type: 'Digital Ownership',
        status: 'Active',
        goldGrams: bar.weightGrams,
        goldPriceUsdPerGram: order.goldPriceUsdPerGram,
        totalValueUsd: perBarValueUsd,
        issuer: 'Finatrades',
        vaultLocation: bar.vaultLocationName || 'SecureVault - Dubai',
        wingoldStorageRef: `WG-${bar.serialNumber}`,
      });

      console.log(`[Wingold] Issued Finatrades Digital Ownership Certificate ${certificateNumber} for bar ${bar.serialNumber}`);
    }
  }

  private static async updateOrCreateVaultLocation(wingoldLocationId: string, name: string): Promise<void> {
    const [existing] = await db.select()
      .from(wingoldVaultLocations)
      .where(eq(wingoldVaultLocations.wingoldLocationId, wingoldLocationId));
    
    if (existing) {
      await db.update(wingoldVaultLocations)
        .set({ syncedAt: new Date() })
        .where(eq(wingoldVaultLocations.id, existing.id));
    } else {
      await db.insert(wingoldVaultLocations).values({
        wingoldLocationId,
        name,
        country: 'UAE',
        isActive: true,
        syncedAt: new Date()
      });
    }
  }

  static async syncVaultLocations(): Promise<void> {
    try {
      const response = await fetch(`${WINGOLD_API_URL}/api/b2b/vault-locations`, {
        headers: {
          'X-API-Key': process.env.WINGOLD_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vault locations: ${response.status}`);
      }

      const locations = await response.json() as Array<{
        id: string;
        name: string;
        code: string;
        city: string;
        country: string;
        address: string;
        isActive: boolean;
      }>;

      for (const loc of locations) {
        const [existing] = await db.select()
          .from(wingoldVaultLocations)
          .where(eq(wingoldVaultLocations.wingoldLocationId, loc.id));

        if (existing) {
          await db.update(wingoldVaultLocations)
            .set({
              name: loc.name,
              code: loc.code,
              city: loc.city,
              country: loc.country,
              address: loc.address,
              isActive: loc.isActive,
              syncedAt: new Date()
            })
            .where(eq(wingoldVaultLocations.id, existing.id));
        } else {
          await db.insert(wingoldVaultLocations).values({
            wingoldLocationId: loc.id,
            name: loc.name,
            code: loc.code,
            city: loc.city,
            country: loc.country,
            address: loc.address,
            isActive: loc.isActive,
            syncedAt: new Date()
          });
        }
      }

      console.log(`[Wingold] Synced ${locations.length} vault locations`);
    } catch (error) {
      console.error('[Wingold] Failed to sync vault locations:', error);
    }
  }

  static async runReconciliation(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${WINGOLD_API_URL}/api/b2b/reconciliation?date=${today}`, {
        headers: {
          'X-API-Key': process.env.WINGOLD_API_KEY || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Reconciliation fetch failed: ${response.status}`);
      }

      const wingoldData = await response.json() as {
        totalBars: number;
        totalGrams: string;
        bars: Array<{ barId: string; grams: string }>;
      };

      const finatradesData = await db.select({
        totalBars: sql<number>`COUNT(*)`.as('totalBars'),
        totalGrams: sql<string>`COALESCE(SUM(weight_grams), 0)`.as('totalGrams')
      })
      .from(wingoldBarLots)
      .where(eq(wingoldBarLots.custodyStatus, 'in_vault'));

      const wingoldGrams = parseFloat(wingoldData.totalGrams);
      const finatradesGrams = parseFloat(finatradesData[0]?.totalGrams || '0');
      const discrepancy = Math.abs(wingoldGrams - finatradesGrams);
      const isMatched = discrepancy < 0.001;

      await db.insert(wingoldReconciliations).values({
        reconciliationDate: today,
        wingoldTotalBars: wingoldData.totalBars,
        wingoldTotalGrams: wingoldData.totalGrams,
        finatradesTotalBars: finatradesData[0]?.totalBars || 0,
        finatradesTotalGrams: finatradesData[0]?.totalGrams || '0',
        isMatched,
        discrepancyGrams: discrepancy.toFixed(6),
        discrepancyNotes: isMatched ? null : `Discrepancy of ${discrepancy.toFixed(6)}g detected`,
        rawPayload: wingoldData
      });

      console.log(`[Wingold] Reconciliation completed for ${today}. Matched: ${isMatched}`);
      
      if (!isMatched) {
        console.warn(`[Wingold] RECONCILIATION MISMATCH: Wingold=${wingoldGrams}g, Finatrades=${finatradesGrams}g, Diff=${discrepancy}g`);
      }
    } catch (error) {
      console.error('[Wingold] Reconciliation failed:', error);
    }
  }

  static async getOrderStatus(orderId: string): Promise<{ order: any; barLots: any[]; certificates: any[] } | null> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    if (!order) return null;

    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    const certificates = await db.select().from(wingoldCertificates).where(eq(wingoldCertificates.orderId, orderId));

    return { order, barLots, certificates };
  }

  static async getUserOrders(userId: string): Promise<any[]> {
    return db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.userId, userId))
      .orderBy(sql`created_at DESC`);
  }

  /**
   * Sync KYC data from Finatrades to Wingold
   * Called when:
   * 1. KYC is approved on Finatrades
   * 2. User initiates SSO to Wingold (pre-sync)
   * 3. Manual admin trigger
   */
  static async syncKycToWingold(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (user.kycStatus !== 'Approved') {
        return { success: false, message: 'KYC not approved, nothing to sync' };
      }

      // Fetch KYC submission data for detailed info
      const [kycData] = await db.select()
        .from(kycSubmissions)
        .where(eq(kycSubmissions.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(1);

      // Build KYC payload based on account type
      const kycPayload: Record<string, any> = {
        finatradesId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType || 'personal',
        kycStatus: 'approved',
      };

      // Add personal or business KYC data
      if (user.accountType === 'business') {
        kycPayload.business = {
          companyName: user.companyName || kycData?.companyName || `${user.firstName} ${user.lastName}`,
          registrationNumber: user.registrationNumber || kycData?.registrationNumber || '',
          country: user.country || kycData?.country || '',
          address: user.address || kycData?.address || '',
          city: kycData?.city || '',
          postalCode: kycData?.postalCode || '',
          representativeName: kycData?.fullName || `${user.firstName} ${user.lastName}`,
          representativeRole: 'Director',
        };
      } else {
        kycPayload.personal = {
          fullName: kycData?.fullName || `${user.firstName} ${user.lastName}`,
          dateOfBirth: kycData?.dateOfBirth || null,
          nationality: kycData?.nationality || user.country || '',
          address: kycData?.address || user.address || '',
          city: kycData?.city || '',
          postalCode: kycData?.postalCode || '',
          country: kycData?.country || user.country || '',
        };
      }

      // Generate HMAC signature
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payloadString = JSON.stringify(kycPayload);
      const webhookSecret = process.env.WINGOLD_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('[Wingold KYC Sync] No WINGOLD_WEBHOOK_SECRET configured');
        return { success: false, message: 'Webhook secret not configured' };
      }

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${payloadString}`)
        .digest('hex');

      const signatureHeader = `t=${timestamp},v1=${signature}`;

      // Send to Wingold
      const response = await fetch(`${WINGOLD_API_URL}/api/finatrades/kyc/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Finatrades-Signature': signatureHeader,
        },
        body: payloadString,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Wingold KYC Sync] Failed:', response.status, errorText);
        return { success: false, message: `Wingold rejected: ${response.status}` };
      }

      const result = await response.json() as { success: boolean; message?: string; wingoldUserId?: string };
      console.log('[Wingold KYC Sync] Success:', result);

      return { 
        success: true, 
        message: `KYC synced to Wingold. User ID: ${result.wingoldUserId || 'linked'}` 
      };

    } catch (error) {
      console.error('[Wingold KYC Sync] Error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check KYC status on Wingold for a Finatrades user
   */
  static async checkWingoldKycStatus(finatradesId: string): Promise<{ 
    exists: boolean; 
    kycStatus?: string; 
    wingoldUserId?: string 
  }> {
    try {
      const response = await fetch(`${WINGOLD_API_URL}/api/finatrades/kyc/status/${finatradesId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return { exists: false };
      }

      if (!response.ok) {
        console.error('[Wingold KYC Status] Failed:', response.status);
        return { exists: false };
      }

      const result = await response.json() as { 
        exists: boolean; 
        kycStatus?: string; 
        wingoldUserId?: string 
      };
      return result;

    } catch (error) {
      console.error('[Wingold KYC Status] Error:', error);
      return { exists: false };
    }
  }
}
