/**
 * Allocation Service
 * 
 * Manages physical gold allocations with Wingold & Metals DMCC.
 * Links transactions to physical vault storage references.
 * 
 * Key Operations:
 * - createAllocation: Create allocation record on transaction approval
 * - getAllocations: Get user's allocation history
 * - linkToCertificate: Associate allocation with storage certificate
 */

import { db } from "./db";
import { 
  allocations, 
  certificates,
  transactions,
  type Allocation,
  type InsertAllocation
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface CreateAllocationParams {
  userId: string;
  transactionId: string;
  goldGrams: number;
  vaultLocation: string;
  allocationBatchRef: string;
  goldWalletType: 'MPGW' | 'FPGW';
  goldPriceUsdPerGram?: number;
  allocatedBy?: string;
  notes?: string;
}

export interface AllocationSummary {
  totalAllocatedGrams: number;
  allocations: Allocation[];
  byLocation: Record<string, number>;
}

/**
 * Create a new allocation when admin approves a deposit/purchase
 */
export async function createAllocation(params: CreateAllocationParams): Promise<Allocation> {
  const {
    userId,
    transactionId,
    goldGrams,
    vaultLocation,
    allocationBatchRef,
    goldWalletType,
    goldPriceUsdPerGram,
    allocatedBy,
    notes
  } = params;

  const [allocation] = await db
    .insert(allocations)
    .values({
      userId,
      transactionId,
      gramsAllocated: goldGrams.toString(),
      vaultLocation,
      allocationBatchRef,
      goldWalletType,
      createdBy: allocatedBy || 'system',
      status: 'Allocated',
      notes
    })
    .returning();

  console.log(`[Allocation] Created allocation ${allocation.id} for ${goldGrams}g at ${vaultLocation}`);
  
  return allocation;
}

/**
 * Get all allocations for a user
 */
export async function getUserAllocations(userId: string): Promise<Allocation[]> {
  return db
    .select()
    .from(allocations)
    .where(eq(allocations.userId, userId))
    .orderBy(desc(allocations.createdAt));
}

/**
 * Get allocation summary for a user
 */
export async function getAllocationSummary(userId: string): Promise<AllocationSummary> {
  const userAllocations = await getUserAllocations(userId);
  
  const activeAllocations = userAllocations.filter(a => a.status === 'Allocated');
  const totalAllocatedGrams = activeAllocations.reduce(
    (sum, a) => sum + parseFloat(a.gramsAllocated), 
    0
  );

  const byLocation: Record<string, number> = {};
  activeAllocations.forEach(a => {
    const loc = a.vaultLocation;
    byLocation[loc] = (byLocation[loc] || 0) + parseFloat(a.gramsAllocated);
  });

  return {
    totalAllocatedGrams,
    allocations: userAllocations,
    byLocation
  };
}

/**
 * Get allocation by transaction ID
 */
export async function getAllocationByTransaction(transactionId: string): Promise<Allocation | null> {
  const [allocation] = await db
    .select()
    .from(allocations)
    .where(eq(allocations.transactionId, transactionId));
  
  return allocation || null;
}

/**
 * Link allocation to a storage certificate
 */
export async function linkAllocationToCertificate(
  allocationId: string, 
  certificateId: string
): Promise<void> {
  await db
    .update(allocations)
    .set({ storageCertificateId: certificateId })
    .where(eq(allocations.id, allocationId));
}

/**
 * Update allocation status (e.g., on withdrawal)
 */
export async function updateAllocationStatus(
  allocationId: string,
  status: 'Allocated' | 'Released' | 'Adjusted'
): Promise<void> {
  await db
    .update(allocations)
    .set({ 
      status,
      updatedAt: new Date()
    })
    .where(eq(allocations.id, allocationId));
}

/**
 * Generate a unique allocation batch reference
 */
export function generateAllocationRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WG-ALOC-${timestamp}-${random}`;
}
