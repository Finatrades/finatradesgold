/**
 * Transaction State Machine Service
 * 
 * Handles transaction state transitions:
 * DRAFT → PENDING → PENDING_VERIFICATION → APPROVED → COMPLETED
 *                                        → REJECTED
 * 
 * Integrates with:
 * - VaultLedgerService for balance updates
 * - CertificateService for auto-generating certificates
 * - AllocationService for physical gold tracking
 */

import { storage } from './storage';
import { vaultLedgerService } from './vault-ledger-service';
import { 
  generateDigitalOwnershipCertificate, 
  createAllocation, 
  completeApprovalWithCertificates 
} from './certificate-service';
import type { Transaction } from '@shared/schema';

export type TransactionStatus = 
  | 'Draft' 
  | 'Pending' 
  | 'Pending Verification' 
  | 'Approved' 
  | 'Processing' 
  | 'Completed' 
  | 'Failed' 
  | 'Cancelled' 
  | 'Rejected';

interface StateTransitionResult {
  success: boolean;
  newStatus: TransactionStatus;
  transaction: Transaction;
  certificates?: string[];
  allocationId?: string;
  error?: string;
}

const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  'Draft': ['Pending', 'Cancelled'],
  'Pending': ['Pending Verification', 'Approved', 'Rejected', 'Cancelled'],
  'Pending Verification': ['Approved', 'Rejected'],
  'Approved': ['Processing', 'Completed'],
  'Processing': ['Completed', 'Failed'],
  'Completed': [], // Terminal state
  'Failed': ['Pending'], // Can retry
  'Cancelled': [], // Terminal state
  'Rejected': [], // Terminal state
};

export class TransactionStateMachine {
  
  isValidTransition(fromStatus: TransactionStatus, toStatus: TransactionStatus): boolean {
    const allowedTransitions = VALID_TRANSITIONS[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }

  async transition(
    transactionId: string, 
    targetStatus: TransactionStatus,
    options?: {
      adminId?: string;
      notes?: string;
      allocationBatchRef?: string;
      vaultLocation?: string;
    }
  ): Promise<StateTransitionResult> {
    const transaction = await storage.getTransaction(transactionId);
    if (!transaction) {
      return { 
        success: false, 
        newStatus: 'Draft' as TransactionStatus, 
        transaction: {} as Transaction,
        error: 'Transaction not found' 
      };
    }

    const currentStatus = transaction.status as TransactionStatus;
    
    if (!this.isValidTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        newStatus: currentStatus,
        transaction,
        error: `Invalid transition from ${currentStatus} to ${targetStatus}`
      };
    }

    try {
      switch (targetStatus) {
        case 'Pending Verification':
          return await this.handlePendingVerification(transaction, options);
        
        case 'Approved':
          return await this.handleApproval(transaction, options);
        
        case 'Completed':
          return await this.handleCompletion(transaction, options);
        
        case 'Rejected':
          return await this.handleRejection(transaction, options);
        
        case 'Cancelled':
          return await this.handleCancellation(transaction, options);
        
        default:
          const updated = await storage.updateTransaction(transactionId, { status: targetStatus });
          return {
            success: true,
            newStatus: targetStatus,
            transaction: updated!
          };
      }
    } catch (error: any) {
      console.error(`[StateMachine] Error transitioning ${transactionId}:`, error);
      return {
        success: false,
        newStatus: currentStatus,
        transaction,
        error: error.message
      };
    }
  }

  private async handlePendingVerification(
    transaction: Transaction,
    options?: { adminId?: string; notes?: string }
  ): Promise<StateTransitionResult> {
    const goldGrams = parseFloat(transaction.amountGold || '0');
    const goldPriceUsd = parseFloat(transaction.goldPriceUsdPerGram || '0');
    
    if (goldGrams > 0) {
      await vaultLedgerService.recordPendingDeposit(
        transaction.userId,
        goldGrams,
        goldPriceUsd,
        transaction.id,
        options?.notes
      );
    }

    const updated = await storage.updateTransaction(transaction.id, { 
      status: 'Pending Verification'
    });

    return {
      success: true,
      newStatus: 'Pending Verification',
      transaction: updated!
    };
  }

  private async handleApproval(
    transaction: Transaction,
    options?: { adminId?: string; notes?: string; allocationBatchRef?: string; vaultLocation?: string }
  ): Promise<StateTransitionResult> {
    const goldGrams = parseFloat(transaction.amountGold || '0');
    const goldPriceUsd = parseFloat(transaction.goldPriceUsdPerGram || '0');
    const certificates: string[] = [];
    let allocationId: string | undefined;

    if (goldGrams > 0 && (transaction.type === 'Deposit' || transaction.type === 'Buy')) {
      const result = await completeApprovalWithCertificates({
        transactionId: transaction.id,
        userId: transaction.userId,
        grams: goldGrams,
        goldPriceUsd,
        vaultLocation: options?.vaultLocation,
        allocationBatchRef: options?.allocationBatchRef,
        approvedBy: options?.adminId || 'system'
      });

      certificates.push(result.digitalOwnershipCertId, result.storageCertificateId);
      allocationId = result.allocationId;

      await vaultLedgerService.confirmPendingDeposit(
        transaction.userId,
        goldGrams,
        goldPriceUsd,
        transaction.id,
        `Approved by admin: ${options?.notes || 'Deposit verified'}`
      );
    }

    const updated = await storage.updateTransaction(transaction.id, { 
      status: 'Approved',
      approvedAt: new Date(),
      approvedBy: options?.adminId
    });

    return {
      success: true,
      newStatus: 'Approved',
      transaction: updated!,
      certificates,
      allocationId
    };
  }

  private async handleCompletion(
    transaction: Transaction,
    options?: { adminId?: string; notes?: string }
  ): Promise<StateTransitionResult> {
    const updated = await storage.updateTransaction(transaction.id, { 
      status: 'Completed',
      completedAt: new Date()
    });

    return {
      success: true,
      newStatus: 'Completed',
      transaction: updated!
    };
  }

  private async handleRejection(
    transaction: Transaction,
    options?: { adminId?: string; notes?: string }
  ): Promise<StateTransitionResult> {
    const goldGrams = parseFloat(transaction.amountGold || '0');
    const goldPriceUsd = parseFloat(transaction.goldPriceUsdPerGram || '0');

    if (goldGrams > 0 && transaction.status === 'Pending Verification') {
      await vaultLedgerService.rejectPendingDeposit(
        transaction.userId,
        goldGrams,
        goldPriceUsd,
        transaction.id,
        `Rejected: ${options?.notes || 'Verification failed'}`
      );
    }

    const updated = await storage.updateTransaction(transaction.id, { 
      status: 'Rejected',
      rejectionReason: options?.notes
    });

    return {
      success: true,
      newStatus: 'Rejected',
      transaction: updated!
    };
  }

  private async handleCancellation(
    transaction: Transaction,
    options?: { adminId?: string; notes?: string }
  ): Promise<StateTransitionResult> {
    const updated = await storage.updateTransaction(transaction.id, { 
      status: 'Cancelled'
    });

    return {
      success: true,
      newStatus: 'Cancelled',
      transaction: updated!
    };
  }

  async submitForApproval(transactionId: string): Promise<StateTransitionResult> {
    return this.transition(transactionId, 'Pending');
  }

  async submitForVerification(transactionId: string): Promise<StateTransitionResult> {
    return this.transition(transactionId, 'Pending Verification');
  }

  async approve(
    transactionId: string, 
    adminId: string, 
    options?: { notes?: string; allocationBatchRef?: string; vaultLocation?: string }
  ): Promise<StateTransitionResult> {
    return this.transition(transactionId, 'Approved', { 
      adminId, 
      ...options 
    });
  }

  async reject(
    transactionId: string, 
    adminId: string, 
    notes?: string
  ): Promise<StateTransitionResult> {
    return this.transition(transactionId, 'Rejected', { adminId, notes });
  }

  async complete(transactionId: string): Promise<StateTransitionResult> {
    return this.transition(transactionId, 'Completed');
  }

  async cancel(transactionId: string, notes?: string): Promise<StateTransitionResult> {
    return this.transition(transactionId, 'Cancelled', { notes });
  }
}

export const transactionStateMachine = new TransactionStateMachine();
