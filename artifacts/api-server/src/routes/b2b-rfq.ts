import { Router } from "express";
import { db } from "@workspace/db";
import { b2bRfqsTable, b2bOffersTable, b2bWarehousesTable, b2bUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

function refCode(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

async function enrichRfq(rfq: typeof b2bRfqsTable.$inferSelect, warehouses: any[], users: any[]) {
  const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
  const offers = await db.select().from(b2bOffersTable).where(eq(b2bOffersTable.rfqId, rfq.id));
  const userMap = new Map(users.map(u => [u.id, u]));
  const buyer = users.find(u => u.id === rfq.buyerId);

  return {
    ...rfq,
    rfqRef: rfq.rfqRef,
    buyerName: buyer?.fullName ?? "Unknown",
    hubName: warehouseMap.get(rfq.hubId)?.name ?? rfq.hubId,
    createdAt: rfq.createdAt.toISOString(),
    updatedAt: rfq.updatedAt.toISOString(),
    offers: offers.map(o => ({
      ...o,
      sellerName: userMap.get(o.sellerId)?.fullName ?? "Unknown",
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

router.get("/api/b2b/rfq", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const rfqs = await db.select().from(b2bRfqsTable).where(eq(b2bRfqsTable.buyerId, userId));
    const warehouses = await db.select().from(b2bWarehousesTable);
    const users = await db.select().from(b2bUsersTable);
    const enriched = await Promise.all(rfqs.map(r => enrichRfq(r, warehouses, users)));
    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: "Failed to list RFQs" });
  }
});

router.post("/api/b2b/rfq", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { commodityType, grade, quantity, unit, hubId, targetPricePerUnit, currency, deliveryTerms, attachments, expiresAt, notes } = req.body;

    const [rfq] = await db.insert(b2bRfqsTable).values({
      id: randomUUID(),
      rfqRef: refCode("RFQ"),
      buyerId: userId,
      commodityType,
      grade: grade ?? null,
      quantity,
      unit,
      hubId,
      targetPricePerUnit: targetPricePerUnit ?? null,
      currency: currency ?? "FUSD",
      deliveryTerms,
      attachments: attachments ?? null,
      expiresAt: expiresAt ?? null,
      notes: notes ?? null,
    }).returning();

    const warehouses = await db.select().from(b2bWarehousesTable);
    const users = await db.select().from(b2bUsersTable);
    return res.status(201).json(await enrichRfq(rfq, warehouses, users));
  } catch (err) {
    return res.status(500).json({ error: "Failed to create RFQ" });
  }
});

router.get("/api/b2b/rfq/:id", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [rfq] = await db.select().from(b2bRfqsTable).where(eq(b2bRfqsTable.id, req.params.id)).limit(1);
    if (!rfq) return res.status(404).json({ error: "Not found" });
    const warehouses = await db.select().from(b2bWarehousesTable);
    const users = await db.select().from(b2bUsersTable);
    return res.json(await enrichRfq(rfq, warehouses, users));
  } catch (err) {
    return res.status(500).json({ error: "Failed to get RFQ" });
  }
});

router.post("/api/b2b/rfq/:id/offers", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { pricePerUnit, currency, availableQuantity, leadTimeDays, inventoryId, terms, validUntil } = req.body;
    const [offer] = await db.insert(b2bOffersTable).values({
      id: randomUUID(),
      rfqId: req.params.id,
      sellerId: userId,
      pricePerUnit,
      currency: currency ?? "FUSD",
      availableQuantity,
      leadTimeDays,
      inventoryId: inventoryId ?? null,
      terms: terms ?? null,
      validUntil: validUntil ?? null,
    }).returning();
    await db.update(b2bRfqsTable).set({ status: "offers_received" }).where(eq(b2bRfqsTable.id, req.params.id));
    const [seller] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, userId)).limit(1);
    return res.status(201).json({
      ...offer,
      sellerName: seller?.fullName ?? "Unknown",
      createdAt: offer.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit offer" });
  }
});

router.post("/api/b2b/rfq/:id/accept", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { offerId } = req.body;
    await db.update(b2bOffersTable).set({ status: "accepted" }).where(eq(b2bOffersTable.id, offerId));
    const [rfq] = await db.update(b2bRfqsTable).set({ status: "confirmed" }).where(eq(b2bRfqsTable.id, req.params.id)).returning();
    if (!rfq) return res.status(404).json({ error: "Not found" });
    const warehouses = await db.select().from(b2bWarehousesTable);
    const users = await db.select().from(b2bUsersTable);
    return res.json(await enrichRfq(rfq, warehouses, users));
  } catch (err) {
    return res.status(500).json({ error: "Failed to accept offer" });
  }
});

export default router;
