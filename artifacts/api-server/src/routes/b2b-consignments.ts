import { Router } from "express";
import { db } from "@workspace/db";
import { b2bConsignmentsTable, b2bWarehousesTable, b2bUsersTable } from "@workspace/db";
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

router.get("/api/b2b/consignments", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const consignments = await db.select().from(b2bConsignmentsTable).where(eq(b2bConsignmentsTable.sellerId, userId));
    const warehouses = await db.select().from(b2bWarehousesTable);
    const users = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, userId));
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

    return res.json(consignments.map(c => ({
      ...c,
      warehouseName: warehouseMap.get(c.warehouseId)?.name ?? c.warehouseId,
      sellerName: users[0]?.fullName ?? "Unknown",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list consignments" });
  }
});

router.post("/api/b2b/consignments", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { commodityType, grade, quantity, unit, packaging, warehouseId, originCountry, incoterms, transportMode, expectedArrival, description } = req.body;
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, userId)).limit(1);
    const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, warehouseId)).limit(1);

    const [c] = await db.insert(b2bConsignmentsTable).values({
      id: randomUUID(),
      consignmentRef: refCode("CONS"),
      sellerId: userId,
      commodityType,
      grade: grade ?? null,
      quantity,
      unit,
      packaging: packaging ?? null,
      warehouseId,
      originCountry,
      incoterms,
      transportMode: transportMode ?? null,
      expectedArrival,
      description: description ?? null,
    }).returning();

    return res.status(201).json({
      ...c,
      warehouseName: warehouse?.name ?? warehouseId,
      sellerName: user?.fullName ?? "Unknown",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create consignment" });
  }
});

router.get("/api/b2b/consignments/:id", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [c] = await db.select().from(b2bConsignmentsTable).where(eq(b2bConsignmentsTable.id, req.params.id)).limit(1);
    if (!c) return res.status(404).json({ error: "Not found" });
    const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, c.warehouseId)).limit(1);
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, c.sellerId)).limit(1);
    return res.json({
      ...c,
      warehouseName: warehouse?.name ?? c.warehouseId,
      sellerName: user?.fullName ?? "Unknown",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get consignment" });
  }
});

router.patch("/api/b2b/consignments/:id/status", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { status, notes: _notes } = req.body;
    const [c] = await db.update(b2bConsignmentsTable).set({ status }).where(eq(b2bConsignmentsTable.id, req.params.id)).returning();
    if (!c) return res.status(404).json({ error: "Not found" });
    const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, c.warehouseId)).limit(1);
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, c.sellerId)).limit(1);
    return res.json({
      ...c,
      warehouseName: warehouse?.name ?? c.warehouseId,
      sellerName: user?.fullName ?? "Unknown",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
