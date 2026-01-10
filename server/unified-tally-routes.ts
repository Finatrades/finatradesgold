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
  walletType: z.enum(['MPGW', 'FPGW']).default('MPGW'),
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
        walletType: transaction.walletType as 'MPGW' | 'FPGW',
        transactionId: transaction.id,
        certificateId: transaction.storageCertificateId || undefined,
        notes: `Unified Tally Credit: ${physicalGoldAllocatedG.toFixed(6)}g to ${transaction.walletType} wallet from ${transaction.sourceMethod} deposit`,
        createdBy: adminId,
        tx: tx as any,
      });

      if (transaction.walletType === 'FPGW') {
        await createFpgwBatch({
          userId: transaction.userId,
          goldGrams: physicalGoldAllocatedG,
          lockedPriceUsd: goldRateValue,
          sourceType: 'deposit',
          sourceTransactionId: transaction.id,
          notes: `FPGW batch from ${transaction.sourceMethod} deposit - Certificate: ${transaction.storageCertificateId}`,
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
        certificateId: transaction.storageCertificateId,
        vaultLocation: transaction.vaultLocation,
        barLotSerialsJson: transaction.barLotSerialsJson,
        creditedAt: new Date(),
        creditedBy: adminId,
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
    const goldRateValue = parseFloat(transaction.goldRateValue || '0') || 65; // Default rate if not set
    const usdEquivalent = goldToCredit * goldRateValue;
    
    const isMPGW = transaction.walletType === 'MPGW';
    
    const projection = {
      current: currentSnapshot,
      transaction: {
        id: transaction.id,
        walletType: transaction.walletType,
        goldToCredit,
        usdEquivalent,
        sourceMethod: transaction.sourceMethod,
        certificateId: transaction.storageCertificateId,
        status: transaction.status,
      },
      after: {
        finapay: {
          mpgw: {
            balanceG: currentSnapshot.finapay.mpgw.balanceG + (isMPGW ? goldToCredit : 0),
            usdEquivalent: currentSnapshot.finapay.mpgw.usdEquivalent + (isMPGW ? usdEquivalent : 0),
          },
          fpgw: {
            balanceG: currentSnapshot.finapay.fpgw.balanceG + (!isMPGW ? goldToCredit : 0),
            usdEquivalent: currentSnapshot.finapay.fpgw.usdEquivalent + (!isMPGW ? usdEquivalent : 0),
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
      },
      delta: {
        mpgwDeltaG: isMPGW ? goldToCredit : 0,
        fpgwDeltaG: !isMPGW ? goldToCredit : 0,
        vaultDeltaG: goldToCredit,
        wingoldDeltaG: goldToCredit,
      },
      readyToApprove: transaction.status === 'CERT_RECEIVED' && 
                       goldToCredit > 0 && 
                       !!transaction.storageCertificateId,
    };

    res.json(projection);
  } catch (error: any) {
    console.error('Error getting projection:', error);
    res.status(500).json({ error: error.message || 'Failed to get projection' });
  }
});

export default router;
