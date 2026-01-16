import { db } from "./db";
import { dcaPlans, dcaExecutions, wallets, transactions } from "@shared/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { getGoldPricePerGram } from "./gold-price-service";
import { storage } from "./storage";

const DCA_PROCESS_INTERVAL = 60 * 1000; // Check every minute
let processorInterval: ReturnType<typeof setInterval> | null = null;

export function startDcaProcessor(): void {
  console.log("[DCA Processor] Starting DCA background processor...");
  
  processorInterval = setInterval(async () => {
    try {
      await processDuePlans();
    } catch (error) {
      console.error("[DCA Processor] Error in processing cycle:", error);
    }
  }, DCA_PROCESS_INTERVAL);
  
  setTimeout(() => processDuePlans(), 5000);
  
  console.log("[DCA Processor] DCA processor started (interval: 1 minute)");
}

export function stopDcaProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log("[DCA Processor] DCA processor stopped");
  }
}

async function processDuePlans(): Promise<void> {
  const now = new Date();
  
  const duePlans = await db
    .select()
    .from(dcaPlans)
    .where(
      and(
        eq(dcaPlans.status, "active"),
        lte(dcaPlans.nextRunAt, now)
      )
    );

  if (duePlans.length === 0) {
    return;
  }

  console.log(`[DCA Processor] Found ${duePlans.length} plans due for execution`);

  for (const plan of duePlans) {
    try {
      await executeDcaPlan(plan);
    } catch (error) {
      console.error(`[DCA Processor] Failed to execute plan ${plan.id}:`, error);
    }
  }
}

async function executeDcaPlan(plan: typeof dcaPlans.$inferSelect): Promise<void> {
  console.log(`[DCA Processor] Executing DCA plan ${plan.id} for user ${plan.userId}`);
  
  const scheduledAt = new Date();
  
  const [execution] = await db
    .insert(dcaExecutions)
    .values({
      planId: plan.id,
      userId: plan.userId,
      amountUsd: plan.amountUsd,
      scheduledAt,
      status: "processing",
    })
    .returning();

  try {
    const goldPrice = await getGoldPricePerGram();
    if (!goldPrice || goldPrice <= 0) {
      throw new Error("Unable to fetch gold price");
    }

    const amountUsd = parseFloat(plan.amountUsd);
    const goldGrams = amountUsd / goldPrice;

    const wallet = await storage.getWallet(plan.userId);
    if (!wallet) {
      throw new Error("User wallet not found");
    }

    const usdBalance = parseFloat(wallet.usdBalance || "0");
    if (usdBalance < amountUsd) {
      await db
        .update(dcaExecutions)
        .set({
          status: "skipped",
          errorMessage: `Insufficient USD balance: ${usdBalance.toFixed(2)} < ${amountUsd.toFixed(2)}`,
          executedAt: new Date(),
        })
        .where(eq(dcaExecutions.id, execution.id));

      console.log(`[DCA Processor] Plan ${plan.id} skipped: insufficient balance`);
      
      await updateNextRunTime(plan);
      return;
    }

    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: plan.userId,
        type: "Buy",
        amountGold: goldGrams.toFixed(8),
        amountUsd: amountUsd.toFixed(2),
        goldPriceUsdPerGram: goldPrice.toFixed(2),
        status: "Completed",
        description: `DCA Auto-Buy: ${goldGrams.toFixed(4)}g gold at $${goldPrice.toFixed(2)}/g`,
        referenceId: `DCA-${plan.id}-${execution.id}`,
        sourceModule: 'dca',
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .returning();

    const currentGoldGrams = parseFloat(wallet.goldGrams || "0");
    const currentUsdBalance = parseFloat(wallet.usdBalance || "0");

    await db
      .update(wallets)
      .set({
        goldGrams: (currentGoldGrams + goldGrams).toFixed(8),
        usdBalance: (currentUsdBalance - amountUsd).toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    await db
      .update(dcaExecutions)
      .set({
        status: "completed",
        transactionId: transaction.id,
        goldGrams: goldGrams.toFixed(8),
        pricePerGram: goldPrice.toFixed(4),
        executedAt: new Date(),
      })
      .where(eq(dcaExecutions.id, execution.id));

    const currentTotalExecutions = plan.totalExecutions || 0;
    const currentTotalGold = parseFloat(plan.totalGoldPurchased || "0");
    const currentTotalUsd = parseFloat(plan.totalUsdSpent || "0");

    await db
      .update(dcaPlans)
      .set({
        totalExecutions: currentTotalExecutions + 1,
        totalGoldPurchased: (currentTotalGold + goldGrams).toFixed(8),
        totalUsdSpent: (currentTotalUsd + amountUsd).toFixed(2),
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dcaPlans.id, plan.id));

    await updateNextRunTime(plan);

    await storage.createAuditLog({
      entityType: 'DcaPlan',
      entityId: plan.id,
      actor: plan.userId,
      actorRole: 'user',
      actionType: 'dca_execution_completed',
      details: JSON.stringify({
        planId: plan.id,
        executionId: execution.id,
        transactionId: transaction.id,
        amountUsd,
        goldGrams,
        pricePerGram: goldPrice,
      }),
      timestamp: new Date(),
    });

    console.log(`[DCA Processor] Plan ${plan.id} executed successfully: ${goldGrams.toFixed(4)}g for $${amountUsd.toFixed(2)}`);

  } catch (error: any) {
    console.error(`[DCA Processor] Execution failed for plan ${plan.id}:`, error);

    await db
      .update(dcaExecutions)
      .set({
        status: "failed",
        errorMessage: error.message || "Unknown error",
        executedAt: new Date(),
      })
      .where(eq(dcaExecutions.id, execution.id));

    await updateNextRunTime(plan);

    await storage.createAuditLog({
      entityType: 'DcaPlan',
      entityId: plan.id,
      actor: plan.userId,
      actorRole: 'user',
      actionType: 'dca_execution_failed',
      details: JSON.stringify({
        planId: plan.id,
        executionId: execution.id,
        error: error.message,
      }),
      timestamp: new Date(),
    });
  }
}

async function updateNextRunTime(plan: typeof dcaPlans.$inferSelect): Promise<void> {
  const now = new Date();
  let nextRunAt = new Date(plan.nextRunAt);

  switch (plan.frequency) {
    case "daily":
      nextRunAt.setDate(nextRunAt.getDate() + 1);
      break;
    case "weekly":
      nextRunAt.setDate(nextRunAt.getDate() + 7);
      break;
    case "biweekly":
      nextRunAt.setDate(nextRunAt.getDate() + 14);
      break;
    case "monthly":
      nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      if (plan.dayOfMonth) {
        const lastDayOfMonth = new Date(nextRunAt.getFullYear(), nextRunAt.getMonth() + 1, 0).getDate();
        nextRunAt.setDate(Math.min(plan.dayOfMonth, lastDayOfMonth));
      }
      break;
  }

  if (nextRunAt <= now) {
    nextRunAt = new Date(now.getTime() + 60000);
  }

  await db
    .update(dcaPlans)
    .set({
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(dcaPlans.id, plan.id));
}
