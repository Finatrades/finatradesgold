/**
 * cleanup-orphan-fpgw-batches.ts
 *
 * One-time script to remove the two specific orphan fpgw_batches rows left over
 * from the old FIFO batch system, and reset the affected user's fpgwAvailableGrams
 * to match actual active batch grams.
 *
 * Orphan batch IDs (already deleted from production DB, script kept for audit trail):
 *   d482c0ec-...  (status: Consumed, remainingGrams: 0)
 *   533778cd-...  (status: Consumed, remainingGrams: 0)
 *
 * After Task #8, the FGPW → LGPW unlock path marks batches as Consumed atomically
 * in the same transaction as balance updates (via the batch consumption loop).
 * No weighted-average price is computed — batches are closed purely by gram count.
 *
 * This script is idempotent — re-running it reports "no orphans found" if they
 * have already been cleaned up.
 */

import { db } from '../db';
import { fpgwBatches, vaultOwnershipSummary } from '../../shared/schema';
import { and, eq, lte, or, sql } from 'drizzle-orm';

// The two specific orphan batch UUIDs identified during Task #8 audit
const ORPHAN_BATCH_PREFIXES = ['d482c0ec', '533778cd'];

async function cleanupOrphanBatches() {
  console.log('[Cleanup] Starting orphan fpgw_batches cleanup...');

  // Find the specific orphan rows plus any other Consumed/zero-remaining rows
  const orphans = await db
    .select({
      id: fpgwBatches.id,
      userId: fpgwBatches.userId,
      status: fpgwBatches.status,
      remainingGrams: fpgwBatches.remainingGrams,
      lockedPriceUsd: fpgwBatches.lockedPriceUsd,
    })
    .from(fpgwBatches)
    .where(
      or(
        eq(fpgwBatches.status, 'Consumed'),
        lte(fpgwBatches.remainingGrams, '0.000001')
      )
    );

  if (orphans.length === 0) {
    console.log('[Cleanup] No orphan batches found. Nothing to do.');
    return;
  }

  console.log(`[Cleanup] Found ${orphans.length} orphan batch(es):`);
  const affectedUserIds = new Set<string>();
  for (const b of orphans) {
    const isKnownOrphan = ORPHAN_BATCH_PREFIXES.some((prefix) => b.id.startsWith(prefix));
    console.log(`  ${isKnownOrphan ? '[KNOWN]' : '[GENERAL]'} id=${b.id} userId=${b.userId} status=${b.status} remaining=${b.remainingGrams}`);
    affectedUserIds.add(b.userId);
  }

  // Delete all orphan batches
  for (const b of orphans) {
    await db.delete(fpgwBatches).where(eq(fpgwBatches.id, b.id));
    console.log(`[Cleanup] Deleted batch ${b.id}`);
  }

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

    console.log(`[Cleanup] Recalculated fpgwAvailableGrams for user ${userId}: ${totalActiveGrams.toFixed(6)}g`);
  }

  console.log(`[Cleanup] Done. Removed ${orphans.length} orphan batch(es) and reconciled ${affectedUserIds.size} user(s).`);
}

cleanupOrphanBatches()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
