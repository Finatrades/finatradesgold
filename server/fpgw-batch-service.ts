/**
 * FGPW Batch Service
 * 
 * Manages Fixed Gold Price Wallet batches with FIFO (First-In-First-Out) consumption.
 * Each batch represents gold acquired at a specific locked price.
 * 
 * Key Operations:
 * - createBatch: Create a new FGPW batch when gold enters FGPW
 * - consumeBatches: Consume gold from batches using FIFO order
 * - transferBatches: Transfer batch ownership between users
 * - getWeightedAveragePrice: Calculate weighted average price across active batches
 */

import { db } from "./db";
import { 
  fpgwBatches, 
  vaultOwnershipSummary, 
  vaultLedgerEntries,
  certificates,
  type FpgwBatch,
  type InsertFpgwBatch
} from "@shared/schema";
import { eq, and, gt, sql, asc } from "drizzle-orm";

export type GoldWalletType = 'LGPW' | 'FGPW';
export type BalanceBucket = 'Available' | 'Pending' | 'Locked_BNSL' | 'Reserved_Trade';

interface BatchConsumptionResult {
  success: boolean;
  consumedBatches: {
    batchId: string;
    gramsConsumed: number;
    lockedPriceUsd: number;
  }[];
  totalGramsConsumed: number;
  weightedValueUsd: number;
  error?: string;
}

interface CreateBatchParams {
  userId: string;
  goldGrams: number;
  lockedPriceUsd: number;
  sourceTransactionId?: string;
  sourceType: 'deposit' | 'transfer' | 'conversion';
  fromUserId?: string;
  balanceBucket?: BalanceBucket;
  notes?: string;
}

interface TransferBatchParams {
  fromUserId: string;
  toUserId: string;
  goldGrams: number;
  transactionId?: string;
}

/**
 * Create a new FGPW batch when gold enters the Fixed Price wallet
 */
export async function createFpgwBatch(params: CreateBatchParams & { tx?: typeof db }): Promise<FpgwBatch> {
  const {
    userId,
    goldGrams,
    lockedPriceUsd,
    sourceTransactionId,
    sourceType,
    fromUserId,
    balanceBucket = 'Available',
    notes,
    tx
  } = params;

  const dbClient = tx || db;

  const [batch] = await dbClient
    .insert(fpgwBatches)
    .values({
      userId,
      originalGrams: goldGrams.toString(),
      remainingGrams: goldGrams.toString(),
      lockedPriceUsd: lockedPriceUsd.toString(),
      status: 'Active',
      balanceBucket,
      sourceTransactionId,
      sourceType,
      fromUserId,
      notes
    })
    .returning();

  return batch;
}

/**
 * Get all active batches for a user, ordered by creation date (FIFO)
 */
export async function getActiveBatches(
  userId: string, 
  balanceBucket: BalanceBucket = 'Available'
): Promise<FpgwBatch[]> {
  return db
    .select()
    .from(fpgwBatches)
    .where(
      and(
        eq(fpgwBatches.userId, userId),
        eq(fpgwBatches.status, 'Active'),
        eq(fpgwBatches.balanceBucket, balanceBucket),
        gt(fpgwBatches.remainingGrams, '0')
      )
    )
    .orderBy(asc(fpgwBatches.createdAt));
}

/**
 * Consume gold from FGPW batches using FIFO order
 * Returns the batches consumed and their locked prices for audit trail
 */
export async function consumeFpgwBatches(
  userId: string,
  goldGrams: number,
  balanceBucket: BalanceBucket = 'Available'
): Promise<BatchConsumptionResult> {
  const activeBatches = await getActiveBatches(userId, balanceBucket);
  
  // Calculate total available
  const totalAvailable = activeBatches.reduce(
    (sum, batch) => sum + parseFloat(batch.remainingGrams),
    0
  );

  if (totalAvailable < goldGrams) {
    return {
      success: false,
      consumedBatches: [],
      totalGramsConsumed: 0,
      weightedValueUsd: 0,
      error: `Insufficient FGPW balance. Available: ${totalAvailable.toFixed(6)}g, Requested: ${goldGrams.toFixed(6)}g`
    };
  }

  let remainingToConsume = goldGrams;
  const consumedBatches: BatchConsumptionResult['consumedBatches'] = [];
  let weightedValueUsd = 0;

  for (const batch of activeBatches) {
    if (remainingToConsume <= 0) break;

    const batchRemaining = parseFloat(batch.remainingGrams);
    const gramsToConsume = Math.min(batchRemaining, remainingToConsume);
    const lockedPrice = parseFloat(batch.lockedPriceUsd);

    // Update batch
    const newRemaining = batchRemaining - gramsToConsume;
    const newStatus = newRemaining <= 0 ? 'Consumed' : 'Active';

    await db
      .update(fpgwBatches)
      .set({
        remainingGrams: newRemaining.toString(),
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(fpgwBatches.id, batch.id));

    consumedBatches.push({
      batchId: batch.id,
      gramsConsumed: gramsToConsume,
      lockedPriceUsd: lockedPrice
    });

    weightedValueUsd += gramsToConsume * lockedPrice;
    remainingToConsume -= gramsToConsume;
  }

  return {
    success: true,
    consumedBatches,
    totalGramsConsumed: goldGrams - remainingToConsume,
    weightedValueUsd
  };
}

/**
 * Transfer FGPW batches from one user to another
 * Creates new batches for recipient with same locked prices
 */
export async function transferFpgwBatches(
  params: TransferBatchParams
): Promise<BatchConsumptionResult & { newBatches: FpgwBatch[] }> {
  const { fromUserId, toUserId, goldGrams, transactionId } = params;

  // Consume from sender
  const consumeResult = await consumeFpgwBatches(fromUserId, goldGrams, 'Available');

  if (!consumeResult.success) {
    return {
      ...consumeResult,
      newBatches: []
    };
  }

  // Create new batches for recipient with same locked prices
  const newBatches: FpgwBatch[] = [];

  for (const consumed of consumeResult.consumedBatches) {
    const batch = await createFpgwBatch({
      userId: toUserId,
      goldGrams: consumed.gramsConsumed,
      lockedPriceUsd: consumed.lockedPriceUsd,
      sourceTransactionId: transactionId,
      sourceType: 'transfer',
      fromUserId,
      notes: `Transferred from batch ${consumed.batchId}`
    });
    newBatches.push(batch);
  }

  return {
    ...consumeResult,
    newBatches
  };
}

/**
 * Calculate weighted average price across all active FGPW batches
 */
export async function getWeightedAveragePrice(
  userId: string,
  balanceBucket?: BalanceBucket
): Promise<{ averagePrice: number; totalGrams: number }> {
  const batches = balanceBucket 
    ? await getActiveBatches(userId, balanceBucket)
    : await db
        .select()
        .from(fpgwBatches)
        .where(
          and(
            eq(fpgwBatches.userId, userId),
            eq(fpgwBatches.status, 'Active'),
            gt(fpgwBatches.remainingGrams, '0')
          )
        );

  let totalValue = 0;
  let totalGrams = 0;

  for (const batch of batches) {
    const grams = parseFloat(batch.remainingGrams);
    const price = parseFloat(batch.lockedPriceUsd);
    totalValue += grams * price;
    totalGrams += grams;
  }

  return {
    averagePrice: totalGrams > 0 ? totalValue / totalGrams : 0,
    totalGrams
  };
}

/**
 * Get FGPW balance summary for a user
 */
export async function getFpgwBalanceSummary(userId: string): Promise<{
  availableGrams: number;
  pendingGrams: number;
  lockedBnslGrams: number;
  reservedTradeGrams: number;
  totalGrams: number;
  weightedAvgPrice: number;
  batches: FpgwBatch[];
}> {
  const allBatches = await db
    .select()
    .from(fpgwBatches)
    .where(
      and(
        eq(fpgwBatches.userId, userId),
        eq(fpgwBatches.status, 'Active'),
        gt(fpgwBatches.remainingGrams, '0')
      )
    )
    .orderBy(asc(fpgwBatches.createdAt));

  let availableGrams = 0;
  let pendingGrams = 0;
  let lockedBnslGrams = 0;
  let reservedTradeGrams = 0;
  let totalValue = 0;

  for (const batch of allBatches) {
    const grams = parseFloat(batch.remainingGrams);
    const price = parseFloat(batch.lockedPriceUsd);
    totalValue += grams * price;

    switch (batch.balanceBucket) {
      case 'Available':
        availableGrams += grams;
        break;
      case 'Pending':
        pendingGrams += grams;
        break;
      case 'Locked_BNSL':
        lockedBnslGrams += grams;
        break;
      case 'Reserved_Trade':
        reservedTradeGrams += grams;
        break;
    }
  }

  const totalGrams = availableGrams + pendingGrams + lockedBnslGrams + reservedTradeGrams;

  return {
    availableGrams,
    pendingGrams,
    lockedBnslGrams,
    reservedTradeGrams,
    totalGrams,
    weightedAvgPrice: totalGrams > 0 ? totalValue / totalGrams : 0,
    batches: allBatches
  };
}

/**
 * Lock FGPW batches for BNSL
 * Moves batches from Available to Locked_BNSL bucket
 */
export async function lockFpgwForBnsl(
  userId: string,
  goldGrams: number
): Promise<BatchConsumptionResult> {
  const activeBatches = await getActiveBatches(userId, 'Available');
  
  const totalAvailable = activeBatches.reduce(
    (sum, batch) => sum + parseFloat(batch.remainingGrams),
    0
  );

  if (totalAvailable < goldGrams) {
    return {
      success: false,
      consumedBatches: [],
      totalGramsConsumed: 0,
      weightedValueUsd: 0,
      error: `Insufficient FGPW available balance for BNSL lock`
    };
  }

  let remainingToLock = goldGrams;
  const lockedBatches: BatchConsumptionResult['consumedBatches'] = [];
  let weightedValueUsd = 0;

  for (const batch of activeBatches) {
    if (remainingToLock <= 0) break;

    const batchRemaining = parseFloat(batch.remainingGrams);
    const gramsToLock = Math.min(batchRemaining, remainingToLock);
    const lockedPrice = parseFloat(batch.lockedPriceUsd);

    // If partial lock, split the batch
    if (gramsToLock < batchRemaining) {
      // Reduce current batch
      await db
        .update(fpgwBatches)
        .set({
          remainingGrams: (batchRemaining - gramsToLock).toString(),
          updatedAt: new Date()
        })
        .where(eq(fpgwBatches.id, batch.id));

      // Create new locked batch
      await createFpgwBatch({
        userId,
        goldGrams: gramsToLock,
        lockedPriceUsd: lockedPrice,
        sourceType: 'conversion',
        balanceBucket: 'Locked_BNSL',
        notes: `Split from batch ${batch.id} for BNSL lock`
      });
    } else {
      // Lock entire batch
      await db
        .update(fpgwBatches)
        .set({
          balanceBucket: 'Locked_BNSL',
          updatedAt: new Date()
        })
        .where(eq(fpgwBatches.id, batch.id));
    }

    lockedBatches.push({
      batchId: batch.id,
      gramsConsumed: gramsToLock,
      lockedPriceUsd: lockedPrice
    });

    weightedValueUsd += gramsToLock * lockedPrice;
    remainingToLock -= gramsToLock;
  }

  return {
    success: true,
    consumedBatches: lockedBatches,
    totalGramsConsumed: goldGrams,
    weightedValueUsd
  };
}

/**
 * Unlock FGPW batches from BNSL
 * Moves batches from Locked_BNSL back to Available bucket
 */
export async function unlockFpgwFromBnsl(
  userId: string,
  goldGrams: number
): Promise<BatchConsumptionResult> {
  const lockedBatches = await getActiveBatches(userId, 'Locked_BNSL');
  
  const totalLocked = lockedBatches.reduce(
    (sum, batch) => sum + parseFloat(batch.remainingGrams),
    0
  );

  if (totalLocked < goldGrams) {
    return {
      success: false,
      consumedBatches: [],
      totalGramsConsumed: 0,
      weightedValueUsd: 0,
      error: `Insufficient FGPW locked balance for unlock`
    };
  }

  let remainingToUnlock = goldGrams;
  const unlockedBatches: BatchConsumptionResult['consumedBatches'] = [];
  let weightedValueUsd = 0;

  for (const batch of lockedBatches) {
    if (remainingToUnlock <= 0) break;

    const batchRemaining = parseFloat(batch.remainingGrams);
    const gramsToUnlock = Math.min(batchRemaining, remainingToUnlock);
    const lockedPrice = parseFloat(batch.lockedPriceUsd);

    // If partial unlock, split the batch
    if (gramsToUnlock < batchRemaining) {
      // Reduce current locked batch
      await db
        .update(fpgwBatches)
        .set({
          remainingGrams: (batchRemaining - gramsToUnlock).toString(),
          updatedAt: new Date()
        })
        .where(eq(fpgwBatches.id, batch.id));

      // Create new available batch
      await createFpgwBatch({
        userId,
        goldGrams: gramsToUnlock,
        lockedPriceUsd: lockedPrice,
        sourceType: 'conversion',
        balanceBucket: 'Available',
        notes: `Split from batch ${batch.id} for BNSL unlock`
      });
    } else {
      // Unlock entire batch
      await db
        .update(fpgwBatches)
        .set({
          balanceBucket: 'Available',
          updatedAt: new Date()
        })
        .where(eq(fpgwBatches.id, batch.id));
    }

    unlockedBatches.push({
      batchId: batch.id,
      gramsConsumed: gramsToUnlock,
      lockedPriceUsd: lockedPrice
    });

    weightedValueUsd += gramsToUnlock * lockedPrice;
    remainingToUnlock -= gramsToUnlock;
  }

  return {
    success: true,
    consumedBatches: unlockedBatches,
    totalGramsConsumed: goldGrams,
    weightedValueUsd
  };
}

/**
 * Validate that user has sufficient balance for spending
 * SpendGuard - only Available balance can be spent
 */
export async function validateSpendableFpgw(
  userId: string,
  goldGrams: number
): Promise<{ valid: boolean; available: number; error?: string }> {
  const summary = await getFpgwBalanceSummary(userId);

  if (summary.availableGrams >= goldGrams) {
    return { valid: true, available: summary.availableGrams };
  }

  return {
    valid: false,
    available: summary.availableGrams,
    error: `Insufficient FGPW balance. Available: ${summary.availableGrams.toFixed(6)}g, Requested: ${goldGrams.toFixed(6)}g. Pending/Locked gold cannot be spent.`
  };
}

/**
 * Update vault ownership summary with FGPW totals
 */
export async function updateFpgwOwnershipSummary(userId: string): Promise<void> {
  const summary = await getFpgwBalanceSummary(userId);

  await db
    .update(vaultOwnershipSummary)
    .set({
      fpgwAvailableGrams: summary.availableGrams.toString(),
      fpgwPendingGrams: summary.pendingGrams.toString(),
      fpgwLockedBnslGrams: summary.lockedBnslGrams.toString(),
      fpgwReservedTradeGrams: summary.reservedTradeGrams.toString(),
      fpgwWeightedAvgPriceUsd: summary.weightedAvgPrice > 0 ? summary.weightedAvgPrice.toString() : null,
      lastUpdated: new Date()
    })
    .where(eq(vaultOwnershipSummary.userId, userId));
}
