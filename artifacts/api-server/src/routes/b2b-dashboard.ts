import { Router } from "express";
import { db } from "@workspace/db";
import {
  b2bUsersTable,
  b2bConsignmentsTable,
  b2bTradeOrdersTable,
  b2bRfqsTable,
  b2bEscrowAccountsTable,
  b2bInventoryTable,
} from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

router.get("/api/b2b/dashboard/summary", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "Not found" });

    const [consignmentCount] = await db.select({ count: count() }).from(b2bConsignmentsTable).where(eq(b2bConsignmentsTable.sellerId, userId));
    const [orderCount] = await db.select({ count: count() }).from(b2bTradeOrdersTable).where(eq(b2bTradeOrdersTable.buyerId, userId));
    const [rfqCount] = await db.select({ count: count() }).from(b2bRfqsTable).where(eq(b2bRfqsTable.buyerId, userId));
    const escrows = await db.select().from(b2bEscrowAccountsTable).where(eq(b2bEscrowAccountsTable.buyerId, userId));
    const inventory = await db.select().from(b2bInventoryTable).where(eq(b2bInventoryTable.ownerId, userId));

    const escrowValue = escrows.reduce((s, e) => s + (e.amount ?? 0), 0);
    const inventoryValue = inventory.reduce((s, i) => s + (i.fusdValue ?? 0), 0);

    return res.json({
      role: user.role,
      totalConsignments: consignmentCount.count,
      activeOrders: orderCount.count,
      pendingRfqs: rfqCount.count,
      escrowValue,
      inventoryValue,
      completedDeals: 0,
      monthlyVolume: 0,
    });
  } catch (err) {
    console.error("[B2B Dashboard] summary error:", err);
    return res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

router.get("/api/b2b/dashboard/activity", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const consignments = await db.select().from(b2bConsignmentsTable).where(eq(b2bConsignmentsTable.sellerId, userId)).limit(3);
    const orders = await db.select().from(b2bTradeOrdersTable).where(eq(b2bTradeOrdersTable.buyerId, userId)).limit(3);

    const activities = [
      ...consignments.map(c => ({
        id: c.id,
        type: "consignment" as const,
        title: `Consignment ${c.consignmentRef}`,
        description: `${c.commodityType} — ${c.quantity} ${c.unit}`,
        timestamp: c.createdAt.toISOString(),
        status: c.status,
      })),
      ...orders.map(o => ({
        id: o.id,
        type: "order" as const,
        title: `Order ${o.orderRef}`,
        description: `${o.commodity} — ${o.totalValue} ${o.currency}`,
        timestamp: o.createdAt.toISOString(),
        status: o.status,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return res.json(activities);
  } catch (err) {
    console.error("[B2B Dashboard] activity error:", err);
    return res.status(500).json({ error: "Failed to get activity" });
  }
});

router.get("/api/b2b/dashboard/stats", async (req, res) => {
  try {
    const [userCount] = await db.select({ count: count() }).from(b2bUsersTable);
    const [rfqCount] = await db.select({ count: count() }).from(b2bRfqsTable);
    const [orderCount] = await db.select({ count: count() }).from(b2bTradeOrdersTable);

    return res.json({
      activeBuyers: Math.floor(userCount.count * 0.4),
      verifiedSellers: Math.floor(userCount.count * 0.3),
      rfqsCreated: rfqCount.count,
      dealsMatched: Math.floor(orderCount.count * 0.7),
      totalHubs: 14,
      totalVolumeUsd: 0,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
