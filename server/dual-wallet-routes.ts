/**
 * Dual Wallet Routes - LGPW/FPGW API Endpoints
 * 
 * Provides endpoints for:
 * - Getting balance summary (LGPW + FPGW breakdown)
 * - Internal transfers between LGPW and FPGW
 * - Spend validation
 */

import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  vaultOwnershipSummary, 
  vaultLedgerEntries, 
  certificates,
  certificateEvents,
  transactions
} from "@shared/schema";
import { getBalanceSummary, validateSpend, validateInternalTransfer, type GoldWalletType } from "./spend-guard";
import { 
  createFpgwBatch, 
  consumeFpgwBatches, 
  transferFpgwBatches, 
  getFpgwBalanceSummary,
  updateFpgwOwnershipSummary
} from "./fpgw-batch-service";
import { getGoldPricePerGram } from "./gold-price-service";
import { emitLedgerEvent } from "./socket";
import { z } from "zod";
import crypto from "crypto";
import { workflowAuditService, type FlowType } from "./workflow-audit-service";

const router = Router();

// In-memory idempotency store for conversion requests
interface ConversionIdempotencyEntry {
  inProgress: boolean;
  result?: { status: number; body: unknown };
  timestamp: number;
}
const conversionIdempotencyStore = new Map<string, ConversionIdempotencyEntry>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of conversionIdempotencyStore.entries()) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL) {
      conversionIdempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Cleanup every hour

function conversionIdempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return next();
  }
  
  if (!/^[a-zA-Z0-9-_]{8,64}$/.test(idempotencyKey)) {
    return res.status(400).json({ error: 'Invalid idempotency key format' });
  }
  
  const userId = (req as any).session?.userId || 'anonymous';
  const compositeKey = `conversion:${userId}:${idempotencyKey}`;
  
  const existing = conversionIdempotencyStore.get(compositeKey);
  
  if (existing) {
    if (existing.result) {
      console.log(`[Conversion Idempotency] Returning cached response for key: ${idempotencyKey}`);
      return res.status(existing.result.status).json(existing.result.body);
    }
    if (existing.inProgress) {
      return res.status(409).json({ error: 'Conversion request already in progress. Please wait.' });
    }
  }
  
  // Mark as in progress
  conversionIdempotencyStore.set(compositeKey, { inProgress: true, timestamp: Date.now() });
  
  // Capture response
  const originalJson = res.json.bind(res);
  res.json = function(body: unknown) {
    conversionIdempotencyStore.set(compositeKey, { 
      inProgress: false, 
      result: { status: res.statusCode, body },
      timestamp: Date.now()
    });
    return originalJson(body);
  };
  
  // Handle errors
  res.on('close', () => {
    if (!res.writableEnded) {
      conversionIdempotencyStore.delete(compositeKey);
    }
  });
  
  next();
}

function ensureAuthenticated(req: Request, res: Response, next: any) {
  if (!(req as any).session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

router.get("/api/dual-wallet/:userId/balance", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const summary = await getBalanceSummary(userId);
    const goldPrice = await getGoldPricePerGram();
    
    res.json({
      ...summary,
      goldPricePerGram: goldPrice,
      mpgwValueUsd: summary.mpgw.totalGrams * goldPrice,
      fpgwValueUsd: summary.fpgw.totalGrams * summary.fpgw.weightedAvgPrice,
      totalValueUsd: (summary.mpgw.totalGrams * goldPrice) + (summary.fpgw.totalGrams * summary.fpgw.weightedAvgPrice)
    });
  } catch (error: any) {
    console.error('Dual wallet balance error:', error);
    res.status(500).json({ error: error.message || "Failed to get balance" });
  }
});

router.get("/api/dual-wallet/:userId/fpgw-batches", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const fpgwSummary = await getFpgwBalanceSummary(userId);
    
    res.json({ batches: fpgwSummary.batches });
  } catch (error: any) {
    console.error('FPGW batches error:', error);
    res.status(500).json({ error: error.message || "Failed to get batches" });
  }
});

router.post("/api/dual-wallet/validate-spend", ensureAuthenticated, async (req, res) => {
  try {
    const { userId, goldGrams, walletType } = req.body;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await validateSpend(userId, parseFloat(goldGrams), walletType as GoldWalletType);
    
    res.json(result);
  } catch (error: any) {
    console.error('Validate spend error:', error);
    res.status(500).json({ error: error.message || "Failed to validate" });
  }
});

const internalTransferSchema = z.object({
  userId: z.string(),
  goldGrams: z.string().or(z.number()).transform(v => parseFloat(String(v))),
  fromWalletType: z.enum(['LGPW', 'FPGW']),
  toWalletType: z.enum(['LGPW', 'FPGW']),
  notes: z.string().optional()
});

router.post("/api/dual-wallet/transfer", ensureAuthenticated, conversionIdempotencyMiddleware, async (req, res) => {
  try {
    const parsed = internalTransferSchema.parse(req.body);
    const { userId, goldGrams, fromWalletType, toWalletType, notes } = parsed;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const flowType: FlowType = fromWalletType === 'LGPW' 
      ? 'INTERNAL_TRANSFER_LGPW_TO_FPGW' 
      : 'INTERNAL_TRANSFER_FPGW_TO_LGPW';
    const flowInstanceId = await workflowAuditService.startFlow(flowType, userId, {
      goldGrams,
      fromWalletType,
      toWalletType,
    });

    const validateStepKey = fromWalletType === 'LGPW' 
      ? 'validate_user_balance_mpgw' 
      : 'validate_user_balance_fpgw';
    
    const validation = await validateInternalTransfer(userId, goldGrams, fromWalletType, toWalletType);
    
    await workflowAuditService.recordStep(
      flowInstanceId, flowType, validateStepKey,
      validation.valid ? 'PASS' : 'FAIL',
      { availableGrams: validation.availableGrams, requestedGrams: goldGrams },
      { userId }
    );
    
    if (!validation.valid) {
      await workflowAuditService.completeFlow(flowInstanceId);
      return res.status(400).json({ error: validation.error });
    }

    const currentGoldPrice = await getGoldPricePerGram();
    const now = new Date();
    let generatedTxId: string = '';
    
    const preTransferBalance = await getBalanceSummary(userId);

    await db.transaction(async (tx) => {
      if (fromWalletType === 'LGPW' && toWalletType === 'FPGW') {
        const [insertedTx] = await tx.insert(transactions).values({
          userId,
          type: 'Swap',
          status: 'Completed',
          amountGold: goldGrams.toFixed(6),
          amountUsd: (goldGrams * currentGoldPrice).toFixed(2),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          goldWalletType: 'LGPW',
          description: `LGPW to FPGW conversion: ${goldGrams.toFixed(6)}g at $${currentGoldPrice.toFixed(2)}/g`,
          sourceModule: 'dual-wallet',
          createdAt: now
        }).returning({ id: transactions.id });
        
        const actualTxId = insertedTx.id;
        generatedTxId = actualTxId;
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'create_pending_txn',
          'PASS',
          { transactionId: actualTxId, goldGrams },
          { userId, transactionId: actualTxId }
        );
        
        await tx
          .update(vaultOwnershipSummary)
          .set({
            mpgwAvailableGrams: sql`${vaultOwnershipSummary.mpgwAvailableGrams} - ${goldGrams}`,
            fpgwAvailableGrams: sql`${vaultOwnershipSummary.fpgwAvailableGrams} + ${goldGrams}`,
            lastUpdated: now
          })
          .where(eq(vaultOwnershipSummary.userId, userId));

        await createFpgwBatch({
          userId,
          goldGrams,
          lockedPriceUsd: currentGoldPrice,
          sourceType: 'conversion',
          sourceTransactionId: actualTxId,
          notes: notes || `LGPW to FPGW conversion at $${currentGoldPrice.toFixed(2)}/g`
        });
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'fpgw_batch_created',
          'PASS',
          { goldGrams, lockedPriceUsd: currentGoldPrice },
          { userId, transactionId: actualTxId }
        );

        const [ledgerEntry] = await tx.insert(vaultLedgerEntries).values({
          userId,
          action: 'LGPW_To_FPGW',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          valueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          fromGoldWalletType: 'LGPW',
          toGoldWalletType: 'FPGW',
          balanceAfterGrams: (preTransferBalance.total.totalGrams).toFixed(6),
          transactionId: actualTxId,
          notes: `LGPW → FPGW: Debit ${goldGrams.toFixed(6)}g from LGPW, Credit ${goldGrams.toFixed(6)}g to FPGW`
        }).returning({ id: vaultLedgerEntries.id });
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'ledger_post_reclass_mpgw_to_fpgw',
          'PASS',
          { ledgerEntryId: ledgerEntry.id },
          { userId, transactionId: actualTxId, ledgerEntryId: ledgerEntry.id }
        );
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'balances_updated',
          'PASS',
          { newMpgwGrams: preTransferBalance.mpgw.availableGrams - goldGrams, newFpgwGrams: preTransferBalance.fpgw.availableGrams + goldGrams },
          { userId, transactionId: actualTxId }
        );

        const certNumber = `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const [cert] = await tx.insert(certificates).values({
          certificateNumber: certNumber,
          userId,
          type: 'Conversion',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          totalValueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          issuer: 'Wingold Metals DMCC',
          fromGoldWalletType: 'LGPW',
          toGoldWalletType: 'FPGW',
          conversionPriceUsd: currentGoldPrice.toFixed(2),
          status: 'Active',
          transactionId: actualTxId,
          issuedAt: now
        }).returning({ id: certificates.id });
        
        // Find existing LGPW Digital Ownership certificates to reduce remaining grams (FIFO - oldest first)
        const mpgwCerts = await tx.select()
          .from(certificates)
          .where(and(
            eq(certificates.userId, userId),
            eq(certificates.type, 'Digital Ownership'),
            eq(certificates.status, 'Active'),
            sql`(${certificates.goldWalletType} = 'LGPW' OR ${certificates.goldWalletType} IS NULL)`
          ))
          .orderBy(certificates.issuedAt);
        
        let remainingToDeduct = goldGrams;
        let parentCertId: string | null = null;
        
        // Reduce remaining grams from existing certificates (FIFO order)
        for (const mpgwCert of mpgwCerts) {
          if (remainingToDeduct <= 0) break;
          
          const currentRemaining = parseFloat(mpgwCert.remainingGrams || mpgwCert.goldGrams);
          if (currentRemaining <= 0) continue;
          
          const deductAmount = Math.min(remainingToDeduct, currentRemaining);
          const newRemaining = currentRemaining - deductAmount;
          
          // Update the certificate's remaining grams
          await tx.update(certificates)
            .set({ remainingGrams: newRemaining.toFixed(6) })
            .where(eq(certificates.id, mpgwCert.id));
          
          // Create partial surrender event
          await tx.insert(certificateEvents).values({
            certificateId: mpgwCert.id,
            eventType: 'PARTIAL_SURRENDER',
            gramsAffected: deductAmount.toFixed(6),
            gramsBefore: currentRemaining.toFixed(6),
            gramsAfter: newRemaining.toFixed(6),
            transactionId: actualTxId,
            notes: `${deductAmount.toFixed(6)}g converted from LGPW to FPGW at $${currentGoldPrice.toFixed(2)}/g`
          });
          
          if (!parentCertId) parentCertId = mpgwCert.id;
          remainingToDeduct -= deductAmount;
        }
        
        // Generate Digital Ownership Certificate for the FPGW lock
        const digitalCertNumber = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const [newFpgwCert] = await tx.insert(certificates).values({
          certificateNumber: digitalCertNumber,
          userId,
          type: 'Digital Ownership',
          goldGrams: goldGrams.toFixed(6),
          remainingGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          totalValueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          issuer: 'Wingold Metals DMCC',
          goldWalletType: 'FPGW',
          parentCertificateId: parentCertId,
          status: 'Active',
          transactionId: actualTxId,
          issuedAt: now
        } as any).returning({ id: certificates.id });
        
        // Update the partial surrender event with child certificate ID
        if (parentCertId && newFpgwCert) {
          await tx.update(certificateEvents)
            .set({ childCertificateId: newFpgwCert.id })
            .where(and(
              eq(certificateEvents.transactionId, actualTxId),
              eq(certificateEvents.eventType, 'PARTIAL_SURRENDER')
            ));
        }
        
        // Find Physical Storage certificates to create WALLET_RECLASSIFICATION events
        // Physical Storage certs remain unchanged (goldWalletType=LGPW) but we record the reclassification
        const physicalStorageCerts = await tx.select()
          .from(certificates)
          .where(and(
            eq(certificates.userId, userId),
            eq(certificates.type, 'Physical Storage'),
            eq(certificates.status, 'Active')
          ))
          .orderBy(certificates.issuedAt);
        
        // Create WALLET_RECLASSIFICATION events for Physical Storage certificates (FIFO)
        let physicalReclassRemaining = goldGrams;
        for (const psCert of physicalStorageCerts) {
          if (physicalReclassRemaining <= 0) break;
          
          const psGrams = parseFloat(psCert.goldGrams);
          const reclassAmount = Math.min(physicalReclassRemaining, psGrams);
          
          await tx.insert(certificateEvents).values({
            certificateId: psCert.id,
            eventType: 'WALLET_RECLASSIFICATION',
            gramsAffected: reclassAmount.toFixed(6),
            gramsBefore: psGrams.toFixed(6),
            gramsAfter: psGrams.toFixed(6), // Physical storage unchanged
            transactionId: actualTxId,
            childCertificateId: newFpgwCert?.id,
            notes: `Physical storage backing reclassified: LGPW → FPGW (${reclassAmount.toFixed(6)}g at $${currentGoldPrice.toFixed(2)}/g, locked rate)`
          });
          
          physicalReclassRemaining -= reclassAmount;
        }
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'certificate_issued',
          'PASS',
          { conversionCertNumber: certNumber, digitalOwnershipCertNumber: digitalCertNumber, parentCertId, physicalReclassCount: physicalStorageCerts.length },
          { userId, transactionId: actualTxId, certificateId: cert.id }
        );

      } else if (fromWalletType === 'FPGW' && toWalletType === 'LGPW') {
        const consumption = await consumeFpgwBatches(userId, goldGrams, 'Available');
        
        if (!consumption.success) {
          throw new Error(consumption.error || 'FPGW consumption failed');
        }
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'fpgw_batches_consumed',
          'PASS',
          { totalGramsConsumed: consumption.totalGramsConsumed, batchesConsumed: (consumption as any).batchesConsumed?.length || 0 },
          { userId }
        );

        await tx
          .update(vaultOwnershipSummary)
          .set({
            mpgwAvailableGrams: sql`${vaultOwnershipSummary.mpgwAvailableGrams} + ${goldGrams}`,
            fpgwAvailableGrams: sql`${vaultOwnershipSummary.fpgwAvailableGrams} - ${goldGrams}`,
            lastUpdated: now
          })
          .where(eq(vaultOwnershipSummary.userId, userId));

        const avgPrice = consumption.totalGramsConsumed > 0 
          ? consumption.weightedValueUsd / consumption.totalGramsConsumed 
          : currentGoldPrice;
        
        const [insertedTxFpgw] = await tx.insert(transactions).values({
          userId,
          type: 'Swap',
          status: 'Completed',
          amountGold: goldGrams.toFixed(6),
          amountUsd: consumption.weightedValueUsd.toFixed(2),
          goldPriceUsdPerGram: avgPrice.toFixed(2),
          goldWalletType: 'FPGW',
          description: `FPGW to LGPW conversion: ${goldGrams.toFixed(6)}g (cost basis: $${avgPrice.toFixed(2)}/g)`,
          sourceModule: 'dual-wallet',
          createdAt: now
        }).returning({ id: transactions.id });
        
        const actualTxIdFpgw = insertedTxFpgw.id;
        generatedTxId = actualTxIdFpgw;
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'create_pending_txn',
          'PASS',
          { transactionId: actualTxIdFpgw, goldGrams },
          { userId, transactionId: actualTxIdFpgw }
        );
        
        const [ledgerEntryFpgw] = await tx.insert(vaultLedgerEntries).values({
          userId,
          action: 'FPGW_To_LGPW',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: avgPrice.toFixed(2),
          valueUsd: consumption.weightedValueUsd.toFixed(2),
          fromGoldWalletType: 'FPGW',
          toGoldWalletType: 'LGPW',
          balanceAfterGrams: (preTransferBalance.total.totalGrams).toFixed(6),
          transactionId: actualTxIdFpgw,
          notes: `Converted ${goldGrams.toFixed(6)}g from FPGW to LGPW (FPGW cost: $${consumption.weightedValueUsd.toFixed(2)}, market value: $${(goldGrams * currentGoldPrice).toFixed(2)})`
        }).returning({ id: vaultLedgerEntries.id });
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'ledger_post_reclass_fpgw_to_mpgw',
          'PASS',
          { ledgerEntryId: ledgerEntryFpgw.id },
          { userId, transactionId: actualTxIdFpgw, ledgerEntryId: ledgerEntryFpgw.id }
        );
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'balances_updated',
          'PASS',
          { newMpgwGrams: preTransferBalance.mpgw.availableGrams + goldGrams, newFpgwGrams: preTransferBalance.fpgw.availableGrams - goldGrams },
          { userId, transactionId: actualTxIdFpgw }
        );

        const certNumberFpgw = `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const [certFpgw] = await tx.insert(certificates).values({
          certificateNumber: certNumberFpgw,
          userId,
          type: 'Conversion',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          totalValueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          issuer: 'Wingold Metals DMCC',
          fromGoldWalletType: 'FPGW',
          toGoldWalletType: 'LGPW',
          conversionPriceUsd: avgPrice.toFixed(2),
          status: 'Active',
          transactionId: actualTxIdFpgw,
          issuedAt: now
        }).returning({ id: certificates.id });
        
        // Find existing FPGW Digital Ownership certificates to reduce remaining grams (FIFO - oldest first)
        const fpgwCerts = await tx.select()
          .from(certificates)
          .where(and(
            eq(certificates.userId, userId),
            eq(certificates.type, 'Digital Ownership'),
            eq(certificates.status, 'Active'),
            eq(certificates.goldWalletType, 'FPGW')
          ))
          .orderBy(certificates.issuedAt);
        
        let remainingToDeductFpgw = goldGrams;
        let parentCertIdFpgw: string | null = null;
        
        // Reduce remaining grams from existing FPGW certificates (FIFO order)
        for (const fpgwCert of fpgwCerts) {
          if (remainingToDeductFpgw <= 0) break;
          
          const currentRemainingFpgw = parseFloat(fpgwCert.remainingGrams || fpgwCert.goldGrams);
          if (currentRemainingFpgw <= 0) continue;
          
          const deductAmountFpgw = Math.min(remainingToDeductFpgw, currentRemainingFpgw);
          const newRemainingFpgw = currentRemainingFpgw - deductAmountFpgw;
          
          // Update the certificate's remaining grams
          await tx.update(certificates)
            .set({ remainingGrams: newRemainingFpgw.toFixed(6) })
            .where(eq(certificates.id, fpgwCert.id));
          
          // Create partial surrender event
          await tx.insert(certificateEvents).values({
            certificateId: fpgwCert.id,
            eventType: 'PARTIAL_SURRENDER',
            gramsAffected: deductAmountFpgw.toFixed(6),
            gramsBefore: currentRemainingFpgw.toFixed(6),
            gramsAfter: newRemainingFpgw.toFixed(6),
            transactionId: actualTxIdFpgw,
            notes: `${deductAmountFpgw.toFixed(6)}g converted from FPGW to LGPW (FPGW cost: $${avgPrice.toFixed(2)}/g, market: $${currentGoldPrice.toFixed(2)}/g)`
          });
          
          if (!parentCertIdFpgw) parentCertIdFpgw = fpgwCert.id;
          remainingToDeductFpgw -= deductAmountFpgw;
        }
        
        // Generate Digital Ownership Certificate for the LGPW unlock
        const digitalCertNumberMpgw = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const [newMpgwCert] = await tx.insert(certificates).values({
          certificateNumber: digitalCertNumberMpgw,
          userId,
          type: 'Digital Ownership',
          goldGrams: goldGrams.toFixed(6),
          remainingGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          totalValueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          issuer: 'Wingold Metals DMCC',
          goldWalletType: 'LGPW',
          parentCertificateId: parentCertIdFpgw,
          status: 'Active',
          transactionId: actualTxIdFpgw,
          issuedAt: now
        } as any).returning({ id: certificates.id });
        
        // Update the partial surrender event with child certificate ID
        if (parentCertIdFpgw && newMpgwCert) {
          await tx.update(certificateEvents)
            .set({ childCertificateId: newMpgwCert.id })
            .where(and(
              eq(certificateEvents.transactionId, actualTxIdFpgw),
              eq(certificateEvents.eventType, 'PARTIAL_SURRENDER')
            ));
        }
        
        // Find Physical Storage certificates to create WALLET_RECLASSIFICATION events (FPGW -> LGPW)
        const physicalStorageCertsFpgw = await tx.select()
          .from(certificates)
          .where(and(
            eq(certificates.userId, userId),
            eq(certificates.type, 'Physical Storage'),
            eq(certificates.status, 'Active')
          ))
          .orderBy(certificates.issuedAt);
        
        // Create WALLET_RECLASSIFICATION events for Physical Storage certificates (FIFO)
        let physicalReclassRemainingFpgw = goldGrams;
        for (const psCert of physicalStorageCertsFpgw) {
          if (physicalReclassRemainingFpgw <= 0) break;
          
          const psGrams = parseFloat(psCert.goldGrams);
          const reclassAmount = Math.min(physicalReclassRemainingFpgw, psGrams);
          
          await tx.insert(certificateEvents).values({
            certificateId: psCert.id,
            eventType: 'WALLET_RECLASSIFICATION',
            gramsAffected: reclassAmount.toFixed(6),
            gramsBefore: psGrams.toFixed(6),
            gramsAfter: psGrams.toFixed(6), // Physical storage unchanged
            transactionId: actualTxIdFpgw,
            childCertificateId: newMpgwCert?.id,
            notes: `Physical storage backing reclassified: FPGW → LGPW (${reclassAmount.toFixed(6)}g unlocked to market price)`
          });
          
          physicalReclassRemainingFpgw -= reclassAmount;
        }
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'certificate_issued',
          'PASS',
          { certificateNumber: certNumberFpgw, digitalOwnershipCertNumber: digitalCertNumberMpgw, parentCertId: parentCertIdFpgw, physicalReclassCount: physicalStorageCertsFpgw.length },
          { userId, transactionId: actualTxIdFpgw, certificateId: certFpgw.id }
        );
      }
    });

    emitLedgerEvent(userId, {
      type: 'balance_update',
      module: 'finapay',
      action: `${fromWalletType}_to_${toWalletType}`,
      data: { goldGrams, timestamp: now.toISOString() }
    });
    
    await workflowAuditService.recordStep(
      flowInstanceId, flowType, 'notify_user',
      'PASS',
      { goldGrams, fromWalletType, toWalletType },
      { userId, transactionId: generatedTxId }
    );
    
    const auditResult = await workflowAuditService.completeFlow(flowInstanceId, generatedTxId);
    console.log(`[WorkflowAudit] ${flowType} completed: ${auditResult.overallResult}`);

    // Update the FPGW ownership summary to sync with batches
    await updateFpgwOwnershipSummary(userId);
    
    const updatedBalance = await getBalanceSummary(userId);

    res.json({
      success: true,
      message: `Successfully transferred ${goldGrams.toFixed(6)}g from ${fromWalletType} to ${toWalletType}`,
      transactionId: generatedTxId,
      balance: updatedBalance,
      auditResult
    });
  } catch (error: any) {
    console.error('Internal transfer error:', error);
    res.status(500).json({ error: error.message || "Failed to transfer" });
  }
});

router.get("/api/dual-wallet/:userId/transfers", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const transfers = await db
      .select()
      .from(vaultLedgerEntries)
      .where(
        and(
          eq(vaultLedgerEntries.userId, userId),
          sql`${vaultLedgerEntries.action} IN ('LGPW_To_FPGW', 'FPGW_To_LGPW')`
        )
      )
      .orderBy(desc(vaultLedgerEntries.createdAt))
      .limit(50);

    res.json({ transfers });
  } catch (error: any) {
    console.error('Transfer history error:', error);
    res.status(500).json({ error: error.message || "Failed to get history" });
  }
});

router.get("/api/dual-wallet/:userId/allocations", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const { getAllocationSummary } = await import('./allocation-service');
    const summary = await getAllocationSummary(userId);
    
    res.json(summary);
  } catch (error: any) {
    console.error('Allocation summary error:', error);
    res.status(500).json({ error: error.message || "Failed to get allocations" });
  }
});

router.get("/api/dual-wallet/:userId/certificates", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const { getUserCertificates } = await import('./certificate-generator');
    const certs = await getUserCertificates(userId, 100);
    
    res.json({ certificates: certs });
  } catch (error: any) {
    console.error('Certificates error:', error);
    res.status(500).json({ error: error.message || "Failed to get certificates" });
  }
});

export function registerDualWalletRoutes(app: any) {
  app.use(router);
  console.log('[DualWallet] Routes registered');
}
