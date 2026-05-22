import { Router } from "express";
import { db } from "@workspace/db";
import { b2bBarterRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

function refCode() {
  return `BTR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function mapBarter(b: typeof b2bBarterRequestsTable.$inferSelect) {
  return { ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() };
}

router.get("/api/b2b/barter", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const requests = await db.select().from(b2bBarterRequestsTable).where(eq(b2bBarterRequestsTable.requesterId, userId));
    return res.json(requests.map(mapBarter));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list barter requests" });
  }
});

router.post("/api/b2b/barter", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const {
      offeredCommodity, offeredQuantity, offeredUnit,
      requiredCommodity, requiredQuantity, requiredUnit,
      governmentEntity, mandate, deliveryTerms, expectedSettlementDate, objectives,
    } = req.body;

    const [barter] = await db.insert(b2bBarterRequestsTable).values({
      id: randomUUID(),
      barterRef: refCode(),
      requesterId: userId,
      governmentEntity,
      offeredCommodity,
      offeredQuantity,
      offeredUnit: offeredUnit ?? "MT",
      requiredCommodity,
      requiredQuantity,
      requiredUnit: requiredUnit ?? "MT",
      mandate: mandate ?? null,
      deliveryTerms,
      objectives: objectives ?? null,
      expectedSettlementDate: expectedSettlementDate ?? null,
    }).returning();

    return res.status(201).json(mapBarter(barter));
  } catch (err) {
    return res.status(500).json({ error: "Failed to create barter request" });
  }
});

router.get("/api/b2b/barter/:id", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [barter] = await db.select().from(b2bBarterRequestsTable).where(eq(b2bBarterRequestsTable.id, req.params.id)).limit(1);
    if (!barter) return res.status(404).json({ error: "Not found" });
    return res.json(mapBarter(barter));
  } catch (err) {
    return res.status(500).json({ error: "Failed to get barter request" });
  }
});

export default router;
