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
  certificates
} from "@shared/schema";
import { getBalanceSummary, validateSpend, validateInternalTransfer, type GoldWalletType } from "./spend-guard";
import { 
  createFpgwBatch, 
  consumeFpgwBatches, 
  transferFpgwBatches, 
  getFpgwBalanceSummary
} from "./fpgw-batch-service";
import { getGoldPricePerGram } from "./gold-price-service";
import { emitLedgerEvent } from "./socket";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

function ensureAuthenticated(req: Request, res: Response, next: any) {
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

router.get("/api/dual-wallet/:userId/balance", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = (req as any).user;

    if (currentUser.id !== userId && currentUser.role !== 'admin') {
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
    const currentUser = (req as any).user;

    if (currentUser.id !== userId && currentUser.role !== 'admin') {
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
    const currentUser = (req as any).user;

    if (currentUser.id !== userId && currentUser.role !== 'admin') {
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
    const currentUser = (req as any).user;

    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const validation = await validateInternalTransfer(userId, goldGrams, fromWalletType, toWalletType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const currentGoldPrice = await getGoldPricePerGram();
    const transactionId = crypto.randomUUID();
    const now = new Date();

    if (fromWalletType === 'MPGW' && toWalletType === 'FPGW') {
      await db
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
        sourceTransactionId: transactionId,
        notes: notes || `MPGW to FPGW conversion at $${currentGoldPrice.toFixed(2)}/g`
      });

      const balanceSummary = await getBalanceSummary(userId);
      await db.insert(vaultLedgerEntries).values({
        userId,
        action: 'MPGW_To_FPGW',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: currentGoldPrice.toFixed(2),
        valueUsd: (goldGrams * currentGoldPrice).toFixed(2),
        fromGoldWalletType: 'MPGW',
        toGoldWalletType: 'FPGW',
        balanceAfterGrams: (balanceSummary.total.totalGrams).toFixed(6),
        transactionId,
        notes: `Converted ${goldGrams.toFixed(6)}g from MPGW to FPGW at $${currentGoldPrice.toFixed(2)}/g`
      });

      const certNumber = `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await db.insert(certificates).values({
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
        transactionId,
        issuedAt: now
      });

    } else if (fromWalletType === 'FPGW' && toWalletType === 'MPGW') {
      const consumption = await consumeFpgwBatches(userId, goldGrams, 'Available');
      
      if (!consumption.success) {
        return res.status(400).json({ error: consumption.error });
      }

      await db
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
      await db.insert(vaultLedgerEntries).values({
        userId,
        action: 'FPGW_To_MPGW',
        goldGrams: goldGrams.toFixed(6),
        goldPriceUsdPerGram: avgPrice.toFixed(2),
        valueUsd: consumption.weightedValueUsd.toFixed(2),
        fromGoldWalletType: 'FPGW',
        toGoldWalletType: 'MPGW',
        balanceAfterGrams: (balanceSummaryFpgw.total.totalGrams).toFixed(6),
        transactionId,
        notes: `Converted ${goldGrams.toFixed(6)}g from FPGW to MPGW (FPGW cost: $${consumption.weightedValueUsd.toFixed(2)}, market value: $${(goldGrams * currentGoldPrice).toFixed(2)})`
      });

      const certNumberFpgw = `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await db.insert(certificates).values({
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
        transactionId,
        issuedAt: now
      });
    }

    emitLedgerEvent(userId, {
      type: 'balance_update',
      module: 'finapay',
      action: `${fromWalletType}_to_${toWalletType}`,
      data: { goldGrams, timestamp: now.toISOString() }
    });

    const updatedBalance = await getBalanceSummary(userId);

    res.json({
      success: true,
      message: `Successfully transferred ${goldGrams.toFixed(6)}g from ${fromWalletType} to ${toWalletType}`,
      transactionId,
      balance: updatedBalance
    });
  } catch (error: any) {
    console.error('Internal transfer error:', error);
    res.status(500).json({ error: error.message || "Failed to transfer" });
  }
});

router.get("/api/dual-wallet/:userId/transfers", ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = (req as any).user;

    if (currentUser.id !== userId && currentUser.role !== 'admin') {
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

export function registerDualWalletRoutes(app: any) {
  app.use(router);
  console.log('[DualWallet] Routes registered');
}
