import { db } from './db';
import { wallets, transactions, peerTransfers } from '@shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

export async function repairCorruptedWallets(): Promise<{ fixed: number; errors: string[] }> {
  const errors: string[] = [];
  let fixed = 0;

  try {
    console.log('[Wallet Repair] Starting corrupted wallet scan...');
    
    // Find all wallets with NaN or invalid goldGrams
    const allWallets = await db.select().from(wallets);
    
    for (const wallet of allWallets) {
      const goldGrams = wallet.goldGrams;
      const isCorrupted = 
        goldGrams === null || 
        goldGrams === undefined ||
        (typeof goldGrams === 'string' && (goldGrams === 'NaN' || goldGrams === 'null' || goldGrams === 'undefined')) ||
        (typeof goldGrams === 'number' && isNaN(goldGrams)) ||
        (typeof goldGrams === 'string' && isNaN(parseFloat(goldGrams)));
      
      if (isCorrupted) {
        console.log(`[Wallet Repair] Found corrupted wallet for user ${wallet.userId}: goldGrams = "${goldGrams}"`);
        
        try {
          // Recalculate balance from completed transactions
          const userTransactions = await db.select().from(transactions)
            .where(eq(transactions.userId, wallet.userId));
          
          let calculatedBalance = 0;
          
          for (const tx of userTransactions) {
            if (tx.status !== 'Completed') continue;
            
            const goldAmount = parseFloat(tx.amountGold || '0');
            if (isNaN(goldAmount)) continue;
            
            switch (tx.type) {
              case 'Buy':
              case 'Receive':
              case 'Deposit':
                calculatedBalance += goldAmount;
                break;
              case 'Sell':
              case 'Send':
              case 'Withdrawal':
                calculatedBalance -= goldAmount;
                break;
            }
          }
          
          // Ensure non-negative
          calculatedBalance = Math.max(0, calculatedBalance);
          
          // Update the wallet
          await db.update(wallets)
            .set({ goldGrams: calculatedBalance.toFixed(6) })
            .where(eq(wallets.id, wallet.id));
          
          console.log(`[Wallet Repair] Fixed wallet for user ${wallet.userId}: ${goldGrams} -> ${calculatedBalance.toFixed(6)}g`);
          fixed++;
        } catch (err) {
          const errorMsg = `Failed to repair wallet ${wallet.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          console.error(`[Wallet Repair] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    
    if (fixed > 0) {
      console.log(`[Wallet Repair] Completed. Fixed ${fixed} corrupted wallets.`);
    } else {
      console.log('[Wallet Repair] No corrupted wallets found.');
    }
    
  } catch (error) {
    const errorMsg = `Wallet repair scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[Wallet Repair] ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  return { fixed, errors };
}

export async function repairOrphanedTransfers(): Promise<{ fixed: number; errors: string[] }> {
  const errors: string[] = [];
  let fixed = 0;

  try {
    console.log('[Transfer Repair] Scanning for orphaned pending transfers...');
    
    // Find pending Send transactions that don't have corresponding peer_transfers
    const pendingSends = await db.select().from(transactions)
      .where(and(
        eq(transactions.type, 'Send'),
        eq(transactions.status, 'Pending')
      ));
    
    for (const tx of pendingSends) {
      if (!tx.referenceId) continue;
      
      // Check if peer_transfer exists
      const [existingTransfer] = await db.select().from(peerTransfers)
        .where(eq(peerTransfers.referenceNumber, tx.referenceId));
      
      if (!existingTransfer && tx.recipientUserId) {
        console.log(`[Transfer Repair] Found orphaned transaction: ${tx.referenceId}`);
        
        try {
          // Create the missing peer_transfer
          const goldAmount = parseFloat(tx.amountGold || '0');
          const goldPrice = parseFloat(tx.goldPriceUsdPerGram || '0');
          
          await db.insert(peerTransfers).values({
            referenceNumber: tx.referenceId,
            senderId: tx.userId,
            recipientId: tx.recipientUserId,
            amountUsd: tx.amountUsd || '0',
            amountGold: tx.amountGold || '0',
            goldPriceUsdPerGram: tx.goldPriceUsdPerGram || '0',
            channel: 'email',
            recipientIdentifier: tx.recipientEmail || '',
            memo: tx.description || '',
            status: 'Pending',
            requiresApproval: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            senderTransactionId: tx.id,
          });
          
          console.log(`[Transfer Repair] Created peer_transfer for ${tx.referenceId}`);
          fixed++;
        } catch (err) {
          const errorMsg = `Failed to create peer_transfer for ${tx.referenceId}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          console.error(`[Transfer Repair] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    
    if (fixed > 0) {
      console.log(`[Transfer Repair] Completed. Created ${fixed} missing peer_transfers.`);
    } else {
      console.log('[Transfer Repair] No orphaned transfers found.');
    }
    
  } catch (error) {
    const errorMsg = `Transfer repair scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[Transfer Repair] ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  return { fixed, errors };
}

export async function processExpiredInviteTransfers(): Promise<{ expired: number; errors: string[] }> {
  const errors: string[] = [];
  let expired = 0;

  try {
    console.log('[Invite Expiry] Scanning for expired invitation transfers...');
    
    // Find expired invite transfers
    const now = new Date();
    const expiredInvites = await db.select().from(peerTransfers)
      .where(and(
        eq(peerTransfers.status, 'Pending'),
        eq(peerTransfers.isInvite, true),
        isNull(peerTransfers.recipientId),
        sql`${peerTransfers.expiresAt} < ${now}`
      ));
    
    for (const invite of expiredInvites) {
      try {
        const goldAmount = parseFloat(invite.amountGold || '0');
        
        // Refund sender's wallet
        const [senderWallet] = await db.select().from(wallets)
          .where(eq(wallets.userId, invite.senderId));
        
        if (senderWallet) {
          const currentGold = parseFloat(senderWallet.goldGrams?.toString() || '0');
          await db.update(wallets)
            .set({ 
              goldGrams: (currentGold + goldAmount).toFixed(6),
              updatedAt: new Date()
            })
            .where(eq(wallets.id, senderWallet.id));
        }
        
        // Update sender's transaction to expired
        if (invite.senderTransactionId) {
          await db.update(transactions)
            .set({ 
              status: 'Failed',
              description: `${invite.recipientIdentifier} did not register within 24 hours - gold refunded`,
              updatedAt: new Date()
            })
            .where(eq(transactions.id, invite.senderTransactionId));
        }
        
        // Update invite transfer to expired
        await db.update(peerTransfers)
          .set({ 
            status: 'Expired',
            rejectionReason: 'Recipient did not register within 24 hours',
            respondedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(peerTransfers.id, invite.id));
        
        console.log(`[Invite Expiry] Expired and refunded transfer ${invite.referenceNumber}: ${goldAmount.toFixed(4)}g`);
        expired++;
      } catch (err) {
        const errorMsg = `Failed to expire transfer ${invite.referenceNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`[Invite Expiry] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    if (expired > 0) {
      console.log(`[Invite Expiry] Completed. Expired ${expired} invitation transfers.`);
    } else {
      console.log('[Invite Expiry] No expired invitation transfers found.');
    }
    
  } catch (error) {
    const errorMsg = `Invite expiry scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[Invite Expiry] ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  return { expired, errors };
}

export async function runAllRepairs(): Promise<void> {
  console.log('[Data Repair] Starting automatic data repair...');
  
  const walletResult = await repairCorruptedWallets();
  const transferResult = await repairOrphanedTransfers();
  const expiryResult = await processExpiredInviteTransfers();
  
  const totalFixed = walletResult.fixed + transferResult.fixed + expiryResult.expired;
  const totalErrors = [...walletResult.errors, ...transferResult.errors, ...expiryResult.errors];
  
  if (totalFixed > 0) {
    console.log(`[Data Repair] Completed. Fixed ${walletResult.fixed} wallets, ${transferResult.fixed} transfers, expired ${expiryResult.expired} invites.`);
  }
  
  if (totalErrors.length > 0) {
    console.error(`[Data Repair] ${totalErrors.length} errors occurred:`, totalErrors);
  }
}
