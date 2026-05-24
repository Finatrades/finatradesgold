import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  traderTiers,
  traderBadges,
  tierRules,
  badgeRules,
  auditLogs,
} from "@shared/schema";
import {
  reconcileUserReputation,
  buildLeaderboard,
  loadReputationForUser,
  leaderboardRankForUser,
  invalidateReputationCaches,
} from "../lib/reputation";
import { cacheGet, cacheSet } from "../redis-client";

const router = Router();

function ensureAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  next();
}

async function ensureAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session?.userId) { res.status(401).json({ message: "Authentication required" }); return; }
  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.session.userId)).limit(1);
  if (!u || u.role !== "admin") { res.status(403).json({ message: "Admin required" }); return; }
  next();
}

// ─── Public leaderboard ────────────────────────────────────────────────────
const leaderboardQuery = z.object({
  type: z.enum(["exporter", "importer"]).default("exporter"),
  region: z.string().trim().min(2).max(100).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

router.get("/leaderboard", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = leaderboardQuery.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ message: "Invalid query", errors: parsed.error.errors }); return; }
    const { type, region, month } = parsed.data;
    const cacheKey = `leaderboard:${type}:${region || "ALL"}:${month || "current"}`;
    const cached = await cacheGet(cacheKey).catch(() => null);
    if (cached) {
      try { res.json(JSON.parse(cached)); return; } catch {}
    }
    const entries = await buildLeaderboard({ type, region: region || null, limit: 20 });
    const body = { type, region: region || null, month: month || null, entries };
    await cacheSet(cacheKey, JSON.stringify(body), 3600).catch(() => {});
    res.json(body);
  } catch (e: any) {
    console.error("[reputation.leaderboard]", e?.message || e);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

// ─── Admin: list everyone's tier & badges ─────────────────────────────────
router.get("/admin/reputation/users", ensureAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const tier = typeof req.query.tier === "string" ? String(req.query.tier) : null;

    const rows = await db
      .select({
        id: users.id,
        ftId: users.finatradesId,
        customFtId: users.customFinatradesId,
        email: users.email,
        userType: users.userType,
        country: users.country,
        completedTrades: users.completedTradesCount,
        ratingAvg: users.ratingAvg,
        tier: traderTiers.tier,
        pendingTier: traderTiers.pendingTier,
        pendingDemotionAt: traderTiers.pendingDemotionAt,
        manualOverrideTier: traderTiers.manualOverrideTier,
        manualOverrideReason: traderTiers.manualOverrideReason,
        computedAt: traderTiers.computedAt,
      })
      .from(users)
      .leftJoin(traderTiers, eq(traderTiers.userId, users.id))
      .orderBy(desc(users.completedTradesCount))
      .limit(limit);

    let filtered = rows;
    if (tier) filtered = rows.filter(r => (r.tier || "bronze") === tier);

    res.json({
      users: filtered.map(r => ({
        userId: r.id,
        displayId: r.customFtId || r.ftId || `FT-${String(r.id).slice(0, 8).toUpperCase()}`,
        email: r.email,
        userType: r.userType,
        country: r.country,
        completedTrades: r.completedTrades ?? 0,
        ratingAvg: r.ratingAvg ? Number(r.ratingAvg) : null,
        tier: r.tier || "bronze",
        pendingTier: r.pendingTier,
        pendingDemotionAt: r.pendingDemotionAt,
        manualOverrideTier: r.manualOverrideTier,
        manualOverrideReason: r.manualOverrideReason,
        computedAt: r.computedAt,
      })),
    });
  } catch (e: any) {
    console.error("[reputation.admin.users]", e?.message || e);
    res.status(500).json({ message: "Failed to load reputation list" });
  }
});

// ─── Admin: single user detail ─────────────────────────────────────────────
router.get("/admin/reputation/users/:userId", ensureAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const rep = await loadReputationForUser(userId);
    const allBadges = await db
      .select()
      .from(traderBadges)
      .where(eq(traderBadges.userId, userId))
      .orderBy(desc(traderBadges.earnedAt));
    res.json({ ...rep, allBadges });
  } catch (e: any) {
    console.error("[reputation.admin.user]", e?.message || e);
    res.status(500).json({ message: "Failed to load user reputation" });
  }
});

// ─── Admin: recompute a user's reputation ─────────────────────────────────
router.post("/admin/reputation/users/:userId/recompute", ensureAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const result = await reconcileUserReputation(userId);
    res.json(result);
  } catch (e: any) {
    console.error("[reputation.admin.recompute]", e?.message || e);
    res.status(500).json({ message: "Failed to recompute" });
  }
});

// ─── Admin: manually grant a badge ─────────────────────────────────────────
const grantBadgeSchema = z.object({
  badgeSlug: z.string().min(1).max(64),
  reason: z.string().min(1).max(500),
});

router.post("/admin/reputation/users/:userId/badges", ensureAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const parsed = grantBadgeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid input", errors: parsed.error.errors }); return; }
    const { badgeSlug, reason } = parsed.data;

    // Validate badge exists in rules
    const [rule] = await db.select().from(badgeRules).where(eq(badgeRules.slug, badgeSlug)).limit(1);
    if (!rule) { res.status(404).json({ message: "Unknown badge" }); return; }

    try {
      await db.insert(traderBadges).values({
        userId,
        badgeSlug,
        source: "manual",
        grantedBy: req.session!.userId!,
        reason,
      });
    } catch (e: any) {
      if (/duplicate|unique/i.test(String(e?.message || ""))) {
        res.status(409).json({ message: "User already has this badge" });
        return;
      }
      throw e;
    }

    await db.insert(auditLogs).values({
      entityType: "trader_badge",
      entityId: userId,
      actor: req.session!.userId!,
      actorRole: "admin",
      actionType: "reputation.badge.grant",
      details: JSON.stringify({ badgeSlug, reason }),
    }).catch(() => {});

    res.status(201).json({ ok: true });
  } catch (e: any) {
    console.error("[reputation.admin.grant-badge]", e?.message || e);
    res.status(500).json({ message: "Failed to grant badge" });
  }
});

// ─── Admin: revoke a badge ─────────────────────────────────────────────────
const revokeBadgeSchema = z.object({ reason: z.string().min(1).max(500) });

router.delete("/admin/reputation/users/:userId/badges/:badgeSlug", ensureAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const badgeSlug = req.params.badgeSlug;
    const parsed = revokeBadgeSchema.safeParse(req.body || {});
    if (!parsed.success) { res.status(400).json({ message: "Reason required" }); return; }

    const updated = await db
      .update(traderBadges)
      .set({
        revokedAt: new Date(),
        revokedBy: req.session!.userId!,
        revokeReason: parsed.data.reason,
      })
      .where(and(
        eq(traderBadges.userId, userId),
        eq(traderBadges.badgeSlug, badgeSlug),
        isNull(traderBadges.revokedAt),
      ))
      .returning({ id: traderBadges.id });

    if (updated.length === 0) { res.status(404).json({ message: "Badge not found or already revoked" }); return; }

    await db.insert(auditLogs).values({
      entityType: "trader_badge",
      entityId: userId,
      actor: req.session!.userId!,
      actorRole: "admin",
      actionType: "reputation.badge.revoke",
      details: JSON.stringify({ badgeSlug, reason: parsed.data.reason }),
    }).catch(() => {});

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[reputation.admin.revoke-badge]", e?.message || e);
    res.status(500).json({ message: "Failed to revoke badge" });
  }
});

// ─── Admin: override tier ──────────────────────────────────────────────────
const overrideTierSchema = z.object({
  tier: z.enum(["bronze", "silver", "gold", "platinum"]).nullable(),
  reason: z.string().min(1).max(500),
});

router.post("/admin/reputation/users/:userId/tier-override", ensureAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const parsed = overrideTierSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid input", errors: parsed.error.errors }); return; }
    const { tier, reason } = parsed.data;

    const now = new Date();
    // Ensure row exists
    const [existing] = await db.select().from(traderTiers).where(eq(traderTiers.userId, userId)).limit(1);
    if (!existing) {
      await db.insert(traderTiers).values({
        userId,
        tier: tier || "bronze",
        manualOverrideTier: tier,
        manualOverrideBy: req.session!.userId!,
        manualOverrideAt: now,
        manualOverrideReason: reason,
      });
    } else {
      await db.update(traderTiers).set({
        tier: tier || existing.tier,
        manualOverrideTier: tier,
        manualOverrideBy: req.session!.userId!,
        manualOverrideAt: now,
        manualOverrideReason: reason,
      }).where(eq(traderTiers.userId, userId));
    }

    await db.insert(auditLogs).values({
      entityType: "trader_tier",
      entityId: userId,
      actor: req.session!.userId!,
      actorRole: "admin",
      actionType: tier ? "reputation.tier.override" : "reputation.tier.override.clear",
      details: JSON.stringify({ tier, reason }),
    }).catch(() => {});

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[reputation.admin.tier-override]", e?.message || e);
    res.status(500).json({ message: "Failed to update tier" });
  }
});

// ─── Admin: list rules ─────────────────────────────────────────────────────
router.get("/admin/reputation/rules", ensureAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [trules, brules] = await Promise.all([
      db.select().from(tierRules),
      db.select().from(badgeRules),
    ]);
    res.json({ tierRules: trules, badgeRules: brules });
  } catch (e: any) {
    console.error("[reputation.admin.rules]", e?.message || e);
    res.status(500).json({ message: "Failed to load rules" });
  }
});

// ─── Reputation snapshot for current user (dashboard) ─────────────────────
router.get("/me/reputation", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.session!.userId!;
    const [u] = await db.select({ userType: users.userType }).from(users).where(eq(users.id, userId)).limit(1);
    const rep = await loadReputationForUser(userId);
    const rank = u ? await leaderboardRankForUser(userId, u.userType) : null;
    res.json({ ...rep, leaderboardRank: rank, userType: u?.userType ?? null });
  } catch (e: any) {
    console.error("[reputation.me]", e?.message || e);
    res.status(500).json({ message: "Failed to load reputation" });
  }
});

export default router;
