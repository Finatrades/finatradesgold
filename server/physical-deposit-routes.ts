import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { z } from 'zod';
import type { InsertPhysicalDepositRequest, InsertDepositItem, InsertDepositInspection, InsertDepositNegotiationMessage } from '@shared/schema';
import { sendEmailDirect } from './email';
import { requireAdmin } from './rbac-middleware';
import { emitLedgerEvent, emitAdminNotification } from './socket';
import { getGoldPricePerGram } from './gold-price-service';
import { workflowAuditService, type FlowType } from './workflow-audit-service';

// Helper to emit real-time physical deposit status updates
function emitPhysicalDepositUpdate(userId: string, depositId: string, referenceNumber: string, status: string, data?: any) {
  emitLedgerEvent(userId, {
    type: 'physical_deposit_update',
    module: 'finavault',
    action: `deposit_${status.toLowerCase()}`,
    data: {
      depositId,
      referenceNumber,
      status,
      ...data,
      timestamp: new Date().toISOString(),
    }
  });
}

// Helper to emit real-time negotiation message updates
function emitNegotiationUpdate(userId: string, depositId: string, message: any) {
  emitLedgerEvent(userId, {
    type: 'negotiation_message',
    module: 'finavault',
    action: 'new_message',
    data: {
      depositId,
      message,
      timestamp: new Date().toISOString(),
    }
  });
}

// Helper to send physical deposit status notification emails
async function sendPhysicalDepositStatusEmail(
  userId: string,
  referenceNumber: string,
  status: string,
  additionalInfo?: { creditedGrams?: number; reason?: string }
): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.email) return;

    const statusMessages: Record<string, { subject: string; body: string }> = {
      UNDER_REVIEW: {
        subject: `Physical Gold Deposit ${referenceNumber} - Under Review`,
        body: `Your physical gold deposit request (${referenceNumber}) is now under review. Our team will verify your submission and contact you regarding delivery arrangements.`,
      },
      RECEIVED: {
        subject: `Physical Gold Deposit ${referenceNumber} - Received at Vault`,
        body: `Great news! Your physical gold deposit (${referenceNumber}) has been received at our secure vault facility. We will now proceed with inspection and verification.`,
      },
      INSPECTION: {
        subject: `Physical Gold Deposit ${referenceNumber} - Inspection Complete`,
        body: `The inspection of your physical gold deposit (${referenceNumber}) has been completed. Please log in to your account to view the inspection results.`,
      },
      NEGOTIATION: {
        subject: `Physical Gold Deposit ${referenceNumber} - Offer Available`,
        body: `We have sent you an offer for your physical gold deposit (${referenceNumber}). Please log in to your account to review and respond to the offer.`,
      },
      AGREED: {
        subject: `Physical Gold Deposit ${referenceNumber} - Terms Agreed`,
        body: `The terms for your physical gold deposit (${referenceNumber}) have been agreed upon. Your deposit will now be processed for final approval.`,
      },
      READY_FOR_PAYMENT: {
        subject: `Physical Gold Deposit ${referenceNumber} - Ready for Processing`,
        body: `Your physical gold deposit (${referenceNumber}) has completed inspection and is now ready for final processing. Your gold will be credited to your wallet shortly.`,
      },
      APPROVED: {
        subject: `Physical Gold Deposit ${referenceNumber} - Approved & Credited`,
        body: `Your physical gold deposit (${referenceNumber}) has been approved and ${additionalInfo?.creditedGrams?.toFixed(4) || 'your gold'} grams have been credited to your LGPW wallet. Certificates have been issued and are available in your account.`,
      },
      REJECTED: {
        subject: `Physical Gold Deposit ${referenceNumber} - Rejected`,
        body: `Unfortunately, your physical gold deposit (${referenceNumber}) has been rejected. Reason: ${additionalInfo?.reason || 'Please contact support for more information.'}`,
      },
    };

    const message = statusMessages[status];
    if (!message) return;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8A2BE2 0%, #9B30FF 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Finatrades</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hello ${user.firstName || 'Valued Customer'},</h2>
          <p style="color: #555; line-height: 1.6;">${message.body}</p>
          <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #8A2BE2;">
            <p style="margin: 0; color: #666;"><strong>Reference:</strong> ${referenceNumber}</p>
            <p style="margin: 5px 0 0; color: #666;"><strong>Status:</strong> ${status}</p>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This is an automated notification from Finatrades. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    await sendEmailDirect(user.email, message.subject, htmlBody);
    console.log(`[Physical Deposit] Status email sent to ${user.email} for ${referenceNumber} - ${status}`);
  } catch (error) {
    console.error('[Physical Deposit] Failed to send status email:', error);
  }
}

const router = Router();

// ====================================
// USER ROUTES
// ====================================

const depositItemSchema = z.object({
  itemType: z.enum(['RAW', 'GOLD_BAR', 'GOLD_COIN', 'OTHER']),
  quantity: z.number().int().min(1).default(1),
  weightPerUnitGrams: z.string(),
  totalDeclaredWeightGrams: z.string(),
  purity: z.string(),
  brand: z.string().optional(),
  mint: z.string().optional(),
  serialNumber: z.string().optional(),
  customDescription: z.string().optional(),
  photoFrontUrl: z.string().optional(),
  photoBackUrl: z.string().optional(),
  additionalPhotos: z.array(z.string()).optional(),
});

const createDepositSchema = z.object({
  vaultLocation: z.string().optional(),
  depositType: z.enum(['RAW', 'GOLD_BAR', 'GOLD_COIN', 'OTHER']),
  items: z.array(depositItemSchema).min(1),
  isBeneficialOwner: z.boolean().default(true),
  sourceOfMetal: z.string().optional(),
  sourceDetails: z.string().optional(),
  deliveryMethod: z.enum(['PERSONAL_DROPOFF', 'COURIER', 'ARMORED_PICKUP']),
  pickupAddress: z.string().optional(),
  pickupContactName: z.string().optional(),
  pickupContactPhone: z.string().optional(),
  preferredDatetime: z.string().optional(),
  invoiceUrl: z.string().optional(),
  assayCertificateUrl: z.string().optional(),
  additionalDocuments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  noLienDispute: z.boolean(),
  acceptVaultTerms: z.boolean(),
  acceptInsurance: z.boolean().optional(),
  acceptFees: z.boolean().optional(),
  // Optional USD estimate from user (for negotiation)
  usdEstimateFromUser: z.number().positive().optional(),
});

router.post('/deposits', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    if (!session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // SECURITY: Block admin accounts from submitting physical deposits
    // Admins should not use user-side deposit flow - prevents self-approval conflicts
    const user = await storage.getUser(session.userId);
    if (user?.role === 'admin') {
      return res.status(403).json({ 
        error: 'Admin accounts cannot submit physical deposits. Please use a regular user account.',
        code: 'ADMIN_DEPOSIT_BLOCKED'
      });
    }

    const parsed = createDepositSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const data = parsed.data;
    const userId = session.userId;

    if (!data.noLienDispute || !data.acceptVaultTerms) {
      return res.status(400).json({ error: 'Required declarations must be accepted' });
    }

    const requiresNegotiation = data.depositType === 'RAW' || data.depositType === 'OTHER';

    const totalWeight = data.items.reduce((sum, item) => sum + parseFloat(item.totalDeclaredWeightGrams), 0);

    const referenceNumber = await storage.generatePhysicalDepositReference();
    
    // Lock the gold price at submission time
    let goldPriceAtSubmission: string | undefined;
    try {
      const currentPrice = await getGoldPricePerGram();
      if (currentPrice > 0) {
        goldPriceAtSubmission = currentPrice.toFixed(2);
      }
    } catch (priceError) {
      console.error('Failed to fetch gold price for submission lock:', priceError);
    }

    const depositRequest: InsertPhysicalDepositRequest = {
      referenceNumber,
      userId,
      depositType: data.depositType,
      requiresNegotiation,
      totalDeclaredWeightGrams: totalWeight.toFixed(6),
      itemCount: data.items.length,
      isBeneficialOwner: data.isBeneficialOwner,
      sourceOfMetal: data.sourceOfMetal,
      sourceDetails: data.sourceDetails,
      deliveryMethod: data.deliveryMethod,
      pickupAddress: data.pickupAddress,
      pickupContactName: data.pickupContactName,
      pickupContactPhone: data.pickupContactPhone,
      preferredDatetime: data.preferredDatetime ? new Date(data.preferredDatetime) : undefined,
      invoiceUrl: data.invoiceUrl,
      assayCertificateUrl: data.assayCertificateUrl,
      additionalDocuments: data.additionalDocuments,
      noLienDispute: data.noLienDispute,
      acceptVaultTerms: data.acceptVaultTerms,
      acceptInsurance: data.acceptInsurance,
      acceptFees: data.acceptFees,
      status: 'SUBMITTED',
      // USD estimate from user (optional, for negotiation)
      usdEstimateFromUser: data.usdEstimateFromUser?.toString(),
      // Lock the gold price at submission time for reference
      goldPriceAtSubmission,
    };

    const deposit = await storage.createPhysicalDepositRequest(depositRequest);

    const depositItems: InsertDepositItem[] = data.items.map(item => ({
      depositRequestId: deposit.id,
      itemType: item.itemType,
      quantity: item.quantity,
      weightPerUnitGrams: item.weightPerUnitGrams,
      totalDeclaredWeightGrams: item.totalDeclaredWeightGrams,
      purity: item.purity,
      brand: item.brand,
      mint: item.mint,
      serialNumber: item.serialNumber,
      customDescription: item.customDescription,
      photoFrontUrl: item.photoFrontUrl,
      photoBackUrl: item.photoBackUrl,
      additionalPhotos: item.additionalPhotos,
    }));

    await storage.createDepositItems(depositItems);

    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: userId,
      actorRole: 'user',
      actionType: 'PHYSICAL_DEPOSIT_CREATED',
      details: JSON.stringify({ referenceNumber, depositType: data.depositType, itemCount: data.items.length, totalWeight }),
    });

    // Create notification for all admin users
    try {
      const admins = await storage.getAdminUsers();
      const user = await storage.getUser(userId);
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'A user';
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          title: 'New Physical Gold Deposit',
          message: `${userName} submitted a physical gold deposit request (${referenceNumber}). Total declared: ${totalWeight.toFixed(2)}g.`,
          type: 'system',
          link: '/admin/physical-deposits',
        });
      }
    } catch (notifError) {
      console.error('Failed to create admin notifications:', notifError);
    }

    res.status(201).json({
      success: true,
      deposit: {
        id: deposit.id,
        referenceNumber: deposit.referenceNumber,
        status: deposit.status,
        createdAt: deposit.createdAt,
      }
    });
  } catch (error) {
    console.error('Error creating physical deposit:', error);
    res.status(500).json({ error: 'Failed to create deposit request' });
  }
});

router.get('/deposits', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    if (!session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.userId;
    console.log('[Physical Deposits] Fetching deposits for user:', userId);
    const deposits = await storage.getUserPhysicalDeposits(userId);
    console.log('[Physical Deposits] Found deposits count:', deposits.length);

    const depositsWithDetails = await Promise.all(deposits.map(async (deposit) => {
      const items = await storage.getDepositItems(deposit.id);
      // Include inspection data for user to see credited grams after inspection
      const inspection = await storage.getDepositInspection(deposit.id);
      // Include negotiation messages for user to see admin offers
      const negotiations = await storage.getNegotiationMessages(deposit.id);
      return { 
        ...deposit, 
        items,
        // Include full inspection object for frontend compatibility
        inspection: inspection || null,
        // Include negotiations array for frontend to display offers
        negotiations,
        // Also keep inspectionSummary for backward compatibility
        inspectionSummary: inspection ? {
          creditedGrams: inspection.creditedGrams,
          grossWeightGrams: inspection.grossWeightGrams,
          netWeightGrams: inspection.netWeightGrams,
          purityResult: inspection.purityResult,
          totalFeesUsd: inspection.totalFeesUsd,
          inspectedAt: inspection.inspectedAt,
        } : null,
      };
    }));

    res.json({ deposits: depositsWithDetails });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

router.get('/deposits/:id', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    if (!session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit || deposit.userId !== userId) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const items = await storage.getDepositItems(deposit.id);
    const inspection = await storage.getDepositInspection(deposit.id);
    const negotiations = await storage.getNegotiationMessages(deposit.id);

    res.json({ deposit: { ...deposit, items, inspection, negotiations } });
  } catch (error) {
    console.error('Error fetching deposit:', error);
    res.status(500).json({ error: 'Failed to fetch deposit' });
  }
});

// Dedicated endpoint for negotiation messages
router.get('/deposits/:id/negotiation', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    if (!session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit || deposit.userId !== userId) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const messages = await storage.getNegotiationMessages(deposit.id);
    
    res.json({ 
      messages,
      usdEstimateFromUser: deposit.usdEstimateFromUser,
      usdCounterFromAdmin: deposit.usdCounterFromAdmin,
      usdAgreedValue: deposit.usdAgreedValue,
    });
  } catch (error) {
    console.error('Error fetching negotiation messages:', error);
    res.status(500).json({ error: 'Failed to fetch negotiation messages' });
  }
});

// Simplified: User can only ACCEPT or REJECT (no counter-offers)
const userResponseSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT']),
  message: z.string().optional(),
});

router.post('/deposits/:id/respond', async (req: Request, res: Response) => {
  console.log('[Respond] POST request received:', req.params.id, req.body);
  try {
    const session = (req as any).session;
    if (!session?.userId) {
      console.log('[Respond] Unauthorized - no session');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = userResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('[Respond] Invalid request:', parsed.error);
      return res.status(400).json({ error: 'Invalid request' });
    }

    const userId = session.userId;
    console.log('[Respond] User ID:', userId, 'Deposit ID:', req.params.id);
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit || deposit.userId !== userId) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'NEGOTIATION') {
      return res.status(400).json({ error: 'No pending offer to respond to' });
    }

    // Get latest negotiation message (should be admin offer)
    const latestMsg = await storage.getLatestNegotiationMessage(deposit.id);
    console.log('[Respond] Latest message:', latestMsg);
    
    // Ensure there's an admin offer to respond to
    if (!latestMsg || latestMsg.messageType !== 'ADMIN_OFFER') {
      return res.status(400).json({ error: 'No pending offer to respond to' });
    }

    const { action, message } = parsed.data;

    let messageType: string;
    let newStatus: string;
    let finalGrams: string | undefined;
    let finalFees: string | undefined;

    if (action === 'ACCEPT') {
      messageType = 'USER_ACCEPT';
      newStatus = 'AGREED';
      // Carry forward the admin's offer values
      finalGrams = latestMsg.proposedGrams || undefined;
      finalFees = latestMsg.proposedFees || undefined;
    } else {
      // REJECT - goes back to INSPECTION so admin can send new offer
      messageType = 'USER_REJECT';
      newStatus = 'INSPECTION';
    }
    
    const newMessage = await storage.createNegotiationMessage({
      depositRequestId: deposit.id,
      messageType,
      senderId: userId,
      senderRole: 'user',
      proposedGrams: finalGrams,
      proposedFees: finalFees,
      message: message,
      isLatest: true,
    });

    // Emit real-time update
    emitNegotiationUpdate(deposit.userId, deposit.id, newMessage);
    
    // Notify admins
    emitAdminNotification({
      type: 'negotiation_update',
      action: messageType.toLowerCase(),
      data: { depositId: deposit.id, referenceNumber: deposit.referenceNumber, message: newMessage },
    });

    await storage.markNegotiationResponded(latestMsg.id);

    // Update deposit status
    const depositUpdate: any = { status: newStatus };
    
    if (action === 'ACCEPT') {
      depositUpdate.userAcceptedAt = new Date();
      if (deposit.usdCounterFromAdmin) {
        depositUpdate.usdAgreedValue = deposit.usdCounterFromAdmin;
      }
    }
    
    await storage.updatePhysicalDeposit(deposit.id, depositUpdate);

    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: userId,
      actorRole: 'user',
      actionType: `PHYSICAL_DEPOSIT_${messageType}`,
      details: JSON.stringify({ action, message }),
    });

    res.json({ success: true, newStatus });
  } catch (error) {
    console.error('Error responding to offer:', error);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

router.post('/deposits/:id/cancel', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    if (!session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit || deposit.userId !== userId) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Cannot cancel deposit in current status' });
    }

    await storage.updatePhysicalDeposit(deposit.id, { status: 'CANCELLED' });

    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: userId,
      actorRole: 'user',
      actionType: 'PHYSICAL_DEPOSIT_CANCELLED',
      details: JSON.stringify({ previousStatus: deposit.status }),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling deposit:', error);
    res.status(500).json({ error: 'Failed to cancel deposit' });
  }
});

// ====================================
// ADMIN ROUTES
// ====================================

router.get('/admin/deposits', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const deposits = await storage.getAllPhysicalDeposits(status ? { status } : undefined);

    const depositsWithDetails = await Promise.all(deposits.map(async (deposit) => {
      const items = await storage.getDepositItems(deposit.id);
      const user = await storage.getUser(deposit.userId);
      const negotiations = await storage.getNegotiationMessages(deposit.id);
      const inspection = await storage.getDepositInspection(deposit.id);
      console.log(`[Admin Deposits] ${deposit.referenceNumber}: ${negotiations.length} negotiations, inspection: ${inspection?.creditedGrams || 'none'}`);
      return { 
        ...deposit, 
        items,
        negotiations,
        inspection,
        user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null
      };
    }));

    res.json({ deposits: depositsWithDetails });
  } catch (error) {
    console.error('Error fetching admin deposits:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

router.get('/admin/deposits/stats', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const stats = await storage.getPhysicalDepositStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/admin/deposits/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const deposit = await storage.getPhysicalDepositById(req.params.id);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const items = await storage.getDepositItems(deposit.id);
    const inspection = await storage.getDepositInspection(deposit.id);
    const negotiations = await storage.getNegotiationMessages(deposit.id);
    const user = await storage.getUser(deposit.userId);

    res.json({ 
      deposit: { 
        ...deposit, 
        items, 
        inspection, 
        negotiations,
        user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null
      } 
    });
  } catch (error) {
    console.error('Error fetching deposit:', error);
    res.status(500).json({ error: 'Failed to fetch deposit' });
  }
});

router.post('/admin/deposits/:id/review', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Deposit already reviewed' });
    }

    await storage.updatePhysicalDeposit(deposit.id, {
      status: 'UNDER_REVIEW',
      assignedTo: adminId,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    // Send email notification
    await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'UNDER_REVIEW');
    
    // Real-time WebSocket notification
    emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'UNDER_REVIEW');

    res.json({ success: true });
  } catch (error) {
    console.error('Error reviewing deposit:', error);
    res.status(500).json({ error: 'Failed to review' });
  }
});

const receiveSchema = z.object({
  batchLotId: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/admin/deposits/:id/receive', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const parsed = receiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (!['UNDER_REVIEW', 'SUBMITTED'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Invalid status for receiving' });
    }

    await storage.updatePhysicalDeposit(deposit.id, {
      status: 'RECEIVED',
      receivedAt: new Date(),
      receivedBy: adminId,
      batchLotId: parsed.data.batchLotId,
      adminNotes: parsed.data.notes ? `${deposit.adminNotes || ''}\n${new Date().toISOString()}: ${parsed.data.notes}`.trim() : deposit.adminNotes,
    });

    // Send email notification
    await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'RECEIVED');
    
    // Real-time WebSocket notification
    emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'RECEIVED');

    res.json({ success: true });
  } catch (error) {
    console.error('Error receiving deposit:', error);
    res.status(500).json({ error: 'Failed to receive' });
  }
});

const inspectionSchema = z.object({
  grossWeightGrams: z.string(),
  netWeightGrams: z.string(),
  purityResult: z.string(),
  assayMethod: z.string().optional(),
  assayFeeUsd: z.string().optional().default('0'),
  refiningFeeUsd: z.string().optional().default('0'),
  handlingFeeUsd: z.string().optional().default('0'),
  otherFeesUsd: z.string().optional().default('0'),
  creditedGrams: z.string(),
  assayReportUrl: z.string().optional(),
  inspectionPhotos: z.array(z.string()).optional(),
  inspectorNotes: z.string().optional(),
  discrepancyNotes: z.string().optional(),
  itemVerifications: z.array(z.object({
    itemId: z.string(),
    verifiedWeightGrams: z.string(),
    verifiedPurity: z.string(),
  })).optional(),
});

router.post('/admin/deposits/:id/inspect', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const parsed = inspectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'RECEIVED') {
      return res.status(400).json({ error: 'Deposit must be received before inspection' });
    }

    const data = parsed.data;
    const totalFees = parseFloat(data.assayFeeUsd || '0') + 
                      parseFloat(data.refiningFeeUsd || '0') + 
                      parseFloat(data.handlingFeeUsd || '0') + 
                      parseFloat(data.otherFeesUsd || '0');

    const inspection = await storage.createDepositInspection({
      depositRequestId: deposit.id,
      inspectorId: adminId,
      grossWeightGrams: data.grossWeightGrams,
      netWeightGrams: data.netWeightGrams,
      purityResult: data.purityResult,
      assayMethod: data.assayMethod,
      assayFeeUsd: data.assayFeeUsd,
      refiningFeeUsd: data.refiningFeeUsd,
      handlingFeeUsd: data.handlingFeeUsd,
      otherFeesUsd: data.otherFeesUsd,
      totalFeesUsd: totalFees.toFixed(2),
      creditedGrams: data.creditedGrams,
      assayReportUrl: data.assayReportUrl,
      inspectionPhotos: data.inspectionPhotos,
      inspectorNotes: data.inspectorNotes,
      discrepancyNotes: data.discrepancyNotes,
      inspectedAt: new Date(),
    });

    if (data.itemVerifications) {
      for (const item of data.itemVerifications) {
        await storage.updateDepositItem(item.itemId, {
          verifiedWeightGrams: item.verifiedWeightGrams,
          verifiedPurity: item.verifiedPurity,
        });
      }
    }

    const newStatus = deposit.requiresNegotiation ? 'NEGOTIATION' : 'INSPECTION';

    await storage.updatePhysicalDeposit(deposit.id, {
      status: newStatus as any,
      inspectionId: inspection.id,
    });

    // For negotiation items, automatically create the first offer from inspection data
    if (deposit.requiresNegotiation) {
      const autoOfferMsg = await storage.createNegotiationMessage({
        depositRequestId: deposit.id,
        messageType: 'ADMIN_OFFER',
        senderId: adminId,
        senderRole: 'admin',
        proposedGrams: data.creditedGrams,
        proposedFees: totalFees.toString(),
        message: `Based on inspection: ${data.creditedGrams}g credited after ${data.purityResult} purity verification. Total fees: $${totalFees.toFixed(2)}`,
        isLatest: true,
      });
      
      // Emit real-time negotiation message
      emitNegotiationUpdate(deposit.userId, deposit.id, autoOfferMsg);

      // Send negotiation email
      await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'NEGOTIATION');
      
      // Real-time WebSocket notification for negotiation
      emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'NEGOTIATION', {
        creditedGrams: data.creditedGrams,
        proposedFees: totalFees,
        purityResult: data.purityResult,
      });
    } else {
      // Send email notification about inspection completion
      await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'INSPECTION');
      
      // Real-time WebSocket notification
      emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'INSPECTION', {
        creditedGrams: data.creditedGrams,
        purityResult: data.purityResult,
      });
    }

    res.json({ success: true, inspectionId: inspection.id, newStatus });
  } catch (error) {
    console.error('Error inspecting deposit:', error);
    res.status(500).json({ error: 'Failed to inspect' });
  }
});

const offerSchema = z.object({
  proposedGrams: z.number().positive(),
  proposedPurity: z.string().optional(),
  proposedFees: z.number().nonnegative().optional(), // Fees can be 0
  goldPriceAtTime: z.number().positive().optional(),
  usdOffer: z.number().nonnegative().optional(), // Admin's USD valuation offer (can be 0 for pure gram-based)
  message: z.string().optional(),
});

router.post('/admin/deposits/:id/offer', requireAdmin(), async (req: Request, res: Response) => {
  try {
    console.log('[Offer] Received body:', JSON.stringify(req.body));
    const parsed = offerSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[Offer] Validation error:', JSON.stringify(parsed.error.issues));
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    }

    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Allow sending offer on INSPECTION, NEGOTIATION, or if user rejected previous offer
    if (!['INSPECTION', 'NEGOTIATION'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Invalid status for offer' });
    }

    // Mark any previous messages as responded (simplified - no turn-based check)
    const latestMsg = await storage.getLatestNegotiationMessage(deposit.id);
    if (latestMsg) {
      await storage.markNegotiationResponded(latestMsg.id);
    }

    // Create the new offer message
    const offerMsg = await storage.createNegotiationMessage({
      depositRequestId: deposit.id,
      messageType: 'ADMIN_OFFER',
      senderId: adminId,
      senderRole: 'admin',
      proposedGrams: parsed.data.proposedGrams.toString(),
      proposedPurity: parsed.data.proposedPurity,
      proposedFees: parsed.data.proposedFees?.toString(),
      goldPriceAtTime: parsed.data.goldPriceAtTime?.toString(),
      message: parsed.data.message,
      isLatest: true,
    });

    // Emit real-time notification
    emitNegotiationUpdate(deposit.userId, deposit.id, offerMsg);

    // Update deposit status and store offer details
    const depositUpdate: any = { 
      status: 'NEGOTIATION',
      // Store the latest offer on the deposit for easy access
      finalCreditedGrams: parsed.data.proposedGrams.toString(),
    };
    if (parsed.data.usdOffer) {
      depositUpdate.usdCounterFromAdmin = parsed.data.usdOffer.toString();
    }
    await storage.updatePhysicalDeposit(deposit.id, depositUpdate);

    // Send email notification about offer
    await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'NEGOTIATION');
    
    // Real-time WebSocket notification
    emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'NEGOTIATION', {
      proposedGrams: parsed.data.proposedGrams,
      proposedFees: parsed.data.proposedFees,
      usdOffer: parsed.data.usdOffer,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(500).json({ error: 'Failed to send offer' });
  }
});

// accept-counter route removed - simplified to one-way offer flow

const approveSchema = z.object({
  goldPriceUsd: z.number().positive(),
  vaultLocation: z.string().default('Wingold & Metals DMCC'),
  adminNotes: z.string().optional(),
});

router.post('/admin/deposits/:id/approve', requireAdmin(), async (req: Request, res: Response) => {
  let flowInstanceId: string | null = null;
  const flowType: FlowType = 'ADD_FUNDS';
  
  // Helper to safely complete flow on errors (non-blocking)
  const safeCompleteFlow = async (failed: boolean = false) => {
    if (flowInstanceId) {
      try {
        await workflowAuditService.completeFlow(flowInstanceId);
      } catch (e) {
        console.error('[WorkflowAudit] Failed to complete flow:', e);
      }
    }
  };
  
  try {
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // SECURITY: Prevent self-approval - admin cannot approve their own deposits
    if (adminId && deposit.userId === adminId) {
      return res.status(403).json({ 
        error: 'Self-approval not allowed. An admin cannot approve their own deposits.',
        code: 'SELF_APPROVAL_BLOCKED'
      });
    }

    // GOLDEN RULE ENFORCEMENT: Strict status validation
    // UFM Flow: Accept READY_FOR_PAYMENT status (preferred unified flow)
    // Legacy Flow: Accept INSPECTION (GOLD_BAR/COIN) or AGREED (RAW/OTHER) for backward compatibility
    const validStatuses = ['READY_FOR_PAYMENT', 'INSPECTION', 'AGREED'];
    
    if (!validStatuses.includes(deposit.status)) {
      return res.status(400).json({ 
        error: 'Deposit must complete inspection/negotiation before approval' 
      });
    }

    // For legacy flow (not through UFM), enforce stricter rules
    if (deposit.status === 'INSPECTION' && deposit.requiresNegotiation) {
      return res.status(400).json({ 
        error: 'RAW/OTHER deposits must complete negotiation before approval' 
      });
    }
    
    if (deposit.status === 'AGREED' && !deposit.requiresNegotiation) {
      return res.status(400).json({ 
        error: 'Unexpected AGREED status for GOLD_BAR/COIN deposit' 
      });
    }

    // GOLDEN RULE: Inspection record with verified grams > 0 is MANDATORY
    const inspection = await storage.getDepositInspection(deposit.id);
    if (!inspection) {
      return res.status(400).json({ 
        error: 'Golden Rule violation: Inspection record is required before approval' 
      });
    }

    const inspectedGrams = parseFloat(inspection.creditedGrams || '0');
    if (inspectedGrams <= 0) {
      return res.status(400).json({ 
        error: 'Golden Rule violation: Inspection must verify positive gold grams (physicalGoldAllocatedG > 0)' 
      });
    }

    // Determine credited grams based on workflow path
    let creditedGrams: number;

    if (deposit.status === 'AGREED') {
      // RAW/OTHER items: Verify negotiation completed and use inspection as source of truth
      const latestNegotiation = await storage.getLatestNegotiationMessage(deposit.id);
      // Accepted negotiation types: USER_ACCEPT (user accepted admin offer) or ADMIN_ACCEPT (admin accepted user counter)
      const isAccepted = latestNegotiation?.messageType === 'USER_ACCEPT' || latestNegotiation?.messageType === 'ADMIN_ACCEPT';
      if (!isAccepted) {
        return res.status(400).json({ error: 'No accepted negotiation found' });
      }
      
      // Golden Rule: Always use inspection-verified grams as authoritative source
      // The negotiated amount must align with inspection for transparency
      const negotiatedGrams = latestNegotiation?.proposedGrams ? parseFloat(latestNegotiation.proposedGrams) : 0;
      if (Math.abs(negotiatedGrams - inspectedGrams) > 0.01) {
        console.log(`[Deposit Approve] Warning: Negotiated grams (${negotiatedGrams}) differ from inspected grams (${inspectedGrams})`);
      }
      
      // CRITICAL: Credited grams ALWAYS come from inspection (physicalGoldAllocatedG)
      creditedGrams = inspectedGrams;
    } else {
      // GOLD_BAR/GOLD_COIN: Use inspection-verified amount
      creditedGrams = inspectedGrams;
    }

    if (creditedGrams <= 0) {
      return res.status(400).json({ error: 'Invalid credited grams' });
    }

    // Start workflow audit tracking after all validation passes (non-blocking)
    try {
      flowInstanceId = await workflowAuditService.startFlow(flowType, deposit.userId, {
        depositId: deposit.id,
        referenceNumber: deposit.referenceNumber,
        adminId,
      });
      
      // Record admin approval step
      await workflowAuditService.recordStep(
        flowInstanceId, flowType, 'admin_approval_received',
        'PASS',
        { adminId, depositId: deposit.id, creditedGrams },
        { userId: deposit.userId, depositRequestId: deposit.id }
      );

      // Record gold acquisition confirmed step (physical gold inspection verified)
      await workflowAuditService.recordStep(
        flowInstanceId, flowType, 'gold_acquisition_confirmed',
        'PASS',
        { inspectedGrams, creditedGrams },
        { userId: deposit.userId, depositRequestId: deposit.id }
      );
    } catch (e) {
      console.error('[WorkflowAudit] Failed to log initial steps:', e);
    }

    const { goldPriceUsd, vaultLocation, adminNotes } = parsed.data;

    const physicalCertNumber = await storage.generateCertificateNumber('Physical Storage');
    const physicalCert = await storage.createCertificate({
      userId: deposit.userId,
      type: 'Physical Storage',
      certificateNumber: physicalCertNumber,
      goldGrams: creditedGrams.toFixed(6),
      status: 'Active',
      vaultLocation,
      issuer: 'Wingold & Metals DMCC',
    });

    const digitalCertNumber = await storage.generateCertificateNumber('Digital Ownership');
    const digitalCert = await storage.createCertificate({
      userId: deposit.userId,
      type: 'Digital Ownership',
      certificateNumber: digitalCertNumber,
      goldGrams: creditedGrams.toFixed(6),
      status: 'Active',
      vaultLocation,
      issuer: 'Finatrades FZE',
      relatedCertificateId: physicalCert.id,
    });

    const wallet = await storage.getWallet(deposit.userId);
    if (!wallet) {
      return res.status(400).json({ error: 'User wallet not found' });
    }

    const currentGrams = parseFloat(wallet.goldGrams || '0');
    const newGrams = currentGrams + creditedGrams;

    await storage.updateWallet(wallet.id, {
      goldGrams: newGrams.toFixed(6),
    });

    // Record ledger credit step (non-blocking)
    if (flowInstanceId) {
      try {
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'ledger_posted_credit_to_LGPW',
          'PASS',
          { creditedGrams, previousBalance: currentGrams, newBalance: newGrams, walletType: 'LGPW' },
          { userId: deposit.userId, walletCredited: 'LGPW' }
        );

        // Record balance update step
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'balances_updated_from_ledger',
          'PASS',
          { creditedGrams, newBalance: newGrams },
          { userId: deposit.userId }
        );
      } catch (e) {
        console.error('[WorkflowAudit] Failed to log ledger steps:', e);
      }
    }

    // NOTE: Transaction creation removed - UTT is the single source of truth
    // User transaction history is derived from unified_tally_transactions

    // Create vault holding record for the physical gold
    const vaultHolding = await storage.createVaultHolding({
      userId: deposit.userId,
      goldGrams: creditedGrams.toFixed(6),
      vaultLocation: vaultLocation,
      wingoldStorageRef: deposit.referenceNumber,
      storageFeesAnnualPercent: '0.5',
      purchasePriceUsdPerGram: goldPriceUsd.toFixed(2),
      isPhysicallyDeposited: true,
    });

    // Get user info for UTT entry
    const user = await storage.getUser(deposit.userId);

    // Create UTT (Unified Tally Tracker) entry for admin visibility in UFM
    const uttEntry = await storage.createUnifiedTallyTransaction({
      userId: deposit.userId,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined,
      userEmail: user?.email,
      txnType: 'VAULT_GOLD_DEPOSIT',
      sourceMethod: 'VAULT_GOLD',
      walletType: 'LGPW',
      status: 'CREDITED',
      depositCurrency: 'USD',
      depositAmount: (creditedGrams * goldPriceUsd).toFixed(2),
      feeAmount: '0',
      netAmount: (creditedGrams * goldPriceUsd).toFixed(2),
      paymentReference: deposit.referenceNumber,
      paymentConfirmedAt: new Date(),
      pricingMode: 'MARKET',
      goldRateValue: goldPriceUsd.toFixed(4),
      rateTimestamp: new Date(),
      goldEquivalentG: creditedGrams.toFixed(6),
      goldCreditedG: creditedGrams.toFixed(6),
      goldCreditedValueUsd: (creditedGrams * goldPriceUsd).toFixed(2),
      vaultGoldDepositedG: creditedGrams.toFixed(6),
      vaultDepositCertificateId: physicalCert.id,
      vaultDepositVerifiedBy: adminId,
      vaultDepositVerifiedAt: new Date(),
      physicalGoldAllocatedG: creditedGrams.toFixed(6),
      wingoldBuyRate: goldPriceUsd.toFixed(4),
      wingoldCostUsd: (creditedGrams * goldPriceUsd).toFixed(2),
      vaultLocation: vaultLocation,
      storageCertificateId: physicalCert.id,
      certificateDate: new Date(),
      approvedBy: adminId,
      approvedAt: new Date(),
      notes: `Physical gold deposit approved: ${deposit.referenceNumber}`,
    });

    await storage.updatePhysicalDeposit(deposit.id, {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: adminId,
      finalCreditedGrams: creditedGrams.toFixed(6),
      goldPriceAtApproval: goldPriceUsd.toFixed(2),
      physicalStorageCertificateId: physicalCert.id,
      digitalOwnershipCertificateId: digitalCert.id,
      walletTransactionId: uttEntry.id,
      adminNotes: adminNotes ? `${deposit.adminNotes || ''}\n${new Date().toISOString()}: ${adminNotes}`.trim() : deposit.adminNotes,
    });

    // Record certificate creation step (non-blocking)
    if (flowInstanceId) {
      try {
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'certificate_created',
          'PASS',
          { physicalCertId: physicalCert.id, digitalCertId: digitalCert.id },
          { userId: deposit.userId, certificateId: digitalCert.id }
        );
      } catch (e) {
        console.error('[WorkflowAudit] Failed to log certificate step:', e);
      }
    }

    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: adminId,
      actorRole: 'admin',
      actionType: 'PHYSICAL_DEPOSIT_APPROVED',
      details: JSON.stringify({
        creditedGrams,
        goldPriceUsd,
        physicalCertId: physicalCert.id,
        digitalCertId: digitalCert.id,
        uttEntryId: uttEntry.id,
        vaultHoldingId: vaultHolding.id,
      }),
    });

    // Send approval email notification
    await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'APPROVED', { creditedGrams });
    
    // Record notification step and complete flow (non-blocking)
    if (flowInstanceId) {
      try {
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'notify_user_success',
          'PASS',
          { notificationType: 'email_and_websocket' },
          { userId: deposit.userId }
        );
        
        // Complete the workflow audit flow
        await workflowAuditService.completeFlow(flowInstanceId, uttEntry.id);
      } catch (e) {
        console.error('[WorkflowAudit] Failed to complete flow:', e);
      }
    }
    
    // Real-time WebSocket notification with balance update
    emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'APPROVED', {
      creditedGrams,
      message: `${creditedGrams.toFixed(4)}g gold credited to your wallet`,
    });

    res.json({
      success: true,
      creditedGrams,
      physicalCertificateId: physicalCert.id,
      physicalCertificateNumber: physicalCert.certificateNumber,
      digitalCertificateId: digitalCert.id,
      digitalCertificateNumber: digitalCert.certificateNumber,
      uttEntryId: uttEntry.id,
      vaultHoldingId: vaultHolding.id,
    });
  } catch (error) {
    console.error('Error approving deposit:', error);
    // Clean up workflow audit if flow was started
    await safeCompleteFlow(true);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

// Endpoint to send deposit to UFM for final approval (after vault inspection/negotiation)
router.post('/admin/deposits/:id/send-to-ufm', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Validate status - must be INSPECTION (GOLD_BAR/COIN) or AGREED (RAW/OTHER)
    if (deposit.requiresNegotiation && deposit.status !== 'AGREED') {
      return res.status(400).json({ 
        error: 'RAW/OTHER deposits must complete negotiation (AGREED status) before sending to UFM' 
      });
    }

    if (!deposit.requiresNegotiation && deposit.status !== 'INSPECTION') {
      return res.status(400).json({ 
        error: 'Verified gold deposits must complete inspection before sending to UFM' 
      });
    }

    // Verify inspection exists with valid credited grams
    const inspection = await storage.getDepositInspection(deposit.id);
    if (!inspection) {
      return res.status(400).json({ error: 'Inspection record required before sending to UFM' });
    }

    const creditedGrams = parseFloat(inspection.creditedGrams || '0');
    if (creditedGrams <= 0) {
      return res.status(400).json({ error: 'Inspection must have positive credited grams' });
    }

    // Update status to READY_FOR_PAYMENT
    await storage.updatePhysicalDeposit(deposit.id, {
      status: 'READY_FOR_PAYMENT',
    });

    // Create audit log
    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: adminId,
      actorRole: 'admin',
      actionType: 'PHYSICAL_DEPOSIT_SENT_TO_UFM',
      details: JSON.stringify({ creditedGrams, previousStatus: deposit.status }),
    });

    // Send notification to user
    await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'READY_FOR_PAYMENT');
    
    // Real-time WebSocket notification
    emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'READY_FOR_PAYMENT', {
      creditedGrams,
      message: 'Your deposit is ready for final processing',
    });

    res.json({ success: true, creditedGrams });
  } catch (error) {
    console.error('Error sending deposit to UFM:', error);
    res.status(500).json({ error: 'Failed to send to UFM' });
  }
});

const rejectSchema = z.object({
  reason: z.string().min(1),
});

router.post('/admin/deposits/:id/reject', requireAdmin(), async (req: Request, res: Response) => {
  try {

    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const adminId = (req as any).session.userId;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    await storage.updatePhysicalDeposit(deposit.id, {
      status: 'REJECTED',
      rejectionReason: parsed.data.reason,
    });

    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: adminId,
      actorRole: 'admin',
      actionType: 'PHYSICAL_DEPOSIT_REJECTED',
      details: JSON.stringify({ reason: parsed.data.reason }),
    });

    // Send rejection email notification
    await sendPhysicalDepositStatusEmail(deposit.userId, deposit.referenceNumber, 'REJECTED', { reason: parsed.data.reason });
    
    // Real-time WebSocket notification
    emitPhysicalDepositUpdate(deposit.userId, deposit.id, deposit.referenceNumber, 'REJECTED', {
      reason: parsed.data.reason,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting deposit:', error);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

export default router;
