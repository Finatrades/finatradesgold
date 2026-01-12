import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { z } from 'zod';
import crypto from 'crypto';
import { VaultLedgerService } from './vault-ledger-service';
import { createFpgwBatch } from './fpgw-batch-service';
import { db } from './db';

const vaultLedgerService = new VaultLedgerService();

const router = Router();

const listQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  limit: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  status: z.string().optional(),
  txnType: z.string().optional(),
  sourceMethod: z.string().optional(),
  depositMethod: z.string().optional(),
  walletType: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
  toDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
}).transform(data => ({
  ...data,
  pageSize: data.pageSize || data.limit || 25,
  sourceMethod: data.sourceMethod || data.depositMethod,
}));

const createTallySchema = z.object({
  userId: z.string(),
  txnType: z.enum(['FIAT_CRYPTO_DEPOSIT', 'VAULT_GOLD_DEPOSIT']),
  sourceMethod: z.enum(['CARD', 'BANK', 'CRYPTO', 'VAULT_GOLD']),
  walletType: z.enum(['LGPW', 'FGPW']).default('LGPW'),
  depositCurrency: z.string().default('USD'),
  depositAmount: z.string().or(z.number()).transform(v => String(v)),
  feeAmount: z.string().or(z.number()).transform(v => String(v)).optional(),
  notes: z.string().optional(),
});

const wingoldFormSchema = z.object({
  wingoldOrderId: z.string().optional(),
  wingoldSupplierInvoiceId: z.string().optional(),
  wingoldBuyRate: z.string().or(z.number()).transform(v => v ? String(v) : undefined).optional(),
  wingoldCostUsd: z.string().or(z.number()).transform(v => v ? String(v) : undefined).optional(),
  vaultLocation: z.string().optional(),
  goldRateValue: z.string().or(z.number()).transform(v => v ? String(v) : undefined).optional(),
  barLotSerialsJson: z.array(z.object({
    serial: z.string(),
    purity: z.number().default(999.9),
    weightG: z.number(),
    notes: z.string().optional(),
  })).optional(),
});

const certificateSchema = z.object({
  storageCertificateId: z.string(),
  certificateFileUrl: z.string().optional(),
  certificateDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
});

const approveCreditSchema = z.object({
  pricingMode: z.enum(['MARKET', 'FIXED']).default('MARKET'),
  goldRateValue: z.string().or(z.number()).transform(v => String(v)),
  gatewayCostUsd: z.string().or(z.number()).transform(v => String(v)).optional(),
  bankCostUsd: z.string().or(z.number()).transform(v => String(v)).optional(),
  networkCostUsd: z.string().or(z.number()).transform(v => String(v)).optional(),
  opsCostUsd: z.string().or(z.number()).transform(v => String(v)).optional(),
});

const generateBarsSchema = z.object({
  count: z.number().min(1).max(100),
  totalGrams: z.number().optional(),
  perBarGrams: z.number().optional(),
  serialPrefix: z.string().default('WG'),
  year: z.number().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const params = listQuerySchema.parse(req.query);
    const result = await storage.listUnifiedTallyTransactions(params);
    res.json(result);
  } catch (error: any) {
    console.error('Error listing unified tally transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to list transactions' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await storage.getUnifiedTallyStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting unified tally stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
});

// UNIFIED PAYMENT MANAGEMENT - Must be before /:txnId to avoid route collision
router.get('/pending-payments', async (req: Request, res: Response) => {
  try {
    // Filter for only pending payments that haven't been approved yet
    // Exclude terminal statuses: Approved, Confirmed, Rejected, Cancelled
    const terminalStatuses = ['Approved', 'Confirmed', 'Rejected', 'Cancelled', 'Completed'];
    const [cryptoPayments, depositRequests, cardPayments] = await Promise.all([
      storage.getAllCryptoPaymentRequests().then((r: any[]) => r.filter((p: any) => 
        !terminalStatuses.includes(p.status)
      )),
      storage.getAllDepositRequests().then((r: any[]) => r.filter((d: any) => 
        !terminalStatuses.includes(d.status)
      )),
      // Card payments: Captured by N-Genius but not yet credited to wallet (awaiting allocation)
      storage.getAllNgeniusTransactions().then((r: any[]) => r.filter((c: any) => 
        c.status === 'Captured' && !c.walletTransactionId
      )),
    ]);
    
    const pendingPayments: any[] = [];

    for (const cp of cryptoPayments) {
      const user = await storage.getUser(cp.userId);
      pendingPayments.push({
        id: cp.id,
        sourceType: 'CRYPTO',
        sourceTable: 'crypto_payment_requests',
        userId: cp.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userEmail: user?.email || '',
        amountUsd: cp.amountUsd,
        goldGrams: cp.goldGrams,
        goldPriceAtTime: cp.goldPriceAtTime,
        status: cp.status,
        proofUrl: cp.proofImageUrl,
        transactionHash: cp.transactionHash,
        walletType: (cp as any).goldWalletType || 'LGPW',
        createdAt: cp.createdAt,
      });
    }

    for (const dr of depositRequests) {
      const user = await storage.getUser(dr.userId);
      pendingPayments.push({
        id: dr.id,
        sourceType: 'BANK',
        sourceTable: 'deposit_requests',
        userId: dr.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userEmail: user?.email || '',
        amountUsd: dr.amountUsd,
        goldGrams: null,
        goldPriceAtTime: null,
        status: dr.status,
        proofUrl: dr.proofOfPayment,
        referenceNumber: dr.referenceNumber,
        senderBankName: dr.senderBankName,
        walletType: 'LGPW',
        createdAt: dr.createdAt,
      });
    }

    // Card payments (N-Genius): Already verified by gateway, awaiting admin allocation
    for (const card of cardPayments) {
      const user = await storage.getUser(card.userId);
      pendingPayments.push({
        id: card.id,
        sourceType: 'CARD',
        sourceTable: 'ngenius_transactions',
        userId: card.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userEmail: user?.email || '',
        amountUsd: card.amountUsd,
        goldGrams: null,
        goldPriceAtTime: null,
        status: 'Gateway Verified', // N-Genius has verified the payment
        orderReference: card.orderReference,
        ngeniusOrderId: card.ngeniusOrderId,
        cardBrand: card.cardBrand,
        cardLast4: card.cardLast4,
        walletType: card.goldWalletType || 'LGPW',
        createdAt: card.createdAt,
        gatewayVerified: true, // Flag for UI to show verification badge
      });
    }

    pendingPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      payments: pendingPayments,
      counts: {
        crypto: cryptoPayments.length,
        bank: depositRequests.length,
        card: cardPayments.length,
        physical: 0,
        total: pendingPayments.length,
      }
    });
  } catch (error: any) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch pending payments' });
  }
});

router.post('/approve-payment/:sourceType/:id', async (req: Request, res: Response) => {
  try {
    const { sourceType, id } = req.params;
    const { 
      pricingMode: uiPricingMode = 'LIVE',
      manualGoldPrice,
      walletType = 'LGPW',
      vaultLocation = 'Wingold & Metals DMCC',
      notes,
      // Allocation fields (optional)
      wingoldOrderId,
      wingoldInvoiceId,
      physicalGoldAllocatedG,
      wingoldBuyRate,
      storageCertificateId,
    } = req.body;
    const adminUser = (req as any).adminUser;

    // Map UI pricing mode to schema enum
    const pricingMode = uiPricingMode === 'LIVE' ? 'MARKET' : 'FIXED';
    
    // Fetch deposit fee from platform configuration (bank-style: deducted from deposit)
    const depositFeeConfig = await storage.getPlatformFeeByKey('FinaPay', 'deposit_fee');
    const feePercent = depositFeeConfig ? parseFloat(depositFeeConfig.feeValue) : 0.5; // Default 0.5%

    let userId: string = '';
    let amountUsd: number = 0;
    let feeAmountUsd: number = 0;
    let netAmountUsd: number = 0;
    let goldGrams: number = 0;
    let goldPrice: number = 0;
    let paymentReference: string = '';

    // GOLDEN RULE: All payment types REQUIRE allocation data before approval
    const parsedAllocation = physicalGoldAllocatedG ? parseFloat(physicalGoldAllocatedG) : 0;
    if (parsedAllocation <= 0) {
      return res.status(400).json({ 
        error: 'Golden Rule: Physical gold allocation is required before payment approval',
        code: 'GOLDEN_RULE_VIOLATION',
        requiredFields: ['physicalGoldAllocatedG', 'storageCertificateId', 'wingoldOrderId', 'wingoldBuyRate']
      });
    }
    if (!storageCertificateId || !storageCertificateId.trim()) {
      return res.status(400).json({ 
        error: 'Golden Rule: Storage certificate is required before payment approval',
        code: 'GOLDEN_RULE_VIOLATION',
        requiredFields: ['storageCertificateId']
      });
    }
    if (!wingoldOrderId || !wingoldOrderId.trim()) {
      return res.status(400).json({ 
        error: 'Wingold order ID is required before payment approval',
        code: 'MISSING_WINGOLD_ORDER'
      });
    }
    if (!wingoldBuyRate || parseFloat(wingoldBuyRate) <= 0) {
      return res.status(400).json({ 
        error: 'Wingold buy rate is required before payment approval',
        code: 'MISSING_WINGOLD_RATE'
      });
    }

    // Pre-fetch data and validate BEFORE transaction (read-only operations)
    let sourcePayment: any = null;
    
    if (sourceType === 'CRYPTO') {
      const payment = await storage.getCryptoPaymentRequest(id);
      if (!payment) return res.status(404).json({ error: 'Crypto payment not found' });
      if (!['Pending', 'Under Review'].includes(payment.status)) {
        return res.status(400).json({ error: 'Payment already processed' });
      }
      userId = payment.userId;
      amountUsd = Number(payment.amountUsd);
      paymentReference = `CRYPTO-${id.substring(0, 8)}`;
      sourcePayment = payment;

    } else if (sourceType === 'BANK') {
      const deposit = await storage.getDepositRequest(id);
      if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });
      if (deposit.status !== 'Pending') {
        return res.status(400).json({ error: 'Deposit already processed' });
      }
      userId = deposit.userId;
      amountUsd = Number(deposit.amountUsd);
      paymentReference = deposit.referenceNumber;
      sourcePayment = deposit;

    } else if (sourceType === 'CARD') {
      const cardPayment = await storage.getNgeniusTransaction(id);
      if (!cardPayment) return res.status(404).json({ error: 'Card payment not found' });
      if (cardPayment.status !== 'Captured') {
        return res.status(400).json({ error: 'Card payment not in Captured state' });
      }
      if (cardPayment.walletTransactionId) {
        return res.status(400).json({ error: 'Card payment already credited to wallet' });
      }
      userId = cardPayment.userId;
      amountUsd = Number(cardPayment.amountUsd || 0);
      paymentReference = cardPayment.orderReference || `CARD-${id.substring(0, 8)}`;
      sourcePayment = cardPayment;

    } else {
      return res.status(400).json({ error: 'Invalid source type. Use CRYPTO, BANK, or CARD.' });
    }

    // Calculate fees and gold price (outside transaction - read operations)
    feeAmountUsd = amountUsd * (feePercent / 100);
    netAmountUsd = amountUsd - feeAmountUsd;
    
    const { getGoldPricePerGram } = await import('./gold-price-service');
    goldPrice = pricingMode === 'MARKET' ? await getGoldPricePerGram() : Number(manualGoldPrice);
    goldGrams = netAmountUsd / goldPrice;

    // Store original source ID for linking back after UTT creation
    const sourceId = id;
    
    // Use LGPW/FGPW directly (database enum already migrated)
    const dbWalletType = walletType;
    
    // Calculate Wingold cost (buy rate * physical grams)
    const wingoldCostUsd = parsedAllocation * parseFloat(wingoldBuyRate);
    
    // Admin info for audit trail (triggered_by requires valid user ID or null)
    const adminId = adminUser?.id || null;
    const adminName = adminUser?.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : 'System';

    // ONE-STEP APPROVAL: ALL database writes in a single atomic transaction
    const result = await db.transaction(async (tx) => {
      // 0. Update source payment status FIRST (inside transaction for atomicity)
      if (sourceType === 'CRYPTO') {
        await storage.updateCryptoPaymentRequest(id, {
          status: 'Approved',
          reviewNotes: `UTT created. Gold: ${goldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
        }, tx as any);
      } else if (sourceType === 'BANK') {
        await storage.updateDepositRequest(sourcePayment.id, {
          status: 'Confirmed',
          adminNotes: `UTT created. Gold: ${goldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
          processedBy: adminUser?.id,
          processedAt: new Date(),
        }, tx as any);
      }

      // 1. Create UTT with status COMPLETED (final state)
      const tallyRecord = await storage.createUnifiedTallyTransaction({
        userId,
        txnType: 'FIAT_CRYPTO_DEPOSIT',
        sourceMethod: sourceType as 'CRYPTO' | 'BANK' | 'CARD',
        walletType: dbWalletType as 'LGPW' | 'FGPW',
        status: 'COMPLETED', // Final state - everything done in one step
        depositCurrency: 'USD',
        depositAmount: String(amountUsd),
        feeAmount: String(feeAmountUsd.toFixed(2)),
        feeCurrency: 'USD',
        netAmount: String(netAmountUsd.toFixed(2)),
        paymentReference,
        paymentConfirmedAt: new Date(),
        pricingMode: pricingMode as 'MARKET' | 'FIXED',
        goldRateValue: String(goldPrice),
        rateTimestamp: new Date(),
        goldEquivalentG: String(goldGrams),
        goldCreditedG: String(parsedAllocation), // Credited amount = physical allocation
        goldCreditedValueUsd: String(parsedAllocation * goldPrice),
        vaultLocation,
        notes: notes || `One-step approval from ${sourceType}. Fee: ${feePercent}% ($${feeAmountUsd.toFixed(2)}) deducted.`,
        createdBy: adminId || undefined,
        wingoldOrderId,
        wingoldSupplierInvoiceId: wingoldInvoiceId,
        physicalGoldAllocatedG: String(parsedAllocation),
        wingoldBuyRate: String(wingoldBuyRate),
        wingoldCostUsd: String(wingoldCostUsd),
        storageCertificateId,
        approvedBy: adminId || undefined,
        approvedAt: new Date(),
      }, tx as any);

      // 2. Credit wallet immediately
      await vaultLedgerService.creditWalletDeposit({
        userId,
        goldGrams: parsedAllocation,
        goldPriceUsdPerGram: goldPrice,
        walletType: dbWalletType as 'LGPW' | 'FGPW',
        transactionId: tallyRecord.id,
        certificateId: storageCertificateId,
        notes: `Unified Tally Credit: ${parsedAllocation.toFixed(6)}g to ${dbWalletType} wallet from ${sourceType} deposit`,
        createdBy: adminId || undefined,
        tx: tx as any,
      });

      // 2b. Create transaction record for Wallet/Activity display
      await storage.createTransaction({
        userId,
        type: 'Deposit',
        status: 'Completed',
        amountGold: parsedAllocation.toFixed(6),
        amountUsd: String((parsedAllocation * goldPrice).toFixed(2)),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        goldWalletType: dbWalletType,
        description: `${sourceType} deposit: ${parsedAllocation.toFixed(6)}g credited to ${dbWalletType} wallet`,
        sourceModule: 'unified-tally',
        completedAt: new Date(),
      }, tx as any);

      // 3. Create FGPW batch if it's a fixed-price wallet
      if (dbWalletType === 'FGPW') {
        await createFpgwBatch({
          userId,
          goldGrams: parsedAllocation,
          lockedPriceUsd: goldPrice,
          sourceType: 'deposit',
          sourceTransactionId: tallyRecord.id,
          notes: `FPGW batch from ${sourceType} deposit - Certificate: ${storageCertificateId}`,
          tx: tx as any,
        });
      }

      // 4. For CARD payments, mark as linked
      if (sourceType === 'CARD') {
        await storage.updateNgeniusTransaction(sourceId, {
          walletTransactionId: tallyRecord.txnId,
        }, tx as any);
      }

      // 5. Create timeline events (CREATED -> CREDITED -> COMPLETED)
      await storage.createUnifiedTallyEvent({
        tallyId: tallyRecord.id,
        eventType: 'CREATED',
        previousStatus: null,
        newStatus: 'PENDING_PAYMENT',
        details: {
          sourceType,
          amountUsd,
          feeAmountUsd,
          netAmountUsd,
          goldGrams,
          goldPrice,
          message: `Payment received from ${sourceType}`
        } as any,
        triggeredBy: adminId || undefined,
        triggeredByName: adminName,
      }, tx as any);

      await storage.createUnifiedTallyEvent({
        tallyId: tallyRecord.id,
        eventType: 'PHYSICAL_ALLOCATED',
        previousStatus: 'PENDING_PAYMENT',
        newStatus: 'CERT_RECEIVED',
        details: {
          wingoldOrderId,
          physicalGoldAllocatedG: parsedAllocation,
          wingoldBuyRate,
          wingoldCostUsd,
          storageCertificateId,
          vaultLocation,
          message: `Golden Rule satisfied - Wingold allocation confirmed`
        } as any,
        triggeredBy: adminId || undefined,
        triggeredByName: adminName,
      }, tx as any);

      await storage.createUnifiedTallyEvent({
        tallyId: tallyRecord.id,
        eventType: 'CREDITED',
        previousStatus: 'CERT_RECEIVED',
        newStatus: 'CREDITED',
        details: {
          goldCreditedG: parsedAllocation,
          walletType: dbWalletType,
          goldRateValue: goldPrice,
          message: `${parsedAllocation.toFixed(4)}g credited to ${dbWalletType} wallet`
        } as any,
        triggeredBy: adminId || undefined,
        triggeredByName: adminName,
      }, tx as any);

      await storage.createUnifiedTallyEvent({
        tallyId: tallyRecord.id,
        eventType: 'COMPLETED',
        previousStatus: 'CREDITED',
        newStatus: 'COMPLETED',
        details: {
          goldCreditedG: parsedAllocation,
          goldRateValue: goldPrice,
          wingoldOrderId,
          certificateId: storageCertificateId,
          vaultLocation,
          netProfitUsd: amountUsd - wingoldCostUsd,
          message: `Transaction completed - Gold delivered to user wallet`
        } as any,
        triggeredBy: adminId || undefined,
        triggeredByName: adminName,
      }, tx as any);

      // 6. Record Wingold allocation for audit
      await storage.recordWingoldAllocationCredit({
        tallyId: tallyRecord.id,
        userId,
        goldGrams: parsedAllocation,
        wingoldOrderId,
        wingoldInvoiceId: wingoldInvoiceId || null,
        certificateId: storageCertificateId,
        vaultLocation,
        tx: tx as any,
      });

      return tallyRecord;
    });

    // Get updated holdings for response
    const holdingsSnapshot = await storage.getUserHoldingsSnapshot(userId);

    res.json({
      success: true,
      message: `Payment approved & wallet credited! ${parsedAllocation.toFixed(4)}g added to ${dbWalletType} wallet.`,
      tally: {
        id: result.id,
        txnId: result.txnId,
        status: 'COMPLETED',
        goldGrams: parsedAllocation.toFixed(4),
        goldPrice: goldPrice.toFixed(2),
        amountUsd: amountUsd.toFixed(2),
        walletCredited: true,
      },
      holdingsSnapshot,
    });

  } catch (error: any) {
    console.error('Error approving payment:', error);
    res.status(500).json({ error: error.message || 'Failed to approve payment' });
  }
});

router.get('/:txnId', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const events = await storage.getUnifiedTallyEvents(transaction.id);
    const bars = await storage.getWingoldBarsByTally(transaction.id);

    res.json({
      row: transaction,
      events,
      bars,
    });
  } catch (error: any) {
    console.error('Error getting unified tally transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to get transaction' });
  }
});

router.get('/:txnId/events', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const events = await storage.getUnifiedTallyEvents(transaction.id);
    res.json(events);
  } catch (error: any) {
    console.error('Error getting unified tally events:', error);
    res.status(500).json({ error: error.message || 'Failed to get events' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createTallySchema.parse(req.body);
    const user = await storage.getUser(data.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const depositAmount = parseFloat(data.depositAmount);
    const feeAmount = parseFloat(data.feeAmount || '0');
    const netAmount = depositAmount - feeAmount;

    const transaction = await storage.createUnifiedTallyTransaction({
      userId: data.userId,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      txnType: data.txnType,
      sourceMethod: data.sourceMethod,
      walletType: data.walletType,
      depositCurrency: data.depositCurrency,
      depositAmount: String(depositAmount),
      feeAmount: String(feeAmount),
      netAmount: String(netAmount),
      notes: data.notes,
      createdBy: (req as any).user?.id,
    });

    await storage.createUnifiedTallyEvent({
      tallyId: transaction.id,
      eventType: 'CREATED',
      newStatus: 'PENDING_PAYMENT',
      triggeredBy: (req as any).user?.id,
      triggeredByName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'System',
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Error creating unified tally transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to create transaction' });
  }
});

router.post('/:txnId/confirm-payment', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const { paymentReference, confirmedAmount, notes } = req.body;

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ error: 'Transaction is not pending payment' });
    }

    const previousStatus = transaction.status;
    const updated = await storage.updateUnifiedTallyTransaction(txnId, {
      status: 'PAYMENT_CONFIRMED',
      paymentReference,
      paymentConfirmedAt: new Date(),
      notes: notes || transaction.notes,
    });

    await storage.createUnifiedTallyEvent({
      tallyId: transaction.id,
      eventType: 'PAYMENT_CONFIRMED',
      previousStatus,
      newStatus: 'PAYMENT_CONFIRMED',
      details: { paymentReference, confirmedAmount } as any,
      triggeredBy: (req as any).user?.id,
      triggeredByName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Admin',
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm payment' });
  }
});

router.get('/:txnId/wingold-form', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const bars = await storage.getWingoldBarsByTally(transaction.id);
    
    res.json({
      transaction,
      bars,
      formData: {
        wingoldOrderId: transaction.wingoldOrderId,
        wingoldSupplierInvoiceId: transaction.wingoldSupplierInvoiceId,
        wingoldBuyRate: transaction.wingoldBuyRate,
        wingoldCostUsd: transaction.wingoldCostUsd,
        physicalGoldAllocatedG: transaction.physicalGoldAllocatedG,
        vaultLocation: transaction.vaultLocation,
        goldRateValue: transaction.goldRateValue,
        storageCertificateId: transaction.storageCertificateId,
        certificateFileUrl: transaction.certificateFileUrl,
        barLotSerialsJson: transaction.barLotSerialsJson,
      }
    });
  } catch (error: any) {
    console.error('Error getting wingold form:', error);
    res.status(500).json({ error: error.message || 'Failed to get form data' });
  }
});

router.post('/:txnId/place-order', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const { wingoldOrderId, notes } = req.body;

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'PAYMENT_CONFIRMED') {
      return res.status(400).json({ 
        error: 'Payment must be confirmed before placing physical order',
        code: 'INVALID_STATUS'
      });
    }

    const previousStatus = transaction.status;
    const updated = await storage.updateUnifiedTallyTransaction(txnId, {
      status: 'PHYSICAL_ORDERED',
      wingoldOrderId: wingoldOrderId || transaction.wingoldOrderId,
      notes: notes || transaction.notes,
    });

    await storage.createUnifiedTallyEvent({
      tallyId: transaction.id,
      eventType: 'PHYSICAL_ORDERED',
      previousStatus,
      newStatus: 'PHYSICAL_ORDERED',
      details: { wingoldOrderId: wingoldOrderId || 'pending' } as any,
      triggeredBy: (req as any).user?.id,
      triggeredByName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Admin',
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error placing physical order:', error);
    res.status(500).json({ error: error.message || 'Failed to place physical order' });
  }
});

router.post('/:txnId/wingold-form/save-draft', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const data = wingoldFormSchema.parse(req.body);

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    let physicalGoldAllocatedG = '0';
    if (data.barLotSerialsJson && data.barLotSerialsJson.length > 0) {
      physicalGoldAllocatedG = String(
        data.barLotSerialsJson.reduce((sum, bar) => sum + bar.weightG, 0)
      );
    }

    const updated = await storage.updateUnifiedTallyTransaction(txnId, {
      wingoldOrderId: data.wingoldOrderId,
      wingoldSupplierInvoiceId: data.wingoldSupplierInvoiceId,
      wingoldBuyRate: data.wingoldBuyRate,
      wingoldCostUsd: data.wingoldCostUsd,
      vaultLocation: data.vaultLocation,
      goldRateValue: data.goldRateValue,
      barLotSerialsJson: data.barLotSerialsJson,
      physicalGoldAllocatedG,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: error.message || 'Failed to save draft' });
  }
});

router.post('/:txnId/wingold-form/submit', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const data = wingoldFormSchema.parse(req.body);

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Allow submission from PENDING_ALLOCATION (simplified workflow) or PHYSICAL_ORDERED (full workflow)
    if (!['PENDING_ALLOCATION', 'PHYSICAL_ORDERED'].includes(transaction.status)) {
      return res.status(400).json({ 
        error: 'Transaction must be in PENDING_ALLOCATION or PHYSICAL_ORDERED status',
        code: 'INVALID_STATUS',
        currentStatus: transaction.status,
        allowedStatuses: ['PENDING_ALLOCATION', 'PHYSICAL_ORDERED']
      });
    }

    if (!data.barLotSerialsJson || data.barLotSerialsJson.length === 0) {
      return res.status(400).json({ 
        error: 'At least one bar must be allocated',
        code: 'NO_BARS_ALLOCATED'
      });
    }

    const physicalGoldAllocatedG = data.barLotSerialsJson.reduce((sum, bar) => sum + bar.weightG, 0);

    if (!data.vaultLocation) {
      return res.status(400).json({ 
        error: 'Vault location is required',
        code: 'MISSING_VAULT_LOCATION'
      });
    }

    const existingBars = await storage.getWingoldBarsByTally(transaction.id);
    if (existingBars.length > 0) {
    }

    const barsToCreate = data.barLotSerialsJson.map(bar => ({
      tallyId: transaction.id,
      serial: bar.serial,
      purity: String(bar.purity),
      weightG: String(bar.weightG),
      vaultLocation: data.vaultLocation!,
      notes: bar.notes,
    }));

    if (existingBars.length === 0 && barsToCreate.length > 0) {
      await storage.createWingoldBars(barsToCreate);
    }

    const previousStatus = transaction.status;
    const updated = await storage.updateUnifiedTallyTransaction(txnId, {
      wingoldOrderId: data.wingoldOrderId,
      wingoldSupplierInvoiceId: data.wingoldSupplierInvoiceId,
      wingoldBuyRate: data.wingoldBuyRate,
      wingoldCostUsd: data.wingoldCostUsd,
      vaultLocation: data.vaultLocation,
      goldRateValue: data.goldRateValue,
      barLotSerialsJson: data.barLotSerialsJson,
      physicalGoldAllocatedG: String(physicalGoldAllocatedG),
      status: 'PHYSICAL_ALLOCATED',
    });

    await storage.createUnifiedTallyEvent({
      tallyId: transaction.id,
      eventType: 'PHYSICAL_ALLOCATED',
      previousStatus,
      newStatus: 'PHYSICAL_ALLOCATED',
      details: { 
        barsCount: data.barLotSerialsJson.length,
        totalGrams: physicalGoldAllocatedG,
        vaultLocation: data.vaultLocation 
      } as any,
      triggeredBy: (req as any).user?.id,
      triggeredByName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Admin',
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error submitting allocation:', error);
    res.status(500).json({ error: error.message || 'Failed to submit allocation' });
  }
});

router.post('/:txnId/wingold-form/generate-bars', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const data = generateBarsSchema.parse(req.body);

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const serials = await storage.generateWingoldBarSerials(
      data.count, 
      data.serialPrefix, 
      data.year
    );

    let bars;
    if (data.totalGrams) {
      const perBarGrams = data.totalGrams / data.count;
      bars = serials.map((serial, index) => ({
        serial,
        purity: 999.9,
        weightG: parseFloat(perBarGrams.toFixed(6)),
        notes: `Auto-generated bar ${index + 1} of ${data.count}`,
      }));
    } else if (data.perBarGrams) {
      bars = serials.map((serial, index) => ({
        serial,
        purity: 999.9,
        weightG: data.perBarGrams!,
        notes: `Auto-generated bar ${index + 1} of ${data.count}`,
      }));
    } else {
      bars = serials.map((serial, index) => ({
        serial,
        purity: 999.9,
        weightG: 0,
        notes: `Auto-generated bar ${index + 1} of ${data.count}`,
      }));
    }

    res.json({ bars });
  } catch (error: any) {
    console.error('Error generating bars:', error);
    res.status(500).json({ error: error.message || 'Failed to generate bars' });
  }
});

router.post('/:txnId/certificate', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const data = certificateSchema.parse(req.body);

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (!['PHYSICAL_ALLOCATED'].includes(transaction.status)) {
      return res.status(400).json({ 
        error: 'Physical gold must be allocated before attaching certificate',
        code: 'INVALID_STATUS'
      });
    }

    const previousStatus = transaction.status;
    const updated = await storage.updateUnifiedTallyTransaction(txnId, {
      storageCertificateId: data.storageCertificateId,
      certificateFileUrl: data.certificateFileUrl,
      certificateDate: data.certificateDate,
      status: 'CERT_RECEIVED',
    });

    await storage.createUnifiedTallyEvent({
      tallyId: transaction.id,
      eventType: 'CERT_RECEIVED',
      previousStatus,
      newStatus: 'CERT_RECEIVED',
      details: { 
        certificateId: data.storageCertificateId,
        certificateUrl: data.certificateFileUrl 
      } as any,
      triggeredBy: (req as any).user?.id,
      triggeredByName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Admin',
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error attaching certificate:', error);
    res.status(500).json({ error: error.message || 'Failed to attach certificate' });
  }
});

router.post('/:txnId/approve-credit', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const data = approveCreditSchema.parse(req.body);

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'COMPLETED' || transaction.status === 'CREDITED') {
      return res.status(400).json({ 
        error: 'Transaction already credited',
        code: 'ALREADY_CREDITED'
      });
    }

    // Allow from PHYSICAL_ALLOCATED (simplified) or CERT_RECEIVED (full workflow)
    if (!['PHYSICAL_ALLOCATED', 'CERT_RECEIVED'].includes(transaction.status)) {
      return res.status(400).json({ 
        error: 'Transaction must be in PHYSICAL_ALLOCATED or CERT_RECEIVED status',
        code: 'INVALID_STATUS',
        currentStatus: transaction.status,
        allowedStatuses: ['PHYSICAL_ALLOCATED', 'CERT_RECEIVED']
      });
    }

    // Certificate is optional for simplified workflow (PHYSICAL_ALLOCATED status)
    // Required only for full workflow (CERT_RECEIVED status)
    if (transaction.status === 'CERT_RECEIVED' && !transaction.storageCertificateId) {
      return res.status(400).json({ 
        error: 'Storage certificate is required for approval from CERT_RECEIVED status',
        code: 'MISSING_CERTIFICATE'
      });
    }

    const physicalGoldAllocatedG = parseFloat(transaction.physicalGoldAllocatedG || '0');
    if (physicalGoldAllocatedG <= 0) {
      return res.status(400).json({ 
        error: 'Physical gold must be allocated before approval',
        code: 'NO_PHYSICAL_ALLOCATION'
      });
    }

    const goldRateValue = parseFloat(data.goldRateValue);
    const netAmount = parseFloat(transaction.netAmount || '0');
    const goldEquivalentG = netAmount / goldRateValue;
    
    const tolerance = 0.0001;
    if (Math.abs(physicalGoldAllocatedG - goldEquivalentG) > tolerance) {
      return res.status(400).json({ 
        error: 'Physical allocation does not match expected gold grams',
        code: 'PHYSICAL_DIGITAL_MISMATCH',
        details: {
          expectedGrams: goldEquivalentG.toFixed(6),
          allocatedGrams: physicalGoldAllocatedG.toFixed(6),
          difference: Math.abs(physicalGoldAllocatedG - goldEquivalentG).toFixed(6)
        }
      });
    }

    const gatewayCostUsd = parseFloat(data.gatewayCostUsd || '0');
    const bankCostUsd = parseFloat(data.bankCostUsd || '0');
    const networkCostUsd = parseFloat(data.networkCostUsd || '0');
    const opsCostUsd = parseFloat(data.opsCostUsd || '0');
    const totalCostsUsd = gatewayCostUsd + bankCostUsd + networkCostUsd + opsCostUsd;

    const depositAmount = parseFloat(transaction.depositAmount || '0');
    const wingoldCostUsd = parseFloat(transaction.wingoldCostUsd || '0');
    const netProfitUsd = depositAmount - wingoldCostUsd - totalCostsUsd;

    const previousStatus = transaction.status;
    const adminId = (req as any).user?.id || 'system';
    const adminName = (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Admin';

    const result = await db.transaction(async (tx) => {
      await vaultLedgerService.creditWalletDeposit({
        userId: transaction.userId,
        goldGrams: physicalGoldAllocatedG,
        goldPriceUsdPerGram: goldRateValue,
        walletType: transaction.walletType as 'LGPW' | 'FGPW',
        transactionId: transaction.id,
        certificateId: transaction.storageCertificateId || undefined,
        notes: `Unified Tally Credit: ${physicalGoldAllocatedG.toFixed(6)}g to ${transaction.walletType} wallet from ${transaction.sourceMethod} deposit`,
        createdBy: adminId,
        tx: tx as any,
      });

      // Create transaction record for Wallet/Activity display
      await storage.createTransaction({
        userId: transaction.userId,
        type: 'Deposit',
        status: 'Completed',
        amountGold: physicalGoldAllocatedG.toFixed(6),
        amountUsd: String((physicalGoldAllocatedG * goldRateValue).toFixed(2)),
        goldPriceUsdPerGram: goldRateValue.toFixed(2),
        goldWalletType: transaction.walletType,
        description: `${transaction.sourceMethod} deposit: ${physicalGoldAllocatedG.toFixed(6)}g credited to ${transaction.walletType} wallet`,
        sourceModule: 'unified-tally',
        completedAt: new Date(),
      }, tx as any);

      if (transaction.walletType === 'FGPW') {
        await createFpgwBatch({
          userId: transaction.userId,
          goldGrams: physicalGoldAllocatedG,
          lockedPriceUsd: goldRateValue,
          sourceType: 'deposit',
          sourceTransactionId: transaction.id,
          notes: `FGPW batch from ${transaction.sourceMethod} deposit - Certificate: ${transaction.storageCertificateId}`,
          tx: tx as any,
        });
      }

      await storage.createUnifiedTallyEvent({
        tallyId: transaction.id,
        eventType: 'CREDITED',
        previousStatus,
        newStatus: 'CREDITED',
        details: { 
          goldCreditedG: physicalGoldAllocatedG,
          walletType: transaction.walletType,
          action: 'Deposit',
          goldRateValue,
        } as any,
        triggeredBy: adminId,
        triggeredByName: adminName,
      }, tx as any);

      const updated = await storage.updateUnifiedTallyTransaction(txnId, {
        pricingMode: data.pricingMode,
        goldRateValue: String(goldRateValue),
        rateTimestamp: new Date(),
        goldEquivalentG: String(goldEquivalentG),
        goldCreditedG: String(physicalGoldAllocatedG),
        goldCreditedValueUsd: String(physicalGoldAllocatedG * goldRateValue),
        gatewayCostUsd: String(gatewayCostUsd),
        bankCostUsd: String(bankCostUsd),
        networkCostUsd: String(networkCostUsd),
        opsCostUsd: String(opsCostUsd),
        totalCostsUsd: String(totalCostsUsd),
        netProfitUsd: String(netProfitUsd),
        status: 'COMPLETED',
        approvedBy: adminId,
        approvedAt: new Date(),
      }, tx as any);

      await storage.createUnifiedTallyEvent({
        tallyId: transaction.id,
        eventType: 'COMPLETED',
        previousStatus: 'CREDITED',
        newStatus: 'COMPLETED',
        details: { 
          goldCreditedG: physicalGoldAllocatedG,
          goldRateValue,
          totalCostsUsd,
          netProfitUsd,
          wingoldOrderId: transaction.wingoldOrderId,
          certificateId: transaction.storageCertificateId,
          vaultLocation: transaction.vaultLocation,
        } as any,
        triggeredBy: adminId,
        triggeredByName: adminName,
      }, tx as any);

      await storage.recordWingoldAllocationCredit({
        tallyId: transaction.id,
        userId: transaction.userId,
        goldGrams: physicalGoldAllocatedG,
        wingoldOrderId: transaction.wingoldOrderId,
        wingoldInvoiceId: transaction.wingoldSupplierInvoiceId || null,
        certificateId: transaction.storageCertificateId,
        vaultLocation: transaction.vaultLocation,
        tx: tx as any,
      });

      return updated;
    });

    const holdingsSnapshot = await storage.getUserHoldingsSnapshot(transaction.userId);

    res.json({
      transaction: result,
      holdingsSnapshot,
      creditDetails: {
        walletType: transaction.walletType,
        goldCreditedG: physicalGoldAllocatedG,
        goldRateValue,
        ledgerAction: 'Deposit',
        certificateId: transaction.storageCertificateId,
      }
    });
  } catch (error: any) {
    console.error('Error approving credit:', error);
    res.status(500).json({ error: error.message || 'Failed to approve credit' });
  }
});

router.post('/:txnId/reject', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const { rejectionReason } = req.body;

    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot reject a completed transaction',
        code: 'INVALID_STATUS'
      });
    }

    const previousStatus = transaction.status;
    const updated = await storage.updateUnifiedTallyTransaction(txnId, {
      status: 'REJECTED',
      rejectionReason,
    });

    await storage.createUnifiedTallyEvent({
      tallyId: transaction.id,
      eventType: 'REJECTED',
      previousStatus,
      newStatus: 'REJECTED',
      details: { reason: rejectionReason } as any,
      triggeredBy: (req as any).user?.id,
      triggeredByName: (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName}` : 'Admin',
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error rejecting transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to reject transaction' });
  }
});

router.get('/user/:userId/holdings-snapshot', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const snapshot = await storage.getUserHoldingsSnapshot(userId);
    res.json(snapshot);
  } catch (error: any) {
    console.error('Error getting user holdings snapshot:', error);
    res.status(500).json({ error: error.message || 'Failed to get holdings snapshot' });
  }
});

router.get('/:txnId/projection', async (req: Request, res: Response) => {
  try {
    const { txnId } = req.params;
    const transaction = await storage.getUnifiedTallyTransaction(txnId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const currentSnapshot = await storage.getUserHoldingsSnapshot(transaction.userId);
    
    const goldToCredit = parseFloat(transaction.physicalGoldAllocatedG || transaction.goldEquivalentG || '0');
    const goldCredited = parseFloat(transaction.goldCreditedG || '0');
    const goldRateValue = parseFloat(transaction.goldRateValue || '0') || 65;
    const usdEquivalent = goldToCredit * goldRateValue;
    
    const isLGPW = transaction.walletType === 'LGPW';
    
    const isAlreadyApproved = ['APPROVED', 'COMPLETED', 'CREDITED'].includes(transaction.status);
    
    let beforeSnapshot;
    let afterSnapshot;
    
    if (isAlreadyApproved && goldCredited > 0) {
      beforeSnapshot = {
        finapay: {
          mpgw: {
            balanceG: currentSnapshot.finapay.mpgw.balanceG - (isLGPW ? goldCredited : 0),
            usdEquivalent: currentSnapshot.finapay.mpgw.usdEquivalent - (isLGPW ? goldCredited * goldRateValue : 0),
          },
          fpgw: {
            balanceG: currentSnapshot.finapay.fpgw.balanceG - (!isLGPW ? goldCredited : 0),
            usdEquivalent: currentSnapshot.finapay.fpgw.usdEquivalent - (!isLGPW ? goldCredited * goldRateValue : 0),
          },
        },
        finavault: {
          totalG: currentSnapshot.finavault.totalG - goldCredited,
          barsCount: Math.max(0, currentSnapshot.finavault.barsCount - (transaction.barLotSerialsJson?.length || 1)),
        },
        wingold: {
          allocatedTotalGForUser: currentSnapshot.wingold.allocatedTotalGForUser - goldCredited,
          latestCertificateId: currentSnapshot.wingold.latestCertificateId,
        },
      };
      afterSnapshot = currentSnapshot;
    } else {
      beforeSnapshot = currentSnapshot;
      afterSnapshot = {
        finapay: {
          mpgw: {
            balanceG: currentSnapshot.finapay.mpgw.balanceG + (isLGPW ? goldToCredit : 0),
            usdEquivalent: currentSnapshot.finapay.mpgw.usdEquivalent + (isLGPW ? usdEquivalent : 0),
          },
          fpgw: {
            balanceG: currentSnapshot.finapay.fpgw.balanceG + (!isLGPW ? goldToCredit : 0),
            usdEquivalent: currentSnapshot.finapay.fpgw.usdEquivalent + (!isLGPW ? usdEquivalent : 0),
          },
        },
        finavault: {
          totalG: currentSnapshot.finavault.totalG + goldToCredit,
          barsCount: currentSnapshot.finavault.barsCount + (transaction.barLotSerialsJson?.length || 1),
        },
        wingold: {
          allocatedTotalGForUser: currentSnapshot.wingold.allocatedTotalGForUser + goldToCredit,
          latestCertificateId: transaction.storageCertificateId || currentSnapshot.wingold.latestCertificateId,
        },
      };
    }
    
    const projection = {
      current: beforeSnapshot,
      transaction: {
        id: transaction.id,
        walletType: transaction.walletType,
        goldToCredit: isAlreadyApproved ? goldCredited : goldToCredit,
        usdEquivalent: (isAlreadyApproved ? goldCredited : goldToCredit) * goldRateValue,
        sourceMethod: transaction.sourceMethod,
        certificateId: transaction.storageCertificateId,
        status: transaction.status,
      },
      after: afterSnapshot,
      delta: {
        mpgwDeltaG: isLGPW ? (isAlreadyApproved ? goldCredited : goldToCredit) : 0,
        fpgwDeltaG: !isLGPW ? (isAlreadyApproved ? goldCredited : goldToCredit) : 0,
        vaultDeltaG: isAlreadyApproved ? goldCredited : goldToCredit,
        wingoldDeltaG: isAlreadyApproved ? goldCredited : goldToCredit,
      },
      readyToApprove: transaction.status === 'CERT_RECEIVED' && 
                       goldToCredit > 0 && 
                       !!transaction.storageCertificateId,
      isAlreadyApproved,
    };

    res.json(projection);
  } catch (error: any) {
    console.error('Error getting projection:', error);
    res.status(500).json({ error: error.message || 'Failed to get projection' });
  }
});

export default router;
