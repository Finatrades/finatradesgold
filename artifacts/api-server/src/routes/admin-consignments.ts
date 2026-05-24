import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  consignments,
  consignmentDocuments,
  consignmentStatusHistory,
  users,
  type Consignment,
  type ConsignmentDocument,
} from "../shared/schema";
import { isR2Configured, getSignedDownloadUrl } from "../r2-storage";
import { EMAIL_TEMPLATES, queueEmailWithTemplate } from "../email";
import { notifyExporterOfStatusChange } from "../lib/consignment-notifications";

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
