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
  kycSubmissions,
  consignmentListings,
  users,
} from "../shared/schema";
import { uploadToR2, isR2Configured, generateR2Key, getSignedDownloadUrl } from "../r2-storage";

// ─── KYC Tier-3 eligibility ────────────────────────────────────────────────
async function getExporterEligibility(userId: string, user: any): Promise<{
  eligible: boolean;
  reason?: string;
  kycStatus?: string;
  kycTier?: string;
}> {
  // Admins always eligible
  if (user?.role === "admin") return { eligible: true, kycTier: "admin" };
  if (user?.userType !== "exporter") {
    return { eligible: false, reason: "User type must be 'exporter'", kycStatus: user?.kycStatus };
  }
  // Look up the most recent KYC submission for the user; require tier_3_corporate + Approved
  const [sub] = await db
    .select({ tier: kycSubmissions.tier, status: kycSubmissions.status })
    .from(kycSubmissions)
    .where(eq(kycSubmissions.userId, userId))
    .orderBy(desc(kycSubmissions.createdAt))
    .limit(1);
  if (!sub) {
    return { eligible: false, reason: "KYC Tier 3 (Corporate) required — no submission found", kycStatus: user?.kycStatus };
  }
  if (sub.tier !== "tier_3_corporate") {
    return { eligible: false, reason: `KYC Tier 3 (Corporate) required — current tier: ${sub.tier}`, kycStatus: sub.status, kycTier: sub.tier };
  }
  if (sub.status !== "Approved") {
    return { eligible: false, reason: `KYC Tier 3 must be Approved — current status: ${sub.status}`, kycStatus: sub.status, kycTier: sub.tier };
  }
  return { eligible: true, kycStatus: sub.status, kycTier: sub.tier };
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
router.get("/", ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }

    const rows = user.role === "admin"
      ? await db.select().from(consignments).orderBy(desc(consignments.createdAt)).limit(500)
      : await db.select().from(consignments).where(eq(consignments.userId, uid)).orderBy(desc(consignments.createdAt));

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
          sellerCompany: users.companyName,
          sellerFirst: users.firstName,
          sellerLast: users.lastName,
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
          companyName: r.sellerCompany ?? undefined,
          firstName: r.sellerFirst ?? undefined,
          lastName: r.sellerLast ?? undefined,
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
    res.json({
      ...serializeConsignment(row),
      documents: serializedDocs,
      history,
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

// ─── Admin status transition (Task #77 — drives auto-publish to marketplace) ─
const STATUS_VALUES = [
  "Draft", "Submitted", "Pending Review", "Under Review", "Approved",
  "Rejected", "Needs More Info", "In Transit", "At Warehouse", "Verified",
] as const;
type ConsignmentStatus = typeof STATUS_VALUES[number];

// Statuses for which a listing should be visible in the marketplace.
const VISIBLE_STATUSES: ReadonlySet<ConsignmentStatus> = new Set<ConsignmentStatus>([
  "Approved", "At Warehouse", "Verified",
]);

const statusUpdateSchema = z.object({
  status: z.enum(STATUS_VALUES),
  note: z.string().max(2000).optional(),
});

router.patch(
  "/:id/status",
  requireUserType("exporter", "importer", "government"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).currentUser as any;
      if (user.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return;
      }
      const parsed = statusUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
      }
      const { status: toStatus, note } = parsed.data;

      const [row] = await db.select().from(consignments).where(eq(consignments.id, req.params.id));
      if (!row) { res.status(404).json({ message: "Consignment not found" }); return; }
      if (row.status === toStatus) {
        res.json({ ...serializeConsignment(row), unchanged: true });
        return;
      }

      const fromStatus = row.status as ConsignmentStatus;
      const patch: Record<string, any> = { status: toStatus, updatedAt: new Date() };
      if (toStatus === "Approved") {
        patch.approvedAt = new Date();
        patch.approvedBy = user.id;
      }

      // Transactional: status update + history + marketplace publish/visibility
      // must all succeed together. If publish fails, the status transition is
      // rolled back so we never end up "Approved" without a visible listing.
      const { updated, listingAction } = await db.transaction(async (tx) => {
        const [updatedRow] = await tx
          .update(consignments)
          .set(patch)
          .where(eq(consignments.id, row.id))
          .returning();

        await tx.insert(consignmentStatusHistory).values({
          consignmentId: row.id,
          fromStatus: fromStatus as any,
          toStatus: toStatus as any,
          actorId: user.id,
          note: note ?? `Status transitioned ${fromStatus} → ${toStatus}`,
        } as any);

        let action: "created" | "shown" | "hidden" | "none" = "none";
        if (toStatus === "Approved") {
          action = await ensureMarketplaceListing(tx, updatedRow);
        } else if (VISIBLE_STATUSES.has(toStatus)) {
          if (await setListingVisibility(tx, row.id, true)) action = "shown";
        } else {
          if (await setListingVisibility(tx, row.id, false)) action = "hidden";
        }
        return { updated: updatedRow, listingAction: action };
      });

      res.json({ ...serializeConsignment(updated), listingAction });
    } catch (e: any) {
      console.error("[consignments.status]", e?.message || e);
      res.status(500).json({ message: "Failed to update status", error: e?.message });
    }
  }
);

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
    companyName?: string;
    firstName?: string;
    lastName?: string;
    consignmentRef?: string;
    consignmentStatus?: string;
    documents?: any[];
  }
) {
  const sellerName = extra.companyName
    || [extra.firstName, extra.lastName].filter(Boolean).join(" ")
    || "Verified Seller";
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

export default router;
