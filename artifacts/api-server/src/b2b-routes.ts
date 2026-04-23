import express, { Router, Request, Response } from 'express';
import { B2bOrderService } from './b2b-order-service';
import { z } from 'zod';

const router = Router();

const orderRequestSchema = z.object({
  referenceNumber: z.string().min(1),
  barSize: z.enum(['1g', '10g', '100g', '1kg']),
  barCount: z.number().int().positive(),
  totalGrams: z.string(),
  usdAmount: z.string(),
  goldPricePerGram: z.string(),
  preferredVaultLocation: z.string().optional(),
  customer: z.object({
    externalId: z.string(),
    email: z.string().email(),
    name: z.string()
  }),
  webhookUrl: z.string().url(),
  timestamp: z.string()
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!B2bOrderService.verifyApiKey(apiKey)) {
      console.log('[B2B] Invalid API key');
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const parseResult = orderRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request body', 
        details: parseResult.error.errors 
      });
    }

    const result = await B2bOrderService.createOrder(parseResult.data);
    
    res.status(201).json({
      success: true,
      orderId: result.orderId,
      estimatedFulfillmentTime: result.estimatedFulfillmentTime
    });
  } catch (error) {
    console.error('[B2B] Order creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create order';
    res.status(400).json({ success: false, error: message });
  }
});

router.get('/vault-locations', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!B2bOrderService.verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const locations = await B2bOrderService.getVaultLocations();
    
    res.json(locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      city: loc.city,
      country: loc.country,
      address: loc.address,
      isActive: loc.isActive
    })));
  } catch (error) {
    console.error('[B2B] Failed to fetch vault locations:', error);
    res.status(500).json({ error: 'Failed to fetch vault locations' });
  }
});

router.get('/reconciliation', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!B2bOrderService.verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const date = req.query.date as string;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const data = await B2bOrderService.getReconciliationData(date);
    res.json(data);
  } catch (error) {
    console.error('[B2B] Failed to fetch reconciliation data:', error);
    res.status(500).json({ error: 'Failed to fetch reconciliation data' });
  }
});

router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!B2bOrderService.verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const order = await B2bOrderService.getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('[B2B] Failed to fetch order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.post('/orders/:orderId/cancel', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!B2bOrderService.verifyApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    await B2bOrderService.cancelOrder(req.params.orderId, reason);
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    console.error('[B2B] Failed to cancel order:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel order';
    res.status(400).json({ error: message });
  }
});

export default router;
