import { Router } from "express";
import { db } from "@workspace/db";
import { b2bTradeOrdersTable, b2bListingsTable, b2bWarehousesTable, b2bUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

function refCode() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

async function enrichOrder(o: typeof b2bTradeOrdersTable.$inferSelect) {
  const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, o.warehouseId)).limit(1);
  const [buyer] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, o.buyerId)).limit(1);
  const [seller] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, o.sellerId)).limit(1);
  return {
    ...o,
    warehouseName: warehouse?.name ?? o.warehouseId,
    buyerName: buyer?.fullName ?? "Unknown",
    sellerName: seller?.fullName ?? "Unknown",
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

router.get("/api/b2b/orders", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const orders = await db.select().from(b2bTradeOrdersTable).where(eq(b2bTradeOrdersTable.buyerId, userId));
    return res.json(await Promise.all(orders.map(enrichOrder)));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list orders" });
  }
});

router.post("/api/b2b/orders", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { listingId, rfqId, quantity, fundingMethod, incoterms, deliveryWindow, notes } = req.body;

    const [listing] = await db.select().from(b2bListingsTable).where(eq(b2bListingsTable.id, listingId)).limit(1);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const [order] = await db.insert(b2bTradeOrdersTable).values({
      id: randomUUID(),
      orderRef: refCode(),
      buyerId: userId,
      sellerId: listing.sellerId,
      listingId,
      rfqId: rfqId ?? null,
      commodity: listing.commodityType,
      quantity,
      unit: listing.unit,
      unitPrice: listing.pricePerUnit,
      totalValue: listing.pricePerUnit * quantity,
      currency: listing.currency,
      warehouseId: listing.hubId,
      fundingMethod: fundingMethod ?? null,
      incoterms: incoterms ?? listing.incoterms,
      deliveryWindow: deliveryWindow ?? null,
      notes: notes ?? null,
    }).returning();

    return res.status(201).json(await enrichOrder(order));
  } catch (err) {
    return res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/api/b2b/orders/:id", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [order] = await db.select().from(b2bTradeOrdersTable).where(eq(b2bTradeOrdersTable.id, req.params.id)).limit(1);
    if (!order) return res.status(404).json({ error: "Not found" });
    return res.json(await enrichOrder(order));
  } catch (err) {
    return res.status(500).json({ error: "Failed to get order" });
  }
});

router.post("/api/b2b/orders/:id/payment", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [order] = await db.update(b2bTradeOrdersTable).set({ status: "payment_confirmed" }).where(eq(b2bTradeOrdersTable.id, req.params.id)).returning();
    if (!order) return res.status(404).json({ error: "Not found" });
    return res.json(await enrichOrder(order));
  } catch (err) {
    return res.status(500).json({ error: "Failed to confirm payment" });
  }
});

export default router;
