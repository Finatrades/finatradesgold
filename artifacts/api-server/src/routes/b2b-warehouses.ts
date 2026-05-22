import { Router } from "express";
import { db } from "@workspace/db";
import { b2bWarehousesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/api/b2b/warehouses", async (_req, res) => {
  try {
    const warehouses = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.isActive, true));
    return res.json(warehouses.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list warehouses" });
  }
});

export default router;
