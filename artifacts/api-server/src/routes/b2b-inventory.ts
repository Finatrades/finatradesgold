import { Router } from "express";
import { db } from "@workspace/db";
import { b2bInventoryTable, b2bWarehousesTable, b2bUsersTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

router.get("/api/b2b/inventory", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const items = await db.select().from(b2bInventoryTable).where(eq(b2bInventoryTable.ownerId, userId));
    const warehouses = await db.select().from(b2bWarehousesTable);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
    return res.json(items.map(i => ({
      ...i,
      warehouseName: warehouseMap.get(i.warehouseId)?.name ?? i.warehouseId,
      ownerName: "Me",
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list inventory" });
  }
});

router.get("/api/b2b/inventory/summary", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const items = await db.select().from(b2bInventoryTable).where(eq(b2bInventoryTable.ownerId, userId));
    const summary = { available: 0, reserved: 0, pledged: 0, released: 0, sold: 0, totalFusdValue: 0 };
    for (const item of items) {
      summary[item.status as keyof typeof summary] = (summary[item.status as keyof typeof summary] as number) + 1;
      summary.totalFusdValue += item.fusdValue ?? 0;
    }
    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get inventory summary" });
  }
});

router.get("/api/b2b/inventory/:id", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [item] = await db.select().from(b2bInventoryTable).where(eq(b2bInventoryTable.id, req.params.id)).limit(1);
    if (!item) return res.status(404).json({ error: "Not found" });
    const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, item.warehouseId)).limit(1);
    const [owner] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, item.ownerId)).limit(1);
    return res.json({
      ...item,
      warehouseName: warehouse?.name ?? item.warehouseId,
      ownerName: owner?.fullName ?? "Unknown",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get inventory item" });
  }
});

router.patch("/api/b2b/inventory/:id/status", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { status } = req.body;
    const [item] = await db.update(b2bInventoryTable).set({ status }).where(eq(b2bInventoryTable.id, req.params.id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, item.warehouseId)).limit(1);
    const [owner] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, item.ownerId)).limit(1);
    return res.json({
      ...item,
      warehouseName: warehouse?.name ?? item.warehouseId,
      ownerName: owner?.fullName ?? "Unknown",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update inventory status" });
  }
});

export default router;
