/**
 * SpendGuard - Balance Validation Service
 * 
 * Enforces the core spending rule: ONLY available gold can be spent.
 * Pending, locked, and reserved gold is NOT spendable.
 * 
 * This service validates all transactions before they execute.
 */

import { db } from "./db";
import { vaultOwnershipSummary, wallets, fpgwBatches } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

export type GoldWalletType = 'LGPW' | 'FGPW';

export interface SpendValidationResult {
  valid: boolean;
  availableGrams: number;
  requestedGrams: number;
  walletType: GoldWalletType;
  error?: string;
}

export interface BalanceSummary {
  mpgw: {
    availableGrams: number;
    pendingGrams: number;
    lockedBnslGrams: number;
    reservedTradeGrams: number;
    totalGrams: number;
  };
  fpgw: {
    availableGrams: number;
    pendingGrams: number;
    lockedBnslGrams: number;
    reservedTradeGrams: number;
    totalGrams: number;
    weightedAvgPrice: number;
  };
  total: {
    availableGrams: number;
    totalGrams: number;
  };
}

/**
 * Get the complete balance summary for a user (LGPW + FGPW).
 * MPGW available grams come from wallets.goldGrams (source of truth).
 * FPGW available grams come from vault_ownership_summary.fpgwAvailableGrams (source of truth).
 * Weighted avg price is derived from active fpgw_batches (display only).
 */
export async function getBalanceSummary(userId: string): Promise<BalanceSummary> {
  const [ownership] = await db
    .select()
    .from(vaultOwnershipSummary)
    .where(eq(vaultOwnershipSummary.userId, userId));

  const walletRow = await db
    .select({ goldGrams: wallets.goldGrams })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .then(rows => rows[0]);
  const actualWalletGrams = walletRow ? parseFloat(walletRow.goldGrams) : 0;

  // FPGW balance from vault_ownership_summary (updated atomically on lock/unlock)
  const fpgwAvailableGrams = ownership ? parseFloat(ownership.fpgwAvailableGrams) : 0;
  const fpgwPendingGrams = ownership ? parseFloat(ownership.fpgwPendingGrams) : 0;
  const fpgwLockedBnslGrams = ownership ? parseFloat(ownership.fpgwLockedBnslGrams) : 0;
  const fpgwReservedTradeGrams = ownership ? parseFloat(ownership.fpgwReservedTradeGrams) : 0;

  // Weighted avg price from active batches (for display only)
  const activeBatches = await db
    .select({ remainingGrams: fpgwBatches.remainingGrams, lockedPriceUsd: fpgwBatches.lockedPriceUsd })
    .from(fpgwBatches)
    .where(and(
      eq(fpgwBatches.userId, userId),
      eq(fpgwBatches.status, 'Active'),
      gt(fpgwBatches.remainingGrams, '0')
    ));

  let weightedAvgPrice = 0;
  if (activeBatches.length > 0) {
    const totalValue = activeBatches.reduce(
      (sum, b) => sum + parseFloat(b.remainingGrams) * parseFloat(b.lockedPriceUsd), 0
    );
    const totalGrams = activeBatches.reduce((sum, b) => sum + parseFloat(b.remainingGrams), 0);
    weightedAvgPrice = totalGrams > 0 ? totalValue / totalGrams : 0;
  }

  const mpgw = {
    availableGrams: actualWalletGrams,
    pendingGrams: ownership ? parseFloat(ownership.mpgwPendingGrams) : 0,
    lockedBnslGrams: ownership ? parseFloat(ownership.mpgwLockedBnslGrams) : 0,
    reservedTradeGrams: ownership ? parseFloat(ownership.mpgwReservedTradeGrams) : 0,
    totalGrams: 0
  };
  mpgw.totalGrams = mpgw.availableGrams + mpgw.pendingGrams + mpgw.lockedBnslGrams + mpgw.reservedTradeGrams;

  const fpgw = {
    availableGrams: fpgwAvailableGrams,
    pendingGrams: fpgwPendingGrams,
    lockedBnslGrams: fpgwLockedBnslGrams,
    reservedTradeGrams: fpgwReservedTradeGrams,
    totalGrams: fpgwAvailableGrams + fpgwPendingGrams + fpgwLockedBnslGrams + fpgwReservedTradeGrams,
    weightedAvgPrice
  };

  return {
    mpgw,
    fpgw,
    total: {
      availableGrams: mpgw.availableGrams + fpgw.availableGrams,
      totalGrams: mpgw.totalGrams + fpgw.totalGrams
    }
  };
}

/**
 * Validate that user can spend the requested amount from a specific wallet type.
 * FGPW: checks vault_ownership_summary.fpgwAvailableGrams (direct, no batch aggregation).
 * LGPW: checks wallets.goldGrams.
 */
export async function validateSpend(
  userId: string,
  goldGrams: number,
  walletType: GoldWalletType
): Promise<SpendValidationResult> {
  if (goldGrams <= 0) {
    return {
      valid: false,
      availableGrams: 0,
      requestedGrams: goldGrams,
      walletType,
      error: 'Amount must be greater than zero'
    };
  }

  if (walletType === 'FGPW') {
    const [ownership] = await db
      .select({ fpgwAvailableGrams: vaultOwnershipSummary.fpgwAvailableGrams })
      .from(vaultOwnershipSummary)
      .where(eq(vaultOwnershipSummary.userId, userId));
    const available = ownership ? parseFloat(ownership.fpgwAvailableGrams) : 0;
    if (available >= goldGrams) {
      return { valid: true, availableGrams: available, requestedGrams: goldGrams, walletType };
    }
    return {
      valid: false,
      availableGrams: available,
      requestedGrams: goldGrams,
      walletType,
      error: `Insufficient FPGW balance. Available: ${available.toFixed(6)}g, Requested: ${goldGrams.toFixed(6)}g. Pending/Locked gold cannot be spent.`
    };
  }

  // LGPW validation — read from wallets.goldGrams
  const summary = await getBalanceSummary(userId);

  if (summary.mpgw.availableGrams >= goldGrams) {
    return {
      valid: true,
      availableGrams: summary.mpgw.availableGrams,
      requestedGrams: goldGrams,
      walletType
    };
  }

  return {
    valid: false,
    availableGrams: summary.mpgw.availableGrams,
    requestedGrams: goldGrams,
    walletType,
    error: `Insufficient LGPW balance. Available: ${summary.mpgw.availableGrams.toFixed(6)}g, Requested: ${goldGrams.toFixed(6)}g. Pending/Locked gold cannot be spent.`
  };
}

/**
 * Check if user can perform an internal transfer between LGPW and FGPW
 */
export async function validateInternalTransfer(
  userId: string,
  goldGrams: number,
  fromWalletType: GoldWalletType,
  toWalletType: GoldWalletType
): Promise<SpendValidationResult> {
  if (fromWalletType === toWalletType) {
    return {
      valid: false,
      availableGrams: 0,
      requestedGrams: goldGrams,
      walletType: fromWalletType,
      error: 'Cannot transfer to the same wallet type'
    };
  }

  return validateSpend(userId, goldGrams, fromWalletType);
}

/**
 * Format balance for display
 */
export function formatBalance(grams: number): string {
  return grams.toFixed(6);
}
