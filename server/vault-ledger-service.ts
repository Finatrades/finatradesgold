import { db } from './db';
import { eq, sql, and, desc } from 'drizzle-orm';
import {
  vaultLedgerEntries,
  vaultOwnershipSummary,
  wallets,
  bnslWallets,
  finabridgeWallets,
  InsertVaultLedgerEntry,
  VaultLedgerEntry,
  VaultOwnershipSummary,
} from '@shared/schema';

export type LedgerAction = 
  | 'Deposit'
  | 'Withdrawal'
  | 'Transfer_Send'
  | 'Transfer_Receive'
  | 'FinaPay_To_BNSL'
  | 'BNSL_To_FinaPay'
  | 'BNSL_Lock'
  | 'BNSL_Unlock'
  | 'FinaPay_To_FinaBridge'
  | 'FinaBridge_To_FinaPay'
  | 'Trade_Reserve'
  | 'Trade_Release'
  | 'Payout_Credit'
  | 'Fee_Deduction'
  | 'Adjustment'
  | 'Pending_Deposit'
  | 'Pending_Confirm'
  | 'Pending_Reject';

export type WalletType = 'FinaPay' | 'BNSL' | 'FinaBridge' | 'External';
export type OwnershipStatus = 'Available' | 'Locked_BNSL' | 'Reserved_Trade' | 'Pending_Deposit' | 'Pending_Withdrawal';

interface LedgerEntryParams {
  userId: string;
  action: LedgerAction;
  goldGrams: number;
  goldPriceUsdPerGram?: number;
  fromWallet?: WalletType;
  toWallet?: WalletType;
  fromStatus?: OwnershipStatus;
  toStatus?: OwnershipStatus;
  transactionId?: string;
  bnslPlanId?: string;
  bnslPayoutId?: string;
  tradeRequestId?: string;
  certificateId?: string;
  counterpartyUserId?: string;
  notes?: string;
  createdBy?: string;
}

export class VaultLedgerService {
  
  async getOrCreateOwnershipSummary(userId: string): Promise<VaultOwnershipSummary> {
    const [existing] = await db.select().from(vaultOwnershipSummary).where(eq(vaultOwnershipSummary.userId, userId));
    if (existing) return existing;
    
    const [created] = await db.insert(vaultOwnershipSummary).values({ userId }).returning();
    return created;
  }

  async getOwnershipSummary(userId: string): Promise<VaultOwnershipSummary | undefined> {
    const [summary] = await db.select().from(vaultOwnershipSummary).where(eq(vaultOwnershipSummary.userId, userId));
    return summary;
  }

  async getLedgerHistory(userId: string, limit = 50): Promise<VaultLedgerEntry[]> {
    return db.select()
      .from(vaultLedgerEntries)
      .where(eq(vaultLedgerEntries.userId, userId))
      .orderBy(desc(vaultLedgerEntries.createdAt))
      .limit(limit);
  }

  async getLedgerEntriesByTransactionId(transactionId: string): Promise<VaultLedgerEntry[]> {
    return db.select()
      .from(vaultLedgerEntries)
      .where(eq(vaultLedgerEntries.transactionId, transactionId))
      .orderBy(vaultLedgerEntries.createdAt);
  }

  async getLedgerEntriesByCertificateId(certificateId: string): Promise<VaultLedgerEntry[]> {
    return db.select()
      .from(vaultLedgerEntries)
      .where(eq(vaultLedgerEntries.certificateId, certificateId))
      .orderBy(vaultLedgerEntries.createdAt);
  }

  async recordLedgerEntry(params: LedgerEntryParams): Promise<VaultLedgerEntry> {
    const summary = await this.getOrCreateOwnershipSummary(params.userId);
    const currentBalance = parseFloat(summary.totalGoldGrams);
    const newBalance = this.calculateNewBalance(currentBalance, params.action, params.goldGrams);

    const entry: InsertVaultLedgerEntry = {
      userId: params.userId,
      action: params.action,
      goldGrams: params.goldGrams.toFixed(6),
      goldPriceUsdPerGram: params.goldPriceUsdPerGram?.toFixed(2),
      valueUsd: params.goldPriceUsdPerGram ? (params.goldGrams * params.goldPriceUsdPerGram).toFixed(2) : undefined,
      fromWallet: params.fromWallet,
      toWallet: params.toWallet,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      balanceAfterGrams: newBalance.toFixed(6),
      transactionId: params.transactionId,
      bnslPlanId: params.bnslPlanId,
      bnslPayoutId: params.bnslPayoutId,
      tradeRequestId: params.tradeRequestId,
      certificateId: params.certificateId,
      counterpartyUserId: params.counterpartyUserId,
      notes: params.notes,
      createdBy: params.createdBy || 'system',
    };

    const [ledgerEntry] = await db.insert(vaultLedgerEntries).values(entry).returning();
    await this.updateOwnershipSummary(params.userId, params.action, params.goldGrams);
    
    return ledgerEntry;
  }

  private calculateNewBalance(currentBalance: number, action: LedgerAction, goldGrams: number): number {
    const creditActions: LedgerAction[] = ['Deposit', 'Transfer_Receive', 'Payout_Credit', 'Adjustment'];
    const debitActions: LedgerAction[] = ['Withdrawal', 'Transfer_Send', 'Fee_Deduction'];
    
    if (creditActions.includes(action)) {
      return currentBalance + goldGrams;
    } else if (debitActions.includes(action)) {
      return currentBalance - goldGrams;
    }
    return currentBalance;
  }

  private async updateOwnershipSummary(userId: string, action: LedgerAction, goldGrams: number): Promise<void> {
    const summary = await this.getOrCreateOwnershipSummary(userId);
    const grams = parseFloat(goldGrams.toFixed(6));

    let updates: Partial<VaultOwnershipSummary> = { lastUpdated: new Date() };

    switch (action) {
      case 'Deposit':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) + grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) + grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) + grams).toFixed(6),
        };
        break;

      case 'Withdrawal':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) - grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) - grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) - grams).toFixed(6),
        };
        break;

      case 'Transfer_Send':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) - grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) - grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) - grams).toFixed(6),
        };
        break;

      case 'Transfer_Receive':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) + grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) + grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) + grams).toFixed(6),
        };
        break;

      case 'FinaPay_To_BNSL':
        updates = {
          ...updates,
          finaPayGrams: (parseFloat(summary.finaPayGrams) - grams).toFixed(6),
          bnslAvailableGrams: (parseFloat(summary.bnslAvailableGrams) + grams).toFixed(6),
        };
        break;

      case 'BNSL_To_FinaPay':
        updates = {
          ...updates,
          finaPayGrams: (parseFloat(summary.finaPayGrams) + grams).toFixed(6),
          bnslAvailableGrams: (parseFloat(summary.bnslAvailableGrams) - grams).toFixed(6),
        };
        break;

      case 'BNSL_Lock':
        updates = {
          ...updates,
          availableGrams: (parseFloat(summary.availableGrams) - grams).toFixed(6),
          lockedBnslGrams: (parseFloat(summary.lockedBnslGrams) + grams).toFixed(6),
          bnslAvailableGrams: (parseFloat(summary.bnslAvailableGrams) - grams).toFixed(6),
          bnslLockedGrams: (parseFloat(summary.bnslLockedGrams) + grams).toFixed(6),
        };
        break;

      case 'BNSL_Unlock':
        updates = {
          ...updates,
          availableGrams: (parseFloat(summary.availableGrams) + grams).toFixed(6),
          lockedBnslGrams: (parseFloat(summary.lockedBnslGrams) - grams).toFixed(6),
          bnslLockedGrams: (parseFloat(summary.bnslLockedGrams) - grams).toFixed(6),
          bnslAvailableGrams: (parseFloat(summary.bnslAvailableGrams) + grams).toFixed(6),
        };
        break;

      case 'FinaPay_To_FinaBridge':
        updates = {
          ...updates,
          finaPayGrams: (parseFloat(summary.finaPayGrams) - grams).toFixed(6),
          finaBridgeAvailableGrams: (parseFloat(summary.finaBridgeAvailableGrams) + grams).toFixed(6),
        };
        break;

      case 'FinaBridge_To_FinaPay':
        updates = {
          ...updates,
          finaPayGrams: (parseFloat(summary.finaPayGrams) + grams).toFixed(6),
          finaBridgeAvailableGrams: (parseFloat(summary.finaBridgeAvailableGrams) - grams).toFixed(6),
        };
        break;

      case 'Trade_Reserve':
        updates = {
          ...updates,
          availableGrams: (parseFloat(summary.availableGrams) - grams).toFixed(6),
          reservedTradeGrams: (parseFloat(summary.reservedTradeGrams) + grams).toFixed(6),
          finaBridgeAvailableGrams: (parseFloat(summary.finaBridgeAvailableGrams) - grams).toFixed(6),
          finaBridgeReservedGrams: (parseFloat(summary.finaBridgeReservedGrams) + grams).toFixed(6),
        };
        break;

      case 'Trade_Release':
        updates = {
          ...updates,
          availableGrams: (parseFloat(summary.availableGrams) + grams).toFixed(6),
          reservedTradeGrams: (parseFloat(summary.reservedTradeGrams) - grams).toFixed(6),
          finaBridgeReservedGrams: (parseFloat(summary.finaBridgeReservedGrams) - grams).toFixed(6),
          finaBridgeAvailableGrams: (parseFloat(summary.finaBridgeAvailableGrams) + grams).toFixed(6),
        };
        break;

      case 'Payout_Credit':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) + grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) + grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) + grams).toFixed(6),
        };
        break;

      case 'Fee_Deduction':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) - grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) - grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) - grams).toFixed(6),
        };
        break;

      case 'Pending_Deposit':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) + grams).toFixed(6),
          pendingGrams: (parseFloat(summary.pendingGrams) + grams).toFixed(6),
        };
        break;

      case 'Pending_Confirm':
        updates = {
          ...updates,
          pendingGrams: (parseFloat(summary.pendingGrams) - grams).toFixed(6),
          availableGrams: (parseFloat(summary.availableGrams) + grams).toFixed(6),
          finaPayGrams: (parseFloat(summary.finaPayGrams) + grams).toFixed(6),
        };
        break;

      case 'Pending_Reject':
        updates = {
          ...updates,
          totalGoldGrams: (parseFloat(summary.totalGoldGrams) - grams).toFixed(6),
          pendingGrams: (parseFloat(summary.pendingGrams) - grams).toFixed(6),
        };
        break;
    }

    await db.update(vaultOwnershipSummary)
      .set(updates)
      .where(eq(vaultOwnershipSummary.userId, userId));
  }

  async transferFinaPayToBnsl(userId: string, goldGrams: number, goldPriceUsd: number): Promise<VaultLedgerEntry> {
    const summary = await this.getOrCreateOwnershipSummary(userId);
    const available = parseFloat(summary.finaPayGrams);
    
    if (goldGrams > available) {
      throw new Error(`Insufficient balance in FinaPay. Available: ${available}g, Requested: ${goldGrams}g`);
    }

    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} - ${goldGrams}` })
      .where(eq(wallets.userId, userId));

    const [bnslWallet] = await db.select().from(bnslWallets).where(eq(bnslWallets.userId, userId));
    if (bnslWallet) {
      await db.update(bnslWallets)
        .set({ availableGoldGrams: sql`${bnslWallets.availableGoldGrams} + ${goldGrams}`, updatedAt: new Date() })
        .where(eq(bnslWallets.userId, userId));
    } else {
      await db.insert(bnslWallets).values({ userId, availableGoldGrams: goldGrams.toFixed(6), lockedGoldGrams: '0' });
    }

    return this.recordLedgerEntry({
      userId,
      action: 'FinaPay_To_BNSL',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'FinaPay',
      toWallet: 'BNSL',
      fromStatus: 'Available',
      toStatus: 'Available',
      notes: `Transferred ${goldGrams.toFixed(4)}g from FinaPay to BNSL Wallet`,
    });
  }

  async lockBnslGold(userId: string, goldGrams: number, goldPriceUsd: number, bnslPlanId: string): Promise<VaultLedgerEntry> {
    const summary = await this.getOrCreateOwnershipSummary(userId);
    const bnslAvailable = parseFloat(summary.bnslAvailableGrams);
    
    if (goldGrams > bnslAvailable) {
      throw new Error(`Insufficient balance in BNSL Wallet. Available: ${bnslAvailable}g, Requested: ${goldGrams}g`);
    }

    await db.update(bnslWallets)
      .set({
        availableGoldGrams: sql`${bnslWallets.availableGoldGrams} - ${goldGrams}`,
        lockedGoldGrams: sql`${bnslWallets.lockedGoldGrams} + ${goldGrams}`,
        updatedAt: new Date(),
      })
      .where(eq(bnslWallets.userId, userId));

    return this.recordLedgerEntry({
      userId,
      action: 'BNSL_Lock',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'BNSL',
      toWallet: 'BNSL',
      fromStatus: 'Available',
      toStatus: 'Locked_BNSL',
      bnslPlanId,
      notes: `Locked ${goldGrams.toFixed(4)}g under BNSL Plan ${bnslPlanId}`,
    });
  }

  async transferFinaPayToFinaBridge(userId: string, goldGrams: number, goldPriceUsd: number): Promise<VaultLedgerEntry> {
    const summary = await this.getOrCreateOwnershipSummary(userId);
    const available = parseFloat(summary.finaPayGrams);
    
    if (goldGrams > available) {
      throw new Error(`Insufficient balance in FinaPay. Available: ${available}g, Requested: ${goldGrams}g`);
    }

    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} - ${goldGrams}` })
      .where(eq(wallets.userId, userId));

    const [bridgeWallet] = await db.select().from(finabridgeWallets).where(eq(finabridgeWallets.userId, userId));
    if (bridgeWallet) {
      await db.update(finabridgeWallets)
        .set({ availableGoldGrams: sql`${finabridgeWallets.availableGoldGrams} + ${goldGrams}`, updatedAt: new Date() })
        .where(eq(finabridgeWallets.userId, userId));
    } else {
      await db.insert(finabridgeWallets).values({ userId, availableGoldGrams: goldGrams.toFixed(6), lockedGoldGrams: '0' });
    }

    return this.recordLedgerEntry({
      userId,
      action: 'FinaPay_To_FinaBridge',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'FinaPay',
      toWallet: 'FinaBridge',
      fromStatus: 'Available',
      toStatus: 'Available',
      notes: `Transferred ${goldGrams.toFixed(4)}g from FinaPay to FinaBridge Wallet`,
    });
  }

  async reserveTradeGold(userId: string, goldGrams: number, goldPriceUsd: number, tradeRequestId: string): Promise<VaultLedgerEntry> {
    const summary = await this.getOrCreateOwnershipSummary(userId);
    const bridgeAvailable = parseFloat(summary.finaBridgeAvailableGrams);
    
    if (goldGrams > bridgeAvailable) {
      throw new Error(`Insufficient balance in FinaBridge Wallet. Available: ${bridgeAvailable}g, Requested: ${goldGrams}g`);
    }

    await db.update(finabridgeWallets)
      .set({
        availableGoldGrams: sql`${finabridgeWallets.availableGoldGrams} - ${goldGrams}`,
        lockedGoldGrams: sql`${finabridgeWallets.lockedGoldGrams} + ${goldGrams}`,
        updatedAt: new Date(),
      })
      .where(eq(finabridgeWallets.userId, userId));

    return this.recordLedgerEntry({
      userId,
      action: 'Trade_Reserve',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'FinaBridge',
      toWallet: 'FinaBridge',
      fromStatus: 'Available',
      toStatus: 'Reserved_Trade',
      tradeRequestId,
      notes: `Reserved ${goldGrams.toFixed(4)}g for trade ${tradeRequestId}`,
    });
  }

  async recordDeposit(userId: string, goldGrams: number, goldPriceUsd: number, transactionId?: string): Promise<VaultLedgerEntry> {
    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} + ${goldGrams}` })
      .where(eq(wallets.userId, userId));

    return this.recordLedgerEntry({
      userId,
      action: 'Deposit',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'External',
      toWallet: 'FinaPay',
      toStatus: 'Available',
      transactionId,
      notes: `Deposited ${goldGrams.toFixed(4)}g to FinaPay`,
    });
  }

  async recordWithdrawal(userId: string, goldGrams: number, goldPriceUsd: number, transactionId?: string): Promise<VaultLedgerEntry> {
    const summary = await this.getOrCreateOwnershipSummary(userId);
    const available = parseFloat(summary.finaPayGrams);
    
    if (goldGrams > available) {
      throw new Error(`Insufficient balance for withdrawal. Available: ${available}g, Requested: ${goldGrams}g`);
    }

    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} - ${goldGrams}` })
      .where(eq(wallets.userId, userId));

    return this.recordLedgerEntry({
      userId,
      action: 'Withdrawal',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'FinaPay',
      toWallet: 'External',
      fromStatus: 'Available',
      transactionId,
      notes: `Withdrew ${goldGrams.toFixed(4)}g from FinaPay`,
    });
  }

  async recordTransfer(
    senderId: string,
    receiverId: string,
    goldGrams: number,
    goldPriceUsd: number,
    transactionId?: string
  ): Promise<{ senderEntry: VaultLedgerEntry; receiverEntry: VaultLedgerEntry }> {
    const senderSummary = await this.getOrCreateOwnershipSummary(senderId);
    const senderAvailable = parseFloat(senderSummary.finaPayGrams);
    
    if (goldGrams > senderAvailable) {
      throw new Error(`Insufficient balance for transfer. Available: ${senderAvailable}g, Requested: ${goldGrams}g`);
    }

    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} - ${goldGrams}` })
      .where(eq(wallets.userId, senderId));

    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} + ${goldGrams}` })
      .where(eq(wallets.userId, receiverId));

    const senderEntry = await this.recordLedgerEntry({
      userId: senderId,
      action: 'Transfer_Send',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'FinaPay',
      toWallet: 'External',
      fromStatus: 'Available',
      transactionId,
      counterpartyUserId: receiverId,
      notes: `Sent ${goldGrams.toFixed(4)}g to user`,
    });

    const receiverEntry = await this.recordLedgerEntry({
      userId: receiverId,
      action: 'Transfer_Receive',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'External',
      toWallet: 'FinaPay',
      toStatus: 'Available',
      transactionId,
      counterpartyUserId: senderId,
      notes: `Received ${goldGrams.toFixed(4)}g from user`,
    });

    return { senderEntry, receiverEntry };
  }

  async syncOwnershipFromWallets(userId: string): Promise<VaultOwnershipSummary> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    const [bnslWallet] = await db.select().from(bnslWallets).where(eq(bnslWallets.userId, userId));
    const [bridgeWallet] = await db.select().from(finabridgeWallets).where(eq(finabridgeWallets.userId, userId));

    const finaPayGrams = parseFloat(wallet?.goldGrams || '0');
    const bnslAvailable = parseFloat(bnslWallet?.availableGoldGrams || '0');
    const bnslLocked = parseFloat(bnslWallet?.lockedGoldGrams || '0');
    const bridgeAvailable = parseFloat(bridgeWallet?.availableGoldGrams || '0');
    const bridgeLocked = parseFloat(bridgeWallet?.lockedGoldGrams || '0');

    const totalGold = finaPayGrams + bnslAvailable + bnslLocked + bridgeAvailable + bridgeLocked;
    const availableGold = finaPayGrams + bnslAvailable + bridgeAvailable;
    const lockedBnsl = bnslLocked;
    const reservedTrade = bridgeLocked;

    const [updated] = await db.update(vaultOwnershipSummary)
      .set({
        totalGoldGrams: totalGold.toFixed(6),
        availableGrams: availableGold.toFixed(6),
        lockedBnslGrams: lockedBnsl.toFixed(6),
        reservedTradeGrams: reservedTrade.toFixed(6),
        finaPayGrams: finaPayGrams.toFixed(6),
        bnslAvailableGrams: bnslAvailable.toFixed(6),
        bnslLockedGrams: bnslLocked.toFixed(6),
        finaBridgeAvailableGrams: bridgeAvailable.toFixed(6),
        finaBridgeReservedGrams: bridgeLocked.toFixed(6),
        lastUpdated: new Date(),
      })
      .where(eq(vaultOwnershipSummary.userId, userId))
      .returning();

    if (!updated) {
      const [created] = await db.insert(vaultOwnershipSummary)
        .values({
          userId,
          totalGoldGrams: totalGold.toFixed(6),
          availableGrams: availableGold.toFixed(6),
          lockedBnslGrams: lockedBnsl.toFixed(6),
          reservedTradeGrams: reservedTrade.toFixed(6),
          finaPayGrams: finaPayGrams.toFixed(6),
          bnslAvailableGrams: bnslAvailable.toFixed(6),
          bnslLockedGrams: bnslLocked.toFixed(6),
          finaBridgeAvailableGrams: bridgeAvailable.toFixed(6),
          finaBridgeReservedGrams: bridgeLocked.toFixed(6),
        })
        .returning();
      return created;
    }

    return updated;
  }

  async recordPendingDeposit(
    userId: string,
    goldGrams: number,
    goldPriceUsd: number,
    transactionId?: string,
    notes?: string
  ): Promise<VaultLedgerEntry> {
    return this.recordLedgerEntry({
      userId,
      action: 'Pending_Deposit',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      toWallet: 'FinaPay',
      toStatus: 'Pending_Deposit',
      transactionId,
      notes: notes || `Pending deposit of ${goldGrams.toFixed(4)}g awaiting verification`,
    });
  }

  async confirmPendingDeposit(
    userId: string,
    goldGrams: number,
    goldPriceUsd: number,
    transactionId?: string,
    notes?: string
  ): Promise<VaultLedgerEntry> {
    await db.update(wallets)
      .set({ goldGrams: sql`${wallets.goldGrams} + ${goldGrams}` })
      .where(eq(wallets.userId, userId));

    return this.recordLedgerEntry({
      userId,
      action: 'Pending_Confirm',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      toWallet: 'FinaPay',
      fromStatus: 'Pending_Deposit',
      toStatus: 'Available',
      transactionId,
      notes: notes || `Confirmed pending deposit of ${goldGrams.toFixed(4)}g - now available`,
    });
  }

  async rejectPendingDeposit(
    userId: string,
    goldGrams: number,
    goldPriceUsd: number,
    transactionId?: string,
    notes?: string
  ): Promise<VaultLedgerEntry> {
    return this.recordLedgerEntry({
      userId,
      action: 'Pending_Reject',
      goldGrams,
      goldPriceUsdPerGram: goldPriceUsd,
      fromWallet: 'FinaPay',
      fromStatus: 'Pending_Deposit',
      transactionId,
      notes: notes || `Rejected pending deposit of ${goldGrams.toFixed(4)}g`,
    });
  }
}

export const vaultLedgerService = new VaultLedgerService();
