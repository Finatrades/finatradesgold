import { db } from './db';
import { 
  wingoldPurchaseOrders, wingoldBarLots, wingoldCertificates, 
  wingoldVaultLocations, wingoldReconciliations,
  vaultHoldings, transactions, wallets, users, certificates
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

const WINGOLD_API_URL = process.env.WINGOLD_API_URL || 'https://wingoldandmetals--imcharanpratap.replit.app';
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

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!WINGOLD_WEBHOOK_SECRET) {
      console.warn('[Wingold] Webhook secret not configured, skipping signature verification');
      return true;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', WINGOLD_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  static async handleWebhook(payload: WingoldWebhookPayload): Promise<void> {
    console.log(`[Wingold] Received webhook: ${payload.event} for order ${payload.orderId}`);
    
    const [order] = await db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.wingoldOrderId, payload.orderId));
    
    if (!order) {
      console.error(`[Wingold] Order not found for Wingold ID: ${payload.orderId}`);
      throw new Error(`Order not found: ${payload.orderId}`);
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

    await db.update(wingoldPurchaseOrders)
      .set({
        status: 'fulfilled',
        fulfilledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(wingoldPurchaseOrders.id, orderId));

    await this.createFinaVaultHolding(orderId);
    await this.creditLGPWWallet(orderId);
    await this.issueDigitalOwnershipCertificate(orderId);
    
    console.log(`[Wingold] Order ${orderId} fulfilled, FinaVault updated, LGPW credited, and Digital Ownership Certificate issued`);
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

  private static async creditLGPWWallet(orderId: string): Promise<void> {
    const [order] = await db.select().from(wingoldPurchaseOrders).where(eq(wingoldPurchaseOrders.id, orderId));
    if (!order) return;

    const barLots = await db.select().from(wingoldBarLots).where(eq(wingoldBarLots.orderId, orderId));
    
    const physicalGoldAllocatedG = barLots.reduce((sum, bar) => {
      const weight = parseFloat(bar.weightGrams || '0');
      return sum + (isNaN(weight) ? 0 : weight);
    }, 0);
    
    if (physicalGoldAllocatedG <= 0) {
      console.error(`[Wingold] GOLDEN RULE VIOLATION: Cannot credit wallet - no physical gold allocated for order ${orderId}`);
      return;
    }

    const barsWithCertificates = barLots.filter(bar => bar.storageCertificateId || bar.barCertificateId || bar.vaultHoldingId);
    if (barsWithCertificates.length === 0) {
      console.error(`[Wingold] GOLDEN RULE VIOLATION: Cannot credit wallet - no storage certificates or vault holdings for order ${orderId}`);
      return;
    }

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, order.userId));
    if (!wallet) {
      console.error(`[Wingold] No wallet found for user ${order.userId}`);
      return;
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
        type: 'DigitalOwnership',
        status: 'Active',
        goldGrams: bar.weightGrams,
        goldPriceUsdPerGram: order.goldPriceUsdPerGram,
        totalValueUsd: perBarValueUsd,
        issuer: 'Finatrades',
        vaultLocation: bar.vaultLocationName || 'SecureVault - Dubai',
        wingoldStorageRef: `WG-${bar.serialNumber}`,
        metadata: {
          wingoldOrderId: order.wingoldOrderId,
          wingoldReferenceNumber: order.referenceNumber,
          barSerialNumber: bar.serialNumber,
          barSize: bar.barSize,
          barPurity: bar.purity,
          mint: bar.mint,
          issuedTo: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            finatradesId: user.finatradesId
          }
        }
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
}
