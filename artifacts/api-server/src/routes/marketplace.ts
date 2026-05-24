import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  consignments,
  consignmentDocuments,
  consignmentListings,
  warehouseReceipts,
  finatradesPersonalKyc,
  finatradesCorporateKyc,
  rfqs,
  rfqOffers,
  tradeOrders,
  b2bWatchlist,
  users,
} from "../shared/schema";
import { placeHold, releaseHold } from "../wallet-service";

const router = Router();

// ─── Auth helpers ──────────────────────────────────────────────────────────
function ensureAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) { res.status(401).json({ message: "Authentication required" }); return; }
  next();
}

type UT = "exporter" | "importer" | "government";
function requireUserType(...allowed: UT[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  };
}

// ─── Importer KYC gate ─────────────────────────────────────────────────────
// Importers may transact with either an Approved Personal KYC (individuals)
// or an Approved Corporate KYC (companies).
async function getImporterEligibility(userId: string, user: any): Promise<{
  eligible: boolean;
  reason?: string;
  kycStatus?: string;
  kycTier?: string;
}> {
  if (user?.role === "admin") return { eligible: true, kycTier: "admin" };
  if (user?.userType !== "importer") {
    return { eligible: false, reason: "Buyer actions require importer account", kycStatus: user?.kycStatus };
  }
  const [corp] = await db
    .select({ status: finatradesCorporateKyc.status })
    .from(finatradesCorporateKyc)
    .where(eq(finatradesCorporateKyc.userId, userId))
    .orderBy(desc(finatradesCorporateKyc.createdAt))
    .limit(1);
  if (corp?.status === "Approved") {
    return { eligible: true, kycStatus: corp.status, kycTier: "corporate" };
  }
  const [personal] = await db
    .select({ status: finatradesPersonalKyc.status })
    .from(finatradesPersonalKyc)
    .where(eq(finatradesPersonalKyc.userId, userId))
    .orderBy(desc(finatradesPersonalKyc.createdAt))
    .limit(1);
  if (personal?.status === "Approved") {
    return { eligible: true, kycStatus: personal.status, kycTier: "personal" };
  }
  const latestStatus = corp?.status || personal?.status;
  if (!latestStatus) {
    return { eligible: false, reason: "KYC required before transacting — no submission found", kycStatus: user?.kycStatus };
  }
  return { eligible: false, reason: `KYC must be Approved — current status: ${latestStatus}`, kycStatus: latestStatus };
}

const TRADE_MARGIN_BPS = Number(process.env.TRADE_MARGIN_BPS || 1000); // 10% default

function marginCents(totalCents: number): number {
  return Math.ceil((totalCents * TRADE_MARGIN_BPS) / 10000);
}

// ─── Lot serialization ─────────────────────────────────────────────────────
function serializeLot(l: any, seller: { companyName?: string|null; firstName?: string|null; lastName?: string|null; createdAt?: Date|null }, opts: {
  consignmentRef?: string|null;
  consignmentStatus?: string|null;
  wrNumber?: string|null;
  wrIssuedAt?: Date|null;
  documents?: any[];
  isWatched?: boolean;
  thumbnailUrl?: string | null;
}) {
  const sellerName = seller.companyName
    || [seller.firstName, seller.lastName].filter(Boolean).join(" ")
    || "Verified Seller";
  const qty = Number(l.quantity);
  const minOrder = l.minOrderQty != null ? Number(l.minOrderQty) : Math.max(1, Math.round(qty * 0.1));
  const documents = (opts.documents ?? []).map((d) => ({
    id: d.id,
    docType: d.docType,
    docLabel: d.docLabel,
    fileName: d.fileName,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    isRequired: d.isRequired,
    uploadedAt: d.uploadedAt,
    downloadPath: d.id ? `/api/b2b/consignments/${l.consignmentId}/documents/${d.id}/url` : null,
  }));
  return {
    id: l.consignmentId, // canonical lot id = consignmentId
    listingId: l.id,
    consignmentId: l.consignmentId,
    consignmentRef: opts.consignmentRef ?? null,
    consignmentStatus: opts.consignmentStatus ?? null,
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
    seller: {
      id: l.sellerId,
      name: sellerName,
      memberSince: seller.createdAt ?? null,
    },
    warehouseReceipt: opts.wrNumber ? {
      wrNumber: opts.wrNumber,
      issuedAt: opts.wrIssuedAt,
      verifyUrl: `/wr/verify/${opts.wrNumber}`,
    } : null,
    documents,
    documentCount: documents.length,
    verified: true,
    publishedAt: l.publishedAt,
    isWatched: opts.isWatched ?? false,
    thumbnailUrl: opts.thumbnailUrl ?? null,
  };
}

// ─── GET /b2b/marketplace/lots — browse all visible lots ──────────────────
router.get("/lots", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const hub = (req.query.hub as string | undefined)?.toUpperCase();
    const category = req.query.category as string | undefined;
    const search = (req.query.search as string | undefined)?.toLowerCase();
    const commodities = (req.query.commodities as string | undefined)?.split(",").filter(Boolean).map(c => c.toLowerCase());
    const grades = (req.query.grades as string | undefined)?.split(",").filter(Boolean);
    const country = (req.query.country as string | undefined)?.toLowerCase();
    const qtyMin = req.query.qtyMin ? Number(req.query.qtyMin) : null;
    const qtyMax = req.query.qtyMax ? Number(req.query.qtyMax) : null;
    const priceMinCents = req.query.priceMin ? Math.round(Number(req.query.priceMin) * 100) : null;
    const priceMaxCents = req.query.priceMax ? Math.round(Number(req.query.priceMax) * 100) : null;
    const sort = (req.query.sort as string | undefined) || "newest";

    const rows = await db
      .select({
        listing: consignmentListings,
        sellerCompany: users.companyName,
        sellerFirst: users.firstName,
        sellerLast: users.lastName,
        sellerCreatedAt: users.createdAt,
        consignmentRef: consignments.referenceNo,
        consignmentStatus: consignments.status,
        wrNumber: warehouseReceipts.wrNumber,
        wrIssuedAt: warehouseReceipts.issuedAt,
      })
      .from(consignmentListings)
      .leftJoin(users, eq(users.id, consignmentListings.sellerId))
      .leftJoin(consignments, eq(consignments.id, consignmentListings.consignmentId))
      .leftJoin(warehouseReceipts, and(
        eq(warehouseReceipts.consignmentId, consignmentListings.consignmentId),
        eq(warehouseReceipts.status, "active" as any),
      ))
      .where(eq(consignmentListings.isVisible, true))
      .orderBy(desc(consignmentListings.publishedAt))
      .limit(500);

    let filtered = rows.filter((r) => {
      if (hub && hub !== "ALL" && (r.listing.hubCode ?? "").toUpperCase() !== hub) return false;
      if (category && category !== "All" && (r.listing.commodityCategory ?? "") !== category) return false;
      if (commodities && commodities.length && !commodities.includes((r.listing.commodityName ?? "").toLowerCase())) return false;
      if (grades && grades.length && !grades.includes(r.listing.qualityGrade ?? "")) return false;
      if (country && (r.listing.originCountry ?? "").toLowerCase() !== country) return false;
      const qty = Number(r.listing.quantity);
      if (qtyMin != null && qty < qtyMin) return false;
      if (qtyMax != null && qty > qtyMax) return false;
      if (priceMinCents != null && (r.listing.askingPriceCents ?? 0) < priceMinCents) return false;
      if (priceMaxCents != null && (r.listing.askingPriceCents ?? Number.MAX_SAFE_INTEGER) > priceMaxCents) return false;
      if (search) {
        const sellerNm = `${r.sellerCompany ?? ""} ${r.sellerFirst ?? ""} ${r.sellerLast ?? ""}`;
        const hay = `${r.listing.commodityName} ${r.listing.hubCode ?? ""} ${r.listing.originCountry ?? ""} ${sellerNm}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    // Sort
    switch (sort) {
      case "price_asc":
        filtered.sort((a, b) => (a.listing.askingPriceCents ?? Infinity) - (b.listing.askingPriceCents ?? Infinity));
        break;
      case "price_desc":
        filtered.sort((a, b) => (b.listing.askingPriceCents ?? -1) - (a.listing.askingPriceCents ?? -1));
        break;
      case "qty_desc":
        filtered.sort((a, b) => Number(b.listing.quantity) - Number(a.listing.quantity));
        break;
      case "qty_asc":
        filtered.sort((a, b) => Number(a.listing.quantity) - Number(b.listing.quantity));
        break;
      // "newest" already from query orderBy
    }

    // Bulk: watchlist + thumbnails for current user
    const consignmentIds = filtered.map((r) => r.listing.consignmentId);
    const watchedSet = new Set<string>();
    const thumbByConsignment = new Map<string, string>();
    if (consignmentIds.length > 0) {
      const watched = await db
        .select({ id: b2bWatchlist.consignmentId })
        .from(b2bWatchlist)
        .where(and(eq(b2bWatchlist.userId, uid), inArray(b2bWatchlist.consignmentId, consignmentIds)));
      for (const w of watched) watchedSet.add(w.id);

      const imgDocs = await db
        .select({
          id: consignmentDocuments.id,
          consignmentId: consignmentDocuments.consignmentId,
          mimeType: consignmentDocuments.mimeType,
        })
        .from(consignmentDocuments)
        .where(and(
          inArray(consignmentDocuments.consignmentId, consignmentIds),
          eq(consignmentDocuments.status, "uploaded"),
          sql`${consignmentDocuments.mimeType} ILIKE 'image/%'`,
        ));
      for (const d of imgDocs) {
        if (!thumbByConsignment.has(d.consignmentId)) {
          thumbByConsignment.set(d.consignmentId, `/api/b2b/consignments/${d.consignmentId}/documents/${d.id}/url`);
        }
      }
    }

    const lots = filtered.map((r) => serializeLot(
      r.listing,
      { companyName: r.sellerCompany, firstName: r.sellerFirst, lastName: r.sellerLast, createdAt: r.sellerCreatedAt },
      {
        consignmentRef: r.consignmentRef,
        consignmentStatus: r.consignmentStatus,
        wrNumber: r.wrNumber,
        wrIssuedAt: r.wrIssuedAt,
        isWatched: watchedSet.has(r.listing.consignmentId),
        thumbnailUrl: thumbByConsignment.get(r.listing.consignmentId) ?? null,
      },
    ));

    // Hub grouping summary (with total quantity per hub)
    const hubGroups: Record<string, { hub: string; count: number; commodities: Set<string>; totalQty: number; unit: string | null }> = {};
    for (const lot of lots) {
      const h = lot.hub || "UNK";
      if (!hubGroups[h]) hubGroups[h] = { hub: h, count: 0, commodities: new Set(), totalQty: 0, unit: lot.unit ?? null };
      hubGroups[h].count += 1;
      hubGroups[h].totalQty += lot.qty;
      hubGroups[h].commodities.add(lot.commodity);
    }
    const hubs = Object.values(hubGroups).map(g => ({
      hub: g.hub,
      count: g.count,
      commodityCount: g.commodities.size,
      totalQty: g.totalQty,
      unit: g.unit,
    })).sort((a, b) => b.count - a.count);

    res.json({ lots, hubs, total: lots.length });
  } catch (e: any) {
    console.error("[marketplace.lots]", e?.message || e);
    res.status(500).json({ message: "Failed to load marketplace lots" });
  }
});

// ─── GET /b2b/marketplace/lots/:id — lot detail (id = consignmentId) ─────
router.get("/lots/:id", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const consignmentId = req.params.id;

    const [row] = await db
      .select({
        listing: consignmentListings,
        sellerCompany: users.companyName,
        sellerFirst: users.firstName,
        sellerLast: users.lastName,
        sellerEmail: users.email,
        sellerCreatedAt: users.createdAt,
        sellerCountry: users.country,
        consignmentRef: consignments.referenceNo,
        consignmentStatus: consignments.status,
        consignmentNotes: consignments.notes,
        consignmentHarvestDate: consignments.harvestDate,
        consignmentBatch: consignments.batchNumber,
        consignmentPacking: consignments.packingType,
        wrNumber: warehouseReceipts.wrNumber,
        wrIssuedAt: warehouseReceipts.issuedAt,
      })
      .from(consignmentListings)
      .leftJoin(users, eq(users.id, consignmentListings.sellerId))
      .leftJoin(consignments, eq(consignments.id, consignmentListings.consignmentId))
      .leftJoin(warehouseReceipts, and(
        eq(warehouseReceipts.consignmentId, consignmentListings.consignmentId),
        eq(warehouseReceipts.status, "active" as any),
      ))
      .where(and(
        eq(consignmentListings.consignmentId, consignmentId),
        eq(consignmentListings.isVisible, true),
      ))
      .limit(1);

    if (!row) { res.status(404).json({ message: "Lot not found or no longer listed" }); return; }

    const docs = await db.select().from(consignmentDocuments)
      .where(and(
        eq(consignmentDocuments.consignmentId, consignmentId),
        eq(consignmentDocuments.status, "uploaded"),
      ));

    const [watched] = await db.select().from(b2bWatchlist)
      .where(and(eq(b2bWatchlist.userId, uid), eq(b2bWatchlist.consignmentId, consignmentId)))
      .limit(1);

    // Seller mini-profile: count other listed lots + verified flag
    const sellerListings = await db.select({ id: consignmentListings.id })
      .from(consignmentListings)
      .where(and(
        eq(consignmentListings.sellerId, row.listing.sellerId),
        eq(consignmentListings.isVisible, true),
      ));

    const lot = serializeLot(
      row.listing,
      { companyName: row.sellerCompany, firstName: row.sellerFirst, lastName: row.sellerLast, createdAt: row.sellerCreatedAt },
      {
        consignmentRef: row.consignmentRef,
        consignmentStatus: row.consignmentStatus,
        wrNumber: row.wrNumber,
        wrIssuedAt: row.wrIssuedAt,
        documents: docs,
        isWatched: !!watched,
      },
    );

    res.json({
      ...lot,
      specs: {
        harvestDate: row.consignmentHarvestDate,
        batchNumber: row.consignmentBatch,
        packingType: row.consignmentPacking,
        notes: row.consignmentNotes,
      },
      sellerProfile: {
        id: row.listing.sellerId,
        name: lot.seller.name,
        country: row.sellerCountry,
        memberSince: row.sellerCreatedAt,
        activeListingCount: sellerListings.length,
        kycVerified: true,
      },
    });
  } catch (e: any) {
    console.error("[marketplace.lots.detail]", e?.message || e);
    res.status(500).json({ message: "Failed to load lot" });
  }
});

// ─── Watchlist ────────────────────────────────────────────────────────────
router.get("/watchlist", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const rows = await db
      .select({
        w: b2bWatchlist,
        listing: consignmentListings,
        sellerCompany: users.companyName,
        sellerFirst: users.firstName,
        sellerLast: users.lastName,
        sellerCreatedAt: users.createdAt,
        consignmentRef: consignments.referenceNo,
        consignmentStatus: consignments.status,
        wrNumber: warehouseReceipts.wrNumber,
        wrIssuedAt: warehouseReceipts.issuedAt,
      })
      .from(b2bWatchlist)
      .leftJoin(consignmentListings, eq(consignmentListings.consignmentId, b2bWatchlist.consignmentId))
      .leftJoin(users, eq(users.id, consignmentListings.sellerId))
      .leftJoin(consignments, eq(consignments.id, b2bWatchlist.consignmentId))
      .leftJoin(warehouseReceipts, and(
        eq(warehouseReceipts.consignmentId, b2bWatchlist.consignmentId),
        eq(warehouseReceipts.status, "active" as any),
      ))
      .where(eq(b2bWatchlist.userId, uid))
      .orderBy(desc(b2bWatchlist.createdAt));

    const lots = rows
      .filter(r => r.listing)
      .map(r => serializeLot(
        r.listing!,
        { companyName: r.sellerCompany, firstName: r.sellerFirst, lastName: r.sellerLast, createdAt: r.sellerCreatedAt },
        {
          consignmentRef: r.consignmentRef,
          consignmentStatus: r.consignmentStatus,
          wrNumber: r.wrNumber,
          wrIssuedAt: r.wrIssuedAt,
          isWatched: true,
        },
      ));
    res.json({ items: lots });
  } catch (e: any) {
    console.error("[marketplace.watchlist.get]", e?.message || e);
    res.status(500).json({ message: "Failed to load watchlist" });
  }
});

router.post("/watchlist/:consignmentId", requireUserType("importer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const consignmentId = req.params.consignmentId;
    const [c] = await db.select({ id: consignments.id }).from(consignments).where(eq(consignments.id, consignmentId)).limit(1);
    if (!c) { res.status(404).json({ message: "Consignment not found" }); return; }
    await db.insert(b2bWatchlist).values({ userId: uid, consignmentId })
      .onConflictDoNothing();
    res.status(201).json({ ok: true });
  } catch (e: any) {
    console.error("[marketplace.watchlist.add]", e?.message || e);
    res.status(500).json({ message: "Failed to add watchlist item" });
  }
});

router.delete("/watchlist/:consignmentId", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    await db.delete(b2bWatchlist)
      .where(and(eq(b2bWatchlist.userId, uid), eq(b2bWatchlist.consignmentId, req.params.consignmentId)));
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[marketplace.watchlist.del]", e?.message || e);
    res.status(500).json({ message: "Failed to remove watchlist item" });
  }
});

// ─── Order # generator ────────────────────────────────────────────────────
async function nextOrderRef(): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await (db as any).$client.query(
    `SELECT count(*)::int AS c FROM trade_orders WHERE order_no LIKE $1`,
    [`FT-ORD-${year}-%`]
  );
  const next = ((rows?.[0]?.c ?? 0) as number) + 1;
  return `FT-ORD-${year}-${String(next).padStart(4, "0")}`;
}

async function nextRfqRef(): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await (db as any).$client.query(
    `SELECT count(*)::int AS c FROM rfqs WHERE reference_no LIKE $1`,
    [`FT-RFQ-${year}-%`]
  );
  const next = ((rows?.[0]?.c ?? 0) as number) + 1;
  return `FT-RFQ-${year}-${String(next).padStart(4, "0")}`;
}

// ─── POST /b2b/marketplace/orders — Buy Now ──────────────────────────────
const buyNowSchema = z.object({
  consignmentId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  incoterms: z.string().optional(),
  fundingMethod: z.enum(["bank_transfer", "stablecoin", "wallet", "escrow_deposit"]).optional(),
  notes: z.string().optional(),
});

router.post("/orders", requireUserType("importer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser;
    const uid = user.id;
    const parse = buyNowSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ message: "Invalid input", errors: parse.error.errors }); return; }
    const { consignmentId, quantity, fundingMethod, notes, incoterms } = parse.data;

    // KYC gate (server enforced)
    const elig = await getImporterEligibility(uid, user);
    if (!elig.eligible) {
      res.status(402).json({
        message: elig.reason || "Buyer not eligible",
        reasons: [{ code: "kyc_insufficient", message: elig.reason || "KYC required", kycStatus: elig.kycStatus, kycTier: elig.kycTier }],
      });
      return;
    }

    // Fetch lot
    const [row] = await db
      .select({ listing: consignmentListings, consignment: consignments })
      .from(consignmentListings)
      .leftJoin(consignments, eq(consignments.id, consignmentListings.consignmentId))
      .where(and(
        eq(consignmentListings.consignmentId, consignmentId),
        eq(consignmentListings.isVisible, true),
      ))
      .limit(1);
    if (!row?.listing) { res.status(404).json({ message: "Lot not found or no longer available" }); return; }
    const listing = row.listing;
    if (listing.sellerId === uid) {
      res.status(400).json({ message: "Cannot buy your own listing" });
      return;
    }

    const available = Number(listing.quantity);
    const minOrder = listing.minOrderQty != null ? Number(listing.minOrderQty) : Math.max(1, Math.round(available * 0.1));
    if (quantity < minOrder) { res.status(400).json({ message: `Quantity below minimum order of ${minOrder} ${listing.unit}` }); return; }
    if (quantity > available) { res.status(400).json({ message: `Only ${available} ${listing.unit} available` }); return; }
    if (!listing.askingPriceCents) { res.status(400).json({ message: "Listing has no ask price — submit an RFQ instead" }); return; }

    const totalCents = Math.round(listing.askingPriceCents * quantity);
    const requiredMarginCents = marginCents(totalCents);

    // Atomic margin hold — must succeed before order creation
    let walletHoldId: string | null = null;
    try {
      const { hold } = await placeHold({
        userId: uid,
        amountCents: requiredMarginCents,
        referenceType: "trade_order_margin",
        expiresInHours: 72,
        metadata: { consignmentId, quantity, totalCents },
      });
      walletHoldId = hold.id;
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (/insufficient/i.test(msg) || /balance/i.test(msg)) {
        res.status(402).json({
          message: "Insufficient wallet balance for margin hold",
          reasons: [{
            code: "wallet_insufficient",
            message: `A ${(TRADE_MARGIN_BPS / 100).toFixed(0)}% margin hold of $${(requiredMarginCents / 100).toFixed(2)} is required`,
            requiredMarginCents,
            totalCents,
          }],
        });
        return;
      }
      // Wallet account missing or service unavailable — do NOT create order.
      console.warn("[marketplace.buyNow] wallet unavailable:", msg);
      res.status(402).json({
        message: "Wallet unavailable for margin hold",
        reasons: [{
          code: "wallet_missing",
          message: "Your trading wallet is not available. Set up or fund your wallet to place an order.",
          requiredMarginCents,
          totalCents,
        }],
      });
      return;
    }

    // Create order + hide listing atomically
    const orderNo = await nextOrderRef();
    try {
      const [order] = await db.transaction(async (tx) => {
        const [created] = await tx.insert(tradeOrders).values({
          orderNo,
          buyerId: uid,
          sellerId: listing.sellerId,
          commodityName: listing.commodityName,
          quantity: String(quantity),
          unit: listing.unit,
          pricePerUnit: String((listing.askingPriceCents! / 100).toFixed(2)),
          totalAmount: String((totalCents / 100).toFixed(2)),
          currency: listing.askingCurrency ?? "USD",
          status: "Pending Payment",
          paymentMethod: fundingMethod ?? null,
          listingId: listing.id,
          consignmentId: consignmentId,
          walletHoldId,
          marginCents: requiredMarginCents,
          notes: [incoterms ? `Incoterms: ${incoterms}` : null, notes].filter(Boolean).join(" — ") || null,
        } as any).returning();

        // Partial buy: decrement available quantity; only hide when remaining
        // falls below the minimum order size.
        const remaining = Number(listing.quantity) - quantity;
        const setPatch: Record<string, any> = {
          quantity: String(Math.max(0, remaining)),
          updatedAt: new Date(),
        };
        if (remaining < Number(listing.minOrderQty ?? 0) || remaining <= 0) {
          setPatch.isVisible = false;
          setPatch.hiddenAt = new Date();
        }
        await tx.update(consignmentListings)
          .set(setPatch as any)
          .where(eq(consignmentListings.consignmentId, consignmentId));

        return [created];
      });

      res.status(201).json({
        ok: true,
        order: serializeOrder(order, listing.commodityName, listing.unit),
        marginHeldCents: requiredMarginCents,
      });
    } catch (e: any) {
      // Rollback hold if order creation failed
      if (walletHoldId) {
        try { await releaseHold({ userId: uid, holdId: walletHoldId }); } catch {}
      }
      throw e;
    }
  } catch (e: any) {
    console.error("[marketplace.buyNow]", e?.message || e);
    res.status(500).json({ message: "Failed to place order" });
  }
});

function serializeOrder(o: any, commodityName?: string, unit?: string) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    rfqId: o.rfqId,
    buyerId: o.buyerId,
    sellerId: o.sellerId,
    commodity: o.commodityName ?? commodityName,
    quantity: Number(o.quantity),
    unit: o.unit ?? unit,
    pricePerUnit: Number(o.pricePerUnit),
    totalAmount: Number(o.totalAmount),
    currency: o.currency,
    status: o.status,
    paymentMethod: o.paymentMethod,
    consignmentId: o.consignmentId,
    listingId: o.listingId,
    walletHoldId: o.walletHoldId,
    marginCents: o.marginCents,
    paidAt: o.paidAt,
    deliveredAt: o.deliveredAt,
    notes: o.notes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function serializeRfq(r: any, extras: {
  buyerName?: string|null;
  hubCode?: string|null;
  unit?: string|null;
  offers?: any[];
}) {
  return {
    id: r.id,
    referenceNo: r.referenceNo,
    buyerId: r.buyerId,
    buyerName: extras.buyerName ?? null,
    commodity: r.commodityName,
    hubId: r.hubId,
    hubCode: extras.hubCode ?? null,
    quantity: Number(r.requestedQuantity),
    unit: r.unit,
    targetPricePerUnit: r.targetPricePerUnit != null ? Number(r.targetPricePerUnit) : null,
    currency: r.currency,
    qualityRequired: r.qualityRequired,
    incoterms: r.incoterms,
    listingId: r.listingId,
    notes: r.notes,
    deliveryDeadline: r.deliveryDeadline,
    expiresAt: r.expiresAt,
    status: r.status,
    offers: (extras.offers ?? []).map(o => ({
      id: o.id,
      sellerId: o.sellerId,
      sellerName: o.sellerName ?? null,
      offeredQuantity: Number(o.offeredQuantity),
      pricePerUnit: Number(o.pricePerUnit),
      currency: o.currency,
      validUntil: o.validUntil,
      notes: o.notes,
      status: o.status,
      createdAt: o.createdAt,
    })),
    createdAt: r.createdAt,
  };
}

// ─── GET /b2b/marketplace/orders/mine ─────────────────────────────────────
router.get("/orders/mine", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    const side = (req.query.side as string | undefined) || (user?.userType === "exporter" ? "sell" : "buy");
    const where = side === "sell" ? eq(tradeOrders.sellerId, uid) : eq(tradeOrders.buyerId, uid);
    const rows = await db.select().from(tradeOrders).where(where).orderBy(desc(tradeOrders.createdAt));
    res.json({ orders: rows.map(o => serializeOrder(o)) });
  } catch (e: any) {
    console.error("[marketplace.orders.mine]", e?.message || e);
    res.status(500).json({ message: "Failed to load orders" });
  }
});

// ─── RFQs ─────────────────────────────────────────────────────────────────
const rfqInputSchema = z.object({
  consignmentId: z.string().optional(), // link to a lot (becomes listingId reference indirectly)
  commodity: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("MT"),
  targetPricePerUnit: z.coerce.number().positive().optional(),
  currency: z.string().default("USD"),
  hubCode: z.string().optional(),
  qualityRequired: z.enum(["A+", "A", "B+", "B", "C", "D"]).optional(),
  incoterms: z.string().optional(),
  deliveryDeadline: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/rfqs", requireUserType("importer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser;
    const uid = user.id;

    // KYC gate
    const elig = await getImporterEligibility(uid, user);
    if (!elig.eligible) {
      res.status(402).json({
        message: elig.reason || "Buyer not eligible",
        reasons: [{ code: "kyc_insufficient", message: elig.reason, kycStatus: elig.kycStatus, kycTier: elig.kycTier }],
      });
      return;
    }

    const parse = rfqInputSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ message: "Invalid input", errors: parse.error.errors }); return; }
    const d = parse.data;

    // Mandatory margin hold for RFQ submission. Price source for the indicative
    // hold is, in order: (1) buyer's targetPricePerUnit, (2) the linked
    // listing's asking price. If neither is available, reject — we cannot
    // compute a deterministic margin and the task requires hold-on-submit.
    let pricePerUnitForHold: number | null =
      d.targetPricePerUnit && d.targetPricePerUnit > 0 ? d.targetPricePerUnit : null;
    if (pricePerUnitForHold == null && d.consignmentId) {
      const [linkedListing] = await db
        .select({ askingPriceCents: consignmentListings.askingPriceCents })
        .from(consignmentListings)
        .where(eq(consignmentListings.consignmentId, d.consignmentId))
        .limit(1);
      if (linkedListing?.askingPriceCents != null) {
        pricePerUnitForHold = linkedListing.askingPriceCents / 100;
      }
    }
    if (pricePerUnitForHold == null || pricePerUnitForHold <= 0) {
      res.status(400).json({
        message: "Target price required",
        reasons: [{
          code: "target_price_required",
          message: "Provide a target price per unit so the RFQ margin hold can be calculated.",
        }],
      });
      return;
    }

    let walletHoldId: string | null = null;
    let preHeldMarginCents = 0;
    {
      const indicativeTotalCents = Math.round(pricePerUnitForHold * d.quantity * 100);
      preHeldMarginCents = marginCents(indicativeTotalCents);
      try {
        const { hold } = await placeHold({
          userId: uid,
          amountCents: preHeldMarginCents,
          referenceType: "trade_rfq_margin",
          expiresInHours: 168,
          metadata: { commodity: d.commodity, indicativeTotalCents },
        });
        walletHoldId = hold.id;
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (/insufficient/i.test(msg) || /balance/i.test(msg)) {
          res.status(402).json({
            message: "Insufficient wallet balance for RFQ margin hold",
            reasons: [{
              code: "wallet_insufficient",
              message: `An indicative ${(TRADE_MARGIN_BPS / 100).toFixed(0)}% margin hold of $${(preHeldMarginCents / 100).toFixed(2)} is required to submit this RFQ`,
              requiredMarginCents: preHeldMarginCents,
              totalCents: indicativeTotalCents,
            }],
          });
          return;
        }
        console.warn("[marketplace.rfqs.create] wallet unavailable:", msg);
        res.status(402).json({
          message: "Wallet unavailable for RFQ margin hold",
          reasons: [{
            code: "wallet_missing",
            message: "Your trading wallet is not available. Set up or fund your wallet to submit this RFQ.",
            requiredMarginCents: preHeldMarginCents,
            totalCents: indicativeTotalCents,
          }],
        });
        return;
      }
    }

    const refNo = await nextRfqRef();
    try {
      const [created] = await db.insert(rfqs).values({
        referenceNo: refNo,
        buyerId: uid,
        commodityName: d.commodity,
        requestedQuantity: String(d.quantity),
        unit: d.unit,
        targetPricePerUnit: d.targetPricePerUnit != null ? String(d.targetPricePerUnit) : null,
        currency: d.currency,
        qualityRequired: d.qualityRequired ?? null,
        incoterms: d.incoterms ?? null,
        deliveryDeadline: d.deliveryDeadline ? d.deliveryDeadline : null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        notes: walletHoldId
          ? `${d.notes ?? ""}\n[wallet_hold:${walletHoldId}:${preHeldMarginCents}]`.trim()
          : d.notes ?? null,
        status: "Open",
      } as any).returning();

      res.status(201).json({
        rfq: serializeRfq(created, { hubCode: d.hubCode ?? null, unit: d.unit }),
        marginHeldCents: walletHoldId ? preHeldMarginCents : 0,
      });
    } catch (insertErr) {
      // Rollback margin hold if RFQ insert failed
      if (walletHoldId) {
        try { await releaseHold({ userId: uid, holdId: walletHoldId }); } catch {}
      }
      throw insertErr;
    }
  } catch (e: any) {
    console.error("[marketplace.rfqs.create]", e?.message || e);
    res.status(500).json({ message: "Failed to create RFQ" });
  }
});

// GET my outgoing RFQs (buyer side)
router.get("/rfqs/mine", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const rows = await db.select().from(rfqs).where(eq(rfqs.buyerId, uid)).orderBy(desc(rfqs.createdAt));
    const ids = rows.map(r => r.id);
    let offersByRfq = new Map<string, any[]>();
    if (ids.length > 0) {
      const offers = await db
        .select({
          o: rfqOffers,
          sellerCompany: users.companyName,
          sellerFirst: users.firstName,
          sellerLast: users.lastName,
        })
        .from(rfqOffers)
        .leftJoin(users, eq(users.id, rfqOffers.sellerId))
        .where(inArray(rfqOffers.rfqId, ids));
      for (const o of offers) {
        const arr = offersByRfq.get(o.o.rfqId) ?? [];
        const sellerName = o.sellerCompany || [o.sellerFirst, o.sellerLast].filter(Boolean).join(" ") || "Seller";
        arr.push({ ...o.o, sellerName });
        offersByRfq.set(o.o.rfqId, arr);
      }
    }
    res.json({
      rfqs: rows.map(r => serializeRfq(r, { offers: offersByRfq.get(r.id) ?? [] })),
    });
  } catch (e: any) {
    console.error("[marketplace.rfqs.mine]", e?.message || e);
    res.status(500).json({ message: "Failed to load RFQs" });
  }
});

// GET incoming RFQs (exporter side) — for now show all open RFQs the seller can offer on
router.get("/rfqs/incoming", requireUserType("exporter"), async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const rows = await db
      .select({
        r: rfqs,
        buyerCompany: users.companyName,
        buyerFirst: users.firstName,
        buyerLast: users.lastName,
      })
      .from(rfqs)
      .leftJoin(users, eq(users.id, rfqs.buyerId))
      .where(sql`${rfqs.status} IN ('Open', 'Offers Received', 'Negotiating')`)
      .orderBy(desc(rfqs.createdAt))
      .limit(200);

    // For each RFQ, find this seller's existing offer (if any)
    const ids = rows.map(r => r.r.id);
    const myOffersByRfq = new Map<string, any>();
    if (ids.length > 0) {
      const mine = await db.select().from(rfqOffers)
        .where(and(inArray(rfqOffers.rfqId, ids), eq(rfqOffers.sellerId, uid)));
      for (const o of mine) myOffersByRfq.set(o.rfqId, o);
    }

    res.json({
      rfqs: rows.map(({ r, buyerCompany, buyerFirst, buyerLast }) => ({
        ...serializeRfq(r, {
          buyerName: buyerCompany || [buyerFirst, buyerLast].filter(Boolean).join(" ") || "Buyer",
        }),
        myOffer: myOffersByRfq.get(r.id) ? {
          id: myOffersByRfq.get(r.id).id,
          pricePerUnit: Number(myOffersByRfq.get(r.id).pricePerUnit),
          offeredQuantity: Number(myOffersByRfq.get(r.id).offeredQuantity),
          status: myOffersByRfq.get(r.id).status,
        } : null,
      })),
    });
  } catch (e: any) {
    console.error("[marketplace.rfqs.incoming]", e?.message || e);
    res.status(500).json({ message: "Failed to load incoming RFQs" });
  }
});

// POST /b2b/marketplace/rfqs/:id/offers — exporter submits offer
const offerInputSchema = z.object({
  pricePerUnit: z.coerce.number().positive(),
  offeredQuantity: z.coerce.number().positive(),
  currency: z.string().default("USD"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/rfqs/:id/offers", requireUserType("exporter"), async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const parse = offerInputSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ message: "Invalid input", errors: parse.error.errors }); return; }

    const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, req.params.id)).limit(1);
    if (!rfq) { res.status(404).json({ message: "RFQ not found" }); return; }
    if (!["Open", "Offers Received", "Negotiating"].includes(rfq.status)) {
      res.status(409).json({ message: `RFQ is ${rfq.status} — no longer accepting offers` });
      return;
    }
    if (rfq.buyerId === uid) {
      res.status(400).json({ message: "Cannot offer on your own RFQ" });
      return;
    }

    const d = parse.data;
    const [created] = await db.insert(rfqOffers).values({
      rfqId: rfq.id,
      sellerId: uid,
      offeredQuantity: String(d.offeredQuantity),
      pricePerUnit: String(d.pricePerUnit),
      currency: d.currency,
      validUntil: d.validUntil ? new Date(d.validUntil) : null,
      notes: d.notes ?? null,
      status: "Pending",
    } as any).returning();

    await db.update(rfqs).set({ status: "Offers Received", updatedAt: new Date() }).where(eq(rfqs.id, rfq.id));

    res.status(201).json({ offer: created });
  } catch (e: any) {
    console.error("[marketplace.rfqs.offer]", e?.message || e);
    res.status(500).json({ message: "Failed to submit offer" });
  }
});

// POST /b2b/marketplace/rfqs/:id/accept — importer accepts an offer, creates order w/ margin hold
router.post("/rfqs/:id/accept", requireUserType("importer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).currentUser;
    const uid = user.id;
    const offerId = req.body?.offerId as string;
    if (!offerId) { res.status(400).json({ message: "offerId required" }); return; }

    const elig = await getImporterEligibility(uid, user);
    if (!elig.eligible) {
      res.status(402).json({
        message: elig.reason,
        reasons: [{ code: "kyc_insufficient", message: elig.reason, kycStatus: elig.kycStatus, kycTier: elig.kycTier }],
      });
      return;
    }

    const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, req.params.id)).limit(1);
    if (!rfq) { res.status(404).json({ message: "RFQ not found" }); return; }
    if (rfq.buyerId !== uid) { res.status(403).json({ message: "Not your RFQ" }); return; }

    const [offer] = await db.select().from(rfqOffers)
      .where(and(eq(rfqOffers.id, offerId), eq(rfqOffers.rfqId, rfq.id))).limit(1);
    if (!offer) { res.status(404).json({ message: "Offer not found" }); return; }
    if (offer.status !== "Pending") { res.status(409).json({ message: `Offer is ${offer.status}` }); return; }

    const totalCents = Math.round(Number(offer.pricePerUnit) * Number(offer.offeredQuantity) * 100);
    const requiredMarginCents = marginCents(totalCents);

    let walletHoldId: string | null = null;
    try {
      const { hold } = await placeHold({
        userId: uid,
        amountCents: requiredMarginCents,
        referenceType: "trade_order_margin",
        expiresInHours: 72,
        metadata: { rfqId: rfq.id, offerId: offer.id, totalCents },
      });
      walletHoldId = hold.id;
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (/insufficient/i.test(msg) || /balance/i.test(msg)) {
        res.status(402).json({
          message: "Insufficient wallet balance for margin hold",
          reasons: [{
            code: "wallet_insufficient",
            message: `A ${(TRADE_MARGIN_BPS / 100).toFixed(0)}% margin hold of $${(requiredMarginCents / 100).toFixed(2)} is required`,
            requiredMarginCents,
            totalCents,
          }],
        });
        return;
      }
      console.warn("[marketplace.rfqs.accept] wallet unavailable:", msg);
      res.status(402).json({
        message: "Wallet unavailable for margin hold",
        reasons: [{
          code: "wallet_missing",
          message: "Your trading wallet is not available. Set up or fund your wallet to accept this offer.",
          requiredMarginCents,
          totalCents,
        }],
      });
      return;
    }

    const orderNo = await nextOrderRef();
    try {
      const [order] = await db.transaction(async (tx) => {
        const [created] = await tx.insert(tradeOrders).values({
          orderNo,
          rfqId: rfq.id,
          buyerId: uid,
          sellerId: offer.sellerId,
          commodityName: rfq.commodityName,
          quantity: String(offer.offeredQuantity),
          unit: rfq.unit,
          pricePerUnit: String(offer.pricePerUnit),
          totalAmount: String((totalCents / 100).toFixed(2)),
          currency: offer.currency ?? "USD",
          status: "Pending Payment",
          walletHoldId,
          marginCents: requiredMarginCents,
        } as any).returning();

        await tx.update(rfqOffers).set({ status: "Accepted", updatedAt: new Date() }).where(eq(rfqOffers.id, offer.id));
        await tx.update(rfqOffers).set({ status: "Rejected", updatedAt: new Date() })
          .where(and(eq(rfqOffers.rfqId, rfq.id), sql`${rfqOffers.id} <> ${offer.id}`, eq(rfqOffers.status, "Pending")));
        await tx.update(rfqs).set({ status: "Accepted", updatedAt: new Date() }).where(eq(rfqs.id, rfq.id));
        return [created];
      });

      res.status(201).json({
        ok: true,
        order: serializeOrder(order),
        marginHeldCents: requiredMarginCents,
      });
    } catch (e: any) {
      if (walletHoldId) {
        try { await releaseHold({ userId: uid, holdId: walletHoldId }); } catch {}
      }
      throw e;
    }
  } catch (e: any) {
    console.error("[marketplace.rfqs.accept]", e?.message || e);
    res.status(500).json({ message: "Failed to accept offer" });
  }
});

// Eligibility probe — exposes whether the current user can buy
router.get("/eligibility", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const user = await storage.getUser(uid);
    if (!user) { res.status(401).json({ message: "Authentication required" }); return; }
    const elig = await getImporterEligibility(uid, user);
    res.json({ ...elig, marginBps: TRADE_MARGIN_BPS });
  } catch (e: any) {
    console.error("[marketplace.eligibility]", e?.message || e);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
});

export default router;
