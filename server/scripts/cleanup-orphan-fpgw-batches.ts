/**
 * cleanup-orphan-fpgw-batches.ts
 *
 * Removes orphan fpgw_batches rows identified during Task #8 (Dual Wallet simplification).
 * Orphan criteria: status = 'Active' AND remainingGrams = '0.000000'
 * These rows should have been marked 'Consumed' but got stuck, causing ghost FPGW exposure.
 *
 * After removal it recalculates fpgwAvailableGrams for each affected user
 * from the remaining Active batch rows.
 *
 * This script is idempotent — if no orphan rows exist it exits cleanly.
 */

import { db } from '../db';
import { fpgwBatches, vaultOwnershipSummary } from '../../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

async function cleanupOrphanBatches() {
  console.log('[Cleanup] Starting orphan fpgw_batches cleanup...');
  console.log('[Cleanup] Criteria: status=Active AND remainingGrams=0.000000');

  // Find orphan rows: Active status but zero remaining grams (stuck/not consumed)
  const orphans = await db
    .select({
      id: fpgwBatches.id,
      userId: fpgwBatches.userId,
      status: fpgwBatches.status,
      originalGrams: fpgwBatches.originalGrams,
      remainingGrams: fpgwBatches.remainingGrams,
    })
    .from(fpgwBatches)
    .where(and(
      eq(fpgwBatches.status, 'Active'),
      eq(fpgwBatches.remainingGrams, '0.000000')
    ));

  if (orphans.length === 0) {
    console.log('[Cleanup] No orphan rows found. Nothing to do.');
    return;
  }

  const affectedUserIds = new Set<string>();
  for (const b of orphans) {
    console.log(`[Cleanup] Found orphan: id=${b.id} userId=${b.userId} original=${b.originalGrams}g remaining=${b.remainingGrams}`);
    affectedUserIds.add(b.userId);
  }

  // Mark orphans as Consumed (safer than deletion — preserves audit trail)
  const now = new Date();
  await db
    .update(fpgwBatches)
    .set({ status: 'Consumed', updatedAt: now })
    .where(and(
      eq(fpgwBatches.status, 'Active'),
      eq(fpgwBatches.remainingGrams, '0.000000')
    ));
  console.log(`[Cleanup] Marked ${orphans.length} orphan batch(es) as Consumed.`);

  // Recalculate fpgwAvailableGrams for each affected user from remaining Active batches
  for (const userId of affectedUserIds) {
    const activeBatches = await db
      .select({ remainingGrams: fpgwBatches.remainingGrams })
      .from(fpgwBatches)
      .where(and(
        eq(fpgwBatches.userId, userId),
        eq(fpgwBatches.status, 'Active')
      ));

    const totalActiveGrams = activeBatches.reduce(
      (sum, b) => sum + parseFloat(b.remainingGrams), 0
    );

    await db
      .update(vaultOwnershipSummary)
      .set({ fpgwAvailableGrams: totalActiveGrams.toFixed(6) })
      .where(eq(vaultOwnershipSummary.userId, userId));

    console.log(`[Cleanup] Reconciled fpgwAvailableGrams for user ${userId}: ${totalActiveGrams.toFixed(6)}g`);
  }

  console.log(`[Cleanup] Done. Fixed ${orphans.length} row(s), reconciled ${affectedUserIds.size} user(s).`);
}

cleanupOrphanBatches()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
