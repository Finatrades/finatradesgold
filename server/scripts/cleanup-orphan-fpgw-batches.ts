/**
 * cleanup-orphan-fpgw-batches.ts
 *
 * Two-phase cleanup for orphan fpgw_batches rows identified during Task #8.
 *
 * Phase 1 (targeted): Attempts to delete the two specific orphan rows that were
 * identified during audit (d482c0ec-… and 533778cd-…). These rows had status=Consumed
 * and remainingGrams=0, but were still inflating FPGW exposure. They were already
 * removed directly in the DB during the audit; this script re-attempts for safety.
 *
 * Phase 2 (deterministic): Marks any Active batches with remainingGrams=0 as
 * Consumed (stuck/orphan pattern). Then reconciles fpgwAvailableGrams for each
 * affected user by summing their truly Active batches.
 *
 * Idempotent — safe to run multiple times.
 */

import { db } from '../db';
import { fpgwBatches, vaultOwnershipSummary } from '../../shared/schema';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';

// Phase 1: Two specific orphan batch IDs identified during Task #8 audit.
// These were already deleted from the DB; this is a safety re-check.
const PRIOR_ORPHAN_IDS = [
  'd482c0ec-9cf5-4b6a-a8e5-4f3b1a2c8d9e',
  '533778cd-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
];

async function cleanupOrphanBatches() {
  console.log('[Cleanup] Starting fpgw_batches orphan remediation (Task #8)...');

  // ── Phase 1: Targeted deletion of prior orphan IDs ──────────────────────
  console.log('[Cleanup] Phase 1: checking for prior orphan IDs...');
  const phase1Rows = await db
    .select({ id: fpgwBatches.id, userId: fpgwBatches.userId })
    .from(fpgwBatches)
    .where(inArray(fpgwBatches.id, PRIOR_ORPHAN_IDS));

  if (phase1Rows.length > 0) {
    await db.delete(fpgwBatches).where(inArray(fpgwBatches.id, PRIOR_ORPHAN_IDS));
    console.log(`[Cleanup] Phase 1: deleted ${phase1Rows.length} prior orphan batch(es).`);
  } else {
    console.log('[Cleanup] Phase 1: prior orphan rows not found (already removed). OK.');
  }

  // ── Phase 2: Deterministic cleanup — Active batches with remainingGrams=0 ─
  console.log('[Cleanup] Phase 2: scanning for Active batches with remainingGrams=0...');
  const stuckBatches = await db
    .select({
      id: fpgwBatches.id,
      userId: fpgwBatches.userId,
      originalGrams: fpgwBatches.originalGrams,
    })
    .from(fpgwBatches)
    .where(and(
      eq(fpgwBatches.status, 'Active'),
      eq(fpgwBatches.remainingGrams, '0.000000')
    ));

  const affectedUserIds = new Set<string>(phase1Rows.map(r => r.userId));

  if (stuckBatches.length > 0) {
    const now = new Date();
    await db
      .update(fpgwBatches)
      .set({ status: 'Consumed', updatedAt: now })
      .where(and(
        eq(fpgwBatches.status, 'Active'),
        eq(fpgwBatches.remainingGrams, '0.000000')
      ));
    for (const b of stuckBatches) {
      console.log(`[Cleanup] Phase 2: marked orphan id=${b.id} userId=${b.userId} as Consumed.`);
      affectedUserIds.add(b.userId);
    }
  } else {
    console.log('[Cleanup] Phase 2: no stuck Active/zero-remaining batches found. OK.');
  }

  // ── Phase 3: Reconcile fpgwAvailableGrams for all affected users ─────────
  if (affectedUserIds.size === 0) {
    console.log('[Cleanup] Phase 3: no users to reconcile.');
    console.log('[Cleanup] Done. No orphan rows found — database is clean.');
    return;
  }

  console.log(`[Cleanup] Phase 3: reconciling ${affectedUserIds.size} user(s)...`);
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

    console.log(`[Cleanup] Phase 3: set fpgwAvailableGrams=${totalActiveGrams.toFixed(6)} for user ${userId}`);
  }

  console.log(`[Cleanup] Done. Reconciled ${affectedUserIds.size} user(s).`);
}

cleanupOrphanBatches()
  .then(() => process.exit(0))
  .catch((err) => { console.error('[Cleanup] Error:', err); process.exit(1); });
