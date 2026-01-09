/**
 * Dual Wallet Routes - MPGW/FPGW API Endpoints
 * 
 * Provides endpoints for:
 * - Getting balance summary (MPGW + FPGW breakdown)
 * - Internal transfers between MPGW and FPGW
 * - Spend validation
 */

import { Router, Request, Response } from "express";
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
  fromWalletType: z.enum(['MPGW', 'FPGW']),
  toWalletType: z.enum(['MPGW', 'FPGW']),
  notes: z.string().optional()
});

router.post("/api/dual-wallet/transfer", ensureAuthenticated, async (req, res) => {
  try {
    const parsed = internalTransferSchema.parse(req.body);
    const { userId, goldGrams, fromWalletType, toWalletType, notes } = parsed;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const flowType: FlowType = fromWalletType === 'MPGW' 
      ? 'INTERNAL_TRANSFER_MPGW_TO_FPGW' 
      : 'INTERNAL_TRANSFER_FPGW_TO_MPGW';
    const flowInstanceId = await workflowAuditService.startFlow(flowType, userId, {
      goldGrams,
      fromWalletType,
      toWalletType,
    });

    const validateStepKey = fromWalletType === 'MPGW' 
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

    await db.transaction(async (tx) => {
      if (fromWalletType === 'MPGW' && toWalletType === 'FPGW') {
        const [insertedTx] = await tx.insert(transactions).values({
          userId,
          type: 'Swap',
          status: 'Completed',
          amountGold: goldGrams.toFixed(6),
          amountUsd: (goldGrams * currentGoldPrice).toFixed(2),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          goldWalletType: 'MPGW',
          description: `MPGW to FPGW conversion: ${goldGrams.toFixed(6)}g at $${currentGoldPrice.toFixed(2)}/g`,
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
            lastUpdated: now
          })
          .where(eq(vaultOwnershipSummary.userId, userId));

        await createFpgwBatch({
          userId,
          goldGrams,
          lockedPriceUsd: currentGoldPrice,
          sourceType: 'conversion',
          sourceTransactionId: actualTxId,
          notes: notes || `MPGW to FPGW conversion at $${currentGoldPrice.toFixed(2)}/g`
        });
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'fpgw_batch_created',
          'PASS',
          { goldGrams, lockedPriceUsd: currentGoldPrice },
          { userId, transactionId: actualTxId }
        );

        const balanceSummary = await getBalanceSummary(userId);
        
        const [ledgerEntry] = await tx.insert(vaultLedgerEntries).values({
          userId,
          action: 'MPGW_To_FPGW',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          valueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          fromGoldWalletType: 'MPGW',
          toGoldWalletType: 'FPGW',
          balanceAfterGrams: (balanceSummary.total.totalGrams).toFixed(6),
          transactionId: actualTxId,
          notes: `Converted ${goldGrams.toFixed(6)}g from MPGW to FPGW at $${currentGoldPrice.toFixed(2)}/g`
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
          { newMpgwGrams: balanceSummary.mpgw.availableGrams, newFpgwGrams: balanceSummary.fpgw.availableGrams },
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
          issuer: 'Finatrades',
          fromGoldWalletType: 'MPGW',
          toGoldWalletType: 'FPGW',
          conversionPriceUsd: currentGoldPrice.toFixed(2),
          status: 'Active',
          transactionId: actualTxId,
          issuedAt: now
        }).returning({ id: certificates.id });
        
        // Find existing MPGW Digital Ownership certificates to reduce remaining grams
        const mpgwCerts = await tx.select()
          .from(certificates)
          .where(and(
            eq(certificates.userId, userId),
            eq(certificates.type, 'Digital Ownership'),
            eq(certificates.status, 'Active'),
            sql`(${certificates.goldWalletType} = 'MPGW' OR ${certificates.goldWalletType} IS NULL)`
          ))
          .orderBy(desc(certificates.issuedAt));
        
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
            notes: `${deductAmount.toFixed(6)}g converted from MPGW to FPGW at $${currentGoldPrice.toFixed(2)}/g`
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
          issuer: 'Finatrades',
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
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'certificate_issued',
          'PASS',
          { conversionCertNumber: certNumber, digitalOwnershipCertNumber: digitalCertNumber, parentCertId },
          { userId, transactionId: actualTxId, certificateId: cert.id }
        );

      } else if (fromWalletType === 'FPGW' && toWalletType === 'MPGW') {
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
            lastUpdated: now
          })
          .where(eq(vaultOwnershipSummary.userId, userId));

        const avgPrice = consumption.totalGramsConsumed > 0 
          ? consumption.weightedValueUsd / consumption.totalGramsConsumed 
          : currentGoldPrice;

        const balanceSummaryFpgw = await getBalanceSummary(userId);
        
        const [insertedTxFpgw] = await tx.insert(transactions).values({
          userId,
          type: 'Swap',
          status: 'Completed',
          amountGold: goldGrams.toFixed(6),
          amountUsd: consumption.weightedValueUsd.toFixed(2),
          goldPriceUsdPerGram: avgPrice.toFixed(2),
          goldWalletType: 'FPGW',
          description: `FPGW to MPGW conversion: ${goldGrams.toFixed(6)}g (cost basis: $${avgPrice.toFixed(2)}/g)`,
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
          action: 'FPGW_To_MPGW',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: avgPrice.toFixed(2),
          valueUsd: consumption.weightedValueUsd.toFixed(2),
          fromGoldWalletType: 'FPGW',
          toGoldWalletType: 'MPGW',
          balanceAfterGrams: (balanceSummaryFpgw.total.totalGrams).toFixed(6),
          transactionId: actualTxIdFpgw,
          notes: `Converted ${goldGrams.toFixed(6)}g from FPGW to MPGW (FPGW cost: $${consumption.weightedValueUsd.toFixed(2)}, market value: $${(goldGrams * currentGoldPrice).toFixed(2)})`
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
          { newMpgwGrams: balanceSummaryFpgw.mpgw.availableGrams, newFpgwGrams: balanceSummaryFpgw.fpgw.availableGrams },
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
          issuer: 'Finatrades',
          fromGoldWalletType: 'FPGW',
          toGoldWalletType: 'MPGW',
          conversionPriceUsd: avgPrice.toFixed(2),
          status: 'Active',
          transactionId: actualTxIdFpgw,
          issuedAt: now
        }).returning({ id: certificates.id });
        
        await workflowAuditService.recordStep(
          flowInstanceId, flowType, 'certificate_issued',
          'PASS',
          { certificateNumber: certNumberFpgw },
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
          sql`${vaultLedgerEntries.action} IN ('MPGW_To_FPGW', 'FPGW_To_MPGW')`
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
