/**
 * Dual Wallet Routes - LGPW/FGPW API Endpoints
 * 
 * Provides endpoints for:
 * - Getting balance summary (LGPW + FGPW breakdown)
 * - Internal transfers between LGPW and FGPW
 * - Spend validation
 */

import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, desc, asc, sql, gt } from "drizzle-orm";
import { 
  vaultOwnershipSummary, 
  vaultLedgerEntries, 
  certificates,
  transactions,
  wallets,
  fpgwBatches,
  cashSafetyLedger
} from "@shared/schema";
import { getBalanceSummary, validateSpend, validateInternalTransfer, type GoldWalletType } from "./spend-guard";
import { createFpgwBatch, getFpgwBalanceSummary } from "./fpgw-batch-service";
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
    console.error('FGPW batches error:', error);
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
  fromWalletType: z.enum(['LGPW', 'FGPW']),
  toWalletType: z.enum(['LGPW', 'FGPW']),
  lockId: z.string().optional(),
  notes: z.string().optional()
});

async function safeAuditStep(
  flowInstanceId: string,
  flowType: FlowType,
  stepKey: string,
  result: 'PASS' | 'FAIL',
  payload?: any,
  options?: any
): Promise<void> {
  try {
    await workflowAuditService.recordStep(flowInstanceId, flowType, stepKey, result, payload, options);
  } catch (auditErr: any) {
    console.warn(`[WorkflowAudit] Non-critical audit step "${stepKey}" failed (transaction continues):`, auditErr?.message || auditErr);
  }
}

async function handleDualWalletTransfer(req: Request, res: Response) {
  try {
    const parsed = internalTransferSchema.parse(req.body);
    const { userId, goldGrams, fromWalletType, toWalletType, lockId, notes } = parsed;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const flowType: FlowType = fromWalletType === 'LGPW' 
      ? 'INTERNAL_TRANSFER_LGPW_TO_FGPW' 
      : 'INTERNAL_TRANSFER_FGPW_TO_LGPW';
    let flowInstanceId = '';
    try {
      flowInstanceId = await workflowAuditService.startFlow(flowType, userId, {
        goldGrams,
        fromWalletType,
        toWalletType,
      });
    } catch (auditErr: any) {
      console.warn('[WorkflowAudit] startFlow failed (continuing without audit):', auditErr?.message);
      flowInstanceId = `fallback-${Date.now()}`;
    }

    const validateStepKey = fromWalletType === 'LGPW' 
      ? 'validate_user_balance_mpgw' 
      : 'validate_user_balance_fpgw';
    
    const validation = await validateInternalTransfer(userId, goldGrams, fromWalletType, toWalletType);
    
    await safeAuditStep(
      flowInstanceId, flowType, validateStepKey,
      validation.valid ? 'PASS' : 'FAIL',
      { availableGrams: validation.availableGrams, requestedGrams: goldGrams },
      { userId }
    );
    
    if (!validation.valid) {
      try { await workflowAuditService.completeFlow(flowInstanceId); } catch {}
      return res.status(400).json({ error: validation.error });
    }

    const currentGoldPrice = await getGoldPricePerGram();
    const now = new Date();
    let generatedTxId: string = '';
    
    const preTransferBalance = await getBalanceSummary(userId);

    // Lock-centric: require lockId for FGPW→LGPW unlock BEFORE entering transaction
    if (fromWalletType === 'FGPW' && toWalletType === 'LGPW' && !lockId) {
      return res.status(400).json({ message: 'lockId is required for unlock. Use the Unlock button next to each active lock.' });
    }

    await db.transaction(async (tx) => {
      if (fromWalletType === 'LGPW' && toWalletType === 'FGPW') {
        // ── LOCK: LGPW → FGPW ──────────────────────────────────────────
        // 1. Create transaction record
        const [insertedTx] = await tx.insert(transactions).values({
          userId,
          type: 'Swap',
          status: 'Completed',
          amountGold: goldGrams.toFixed(6),
          amountUsd: (goldGrams * currentGoldPrice).toFixed(2),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          goldWalletType: 'LGPW',
          description: `LGPW to FGPW lock: ${goldGrams.toFixed(6)}g at $${currentGoldPrice.toFixed(2)}/g`,
          sourceModule: 'dual-wallet',
          createdAt: now
        }).returning({ id: transactions.id });
        
        const actualTxId = insertedTx.id;
        generatedTxId = actualTxId;
        
        await safeAuditStep(
          flowInstanceId, flowType, 'create_pending_txn',
          'PASS',
          { transactionId: actualTxId, goldGrams },
          { userId, transactionId: actualTxId }
        );
        
        // 2. Deduct from wallets.goldGrams (MPGW source of truth)
        await tx
          .update(wallets)
          .set({ goldGrams: sql`${wallets.goldGrams} - ${goldGrams}`, updatedAt: now })
          .where(eq(wallets.userId, userId));

        // 3. Credit FPGW in vault_ownership_summary
        await tx
          .update(vaultOwnershipSummary)
          .set({
            fpgwAvailableGrams: sql`${vaultOwnershipSummary.fpgwAvailableGrams} + ${goldGrams}`,
            lastUpdated: now
          })
          .where(eq(vaultOwnershipSummary.userId, userId));

        // 4. Create fpgw_batch inside the transaction (atomic — no orphan risk)
        await createFpgwBatch({
          userId,
          goldGrams,
          lockedPriceUsd: currentGoldPrice,
          sourceType: 'conversion',
          sourceTransactionId: actualTxId,
          notes: notes || `LGPW → FGPW lock at $${currentGoldPrice.toFixed(2)}/g`,
          tx
        });
        
        await safeAuditStep(
          flowInstanceId, flowType, 'fpgw_batch_created',
          'PASS',
          { goldGrams, lockedPriceUsd: currentGoldPrice },
          { userId, transactionId: actualTxId }
        );

        // 4b. Cash safety ledger entry for LOCK — inside tx (atomic)
        const [lastCashEntryLock] = await tx
          .select({ balance: cashSafetyLedger.runningBalanceUsd })
          .from(cashSafetyLedger)
          .orderBy(desc(cashSafetyLedger.createdAt))
          .limit(1);
        const currentCashBalanceLock = parseFloat(lastCashEntryLock?.balance || '0');
        const usdAmountLock = goldGrams * currentGoldPrice;
        await tx.insert(cashSafetyLedger).values({
          entryType: 'FPGW_LOCK',
          amountUsd: usdAmountLock.toFixed(2),
          direction: 'credit',
          runningBalanceUsd: (currentCashBalanceLock + usdAmountLock).toFixed(2),
          userId,
          notes: `User locked ${goldGrams.toFixed(6)}g at $${currentGoldPrice.toFixed(2)}/g`
        });

        // 5. Vault ledger entry
        const [ledgerEntry] = await tx.insert(vaultLedgerEntries).values({
          userId,
          action: 'LGPW_To_FGPW',
          goldGrams: goldGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          valueUsd: (goldGrams * currentGoldPrice).toFixed(2),
          fromGoldWalletType: 'LGPW',
          toGoldWalletType: 'FGPW',
          balanceAfterGrams: (preTransferBalance.total.totalGrams).toFixed(6),
          transactionId: actualTxId,
          notes: `LGPW → FGPW: ${goldGrams.toFixed(6)}g locked at $${currentGoldPrice.toFixed(2)}/g`
        }).returning({ id: vaultLedgerEntries.id });
        
        await safeAuditStep(
          flowInstanceId, flowType, 'ledger_post_reclass_mpgw_to_fpgw',
          'PASS',
          { ledgerEntryId: ledgerEntry.id },
          { userId, transactionId: actualTxId, ledgerEntryId: ledgerEntry.id }
        );
        
        await safeAuditStep(
          flowInstanceId, flowType, 'balances_updated',
          'PASS',
          { newMpgwGrams: preTransferBalance.mpgw.availableGrams - goldGrams, newFpgwGrams: preTransferBalance.fpgw.availableGrams + goldGrams },
          { userId, transactionId: actualTxId }
        );

        // 6. Issue Conversion certificate (no FIFO cert reduction)
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
          toGoldWalletType: 'FGPW',
          conversionPriceUsd: currentGoldPrice.toFixed(2),
          status: 'Active',
          transactionId: actualTxId,
          issuedAt: now
        }).returning({ id: certificates.id });
        
        await safeAuditStep(
          flowInstanceId, flowType, 'certificate_issued',
          'PASS',
          { conversionCertNumber: certNumber },
          { userId, transactionId: actualTxId, certificateId: cert.id }
        );

      } else if (fromWalletType === 'FGPW' && toWalletType === 'LGPW') {
        // ── UNLOCK: FGPW → LGPW (lock-centric model) ───────────────────
        // lockId is guaranteed non-null here (pre-transaction check at line 246)
        const [found] = await tx
          .select({
            id: fpgwBatches.id,
            originalGrams: fpgwBatches.originalGrams,
            remainingGrams: fpgwBatches.remainingGrams,
            lockedPriceUsd: fpgwBatches.lockedPriceUsd
          })
          .from(fpgwBatches)
          .where(and(
            eq(fpgwBatches.id, lockId!),
            eq(fpgwBatches.userId, userId),
            eq(fpgwBatches.status, 'Active')
          ));

        const targetBatch = found ?? null;

        if (!targetBatch) {
          throw new Error('No active lock found with the specified lockId');
        }

        // Lock-centric: always unlock the full original gram count for this lock
        const batchGrams = parseFloat(targetBatch.originalGrams);
        const batchLockedPrice = parseFloat(targetBatch.lockedPriceUsd);

        // 1. Mark the single batch as Consumed atomically
        await tx
          .update(fpgwBatches)
          .set({ remainingGrams: '0.000000', status: 'Consumed', updatedAt: now })
          .where(eq(fpgwBatches.id, targetBatch.id));

        // 2. Create transaction record using the batch's gram count
        const [insertedTxFpgw] = await tx.insert(transactions).values({
          userId,
          type: 'Swap',
          status: 'Completed',
          amountGold: batchGrams.toFixed(6),
          amountUsd: (batchGrams * currentGoldPrice).toFixed(2),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          goldWalletType: 'LGPW',
          description: `FGPW to LGPW unlock: ${batchGrams.toFixed(6)}g at market $${currentGoldPrice.toFixed(2)}/g`,
          sourceModule: 'dual-wallet',
          createdAt: now
        }).returning({ id: transactions.id });
        
        const actualTxIdFpgw = insertedTxFpgw.id;
        generatedTxId = actualTxIdFpgw;
        
        await safeAuditStep(
          flowInstanceId, flowType, 'create_pending_txn',
          'PASS',
          { transactionId: actualTxIdFpgw, batchGrams, batchId: targetBatch.id },
          { userId, transactionId: actualTxIdFpgw }
        );

        // 3. Add batch grams back to wallets.goldGrams (LGPW source of truth)
        await tx
          .update(wallets)
          .set({ goldGrams: sql`${wallets.goldGrams} + ${batchGrams}`, updatedAt: now })
          .where(eq(wallets.userId, userId));

        // 4. Deduct from FPGW in vault_ownership_summary
        await tx
          .update(vaultOwnershipSummary)
          .set({
            fpgwAvailableGrams: sql`${vaultOwnershipSummary.fpgwAvailableGrams} - ${batchGrams}`,
            lastUpdated: now
          })
          .where(eq(vaultOwnershipSummary.userId, userId));

        await safeAuditStep(
          flowInstanceId, flowType, 'balances_updated',
          'PASS',
          { newLgpwGrams: preTransferBalance.mpgw.availableGrams + batchGrams, newFpgwGrams: preTransferBalance.fpgw.availableGrams - batchGrams },
          { userId, transactionId: actualTxIdFpgw }
        );

        // 5. Cash safety ledger entry (inside tx — atomic with balance updates)
        const [lastCashEntryUnlock] = await tx
          .select({ balance: cashSafetyLedger.runningBalanceUsd })
          .from(cashSafetyLedger)
          .orderBy(desc(cashSafetyLedger.createdAt))
          .limit(1);
        const currentCashBalanceUnlock = parseFloat(lastCashEntryUnlock?.balance || '0');
        // Use the batch's locked price (not live price) to exactly reverse the LOCK credit
        const usdAmountUnlock = batchGrams * batchLockedPrice;
        await tx.insert(cashSafetyLedger).values({
          entryType: 'FPGW_UNLOCK',
          amountUsd: usdAmountUnlock.toFixed(2),
          direction: 'debit',
          runningBalanceUsd: Math.max(0, currentCashBalanceUnlock - usdAmountUnlock).toFixed(2),
          userId,
          notes: `User unlocked ${batchGrams.toFixed(6)}g (locked at $${batchLockedPrice.toFixed(2)}/g) → LGPW`
        });

        // 6. Vault ledger entry
        const [ledgerEntryFpgw] = await tx.insert(vaultLedgerEntries).values({
          userId,
          action: 'FGPW_To_LGPW',
          goldGrams: batchGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          valueUsd: (batchGrams * currentGoldPrice).toFixed(2),
          fromGoldWalletType: 'FGPW',
          toGoldWalletType: 'LGPW',
          balanceAfterGrams: (preTransferBalance.total.totalGrams).toFixed(6),
          transactionId: actualTxIdFpgw,
          notes: `FGPW → LGPW: ${batchGrams.toFixed(6)}g unlocked at market $${currentGoldPrice.toFixed(2)}/g`
        }).returning({ id: vaultLedgerEntries.id });
        
        await safeAuditStep(
          flowInstanceId, flowType, 'ledger_post_reclass_fpgw_to_mpgw',
          'PASS',
          { ledgerEntryId: ledgerEntryFpgw.id },
          { userId, transactionId: actualTxIdFpgw, ledgerEntryId: ledgerEntryFpgw.id }
        );

        // 7. Issue Conversion certificate
        const certNumberFpgw = `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const [certFpgw] = await tx.insert(certificates).values({
          certificateNumber: certNumberFpgw,
          userId,
          type: 'Conversion',
          goldGrams: batchGrams.toFixed(6),
          goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
          totalValueUsd: (batchGrams * currentGoldPrice).toFixed(2),
          issuer: 'Wingold Metals DMCC',
          fromGoldWalletType: 'FGPW',
          toGoldWalletType: 'LGPW',
          conversionPriceUsd: currentGoldPrice.toFixed(2),
          status: 'Active',
          transactionId: actualTxIdFpgw,
          issuedAt: now
        }).returning({ id: certificates.id });
        
        await safeAuditStep(
          flowInstanceId, flowType, 'certificate_issued',
          'PASS',
          { conversionCertNumber: certNumberFpgw },
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
    
    await safeAuditStep(
      flowInstanceId, flowType, 'notify_user',
      'PASS',
      { goldGrams, fromWalletType, toWalletType },
      { userId, transactionId: generatedTxId }
    );
    
    let auditResult = { overallResult: 'PASS' };
    try {
      auditResult = await workflowAuditService.completeFlow(flowInstanceId, generatedTxId);
      console.log(`[WorkflowAudit] ${flowType} completed: ${auditResult.overallResult}`);
    } catch (auditErr: any) {
      console.warn('[WorkflowAudit] completeFlow failed (non-critical):', auditErr?.message);
    }

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
}

router.post("/api/dual-wallet/transfer", ensureAuthenticated, conversionIdempotencyMiddleware, handleDualWalletTransfer);

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
          sql`${vaultLedgerEntries.action} IN ('LGPW_To_FGPW', 'FGPW_To_LGPW')`
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
    res.json({ allocations: [], message: "Allocation service not available" });
  } catch (error: any) {
    console.error('Allocation summary error:', error);
    res.status(500).json({ error: error.message || "Failed to get allocations" });
  }
});

router.get("/api/dual-wallet/:userId/locks", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const locks = await db
      .select()
      .from(fpgwBatches)
      .where(and(
        eq(fpgwBatches.userId, userId),
        eq(fpgwBatches.status, 'Active'),
        gt(fpgwBatches.remainingGrams, '0')
      ))
      .orderBy(asc(fpgwBatches.createdAt));

    res.json({
      locks: locks.map(b => ({
        id: b.id,
        goldGrams: parseFloat(b.remainingGrams),
        lockedPriceUsd: parseFloat(b.lockedPriceUsd),
        lockedValueUsd: parseFloat(b.remainingGrams) * parseFloat(b.lockedPriceUsd),
        lockedAt: b.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Active locks error:', error);
    res.status(500).json({ error: error.message || "Failed to get locks" });
  }
});

router.get("/api/dual-wallet/:userId/certificates", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const session = (req as any).session;

    if (session.userId !== userId && session.userRole !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const certs = await storage.getUserCertificates(userId);
    
    res.json({ certificates: certs });
  } catch (error: any) {
    console.error('Certificates error:', error);
    res.status(500).json({ error: error.message || "Failed to get certificates" });
  }
});

/**
 * POST /api/wallet/mpgw-to-fpgw
 * Lock gold from Market Price Gold Wallet (MPGW) into Fixed Price Gold Wallet (FPGW).
 * Alias for POST /api/dual-wallet/transfer with fromWalletType='LGPW', toWalletType='FGPW'.
 */
router.post("/api/wallet/mpgw-to-fpgw", ensureAuthenticated, conversionIdempotencyMiddleware, async (req, res) => {
  req.body = { ...req.body, fromWalletType: 'LGPW', toWalletType: 'FGPW' };
  return handleDualWalletTransfer(req, res);
});

/**
 * POST /api/wallet/fpgw-to-mpgw
 * Unlock gold from Fixed Price Gold Wallet (FPGW) back to Market Price Gold Wallet (MPGW).
 * Alias for POST /api/dual-wallet/transfer with fromWalletType='FGPW', toWalletType='LGPW'.
 */
router.post("/api/wallet/fpgw-to-mpgw", ensureAuthenticated, conversionIdempotencyMiddleware, async (req, res) => {
  req.body = { ...req.body, fromWalletType: 'FGPW', toWalletType: 'LGPW' };
  return handleDualWalletTransfer(req, res);
});

export function registerDualWalletRoutes(app: any) {
  app.use(router);
  console.log('[DualWallet] Routes registered');
}
