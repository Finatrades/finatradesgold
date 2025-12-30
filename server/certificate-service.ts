/**
 * Certificate Auto-Generation Service
 * 
 * Generates the 5 required certificate types automatically:
 * 1. DIGITAL_OWNERSHIP - Issued when user receives gold
 * 2. PHYSICAL_STORAGE - Issued after physical allocation confirmation
 * 3. TRANSFER - Issued to sender on P2P transfers
 * 4. BNSL_LOCK / TRADE_LOCK - Issued when moving gold to locked state
 * 5. TITLE_TRANSFER_TO_FINATRADES - Issued on withdrawal/sell
 */

import { storage } from './storage';
import type { InsertCertificate, InsertAllocation } from '@shared/schema';

export type CertificateType = 
  | 'Digital Ownership'
  | 'Physical Storage'
  | 'Transfer'
  | 'BNSL Lock'
  | 'Trade Lock'
  | 'Trade Release';

interface CertificateData {
  userId: string;
  transactionId?: string;
  grams: number;
  goldPriceUsd?: number;
  vaultLocation?: string;
  physicalProvider?: string;
  allocationBatchRef?: string;
  recipientUserId?: string;
  recipientName?: string;
  lockPurpose?: 'BNSL' | 'Trade';
  bnslPlanId?: string;
  tradeCaseId?: string;
  notes?: string;
}

/**
 * Generate a unique certificate number
 */
function generateCertificateNumber(type: CertificateType): string {
  const prefix = {
    'Digital Ownership': 'DOC',
    'Physical Storage': 'PSC',
    'Transfer': 'TRC',
    'BNSL Lock': 'BLC',
    'Trade Lock': 'TLC',
    'Trade Release': 'TRL'
  }[type];
  
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate Digital Ownership Certificate
 * Issued when user receives gold into FinaPay/FinaVault (after approval/completion)
 */
export async function generateDigitalOwnershipCertificate(data: CertificateData): Promise<string> {
  const user = await storage.getUser(data.userId);
  if (!user) throw new Error('User not found');

  const certificateData: InsertCertificate = {
    userId: data.userId,
    transactionId: data.transactionId,
    type: 'Digital Ownership',
    certificateNumber: generateCertificateNumber('Digital Ownership'),
    goldGrams: data.grams.toString(),
    goldPriceUsdPerGram: data.goldPriceUsd?.toString() || '0',
    totalValueUsd: ((data.grams || 0) * (data.goldPriceUsd || 0)).toString(),
    vaultLocation: data.vaultLocation || 'Dubai - Wingold & Metals DMCC',
    issuer: 'Finatrades',
    status: 'Active'
  };

  const cert = await storage.createCertificate(certificateData);
  console.log(`[Certificate] Generated Digital Ownership Certificate: ${cert.certificateNumber}`);
  return cert.id;
}

/**
 * Generate Physical Storage Certificate (Wingold & Metals DMCC)
 * Issued only after physical allocation confirmation
 */
export async function generatePhysicalStorageCertificate(data: CertificateData): Promise<string> {
  const user = await storage.getUser(data.userId);
  if (!user) throw new Error('User not found');

  const certificateData: InsertCertificate = {
    userId: data.userId,
    transactionId: data.transactionId,
    type: 'Physical Storage',
    certificateNumber: generateCertificateNumber('Physical Storage'),
    goldGrams: data.grams.toString(),
    goldPriceUsdPerGram: data.goldPriceUsd?.toString() || '0',
    totalValueUsd: ((data.grams || 0) * (data.goldPriceUsd || 0)).toString(),
    vaultLocation: data.vaultLocation || 'Dubai - Wingold & Metals DMCC',
    wingoldStorageRef: data.allocationBatchRef,
    issuer: 'Wingold & Metals DMCC',
    status: 'Active'
  };

  const cert = await storage.createCertificate(certificateData);
  console.log(`[Certificate] Generated Physical Storage Certificate: ${cert.certificateNumber}`);
  return cert.id;
}

/**
 * Generate Transfer Certificate
 * Issued to sender on every P2P transfer
 */
export async function generateTransferCertificate(data: CertificateData): Promise<string> {
  const sender = await storage.getUser(data.userId);
  if (!sender) throw new Error('Sender not found');

  const senderName = `${sender.firstName} ${sender.lastName}`;
  let recipientName = data.recipientName || 'Unknown';
  if (data.recipientUserId) {
    const recipient = await storage.getUser(data.recipientUserId);
    if (recipient) {
      recipientName = `${recipient.firstName} ${recipient.lastName}`;
    }
  }

  const certificateData: InsertCertificate = {
    userId: data.userId,
    transactionId: data.transactionId,
    type: 'Transfer',
    certificateNumber: generateCertificateNumber('Transfer'),
    goldGrams: data.grams.toString(),
    goldPriceUsdPerGram: data.goldPriceUsd?.toString() || '0',
    totalValueUsd: ((data.grams || 0) * (data.goldPriceUsd || 0)).toString(),
    vaultLocation: data.vaultLocation || 'Dubai - Wingold & Metals DMCC',
    fromUserId: data.userId,
    toUserId: data.recipientUserId,
    fromUserName: senderName,
    toUserName: recipientName,
    issuer: 'Finatrades',
    status: 'Active'
  };

  const cert = await storage.createCertificate(certificateData);
  console.log(`[Certificate] Generated Transfer Certificate: ${cert.certificateNumber} (${senderName} → ${recipientName})`);
  return cert.id;
}

/**
 * Generate Lock Certificate
 * Issued when moving gold from available → locked (BNSL lock or Trade lock)
 */
export async function generateLockCertificate(data: CertificateData): Promise<string> {
  const user = await storage.getUser(data.userId);
  if (!user) throw new Error('User not found');

  const lockPurpose = data.lockPurpose || 'BNSL';
  const certType: CertificateType = lockPurpose === 'BNSL' ? 'BNSL Lock' : 'Trade Lock';
  
  const certificateData: InsertCertificate = {
    userId: data.userId,
    transactionId: data.transactionId,
    type: certType,
    certificateNumber: generateCertificateNumber(certType),
    goldGrams: data.grams.toString(),
    goldPriceUsdPerGram: data.goldPriceUsd?.toString() || '0',
    totalValueUsd: ((data.grams || 0) * (data.goldPriceUsd || 0)).toString(),
    vaultLocation: data.vaultLocation || 'Dubai - Wingold & Metals DMCC',
    bnslPlanId: data.bnslPlanId,
    tradeCaseId: data.tradeCaseId,
    issuer: 'Finatrades',
    status: 'Active'
  };

  const cert = await storage.createCertificate(certificateData);
  console.log(`[Certificate] Generated Lock Certificate (${lockPurpose}): ${cert.certificateNumber}`);
  return cert.id;
}

/**
 * Generate Title Transfer to Finatrades Certificate
 * Issued when user sells/withdraws gold (ownership reduced and transferred to Finatrades)
 */
export async function generateTitleTransferCertificate(data: CertificateData): Promise<string> {
  const user = await storage.getUser(data.userId);
  if (!user) throw new Error('User not found');

  const certificateData: InsertCertificate = {
    userId: data.userId,
    transactionId: data.transactionId,
    type: 'Trade Release',
    certificateNumber: generateCertificateNumber('Trade Release'),
    goldGrams: data.grams.toString(),
    goldPriceUsdPerGram: data.goldPriceUsd?.toString() || '0',
    totalValueUsd: ((data.grams || 0) * (data.goldPriceUsd || 0)).toString(),
    vaultLocation: data.vaultLocation || 'Dubai - Wingold & Metals DMCC',
    issuer: 'Finatrades',
    status: 'Active'
  };

  const cert = await storage.createCertificate(certificateData);
  console.log(`[Certificate] Generated Title Transfer Certificate: ${cert.certificateNumber}`);
  return cert.id;
}

/**
 * Create a physical gold allocation record
 */
export async function createAllocation(data: {
  transactionId?: string;
  userId: string;
  gramsAllocated: number;
  vaultLocation?: string;
  physicalProvider?: string;
  allocationBatchRef?: string;
  notes?: string;
  createdBy?: string;
}): Promise<{ allocationId: string; storageCertificateId: string }> {
  // First create the physical storage certificate
  const storageCertificateId = await generatePhysicalStorageCertificate({
    userId: data.userId,
    transactionId: data.transactionId,
    grams: data.gramsAllocated,
    vaultLocation: data.vaultLocation,
    physicalProvider: data.physicalProvider,
    allocationBatchRef: data.allocationBatchRef,
    notes: data.notes
  });

  // Then create the allocation record
  const allocationData: InsertAllocation = {
    transactionId: data.transactionId,
    userId: data.userId,
    gramsAllocated: data.gramsAllocated.toString(),
    vaultLocation: data.vaultLocation || 'Dubai - Wingold & Metals DMCC',
    physicalProvider: data.physicalProvider || 'Wingold & Metals DMCC',
    storageCertificateId,
    allocationBatchRef: data.allocationBatchRef,
    status: 'Allocated',
    notes: data.notes,
    createdBy: data.createdBy || 'system'
  };

  const allocation = await storage.createAllocation(allocationData);
  console.log(`[Allocation] Created allocation ${allocation.id} for ${data.gramsAllocated}g`);

  return {
    allocationId: allocation.id,
    storageCertificateId
  };
}

/**
 * Complete approval flow - generates all required certificates
 * Used when admin approves a deposit/add funds/buy gold transaction
 */
export async function completeApprovalWithCertificates(data: {
  transactionId: string;
  userId: string;
  grams: number;
  goldPriceUsd: number;
  vaultLocation?: string;
  allocationBatchRef?: string;
  approvedBy: string;
}): Promise<{
  digitalOwnershipCertId: string;
  allocationId: string;
  storageCertificateId: string;
}> {
  // Create allocation with physical storage certificate
  const { allocationId, storageCertificateId } = await createAllocation({
    transactionId: data.transactionId,
    userId: data.userId,
    gramsAllocated: data.grams,
    vaultLocation: data.vaultLocation,
    allocationBatchRef: data.allocationBatchRef,
    createdBy: data.approvedBy
  });

  // Create digital ownership certificate
  const digitalOwnershipCertId = await generateDigitalOwnershipCertificate({
    userId: data.userId,
    transactionId: data.transactionId,
    grams: data.grams,
    goldPriceUsd: data.goldPriceUsd,
    vaultLocation: data.vaultLocation
  });

  console.log(`[Approval] Completed approval with certificates for transaction ${data.transactionId}`);

  return {
    digitalOwnershipCertId,
    allocationId,
    storageCertificateId
  };
}
