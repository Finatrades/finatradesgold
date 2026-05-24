import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  consignments,
  consignmentDocuments,
  consignmentListings,
  warehouseReceipts,
  users,
  sellerBadges,
  marketingBanners,
  commodityCategories,
  finatradesCorporateKyc,
  finatradesPersonalKyc,
  tradeOrders,
} from "../shared/schema";
const router = Router();

// ───────── helpers ────────────────────────────────────────────────────────
async function audit(
  req: Request,
  entityType: string,
  entityId: string,
  actionType: string,
  details: string,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  try {
    await storage.createAuditLog({
      entityType,
      entityId,
      actionType,
      actor: (req as any).adminUser?.id || req.session?.userId || "admin",
      actorRole: "admin",
      details,
      oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : undefined,
    } as any);
  } catch (e) {
    console.error("[admin-marketplace.audit]", e);
  }
}

// ===========================================================================
// LISTINGS MODERATION
// ===========================================================================

router.get("/listings", async (req: Request, res: Response): Promise<void> => {
  try {
    const status = (req.query.status as string | undefined) || undefined;
    const commodity = (req.query.commodity as string | undefined)?.toLowerCase();
    const country = (req.query.country as string | undefined)?.toLowerCase();
    const sinceStr = req.query.since as string | undefined;

    const conds: any[] = [];
    if (status && ['pending','live','featured','suspended','rejected'].includes(status)) {
      conds.push(eq(consignmentListings.moderationStatus, status as any));
    }
    if (sinceStr) {
      const d = new Date(sinceStr);
      if (!isNaN(d.getTime())) conds.push(sql`${consignmentListings.publishedAt} >= ${d}`);
    }

    const rows = await db
      .select({
        listing: consignmentListings,
        sellerEmail: users.email,
        sellerFirst: users.firstName,
        sellerLast: users.lastName,
        sellerCompany: users.companyName,
        sellerCountry: users.country,
        sellerFtId: users.finatradesId,
        sellerCustomFtId: users.customFinatradesId,
        sellerKyc: users.kycStatus,
        consignmentRef: consignments.referenceNo,
        consignmentStatus: consignments.status,
        wrNumber: warehouseReceipts.wrNumber,
      })
      .from(consignmentListings)
      .leftJoin(users, eq(users.id, consignmentListings.sellerId))
      .leftJoin(consignments, eq(consignments.id, consignmentListings.consignmentId))
      .leftJoin(warehouseReceipts, and(
        eq(warehouseReceipts.consignmentId, consignmentListings.consignmentId),
        eq(warehouseReceipts.status, "active" as any),
      ))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(consignmentListings.publishedAt))
      .limit(1000);

    let filtered = rows;
    if (commodity) filtered = filtered.filter(r => (r.listing.commodityName || "").toLowerCase().includes(commodity));
    if (country) filtered = filtered.filter(r => (r.sellerCountry || r.listing.originCountry || "").toLowerCase().includes(country));

    const listings = filtered.map(r => ({
      id: r.listing.id,
      consignmentId: r.listing.consignmentId,
      consignmentRef: r.consignmentRef,
      consignmentStatus: r.consignmentStatus,
      commodity: r.listing.commodityName,
      commodityCategory: r.listing.commodityCategory,
      hsCode: r.listing.hsCode,
      hub: r.listing.hubCode,
      country: r.listing.originCountry,
      grade: r.listing.qualityGrade,
      quantity: Number(r.listing.quantity),
      unit: r.listing.unit,
      pricePerUnitCents: r.listing.askingPriceCents,
      currency: r.listing.askingCurrency,
      isVisible: r.listing.isVisible,
      moderationStatus: r.listing.moderationStatus,
      moderationReason: r.listing.moderationReason,
      moderatedAt: r.listing.moderatedAt,
      featuredAt: r.listing.featuredAt,
      featuredRank: r.listing.featuredRank,
      publishedAt: r.listing.publishedAt,
      warehouseReceipt: r.wrNumber || null,
      seller: {
        id: r.listing.sellerId,
        email: r.sellerEmail,
        name: [r.sellerFirst, r.sellerLast].filter(Boolean).join(" ") || r.sellerCompany || r.sellerEmail,
        companyName: r.sellerCompany,
        country: r.sellerCountry,
        finatradesId: r.sellerCustomFtId || r.sellerFtId,
        kycStatus: r.sellerKyc,
      },
    }));

    const counts = await db
      .select({ status: consignmentListings.moderationStatus, n: sql<number>`count(*)::int` })
      .from(consignmentListings)
      .groupBy(consignmentListings.moderationStatus);

    res.json({ listings, total: listings.length, statusCounts: counts });
  } catch (e: any) {
    console.error("[admin-marketplace.listings]", e?.message || e);
    res.status(500).json({ message: "Failed to load listings" });
  }
});

router.get("/listings/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const [row] = await db
      .select({
        listing: consignmentListings,
        sellerEmail: users.email,
        sellerFirst: users.firstName,
        sellerLast: users.lastName,
        sellerCompany: users.companyName,
        sellerCountry: users.country,
        sellerFtId: users.finatradesId,
        sellerCustomFtId: users.customFinatradesId,
        sellerKyc: users.kycStatus,
        sellerRating: users.ratingAvg,
        sellerRatingCount: users.ratingCount,
        sellerCompletedTrades: users.completedTradesCount,
        consignmentRef: consignments.referenceNo,
        consignmentStatus: consignments.status,
        consignmentNotes: consignments.notes,
        wrNumber: warehouseReceipts.wrNumber,
      })
      .from(consignmentListings)
      .leftJoin(users, eq(users.id, consignmentListings.sellerId))
      .leftJoin(consignments, eq(consignments.id, consignmentListings.consignmentId))
      .leftJoin(warehouseReceipts, and(
        eq(warehouseReceipts.consignmentId, consignmentListings.consignmentId),
        eq(warehouseReceipts.status, "active" as any),
      ))
      .where(eq(consignmentListings.id, req.params.id))
      .limit(1);

    if (!row) { res.status(404).json({ message: "Listing not found" }); return; }

    const docs = await db.select().from(consignmentDocuments)
      .where(eq(consignmentDocuments.consignmentId, row.listing.consignmentId));

    const [corp] = await db.select({ status: finatradesCorporateKyc.status })
      .from(finatradesCorporateKyc)
      .where(eq(finatradesCorporateKyc.userId, row.listing.sellerId))
      .orderBy(desc(finatradesCorporateKyc.createdAt))
      .limit(1);
    const [pers] = await db.select({ status: finatradesPersonalKyc.status })
      .from(finatradesPersonalKyc)
      .where(eq(finatradesPersonalKyc.userId, row.listing.sellerId))
      .orderBy(desc(finatradesPersonalKyc.createdAt))
      .limit(1);

    const badges = await db.select().from(sellerBadges)
      .where(eq(sellerBadges.userId, row.listing.sellerId));

    // Trade stats: completed orders
    const [completedRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tradeOrders)
      .where(eq(tradeOrders.sellerId, row.listing.sellerId));

    res.json({
      listing: row.listing,
      consignment: {
        ref: row.consignmentRef,
        status: row.consignmentStatus,
        notes: row.consignmentNotes,
      },
      warehouseReceipt: row.wrNumber || null,
      documents: docs.map(d => ({
        id: d.id,
        type: (d as any).docType,
        filename: (d as any).fileName,
        mimeType: (d as any).mimeType,
        status: d.status,
        viewUrl: `/api/b2b/consignments/${d.consignmentId}/documents/${d.id}/url`,
      })),
      seller: {
        id: row.listing.sellerId,
        email: row.sellerEmail,
        name: [row.sellerFirst, row.sellerLast].filter(Boolean).join(" ") || row.sellerCompany,
        companyName: row.sellerCompany,
        country: row.sellerCountry,
        finatradesId: row.sellerCustomFtId || row.sellerFtId,
        kyc: {
          overall: row.sellerKyc,
          personal: pers?.status || null,
          corporate: corp?.status || null,
        },
        rating: row.sellerRating ? Number(row.sellerRating) : null,
        ratingCount: row.sellerRatingCount || 0,
        completedTrades: completedRow?.n || 0,
        disputes: 0,
        badges,
      },
    });
  } catch (e: any) {
    console.error("[admin-marketplace.listing.detail]", e?.message || e);
    res.status(500).json({ message: "Failed to load listing" });
  }
});

const moderationActionSchema = z.object({
  reason: z.string().max(500).optional(),
  featuredRank: z.number().int().min(0).max(9999).optional(),
});

async function applyListingAction(
  req: Request,
  res: Response,
  action: 'approve' | 'suspend' | 'reject' | 'feature' | 'unfeature',
): Promise<void> {
  try {
    const parse = moderationActionSchema.safeParse(req.body || {});
    if (!parse.success) { res.status(400).json({ message: "Invalid body", issues: parse.error.issues }); return; }
    const { reason, featuredRank } = parse.data;

    const [existing] = await db.select().from(consignmentListings)
      .where(eq(consignmentListings.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ message: "Listing not found" }); return; }

    const patch: any = {
      moderatedBy: (req as any).adminUser?.id || req.session?.userId || null,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    };
    if (reason !== undefined) patch.moderationReason = reason;

    switch (action) {
      case 'approve':
        patch.moderationStatus = 'live';
        patch.isVisible = true;
        patch.hiddenAt = null;
        break;
      case 'suspend':
        patch.moderationStatus = 'suspended';
        patch.isVisible = false;
        patch.hiddenAt = new Date();
        patch.featuredAt = null;
        patch.featuredRank = null;
        break;
      case 'reject':
        patch.moderationStatus = 'rejected';
        patch.isVisible = false;
        patch.hiddenAt = new Date();
        patch.featuredAt = null;
        patch.featuredRank = null;
        break;
      case 'feature':
        patch.moderationStatus = 'featured';
        patch.isVisible = true;
        patch.hiddenAt = null;
        patch.featuredAt = new Date();
        patch.featuredRank = featuredRank ?? 100;
        break;
      case 'unfeature':
        patch.moderationStatus = 'live';
        patch.featuredAt = null;
        patch.featuredRank = null;
        break;
    }

    const [updated] = await db.update(consignmentListings)
      .set(patch)
      .where(eq(consignmentListings.id, existing.id))
      .returning();

    await audit(req, "consignment_listing", existing.id, `moderation.${action}`,
      `Listing ${action} — ${existing.commodityName}` + (reason ? ` (${reason})` : ''),
      { moderationStatus: existing.moderationStatus, isVisible: existing.isVisible },
      { moderationStatus: updated.moderationStatus, isVisible: updated.isVisible },
    );

    res.json({ listing: updated });
  } catch (e: any) {
    console.error(`[admin-marketplace.${action}]`, e?.message || e);
    res.status(500).json({ message: `Failed to ${action} listing` });
  }
}

router.post("/listings/:id/approve",   (req, res) => applyListingAction(req, res, 'approve'));
router.post("/listings/:id/suspend",   (req, res) => applyListingAction(req, res, 'suspend'));
router.post("/listings/:id/reject",    (req, res) => applyListingAction(req, res, 'reject'));
router.post("/listings/:id/feature",   (req, res) => applyListingAction(req, res, 'feature'));
router.post("/listings/:id/unfeature", (req, res) => applyListingAction(req, res, 'unfeature'));

const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum(['approve','suspend','reject','feature','unfeature']),
  reason: z.string().max(500).optional(),
  featuredRank: z.number().int().min(0).max(9999).optional(),
});

router.post("/listings/bulk", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = bulkActionSchema.safeParse(req.body || {});
    if (!parse.success) { res.status(400).json({ message: "Invalid body", issues: parse.error.issues }); return; }
    const { ids, action, reason, featuredRank } = parse.data;

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        const fakeReq = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
          params: { id },
          body: { reason, featuredRank },
        });
        let captured: any = null;
        let statusCode = 200;
        const fakeRes: any = {
          status(c: number) { statusCode = c; return this; },
          json(p: any) { captured = p; return this; },
        };
        await applyListingAction(fakeReq as Request, fakeRes as Response, action);
        results.push({ id, ok: statusCode === 200, error: statusCode !== 200 ? captured?.message : undefined });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || 'error' });
      }
    }
    res.json({
      action,
      total: ids.length,
      succeeded: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  } catch (e: any) {
    console.error('[admin-marketplace.bulk]', e?.message || e);
    res.status(500).json({ message: 'Bulk action failed' });
  }
});

// ===========================================================================
// CATEGORIES
// ===========================================================================

router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(commodityCategories)
      .orderBy(commodityCategories.sortOrder, commodityCategories.name);
    res.json({ categories: rows });
  } catch (e: any) {
    console.error("[admin-marketplace.categories]", e?.message || e);
    res.status(500).json({ message: "Failed to load categories" });
  }
});

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  parentId: z.string().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  hsCodes: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.post("/categories", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid body", issues: parsed.error.issues }); return; }
    const [row] = await db.insert(commodityCategories).values(parsed.data as any).returning();
    await audit(req, "commodity_category", row.id, "create", `Created category ${row.name}`, null, row);
    res.status(201).json({ category: row });
  } catch (e: any) {
    if (e?.code === '23505') { res.status(409).json({ message: "Slug already in use" }); return; }
    console.error("[admin-marketplace.categories.create]", e?.message || e);
    res.status(500).json({ message: "Failed to create category" });
  }
});

router.put("/categories/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid body", issues: parsed.error.issues }); return; }
    const [existing] = await db.select().from(commodityCategories).where(eq(commodityCategories.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ message: "Category not found" }); return; }
    const [row] = await db.update(commodityCategories)
      .set({ ...parsed.data, updatedAt: new Date() } as any)
      .where(eq(commodityCategories.id, req.params.id))
      .returning();
    await audit(req, "commodity_category", row.id, "update", `Updated category ${row.name}`, existing, row);
    res.json({ category: row });
  } catch (e: any) {
    if (e?.code === '23505') { res.status(409).json({ message: "Slug already in use" }); return; }
    console.error("[admin-marketplace.categories.update]", e?.message || e);
    res.status(500).json({ message: "Failed to update category" });
  }
});

router.delete("/categories/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const [existing] = await db.select().from(commodityCategories).where(eq(commodityCategories.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ message: "Category not found" }); return; }
    await db.delete(commodityCategories).where(eq(commodityCategories.id, req.params.id));
    await audit(req, "commodity_category", existing.id, "delete", `Deleted category ${existing.name}`, existing, null);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[admin-marketplace.categories.delete]", e?.message || e);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

// ===========================================================================
// BANNERS
// ===========================================================================

router.get("/banners", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(marketingBanners)
      .orderBy(marketingBanners.sortOrder, desc(marketingBanners.createdAt));
    res.json({ banners: rows });
  } catch (e: any) {
    console.error("[admin-marketplace.banners]", e?.message || e);
    res.status(500).json({ message: "Failed to load banners" });
  }
});

const bannerSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  targetUrl: z.string().nullable().optional(),
  ctaLabel: z.string().max(80).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

function normalizeBanner(data: any, adminId?: string): any {
  const out: any = { ...data };
  if (out.startsAt) out.startsAt = new Date(out.startsAt);
  if (out.endsAt) out.endsAt = new Date(out.endsAt);
  if (adminId !== undefined) out.createdBy = adminId;
  return out;
}

router.post("/banners", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid body", issues: parsed.error.issues }); return; }
    const adminId = (req as any).adminUser?.id || req.session?.userId || null;
    const [row] = await db.insert(marketingBanners)
      .values(normalizeBanner(parsed.data, adminId))
      .returning();
    await audit(req, "marketing_banner", row.id, "create", `Created banner ${row.title}`, null, row);
    res.status(201).json({ banner: row });
  } catch (e: any) {
    console.error("[admin-marketplace.banners.create]", e?.message || e);
    res.status(500).json({ message: "Failed to create banner" });
  }
});

router.put("/banners/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = bannerSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid body", issues: parsed.error.issues }); return; }
    const [existing] = await db.select().from(marketingBanners).where(eq(marketingBanners.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ message: "Banner not found" }); return; }
    const [row] = await db.update(marketingBanners)
      .set({ ...normalizeBanner(parsed.data), updatedAt: new Date() })
      .where(eq(marketingBanners.id, req.params.id))
      .returning();
    await audit(req, "marketing_banner", row.id, "update", `Updated banner ${row.title}`, existing, row);
    res.json({ banner: row });
  } catch (e: any) {
    console.error("[admin-marketplace.banners.update]", e?.message || e);
    res.status(500).json({ message: "Failed to update banner" });
  }
});

router.delete("/banners/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const [existing] = await db.select().from(marketingBanners).where(eq(marketingBanners.id, req.params.id)).limit(1);
    if (!existing) { res.status(404).json({ message: "Banner not found" }); return; }
    await db.delete(marketingBanners).where(eq(marketingBanners.id, req.params.id));
    await audit(req, "marketing_banner", existing.id, "delete", `Deleted banner ${existing.title}`, existing, null);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[admin-marketplace.banners.delete]", e?.message || e);
    res.status(500).json({ message: "Failed to delete banner" });
  }
});

// ===========================================================================
// SELLER BADGES
// ===========================================================================

router.get("/sellers/:userId/profile", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }

    const badges = await db.select().from(sellerBadges).where(eq(sellerBadges.userId, userId));
    const [completed] = await db.select({ n: sql<number>`count(*)::int` })
      .from(tradeOrders)
      .where(eq(tradeOrders.sellerId, userId));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        companyName: user.companyName,
        country: user.country,
        finatradesId: user.customFinatradesId || user.finatradesId,
        kycStatus: user.kycStatus,
        rating: user.ratingAvg ? Number(user.ratingAvg) : null,
        ratingCount: user.ratingCount,
        completedTradesCount: user.completedTradesCount,
      },
      badges,
      stats: {
        totalOrders: completed?.n || 0,
        totalDisputes: 0,
        disputeRate: 0,
      },
    });
  } catch (e: any) {
    console.error("[admin-marketplace.seller.profile]", e?.message || e);
    res.status(500).json({ message: "Failed to load seller profile" });
  }
});

router.get("/sellers", async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string | undefined)?.toLowerCase();
    const rows = await db.select({
      id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
      companyName: users.companyName, country: users.country,
      finatradesId: users.finatradesId, customFinatradesId: users.customFinatradesId,
      userType: users.userType, kycStatus: users.kycStatus,
      ratingAvg: users.ratingAvg, ratingCount: users.ratingCount,
      completedTradesCount: users.completedTradesCount,
    }).from(users).where(eq(users.userType, 'exporter' as any)).limit(500);

    let filtered = rows;
    if (q) {
      filtered = rows.filter(u => (u.email || '').toLowerCase().includes(q) ||
        (u.companyName || '').toLowerCase().includes(q) ||
        ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase().includes(q) ||
        (u.finatradesId || '').toLowerCase().includes(q));
    }

    const ids = filtered.map(u => u.id);
    const badgeRows = ids.length ? await db.select().from(sellerBadges).where(inArray(sellerBadges.userId, ids)) : [];
    const byUser = new Map<string, typeof badgeRows>();
    for (const b of badgeRows) {
      const arr = byUser.get(b.userId) || [];
      arr.push(b);
      byUser.set(b.userId, arr);
    }

    res.json({
      sellers: filtered.map(u => ({
        ...u,
        finatradesId: u.customFinatradesId || u.finatradesId,
        rating: u.ratingAvg ? Number(u.ratingAvg) : null,
        badges: byUser.get(u.id) || [],
      })),
    });
  } catch (e: any) {
    console.error("[admin-marketplace.sellers]", e?.message || e);
    res.status(500).json({ message: "Failed to load sellers" });
  }
});

const badgeSchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  label: z.string().min(1).max(100),
  color: z.string().max(16).optional(),
  notes: z.string().optional(),
});

router.post("/users/:userId/badges", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = badgeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid body", issues: parsed.error.issues }); return; }
    const user = await storage.getUser(req.params.userId);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }
    const adminId = (req as any).adminUser?.id || req.session?.userId || null;
    const [row] = await db.insert(sellerBadges)
      .values({ userId: user.id, awardedBy: adminId, ...parsed.data } as any)
      .returning();
    await audit(req, "seller_badge", row.id, "create", `Awarded badge "${row.label}" to user ${user.id}`, null, row);
    res.status(201).json({ badge: row });
  } catch (e: any) {
    if (e?.code === '23505') { res.status(409).json({ message: "User already has this badge" }); return; }
    console.error("[admin-marketplace.badges.create]", e?.message || e);
    res.status(500).json({ message: "Failed to award badge" });
  }
});

router.delete("/users/:userId/badges/:slug", async (req: Request, res: Response): Promise<void> => {
  try {
    const [existing] = await db.select().from(sellerBadges)
      .where(and(eq(sellerBadges.userId, req.params.userId), eq(sellerBadges.slug, req.params.slug)))
      .limit(1);
    if (!existing) { res.status(404).json({ message: "Badge not found" }); return; }
    await db.delete(sellerBadges)
      .where(and(eq(sellerBadges.userId, req.params.userId), eq(sellerBadges.slug, req.params.slug)));
    await audit(req, "seller_badge", existing.id, "delete", `Revoked badge "${existing.label}"`, existing, null);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[admin-marketplace.badges.delete]", e?.message || e);
    res.status(500).json({ message: "Failed to revoke badge" });
  }
});

export default router;
