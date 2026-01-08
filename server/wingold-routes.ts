import express, { Router, Request, Response } from 'express';
import { WingoldIntegrationService } from './wingold-integration-service';
import { WingoldUserSyncService } from './wingold-user-sync-service';
import { db } from './db';
import { wingoldPurchaseOrders, wingoldBarLots, wingoldCertificates, wingoldVaultLocations, wingoldProducts } from '@shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

const router = Router();

const WINGOLD_API_URL = process.env.WINGOLD_API_URL || 'https://wingoldandmetals--imcharanpratap.replit.app';
const FINATRADES_API_KEY = process.env.FINATRADES_API_KEY;

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

    const { barSize, barCount, vaultLocationId } = req.body;

    const sizeToGrams: Record<string, number> = { '1g': 1, '10g': 10, '100g': 100, '1kg': 1000 };
    const gramsPerBar = sizeToGrams[barSize];
    
    if (!gramsPerBar) {
      return res.status(400).json({ error: 'Invalid bar size. Must be 1g, 10g, 100g, or 1kg' });
    }

    const totalGrams = (gramsPerBar * barCount).toFixed(6);

    const goldPriceRes = await fetch(`http://localhost:5000/api/gold-price`);
    const goldPriceData = await goldPriceRes.json();
    const goldPricePerGram = goldPriceData?.pricePerGram || 142;
    const usdAmount = (parseFloat(totalGrams) * goldPricePerGram).toFixed(2);

    const { orderId, referenceNumber } = await WingoldIntegrationService.createPurchaseOrder({
      userId: (req.user as any).id,
      barSize,
      barCount,
      totalGrams,
      usdAmount,
      goldPricePerGram: goldPricePerGram.toFixed(6),
      preferredVaultLocation: vaultLocationId
    });

    console.log(`[Wingold] Order ${referenceNumber} created - awaiting admin approval`);

    res.status(201).json({
      success: true,
      orderId,
      referenceNumber,
      status: 'pending',
      message: 'Order submitted for admin approval'
    });
  } catch (error) {
    console.error('[Wingold] Order creation failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Order creation failed' });
  }
});

router.get('/orders/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.params.userId;
    if ((req.user as any).id !== userId && (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.userId, userId))
      .orderBy(desc(wingoldPurchaseOrders.createdAt));

    res.json({ orders });
  } catch (error) {
    console.error('[Wingold] Failed to fetch user orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.post('/orders/:orderId/approve', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.orderId;
    
    const [order] = await db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.id, orderId));

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    const submitResult = await WingoldIntegrationService.submitOrderToWingold(orderId);

    console.log(`[Wingold] Order ${order.referenceNumber} approved by admin and submitted to Wingold`);

    res.json({
      success: true,
      message: 'Order approved and submitted to Wingold',
      wingoldOrderId: submitResult.orderId,
      estimatedFulfillmentTime: submitResult.estimatedFulfillmentTime
    });
  } catch (error) {
    console.error('[Wingold] Order approval failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Order approval failed' });
  }
});

router.post('/orders/:orderId/reject', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.orderId;
    const { reason } = req.body;
    
    const [order] = await db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.id, orderId));

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    await db.update(wingoldPurchaseOrders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        errorMessage: reason || 'Rejected by admin',
        updatedAt: new Date()
      })
      .where(eq(wingoldPurchaseOrders.id, orderId));

    console.log(`[Wingold] Order ${order.referenceNumber} rejected by admin: ${reason || 'No reason provided'}`);

    res.json({
      success: true,
      message: 'Order rejected'
    });
  } catch (error) {
    console.error('[Wingold] Order rejection failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Order rejection failed' });
  }
});

router.get('/admin/pending-orders', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orders = await db.select()
      .from(wingoldPurchaseOrders)
      .where(eq(wingoldPurchaseOrders.status, 'pending'))
      .orderBy(desc(wingoldPurchaseOrders.createdAt));

    res.json({ orders });
  } catch (error) {
    console.error('[Wingold] Failed to fetch pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

router.get('/admin/all-orders', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orders = await db.select()
      .from(wingoldPurchaseOrders)
      .orderBy(desc(wingoldPurchaseOrders.createdAt))
      .limit(100);

    res.json({ orders });
  } catch (error) {
    console.error('[Wingold] Failed to fetch all orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
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
    
    res.json({ locations });
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

// ============================================
// PRODUCT CATALOG API - Fetch from Wingold B2B
// ============================================

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { inStock, category, refresh } = req.query;
    
    // Check if we should refresh from Wingold API
    if (refresh === 'true' || !(await hasRecentProducts())) {
      await syncProductsFromWingold(inStock === 'true', category as string);
    }
    
    // Return cached products from database
    let query = db.select().from(wingoldProducts);
    
    if (inStock === 'true') {
      query = query.where(eq(wingoldProducts.inStock, true)) as any;
    }
    
    const products = await query.orderBy(wingoldProducts.weightGrams);
    
    // Get current gold price for live pricing
    const goldPriceRes = await fetch('http://localhost:5000/api/gold-price');
    const goldPriceData = await goldPriceRes.json();
    
    res.json({
      timestamp: new Date().toISOString(),
      spotPrice: goldPriceData.pricePerOunce,
      pricePerGram: goldPriceData.pricePerGram?.toFixed(4),
      currency: 'USD',
      totalProducts: products.length,
      products: products.map(p => ({
        productId: p.wingoldProductId,
        name: p.name,
        weight: p.weight,
        weightGrams: p.weightGrams,
        purity: p.purity,
        livePrice: (parseFloat(p.weightGrams || '0') * goldPriceData.pricePerGram).toFixed(2),
        livePriceAed: (parseFloat(p.weightGrams || '0') * goldPriceData.pricePerGram * 3.67).toFixed(2),
        stock: p.stock,
        inStock: p.inStock,
        imageUrl: p.imageUrl,
        description: p.description,
        category: p.category,
        syncedAt: p.syncedAt
      }))
    });
  } catch (error) {
    console.error('[Wingold] Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products/sync', async (req: Request, res: Response) => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await syncProductsFromWingold(true, 'bars');
    
    const products = await db.select().from(wingoldProducts);
    
    res.json({ 
      success: true, 
      message: `Synced ${products.length} products from Wingold`,
      products 
    });
  } catch (error) {
    console.error('[Wingold] Product sync failed:', error);
    res.status(500).json({ error: 'Product sync failed' });
  }
});

// Helper: Check if we have recent products (synced within 5 minutes)
async function hasRecentProducts(): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await db.select()
    .from(wingoldProducts)
    .where(sql`${wingoldProducts.syncedAt} > ${fiveMinutesAgo}`)
    .limit(1);
  return recent.length > 0;
}

// Helper: Sync products from Wingold B2B API
async function syncProductsFromWingold(inStock?: boolean, category?: string): Promise<void> {
  if (!FINATRADES_API_KEY) {
    console.log('[Wingold] No API key configured, using default products');
    await seedDefaultProducts();
    return;
  }

  try {
    const params = new URLSearchParams();
    if (inStock !== undefined) params.append('inStock', String(inStock));
    if (category) params.append('category', category);
    
    const url = `${WINGOLD_API_URL}/api/b2b/products?${params.toString()}`;
    console.log(`[Wingold] Fetching products from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': FINATRADES_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[Wingold] API returned ${response.status}: ${response.statusText}`);
      await seedDefaultProducts();
      return;
    }

    const data = await response.json();
    console.log(`[Wingold] Received ${data.products?.length || 0} products from API`);

    if (data.products && data.products.length > 0) {
      // Upsert products
      for (const product of data.products) {
        await db.insert(wingoldProducts)
          .values({
            wingoldProductId: product.productId,
            name: product.name,
            weight: product.weight,
            weightGrams: product.weightGrams,
            purity: product.purity || '999.9',
            livePrice: product.livePrice,
            pricePerGram: data.pricePerGram,
            currency: data.currency || 'USD',
            stock: product.stock || 0,
            inStock: product.stock > 0,
            category: category || 'bars',
            imageUrl: product.imageUrl,
            description: product.description,
            metadata: product,
            syncedAt: new Date()
          })
          .onConflictDoUpdate({
            target: wingoldProducts.wingoldProductId,
            set: {
              name: product.name,
              weight: product.weight,
              weightGrams: product.weightGrams,
              purity: product.purity || '999.9',
              livePrice: product.livePrice,
              pricePerGram: data.pricePerGram,
              stock: product.stock || 0,
              inStock: product.stock > 0,
              imageUrl: product.imageUrl,
              description: product.description,
              metadata: product,
              syncedAt: new Date(),
              updatedAt: new Date()
            }
          });
      }
      console.log(`[Wingold] Synced ${data.products.length} products to database`);
    }
  } catch (error) {
    console.error('[Wingold] Failed to sync products from API:', error);
    await seedDefaultProducts();
  }
}

// Helper: Seed default products when API is unavailable
async function seedDefaultProducts(): Promise<void> {
  const defaultProducts = [
    { wingoldProductId: 'WG-1G-BAR', name: '1g Gold Bar - Wingold', weight: '1g', weightGrams: '1.0000', purity: '999.9', stock: 100 },
    { wingoldProductId: 'WG-10G-BAR', name: '10g Gold Bar - Wingold', weight: '10g', weightGrams: '10.0000', purity: '999.9', stock: 100 },
    { wingoldProductId: 'WG-100G-BAR', name: '100g Gold Bar - Wingold', weight: '100g', weightGrams: '100.0000', purity: '999.9', stock: 50 },
    { wingoldProductId: 'WG-1KG-BAR', name: '1kg Gold Bar - Wingold', weight: '1kg', weightGrams: '1000.0000', purity: '999.9', stock: 25 }
  ];

  for (const product of defaultProducts) {
    await db.insert(wingoldProducts)
      .values({
        ...product,
        currency: 'USD',
        inStock: true,
        category: 'bars',
        description: 'LBMA Certified pure gold bar with assay certificate',
        syncedAt: new Date()
      })
      .onConflictDoNothing();
  }
  console.log('[Wingold] Seeded default products');
}

export default router;
