import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { z } from 'zod';
import type { InsertPhysicalDepositRequest, InsertDepositItem, InsertDepositInspection, InsertDepositNegotiationMessage } from '@shared/schema';

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
  acceptInsurance: z.boolean(),
  acceptFees: z.boolean(),
});

router.post('/deposits', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = createDepositSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const data = parsed.data;
    const userId = (req.user as any).id;

    if (!data.noLienDispute || !data.acceptVaultTerms || !data.acceptInsurance || !data.acceptFees) {
      return res.status(400).json({ error: 'All declarations must be accepted' });
    }

    const requiresNegotiation = data.depositType === 'RAW' || data.depositType === 'OTHER';

    const totalWeight = data.items.reduce((sum, item) => sum + parseFloat(item.totalDeclaredWeightGrams), 0);

    const referenceNumber = await storage.generatePhysicalDepositReference();

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
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (req.user as any).id;
    const deposits = await storage.getUserPhysicalDeposits(userId);

    const depositsWithItems = await Promise.all(deposits.map(async (deposit) => {
      const items = await storage.getDepositItems(deposit.id);
      return { ...deposit, items };
    }));

    res.json({ deposits: depositsWithItems });
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

router.get('/deposits/:id', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (req.user as any).id;
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

const userResponseSchema = z.object({
  action: z.enum(['ACCEPT', 'COUNTER', 'REJECT']),
  counterGrams: z.number().optional(),
  counterFees: z.number().optional(),
  message: z.string().optional(),
});

router.post('/deposits/:id/respond', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = userResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const userId = (req.user as any).id;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit || deposit.userId !== userId) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'NEGOTIATION') {
      return res.status(400).json({ error: 'Deposit is not in negotiation status' });
    }

    const latestMsg = await storage.getLatestNegotiationMessage(deposit.id);
    if (latestMsg && latestMsg.senderRole === 'user') {
      return res.status(400).json({ error: 'Waiting for admin response' });
    }

    const { action, counterGrams, counterFees, message } = parsed.data;

    let messageType: string;
    let newStatus: string | undefined;
    let finalGrams: string | undefined;
    let finalFees: string | undefined;

    switch (action) {
      case 'ACCEPT':
        messageType = 'USER_ACCEPT';
        newStatus = 'AGREED';
        // When accepting, carry forward the admin's offer values
        if (latestMsg?.messageType === 'ADMIN_OFFER') {
          finalGrams = latestMsg.proposedGrams || undefined;
          finalFees = latestMsg.proposedFees || undefined;
        }
        break;
      case 'COUNTER':
        messageType = 'USER_COUNTER';
        finalGrams = counterGrams?.toString();
        finalFees = counterFees?.toString();
        break;
      case 'REJECT':
        messageType = 'USER_REJECT';
        newStatus = 'CANCELLED';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    await storage.createNegotiationMessage({
      depositRequestId: deposit.id,
      messageType,
      senderId: userId,
      senderRole: 'user',
      proposedGrams: finalGrams,
      proposedFees: finalFees,
      message,
      isLatest: true,
    });

    if (latestMsg) {
      await storage.markNegotiationResponded(latestMsg.id);
    }

    if (newStatus) {
      await storage.updatePhysicalDeposit(deposit.id, { status: newStatus as any });
    }

    await storage.createAuditLog({
      entityType: 'physical_deposit',
      entityId: deposit.id,
      actor: userId,
      actorRole: 'user',
      actionType: `PHYSICAL_DEPOSIT_${messageType}`,
      details: JSON.stringify({ action, counterGrams, counterFees, message }),
    });

    res.json({ success: true, newStatus: newStatus || deposit.status });
  } catch (error) {
    console.error('Error responding to offer:', error);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

router.post('/deposits/:id/cancel', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (req.user as any).id;
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

const isAdmin = (req: Request): boolean => {
  return req.isAuthenticated() && (req.user as any)?.role === 'admin';
};

router.get('/admin/deposits', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const status = req.query.status as string | undefined;
    const deposits = await storage.getAllPhysicalDeposits(status ? { status } : undefined);

    const depositsWithDetails = await Promise.all(deposits.map(async (deposit) => {
      const items = await storage.getDepositItems(deposit.id);
      const user = await storage.getUser(deposit.userId);
      return { 
        ...deposit, 
        items,
        user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null
      };
    }));

    res.json({ deposits: depositsWithDetails });
  } catch (error) {
    console.error('Error fetching admin deposits:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

router.get('/admin/deposits/stats', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const stats = await storage.getPhysicalDepositStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/admin/deposits/:id', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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

router.post('/admin/deposits/:id/review', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const adminId = (req.user as any).id;
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

router.post('/admin/deposits/:id/receive', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = receiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const adminId = (req.user as any).id;
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

router.post('/admin/deposits/:id/inspect', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = inspectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const adminId = (req.user as any).id;
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

    res.json({ success: true, inspectionId: inspection.id, newStatus });
  } catch (error) {
    console.error('Error inspecting deposit:', error);
    res.status(500).json({ error: 'Failed to inspect' });
  }
});

const offerSchema = z.object({
  proposedGrams: z.number(),
  proposedPurity: z.string().optional(),
  proposedFees: z.number().optional(),
  goldPriceAtTime: z.number().optional(),
  message: z.string().optional(),
});

router.post('/admin/deposits/:id/offer', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = offerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const adminId = (req.user as any).id;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (!['INSPECTION', 'NEGOTIATION'].includes(deposit.status)) {
      return res.status(400).json({ error: 'Invalid status for offer' });
    }

    const latestMsg = await storage.getLatestNegotiationMessage(deposit.id);
    if (latestMsg && latestMsg.senderRole === 'admin') {
      return res.status(400).json({ error: 'Waiting for user response' });
    }

    await storage.createNegotiationMessage({
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

    if (latestMsg) {
      await storage.markNegotiationResponded(latestMsg.id);
    }

    if (deposit.status !== 'NEGOTIATION') {
      await storage.updatePhysicalDeposit(deposit.id, { status: 'NEGOTIATION' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(500).json({ error: 'Failed to send offer' });
  }
});

router.post('/admin/deposits/:id/accept-counter', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const adminId = (req.user as any).id;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'NEGOTIATION') {
      return res.status(400).json({ error: 'Deposit not in negotiation' });
    }

    const latestMsg = await storage.getLatestNegotiationMessage(deposit.id);
    if (!latestMsg || latestMsg.messageType !== 'USER_COUNTER') {
      return res.status(400).json({ error: 'No counter-offer to accept' });
    }

    await storage.createNegotiationMessage({
      depositRequestId: deposit.id,
      messageType: 'ADMIN_ACCEPT',
      senderId: adminId,
      senderRole: 'admin',
      proposedGrams: latestMsg.proposedGrams,
      proposedFees: latestMsg.proposedFees,
      message: req.body.message,
      isLatest: true,
    });

    await storage.markNegotiationResponded(latestMsg.id);

    await storage.updatePhysicalDeposit(deposit.id, { 
      status: 'AGREED',
      finalCreditedGrams: latestMsg.proposedGrams,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting counter:', error);
    res.status(500).json({ error: 'Failed to accept' });
  }
});

const approveSchema = z.object({
  goldPriceUsd: z.number().positive(),
  vaultLocation: z.string().default('Wingold & Metals DMCC'),
  adminNotes: z.string().optional(),
});

router.post('/admin/deposits/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const adminId = (req.user as any).id;
    const deposit = await storage.getPhysicalDepositById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // GOLDEN RULE ENFORCEMENT: Strict status validation based on deposit type
    // RAW/OTHER items MUST go through negotiation (reach AGREED status)
    // GOLD_BAR/GOLD_COIN can be approved after inspection
    if (deposit.requiresNegotiation && deposit.status !== 'AGREED') {
      return res.status(400).json({ 
        error: 'RAW/OTHER deposits must complete negotiation (AGREED status) before approval' 
      });
    }

    if (!deposit.requiresNegotiation && deposit.status !== 'INSPECTION') {
      return res.status(400).json({ 
        error: 'Verified gold deposits must complete inspection before approval' 
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

    const transaction = await storage.createTransaction({
      userId: deposit.userId,
      type: 'Deposit',
      amountGold: creditedGrams.toFixed(6),
      amountUsd: (creditedGrams * goldPriceUsd).toFixed(2),
      goldPriceUsdPerGram: goldPriceUsd.toFixed(2),
      status: 'Completed',
      description: `Physical gold deposit - ${deposit.referenceNumber}`,
      goldWalletType: 'MPGW',
      sourceModule: 'finavault',
    });

    await storage.updatePhysicalDeposit(deposit.id, {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: adminId,
      finalCreditedGrams: creditedGrams.toFixed(6),
      goldPriceAtApproval: goldPriceUsd.toFixed(2),
      physicalStorageCertificateId: physicalCert.id,
      digitalOwnershipCertificateId: digitalCert.id,
      walletTransactionId: transaction.id,
      adminNotes: adminNotes ? `${deposit.adminNotes || ''}\n${new Date().toISOString()}: ${adminNotes}`.trim() : deposit.adminNotes,
    });

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
        transactionId: transaction.id,
      }),
    });

    res.json({
      success: true,
      creditedGrams,
      physicalCertificateId: physicalCert.id,
      physicalCertificateNumber: physicalCert.certificateNumber,
      digitalCertificateId: digitalCert.id,
      digitalCertificateNumber: digitalCert.certificateNumber,
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error('Error approving deposit:', error);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

const rejectSchema = z.object({
  reason: z.string().min(1),
});

router.post('/admin/deposits/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const adminId = (req.user as any).id;
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

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting deposit:', error);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

export default router;
