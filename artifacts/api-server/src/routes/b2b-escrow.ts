import { Router } from "express";
import { db } from "@workspace/db";
import { b2bEscrowAccountsTable, b2bEscrowMilestonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

async function enrichEscrow(e: typeof b2bEscrowAccountsTable.$inferSelect) {
  const milestones = await db.select().from(b2bEscrowMilestonesTable).where(eq(b2bEscrowMilestonesTable.escrowId, e.id));
  return {
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    milestones,
  };
}

router.get("/api/b2b/escrow", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const escrows = await db.select().from(b2bEscrowAccountsTable).where(eq(b2bEscrowAccountsTable.buyerId, userId));
    return res.json(await Promise.all(escrows.map(enrichEscrow)));
  } catch (err) {
    return res.status(500).json({ error: "Failed to list escrows" });
  }
});

router.get("/api/b2b/escrow/:id", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [e] = await db.select().from(b2bEscrowAccountsTable).where(eq(b2bEscrowAccountsTable.id, req.params.id)).limit(1);
    if (!e) return res.status(404).json({ error: "Not found" });
    return res.json(await enrichEscrow(e));
  } catch (err) {
    return res.status(500).json({ error: "Failed to get escrow" });
  }
});

router.post("/api/b2b/escrow/:id/release", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [e] = await db.update(b2bEscrowAccountsTable)
      .set({ status: "released", releaseDate: new Date().toISOString() })
      .where(eq(b2bEscrowAccountsTable.id, req.params.id))
      .returning();
    if (!e) return res.status(404).json({ error: "Not found" });
    return res.json(await enrichEscrow(e));
  } catch (err) {
    return res.status(500).json({ error: "Failed to release escrow" });
  }
});

export default router;
