/**
 * cleanup-orphan-fpgw-batches.ts
 *
 * Two-phase cleanup for orphan fpgw_batches rows identified during Task #8.
 *
 * Phase 1 (targeted): Deletes the two specific orphan rows identified during audit,
 * matched by ID prefix (d482c0ec-* and 533778cd-*). These rows were already removed
 * directly in the DB during the audit; this script provides a deterministic check.
 *
 * Phase 2 (deterministic): Deletes any Active batches with remainingGrams=0
 * (stuck/orphan pattern), then recalculates fpgwAvailableGrams for each
 * affected user from their remaining Active batches.
 *
 * Idempotent — safe to run multiple times.
 */

import { db } from '../db';
import { fpgwBatches, vaultOwnershipSummary } from '../../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

async function cleanupOrphanBatches() {
  console.log('[Cleanup] Starting fpgw_batches orphan remediation (Task #8)...');

  const affectedUserIds = new Set<string>();
  const now = new Date();

  // ── Phase 1: Targeted deletion by ID prefix ──────────────────────────────
  // The two orphan row IDs identified during audit start with d482c0ec and 533778cd.
  // Match by prefix via LIKE to avoid hardcoding fabricated full UUIDs.
  console.log('[Cleanup] Phase 1: checking for prior orphan IDs (d482c0ec-*, 533778cd-*)...');

  const phase1Rows = await db.execute(sql`
    SELECT id, user_id FROM fpgw_batches
    WHERE id LIKE 'd482c0ec%' OR id LIKE '533778cd%'
  `);

  if (phase1Rows.rows.length > 0) {
    for (const row of phase1Rows.rows as { id: string; user_id: string }[]) {
      console.log(`[Cleanup] Phase 1: found orphan id=${row.id} userId=${row.user_id}`);
      affectedUserIds.add(row.user_id);
    }
    await db.execute(sql`
      DELETE FROM fpgw_batches WHERE id LIKE 'd482c0ec%' OR id LIKE '533778cd%'
    `);
    console.log(`[Cleanup] Phase 1: deleted ${phase1Rows.rows.length} prior orphan batch(es).`);
  } else {
    console.log('[Cleanup] Phase 1: prior orphan rows not found (already removed). OK.');
  }

  // ── Phase 2: Deterministic cleanup — Active batches with remainingGrams=0 ─
  console.log('[Cleanup] Phase 2: scanning for Active batches with remainingGrams=0...');

  const stuckResult = await db.execute(sql`
    SELECT id, user_id, original_grams
    FROM fpgw_batches
    WHERE status = 'Active' AND remaining_grams = '0.000000'
  `);
  const stuckRows = stuckResult.rows as { id: string; user_id: string; original_grams: string }[];

  if (stuckRows.length > 0) {
    for (const b of stuckRows) {
      console.log(`[Cleanup] Phase 2: stuck orphan id=${b.id} userId=${b.user_id} original=${b.original_grams}g`);
      affectedUserIds.add(b.user_id);
    }
    await db.execute(sql`
      DELETE FROM fpgw_batches WHERE status = 'Active' AND remaining_grams = '0.000000'
    `);
    console.log(`[Cleanup] Phase 2: deleted ${stuckRows.length} stuck batch(es).`);
  } else {
    console.log('[Cleanup] Phase 2: no stuck Active/zero-remaining batches found. OK.');
  }

  // ── Phase 3: Reconcile fpgwAvailableGrams for all affected users ─────────
  if (affectedUserIds.size === 0) {
    console.log('[Cleanup] Phase 3: no users to reconcile.');
    console.log('[Cleanup] Done. Database is already clean.');
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
