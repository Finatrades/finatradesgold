import express, { Router, Request, Response } from 'express';
import { WingoldIntegrationService } from './wingold-integration-service';
import { WingoldUserSyncService } from './wingold-user-sync-service';
import { db } from './db';
import { wingoldPurchaseOrders, wingoldBarLots, wingoldCertificates, wingoldVaultLocations } from '@shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

const router = Router();

router.post('/webhooks', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
    const signature = req.headers['x-wingold-signature'] as string || '';
    
    if (!WingoldIntegrationService.verifyWebhookSignature(rawBody, signature)) {
      console.error('[Wingold Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    
    console.log(`[Wingold Webhook] Received event: ${payload.event}`);
    
    await WingoldIntegrationService.handleWebhook(payload);
    
    res.json({ received: true });
  } catch (error) {
    console.error('[Wingold Webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { barSize, barCount, usdAmount, goldPricePerGram, transactionId, preferredVaultLocation } = req.body;

    const sizeToGrams: Record<string, number> = { '1g': 1, '10g': 10, '100g': 100, '1kg': 1000 };
    const gramsPerBar = sizeToGrams[barSize];
    
    if (!gramsPerBar) {
      return res.status(400).json({ error: 'Invalid bar size. Must be 1g, 10g, 100g, or 1kg' });
    }

    const totalGrams = (gramsPerBar * barCount).toFixed(6);

    const { orderId, referenceNumber } = await WingoldIntegrationService.createPurchaseOrder({
      userId: (req.user as any).id,
      barSize,
      barCount,
      totalGrams,
      usdAmount,
      goldPricePerGram,
      transactionId,
      preferredVaultLocation
    });

    const submitResult = await WingoldIntegrationService.submitOrderToWingold(orderId);

    res.json({
      success: true,
      orderId,
      referenceNumber,
      wingoldOrderId: submitResult.orderId,
      estimatedFulfillmentTime: submitResult.estimatedFulfillmentTime
    });
  } catch (error) {
    console.error('[Wingold] Order creation failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Order creation failed' });
  }
});

router.get('/orders', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orders = await WingoldIntegrationService.getUserOrders((req.user as any).id);
    res.json(orders);
  } catch (error) {
    console.error('[Wingold] Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orderStatus = await WingoldIntegrationService.getOrderStatus(req.params.orderId);
    
    if (!orderStatus) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orderStatus.order.userId !== (req.user as any).id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(orderStatus);
  } catch (error) {
    console.error('[Wingold] Failed to fetch order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.get('/vault-locations', async (req: Request, res: Response) => {
  try {
    const locations = await db.select()
      .from(wingoldVaultLocations)
      .where(eq(wingoldVaultLocations.isActive, true));
    
    res.json(locations);
  } catch (error) {
    console.error('[Wingold] Failed to fetch vault locations:', error);
    res.status(500).json({ error: 'Failed to fetch vault locations' });
  }
});

router.post('/vault-locations/sync', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await WingoldIntegrationService.syncVaultLocations();
    
    const locations = await db.select().from(wingoldVaultLocations);
    res.json({ success: true, locations });
  } catch (error) {
    console.error('[Wingold] Vault location sync failed:', error);
    res.status(500).json({ error: 'Vault location sync failed' });
  }
});

router.get('/certificates/:orderId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const certificates = await db.select()
      .from(wingoldCertificates)
      .where(and(
        eq(wingoldCertificates.orderId, req.params.orderId),
        eq(wingoldCertificates.userId, (req.user as any).id)
      ));
    
    res.json(certificates);
  } catch (error) {
    console.error('[Wingold] Failed to fetch certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

router.get('/bars/:orderId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const bars = await db.select()
      .from(wingoldBarLots)
      .where(and(
        eq(wingoldBarLots.orderId, req.params.orderId),
        eq(wingoldBarLots.userId, (req.user as any).id)
      ));
    
    res.json(bars);
  } catch (error) {
    console.error('[Wingold] Failed to fetch bar lots:', error);
    res.status(500).json({ error: 'Failed to fetch bar lots' });
  }
});

router.post('/reconciliation/run', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await WingoldIntegrationService.runReconciliation();
    res.json({ success: true, message: 'Reconciliation completed' });
  } catch (error) {
    console.error('[Wingold] Reconciliation failed:', error);
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await db.select({
      totalOrders: sql<number>`COUNT(*)`,
      fulfilledOrders: sql<number>`SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END)`,
      pendingOrders: sql<number>`SUM(CASE WHEN status IN ('pending', 'submitted', 'confirmed', 'processing') THEN 1 ELSE 0 END)`,
      totalGrams: sql<string>`COALESCE(SUM(CASE WHEN status = 'fulfilled' THEN total_grams ELSE 0 END), 0)`,
      totalUsd: sql<string>`COALESCE(SUM(CASE WHEN status = 'fulfilled' THEN usd_amount ELSE 0 END), 0)`
    }).from(wingoldPurchaseOrders);

    const barStats = await db.select({
      totalBars: sql<number>`COUNT(*)`,
      inVault: sql<number>`SUM(CASE WHEN custody_status = 'in_vault' THEN 1 ELSE 0 END)`,
      totalWeight: sql<string>`COALESCE(SUM(weight_grams), 0)`
    }).from(wingoldBarLots);

    res.json({
      orders: stats[0],
      bars: barStats[0]
    });
  } catch (error) {
    console.error('[Wingold] Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.post('/users/sync-all', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[Wingold] Starting bulk user sync to Wingold...');
    const result = await WingoldUserSyncService.syncAllUsers();
    
    res.json({ 
      success: true, 
      message: `Synced ${result.synced} users to Wingold, ${result.failed} failed`,
      ...result
    });
  } catch (error) {
    console.error('[Wingold] Bulk user sync failed:', error);
    res.status(500).json({ error: 'Bulk user sync failed' });
  }
});

export default router;
