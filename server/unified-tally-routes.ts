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
    // UNIFIED ARCHITECTURE: All payments now flow through deposit_requests
    // Crypto/Card payments create deposit_requests with appropriate paymentMethod
    // But we also need to show LEGACY crypto_payment_requests that are still pending
    const depositRequests = await storage.getAllDepositRequests().then((r: any[]) => r.filter((d: any) => 
      !terminalStatuses.includes(d.status)
    ));
    
    // LEGACY SUPPORT: Fetch pending crypto payments from legacy table
    // These are real customer payments that were created before unified architecture
    const cryptoPayments = await storage.getAllCryptoPaymentRequests().then((r: any[]) => r.filter((c: any) => 
      !terminalStatuses.includes(c.status) && c.status !== 'Confirmed'
    ));
    const cardPayments: any[] = [];
    
    // Fetch physical deposits ready for UFM approval
    const physicalDeposits = await storage.getAllPhysicalDeposits().then((r: any[]) => r.filter((d: any) => 
      d.status === 'READY_FOR_PAYMENT'
    ));
    
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
        sourceType: 'BANK', // All deposit_requests use BANK sourceType for unified approval
        sourceTable: 'deposit_requests',
        userId: dr.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userEmail: user?.email || '',
        amountUsd: dr.amountUsd,
        goldGrams: dr.expectedGoldGrams || null,
        goldPriceAtTime: dr.priceSnapshotUsdPerGram || null,
        status: dr.status,
        proofUrl: dr.proofOfPayment,
        referenceNumber: dr.referenceNumber,
        senderBankName: dr.senderBankName,
        walletType: dr.goldWalletType || 'LGPW',
        createdAt: dr.createdAt,
        // UNIFIED ARCHITECTURE: Include payment method for admin display
        paymentMethod: dr.paymentMethod || 'Bank Transfer',
        // Crypto-specific fields
        cryptoTransactionHash: dr.cryptoTransactionHash || null,
        cryptoNetwork: dr.cryptoNetwork || null,
        // Card-specific fields
        cardTransactionRef: dr.cardTransactionRef || null,
        cardPaymentStatus: dr.cardPaymentStatus || null,
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

    // Physical gold deposits: Already inspected at vault, ready for UFM final approval
    for (const pd of physicalDeposits) {
      const user = await storage.getUser(pd.userId);
      // Get full inspection data
      const inspection = await storage.getDepositInspection(pd.id);
      const creditedGrams = inspection?.creditedGrams ? parseFloat(inspection.creditedGrams) : 0;
      
      pendingPayments.push({
        id: pd.id,
        sourceType: 'PHYSICAL',
        sourceTable: 'physical_deposit_requests',
        userId: pd.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userEmail: user?.email || '',
        amountUsd: pd.usdAgreedValue || null, // May have agreed USD value from negotiation
        goldGrams: creditedGrams.toString(),
        goldPriceAtTime: null, // Will be set during UFM approval
        status: 'Ready for Payment',
        referenceNumber: pd.referenceNumber,
        depositType: pd.requiresNegotiation ? 'RAW/OTHER' : 'GOLD_BAR/COIN',
        deliveryMethod: pd.deliveryMethod,
        walletType: 'LGPW', // Physical deposits always go to LGPW
        createdAt: pd.createdAt,
        vaultInspected: true, // Flag to show inspection completed
        // Include full inspection data for UFM display
        inspectionData: inspection ? {
          grossWeightGrams: inspection.grossWeightGrams,
          netWeightGrams: inspection.netWeightGrams,
          purityResult: inspection.purityResult,
          assayFeeUsd: inspection.assayFeeUsd,
          refiningFeeUsd: inspection.refiningFeeUsd,
          handlingFeeUsd: inspection.handlingFeeUsd,
          creditedGrams: inspection.creditedGrams,
          totalFeesUsd: inspection.totalFeesUsd,
          inspectorNotes: inspection.inspectorNotes,
          assayMethod: inspection.assayMethod,
          inspectedAt: inspection.inspectedAt,
        } : null,
      });
    }

    pendingPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // UNIFIED ARCHITECTURE: Calculate counts by payment method from deposit_requests
    const cryptoCount = depositRequests.filter((d: any) => d.paymentMethod === 'Crypto').length;
    const bankCount = depositRequests.filter((d: any) => d.paymentMethod === 'Bank Transfer' || !d.paymentMethod).length;
    const cardCount = depositRequests.filter((d: any) => d.paymentMethod === 'Card Payment').length;
    const physicalCount = physicalDeposits.length;

    res.json({
      payments: pendingPayments,
      counts: {
        crypto: cryptoCount,
        bank: bankCount,
        card: cardCount,
        physical: physicalCount,
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
    
    // Get admin user from session (fix: adminUser was not being set by middleware)
    const session = (req as any).session;
    const adminUserId = session?.userId;
    const adminUser = adminUserId ? await storage.getUser(adminUserId) : null;

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
      // UNIFIED ARCHITECTURE: BANK sourceType handles ALL deposit_requests
      // Including Bank Transfer, Crypto, and Card Payment methods
      const deposit = await storage.getDepositRequest(id);
      if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });
      // Accept 'Pending' (bank transfers) or 'Under Review' (crypto/card with proof submitted)
      if (!['Pending', 'Under Review'].includes(deposit.status)) {
        return res.status(400).json({ error: 'Deposit already processed or not ready for approval' });
      }
      userId = deposit.userId;
      amountUsd = Number(deposit.amountUsd);
      paymentReference = deposit.referenceNumber;
      sourcePayment = deposit;

    } else if (sourceType === 'CARD') {
      // UNIFIED ARCHITECTURE: Card payments now flow through deposit_requests
      // Redirect admin to use the BANK sourceType with the deposit_request ID
      return res.status(400).json({ 
        error: 'Card payments are now unified with deposit requests. Please use the BANK sourceType to approve card payment deposit requests.',
        hint: 'Card payments create deposit_requests with paymentMethod="Card Payment". Find the corresponding deposit request to approve.',
        code: 'USE_UNIFIED_APPROVAL'
      });

    } else if (sourceType === 'PHYSICAL') {
      // Physical gold deposits - already inspected at vault, ready for final approval
      const deposit = await storage.getPhysicalDepositById(id);
      if (!deposit) return res.status(404).json({ error: 'Physical deposit not found' });
      if (deposit.status !== 'READY_FOR_PAYMENT') {
        return res.status(400).json({ error: 'Physical deposit not ready for payment approval' });
      }
      
      // Get inspection data for credited grams (already validated by vault team)
      const inspection = await storage.getDepositInspection(id);
      if (!inspection || !inspection.creditedGrams) {
        return res.status(400).json({ error: 'Inspection data required for physical deposit' });
      }
      
      userId = deposit.userId;
      // Physical deposits: No cash amount - gold grams come directly from inspection
      amountUsd = 0; // Will calculate from gold value below
      paymentReference = deposit.referenceNumber;
      sourcePayment = { ...deposit, inspection };

    } else {
      return res.status(400).json({ error: 'Invalid source type. Use CRYPTO, BANK, or PHYSICAL.' });
    }

    // Fetch user data for denormalized storage in UTT
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // SECURITY: Prevent self-approval - admin cannot approve their own deposits
    if (adminUser && userId === adminUser.id) {
      return res.status(403).json({ 
        error: 'Self-approval not allowed. An admin cannot approve their own deposits.',
        code: 'SELF_APPROVAL_BLOCKED'
      });
    }

    // Calculate fees and gold price (outside transaction - read operations)
    const { getGoldPricePerGram } = await import('./gold-price-service');
    
    // Validate gold price based on pricing mode
    if (pricingMode === 'FIXED') {
      if (!manualGoldPrice || isNaN(Number(manualGoldPrice)) || Number(manualGoldPrice) <= 0) {
        return res.status(400).json({
          error: 'Fixed pricing mode requires a valid manual gold price greater than 0',
          code: 'INVALID_MANUAL_GOLD_PRICE'
        });
      }
      goldPrice = Number(manualGoldPrice);
    } else {
      goldPrice = await getGoldPricePerGram();
    }
    
    // Guard against invalid gold price
    if (!goldPrice || isNaN(goldPrice) || goldPrice <= 0) {
      return res.status(400).json({
        error: 'Unable to determine a valid gold price. Please try again or use fixed pricing mode.',
        code: 'INVALID_GOLD_PRICE'
      });
    }
    
    if (sourceType === 'PHYSICAL') {
      // Physical deposits: Gold grams come from inspection, no USD fees
      // User brings physical gold, not cash - use physicalGoldAllocatedG directly
      feeAmountUsd = 0;
      netAmountUsd = 0;
      goldGrams = parsedAllocation; // Already verified inspection grams
      
      // VALIDATION 2: Physical deposit - allocated grams must match inspection credited grams
      const inspectionCreditedGrams = parseFloat(sourcePayment.inspection?.creditedGrams || '0');
      if (inspectionCreditedGrams > 0 && Math.abs(parsedAllocation - inspectionCreditedGrams) > 0.0001) {
        // Allow small variance for rounding, but require notes for any significant difference
        const variancePercent = Math.abs((parsedAllocation - inspectionCreditedGrams) / inspectionCreditedGrams) * 100;
        if (variancePercent > 0.1 && (!notes || notes.trim().length < 10)) {
          return res.status(400).json({
            error: `Physical deposit allocation (${parsedAllocation.toFixed(4)}g) differs from inspection credited grams (${inspectionCreditedGrams.toFixed(4)}g). Please provide notes explaining the variance.`,
            code: 'PHYSICAL_ALLOCATION_MISMATCH',
            expected: inspectionCreditedGrams.toFixed(4),
            provided: parsedAllocation.toFixed(4),
            variancePercent: variancePercent.toFixed(2)
          });
        }
      }
    } else {
      // Cash deposits: Calculate fees and convert USD to gold
      feeAmountUsd = amountUsd * (feePercent / 100);
      netAmountUsd = amountUsd - feeAmountUsd;
      goldGrams = netAmountUsd / goldPrice;
      
      // VALIDATION 1: Variance check - require notes if allocation differs ±2% from expected
      const expectedGold = goldGrams;
      
      // Guard against division by zero or invalid expected gold
      if (expectedGold > 0 && !isNaN(expectedGold)) {
        const variancePercent = Math.abs((parsedAllocation - expectedGold) / expectedGold) * 100;
        if (variancePercent > 2 && (!notes || notes.trim().length < 10)) {
          return res.status(400).json({
            error: `Allocation variance of ${variancePercent.toFixed(2)}% detected. Expected ${expectedGold.toFixed(4)}g based on net amount, but allocating ${parsedAllocation.toFixed(4)}g. Please provide notes explaining the variance (min 10 characters).`,
            code: 'ALLOCATION_VARIANCE_REQUIRES_NOTES',
            expected: expectedGold.toFixed(4),
            provided: parsedAllocation.toFixed(4),
            variancePercent: variancePercent.toFixed(2)
          });
        }
      } else if (netAmountUsd > 0) {
        // Net amount is positive but expected gold is invalid - something is wrong
        return res.status(400).json({
          error: 'Unable to calculate expected gold allocation. Please verify gold price and deposit amount.',
          code: 'INVALID_EXPECTED_GOLD'
        });
      }
    }

    // Store original source ID for linking back after UTT creation
    const sourceId = id;
    
    // VALIDATION 3: WalletType enforcement - physical deposits always go to LGPW
    // Use LGPW/FGPW directly (database enum already migrated)
    const dbWalletType = sourceType === 'PHYSICAL' ? 'LGPW' : walletType;
    
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
          adminNotes: `UTT created. Gold: ${goldGrams.toFixed(4)}g at ${goldPrice.toFixed(2)}/g`,
          processedBy: adminUser?.id,
          processedAt: new Date(),
        }, tx as any);
        
        // UNIFIED ARCHITECTURE: If this is a Card Payment deposit_request, also mark the linked ngenius_transaction
        // This prevents the card entry from appearing as actionable in the CARD queue
        if (sourcePayment.paymentMethod === 'Card Payment' && sourcePayment.cardTransactionRef) {
          const linkedNgeniusTx = await storage.getNgeniusTransactionByOrderReference(sourcePayment.cardTransactionRef);
          if (linkedNgeniusTx) {
            await storage.updateNgeniusTransaction(linkedNgeniusTx.id, {
              status: 'Captured', // Use valid ngenius_order_status enum value
              // Note: walletTransactionId will be set later when UTT is created
            }, tx as any);
          }
        }
        
        // UNIFIED ARCHITECTURE: If this is a Crypto deposit_request, also mark the linked crypto_payment_request
        // This prevents the crypto entry from appearing as "Under Review" after approval
        if (sourcePayment.paymentMethod === 'Crypto') {
          const linkedCryptoPayments = await storage.getUserCryptoPaymentRequests(sourcePayment.userId);
          // Find matching crypto payment by amount and approximate timestamp (within 5 seconds)
          const depositTime = new Date(sourcePayment.createdAt).getTime();
          const linkedCryptoPayment = linkedCryptoPayments.find((cp: any) => 
            parseFloat(cp.amountUsd) === parseFloat(sourcePayment.amountUsd) &&
            Math.abs(new Date(cp.createdAt).getTime() - depositTime) < 5000 &&
            cp.status !== 'Approved' && cp.status !== 'Credited'
          );
          if (linkedCryptoPayment) {
            await storage.updateCryptoPaymentRequest(linkedCryptoPayment.id, {
              status: 'Approved',
              reviewNotes: `Unified approval via deposit_request. Gold: ${goldGrams.toFixed(4)}g at $${goldPrice.toFixed(2)}/g`,
              reviewedAt: new Date(),
            }, tx as any);
          }
        }
      } else if (sourceType === 'PHYSICAL') {
        // Update physical deposit status to APPROVED
        await storage.updatePhysicalDeposit(id, {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminId,
          finalCreditedGrams: goldGrams.toFixed(6),
          goldPriceAtApproval: goldPrice.toFixed(2),
        });
      }

      // 0.5. Create Physical Storage Certificate (Golden Rule requirement)
      const physicalCert = await storage.createCertificateTx(tx as any, {
        userId,
        type: 'Physical Storage',
        certificateNumber: storageCertificateId, // Use admin-provided Wingold certificate number
        goldGrams: parsedAllocation.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        totalValueUsd: (parsedAllocation * goldPrice).toFixed(2),
        status: 'Active',
        vaultLocation,
        wingoldStorageRef: wingoldOrderId,
        goldWalletType: dbWalletType,
        issuer: 'Wingold & Metals DMCC',
      });

      // 0.6. Create Digital Ownership Certificate (links to physical cert)
      const digitalCertNumber = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const digitalCert = await storage.createCertificateTx(tx as any, {
        userId,
        type: 'Digital Ownership',
        certificateNumber: digitalCertNumber,
        goldGrams: parsedAllocation.toFixed(6),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        totalValueUsd: (parsedAllocation * goldPrice).toFixed(2),
        status: 'Active',
        vaultLocation,
        goldWalletType: dbWalletType,
        issuer: 'Finatrades Finance SA',
        relatedCertificateId: physicalCert.id,
      });

      // 1. Create UTT with status COMPLETED (final state)
      // UNIFIED ARCHITECTURE: Determine actual source method from deposit paymentMethod field
      let actualSourceMethod: 'CRYPTO' | 'BANK' | 'CARD' | 'VAULT_GOLD' = sourceType as any;
      if (sourceType === 'PHYSICAL') {
        // Physical deposits use VAULT_GOLD source method - user brings their own gold
        actualSourceMethod = 'VAULT_GOLD';
      } else if (sourceType === 'BANK' && sourcePayment?.paymentMethod) {
        if (sourcePayment.paymentMethod === 'Crypto') actualSourceMethod = 'CRYPTO';
        else if (sourcePayment.paymentMethod === 'Card Payment') actualSourceMethod = 'CARD';
        // else keep 'BANK' for 'Bank Transfer'
      }
      
      // Determine transaction type based on source
      const txnType = sourceType === 'PHYSICAL' ? 'VAULT_GOLD_DEPOSIT' : 'FIAT_CRYPTO_DEPOSIT';
      
      const tallyRecord = await storage.createUnifiedTallyTransaction({
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        txnType,
        sourceMethod: actualSourceMethod,
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
        notes: notes || `One-step approval from ${actualSourceMethod}. Fee: ${feePercent}% ($${feeAmountUsd.toFixed(2)}) deducted.`,
        createdBy: adminId || undefined,
        wingoldOrderId,
        wingoldSupplierInvoiceId: wingoldInvoiceId,
        physicalGoldAllocatedG: String(parsedAllocation),
        wingoldBuyRate: String(wingoldBuyRate),
        wingoldCostUsd: String(wingoldCostUsd),
        storageCertificateId: physicalCert.certificateNumber, // Use created certificate number
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
        certificateId: physicalCert.certificateNumber, // Use created certificate number
        notes: `Unified Tally Credit: ${parsedAllocation.toFixed(6)}g to ${dbWalletType} wallet from ${actualSourceMethod} deposit`,
        createdBy: adminId || undefined,
        tx: tx as any,
      });

      // Create transaction record for backward compatibility with Vault Activity UI
      await storage.createTransactionTx(tx as any, {
        userId,
        type: 'Deposit',
        status: 'Completed',
        amountGold: parsedAllocation.toFixed(6),
        amountUsd: (parsedAllocation * goldPrice).toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        goldWalletType: dbWalletType,
        description: `${actualSourceMethod} deposit: ${parsedAllocation.toFixed(6)}g credited to ${dbWalletType} wallet`,
        sourceModule: 'unified-tally',
        completedAt: new Date(),
      });

      // 3. Create FGPW batch if it's a fixed-price wallet
      if (dbWalletType === 'FGPW') {
        await createFpgwBatch({
          userId,
          goldGrams: parsedAllocation,
          lockedPriceUsd: goldPrice,
          sourceType: 'deposit',
          sourceTransactionId: tallyRecord.id,
          notes: `FPGW batch from ${actualSourceMethod} deposit - Certificate: ${storageCertificateId}`,
          tx: tx as any,
        });
      }

      // 4. For CARD payments, mark as linked
      if (actualSourceMethod === 'CARD') {
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
          message: `Payment received from ${actualSourceMethod}`
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
    
    // For physical deposits, fetch inspection data
    let inspection = null;
    const isPhysicalDeposit = transaction.sourceMethod === 'VAULT_GOLD' || transaction.sourceType === 'PHYSICAL';
    if (isPhysicalDeposit && transaction.sourceReferenceId) {
      // Get inspection directly using the physical deposit ID
      inspection = await storage.getDepositInspection(transaction.sourceReferenceId);
    }
    
    res.json({
      transaction,
      bars,
      inspection,
      isPhysicalDeposit,
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

      // NOTE: Transaction creation removed - UTT is the single source of truth
      // User transaction history is derived from unified_tally_transactions

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
