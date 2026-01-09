import { Router, Request, Response } from 'express';
import { db } from './db';
import { 
  users, vaultOwnershipSummary, fpgwBatches, walletConversions, 
  cashSafetyLedger, reconciliationAlerts, platformExposureSnapshots,
  wingoldBarLots
} from '@shared/schema';
import { eq, sql, desc, and, gte, lte, sum } from 'drizzle-orm';

const router = Router();

async function getSessionUser(req: Request): Promise<{ id: string; role: string } | null> {
  if (!req.session?.userId) {
    return null;
  }
  const [user] = await db.select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, req.session.userId))
    .limit(1);
  return user || null;
}

// GET /api/admin/vault-exposure/dashboard - Platform exposure overview
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get current gold price
    const goldPriceRes = await fetch('http://localhost:5000/api/gold-price');
    const goldPriceData = await goldPriceRes.json();
    const goldPricePerGram = goldPriceData?.pricePerGram || 142;

    // Calculate total MPGW exposure
    const mpgwTotals = await db.select({
      totalGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.mpgwAvailableGrams}), 0)`,
      pendingGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.mpgwPendingGrams}), 0)`,
      lockedGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.mpgwLockedBnslGrams}), 0)`,
      reservedGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.mpgwReservedTradeGrams}), 0)`,
      userCount: sql<number>`COUNT(DISTINCT ${vaultOwnershipSummary.userId})`
    }).from(vaultOwnershipSummary);

    // Calculate total FPGW exposure
    const fpgwTotals = await db.select({
      totalGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.fpgwAvailableGrams}), 0)`,
      pendingGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.fpgwPendingGrams}), 0)`,
      lockedGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.fpgwLockedBnslGrams}), 0)`,
      reservedGrams: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.fpgwReservedTradeGrams}), 0)`,
      userCount: sql<number>`COUNT(DISTINCT CASE WHEN ${vaultOwnershipSummary.fpgwAvailableGrams} > 0 THEN ${vaultOwnershipSummary.userId} END)`
    }).from(vaultOwnershipSummary);

    // Get FPGW locked value from active batches
    const fpgwBatchTotals = await db.select({
      totalLockedValue: sql<string>`COALESCE(SUM(${fpgwBatches.remainingGrams} * ${fpgwBatches.lockedPriceUsd}), 0)`,
      totalRemainingGrams: sql<string>`COALESCE(SUM(${fpgwBatches.remainingGrams}), 0)`
    }).from(fpgwBatches).where(eq(fpgwBatches.status, 'Active'));

    // Get physical inventory from Wingold bar lots
    const physicalInventory = await db.select({
      totalGrams: sql<string>`COALESCE(SUM(${wingoldBarLots.weightGrams}), 0)`,
      barCount: sql<number>`COUNT(*)`
    }).from(wingoldBarLots).where(eq(wingoldBarLots.custodyStatus, 'in_vault'));

    // Get cash safety account balance
    const cashBalance = await db.select({
      balance: sql<string>`COALESCE(
        (SELECT running_balance_usd FROM cash_safety_ledger ORDER BY created_at DESC LIMIT 1),
        0
      )`
    }).from(sql`(SELECT 1) AS dummy`);

    // Get pending conversions count
    const pendingConversions = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(walletConversions).where(eq(walletConversions.status, 'pending'));

    // Get active alerts count
    const activeAlerts = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(reconciliationAlerts).where(eq(reconciliationAlerts.isResolved, false));

    // Calculate totals
    const totalMpgwGrams = parseFloat(mpgwTotals[0]?.totalGrams || '0') + 
                           parseFloat(mpgwTotals[0]?.pendingGrams || '0') +
                           parseFloat(mpgwTotals[0]?.lockedGrams || '0') +
                           parseFloat(mpgwTotals[0]?.reservedGrams || '0');
    
    const totalFpgwGrams = parseFloat(fpgwTotals[0]?.totalGrams || '0') +
                           parseFloat(fpgwTotals[0]?.pendingGrams || '0') +
                           parseFloat(fpgwTotals[0]?.lockedGrams || '0') +
                           parseFloat(fpgwTotals[0]?.reservedGrams || '0');

    const physicalGrams = parseFloat(physicalInventory[0]?.totalGrams || '0');
    const cashBalanceUsd = parseFloat(cashBalance[0]?.balance || '0');
    const fpgwLockedValueUsd = parseFloat(fpgwBatchTotals[0]?.totalLockedValue || '0');

    // Calculate coverage ratios
    const mpgwCoverageRatio = totalMpgwGrams > 0 ? (physicalGrams / totalMpgwGrams) * 100 : 100;
    const fpgwCoverageRatio = fpgwLockedValueUsd > 0 ? (cashBalanceUsd / fpgwLockedValueUsd) * 100 : 100;

    res.json({
      timestamp: new Date().toISOString(),
      goldPrice: {
        perGram: goldPricePerGram,
        perOunce: goldPriceData?.pricePerOunce || 4416
      },
      mpgw: {
        totalGrams: totalMpgwGrams.toFixed(6),
        availableGrams: mpgwTotals[0]?.totalGrams || '0',
        pendingGrams: mpgwTotals[0]?.pendingGrams || '0',
        lockedGrams: mpgwTotals[0]?.lockedGrams || '0',
        reservedGrams: mpgwTotals[0]?.reservedGrams || '0',
        valueUsd: (totalMpgwGrams * goldPricePerGram).toFixed(2),
        userCount: mpgwTotals[0]?.userCount || 0
      },
      fpgw: {
        totalGrams: totalFpgwGrams.toFixed(6),
        availableGrams: fpgwTotals[0]?.totalGrams || '0',
        pendingGrams: fpgwTotals[0]?.pendingGrams || '0',
        lockedGrams: fpgwTotals[0]?.lockedGrams || '0',
        reservedGrams: fpgwTotals[0]?.reservedGrams || '0',
        lockedValueUsd: fpgwLockedValueUsd.toFixed(2),
        userCount: fpgwTotals[0]?.userCount || 0
      },
      physical: {
        totalGrams: physicalGrams.toFixed(6),
        valueUsd: (physicalGrams * goldPricePerGram).toFixed(2),
        barCount: physicalInventory[0]?.barCount || 0
      },
      cashSafety: {
        balanceUsd: cashBalanceUsd.toFixed(2)
      },
      coverage: {
        mpgwRatio: mpgwCoverageRatio.toFixed(2),
        mpgwStatus: mpgwCoverageRatio >= 100 ? 'fully_backed' : mpgwCoverageRatio >= 90 ? 'warning' : 'critical',
        fpgwRatio: fpgwCoverageRatio.toFixed(2),
        fpgwStatus: fpgwCoverageRatio >= 100 ? 'fully_backed' : fpgwCoverageRatio >= 90 ? 'warning' : 'critical'
      },
      alerts: {
        activeCount: activeAlerts[0]?.count || 0,
        pendingConversions: pendingConversions[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('[VaultExposure] Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch exposure dashboard' });
  }
});

// GET /api/admin/vault-exposure/conversions - List all conversion requests
router.get('/conversions', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, limit = '50', offset = '0' } = req.query;

    let query = db.select({
      id: walletConversions.id,
      userId: walletConversions.userId,
      direction: walletConversions.direction,
      goldGrams: walletConversions.goldGrams,
      spotPriceUsdPerGram: walletConversions.spotPriceUsdPerGram,
      lockedValueUsd: walletConversions.lockedValueUsd,
      feePercentage: walletConversions.feePercentage,
      feeAmountUsd: walletConversions.feeAmountUsd,
      status: walletConversions.status,
      requestedAt: walletConversions.requestedAt,
      reviewedAt: walletConversions.reviewedAt,
      completedAt: walletConversions.completedAt,
      adminNotes: walletConversions.adminNotes,
      rejectionReason: walletConversions.rejectionReason,
      userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      userEmail: users.email
    })
    .from(walletConversions)
    .leftJoin(users, eq(walletConversions.userId, users.id))
    .orderBy(desc(walletConversions.requestedAt))
    .limit(parseInt(limit as string))
    .offset(parseInt(offset as string));

    if (status && status !== 'all') {
      query = query.where(eq(walletConversions.status, status as any)) as any;
    }

    const conversions = await query;

    // Get counts by status
    const statusCounts = await db.select({
      status: walletConversions.status,
      count: sql<number>`COUNT(*)`
    }).from(walletConversions).groupBy(walletConversions.status);

    res.json({
      conversions,
      counts: statusCounts.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('[VaultExposure] List conversions error:', error);
    res.status(500).json({ error: 'Failed to fetch conversions' });
  }
});

// POST /api/admin/vault-exposure/conversions/:id/approve - Approve a conversion
router.post('/conversions/:id/approve', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { executionPrice, adminNotes } = req.body;

    const [conversion] = await db.select().from(walletConversions).where(eq(walletConversions.id, id));
    
    if (!conversion) {
      return res.status(404).json({ error: 'Conversion not found' });
    }

    if (conversion.status !== 'pending') {
      return res.status(400).json({ error: `Conversion is already ${conversion.status}` });
    }

    const finalPrice = executionPrice || conversion.spotPriceUsdPerGram;
    const goldGrams = parseFloat(conversion.goldGrams);
    const executionValue = goldGrams * parseFloat(finalPrice);

    // Get current cash balance for running balance calculation
    const [lastCashEntry] = await db.select({
      balance: cashSafetyLedger.runningBalanceUsd
    }).from(cashSafetyLedger).orderBy(desc(cashSafetyLedger.createdAt)).limit(1);

    const currentCashBalance = parseFloat(lastCashEntry?.balance || '0');
    let newCashBalance = currentCashBalance;

    // Create cash ledger entry based on direction
    if (conversion.direction === 'MPGW_TO_FPGW') {
      newCashBalance = currentCashBalance + executionValue;
      await db.insert(cashSafetyLedger).values({
        entryType: 'FPGW_LOCK',
        amountUsd: executionValue.toFixed(2),
        direction: 'credit',
        runningBalanceUsd: newCashBalance.toFixed(2),
        conversionId: id,
        userId: conversion.userId,
        createdBy: user.id,
        notes: `MPGW→FPGW conversion: ${goldGrams}g @ $${finalPrice}/g`
      });
    } else {
      newCashBalance = currentCashBalance - executionValue;
      if (newCashBalance < 0) {
        return res.status(400).json({ error: 'Insufficient cash safety balance for this conversion' });
      }
      await db.insert(cashSafetyLedger).values({
        entryType: 'FPGW_UNLOCK',
        amountUsd: executionValue.toFixed(2),
        direction: 'debit',
        runningBalanceUsd: newCashBalance.toFixed(2),
        conversionId: id,
        userId: conversion.userId,
        createdBy: user.id,
        notes: `FPGW→MPGW conversion: ${goldGrams}g @ $${finalPrice}/g`
      });
    }

    // Update the conversion record
    await db.update(walletConversions)
      .set({
        status: 'completed',
        executionPriceUsdPerGram: finalPrice,
        executionValueUsd: executionValue.toFixed(2),
        reviewedAt: new Date(),
        reviewedBy: user.id,
        completedAt: new Date(),
        adminNotes: adminNotes || null,
        updatedAt: new Date()
      })
      .where(eq(walletConversions.id, id));

    // Update user's dual wallet balances
    const [userBalance] = await db.select().from(vaultOwnershipSummary).where(eq(vaultOwnershipSummary.userId, conversion.userId));
    
    if (userBalance) {
      if (conversion.direction === 'MPGW_TO_FPGW') {
        const newMpgw = parseFloat(userBalance.mpgwAvailableGrams) - goldGrams;
        const newFpgw = parseFloat(userBalance.fpgwAvailableGrams) + goldGrams;
        await db.update(vaultOwnershipSummary)
          .set({
            mpgwAvailableGrams: newMpgw.toFixed(6),
            fpgwAvailableGrams: newFpgw.toFixed(6),
            fpgwWeightedAvgPriceUsd: finalPrice,
            lastUpdated: new Date()
          })
          .where(eq(vaultOwnershipSummary.userId, conversion.userId));
      } else {
        const newFpgw = parseFloat(userBalance.fpgwAvailableGrams) - goldGrams;
        const newMpgw = parseFloat(userBalance.mpgwAvailableGrams) + goldGrams;
        await db.update(vaultOwnershipSummary)
          .set({
            fpgwAvailableGrams: newFpgw.toFixed(6),
            mpgwAvailableGrams: newMpgw.toFixed(6),
            lastUpdated: new Date()
          })
          .where(eq(vaultOwnershipSummary.userId, conversion.userId));
      }
    }

    console.log(`[VaultExposure] Conversion ${id} approved by admin ${user.id}`);

    res.json({ 
      success: true, 
      message: 'Conversion approved and processed',
      conversion: {
        id,
        status: 'completed',
        executionPrice: finalPrice,
        executionValue: executionValue.toFixed(2)
      }
    });
  } catch (error) {
    console.error('[VaultExposure] Approve conversion error:', error);
    res.status(500).json({ error: 'Failed to approve conversion' });
  }
});

// POST /api/admin/vault-exposure/conversions/:id/reject - Reject a conversion
router.post('/conversions/:id/reject', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const [conversion] = await db.select().from(walletConversions).where(eq(walletConversions.id, id));
    
    if (!conversion) {
      return res.status(404).json({ error: 'Conversion not found' });
    }

    if (conversion.status !== 'pending') {
      return res.status(400).json({ error: `Conversion is already ${conversion.status}` });
    }

    await db.update(walletConversions)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: user.id,
        rejectionReason: reason || 'Rejected by admin',
        updatedAt: new Date()
      })
      .where(eq(walletConversions.id, id));

    console.log(`[VaultExposure] Conversion ${id} rejected by admin ${user.id}: ${reason}`);

    res.json({ 
      success: true, 
      message: 'Conversion rejected'
    });
  } catch (error) {
    console.error('[VaultExposure] Reject conversion error:', error);
    res.status(500).json({ error: 'Failed to reject conversion' });
  }
});

// GET /api/admin/vault-exposure/cash-ledger - Cash safety account ledger
router.get('/cash-ledger', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = '100', offset = '0' } = req.query;

    const entries = await db.select({
      id: cashSafetyLedger.id,
      entryType: cashSafetyLedger.entryType,
      amountUsd: cashSafetyLedger.amountUsd,
      direction: cashSafetyLedger.direction,
      runningBalanceUsd: cashSafetyLedger.runningBalanceUsd,
      conversionId: cashSafetyLedger.conversionId,
      userId: cashSafetyLedger.userId,
      bankReference: cashSafetyLedger.bankReference,
      notes: cashSafetyLedger.notes,
      createdAt: cashSafetyLedger.createdAt,
      userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      userEmail: users.email
    })
    .from(cashSafetyLedger)
    .leftJoin(users, eq(cashSafetyLedger.userId, users.id))
    .orderBy(desc(cashSafetyLedger.createdAt))
    .limit(parseInt(limit as string))
    .offset(parseInt(offset as string));

    // Get current balance
    const [lastEntry] = await db.select({
      balance: cashSafetyLedger.runningBalanceUsd
    }).from(cashSafetyLedger).orderBy(desc(cashSafetyLedger.createdAt)).limit(1);

    // Get summary stats
    const stats = await db.select({
      totalCredits: sql<string>`COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_usd ELSE 0 END), 0)`,
      totalDebits: sql<string>`COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_usd ELSE 0 END), 0)`,
      entryCount: sql<number>`COUNT(*)`
    }).from(cashSafetyLedger);

    res.json({
      entries,
      currentBalance: lastEntry?.balance || '0',
      stats: {
        totalCredits: stats[0]?.totalCredits || '0',
        totalDebits: stats[0]?.totalDebits || '0',
        entryCount: stats[0]?.entryCount || 0
      }
    });
  } catch (error) {
    console.error('[VaultExposure] Cash ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch cash ledger' });
  }
});

// POST /api/admin/vault-exposure/cash-ledger/manual - Add manual cash entry
router.post('/cash-ledger/manual', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { entryType, amountUsd, direction, bankReference, notes } = req.body;

    if (!['BANK_DEPOSIT', 'BANK_WITHDRAWAL', 'ADJUSTMENT'].includes(entryType)) {
      return res.status(400).json({ error: 'Invalid entry type for manual entry' });
    }

    const amount = parseFloat(amountUsd);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get current balance
    const [lastEntry] = await db.select({
      balance: cashSafetyLedger.runningBalanceUsd
    }).from(cashSafetyLedger).orderBy(desc(cashSafetyLedger.createdAt)).limit(1);

    const currentBalance = parseFloat(lastEntry?.balance || '0');
    const newBalance = direction === 'credit' ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance for this debit' });
    }

    const [entry] = await db.insert(cashSafetyLedger).values({
      entryType,
      amountUsd: amount.toFixed(2),
      direction,
      runningBalanceUsd: newBalance.toFixed(2),
      bankReference: bankReference || null,
      createdBy: user.id,
      notes: notes || null
    }).returning();

    console.log(`[VaultExposure] Manual cash entry by ${user.id}: ${direction} $${amount}`);

    res.json({
      success: true,
      entry,
      newBalance: newBalance.toFixed(2)
    });
  } catch (error) {
    console.error('[VaultExposure] Manual cash entry error:', error);
    res.status(500).json({ error: 'Failed to add cash entry' });
  }
});

// GET /api/admin/vault-exposure/alerts - Get reconciliation alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { resolved = 'false' } = req.query;

    const alerts = await db.select()
      .from(reconciliationAlerts)
      .where(eq(reconciliationAlerts.isResolved, resolved === 'true'))
      .orderBy(desc(reconciliationAlerts.createdAt))
      .limit(100);

    res.json({ alerts });
  } catch (error) {
    console.error('[VaultExposure] Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/admin/vault-exposure/alerts/:id/resolve - Resolve an alert
router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { notes } = req.body;

    await db.update(reconciliationAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: user.id,
        resolutionNotes: notes || null
      })
      .where(eq(reconciliationAlerts.id, id));

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('[VaultExposure] Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// POST /api/admin/vault-exposure/check-reconciliation - Run reconciliation check
router.post('/check-reconciliation', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const alerts: any[] = [];

    // Get current gold price
    const goldPriceRes = await fetch('http://localhost:5000/api/gold-price');
    const goldPriceData = await goldPriceRes.json();
    const goldPricePerGram = goldPriceData?.pricePerGram || 142;

    // Check MPGW vs Physical
    const mpgwTotal = await db.select({
      total: sql<string>`COALESCE(SUM(${vaultOwnershipSummary.mpgwAvailableGrams} + ${vaultOwnershipSummary.mpgwPendingGrams} + ${vaultOwnershipSummary.mpgwLockedBnslGrams} + ${vaultOwnershipSummary.mpgwReservedTradeGrams}), 0)`
    }).from(vaultOwnershipSummary);

    const physicalTotal = await db.select({
      total: sql<string>`COALESCE(SUM(${wingoldBarLots.weightGrams}), 0)`
    }).from(wingoldBarLots).where(eq(wingoldBarLots.custodyStatus, 'in_vault'));

    const mpgwGrams = parseFloat(mpgwTotal[0]?.total || '0');
    const physicalGrams = parseFloat(physicalTotal[0]?.total || '0');

    if (mpgwGrams > physicalGrams) {
      const diff = mpgwGrams - physicalGrams;
      const diffPct = (diff / mpgwGrams) * 100;
      const severity = diffPct > 10 ? 'critical' : diffPct > 5 ? 'warning' : 'info';

      await db.insert(reconciliationAlerts).values({
        alertType: 'MPGW_EXCEEDS_PHYSICAL',
        severity,
        title: 'MPGW Exceeds Physical Inventory',
        message: `Total MPGW (${mpgwGrams.toFixed(4)}g) exceeds physical inventory (${physicalGrams.toFixed(4)}g) by ${diff.toFixed(4)}g (${diffPct.toFixed(2)}%)`,
        expectedValue: mpgwGrams.toFixed(6),
        actualValue: physicalGrams.toFixed(6),
        differenceValue: diff.toFixed(6),
        differencePercentage: diffPct.toFixed(4),
        metadata: { goldPricePerGram }
      });

      alerts.push({ type: 'MPGW_EXCEEDS_PHYSICAL', severity, difference: diff });
    }

    // Check FPGW vs Cash
    const fpgwLockedValue = await db.select({
      total: sql<string>`COALESCE(SUM(${fpgwBatches.remainingGrams} * ${fpgwBatches.lockedPriceUsd}), 0)`
    }).from(fpgwBatches).where(eq(fpgwBatches.status, 'Active'));

    const cashBalance = await db.select({
      balance: cashSafetyLedger.runningBalanceUsd
    }).from(cashSafetyLedger).orderBy(desc(cashSafetyLedger.createdAt)).limit(1);

    const fpgwValueUsd = parseFloat(fpgwLockedValue[0]?.total || '0');
    const cashUsd = parseFloat(cashBalance[0]?.balance || '0');

    if (fpgwValueUsd > cashUsd && fpgwValueUsd > 0) {
      const diff = fpgwValueUsd - cashUsd;
      const diffPct = (diff / fpgwValueUsd) * 100;
      const severity = diffPct > 10 ? 'critical' : diffPct > 5 ? 'warning' : 'info';

      await db.insert(reconciliationAlerts).values({
        alertType: 'FPGW_EXCEEDS_CASH',
        severity,
        title: 'FPGW Value Exceeds Cash Safety Balance',
        message: `Total FPGW locked value ($${fpgwValueUsd.toFixed(2)}) exceeds cash safety balance ($${cashUsd.toFixed(2)}) by $${diff.toFixed(2)} (${diffPct.toFixed(2)}%)`,
        expectedValue: fpgwValueUsd.toFixed(2),
        actualValue: cashUsd.toFixed(2),
        differenceValue: diff.toFixed(2),
        differencePercentage: diffPct.toFixed(4)
      });

      alerts.push({ type: 'FPGW_EXCEEDS_CASH', severity, difference: diff });
    }

    res.json({
      success: true,
      alertsGenerated: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('[VaultExposure] Reconciliation check error:', error);
    res.status(500).json({ error: 'Failed to run reconciliation check' });
  }
});

export default router;
