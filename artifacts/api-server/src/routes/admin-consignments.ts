import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  consignments,
  consignmentDocuments,
  consignmentStatusHistory,
  consignmentTallies,
  warehouseReceipts,
  users,
  type Consignment,
  type ConsignmentDocument,
} from "../shared/schema";
import { isR2Configured, getSignedDownloadUrl, uploadToR2, generateR2Key } from "../r2-storage";
import { EMAIL_TEMPLATES, queueEmailWithTemplate } from "../email";
import { notifyExporterOfStatusChange } from "../lib/consignment-notifications";
import { queueIssueWr } from "../jobs/issue-wr.job";

// ─── Admin guard (lightweight; full ensureAdminAsync lives in routes.ts) ───
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const uid = req.session?.userId;
  if (!uid) { res.status(401).json({ message: "Authentication required" }); return; }
  const user = await storage.getUser(uid);
  if (!user || user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  (req as any).adminUser = user;
  next();
}

const router = Router();

// ─── Serializers ──────────────────────────────────────────────────────────
function serializeConsignment(c: Consignment, exporter?: { firstName: string | null; lastName: string | null; email: string; companyName: string | null }) {
  return {
    id: c.id,
    referenceNo: c.referenceNo,
    userId: c.userId,
    exporterName: exporter ? (exporter.companyName || `${exporter.firstName ?? ""} ${exporter.lastName ?? ""}`.trim() || exporter.email) : null,
    exporterEmail: exporter?.email ?? null,
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
    estimatedValueCents: c.estimatedValueCents,
    notes: c.notes,
    adminNotes: c.adminNotes,
    reviewerId: c.reviewerId,
    reviewedAt: c.reviewedAt,
    reviewNotes: c.reviewNotes,
    status: c.status,
    submittedAt: c.submittedAt,
    approvedAt: c.approvedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function serializeDoc(d: ConsignmentDocument) {
  return {
    id: d.id,
    consignmentId: d.consignmentId,
    docType: d.docType,
    docLabel: d.docLabel,
    isRequired: d.isRequired,
    status: d.status,
    fileName: d.fileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    downloadPath: d.id ? `/api/b2b/consignments/${d.consignmentId}/documents/${d.id}/url` : null,
    uploadedAt: d.uploadedAt,
    reviewedAt: d.reviewedAt,
    reviewerId: d.reviewerId,
    reviewNotes: d.reviewNotes,
    rejectReason: d.rejectReason,
  };
}

async function serializeDocWithUrl(d: ConsignmentDocument): Promise<any> {
  const base = serializeDoc(d);
  if (d.storageKey && isR2Configured()) {
    try {
      const signedUrl = await getSignedDownloadUrl(d.storageKey, 900);
      return { ...base, signedUrl, signedUrlExpiresIn: 900 };
    } catch {
      // fall through
    }
  }
  return base;
}

// ─── SLA helpers ──────────────────────────────────────────────────────────
const SLA_HOURS = 48;
const PENDING_STATUSES = ["Submitted", "Pending Review", "Under Review"] as const;
const REVIEWED_STATUSES = ["Approved", "Rejected", "Needs More Info", "At Warehouse", "Verified", "In Transit"] as const;

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

// ─── GET /api/admin/consignments — queue with filters ─────────────────────
const listQuerySchema = z.object({
  status: z.string().optional(),
  hub: z.string().optional(),
  commodity: z.string().optional(),
  exporterId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

router.get("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = listQuerySchema.parse(req.query);
    const conds: any[] = [];
    if (q.status && q.status !== "all") conds.push(eq(consignments.status, q.status as any));
    if (q.hub) conds.push(eq(consignments.targetHubCode, q.hub));
    if (q.commodity) conds.push(ilike(consignments.commodityName, `%${q.commodity}%`));
    if (q.exporterId) conds.push(eq(consignments.userId, q.exporterId));
    if (q.dateFrom) conds.push(gte(consignments.createdAt, new Date(q.dateFrom)));
    if (q.dateTo) conds.push(lte(consignments.createdAt, new Date(q.dateTo)));

    const where = conds.length > 0 ? and(...conds) : undefined;

    const rows = await db
      .select({
        c: consignments,
        u: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          companyName: users.companyName,
        },
      })
      .from(consignments)
      .leftJoin(users, eq(users.id, consignments.userId))
      .where(where)
      .orderBy(desc(consignments.submittedAt), desc(consignments.createdAt))
      .limit(500);

    let filtered = rows;
    if (q.search?.trim()) {
      const s = q.search.toLowerCase();
      filtered = rows.filter((r) => {
        const exporterName = r.u
          ? (r.u.companyName || `${r.u.firstName ?? ""} ${r.u.lastName ?? ""}`.trim() || r.u.email).toLowerCase()
          : "";
        return (
          r.c.referenceNo?.toLowerCase().includes(s) ||
          r.c.id.toLowerCase().includes(s) ||
          exporterName.includes(s)
        );
      });
    }

    // SLA summary across the unfiltered review pool (uses status filter only when explicit)
    const allPending = await db
      .select({ c: consignments })
      .from(consignments)
      .where(inArray(consignments.status, PENDING_STATUSES as any));

    const now = new Date();
    let breached = 0;
    let oldestPendingHours = 0;
    for (const r of allPending) {
      const submitted = r.c.submittedAt ?? r.c.createdAt;
      const h = hoursBetween(now, submitted);
      if (h > SLA_HOURS) breached++;
      if (h > oldestPendingHours) oldestPendingHours = h;
    }

    // Avg review time over last 7 days (submitted → reviewed)
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentReviewed = await db
      .select({ submittedAt: consignments.submittedAt, reviewedAt: consignments.reviewedAt })
      .from(consignments)
      .where(and(
        gte(consignments.reviewedAt, since),
        inArray(consignments.status, REVIEWED_STATUSES as any),
      ));

    let avgReviewHours = 0;
    if (recentReviewed.length > 0) {
      const total = recentReviewed.reduce((acc, r) => {
        if (r.submittedAt && r.reviewedAt) {
          return acc + hoursBetween(r.reviewedAt, r.submittedAt);
        }
        return acc;
      }, 0);
      avgReviewHours = total / recentReviewed.length;
    }

    res.json({
      items: filtered.map((r) => serializeConsignment(r.c, r.u ?? undefined)),
      sla: {
        pendingTotal: allPending.length,
        pendingOverSla: breached,
        slaHours: SLA_HOURS,
        oldestPendingHours: Math.round(oldestPendingHours * 10) / 10,
        avgReviewHoursLast7d: Math.round(avgReviewHours * 10) / 10,
        reviewedLast7d: recentReviewed.length,
      },
    });
  } catch (e: any) {
    console.error("[admin-consignments.list]", e?.message || e);
    res.status(500).json({ message: "Failed to list consignments", error: e?.message });
  }
});

// ─── GET /api/admin/consignments/:id — detail ─────────────────────────────
router.get("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const [row] = await db
      .select({
        c: consignments,
        u: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          companyName: users.companyName,
        },
      })
      .from(consignments)
      .leftJoin(users, eq(users.id, consignments.userId))
      .where(eq(consignments.id, req.params.id));

    if (!row) { res.status(404).json({ message: "Consignment not found" }); return; }

    const docs = await db.select().from(consignmentDocuments)
      .where(eq(consignmentDocuments.consignmentId, row.c.id))
      .orderBy(consignmentDocuments.docType);
    const historyRaw = await db
      .select({
        h: consignmentStatusHistory,
        actor: { firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role },
      })
      .from(consignmentStatusHistory)
      .leftJoin(users, eq(users.id, consignmentStatusHistory.actorId))
      .where(eq(consignmentStatusHistory.consignmentId, row.c.id))
      .orderBy(desc(consignmentStatusHistory.createdAt));
    const history = historyRaw.map(({ h, actor }) => ({
      ...h,
      actorName: actor ? (`${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.email) : null,
      actorRole: actor?.role ?? null,
    }));

    const docsWithUrl = await Promise.all(docs.map(serializeDocWithUrl));

    res.json({
      ...serializeConsignment(row.c, row.u ?? undefined),
      documents: docsWithUrl,
      history,
    });
  } catch (e: any) {
    console.error("[admin-consignments.get]", e?.message || e);
    res.status(500).json({ message: "Failed to fetch consignment", error: e?.message });
  }
});

// ─── PATCH /api/admin/consignments/:id/documents/:docId ───────────────────
const docActionSchema = z.object({
  action: z.enum(["approve", "reject", "request_replacement"]),
  note: z.string().optional(),
  reason: z.string().optional(),
});

router.patch("/:id/documents/:docId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).adminUser as { id: string };
    const parsed = docActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      return;
    }
    const { action, note, reason } = parsed.data;

    const [doc] = await db.select().from(consignmentDocuments)
      .where(and(
        eq(consignmentDocuments.id, req.params.docId),
        eq(consignmentDocuments.consignmentId, req.params.id),
      ));
    if (!doc) { res.status(404).json({ message: "Document not found" }); return; }

    if ((action === "reject" || action === "request_replacement") && !reason && !note) {
      res.status(400).json({ message: "Reason is required when rejecting or requesting replacement" });
      return;
    }

    const newStatus =
      action === "approve" ? "verified" :
      action === "reject" ? "rejected" :
      "changes_requested";

    const [updated] = await db
      .update(consignmentDocuments)
      .set({
        status: newStatus as any,
        reviewerId: admin.id,
        reviewedAt: new Date(),
        reviewNotes: note ?? doc.reviewNotes ?? null,
        rejectReason: action === "approve" ? null : (reason ?? note ?? null),
        updatedAt: new Date(),
      })
      .where(eq(consignmentDocuments.id, doc.id))
      .returning();

    // Audit per-document action against status history so the timeline shows who/when/what.
    // toStatus = current consignment status (unchanged); note captures the doc action.
    const [parent] = await db.select({ status: consignments.status }).from(consignments).where(eq(consignments.id, req.params.id));
    const actionLabel =
      action === "approve" ? "Document approved" :
      action === "reject" ? "Document rejected" :
      "Document changes requested";
    await db.insert(consignmentStatusHistory).values({
      consignmentId: req.params.id,
      fromStatus: (parent?.status ?? null) as any,
      toStatus: (parent?.status ?? "Submitted") as any,
      actorId: admin.id,
      note: `${actionLabel}: ${doc.docLabel}${reason || note ? ` — ${reason || note}` : ""}`,
    } as any);

    res.json(serializeDoc(updated));
  } catch (e: any) {
    console.error("[admin-consignments.docAction]", e?.message || e);
    res.status(500).json({ message: "Failed to update document", error: e?.message });
  }
});

// ─── PATCH /api/admin/consignments/:id/status ─────────────────────────────
const statusUpdateSchema = z.object({
  status: z.enum(["Under Review", "Approved", "Rejected", "Needs More Info"]),
  note: z.string().optional(),
});

router.patch("/:id/status", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).adminUser as { id: string };
    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      return;
    }
    const { status, note } = parsed.data;

    const [c] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
    if (!c) { res.status(404).json({ message: "Consignment not found" }); return; }

    if ((status === "Rejected" || status === "Needs More Info") && !note?.trim()) {
      res.status(400).json({ message: "Reviewer note are required to reject or request more info" });
      return;
    }

    // Enforce all required docs approved before moving to Approved
    if (status === "Approved") {
      const docs = await db.select().from(consignmentDocuments)
        .where(eq(consignmentDocuments.consignmentId, c.id));
      const required = docs.filter(d => d.isRequired);
      const allApproved = required.length > 0 && required.every(d => d.status === "verified");
      if (!allApproved) {
        res.status(400).json({
          message: "All required documents must be approved before approving the consignment",
          requiredDocsTotal: required.length,
          requiredDocsApproved: required.filter(d => d.status === "verified").length,
        });
        return;
      }
    }

    const fromStatus = c.status;
    const now = new Date();
    const isFinal = status === "Approved" || status === "Rejected" || status === "Needs More Info";

    const [updated] = await db
      .update(consignments)
      .set({
        status: status as any,
        reviewerId: admin.id,
        reviewedAt: isFinal ? now : c.reviewedAt,
        reviewNotes: note ?? c.reviewNotes ?? null,
        adminNotes: note ?? c.adminNotes ?? null,
        approvedAt: status === "Approved" ? now : c.approvedAt,
        approvedBy: status === "Approved" ? admin.id : c.approvedBy,
        updatedAt: now,
      })
      .where(eq(consignments.id, c.id))
      .returning();

    await db.insert(consignmentStatusHistory).values({
      consignmentId: c.id,
      fromStatus: fromStatus as any,
      toStatus: status as any,
      actorId: admin.id,
      note: note ?? null,
    } as any);

    // Fire-and-forget email (sendEmail enqueues via Bull when Redis configured)
    queueStatusEmail(c.id, status, note).catch((err) => {
      console.error("[admin-consignments.email]", err?.message || err);
    });

    // Fire-and-forget in-app notification for the exporter
    notifyExporterOfStatusChange(c.id, status, note).catch((err) => {
      console.error("[admin-consignments.notify]", err?.message || err);
    });

    res.json(serializeConsignment(updated));
  } catch (e: any) {
    console.error("[admin-consignments.statusUpdate]", e?.message || e);
    res.status(500).json({ message: "Failed to update status", error: e?.message });
  }
});

// ─── POST /api/admin/consignments/:id/tally — physical inspection + auto-issue WR ─
const tallyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 12 },
});

const tallyBodySchema = z.object({
  inspectorName: z.string().min(1),
  actualQuantity: z.coerce.number().positive(),
  actualGrade: z.string().optional().nullable(),
  moisturePct: z.coerce.number().min(0).max(100).optional().nullable(),
  qualityReadings: z
    .union([
      z.string().transform((s) => { try { return JSON.parse(s); } catch { return {}; } }),
      z.record(z.string(), z.any()),
    ])
    .optional(),
  notes: z.string().optional().nullable(),
});

async function nextWrNumber(hubCode: string): Promise<string> {
  const ym = (() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const prefix = `WR-${hubCode}-${ym}-`;
  const { rows } = await (db as any).$client.query(
    `SELECT count(*)::int AS c FROM warehouse_receipts WHERE wr_number LIKE $1`,
    [`${prefix}%`],
  );
  const seq = ((rows?.[0]?.c ?? 0) as number) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

router.post(
  "/:id/tally",
  requireAdmin,
  tallyUpload.any(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const admin = (req as any).adminUser as { id: string };
      const parsed = tallyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
      }
      const input = parsed.data;

      const [c] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
      if (!c) { res.status(404).json({ message: "Consignment not found" }); return; }

      if (c.status !== "Approved" && c.status !== "At Warehouse" && c.status !== "In Transit") {
        res.status(400).json({
          message: `Consignment must be Approved before tally can be recorded (current status: ${c.status})`,
        });
        return;
      }

      // Check for existing active WR — single-WR-per-consignment for v1
      const existingWr = await db.select().from(warehouseReceipts)
        .where(and(eq(warehouseReceipts.consignmentId, c.id), eq(warehouseReceipts.status, "active")));
      if (existingWr.length > 0) {
        res.status(400).json({
          message: "An active Warehouse Receipt has already been issued for this consignment",
          wrNumber: existingWr[0].wrNumber,
        });
        return;
      }

      if (!isR2Configured()) {
        res.status(503).json({
          message: "R2 object storage is not configured — tally uploads require R2.",
        });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      let weighbridgeSlipKey: string | null = null;
      const photoKeys: string[] = [];

      for (const f of files) {
        const key = generateR2Key(`consignment-tally/${c.id}`, `${f.fieldname}-${f.originalname}`);
        const out = await uploadToR2(key, f.buffer, f.mimetype);
        if (f.fieldname === "weighbridge_slip") {
          weighbridgeSlipKey = out.key;
        } else if (f.fieldname.startsWith("photo")) {
          photoKeys.push(out.key);
        } else {
          photoKeys.push(out.key);
        }
      }

      const declaredQty = Number(c.quantity);
      const actualQty = input.actualQuantity;
      const variancePct = declaredQty > 0
        ? Math.round(((actualQty - declaredQty) / declaredQty) * 100 * 1000) / 1000
        : 0;

      const [tally] = await db.insert(consignmentTallies).values({
        consignmentId: c.id,
        inspectorId: admin.id,
        inspectorName: input.inspectorName,
        inspectedAt: new Date(),
        declaredQuantity: String(declaredQty),
        actualQuantity: String(actualQty),
        variancePct: String(variancePct),
        actualGrade: input.actualGrade ?? null,
        moisturePct: input.moisturePct != null ? String(input.moisturePct) : null,
        qualityReadings: input.qualityReadings ?? {},
        weighbridgeSlipKey,
        photoKeys,
        notes: input.notes ?? null,
      } as any).returning();

      // Transition consignment → Physically Verified
      const fromStatus = c.status;
      await db.update(consignments)
        .set({ status: "Physically Verified" as any, updatedAt: new Date() })
        .where(eq(consignments.id, c.id));
      await db.insert(consignmentStatusHistory).values({
        consignmentId: c.id,
        fromStatus: fromStatus as any,
        toStatus: "Physically Verified" as any,
        actorId: admin.id,
        note: `Physical tally recorded by ${input.inspectorName}: ${actualQty} ${c.unit} (variance ${variancePct}%)`,
      } as any);

      // Issue WR
      const hubCode = c.targetHubCode || "HUB";
      const wrNumber = await nextWrNumber(hubCode);
      const publicBase = process.env.PUBLIC_APP_URL || "";
      const verificationUrl = `${publicBase}/wr/verify/${wrNumber}`;

      const [wr] = await db.insert(warehouseReceipts).values({
        wrNumber,
        consignmentId: c.id,
        tallyId: tally.id,
        hubCode,
        commodityName: c.commodityName,
        quantity: String(actualQty),
        unit: c.unit,
        grade: input.actualGrade ?? c.qualityGrade ?? null,
        issuedAt: new Date(),
        issuedBy: admin.id,
        pdfStatus: "pending",
        qrPayload: verificationUrl,
        status: "active",
      } as any).returning();

      // Transition consignment → Listed
      await db.update(consignments)
        .set({ status: "Listed" as any, updatedAt: new Date() })
        .where(eq(consignments.id, c.id));
      await db.insert(consignmentStatusHistory).values({
        consignmentId: c.id,
        fromStatus: "Physically Verified" as any,
        toStatus: "Listed" as any,
        actorId: admin.id,
        note: `Electronic Warehouse Receipt ${wrNumber} issued`,
      } as any);

      // Enqueue PDF generation
      queueIssueWr({ warehouseReceiptId: wr.id }).catch((e) => {
        console.error("[admin-consignments.tally] WR PDF enqueue failed:", e?.message || e);
      });

      res.status(201).json({
        tally: {
          id: tally.id,
          inspectorName: tally.inspectorName,
          inspectedAt: tally.inspectedAt,
          declaredQuantity: Number(tally.declaredQuantity),
          actualQuantity: Number(tally.actualQuantity),
          variancePct: tally.variancePct != null ? Number(tally.variancePct) : null,
          actualGrade: tally.actualGrade,
          moisturePct: tally.moisturePct != null ? Number(tally.moisturePct) : null,
          notes: tally.notes,
          photoCount: photoKeys.length,
          hasWeighbridgeSlip: !!weighbridgeSlipKey,
        },
        warehouseReceipt: {
          id: wr.id,
          wrNumber: wr.wrNumber,
          status: wr.status,
          pdfStatus: wr.pdfStatus,
          verificationUrl,
        },
      });
    } catch (e: any) {
      console.error("[admin-consignments.tally]", e?.message || e);
      res.status(500).json({ message: "Failed to record tally", error: e?.message });
    }
  },
);

// ─── GET /api/admin/consignments/:id/warehouse-receipt/url — signed download URL ─
router.get("/:id/warehouse-receipt/url", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const [wr] = await db.select().from(warehouseReceipts)
      .where(eq(warehouseReceipts.consignmentId, req.params.id))
      .orderBy(desc(warehouseReceipts.issuedAt))
      .limit(1);
    if (!wr) { res.status(404).json({ message: "No warehouse receipt found" }); return; }
    if (!wr.pdfObjectKey || wr.pdfStatus !== "ready") {
      res.status(202).json({ message: "WR PDF is still generating", pdfStatus: wr.pdfStatus });
      return;
    }
    if (!isR2Configured()) { res.status(503).json({ message: "Object storage not configured" }); return; }
    const signedUrl = await getSignedDownloadUrl(wr.pdfObjectKey, 900);
    res.json({ wrNumber: wr.wrNumber, signedUrl, expiresIn: 900 });
  } catch (e: any) {
    console.error("[admin-consignments.wrUrl]", e?.message || e);
    res.status(500).json({ message: "Failed to generate WR download URL" });
  }
});

async function queueStatusEmail(consignmentId: string, status: string, note?: string): Promise<void> {
  const [row] = await db
    .select({
      c: consignments,
      u: { firstName: users.firstName, lastName: users.lastName, email: users.email, companyName: users.companyName },
    })
    .from(consignments)
    .leftJoin(users, eq(users.id, consignments.userId))
    .where(eq(consignments.id, consignmentId));
  if (!row || !row.u) return;

  const templateMap: Record<string, string | undefined> = {
    Approved: EMAIL_TEMPLATES.CONSIGNMENT_DOCS_APPROVED,
    Rejected: EMAIL_TEMPLATES.CONSIGNMENT_DOCS_REJECTED,
    "Needs More Info": EMAIL_TEMPLATES.CONSIGNMENT_DOCS_NEEDS_INFO,
  };
  const slug = templateMap[status];
  if (!slug) return;

  const userName = row.u.companyName || `${row.u.firstName ?? ""} ${row.u.lastName ?? ""}`.trim() || row.u.email;
  const baseUrl = process.env.PUBLIC_APP_URL || "";
  const consignmentUrl = `${baseUrl}/consignments/${row.c.id}`;

  // Enqueue via BullMQ (queueEmailWithTemplate -> queueEmail -> addRawEmailJob)
  await queueEmailWithTemplate(row.u.email, slug, {
    user_name: userName,
    reference_no: row.c.referenceNo ?? row.c.id,
    commodity_name: row.c.commodityName,
    quantity: String(row.c.quantity),
    unit: row.c.unit,
    review_notes: note ?? "—",
    consignment_url: consignmentUrl,
  }, {
    userId: row.c.userId,
    notificationType: slug,
    metadata: { consignmentId: row.c.id, status },
  });
}

export default router;
