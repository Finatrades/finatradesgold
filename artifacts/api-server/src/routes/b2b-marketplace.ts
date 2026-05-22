import { Router } from "express";
import { db } from "@workspace/db";
import { b2bListingsTable, b2bWarehousesTable, b2bUsersTable, b2bCommoditiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

router.get("/api/b2b/marketplace/listings", async (req, res) => {
  try {
    const listings = await db.select().from(b2bListingsTable).where(eq(b2bListingsTable.status, "active"));
    const warehouses = await db.select().from(b2bWarehousesTable);
    const users = await db.select().from(b2bUsersTable);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
    const userMap = new Map(users.map(u => [u.id, u]));

    return res.json(listings.map(l => ({
      ...l,
      hubId: l.hubId,
      hubName: warehouseMap.get(l.hubId)?.name ?? l.hubId,
      hubCountry: warehouseMap.get(l.hubId)?.country ?? "",
      sellerName: userMap.get(l.sellerId)?.fullName ?? "Unknown",
      sellerRating: null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list marketplace listings" });
  }
});

router.get("/api/b2b/marketplace/listings/:id", async (req, res) => {
  try {
    const [l] = await db.select().from(b2bListingsTable).where(eq(b2bListingsTable.id, req.params.id)).limit(1);
    if (!l) return res.status(404).json({ error: "Not found" });
    const [warehouse] = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.id, l.hubId)).limit(1);
    const [seller] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, l.sellerId)).limit(1);
    return res.json({
      ...l,
      hubName: warehouse?.name ?? l.hubId,
      hubCountry: warehouse?.country ?? "",
      sellerName: seller?.fullName ?? "Unknown",
      sellerRating: null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get listing" });
  }
});

router.get("/api/b2b/marketplace/hubs", async (req, res) => {
  try {
    const warehouses = await db.select().from(b2bWarehousesTable).where(eq(b2bWarehousesTable.isActive, true));
    return res.json(warehouses.map(w => ({
      id: w.id,
      name: w.name,
      country: w.country,
      city: w.city,
      capacity: w.totalCapacity,
      available: w.availableCapacity,
      storageType: w.storageType,
      commodities: w.commodities,
      operator: w.operator,
      lat: w.lat ?? null,
      lng: w.lng ?? null,
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list hubs" });
  }
});

router.get("/api/b2b/marketplace/commodities", async (req, res) => {
  try {
    const commodities = await db.select().from(b2bCommoditiesTable);
    return res.json(commodities);
  } catch (err) {
    return res.status(500).json({ error: "Failed to list commodities" });
  }
});

export default router;
