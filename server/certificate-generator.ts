/**
 * Certificate Generator Service
 * 
 * Auto-generates certificates on transaction approval:
 * - Digital Ownership Certificate (Finatrades)
 * - Physical Storage Certificate (Wingold & Metals DMCC)
 * - Conversion Certificate (MPGW<->FPGW transfers)
 * - Lock Certificate (BNSL/Trade locks)
 */

import { db } from "./db";
import { 
  certificates, 
  transactions,
  allocations,
  users,
  type Certificate,
  type InsertCertificate
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

type CertificateType = 
  | 'Digital Ownership' 
  | 'Physical Storage' 
  | 'Transfer' 
  | 'BNSL Lock' 
  | 'Trade Lock' 
  | 'Trade Release' 
  | 'Conversion' 
  | 'Title Transfer';

interface GenerateCertificateParams {
  userId: string;
  transactionId?: string;
  certificateType: CertificateType;
  goldGrams: number;
  goldPriceUsd?: number;
  goldWalletType: 'MPGW' | 'FPGW';
  vaultLocation?: string;
  allocationBatchRef?: string;
  fpgwBatchId?: string;
  notes?: string;
  issuedBy?: string;
}

interface TransactionCertificatesResult {
  ownershipCertificate: Certificate;
  storageCertificate: Certificate;
  allocationId?: string;
}

/**
 * Generate a unique certificate number
 */
function generateCertificateNumber(type: CertificateType): string {
  const prefix = {
    'Digital Ownership': 'FT-OWN',
    'Physical Storage': 'WG-STR',
    'Transfer': 'FT-TRF',
    'BNSL Lock': 'FT-BLK',
    'Trade Lock': 'FT-TLK',
    'Trade Release': 'FT-TRL',
    'Conversion': 'FT-CNV',
    'Title Transfer': 'FT-TTR'
  }[type] || 'FT-CRT';

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a single certificate
 */
export async function generateCertificate(params: GenerateCertificateParams): Promise<Certificate> {
  const {
    userId,
    transactionId,
    certificateType,
    goldGrams,
    goldPriceUsd,
    goldWalletType,
    vaultLocation,
    allocationBatchRef,
    fpgwBatchId,
    notes,
    issuedBy = 'system'
  } = params;

  const certNumber = generateCertificateNumber(certificateType);
  const totalValue = goldPriceUsd ? goldGrams * goldPriceUsd : undefined;

  const issuer = certificateType === 'Physical Storage' 
    ? 'Wingold & Metals DMCC' 
    : 'Finatrades';

  const [certificate] = await db
    .insert(certificates)
    .values({
      certificateNumber: certNumber,
      userId,
      transactionId,
      type: certificateType,
      status: 'Active',
      issuer,
      goldGrams: goldGrams.toString(),
      goldPriceUsdPerGram: goldPriceUsd?.toString(),
      totalValueUsd: totalValue?.toString(),
      goldWalletType,
      vaultLocation: vaultLocation || 'Dubai - Wingold & Metals DMCC',
      wingoldStorageRef: allocationBatchRef,
      fpgwBatchId
    })
    .returning();

  console.log(`[Certificate] Generated ${certificateType} certificate ${certNumber} for ${goldGrams}g`);
  
  return certificate;
}

/**
 * Generate ownership + storage certificates on deposit approval
 */
export async function generateTransactionCertificates(
  transactionId: string,
  vaultLocation: string,
  allocationBatchRef: string,
  goldWalletType: 'MPGW' | 'FPGW',
  fpgwBatchId?: string
): Promise<TransactionCertificatesResult> {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  const goldGrams = parseFloat(transaction.amountGold || '0');
  const goldPriceUsd = parseFloat(transaction.goldPriceUsdPerGram || '0');

  const ownershipCertificate = await generateCertificate({
    userId: transaction.userId,
    transactionId,
    certificateType: 'Digital Ownership',
    goldGrams,
    goldPriceUsd,
    goldWalletType,
    vaultLocation,
    allocationBatchRef,
    fpgwBatchId,
    notes: `Gold ownership for ${transaction.type} transaction`
  });

  const storageCertificate = await generateCertificate({
    userId: transaction.userId,
    transactionId,
    certificateType: 'Physical Storage',
    goldGrams,
    goldPriceUsd,
    goldWalletType,
    vaultLocation,
    allocationBatchRef,
    notes: `Physical gold storage at ${vaultLocation}`
  });

  const { createAllocation, linkAllocationToCertificate } = await import('./allocation-service');
  
  const allocation = await createAllocation({
    userId: transaction.userId,
    transactionId,
    goldGrams,
    vaultLocation,
    allocationBatchRef,
    goldWalletType,
    goldPriceUsdPerGram: goldPriceUsd,
    allocatedBy: 'system'
  });

  await linkAllocationToCertificate(allocation.id, storageCertificate.id);

  return {
    ownershipCertificate,
    storageCertificate,
    allocationId: allocation.id
  };
}

/**
 * Generate conversion certificate for MPGW<->FPGW transfer
 */
export async function generateConversionCertificate(
  userId: string,
  goldGrams: number,
  goldPriceUsd: number,
  fromWallet: 'MPGW' | 'FPGW',
  toWallet: 'MPGW' | 'FPGW',
  transactionId?: string,
  fpgwBatchId?: string
): Promise<Certificate> {
  return generateCertificate({
    userId,
    transactionId,
    certificateType: 'Conversion',
    goldGrams,
    goldPriceUsd,
    goldWalletType: toWallet,
    fpgwBatchId,
    notes: `Converted ${goldGrams.toFixed(4)}g from ${fromWallet} to ${toWallet} at $${goldPriceUsd.toFixed(2)}/g`
  });
}

/**
 * Generate lock certificate for BNSL or Trade
 */
export async function generateLockCertificate(
  userId: string,
  lockType: 'BNSL Lock' | 'Trade Lock',
  goldGrams: number,
  goldPriceUsd: number,
  goldWalletType: 'MPGW' | 'FPGW',
  referenceId: string,
  notes?: string
): Promise<Certificate> {
  return generateCertificate({
    userId,
    certificateType: lockType,
    goldGrams,
    goldPriceUsd,
    goldWalletType,
    notes: notes || `${lockType} - ${goldGrams.toFixed(4)}g locked from ${goldWalletType}`
  });
}

/**
 * Generate transfer certificate for P2P gold transfers
 */
export async function generateTransferCertificate(
  senderId: string,
  receiverId: string,
  goldGrams: number,
  goldPriceUsd: number,
  goldWalletType: 'MPGW' | 'FPGW',
  transactionId: string
): Promise<{ senderCert: Certificate; receiverCert: Certificate }> {
  const senderCert = await generateCertificate({
    userId: senderId,
    transactionId,
    certificateType: 'Transfer',
    goldGrams,
    goldPriceUsd,
    goldWalletType,
    notes: `Sent ${goldGrams.toFixed(4)}g to another user`
  });

  const receiverCert = await generateCertificate({
    userId: receiverId,
    transactionId,
    certificateType: 'Digital Ownership',
    goldGrams,
    goldPriceUsd,
    goldWalletType,
    notes: `Received ${goldGrams.toFixed(4)}g from P2P transfer`
  });

  return { senderCert, receiverCert };
}

/**
 * Get certificates for a transaction
 */
export async function getCertificatesByTransaction(transactionId: string): Promise<Certificate[]> {
  return db
    .select()
    .from(certificates)
    .where(eq(certificates.transactionId, transactionId));
}

/**
 * Get certificates for a user
 */
export async function getUserCertificates(userId: string, limit = 50): Promise<Certificate[]> {
  return db
    .select()
    .from(certificates)
    .where(eq(certificates.userId, userId))
    .orderBy(sql`${certificates.issuedAt} DESC`)
    .limit(limit);
}
