/**
 * cleanup-orphan-fpgw-batches.ts
 *
 * One-time script targeting two specific orphan fpgw_batches rows identified
 * during Task #8 (Dual Wallet simplification). These rows had status: Consumed
 * and remainingGrams: 0, leaving ghost entries that inflated FPGW exposure.
 *
 * After removal it recalculates fpgwAvailableGrams for each affected user
 * from the remaining Active batch rows.
 *
 * This script is idempotent — if the target rows are already gone it exits cleanly.
 */

import { db } from '../db';
import { fpgwBatches, vaultOwnershipSummary } from '../../shared/schema';
import { and, eq, inArray } from 'drizzle-orm';

// Exact orphan batch IDs identified during Task #8 audit
const ORPHAN_IDS = [
  'd482c0ec-0000-0000-0000-000000000000', // placeholder — replace with actual UUIDs
  '533778cd-0000-0000-0000-000000000000', // placeholder — replace with actual UUIDs
];

async function cleanupOrphanBatches() {
  console.log('[Cleanup] Starting targeted orphan fpgw_batches cleanup...');
  console.log('[Cleanup] Targeting batch IDs:', ORPHAN_IDS);

  // Find only the specific orphan rows (already Consumed/zero-remaining)
  const orphans = await db
    .select({
      id: fpgwBatches.id,
      userId: fpgwBatches.userId,
      status: fpgwBatches.status,
      remainingGrams: fpgwBatches.remainingGrams,
    })
    .from(fpgwBatches)
    .where(inArray(fpgwBatches.id, ORPHAN_IDS));

  if (orphans.length === 0) {
    console.log('[Cleanup] No orphan rows found (already deleted or IDs differ). Nothing to do.');
    return;
  }

  const affectedUserIds = new Set<string>();
  for (const b of orphans) {
    console.log(`[Cleanup] Found orphan: id=${b.id} userId=${b.userId} status=${b.status} remaining=${b.remainingGrams}`);
    affectedUserIds.add(b.userId);
  }

  // Delete only the targeted rows
  await db.delete(fpgwBatches).where(inArray(fpgwBatches.id, ORPHAN_IDS));
  console.log(`[Cleanup] Deleted ${orphans.length} orphan batch(es).`);

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

  console.log(`[Cleanup] Done. Removed ${orphans.length} row(s), reconciled ${affectedUserIds.size} user(s).`);
}

cleanupOrphanBatches()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
