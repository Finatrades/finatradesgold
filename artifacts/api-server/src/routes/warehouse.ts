import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  consignments,
  consignmentStatusHistory,
  consignmentTally,
  inventoryItems,
  warehouseHubs,
} from "../shared/schema";

const router = Router();

// ─── Auth helpers ──────────────────────────────────────────────────────────
function ensureAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) { res.status(401).json({ message: "Authentication required" }); return; }
  next();
}

// Warehouse operator (or admin) — used for write actions on tally rows.
function requireWarehouseOperator() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const uid = req.session?.userId;
      if (!uid) { res.status(401).json({ message: "Authentication required" }); return; }
      const user = await storage.getUser(uid);
      if (!user) { res.status(401).json({ message: "Authentication required" }); return; }
      if (user.role === "admin") { (req as any).currentUser = user; next(); return; }
      if ((user as any).userType !== "warehouse") {
        res.status(403).json({
          message: "Warehouse operator role required",
          actualUserType: (user as any).userType ?? null,
        });
        return;
      }
      (req as any).currentUser = user;
      next();
    } catch {
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

function operatorHubFilter(user: any): string | null {
  // Admin → null (no filter). Warehouse operator → must have assignedHubCode.
  if (user.role === "admin") return null;
  return (user.assignedHubCode || null) as string | null;
}

// ─── GET /warehouse/inbound — consignments routed to my hub ────────────────
// Returns Approved + In Transit + At Warehouse, optionally narrowed by status.
router.get("/inbound", requireWarehouseOperator(), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser;
    const hubCode = operatorHubFilter(user);
    if (user.role !== "admin" && !hubCode) {
      res.status(400).json({
        message: "No warehouse hub is assigned to your account. Contact an admin to assign you a hub.",
        code: "HUB_NOT_ASSIGNED",
      });
      return;
    }

    const inboundStatuses = ["Approved", "In Transit", "At Warehouse", "Verified", "Rejected"] as const;
    const baseWhere = hubCode
      ? and(eq(consignments.targetHubCode, hubCode), inArray(consignments.status, inboundStatuses as any))
      : inArray(consignments.status, inboundStatuses as any);

    const rows = await db
      .select()
      .from(consignments)
      .where(baseWhere)
      .orderBy(desc(consignments.updatedAt))
      .limit(500);

    const tallies = rows.length
      ? await db
          .select()
          .from(consignmentTally)
          .where(inArray(consignmentTally.consignmentId, rows.map((r) => r.id)))
      : [];
    const tallyByConsignment = new Map(tallies.map((t) => [t.consignmentId, t]));

    res.json(
      rows.map((r) => ({
        ...serializeConsignment(r),
        tally: tallyByConsignment.get(r.id) ? serializeTally(tallyByConsignment.get(r.id)!) : null,
      })),
    );
  } catch (e: any) {
    console.error("[warehouse.inbound]", e?.message || e);
    res.status(500).json({ message: "Failed to list inbound consignments" });
  }
});

// ─── GET /warehouse/inventory — list verified inventory items ─────────────
// Scoping:
//   admin     → all items
//   warehouse → items at their assigned hub
//   exporter  → items they own (came from their consignments)
router.get("/inventory", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

    const ut = (user as any).userType as string | null | undefined;
    const isAdmin = user.role === "admin";

    let items: any[];
    if (isAdmin) {
      items = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.receivedAt)).limit(1000);
    } else if (ut === "warehouse") {
      const hubCode = (user as any).assignedHubCode as string | null | undefined;
      if (!hubCode) {
        res.status(403).json({
          message: "No warehouse hub is assigned to your account.",
          code: "HUB_NOT_ASSIGNED",
        });
        return;
      }
      const [hub] = await db.select().from(warehouseHubs).where(eq(warehouseHubs.code, hubCode));
      if (!hub) { res.json([]); return; }
      items = await db.select().from(inventoryItems)
        .where(eq(inventoryItems.hubId, hub.id))
        .orderBy(desc(inventoryItems.receivedAt)).limit(1000);
    } else {
      items = await db.select().from(inventoryItems)
        .where(eq(inventoryItems.ownerId, user.id))
        .orderBy(desc(inventoryItems.receivedAt)).limit(1000);
    }

    // Enrich with hub code lookup.
    const hubIds = Array.from(new Set(items.map(i => i.hubId).filter(Boolean)));
    const hubs = hubIds.length
      ? await db.select().from(warehouseHubs).where(inArray(warehouseHubs.id, hubIds))
      : [];
    const hubById = new Map(hubs.map(h => [h.id, h]));

    res.json(items.map(i => {
      const hub = hubById.get(i.hubId);
      return {
        id: i.id,
        warehouseReceiptNo: i.warehouseReceiptNo,
        consignmentId: i.consignmentId,
        hubCode: hub?.code ?? null,
        hubName: hub?.name ?? null,
        hubCountry: hub?.country ?? null,
        commodityId: i.commodityId,
        commodityName: i.commodityName,
        ownerId: i.ownerId,
        quantityReceived: i.quantityReceived != null ? Number(i.quantityReceived) : null,
        quantityAvailable: i.quantityAvailable != null ? Number(i.quantityAvailable) : null,
        quantityReserved: i.quantityReserved != null ? Number(i.quantityReserved) : 0,
        unit: i.unit,
        qualityGrade: i.qualityGrade,
        valuationPerUnit: i.valuationPerUnit != null ? Number(i.valuationPerUnit) : null,
        valuationCurrency: i.valuationCurrency,
        isListed: i.isListed,
        receivedAt: i.receivedAt,
        expiresAt: i.expiresAt,
      };
    }));
  } catch (e: any) {
    console.error("[warehouse.inventory]", e?.message || e);
    res.status(500).json({ message: "Failed to list inventory" });
  }
});

// ─── GET /warehouse/hubs — list all hubs (for admin reassign UI) ───────────
router.get("/hubs", ensureAuthenticated, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(warehouseHubs).orderBy(warehouseHubs.code);
    res.json(rows);
  } catch (e: any) {
    console.error("[warehouse.hubs]", e?.message || e);
    res.status(500).json({ message: "Failed to list hubs" });
  }
});

// ─── GET /warehouse/consignments/:id — tally detail for one consignment ────
router.get(
  "/consignments/:id",
  requireWarehouseOperator(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser;
      const row = await loadConsignmentForOperator(req.params.id, user, res);
      if (!row) return;
      const [tally] = await db
        .select()
        .from(consignmentTally)
        .where(eq(consignmentTally.consignmentId, row.id));
      res.json({
        ...serializeConsignment(row),
        tally: tally ? serializeTally(tally) : null,
      });
    } catch (e: any) {
      console.error("[warehouse.consignmentDetail]", e?.message || e);
      res.status(500).json({ message: "Failed to load consignment" });
    }
  },
);

// ─── POST /warehouse/consignments/:id/arrive — mark arrival at hub ─────────
router.post(
  "/consignments/:id/arrive",
  requireWarehouseOperator(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser;
      const c = await loadConsignmentForOperator(req.params.id, user, res);
      if (!c) return;

      if (!["Approved", "In Transit"].includes(c.status)) {
        res.status(409).json({
          message: `Cannot mark arrival from status '${c.status}' (must be Approved or In Transit)`,
        });
        return;
      }

      await db
        .update(consignments)
        .set({ status: "At Warehouse", updatedAt: new Date() })
        .where(eq(consignments.id, c.id));
      await db.insert(consignmentStatusHistory).values({
        consignmentId: c.id,
        fromStatus: c.status as any,
        toStatus: "At Warehouse",
        actorId: user.id,
        note: `Arrived at hub ${c.targetHubCode ?? operatorHubFilter(user) ?? "(unknown)"}`,
      } as any);

      // Create a draft tally row if none exists yet, so the operator can fill it in.
      const [existing] = await db
        .select()
        .from(consignmentTally)
        .where(eq(consignmentTally.consignmentId, c.id));
      if (!existing) {
        await db.insert(consignmentTally).values({
          consignmentId: c.id,
          hubCode: c.targetHubCode || (user.assignedHubCode as string) || "UNK",
          operatorId: user.id,
          arrivedAt: new Date(),
          declaredQuantity: String(c.quantity),
          unit: c.unit,
          status: "Draft",
        } as any);
      } else {
        await db
          .update(consignmentTally)
          .set({ arrivedAt: existing.arrivedAt ?? new Date(), updatedAt: new Date() })
          .where(eq(consignmentTally.id, existing.id));
      }

      res.json({ ok: true, status: "At Warehouse" });
    } catch (e: any) {
      console.error("[warehouse.arrive]", e?.message || e);
      res.status(500).json({ message: "Failed to mark arrival" });
    }
  },
);

// ─── POST /warehouse/consignments/:id/tally — submit tally measurements ────
const tallySchema = z.object({
  actualQuantity: z.coerce.number().positive(),
  unit: z.string().min(1).optional(),
  packageCount: z.coerce.number().int().nonnegative().optional(),
  packageType: z.string().max(100).optional(),
  qualityGrade: z.enum(["A+", "A", "B+", "B", "C", "D"]).optional(),
  moisturePct: z.coerce.number().min(0).max(100).optional(),
  sampleNotes: z.string().max(2000).optional(),
  damageNotes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).optional(),
});

router.post(
  "/consignments/:id/tally",
  requireWarehouseOperator(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser;
      const c = await loadConsignmentForOperator(req.params.id, user, res);
      if (!c) return;

      const parsed = tallySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid tally input", errors: parsed.error.flatten() });
        return;
      }
      const input = parsed.data;

      if (!["At Warehouse", "In Transit", "Approved"].includes(c.status)) {
        res.status(409).json({ message: `Cannot tally from status '${c.status}'` });
        return;
      }

      // If still In Transit / Approved, auto-flip to At Warehouse before tallying.
      if (c.status !== "At Warehouse") {
        await db
          .update(consignments)
          .set({ status: "At Warehouse", updatedAt: new Date() })
          .where(eq(consignments.id, c.id));
        await db.insert(consignmentStatusHistory).values({
          consignmentId: c.id,
          fromStatus: c.status as any,
          toStatus: "At Warehouse",
          actorId: user.id,
          note: "Auto-advanced on tally submission",
        } as any);
      }

      const [existing] = await db
        .select()
        .from(consignmentTally)
        .where(eq(consignmentTally.consignmentId, c.id));

      const baseValues = {
        actualQuantity: String(input.actualQuantity),
        unit: input.unit ?? c.unit,
        packageCount: input.packageCount,
        packageType: input.packageType,
        qualityGrade: input.qualityGrade as any,
        moisturePct: input.moisturePct != null ? String(input.moisturePct) : undefined,
        sampleNotes: input.sampleNotes,
        damageNotes: input.damageNotes,
        photos: input.photos ?? [],
        status: "Tallied" as const,
        updatedAt: new Date(),
      };

      let tallyRow;
      if (existing) {
        [tallyRow] = await db
          .update(consignmentTally)
          .set(baseValues as any)
          .where(eq(consignmentTally.id, existing.id))
          .returning();
      } else {
        [tallyRow] = await db
          .insert(consignmentTally)
          .values({
            consignmentId: c.id,
            hubCode: c.targetHubCode || (user.assignedHubCode as string) || "UNK",
            operatorId: user.id,
            arrivedAt: new Date(),
            declaredQuantity: String(c.quantity),
            ...baseValues,
          } as any)
          .returning();
      }

      res.json({ ok: true, tally: serializeTally(tallyRow) });
    } catch (e: any) {
      console.error("[warehouse.tally]", e?.message || e);
      res.status(500).json({ message: "Failed to record tally", error: e?.message });
    }
  },
);

// ─── POST /warehouse/consignments/:id/verify — accept tally → inventory ────
router.post(
  "/consignments/:id/verify",
  requireWarehouseOperator(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser;
      // Authorization (hub scoping) outside the txn — fast 404/403 path.
      const preload = await loadConsignmentForOperator(req.params.id, user, res);
      if (!preload) return;

      const result = await db.transaction(async (tx) => {
        // Lock the consignment row to serialize concurrent verify/reject.
        const locked = await tx.execute(
          sql`SELECT * FROM consignments WHERE id = ${preload.id} FOR UPDATE`,
        );
        const c: any = (locked as any).rows?.[0];
        if (!c) return { error: { status: 404, body: { message: "Consignment not found" } } };

        if (c.status !== "At Warehouse") {
          return {
            error: {
              status: 409,
              body: {
                message: `Cannot verify from status '${c.status}'. Consignment must be at the warehouse and tallied first.`,
              },
            },
          };
        }

        const [tally] = await tx
          .select()
          .from(consignmentTally)
          .where(eq(consignmentTally.consignmentId, c.id));
        if (!tally || tally.status !== "Tallied" || tally.actualQuantity == null) {
          return {
            error: {
              status: 409,
              body: {
                message: "Submit tally measurements before verifying (tally must be in Tallied state)",
                tallyStatus: tally?.status ?? null,
              },
            },
          };
        }
        if (tally.inventoryItemId) {
          return {
            error: {
              status: 409,
              body: {
                message: "An inventory item has already been issued for this consignment",
                inventoryItemId: tally.inventoryItemId,
              },
            },
          };
        }

        const hubCode = c.target_hub_code || tally.hubCode;
        const [hub] = await tx
          .select()
          .from(warehouseHubs)
          .where(eq(warehouseHubs.code, hubCode));
        if (!hub) {
          return { error: { status: 500, body: { message: `Hub '${hubCode}' is not registered` } } };
        }

        const receiptNo = await nextWarehouseReceiptNo(tx);
        const grade = tally.qualityGrade ?? c.quality_grade ?? null;
        const askingCents: number | null = c.asking_price_cents ?? null;
        const valuationPerUnit =
          askingCents != null && Number(tally.actualQuantity) > 0
            ? (askingCents / 100 / Number(tally.actualQuantity)).toFixed(2)
            : null;

        const [inv] = await tx
          .insert(inventoryItems)
          .values({
            warehouseReceiptNo: receiptNo,
            consignmentId: c.id,
            hubId: hub.id,
            commodityId: c.commodity_id ?? undefined,
            commodityName: c.commodity_name,
            ownerId: c.user_id,
            quantityReceived: String(tally.actualQuantity),
            quantityAvailable: String(tally.actualQuantity),
            quantityReserved: "0",
            unit: tally.unit,
            qualityGrade: grade as any,
            valuationPerUnit: valuationPerUnit ?? undefined,
            valuationCurrency: c.asking_currency ?? "USD",
            isListed: false,
            receivedAt: tally.arrivedAt ?? new Date(),
          } as any)
          .returning();

        await tx
          .update(consignmentTally)
          .set({
            status: "Verified",
            verifiedAt: new Date(),
            verifiedBy: user.id,
            inventoryItemId: inv.id,
            updatedAt: new Date(),
          })
          .where(eq(consignmentTally.id, tally.id));

        await tx
          .update(consignments)
          .set({ status: "Verified", updatedAt: new Date() })
          .where(eq(consignments.id, c.id));

        await tx.insert(consignmentStatusHistory).values({
          consignmentId: c.id,
          fromStatus: c.status as any,
          toStatus: "Verified",
          actorId: user.id,
          note: `Verified at hub ${hubCode}. Warehouse receipt ${receiptNo} issued.`,
        } as any);

        return { ok: { receiptNo, inventoryItemId: inv.id } };
      });

      if ("error" in result && result.error) {
        res.status(result.error.status).json(result.error.body);
        return;
      }
      if (!("ok" in result) || !result.ok) {
        res.status(500).json({ message: "Verify failed" });
        return;
      }
      res.json({
        ok: true,
        status: "Verified",
        warehouseReceiptNo: result.ok.receiptNo,
        inventoryItemId: result.ok.inventoryItemId,
      });
    } catch (e: any) {
      console.error("[warehouse.verify]", e?.message || e);
      res.status(500).json({ message: "Failed to verify consignment", error: e?.message });
    }
  },
);

// ─── POST /warehouse/consignments/:id/reject — reject with reason ──────────
const rejectSchema = z.object({
  reason: z.string().min(3).max(2000),
});

router.post(
  "/consignments/:id/reject",
  requireWarehouseOperator(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser;
      const c = await loadConsignmentForOperator(req.params.id, user, res);
      if (!c) return;

      const parsed = rejectSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Reason required", errors: parsed.error.flatten() });
        return;
      }

      if (!["At Warehouse", "In Transit", "Approved"].includes(c.status)) {
        res.status(409).json({
          message: `Cannot reject from status '${c.status}'. Terminal statuses cannot be rejected.`,
        });
        return;
      }

      const [existing] = await db
        .select()
        .from(consignmentTally)
        .where(eq(consignmentTally.consignmentId, c.id));

      if (existing?.inventoryItemId) {
        res.status(409).json({
          message: "Cannot reject — inventory has already been issued for this consignment",
          inventoryItemId: existing.inventoryItemId,
        });
        return;
      }

      if (existing) {
        await db
          .update(consignmentTally)
          .set({
            status: "Rejected",
            rejectedAt: new Date(),
            rejectionReason: parsed.data.reason,
            updatedAt: new Date(),
          })
          .where(eq(consignmentTally.id, existing.id));
      } else {
        await db.insert(consignmentTally).values({
          consignmentId: c.id,
          hubCode: c.targetHubCode || (user.assignedHubCode as string) || "UNK",
          operatorId: user.id,
          declaredQuantity: String(c.quantity),
          unit: c.unit,
          status: "Rejected",
          rejectedAt: new Date(),
          rejectionReason: parsed.data.reason,
        } as any);
      }

      await db
        .update(consignments)
        .set({ status: "Rejected", updatedAt: new Date() })
        .where(eq(consignments.id, c.id));
      await db.insert(consignmentStatusHistory).values({
        consignmentId: c.id,
        fromStatus: c.status as any,
        toStatus: "Rejected",
        actorId: user.id,
        note: `Rejected at warehouse: ${parsed.data.reason}`,
      } as any);

      res.json({ ok: true, status: "Rejected" });
    } catch (e: any) {
      console.error("[warehouse.reject]", e?.message || e);
      res.status(500).json({ message: "Failed to reject consignment" });
    }
  },
);

// ─── Helpers ───────────────────────────────────────────────────────────────
async function loadConsignmentForOperator(
  id: string,
  user: any,
  res: Response,
): Promise<typeof consignments.$inferSelect | null> {
  // Non-admin warehouse users MUST have an assigned hub. Without it, they
  // would otherwise be able to access any consignment by ID.
  if (user.role !== "admin" && !user.assignedHubCode) {
    res.status(403).json({
      message: "No warehouse hub is assigned to your account. Contact an admin to assign you a hub.",
      code: "HUB_NOT_ASSIGNED",
    });
    return null;
  }
  const [row] = await db.select().from(consignments).where(eq(consignments.id, id));
  if (!row) { res.status(404).json({ message: "Consignment not found" }); return null; }
  const hubCode = operatorHubFilter(user);
  if (hubCode && row.targetHubCode !== hubCode) {
    res.status(403).json({ message: "Consignment is routed to a different hub" });
    return null;
  }
  return row;
}

async function nextWarehouseReceiptNo(executor: typeof db | any = db): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `WR-${year}-%`;
  const result: any = await executor.execute(
    sql`SELECT count(*)::int AS c FROM inventory_items WHERE warehouse_receipt_no LIKE ${pattern}`,
  );
  const rows = result.rows ?? result;
  const next = ((rows?.[0]?.c ?? 0) as number) + 1;
  return `WR-${year}-${String(next).padStart(4, "0")}`;
}

function serializeConsignment(c: any) {
  return {
    id: c.id,
    referenceNo: c.referenceNo,
    userId: c.userId,
    commodityName: c.commodityName,
    commodityCategory: c.commodityCategory,
    hsCode: c.hsCode,
    quantity: Number(c.quantity),
    unit: c.unit,
    qualityGrade: c.qualityGrade,
    originCountry: c.originCountry,
    targetHubCode: c.targetHubCode,
    incoterms: c.incoterms,
    askingPriceCents: c.askingPriceCents,
    askingCurrency: c.askingCurrency,
    status: c.status,
    submittedAt: c.submittedAt,
    approvedAt: c.approvedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function serializeTally(t: any) {
  return {
    id: t.id,
    consignmentId: t.consignmentId,
    hubCode: t.hubCode,
    operatorId: t.operatorId,
    arrivedAt: t.arrivedAt,
    declaredQuantity: t.declaredQuantity != null ? Number(t.declaredQuantity) : null,
    actualQuantity: t.actualQuantity != null ? Number(t.actualQuantity) : null,
    unit: t.unit,
    packageCount: t.packageCount,
    packageType: t.packageType,
    qualityGrade: t.qualityGrade,
    moisturePct: t.moisturePct != null ? Number(t.moisturePct) : null,
    sampleNotes: t.sampleNotes,
    damageNotes: t.damageNotes,
    photos: t.photos ?? [],
    status: t.status,
    verifiedAt: t.verifiedAt,
    verifiedBy: t.verifiedBy,
    rejectedAt: t.rejectedAt,
    rejectionReason: t.rejectionReason,
    inventoryItemId: t.inventoryItemId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export default router;
