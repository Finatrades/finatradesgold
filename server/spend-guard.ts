/**
 * SpendGuard - Balance Validation Service
 * 
 * Enforces the core spending rule: ONLY available gold can be spent.
 * Pending, locked, and reserved gold is NOT spendable.
 * 
 * This service validates all transactions before they execute.
 */

import { db } from "./db";
import { vaultOwnershipSummary } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateSpendableFpgw, getFpgwBalanceSummary } from "./fpgw-batch-service";

export type GoldWalletType = 'LGPW' | 'FPGW';

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
 * Get the complete balance summary for a user (LGPW + FPGW)
 */
export async function getBalanceSummary(userId: string): Promise<BalanceSummary> {
  // Get ownership summary from database
  const [ownership] = await db
    .select()
    .from(vaultOwnershipSummary)
    .where(eq(vaultOwnershipSummary.userId, userId));

  // Get FPGW details from batches
  const fpgwDetails = await getFpgwBalanceSummary(userId);

  const mpgw = {
    availableGrams: ownership ? parseFloat(ownership.mpgwAvailableGrams) : 0,
    pendingGrams: ownership ? parseFloat(ownership.mpgwPendingGrams) : 0,
    lockedBnslGrams: ownership ? parseFloat(ownership.mpgwLockedBnslGrams) : 0,
    reservedTradeGrams: ownership ? parseFloat(ownership.mpgwReservedTradeGrams) : 0,
    totalGrams: 0
  };
  mpgw.totalGrams = mpgw.availableGrams + mpgw.pendingGrams + mpgw.lockedBnslGrams + mpgw.reservedTradeGrams;

  const fpgw = {
    availableGrams: fpgwDetails.availableGrams,
    pendingGrams: fpgwDetails.pendingGrams,
    lockedBnslGrams: fpgwDetails.lockedBnslGrams,
    reservedTradeGrams: fpgwDetails.reservedTradeGrams,
    totalGrams: fpgwDetails.totalGrams,
    weightedAvgPrice: fpgwDetails.weightedAvgPrice
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
 * Validate that user can spend the requested amount from a specific wallet type
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

  if (walletType === 'FPGW') {
    const result = await validateSpendableFpgw(userId, goldGrams);
    return {
      valid: result.valid,
      availableGrams: result.available,
      requestedGrams: goldGrams,
      walletType,
      error: result.error
    };
  }

  // LGPW validation
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
 * Check if user can perform an internal transfer between LGPW and FPGW
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
