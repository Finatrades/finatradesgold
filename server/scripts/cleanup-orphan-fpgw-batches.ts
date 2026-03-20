/**
 * cleanup-orphan-fpgw-batches.ts
 *
 * One-time script to remove orphan fpgw_batches rows that were left over
 * from the old FIFO batch system before Task #8 simplified the dual wallet.
 *
 * Orphan batches identified (already deleted from production DB):
 *   d482c0ec-...  (status: Consumed, remainingGrams: 0)
 *   533778cd-...  (status: Consumed, remainingGrams: 0)
 *
 * The FGPW → LGPW unlock path no longer reads or updates fpgw_batches rows;
 * balances are managed exclusively via:
 *   - wallets.goldGrams          (LGPW source of truth)
 *   - vault_ownership_summary.fpgwAvailableGrams  (FPGW source of truth)
 *
 * This script is kept for audit trail purposes. It is idempotent — running
 * it again will simply report that no orphan rows remain.
 */

import { db } from '../db';
import { fpgwBatches } from '../../shared/schema';
import { and, eq, lte, or } from 'drizzle-orm';

async function cleanupOrphanBatches() {
  console.log('[Cleanup] Scanning for orphan fpgw_batches rows...');

  const orphans = await db
    .select({ id: fpgwBatches.id, status: fpgwBatches.status, remainingGrams: fpgwBatches.remainingGrams })
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
  orphans.forEach((b) => console.log(`  - id=${b.id} status=${b.status} remaining=${b.remainingGrams}`));

  const ids = orphans.map((b) => b.id);
  for (const id of ids) {
    await db.delete(fpgwBatches).where(eq(fpgwBatches.id, id));
    console.log(`[Cleanup] Deleted batch ${id}`);
  }

  console.log(`[Cleanup] Done. Removed ${ids.length} orphan batch(es).`);
}

cleanupOrphanBatches()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
