import crypto from 'crypto';
import { db } from './db';
import { 
  b2bOrders, b2bOrderBars, b2bCertificates, b2bVaultLocations, b2bWebhookLogs,
  B2bOrder, B2bOrderBar, B2bCertificate, B2bVaultLocation
} from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

const FINATRADES_API_KEY = process.env.FINATRADES_API_KEY || '';
const WINGOLD_WEBHOOK_SECRET = process.env.WINGOLD_WEBHOOK_SECRET || '';

interface OrderRequest {
  referenceNumber: string;
  barSize: '1g' | '10g' | '100g' | '1kg';
  barCount: number;
  totalGrams: string;
  usdAmount: string;
  goldPricePerGram: string;
  preferredVaultLocation?: string;
  customer: {
    externalId: string;
    email: string;
    name: string;
  };
  webhookUrl: string;
  timestamp: string;
}

interface WebhookPayload {
  event: string;
  orderId: string;
  timestamp: string;
  data: Record<string, any>;
}

export class B2bOrderService {
  static verifyApiKey(apiKey: string | undefined): boolean {
    if (!apiKey || !FINATRADES_API_KEY) return false;
    return crypto.timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(FINATRADES_API_KEY)
    );
  }

  static signPayload(payload: Record<string, any>): string {
    if (!WINGOLD_WEBHOOK_SECRET) return '';
    const payloadStr = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', WINGOLD_WEBHOOK_SECRET)
      .update(payloadStr)
      .digest('hex');
  }

  static async createOrder(request: OrderRequest): Promise<{ orderId: string; estimatedFulfillmentTime: string }> {
    console.log(`[B2B] Creating order for reference: ${request.referenceNumber}`);

    const existingOrder = await db.select().from(b2bOrders)
      .where(eq(b2bOrders.finatradesRef, request.referenceNumber))
      .limit(1);

    if (existingOrder.length > 0) {
      throw new Error(`Order with reference ${request.referenceNumber} already exists`);
    }

    let vaultLocationId: string | undefined;
    if (request.preferredVaultLocation) {
      const vault = await db.select().from(b2bVaultLocations)
        .where(eq(b2bVaultLocations.code, request.preferredVaultLocation))
        .limit(1);
      if (vault.length > 0 && vault[0].isActive) {
        vaultLocationId = vault[0].id;
      }
    }

    if (!vaultLocationId) {
      const defaultVault = await db.select().from(b2bVaultLocations)
        .where(eq(b2bVaultLocations.isActive, true))
        .limit(1);
      if (defaultVault.length > 0) {
        vaultLocationId = defaultVault[0].id;
      }
    }

    const [order] = await db.insert(b2bOrders).values({
      finatradesRef: request.referenceNumber,
      customerExternalId: request.customer.externalId,
      customerEmail: request.customer.email,
      customerName: request.customer.name,
      barSize: request.barSize,
      barCount: request.barCount,
      totalGrams: request.totalGrams,
      usdAmount: request.usdAmount,
      goldPricePerGram: request.goldPricePerGram,
      preferredVaultLocationId: vaultLocationId,
      webhookUrl: request.webhookUrl,
      status: 'pending',
      metadata: { timestamp: request.timestamp }
    }).returning();

    const estimatedTime = this.calculateEstimatedFulfillment(request.barCount, request.barSize);

    this.processOrderAsync(order.id).catch(err => 
      console.error(`[B2B] Error processing order ${order.id}:`, err)
    );

    return {
      orderId: order.id,
      estimatedFulfillmentTime: estimatedTime
    };
  }

  private static calculateEstimatedFulfillment(barCount: number, barSize: string): string {
    let hours = 2;
    if (barSize === '1kg') hours = 24;
    else if (barSize === '100g') hours = 12;
    else if (barCount > 10) hours = 8;
    
    const estimated = new Date(Date.now() + hours * 60 * 60 * 1000);
    return estimated.toISOString();
  }

  private static async processOrderAsync(orderId: string): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      await db.update(b2bOrders)
        .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(b2bOrders.id, orderId));

      await this.sendWebhook(orderId, 'order.confirmed', { status: 'confirmed' });

      const order = await db.select().from(b2bOrders).where(eq(b2bOrders.id, orderId)).limit(1);
      if (!order.length) return;

      await db.update(b2bOrders)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(b2bOrders.id, orderId));

      const vaultLocation = order[0].preferredVaultLocationId 
        ? await db.select().from(b2bVaultLocations).where(eq(b2bVaultLocations.id, order[0].preferredVaultLocationId)).limit(1)
        : await db.select().from(b2bVaultLocations).where(eq(b2bVaultLocations.isActive, true)).limit(1);

      const vault = vaultLocation[0];

      for (let i = 0; i < order[0].barCount; i++) {
        await this.allocateBar(order[0], vault, i);
      }

      await this.generateCertificates(order[0], vault);

      await db.update(b2bOrders)
        .set({ 
          status: 'fulfilled', 
          fulfilledAt: new Date(), 
          actualVaultLocationId: vault.id,
          updatedAt: new Date() 
        })
        .where(eq(b2bOrders.id, orderId));

      await this.sendWebhook(orderId, 'order.fulfilled', { 
        status: 'fulfilled',
        barsAllocated: order[0].barCount,
        vaultLocation: vault.code
      });

      console.log(`[B2B] Order ${orderId} fulfilled successfully`);
    } catch (error) {
      console.error(`[B2B] Order processing failed for ${orderId}:`, error);
      await db.update(b2bOrders)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(b2bOrders.id, orderId));
    }
  }

  private static async allocateBar(order: B2bOrder, vault: B2bVaultLocation, index: number): Promise<void> {
    const barId = `WG-${order.barSize.toUpperCase()}-${Date.now()}-${index + 1}`;
    const serialNumber = `SN${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    
    const weightMap: Record<string, number> = { '1g': 1, '10g': 10, '100g': 100, '1kg': 1000 };
    const weightGrams = weightMap[order.barSize] || 1;

    const [bar] = await db.insert(b2bOrderBars).values({
      orderId: order.id,
      barId,
      serialNumber,
      barSize: order.barSize,
      weightGrams: weightGrams.toString(),
      purity: '0.9999',
      mint: 'Wingold Refinery',
      vaultLocationId: vault.id,
      vaultLocationName: vault.name
    }).returning();

    await db.update(b2bOrders)
      .set({ 
        barsAllocated: sql`bars_allocated + 1`,
        status: order.barCount > 1 ? 'partially_fulfilled' : 'processing',
        updatedAt: new Date() 
      })
      .where(eq(b2bOrders.id, order.id));

    await this.sendWebhook(order.id, 'bar.allocated', {
      barId: bar.barId,
      serialNumber: bar.serialNumber,
      barSize: bar.barSize,
      weightGrams: bar.weightGrams,
      purity: bar.purity,
      mint: bar.mint,
      vaultLocationId: vault.id,
      vaultLocationName: vault.name
    });
  }

  private static async generateCertificates(order: B2bOrder, vault: B2bVaultLocation): Promise<void> {
    const bars = await db.select().from(b2bOrderBars).where(eq(b2bOrderBars.orderId, order.id));

    for (const bar of bars) {
      const barCertNumber = `BC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const [barCert] = await db.insert(b2bCertificates).values({
        orderId: order.id,
        barId: bar.id,
        certificateNumber: barCertNumber,
        certificateType: 'bar',
        jsonData: {
          barId: bar.barId,
          serialNumber: bar.serialNumber,
          weight: bar.weightGrams,
          purity: bar.purity,
          mint: bar.mint,
          issuer: 'Wingold & Metals',
          issuedAt: new Date().toISOString()
        },
        signature: this.signPayload({ certificateNumber: barCertNumber, barId: bar.barId })
      }).returning();

      await this.sendWebhook(order.id, 'certificate.issued', {
        certificateNumber: barCert.certificateNumber,
        certificateType: 'bar',
        barId: bar.barId,
        jsonData: barCert.jsonData,
        issuedAt: barCert.issuedAt?.toISOString(),
        signature: barCert.signature
      });
    }

    const storageCertNumber = `SC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    const [storageCert] = await db.insert(b2bCertificates).values({
      orderId: order.id,
      certificateNumber: storageCertNumber,
      certificateType: 'storage',
      jsonData: {
        orderId: order.id,
        customerName: order.customerName,
        totalGrams: order.totalGrams,
        barCount: order.barCount,
        vaultLocation: vault.name,
        vaultCode: vault.code,
        storageStartDate: new Date().toISOString(),
        issuer: 'Wingold & Metals'
      },
      signature: this.signPayload({ certificateNumber: storageCertNumber, orderId: order.id })
    }).returning();

    await db.update(b2bOrders)
      .set({ 
        certificatesIssued: sql`certificates_issued + ${bars.length + 1}`,
        updatedAt: new Date() 
      })
      .where(eq(b2bOrders.id, order.id));

    await this.sendWebhook(order.id, 'certificate.issued', {
      certificateNumber: storageCert.certificateNumber,
      certificateType: 'storage',
      jsonData: storageCert.jsonData,
      issuedAt: storageCert.issuedAt?.toISOString(),
      signature: storageCert.signature
    });
  }

  private static async sendWebhook(orderId: string, event: string, data: Record<string, any>): Promise<void> {
    const order = await db.select().from(b2bOrders).where(eq(b2bOrders.id, orderId)).limit(1);
    if (!order.length || !order[0].webhookUrl) return;

    const payload: WebhookPayload = {
      event,
      orderId,
      timestamp: new Date().toISOString(),
      data
    };

    const signature = this.signPayload(payload);

    try {
      const response = await fetch(order[0].webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wingold-Signature': signature
        },
        body: JSON.stringify(payload)
      });

      const responseBody = await response.text();

      await db.insert(b2bWebhookLogs).values({
        orderId,
        event,
        webhookUrl: order[0].webhookUrl,
        payload,
        httpStatus: response.status,
        responseBody: responseBody.substring(0, 1000),
        success: response.ok,
        lastAttemptAt: new Date()
      });

      if (!response.ok) {
        console.error(`[B2B] Webhook failed for ${event}: ${response.status}`);
      } else {
        console.log(`[B2B] Webhook sent: ${event} for order ${orderId}`);
      }
    } catch (error) {
      console.error(`[B2B] Webhook error for ${event}:`, error);
      await db.insert(b2bWebhookLogs).values({
        orderId,
        event,
        webhookUrl: order[0].webhookUrl,
        payload,
        success: false,
        responseBody: error instanceof Error ? error.message : 'Unknown error',
        lastAttemptAt: new Date()
      });
    }
  }

  static async getVaultLocations(): Promise<B2bVaultLocation[]> {
    return db.select().from(b2bVaultLocations).where(eq(b2bVaultLocations.isActive, true));
  }

  static async getReconciliationData(date: string): Promise<{
    totalBars: number;
    totalGrams: string;
    bars: { barId: string; grams: string }[];
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bars = await db.select({
      barId: b2bOrderBars.barId,
      grams: b2bOrderBars.weightGrams
    }).from(b2bOrderBars)
      .where(and(
        sql`${b2bOrderBars.allocatedAt} >= ${startOfDay}`,
        sql`${b2bOrderBars.allocatedAt} <= ${endOfDay}`
      ));

    const totalGrams = bars.reduce((sum, bar) => sum + parseFloat(bar.grams || '0'), 0);

    return {
      totalBars: bars.length,
      totalGrams: totalGrams.toFixed(6),
      bars: bars.map(b => ({ barId: b.barId, grams: b.grams || '0' }))
    };
  }

  static async cancelOrder(orderId: string, reason: string): Promise<void> {
    const order = await db.select().from(b2bOrders).where(eq(b2bOrders.id, orderId)).limit(1);
    if (!order.length) throw new Error('Order not found');
    
    if (['fulfilled', 'cancelled'].includes(order[0].status)) {
      throw new Error(`Cannot cancel order with status: ${order[0].status}`);
    }

    await db.update(b2bOrders)
      .set({ 
        status: 'cancelled', 
        cancelledAt: new Date(), 
        cancellationReason: reason,
        updatedAt: new Date() 
      })
      .where(eq(b2bOrders.id, orderId));

    await this.sendWebhook(orderId, 'order.cancelled', { reason });
  }

  static async getOrderById(orderId: string): Promise<B2bOrder | null> {
    const orders = await db.select().from(b2bOrders).where(eq(b2bOrders.id, orderId)).limit(1);
    return orders[0] || null;
  }

  static async getOrderByReference(reference: string): Promise<B2bOrder | null> {
    const orders = await db.select().from(b2bOrders).where(eq(b2bOrders.finatradesRef, reference)).limit(1);
    return orders[0] || null;
  }
}
