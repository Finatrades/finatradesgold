import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  consignments,
  consignmentDocuments,
  consignmentStatusHistory,
  consignmentTally,
  consignmentTallies,
  warehouseReceipts,
  finatradesCorporateKyc,
  consignmentListings,
  users,
} from "../shared/schema";
import { serializeTally } from "./warehouse";
import { uploadToR2, isR2Configured, generateR2Key, getSignedDownloadUrl } from "../r2-storage";
import { sendEmailDirect } from "../email";

// ─── Corporate KYC eligibility ─────────────────────────────────────────────
// Exporters must complete Finatrades Corporate KYC (Approved) to list goods.
async function getExporterEligibility(userId: string, user: any): Promise<{
  eligible: boolean;
  reason?: string;
  kycStatus?: string;
  kycTier?: string;
}> {
  // Admins always eligible
  if (user?.role === "admin") return { eligible: true, kycTier: "corporate" };
  if (user?.userType !== "exporter") {
    return { eligible: false, reason: "User type must be 'exporter'", kycStatus: user?.kycStatus };
  }
  const [sub] = await db
    .select({ status: finatradesCorporateKyc.status })
    .from(finatradesCorporateKyc)
    .where(eq(finatradesCorporateKyc.userId, userId))
    .orderBy(desc(finatradesCorporateKyc.createdAt))
    .limit(1);
  if (!sub) {
    return { eligible: false, reason: "Corporate KYC required — no submission found", kycStatus: user?.kycStatus };
  }
  if (sub.status !== "Approved") {
    return { eligible: false, reason: `Corporate KYC must be Approved — current status: ${sub.status}`, kycStatus: sub.status, kycTier: "corporate" };
  }
  return { eligible: true, kycStatus: sub.status, kycTier: "corporate" };
}

// ─── Auth helpers (mirror routes.ts) ───────────────────────────────────────
function ensureAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) { res.status(401).json({ message: "Authentication required" }); return; }
  next();
}

type UT = "exporter" | "importer" | "government";
function requireUserType(...allowed: UT[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const uid = req.session?.userId;
      if (!uid) { res.status(401).json({ message: "Authentication required" }); return; }
      const user = await storage.getUser(uid);
      if (!user) { res.status(401).json({ message: "Authentication required" }); return; }
      if (user.role === "admin") { (req as any).currentUser = user; next(); return; }
      const ut = (user as any).userType as UT | null | undefined;
      if (!ut || !allowed.includes(ut)) {
        res.status(403).json({
          message: "Access denied for your account type",
          requiredUserType: allowed,
          actualUserType: ut ?? null,
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

// ─── Document requirements matrix (server is source of truth) ──────────────
type DocType =
  | "commercial_invoice"
  | "packing_list"
  | "phytosanitary_certificate"
  | "certificate_of_origin"
  | "quality_inspection_report"
  | "mining_license"
  | "export_license"
  | "bill_of_lading"
  | "fumigation_certificate"
  | "weight_certificate"
  | "other";

interface DocSlot {
  docType: DocType;
  label: string;
  description: string;
  required: boolean;
}

const COMMON_DOCS: DocSlot[] = [
  { docType: "commercial_invoice", label: "Commercial Invoice", description: "Itemised invoice of the consignment value.", required: true },
  { docType: "packing_list", label: "Packing List", description: "Detailed listing of how goods are packed.", required: true },
  { docType: "certificate_of_origin", label: "Certificate of Origin", description: "Issuing-country certificate confirming origin.", required: true },
  { docType: "quality_inspection_report", label: "Quality Inspection Report", description: "Independent third-party inspection report.", required: true },
];

const AGRI_DOCS: DocSlot[] = [
  { docType: "phytosanitary_certificate", label: "Phytosanitary Certificate", description: "Mandatory for plant-based exports.", required: true },
  { docType: "fumigation_certificate", label: "Fumigation Certificate", description: "Pest treatment certificate.", required: false },
];

const MINERAL_DOCS: DocSlot[] = [
  { docType: "mining_license", label: "Mining License", description: "Government-issued mining authorisation.", required: true },
  { docType: "export_license", label: "Export License", description: "Mineral export permit.", required: true },
];

const OPTIONAL_DOCS: DocSlot[] = [
  { docType: "bill_of_lading", label: "Bill of Lading (if available)", description: "Shipping bill (optional at listing time).", required: false },
  { docType: "weight_certificate", label: "Weight Certificate", description: "Independent weight measurement.", required: false },
];

function getRequirements(category: string | undefined): DocSlot[] {
  const cat = (category || "").toLowerCase();
  if (cat === "agricultural" || cat === "agri" || cat === "soft commodities") {
    return [...COMMON_DOCS, ...AGRI_DOCS, ...OPTIONAL_DOCS];
  }
  if (cat === "metals" || cat === "minerals" || cat === "industrial") {
    return [...COMMON_DOCS, ...MINERAL_DOCS, ...OPTIONAL_DOCS];
  }
  return [...COMMON_DOCS, ...OPTIONAL_DOCS];
}

const router = Router();

// ─── GET eligibility (KYC Tier-3 check) ────────────────────────────────────
router.get("/eligibility", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }
    const elig = await getExporterEligibility(uid, user);
    res.json(elig);
  } catch (e: any) {
    console.error("[consignments.eligibility]", e?.message || e);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
});

// ─── GET requirements matrix ───────────────────────────────────────────────
router.get("/requirements", ensureAuthenticated, (req: Request, res: Response) => {
  const category = (req.query.category as string) || undefined;
  res.json({ category: category ?? null, documents: getRequirements(category) });
});

// ─── GET /b2b/consignments — list my consignments (admin sees all) ─────────
//   Optional ?queue=review (admin only) filters to statuses in the admin review queue.
router.get("/", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

    const queue = (req.query.queue as string | undefined) ?? null;
    const reviewStatuses = ["Submitted", "Pending Review", "Under Review", "Needs More Info"] as const;

    let rows;
    if (user.role === "admin") {
      if (queue === "review") {
        rows = await db.select().from(consignments)
          .where(sql`${consignments.status} = ANY(${reviewStatuses as unknown as string[]})`)
          .orderBy(desc(consignments.submittedAt), desc(consignments.createdAt))
          .limit(500);
      } else {
        rows = await db.select().from(consignments)
          .orderBy(desc(consignments.createdAt)).limit(500);
      }
    } else {
      rows = await db.select().from(consignments)
        .where(eq(consignments.userId, uid))
        .orderBy(desc(consignments.createdAt));
    }

    res.json(rows.map(serializeConsignment));
  } catch (e: any) {
    console.error("[consignments.list]", e?.message || e);
    res.status(500).json({ message: "Failed to list consignments" });
  }
});

// ─── Public marketplace listings (Task #77) ────────────────────────────────
// IMPORTANT: must be registered before the "/:id" handler below, otherwise
// Express would match "marketplace" as the :id parameter.
router.get(
  "/marketplace/listings",
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const hub = (req.query.hub as string | undefined)?.toUpperCase();
      const category = req.query.category as string | undefined;
      const search = (req.query.search as string | undefined)?.toLowerCase();

      const rows = await db
        .select({
          listing: consignmentListings,
          sellerCustomFtId: users.customFinatradesId,
          sellerFtId: users.finatradesId,
          consignmentRef: consignments.referenceNo,
          consignmentStatus: consignments.status,
        })
        .from(consignmentListings)
        .leftJoin(users, eq(users.id, consignmentListings.sellerId))
        .leftJoin(consignments, eq(consignments.id, consignmentListings.consignmentId))
        .where(eq(consignmentListings.isVisible, true))
        .orderBy(desc(consignmentListings.publishedAt))
        .limit(500);

      const filtered = rows.filter((r) => {
        if (hub && hub !== "ALL" && (r.listing.hubCode ?? "").toUpperCase() !== hub) return false;
        if (category && category !== "All" && (r.listing.commodityCategory ?? "") !== category) return false;
        if (search) {
          const hay = `${r.listing.commodityName} ${r.listing.hubCode ?? ""} ${r.listing.originCountry ?? ""}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

      // Bulk-fetch uploaded lead documents for the surviving listings.
      const consignmentIds = filtered.map((r) => r.listing.consignmentId);
      const docsByConsignment = new Map<string, any[]>();
      if (consignmentIds.length > 0) {
        const docs = await db
          .select()
          .from(consignmentDocuments)
          .where(and(
            sql`${consignmentDocuments.consignmentId} = ANY(${consignmentIds})`,
            eq(consignmentDocuments.status, "uploaded"),
          ));
        for (const d of docs) {
          const arr = docsByConsignment.get(d.consignmentId) ?? [];
          arr.push(d);
          docsByConsignment.set(d.consignmentId, arr);
        }
      }

      res.json({
        listings: filtered.map((r) => serializeListing(r.listing, {
          // Task #145: anonymised — only FT-ID crosses the party boundary.
          sellerDisplayId: r.sellerCustomFtId ?? r.sellerFtId ?? null,
          consignmentRef: r.consignmentRef ?? undefined,
          consignmentStatus: r.consignmentStatus ?? undefined,
          documents: docsByConsignment.get(r.listing.consignmentId) ?? [],
        })),
      });
    } catch (e: any) {
      console.error("[marketplace.listings]", e?.message || e);
      res.status(500).json({ message: "Failed to load marketplace listings" });
    }
  }
);

// ─── GET /b2b/consignments/:id — detail (with docs + history) ──────────────
router.get("/:id", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

    const [row] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
    if (!row) { res.status(404).json({ message: "Consignment not found" }); return; }
    if (user.role !== "admin" && row.userId !== uid) {
      res.status(403).json({ message: "Access denied" }); return;
    }

    const docs = await db.select().from(consignmentDocuments)
      .where(eq(consignmentDocuments.consignmentId, row.id))
      .orderBy(consignmentDocuments.docType);
    const historyRaw = await db
      .select({
        h: consignmentStatusHistory,
        actor: { firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role },
      })
      .from(consignmentStatusHistory)
      .leftJoin(users, eq(users.id, consignmentStatusHistory.actorId))
      .where(eq(consignmentStatusHistory.consignmentId, row.id))
      .orderBy(desc(consignmentStatusHistory.createdAt));
    const history = historyRaw.map(({ h, actor }) => ({
      ...h,
      actorName: actor ? (`${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.email) : null,
      actorRole: actor?.role ?? null,
    }));

    const serializedDocs = await Promise.all(docs.map(d => serializeDocWithSignedUrl(d)));
    const [tally] = await db.select().from(consignmentTally)
      .where(eq(consignmentTally.consignmentId, row.id));
    res.json({
      ...serializeConsignment(row),
      documents: serializedDocs,
      history,
      tally: tally ? serializeTally(tally) : null,
      requirements: getRequirements(row.commodityCategory ?? undefined),
    });
  } catch (e: any) {
    console.error("[consignments.get]", e?.message || e);
    res.status(500).json({ message: "Failed to fetch consignment" });
  }
});

// ─── GET signed download URL for a consignment document ───────────────────
router.get("/:id/documents/:docId/url", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

    const [row] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
    if (!row) { res.status(404).json({ message: "Consignment not found" }); return; }
    if (user.role !== "admin" && row.userId !== uid) {
      res.status(403).json({ message: "Access denied" }); return;
    }
    const [doc] = await db.select().from(consignmentDocuments)
      .where(and(eq(consignmentDocuments.id, req.params.docId), eq(consignmentDocuments.consignmentId, row.id)));
    if (!doc || !doc.storageKey) { res.status(404).json({ message: "Document not found" }); return; }
    if (!isR2Configured()) {
      res.status(503).json({ message: "Object storage not configured" }); return;
    }
    const signedUrl = await getSignedDownloadUrl(doc.storageKey, 900);
    res.json({ signedUrl, expiresIn: 900, fileName: doc.fileName, mimeType: doc.mimeType });
  } catch (e: any) {
    console.error("[consignments.docUrl]", e?.message || e);
    res.status(500).json({ message: "Failed to generate download URL" });
  }
});

// ─── POST /b2b/consignments — create (multipart, with docs) ────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// ─── POST /:id/documents — upload a missing/rejected document ──────────────
// Owner (exporter) — or admin — uploads a single document file for the given
// docType. If a pending or rejected placeholder exists for that docType, it
// gets updated in place; otherwise a new optional document row is created.
router.post(
  "/:id/documents",
  ensureAuthenticated,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const uid = req.session!.userId!;
      const user = await storage.getUser(uid);
      if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

      const [row] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
      if (!row) { res.status(404).json({ message: "Consignment not found" }); return; }
      if (user.role !== "admin" && row.userId !== uid) {
        res.status(403).json({ message: "Access denied" }); return;
      }

      const docType = String((req.body?.docType ?? "")).trim();
      if (!docType) {
        res.status(400).json({ message: "docType is required" }); return;
      }
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ message: "file is required" }); return;
      }

      const slots = getRequirements(row.commodityCategory ?? undefined);
      const slot = slots.find((s) => s.docType === (docType as DocType));
      if (!slot) {
        res.status(400).json({
          message: `Unknown docType '${docType}' for this consignment`,
          allowed: slots.map((s) => s.docType),
        });
        return;
      }

      const stored = await persistFile(row.id, docType, file);

      // Update an existing pending/rejected row for this docType in place if
      // present, otherwise insert a fresh row.
      const [existing] = await db.select().from(consignmentDocuments)
        .where(and(
          eq(consignmentDocuments.consignmentId, row.id),
          eq(consignmentDocuments.docType, docType as any),
        ))
        .orderBy(desc(consignmentDocuments.uploadedAt));

      let savedId: string;
      if (existing && (existing.status === "pending" || existing.status === "rejected")) {
        const [updated] = await db.update(consignmentDocuments)
          .set({
            docLabel: slot.label,
            isRequired: slot.required,
            status: "uploaded",
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            storageKey: stored.key,
            storageUrl: stored.url,
            uploadedAt: new Date(),
            reviewedAt: null,
            reviewerId: null,
            reviewNotes: null,
            rejectReason: null,
          } as any)
          .where(eq(consignmentDocuments.id, existing.id))
          .returning();
        savedId = updated.id;
      } else {
        const [inserted] = await db.insert(consignmentDocuments).values({
          consignmentId: row.id,
          docType: docType as any,
          docLabel: slot.label,
          isRequired: slot.required,
          status: "uploaded",
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageKey: stored.key,
          storageUrl: stored.url,
          uploadedAt: new Date(),
        } as any).returning();
        savedId = inserted.id;
      }

      // Log a status-history entry so admins see the activity on the timeline.
      try {
        await db.insert(consignmentStatusHistory).values({
          consignmentId: row.id,
          fromStatus: row.status as any,
          toStatus: row.status as any,
          actorId: user.id,
          note: `Uploaded ${slot.label}: ${file.originalname}`,
        } as any);
      } catch (e: any) {
        console.error("[consignments.uploadDoc] history failed:", e?.message || e);
      }

      const [saved] = await db.select().from(consignmentDocuments)
        .where(eq(consignmentDocuments.id, savedId));
      res.status(201).json(await serializeDocWithSignedUrl(saved));
    } catch (e: any) {
      console.error("[consignments.uploadDoc]", e?.message || e);
      res.status(500).json({ message: "Failed to upload document", error: e?.message });
    }
  }
);

const createSchema = z.object({
  commodityName: z.string().min(1),
  commodityCategory: z.string().min(1),
  hsCode: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  qualityGrade: z.enum(["A+", "A", "B+", "B", "C", "D"]).optional().nullable(),
  originCountry: z.string().min(1),
  packingType: z.string().optional().nullable(),
  targetHubCode: z.string().min(1),
  incoterms: z.string().min(1),
  estimatedValueCents: z.coerce.number().int().nonnegative().optional(),
  askingPriceCents: z.coerce.number().int().nonnegative().optional(),
  askingCurrency: z.string().default("USD").optional(),
  harvestDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  complianceDeclarations: z
    .union([
      z.string().transform((s) => { try { return JSON.parse(s); } catch { return {}; } }),
      z.record(z.string(), z.any()),
    ])
    .optional(),
});

router.post(
  "/",
  requireUserType("exporter"),
  upload.any(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser as any;
      // Tier-3 gate (admins bypass via getExporterEligibility)
      const elig = await getExporterEligibility(user.id, user);
      if (!elig.eligible) {
        res.status(403).json({
          message: elig.reason || "Not eligible to list commodities",
          code: "KYC_TIER3_REQUIRED",
          kycStatus: elig.kycStatus,
          kycTier: elig.kycTier,
        });
        return;
      }
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
      }
      const input = parsed.data;

      // Server-side requirements check
      const required = getRequirements(input.commodityCategory).filter(r => r.required);
      const files = (req.files as Express.Multer.File[]) || [];
      const filesByDocType = new Map<string, Express.Multer.File>();
      for (const f of files) {
        // multer fieldname carries the docType, e.g. "doc__phytosanitary_certificate"
        const m = /^doc__(.+)$/.exec(f.fieldname);
        if (m) filesByDocType.set(m[1], f);
      }
      const missing = required.filter(r => !filesByDocType.has(r.docType));
      if (missing.length > 0) {
        res.status(400).json({
          message: "Missing required documents",
          missing: missing.map(m => ({ docType: m.docType, label: m.label })),
        });
        return;
      }

      // Reference number
      const refNo = await nextConsignmentRef();

      const [created] = await db.insert(consignments).values({
        referenceNo: refNo,
        userId: user.id,
        commodityName: input.commodityName,
        hsCode: input.hsCode ?? undefined,
        quantity: String(input.quantity),
        unit: input.unit,
        qualityGrade: (input.qualityGrade as any) ?? undefined,
        originCountry: input.originCountry,
        packingType: input.packingType ?? undefined,
        targetHubId: undefined,
        targetHubCode: input.targetHubCode,
        incoterms: input.incoterms,
        askingPriceCents: input.askingPriceCents,
        askingCurrency: input.askingCurrency,
        estimatedValueCents: input.estimatedValueCents,
        harvestDate: input.harvestDate ? input.harvestDate : undefined,
        batchNumber: input.batchNumber ?? undefined,
        commodityCategory: input.commodityCategory,
        complianceDeclarations: input.complianceDeclarations ?? {},
        notes: input.notes ?? undefined,
        status: "Submitted",
        submittedAt: new Date(),
      } as any).returning();

      // Persist documents — required + any optional uploads supplied
      const allSlots = getRequirements(input.commodityCategory);
      const slotMap = new Map(allSlots.map(s => [s.docType, s]));
      const allUploads = Array.from(filesByDocType.entries());

      for (const [docType, file] of allUploads) {
        const slot = slotMap.get(docType as DocType);
        const stored = await persistFile(created.id, docType, file);
        await db.insert(consignmentDocuments).values({
          consignmentId: created.id,
          docType: docType as any,
          docLabel: slot?.label ?? docType,
          isRequired: slot?.required ?? false,
          status: "uploaded",
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageKey: stored.key,
          storageUrl: stored.url,
          uploadedAt: new Date(),
        } as any);
      }

      // Create pending placeholders for required slots that weren't uploaded
      // (shouldn't happen because we 400 above, but kept for safety)
      for (const r of required) {
        if (!filesByDocType.has(r.docType)) {
          await db.insert(consignmentDocuments).values({
            consignmentId: created.id,
            docType: r.docType as any,
            docLabel: r.label,
            isRequired: true,
            status: "pending",
          } as any);
        }
      }

      await db.insert(consignmentStatusHistory).values({
        consignmentId: created.id,
        fromStatus: "Draft",
        toStatus: "Submitted",
        actorId: user.id,
        note: "Consignment submitted via List Commodity wizard",
      } as any);

      const docs = await db.select().from(consignmentDocuments)
        .where(eq(consignmentDocuments.consignmentId, created.id));

      res.status(201).json({
        ...serializeConsignment(created),
        documents: docs.map(serializeDoc),
      });
    } catch (e: any) {
      console.error("[consignments.create]", e?.message || e);
      res.status(500).json({ message: "Failed to create consignment", error: e?.message });
    }
  }
);

// ─── Admin status transition ──────────────────────────────────────────────
// Combines:
//  - Task #76: action-based admin review workflow (start_review / approve /
//    reject / needs_info) with reviewer notes, in-app notifications, and
//    best-effort email to the exporter.
//  - Task #77: auto-publish to marketplace when a consignment is Approved,
//    and visibility management for other transitions.
const statusPatchSchema = z.object({
  action: z.enum(["start_review", "approve", "reject", "needs_info"]),
  note: z.string().trim().max(2000).optional(),
});

const ACTION_TO_STATUS: Record<string, string> = {
  start_review: "Under Review",
  approve: "Approved",
  reject: "Rejected",
  needs_info: "Needs More Info",
};

const REVIEWABLE_FROM = new Set([
  "Submitted",
  "Pending Review",
  "Under Review",
  "Needs More Info",
]);

// Statuses for which a listing should be visible in the marketplace.
const VISIBLE_STATUSES: ReadonlySet<string> = new Set<string>([
  "Approved", "At Warehouse", "Verified",
]);

router.patch("/:id/status", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const actor = await storage.getUser(uid);
    if (!actor) { res.status(401).json({ message: "Authentication required" }); return; }
    if (actor.role !== "admin") {
      res.status(403).json({ message: "Admin role required" });
      return;
    }

    const parsed = statusPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      return;
    }
    const { action, note } = parsed.data;

    const [row] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
    if (!row) { res.status(404).json({ message: "Consignment not found" }); return; }

    const fromStatus = row.status as string;
    const toStatus = ACTION_TO_STATUS[action];

    if (!REVIEWABLE_FROM.has(fromStatus)) {
      res.status(409).json({
        message: `Cannot ${action} a consignment in status '${fromStatus}'`,
        currentStatus: fromStatus,
      });
      return;
    }
    if (action === "reject" && !note) {
      res.status(400).json({ message: "A note is required when rejecting a consignment" });
      return;
    }
    if (action === "needs_info" && !note) {
      res.status(400).json({ message: "A note is required when requesting more information" });
      return;
    }
    if (fromStatus === toStatus) {
      res.status(409).json({ message: `Consignment is already '${toStatus}'` });
      return;
    }

    const updates: Record<string, unknown> = {
      status: toStatus as any,
      updatedAt: new Date(),
    };
    if (action === "approve") {
      updates.approvedAt = new Date();
      updates.approvedBy = actor.id;
    }
    if (note) {
      updates.adminNotes = note;
    }

    // Transactional: status update + history + marketplace publish/visibility
    // must all succeed together. If publish fails, the status transition is
    // rolled back so we never end up "Approved" without a visible listing.
    const { updated, listingAction } = await db.transaction(async (tx) => {
      const [updatedRow] = await tx.update(consignments)
        .set(updates as any)
        .where(eq(consignments.id, row.id))
        .returning();

      await tx.insert(consignmentStatusHistory).values({
        consignmentId: row.id,
        fromStatus: fromStatus as any,
        toStatus: toStatus as any,
        actorId: actor.id,
        note: note ?? null,
      } as any);

      let listing: "created" | "shown" | "hidden" | "none" = "none";
      if (toStatus === "Approved") {
        listing = await ensureMarketplaceListing(tx, updatedRow);
      } else if (VISIBLE_STATUSES.has(toStatus)) {
        if (await setListingVisibility(tx, row.id, true)) listing = "shown";
      } else {
        if (await setListingVisibility(tx, row.id, false)) listing = "hidden";
      }
      return { updated: updatedRow, listingAction: listing };
    });

    // In-app notification to the exporter
    try {
      const titleByAction: Record<string, string> = {
        start_review: "Consignment under review",
        approve: "Consignment approved",
        reject: "Consignment rejected",
        needs_info: "More information needed",
      };
      const baseMsg = `Your consignment ${row.referenceNo ?? row.id} (${row.commodityName}) is now '${toStatus}'.`;
      const message = note ? `${baseMsg} Reviewer note: ${note}` : baseMsg;
      await storage.createNotification({
        userId: row.userId,
        title: titleByAction[action] ?? `Consignment ${toStatus}`,
        message,
        type: "trade",
        link: `/consignments/${row.id}`,
        read: false,
      });
    } catch (e: any) {
      console.error("[consignments.status] notification failed:", e?.message || e);
    }

    // Email to the exporter (best-effort; SMTP not required in dev)
    try {
      const exporter = await storage.getUser(row.userId);
      if (exporter?.email) {
        const subject = `Finatrades: Consignment ${row.referenceNo ?? row.id} — ${toStatus}`;
        const html = `
          <p>Hi ${exporter.firstName || "there"},</p>
          <p>Your consignment <strong>${row.referenceNo ?? row.id}</strong>
             (${row.commodityName}, ${row.quantity} ${row.unit}) has been transitioned to
             <strong>${toStatus}</strong> by the Finatrades review team.</p>
          ${note ? `<p><strong>Reviewer note:</strong><br/>${String(note).replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>` : ""}
          <p>You can view the latest status and any uploaded documents in your dashboard:
             <br/><a href="${process.env.APP_URL || ""}/consignments/${row.id}">Open consignment</a></p>
          <p>— Finatrades</p>
        `;
        sendEmailDirect(exporter.email, subject, html).catch((e: any) =>
          console.error("[consignments.status] email failed:", e?.message || e)
        );
      }
    } catch (e: any) {
      console.error("[consignments.status] email lookup failed:", e?.message || e);
    }

    res.json({
      ...serializeConsignment(updated),
      fromStatus,
      toStatus,
      listingAction,
    });
  } catch (e: any) {
    console.error("[consignments.status]", e?.message || e);
    res.status(500).json({ message: "Failed to update consignment status", error: e?.message });
  }
});

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ensureMarketplaceListing(tx: DbExecutor, c: any): Promise<"created" | "shown"> {
  const existing = await tx
    .select()
    .from(consignmentListings)
    .where(eq(consignmentListings.consignmentId, c.id))
    .limit(1);

  if (existing.length > 0) {
    await tx
      .update(consignmentListings)
      .set({ isVisible: true, hiddenAt: null, updatedAt: new Date() })
      .where(eq(consignmentListings.consignmentId, c.id));
    return "shown";
  }

  const qty = Number(c.quantity);
  const minOrder = Math.max(1, Math.round(qty * 0.1 * 1000) / 1000);

  await tx.insert(consignmentListings).values({
    consignmentId: c.id,
    sellerId: c.userId,
    commodityName: c.commodityName,
    commodityCategory: c.commodityCategory ?? null,
    hsCode: c.hsCode ?? null,
    hubCode: c.targetHubCode ?? null,
    originCountry: c.originCountry ?? null,
    qualityGrade: c.qualityGrade ?? null,
    quantity: String(qty),
    unit: c.unit,
    minOrderQty: String(minOrder),
    askingPriceCents: c.askingPriceCents ?? null,
    askingCurrency: c.askingCurrency ?? "USD",
    incoterms: c.incoterms ?? null,
    isVisible: true,
    publishedAt: new Date(),
  } as any);
  return "created";
}

async function setListingVisibility(tx: DbExecutor, consignmentId: string, visible: boolean): Promise<boolean> {
  const [existing] = await tx
    .select()
    .from(consignmentListings)
    .where(eq(consignmentListings.consignmentId, consignmentId))
    .limit(1);
  if (!existing) return false;
  if (existing.isVisible === visible) return false;
  await tx
    .update(consignmentListings)
    .set({
      isVisible: visible,
      hiddenAt: visible ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(consignmentListings.consignmentId, consignmentId));
  return true;
}

function serializeListing(
  l: any,
  extra: {
    // Task #145: only the FT-ID display crosses the party boundary. Legacy
    // companyName/firstName/lastName parameters are accepted but IGNORED.
    companyName?: string;
    firstName?: string;
    lastName?: string;
    sellerDisplayId?: string | null;
    /** Set true only when the viewer is the seller themselves (own-listing view). */
    viewerIsOwner?: boolean;
    consignmentRef?: string;
    consignmentStatus?: string;
    documents?: any[];
  }
) {
  // Anonymised by default. Only the seller's own listings (admin or self)
  // may see legacy fields, never another party.
  const sellerName = extra.viewerIsOwner
    ? (extra.companyName || [extra.firstName, extra.lastName].filter(Boolean).join(" ") || extra.sellerDisplayId || "Verified Seller")
    : (extra.sellerDisplayId || "Verified Seller");
  const qty = Number(l.quantity);
  const minOrder = l.minOrderQty != null ? Number(l.minOrderQty) : Math.max(1, Math.round(qty * 0.1));
  const documents = (extra.documents ?? []).map((d) => ({
    id: d.id,
    docType: d.docType,
    docLabel: d.docLabel,
    fileName: d.fileName,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    isRequired: d.isRequired,
    uploadedAt: d.uploadedAt,
    // Importers fetch a signed URL on demand via this endpoint
    downloadPath: d.id ? `/api/b2b/consignments/${l.consignmentId}/documents/${d.id}/url` : null,
  }));
  return {
    id: l.id,
    consignmentId: l.consignmentId,
    consignmentRef: extra.consignmentRef ?? null,
    consignmentStatus: extra.consignmentStatus ?? null,
    commodity: l.commodityName,
    commodityCategory: l.commodityCategory,
    hsCode: l.hsCode,
    hub: l.hubCode,
    country: l.originCountry,
    grade: l.qualityGrade,
    qty,
    unit: l.unit,
    minOrder,
    incoterms: l.incoterms,
    pricePerUnitCents: l.askingPriceCents,
    currency: l.askingCurrency ?? "USD",
    seller: sellerName,
    documents,
    documentCount: documents.length,
    verified: true,
    publishedAt: l.publishedAt,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────
async function nextConsignmentRef(): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await (db as any).$client.query(
    `SELECT count(*)::int AS c FROM consignments WHERE reference_no LIKE $1`,
    [`FT-CSG-${year}-%`]
  );
  const next = ((rows?.[0]?.c ?? 0) as number) + 1;
  return `FT-CSG-${year}-${String(next).padStart(4, "0")}`;
}

async function persistFile(consignmentId: string, docType: string, file: Express.Multer.File): Promise<{ key: string; url: string }> {
  if (!isR2Configured()) {
    throw new Error(
      "R2 object storage is not configured — consignment document uploads require R2. Set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME (and optionally R2_PUBLIC_URL)."
    );
  }
  const key = generateR2Key(`consignments/${consignmentId}`, `${docType}-${file.originalname}`);
  const out = await uploadToR2(key, file.buffer, file.mimetype);
  return { key: out.key, url: out.url };
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
    packingType: c.packingType,
    targetHubCode: c.targetHubCode,
    incoterms: c.incoterms,
    askingPriceCents: c.askingPriceCents,
    askingCurrency: c.askingCurrency,
    estimatedValueCents: c.estimatedValueCents,
    harvestDate: c.harvestDate,
    batchNumber: c.batchNumber,
    notes: c.notes,
    complianceDeclarations: c.complianceDeclarations,
    status: c.status,
    reviewerId: c.reviewerId,
    reviewedAt: c.reviewedAt,
    reviewNotes: c.reviewNotes,
    submittedAt: c.submittedAt,
    approvedAt: c.approvedAt,
    approvedBy: c.approvedBy,
    adminNotes: c.adminNotes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function serializeDoc(d: any) {
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
    // Never expose raw storage URLs — use signed downloads via /:id/documents/:docId/url
    downloadPath: d.id ? `/api/b2b/consignments/${d.consignmentId}/documents/${d.id}/url` : null,
    uploadedAt: d.uploadedAt,
    reviewedAt: d.reviewedAt,
    reviewerId: d.reviewerId,
    reviewNotes: d.reviewNotes,
    rejectReason: d.rejectReason,
  };
}

async function serializeDocWithSignedUrl(d: any): Promise<any> {
  const base = serializeDoc(d);
  if (d.storageKey && isR2Configured()) {
    try {
      const signedUrl = await getSignedDownloadUrl(d.storageKey, 900);
      return { ...base, signedUrl, signedUrlExpiresIn: 900 };
    } catch (e: any) {
      console.error("[consignments.signedUrl] failed for", d.id, e?.message || e);
    }
  }
  return base;
}

// ─── GET /api/b2b/consignments/_inventory/list — exporter's listed stock + WR
router.get("/_inventory/list", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await storage.getUser(req.session!.userId!);
    if (!user) { res.status(401).json({ message: "User not found" }); return; }

    // Admins see all; exporters see only their own
    const whereClause = user.role === "admin"
      ? eq(consignments.status, "Listed" as any)
      : and(eq(consignments.userId, user.id), eq(consignments.status, "Listed" as any));

    const rows = await db
      .select({
        c: consignments,
        wr: warehouseReceipts,
      })
      .from(consignments)
      .leftJoin(warehouseReceipts, and(
        eq(warehouseReceipts.consignmentId, consignments.id),
        eq(warehouseReceipts.status, "active" as any),
      ))
      .where(whereClause)
      .orderBy(desc(consignments.updatedAt));

    const items = rows.map(({ c, wr }) => ({
      id: wr?.id || c.id,
      consignmentId: c.id,
      referenceNo: c.referenceNo,
      commodityName: c.commodityName,
      commodityCategory: c.commodityCategory,
      qualityGrade: c.qualityGrade,
      quantity: Number(c.quantity),
      unit: c.unit,
      hubCode: c.targetHubCode,
      originCountry: c.originCountry,
      estimatedValueCents: c.estimatedValueCents,
      currency: c.askingCurrency,
      marketplacePublished: c.marketplacePublished,
      marketplacePublishedAt: c.marketplacePublishedAt,
      warehouseReceipt: wr ? {
        wrNumber: wr.wrNumber,
        status: wr.status,
        pdfStatus: wr.pdfStatus,
        issuedAt: wr.issuedAt,
        verificationUrl: wr.qrPayload,
      } : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({ items, count: items.length });
  } catch (e: any) {
    console.error("[consignments.inventory]", e?.message || e);
    res.status(500).json({ message: "Failed to load inventory" });
  }
});

// ─── POST /api/b2b/consignments/:id/publish — marketplace publish toggle ───
const publishSchema = z.object({ published: z.boolean() });
// NOTE: `:id/publish` does NOT shadow `:id` (different sub-path), so this stays here.
router.post("/:id/publish", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }

    const user = await storage.getUser(req.session!.userId!);
    if (!user) { res.status(401).json({ message: "User not found" }); return; }

    const [c] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
    if (!c) { res.status(404).json({ message: "Consignment not found" }); return; }

    if (user.role !== "admin" && c.userId !== user.id) {
      res.status(403).json({ message: "Forbidden" }); return;
    }
    if (c.status !== "Listed") {
      res.status(400).json({ message: `Only 'Listed' consignments can be published. Current status: ${c.status}` });
      return;
    }

    await db.update(consignments)
      .set({
        marketplacePublished: parsed.data.published,
        marketplacePublishedAt: parsed.data.published ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(consignments.id, c.id));

    res.json({
      id: c.id,
      marketplacePublished: parsed.data.published,
      marketplacePublishedAt: parsed.data.published ? new Date().toISOString() : null,
    });
  } catch (e: any) {
    console.error("[consignments.publish]", e?.message || e);
    res.status(500).json({ message: "Failed to update publish state" });
  }
});

// ─── GET /api/b2b/consignments/:id/warehouse-receipt/url — signed PDF URL ──
router.get("/:id/warehouse-receipt/url", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await storage.getUser(req.session!.userId!);
    if (!user) { res.status(401).json({ message: "User not found" }); return; }

    const [c] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
    if (!c) { res.status(404).json({ message: "Consignment not found" }); return; }
    if (user.role !== "admin" && c.userId !== user.id) { res.status(403).json({ message: "Forbidden" }); return; }

    const [wr] = await db.select().from(warehouseReceipts)
      .where(eq(warehouseReceipts.consignmentId, c.id))
      .orderBy(desc(warehouseReceipts.issuedAt))
      .limit(1);
    if (!wr) { res.status(404).json({ message: "No warehouse receipt found" }); return; }
    if (!wr.pdfObjectKey || wr.pdfStatus !== "ready") {
      res.status(202).json({ message: "WR PDF is still generating", pdfStatus: wr.pdfStatus, wrNumber: wr.wrNumber });
      return;
    }
    if (!isR2Configured()) { res.status(503).json({ message: "Object storage not configured" }); return; }
    const signedUrl = await getSignedDownloadUrl(wr.pdfObjectKey, 900);
    res.json({ wrNumber: wr.wrNumber, signedUrl, expiresIn: 900, verificationUrl: wr.qrPayload });
  } catch (e: any) {
    console.error("[consignments.wrUrl]", e?.message || e);
    res.status(500).json({ message: "Failed to generate WR download URL" });
  }
});

// ─── GET /api/b2b/public/wr/verify/:wrNumber — UNAUTHENTICATED tamper check ─
router.get("/public/wr/verify/:wrNumber", async (req: Request, res: Response): Promise<void> => {
  try {
    const wrNumber = String(req.params.wrNumber || "").trim();
    if (!/^WR-[A-Z0-9_-]+-\d{6}-\d{4}$/i.test(wrNumber)) {
      res.status(400).json({ valid: false, message: "Invalid receipt number format" });
      return;
    }
    const [wr] = await db.select().from(warehouseReceipts).where(eq(warehouseReceipts.wrNumber, wrNumber));
    if (!wr) { res.status(404).json({ valid: false, message: "Receipt not found" }); return; }

    const [c] = await db.select({
      commodityName: consignments.commodityName,
      originCountry: consignments.originCountry,
      qualityGrade: consignments.qualityGrade,
      userId: consignments.userId,
    }).from(consignments).where(eq(consignments.id, wr.consignmentId));

    let exporterDisplay: string | null = null;
    if (c) {
      const [u] = await db.select({
        firstName: users.firstName, lastName: users.lastName, companyName: users.companyName,
      }).from(users).where(eq(users.id, c.userId));
      exporterDisplay = u?.companyName || (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : null) || null;
    }

    // Public response: only non-sensitive fields
    res.json({
      valid: wr.status === "active",
      wrNumber: wr.wrNumber,
      status: wr.status,
      issuedAt: wr.issuedAt,
      hubCode: wr.hubCode,
      hubName: `Finatrades Hub ${wr.hubCode}`,
      commodityName: wr.commodityName,
      quantity: Number(wr.quantity),
      unit: wr.unit,
      grade: wr.grade,
      originCountry: c?.originCountry ?? null,
      depositor: exporterDisplay,
      verificationCheckedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[consignments.publicVerify]", e?.message || e);
    res.status(500).json({ valid: false, message: "Verification failed" });
  }
});

export default router;
