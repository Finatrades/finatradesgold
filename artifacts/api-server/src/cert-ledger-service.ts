import type { Certificate, InsertCertificateEvent } from "@shared/schema";
import type { IStorage } from "./storage";

export type DeductReason = 'P2P_SEND' | 'BNSL_TRANSFER' | 'FINABRIDGE_FUND' | 'SELL' | 'SWAP';
export type RestoreReason = 'BNSL_MATURITY' | 'BNSL_EARLY_TERMINATION' | 'FINABRIDGE_RELEASE';

export interface DeductParams {
  userId: string;
  gramsToDeduct: number;
  reason: DeductReason;
  transactionId: string;
  notes?: string;
}

export interface RestoreParams {
  userId: string;
  gramsToRestore: number;
  reason: RestoreReason;
  transactionId: string;
  originalCertificateId?: string;
  notes?: string;
}

export interface DeductResult {
  affectedCerts: { certId: string; gramsBefore: number; gramsAfter: number }[];
  totalDeducted: number;
}

export interface RestoreResult {
  certId: string;
  gramsBefore: number;
  gramsAfter: number;
}

function getEffectiveRemaining(cert: Certificate): number {
  return cert.remainingGrams ? parseFloat(cert.remainingGrams) : parseFloat(cert.goldGrams);
}

export async function deductFromCerts(
  storage: IStorage,
  params: DeductParams
): Promise<DeductResult> {
  const { userId, gramsToDeduct, reason, transactionId, notes } = params;

  const spendableCerts = await storage.getSpendableCertsByUser(userId);
  if (spendableCerts.length === 0) {
    console.warn(`[CertLedger] No spendable certs for user ${userId}, skipping cert deduction for ${gramsToDeduct}g`);
    return { affectedCerts: [], totalDeducted: 0 };
  }

  let remaining = gramsToDeduct;
  const affectedCerts: DeductResult['affectedCerts'] = [];

  for (const cert of spendableCerts) {
    if (remaining <= 0.000001) break;

    const certRemaining = getEffectiveRemaining(cert);
    const toDeduct = Math.min(remaining, certRemaining);
    const newRemaining = certRemaining - toDeduct;
    const isFullSurrender = newRemaining < 0.000001;

    await storage.updateCertificate(cert.id, {
      remainingGrams: newRemaining.toFixed(6),
      ...(isFullSurrender ? { status: 'Transferred' as const } : {}),
    });

    const eventData: InsertCertificateEvent = {
      certificateId: cert.id,
      eventType: isFullSurrender ? 'FULL_SURRENDER' : 'PARTIAL_SURRENDER',
      gramsAffected: toDeduct.toFixed(6),
      gramsBefore: certRemaining.toFixed(6),
      gramsAfter: newRemaining.toFixed(6),
      transactionId,
      notes: notes || `${reason}: ${toDeduct.toFixed(6)}g deducted`,
      createdBy: 'system',
    };
    await storage.createCertificateEvent(eventData);

    affectedCerts.push({
      certId: cert.id,
      gramsBefore: certRemaining,
      gramsAfter: newRemaining,
    });

    remaining -= toDeduct;
    console.log(`[CertLedger] ${reason}: Deducted ${toDeduct.toFixed(6)}g from cert ${cert.certificateNumber} (${certRemaining.toFixed(6)}g → ${newRemaining.toFixed(6)}g)`);
  }

  if (remaining > 0.000001) {
    console.warn(`[CertLedger] WARNING: Could not fully deduct ${gramsToDeduct}g for user ${userId}. Remaining: ${remaining.toFixed(6)}g across ${spendableCerts.length} certs`);
  }

  return { affectedCerts, totalDeducted: gramsToDeduct - remaining };
}

export async function restoreToCert(
  storage: IStorage,
  params: RestoreParams
): Promise<RestoreResult | null> {
  const { userId, gramsToRestore, reason, transactionId, originalCertificateId, notes } = params;

  let targetCert: Certificate | undefined;

  if (originalCertificateId) {
    targetCert = await storage.getCertificate(originalCertificateId);
    if (targetCert && targetCert.userId !== userId) {
      targetCert = undefined;
    }
  }

  if (!targetCert) {
    const activeCerts = await storage.getSpendableCertsByUser(userId);
    targetCert = activeCerts[0];
  }

  if (!targetCert) {
    console.warn(`[CertLedger] No active cert to restore ${gramsToRestore}g to for user ${userId}. Gold returned to wallet only.`);
    return null;
  }

  const currentRemaining = getEffectiveRemaining(targetCert);
  const originalGold = parseFloat(targetCert.goldGrams);
  const newRemaining = Math.min(currentRemaining + gramsToRestore, originalGold);
  const actualRestored = newRemaining - currentRemaining;

  await storage.updateCertificate(targetCert.id, {
    remainingGrams: newRemaining.toFixed(6),
    ...(targetCert.status !== 'Active' ? { status: 'Active' as const } : {}),
  });

  const eventData: InsertCertificateEvent = {
    certificateId: targetCert.id,
    eventType: 'UPDATED',
    gramsAffected: actualRestored.toFixed(6),
    gramsBefore: currentRemaining.toFixed(6),
    gramsAfter: newRemaining.toFixed(6),
    transactionId,
    notes: notes || `${reason}: ${gramsToRestore.toFixed(6)}g restored`,
    createdBy: 'system',
  };
  await storage.createCertificateEvent(eventData);

  console.log(`[CertLedger] ${reason}: Restored ${gramsToRestore.toFixed(6)}g to cert ${targetCert.certificateNumber} (${currentRemaining.toFixed(6)}g → ${newRemaining.toFixed(6)}g)`);

  return {
    certId: targetCert.id,
    gramsBefore: currentRemaining,
    gramsAfter: newRemaining,
  };
}

export async function reconcileUserPosition(
  storage: IStorage,
  userId: string,
  walletGrams: number
): Promise<{ match: boolean; certGrams: number; walletGrams: number; diff: number }> {
  const certGrams = await storage.getActiveDOCGramsByUser(userId);
  const diff = Math.abs(walletGrams - certGrams);
  const match = diff < 0.000001;

  if (!match) {
    console.warn(`[CertLedger] MISMATCH for user ${userId}: wallet=${walletGrams.toFixed(6)}g, certs=${certGrams.toFixed(6)}g, diff=${diff.toFixed(6)}g`);
  }

  return { match, certGrams, walletGrams, diff };
}

export async function backfillRemainingGrams(storage: IStorage): Promise<number> {
  const allCerts = await storage.getAllCertificates();
  const activeDocs = allCerts.filter(c =>
    c.status === 'Active' &&
    (c.type === 'Digital Ownership' || c.type === 'Physical Storage') &&
    c.remainingGrams === null
  );

  if (activeDocs.length === 0) {
    console.log('[CertLedger] No certs need remaining_grams backfill');
    return 0;
  }

  const userIds = [...new Set(activeDocs.map(c => c.userId))];
  let updated = 0;

  for (const userId of userIds) {
    const wallet = await storage.getWallet(userId);
    if (!wallet) continue;

    const walletGrams = parseFloat(wallet.goldGrams);
    const userCerts = activeDocs.filter(c => c.userId === userId);

    const totalCertGrams = userCerts.reduce((sum, c) => sum + parseFloat(c.goldGrams), 0);

    if (totalCertGrams <= 0) continue;

    const ratio = Math.min(walletGrams / totalCertGrams, 1);

    for (const cert of userCerts) {
      const originalGrams = parseFloat(cert.goldGrams);
      const adjustedRemaining = (originalGrams * ratio).toFixed(6);

      await storage.updateCertificate(cert.id, {
        remainingGrams: adjustedRemaining,
      });

      if (parseFloat(adjustedRemaining) < originalGrams - 0.000001) {
        await storage.createCertificateEvent({
          certificateId: cert.id,
          eventType: 'UPDATED',
          gramsAffected: (originalGrams - parseFloat(adjustedRemaining)).toFixed(6),
          gramsBefore: originalGrams.toFixed(6),
          gramsAfter: adjustedRemaining,
          notes: `Backfill: remaining_grams initialized from wallet balance (ratio: ${ratio.toFixed(6)})`,
          createdBy: 'system',
        });
      }

      updated++;
      console.log(`[CertLedger] Backfill: cert ${cert.certificateNumber} → remaining_grams=${adjustedRemaining} (original: ${originalGrams}g, wallet: ${walletGrams}g)`);
    }
  }

  console.log(`[CertLedger] Backfill complete: ${updated} certs updated across ${userIds.length} users`);
  return updated;
}
