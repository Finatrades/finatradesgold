import express, { Router, Request, Response, NextFunction } from 'express';
import { WingoldIntegrationService } from './wingold-integration-service';
import { WingoldUserSyncService } from './wingold-user-sync-service';
import { wingoldSecurityMiddleware, wingoldSecurityPostProcessor, WingoldSecurityService } from './wingold-security';
import { getGoldPrice, getGoldPricePerGram } from './gold-price-service';
import { db } from './db';
import { wingoldPurchaseOrders, wingoldBarLots, wingoldCertificates, wingoldVaultLocations, wingoldProducts, users } from '@shared/schema';
import { eq, desc, sql, and, count } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for product image uploads
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});

// Helper function to get user from session
async function getSessionUser(req: Request): Promise<{ id: string; role: string } | null> {
  if (!req.session?.userId) {
    return null;
  }
  const [user] = await db.select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, req.session.userId))
    .limit(1);
  return user || null;
}

const WINGOLD_API_URL = process.env.WINGOLD_API_URL || 'https://wingoldandmetals--imcharanpratap.replit.app';
const FINATRADES_API_KEY = process.env.FINATRADES_API_KEY;

router.post('/webhooks', express.raw({ type: 'application/json' }), wingoldSecurityMiddleware, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).wingoldPayload;
    
    if (!payload) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    console.log(`[Wingold Webhook] Processing secured event: ${payload.event}`);
    
    await WingoldIntegrationService.handleWebhook(payload);
    
    wingoldSecurityPostProcessor(payload.orderId, payload.event);
    
    res.json({ received: true });
  } catch (error) {
    console.error('[Wingold Webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { barSize, barCount, vaultLocationId } = req.body;

    const sizeToGrams: Record<string, number> = { '1g': 1, '10g': 10, '100g': 100, '1kg': 1000 };
    const gramsPerBar = sizeToGrams[barSize];
    
    if (!gramsPerBar) {
      return res.status(400).json({ error: 'Invalid bar size. Must be 1g, 10g, 100g, or 1kg' });
    }

    const totalGrams = (gramsPerBar * barCount).toFixed(6);

    const goldPricePerGram = await getGoldPricePerGram();
    const usdAmount = (parseFloat(totalGrams) * goldPricePerGram).toFixed(2);

    const { orderId, referenceNumber } = await WingoldIntegrationService.createPurchaseOrder({
      userId: user.id,
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
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.params.userId;
    if (user.id !== userId && user.role !== 'admin') {
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
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orders = await db.select({
      id: wingoldPurchaseOrders.id,
      referenceNumber: wingoldPurchaseOrders.referenceNumber,
      userId: wingoldPurchaseOrders.userId,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      barSize: wingoldPurchaseOrders.barSize,
      barCount: wingoldPurchaseOrders.barCount,
      totalGrams: wingoldPurchaseOrders.totalGrams,
      usdAmount: wingoldPurchaseOrders.usdAmount,
      goldPriceUsdPerGram: wingoldPurchaseOrders.goldPriceUsdPerGram,
      status: wingoldPurchaseOrders.status,
      wingoldOrderId: wingoldPurchaseOrders.wingoldOrderId,
      wingoldVaultLocationId: wingoldPurchaseOrders.wingoldVaultLocationId,
      errorMessage: wingoldPurchaseOrders.errorMessage,
      submittedAt: wingoldPurchaseOrders.submittedAt,
      fulfilledAt: wingoldPurchaseOrders.fulfilledAt,
      createdAt: wingoldPurchaseOrders.createdAt,
    })
      .from(wingoldPurchaseOrders)
      .leftJoin(users, eq(wingoldPurchaseOrders.userId, users.id))
      .where(eq(wingoldPurchaseOrders.status, 'pending'))
      .orderBy(desc(wingoldPurchaseOrders.createdAt));

    res.json({ orders });
  } catch (error) {
    console.error('[Wingold] Failed to fetch pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

router.get('/admin/awaiting-finatrades-approval', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orders = await db.select({
      id: wingoldPurchaseOrders.id,
      referenceNumber: wingoldPurchaseOrders.referenceNumber,
      userId: wingoldPurchaseOrders.userId,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      barSize: wingoldPurchaseOrders.barSize,
      barCount: wingoldPurchaseOrders.barCount,
      totalGrams: wingoldPurchaseOrders.totalGrams,
      usdAmount: wingoldPurchaseOrders.usdAmount,
      goldPriceUsdPerGram: wingoldPurchaseOrders.goldPriceUsdPerGram,
      status: wingoldPurchaseOrders.status,
      wingoldOrderId: wingoldPurchaseOrders.wingoldOrderId,
      wingoldVaultLocationId: wingoldPurchaseOrders.wingoldVaultLocationId,
      errorMessage: wingoldPurchaseOrders.errorMessage,
      submittedAt: wingoldPurchaseOrders.submittedAt,
      fulfilledAt: wingoldPurchaseOrders.fulfilledAt,
      createdAt: wingoldPurchaseOrders.createdAt,
    })
      .from(wingoldPurchaseOrders)
      .leftJoin(users, eq(wingoldPurchaseOrders.userId, users.id))
      .where(eq(wingoldPurchaseOrders.status, 'wingold_approved'))
      .orderBy(desc(wingoldPurchaseOrders.createdAt));

    res.json({ orders });
  } catch (error) {
    console.error('[Wingold] Failed to fetch orders awaiting approval:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.post('/orders/:orderId/finatrades-approve', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderId = req.params.orderId;
    
    const result = await WingoldIntegrationService.approveAndCreditWingoldOrder(orderId, user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      txnId: result.txnId
    });
  } catch (error) {
    console.error('[Wingold] Finatrades approval failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Approval failed' });
  }
});

router.get('/admin/all-orders', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orders = await db.select({
      id: wingoldPurchaseOrders.id,
      referenceNumber: wingoldPurchaseOrders.referenceNumber,
      userId: wingoldPurchaseOrders.userId,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      barSize: wingoldPurchaseOrders.barSize,
      barCount: wingoldPurchaseOrders.barCount,
      totalGrams: wingoldPurchaseOrders.totalGrams,
      usdAmount: wingoldPurchaseOrders.usdAmount,
      goldPriceUsdPerGram: wingoldPurchaseOrders.goldPriceUsdPerGram,
      status: wingoldPurchaseOrders.status,
      wingoldOrderId: wingoldPurchaseOrders.wingoldOrderId,
      wingoldVaultLocationId: wingoldPurchaseOrders.wingoldVaultLocationId,
      errorMessage: wingoldPurchaseOrders.errorMessage,
      submittedAt: wingoldPurchaseOrders.submittedAt,
      fulfilledAt: wingoldPurchaseOrders.fulfilledAt,
      createdAt: wingoldPurchaseOrders.createdAt,
    })
      .from(wingoldPurchaseOrders)
      .leftJoin(users, eq(wingoldPurchaseOrders.userId, users.id))
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
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orders = await WingoldIntegrationService.getUserOrders(user.id);
    res.json(orders);
  } catch (error) {
    console.error('[Wingold] Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orderStatus = await WingoldIntegrationService.getOrderStatus(req.params.orderId);
    
    if (!orderStatus) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orderStatus.order.userId !== user.id) {
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
      .where(and(
        eq(wingoldVaultLocations.isActive, true),
        sql`LOWER(${wingoldVaultLocations.name}) LIKE '%securevault%' OR LOWER(${wingoldVaultLocations.code}) LIKE '%sv%'`
      ));
    
    if (locations.length === 0) {
      const allActiveLocations = await db.select()
        .from(wingoldVaultLocations)
        .where(eq(wingoldVaultLocations.isActive, true));
      
      if (allActiveLocations.length > 0) {
        res.json({ locations: allActiveLocations, note: 'All vault locations shown - SecureVault filter applied when available' });
        return;
      }
      
      const defaultSecureVault = [{
        id: 'sv-dubai-default',
        name: 'SecureVault Dubai',
        code: 'SV-DXB',
        city: 'DMCC',
        country: 'UAE',
        address: 'Dubai Multi Commodities Centre',
        isActive: true
      }];
      res.json({ locations: defaultSecureVault });
      return;
    }
    
    res.json({ locations });
  } catch (error) {
    console.error('[Wingold] Failed to fetch vault locations:', error);
    res.status(500).json({ error: 'Failed to fetch vault locations' });
  }
});

router.post('/vault-locations/sync', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const certificates = await db.select()
      .from(wingoldCertificates)
      .where(and(
        eq(wingoldCertificates.orderId, req.params.orderId),
        eq(wingoldCertificates.userId, user.id)
      ));
    
    res.json(certificates);
  } catch (error) {
    console.error('[Wingold] Failed to fetch certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

router.get('/bars/:orderId', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const bars = await db.select()
      .from(wingoldBarLots)
      .where(and(
        eq(wingoldBarLots.orderId, req.params.orderId),
        eq(wingoldBarLots.userId, user.id)
      ));
    
    res.json(bars);
  } catch (error) {
    console.error('[Wingold] Failed to fetch bar lots:', error);
    res.status(500).json({ error: 'Failed to fetch bar lots' });
  }
});

router.post('/reconciliation/run', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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

router.get('/security/stats', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = WingoldSecurityService.getSecurityStats();
    res.json(stats);
  } catch (error) {
    console.error('[Wingold] Failed to fetch security stats:', error);
    res.status(500).json({ error: 'Failed to fetch security stats' });
  }
});

router.get('/security/audit-log', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const logs = WingoldSecurityService.getAuditLog(limit);
    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error('[Wingold] Failed to fetch audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

router.post('/users/sync-all', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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
    
    // Check if database has any products - seed if empty (production safety)
    const productCount = await db.select({ count: count() }).from(wingoldProducts);
    if (productCount[0]?.count === 0) {
      console.log('[Wingold] No products in database, seeding defaults...');
      await seedDefaultProducts();
    }
    
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
    
    // Get current gold price using internal service (works in production)
    const goldPriceData = await getGoldPrice();
    const pricePerGram = goldPriceData.pricePerGram;
    
    res.json({
      timestamp: new Date().toISOString(),
      spotPrice: goldPriceData.pricePerOunce,
      pricePerGram: pricePerGram.toFixed(4),
      currency: 'USD',
      totalProducts: products.length,
      products: products.map(p => ({
        productId: p.wingoldProductId,
        name: p.name,
        weight: p.weight,
        weightGrams: p.weightGrams,
        purity: p.purity,
        livePrice: (parseFloat(p.weightGrams || '0') * pricePerGram).toFixed(2),
        livePriceAed: (parseFloat(p.weightGrams || '0') * pricePerGram * 3.67).toFixed(2),
        stock: p.stock,
        inStock: p.inStock,
        imageUrl: p.imageUrl,
        thumbnailUrl: p.thumbnailUrl,
        galleryUrls: p.galleryUrls,
        certificationImageUrl: p.certificationImageUrl,
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
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
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
            thumbnailUrl: product.thumbnailUrl,
            galleryUrls: product.galleryUrls,
            certificationImageUrl: product.certificationImageUrl,
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
              thumbnailUrl: product.thumbnailUrl,
              galleryUrls: product.galleryUrls,
              certificationImageUrl: product.certificationImageUrl,
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
    { wingoldProductId: 'WG-1G-BAR', name: '1g Gold Bar - Wingold', weight: '1g', weightGrams: '1.0000', purity: '999.9', stock: 100, imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop' },
    { wingoldProductId: 'WG-10G-BAR', name: '10g Gold Bar - Wingold', weight: '10g', weightGrams: '10.0000', purity: '999.9', stock: 100, imageUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&h=400&fit=crop' },
    { wingoldProductId: 'WG-100G-BAR', name: '100g Gold Bar - Wingold', weight: '100g', weightGrams: '100.0000', purity: '999.9', stock: 50, imageUrl: 'https://images.unsplash.com/photo-1624365168968-f283d506c6b6?w=400&h=400&fit=crop' },
    { wingoldProductId: 'WG-1KG-BAR', name: '1kg Gold Bar - Wingold', weight: '1kg', weightGrams: '1000.0000', purity: '999.9', stock: 25, imageUrl: 'https://images.unsplash.com/photo-1592807961990-dc6a04a32e0e?w=400&h=400&fit=crop' }
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

// ============================================
// ADMIN PRODUCT MANAGEMENT CRUD
// ============================================

// Get all products for admin (including inactive)
router.get('/admin/products', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const products = await db.select().from(wingoldProducts).orderBy(wingoldProducts.weightGrams);
    res.json({ products });
  } catch (error) {
    console.error('[Wingold Admin] Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create new product
router.post('/admin/products', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, weight, weightGrams, purity, stock, imageUrl, description, inStock } = req.body;

    if (!name || !weight || !weightGrams) {
      return res.status(400).json({ error: 'Name, weight, and weightGrams are required' });
    }

    const wingoldProductId = `WG-${weight.toUpperCase().replace(/\s/g, '')}-${Date.now()}`;

    const [newProduct] = await db.insert(wingoldProducts)
      .values({
        wingoldProductId,
        name,
        weight,
        weightGrams: String(weightGrams),
        purity: purity || '999.9',
        stock: stock || 0,
        inStock: inStock !== false,
        imageUrl,
        description,
        currency: 'USD',
        category: 'bars',
        syncedAt: new Date()
      })
      .returning();

    console.log(`[Wingold Admin] Product created: ${name} (${wingoldProductId})`);
    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('[Wingold Admin] Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/admin/products/:id', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, weight, weightGrams, purity, stock, imageUrl, description, inStock } = req.body;

    const [updated] = await db.update(wingoldProducts)
      .set({
        name,
        weight,
        weightGrams: String(weightGrams),
        purity,
        stock,
        imageUrl,
        description,
        inStock,
        syncedAt: new Date()
      })
      .where(eq(wingoldProducts.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`[Wingold Admin] Product updated: ${name}`);
    res.json({ success: true, product: updated });
  } catch (error) {
    console.error('[Wingold Admin] Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Toggle product active status
router.patch('/admin/products/:id/toggle', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const [product] = await db.select().from(wingoldProducts).where(eq(wingoldProducts.id, id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [updated] = await db.update(wingoldProducts)
      .set({ inStock: !product.inStock, syncedAt: new Date() })
      .where(eq(wingoldProducts.id, id))
      .returning();

    console.log(`[Wingold Admin] Product ${updated.name} set to ${updated.inStock ? 'active' : 'inactive'}`);
    res.json({ success: true, product: updated });
  } catch (error) {
    console.error('[Wingold Admin] Failed to toggle product:', error);
    res.status(500).json({ error: 'Failed to toggle product' });
  }
});

// Delete product
router.delete('/admin/products/:id', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const [deleted] = await db.delete(wingoldProducts)
      .where(eq(wingoldProducts.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`[Wingold Admin] Product deleted: ${deleted.name}`);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('[Wingold Admin] Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Upload product image
router.post('/admin/products/upload-image', productImageUpload.single('image'), async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;
    console.log(`[Wingold Admin] Product image uploaded: ${imageUrl}`);
    
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('[Wingold Admin] Failed to upload image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.get('/shop-redirect', async (req: Request, res: Response) => {
  try {
    const ssoSecret = process.env.WINGOLD_SYNC_SECRET;
    if (!ssoSecret) {
      console.error('[Wingold] WINGOLD_SYNC_SECRET not configured - shop redirect unavailable');
      return res.status(503).json({ error: 'Shop integration temporarily unavailable' });
    }
    
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [userData] = await db.select().from(users).where(eq(users.id, user.id));
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ssoPayload = {
      userId: userData.id,
      finatradesId: userData.finatradesId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000)
    };

    const ssoToken = Buffer.from(JSON.stringify(ssoPayload)).toString('base64url');
    
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', ssoSecret)
      .update(ssoToken)
      .digest('hex');

    const shopUrl = `${WINGOLD_API_URL}/shop?sso=${ssoToken}&sig=${signature}&partner=finatrades`;

    res.json({ 
      redirectUrl: shopUrl,
      expiresIn: 300
    });
  } catch (error) {
    console.error('[Wingold] Shop redirect failed:', error);
    res.status(500).json({ error: 'Failed to generate shop redirect' });
  }
});

export default router;
