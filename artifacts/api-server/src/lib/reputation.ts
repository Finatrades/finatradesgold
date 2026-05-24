import { db } from "../db";
import {
  users,
  traderTiers,
  traderBadges,
  tierRules,
  badgeRules,
  tradeReviews,
  tradeCases,
  tradeRequests,
  tradeDisputes,
  dealRooms,
  consignmentListings,
  tradeProposals,
  tradeConfirmations,
  consignments,
} from "@shared/schema";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

export type TierSlug = "bronze" | "silver" | "gold" | "platinum";

export interface TierComputation {
  computedTier: TierSlug;
  metrics: TraderMetrics;
}

export interface TraderMetrics {
  completedTrades: number;
  ratingAvg: number | null;
  ratingCount: number;
  disputeCount: number;
  disputeRateBps: number;
  commodityCategories: string[];
  countries: string[];
  consecutiveFiveStarReviews: number;
  totalVolumeMt: number;
  avgSettlementDays: number | null;
  computedAt: string;
}

const TIER_RANK: Record<TierSlug, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };

const DOWNGRADE_GRACE_DAYS = 30;

interface TierRuleRow {
  tier: TierSlug;
  rank: number;
  minTrades: number;
  minRating: number;
  maxDisputeRateBps: number;
  minCommodityCategories: number;
}

let cachedTierRules: TierRuleRow[] | null = null;
let cachedTierRulesAt = 0;
const RULE_CACHE_MS = 60_000;

async function loadTierRules(): Promise<TierRuleRow[]> {
  const now = Date.now();
  if (cachedTierRules && now - cachedTierRulesAt < RULE_CACHE_MS) return cachedTierRules;
  const rows = await db.select().from(tierRules);
  cachedTierRules = rows
    .map(r => ({
      tier: r.tier as TierSlug,
      rank: r.rank,
      minTrades: r.minTrades,
      minRating: Number(r.minRating ?? 0),
      maxDisputeRateBps: r.maxDisputeRateBps,
      minCommodityCategories: r.minCommodityCategories,
    }))
    .sort((a, b) => a.rank - b.rank);
  cachedTierRulesAt = now;
  return cachedTierRules;
}

let cachedBadgeRules: { slug: string; label: string; description: string | null; category: string; criteria: any; icon: string | null }[] | null = null;
let cachedBadgeRulesAt = 0;

async function loadBadgeRules() {
  const now = Date.now();
  if (cachedBadgeRules && now - cachedBadgeRulesAt < RULE_CACHE_MS) return cachedBadgeRules;
  const rows = await db.select().from(badgeRules).where(eq(badgeRules.active, true));
  cachedBadgeRules = rows.map(r => ({
    slug: r.slug,
    label: r.label,
    description: r.description,
    category: r.category,
    criteria: (r.criteria ?? {}) as any,
    icon: r.icon,
  }));
  cachedBadgeRulesAt = now;
  return cachedBadgeRules;
}

export function invalidateReputationCaches(): void {
  cachedTierRules = null;
  cachedBadgeRules = null;
}

/**
 * Compute rolling-12-month trader metrics. Pure read; no writes.
 */
export async function computeTraderMetrics(userId: string): Promise<TraderMetrics> {
  const windowStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // completed trades counter cached on users
  const [u] = await db
    .select({
      completedTrades: users.completedTradesCount,
      ratingAvg: users.ratingAvg,
      ratingCount: users.ratingCount,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) {
    return emptyMetrics();
  }

  // Trade cases this user was a party to (as direct user or via deal rooms)
  const settledCases = await db
    .select({
      id: tradeCases.id,
      commodityType: tradeCases.commodityType,
      buyerCountry: tradeCases.buyerCountry,
      sellerCountry: tradeCases.sellerCountry,
      escrowFundedAt: tradeCases.escrowFundedAt,
      escrowReleasedAt: tradeCases.escrowReleasedAt,
      createdAt: tradeCases.createdAt,
    })
    .from(tradeCases)
    .where(and(eq(tradeCases.userId, userId), gte(tradeCases.createdAt, windowStart)));

  // Disputes raised against or by this user in window
  const dealRoomsForUser = await db
    .select({ id: dealRooms.id, counterparty: sql<string>`CASE WHEN ${dealRooms.importerUserId}=${userId} THEN ${dealRooms.exporterUserId} ELSE ${dealRooms.importerUserId} END` })
    .from(dealRooms)
    .where(sql`${dealRooms.importerUserId}=${userId} OR ${dealRooms.exporterUserId}=${userId}`);
  const dealRoomIds = dealRoomsForUser.map(d => d.id);

  let disputeCount = 0;
  if (dealRoomIds.length > 0) {
    const drows = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(tradeDisputes)
      .where(and(inArray(tradeDisputes.dealRoomId, dealRoomIds), gte(tradeDisputes.createdAt, windowStart)));
    disputeCount = Number(drows[0]?.c ?? 0);
  }

  // Commodity categories from this user's consignments
  const cats = await db
    .selectDistinct({ cat: consignments.commodityCategory })
    .from(consignments)
    .where(eq(consignments.userId, userId))
    .catch(() => [] as { cat: string | null }[]);
  const commodityCategories = Array.from(new Set([
    ...settledCases.map(c => c.commodityType).filter((x): x is string => !!x),
    ...cats.map(c => c.cat).filter((x): x is string => !!x),
  ]));

  // Countries (counterparty side)
  const countries = Array.from(new Set([
    ...settledCases.map(c => c.buyerCountry).filter((x): x is string => !!x),
    ...settledCases.map(c => c.sellerCountry).filter((x): x is string => !!x),
  ]));

  // 5-star streak — most recent N reviews descending
  const recentReviews = await db
    .select({ rating: tradeReviews.rating, createdAt: tradeReviews.createdAt })
    .from(tradeReviews)
    .where(eq(tradeReviews.revieweeUserId, userId))
    .orderBy(desc(tradeReviews.createdAt))
    .limit(20);
  let consecutiveFiveStar = 0;
  for (const r of recentReviews) {
    if (r.rating === 5) consecutiveFiveStar++;
    else break;
  }

  // Avg settlement days from escrow funded → released
  const settlementDays = settledCases
    .map(c => {
      if (!c.escrowFundedAt || !c.escrowReleasedAt) return null;
      const ms = new Date(c.escrowReleasedAt).getTime() - new Date(c.escrowFundedAt).getTime();
      return ms > 0 ? ms / (24 * 60 * 60 * 1000) : null;
    })
    .filter((x): x is number => x != null);
  const avgSettlementDays = settlementDays.length > 0
    ? settlementDays.reduce((s, n) => s + n, 0) / settlementDays.length
    : null;

  const completedTrades = u.completedTrades ?? 0;
  const disputeRateBps = completedTrades > 0
    ? Math.round((disputeCount / completedTrades) * 10_000)
    : 0;

  return {
    completedTrades,
    ratingAvg: u.ratingAvg ? Number(u.ratingAvg) : null,
    ratingCount: u.ratingCount ?? 0,
    disputeCount,
    disputeRateBps,
    commodityCategories,
    countries,
    consecutiveFiveStarReviews: consecutiveFiveStar,
    totalVolumeMt: 0,
    avgSettlementDays,
    computedAt: new Date().toISOString(),
  };
}

function emptyMetrics(): TraderMetrics {
  return {
    completedTrades: 0,
    ratingAvg: null,
    ratingCount: 0,
    disputeCount: 0,
    disputeRateBps: 0,
    commodityCategories: [],
    countries: [],
    consecutiveFiveStarReviews: 0,
    totalVolumeMt: 0,
    avgSettlementDays: null,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Pure tier classifier given metrics + rule set.
 */
export function classifyTier(metrics: TraderMetrics, rules: TierRuleRow[]): TierSlug {
  let best: TierSlug = "bronze";
  for (const rule of rules) {
    const ratingOk = (metrics.ratingAvg ?? 0) >= rule.minRating || rule.minRating === 0;
    const tradesOk = metrics.completedTrades >= rule.minTrades;
    const disputeOk = metrics.disputeRateBps <= rule.maxDisputeRateBps;
    const catsOk = metrics.commodityCategories.length >= rule.minCommodityCategories;
    if (ratingOk && tradesOk && disputeOk && catsOk) best = rule.tier;
  }
  return best;
}

/**
 * Recompute a user's tier. Applies the sticky downgrade rule: if computed
 * tier is below current tier, store pending_tier + pending_demotion_at
 * 30 days out instead of demoting immediately. If a previously-pending
 * demotion has matured (NOW >= pending_demotion_at) and the computed tier
 * is still lower, apply it. Upgrades are always immediate.
 */
export async function recomputeUserTier(userId: string): Promise<{ tier: TierSlug; pendingTier: TierSlug | null; metrics: TraderMetrics }> {
  const rules = await loadTierRules();
  const metrics = await computeTraderMetrics(userId);
  const computed = classifyTier(metrics, rules);

  const [existing] = await db.select().from(traderTiers).where(eq(traderTiers.userId, userId)).limit(1);

  const currentTier = (existing?.tier as TierSlug) || "bronze";
  const currentRank = TIER_RANK[currentTier];
  const computedRank = TIER_RANK[computed];
  const now = new Date();

  let newTier: TierSlug = currentTier;
  let pendingTier: TierSlug | null = (existing?.pendingTier as TierSlug | null) ?? null;
  let pendingDemotionAt: Date | null = existing?.pendingDemotionAt ?? null;

  if (computedRank > currentRank) {
    // Promote immediately
    newTier = computed;
    pendingTier = null;
    pendingDemotionAt = null;
  } else if (computedRank < currentRank) {
    // Schedule demotion if not already pending for same or lower tier
    if (!pendingTier || TIER_RANK[pendingTier] !== computedRank) {
      pendingTier = computed;
      pendingDemotionAt = new Date(now.getTime() + DOWNGRADE_GRACE_DAYS * 24 * 60 * 60 * 1000);
    }
    // Apply pending demotion if grace passed and still warranted
    if (pendingDemotionAt && pendingDemotionAt <= now) {
      newTier = pendingTier ?? computed;
      pendingTier = null;
      pendingDemotionAt = null;
    }
  } else {
    // Same tier — clear any pending demotion (recovered)
    pendingTier = null;
    pendingDemotionAt = null;
  }

  // Manual override always wins
  const finalTier: TierSlug = (existing?.manualOverrideTier as TierSlug | undefined) || newTier;

  await db
    .insert(traderTiers)
    .values({
      userId,
      tier: finalTier,
      metricsSnapshot: metrics as any,
      computedAt: now,
      pendingTier,
      pendingDemotionAt,
    })
    .onConflictDoUpdate({
      target: traderTiers.userId,
      set: {
        tier: finalTier,
        metricsSnapshot: metrics as any,
        computedAt: now,
        pendingTier,
        pendingDemotionAt,
      },
    });

  return { tier: finalTier, pendingTier, metrics };
}

// ─── Badge engine ─────────────────────────────────────────────────────────
export interface BadgeCriteria {
  minCompletedTrades?: number;
  minVolumeMt?: number;
  maxAvgSettlementDays?: number;
  windowDays?: number;
  maxDisputes?: number;
  minTradesInWindow?: number;
  minCountries?: number;
  minConsecutiveFiveStar?: number;
}

function badgeQualifies(criteria: BadgeCriteria, metrics: TraderMetrics): boolean {
  if (criteria.minCompletedTrades != null && metrics.completedTrades < criteria.minCompletedTrades) return false;
  if (criteria.minVolumeMt != null && metrics.totalVolumeMt < criteria.minVolumeMt) return false;
  if (criteria.minCountries != null && metrics.countries.length < criteria.minCountries) return false;
  if (criteria.minConsecutiveFiveStar != null && metrics.consecutiveFiveStarReviews < criteria.minConsecutiveFiveStar) return false;
  if (criteria.maxAvgSettlementDays != null) {
    if (metrics.avgSettlementDays == null) return false;
    if (metrics.avgSettlementDays > criteria.maxAvgSettlementDays) return false;
    if (criteria.minCompletedTrades != null && metrics.completedTrades < criteria.minCompletedTrades) return false;
  }
  if (criteria.maxDisputes != null) {
    if (metrics.disputeCount > criteria.maxDisputes) return false;
    if (criteria.minTradesInWindow != null && metrics.completedTrades < criteria.minTradesInWindow) return false;
  }
  return true;
}

/**
 * Reconcile badges: grant any newly-earned auto badges. Never revokes
 * already-granted badges (they are sticky achievements — admin must manually
 * revoke). Manual badges are untouched.
 */
export async function reconcileBadgesForUser(userId: string, metricsOverride?: TraderMetrics): Promise<{ granted: string[] }> {
  const rules = await loadBadgeRules();
  const metrics = metricsOverride || await computeTraderMetrics(userId);

  const existing = await db
    .select({ slug: traderBadges.badgeSlug })
    .from(traderBadges)
    .where(and(eq(traderBadges.userId, userId), isNull(traderBadges.revokedAt)));
  const existingSet = new Set(existing.map(e => e.slug));

  const granted: string[] = [];
  for (const r of rules) {
    if (existingSet.has(r.slug)) continue;
    if (badgeQualifies(r.criteria as BadgeCriteria, metrics)) {
      try {
        await db.insert(traderBadges).values({
          userId,
          badgeSlug: r.slug,
          source: 'auto',
        });
        granted.push(r.slug);
      } catch (e: any) {
        if (!/duplicate|unique/i.test(String(e?.message || ""))) throw e;
      }
    }
  }
  return { granted };
}

/**
 * Full reputation reconcile for one user — tier + badges. Safe to call as
 * an event hook on trade completion or as a scheduled daily job.
 */
export async function reconcileUserReputation(userId: string): Promise<{
  tier: TierSlug;
  pendingTier: TierSlug | null;
  metrics: TraderMetrics;
  grantedBadges: string[];
}> {
  const { tier, pendingTier, metrics } = await recomputeUserTier(userId);
  const { granted } = await reconcileBadgesForUser(userId, metrics);
  return { tier, pendingTier, metrics, grantedBadges: granted };
}

/**
 * Load badges + tier for public profile / chip.
 */
export async function loadReputationForUser(userId: string): Promise<{
  tier: TierSlug;
  pendingTier: TierSlug | null;
  pendingDemotionAt: string | null;
  metricsSnapshot: TraderMetrics | null;
  badges: { slug: string; label: string; description: string | null; icon: string | null; earnedAt: string; source: string }[];
}> {
  const [t] = await db.select().from(traderTiers).where(eq(traderTiers.userId, userId)).limit(1);
  const badgeRows = await db
    .select({
      slug: traderBadges.badgeSlug,
      earnedAt: traderBadges.earnedAt,
      source: traderBadges.source,
    })
    .from(traderBadges)
    .where(and(eq(traderBadges.userId, userId), isNull(traderBadges.revokedAt)))
    .orderBy(desc(traderBadges.earnedAt));
  const rules = await loadBadgeRules();
  const ruleMap = new Map(rules.map(r => [r.slug, r]));
  const badges = badgeRows.map(b => {
    const r = ruleMap.get(b.slug);
    return {
      slug: b.slug,
      label: r?.label || b.slug,
      description: r?.description ?? null,
      icon: r?.icon ?? null,
      earnedAt: b.earnedAt.toISOString(),
      source: b.source,
    };
  });
  return {
    tier: (t?.tier as TierSlug) || "bronze",
    pendingTier: (t?.pendingTier as TierSlug | null) ?? null,
    pendingDemotionAt: t?.pendingDemotionAt ? t.pendingDemotionAt.toISOString() : null,
    metricsSnapshot: (t?.metricsSnapshot as TraderMetrics | null) ?? null,
    badges,
  };
}

/**
 * Build leaderboard. Cached values live at the call-site.
 */
export async function buildLeaderboard(opts: {
  type: "exporter" | "importer";
  region?: string | null;
  limit?: number;
}): Promise<Array<{
  rank: number;
  userId: string;
  displayId: string;
  country: string | null;
  completedTrades: number;
  ratingAvg: number | null;
  tier: TierSlug;
}>> {
  const limit = opts.limit ?? 20;
  const userType = opts.type === "exporter" ? "exporter" : "importer";
  const whereCountry = opts.region
    ? sql`AND u.country = ${opts.region}`
    : sql``;
  const rows: any[] = await db.execute(sql`
    SELECT u.id, u.finatrades_id, u.custom_finatrades_id, u.country,
           u.completed_trades_count, u.rating_avg,
           COALESCE(t.tier, 'bronze') AS tier
    FROM users u
    LEFT JOIN trader_tiers t ON t.user_id = u.id
    WHERE u.user_type = ${userType}
      AND COALESCE(u.completed_trades_count, 0) > 0
      ${whereCountry}
    ORDER BY u.completed_trades_count DESC NULLS LAST,
             u.rating_avg DESC NULLS LAST
    LIMIT ${limit}
  `).then((r: any) => r.rows || r);

  return rows.map((r: any, i: number) => ({
    rank: i + 1,
    userId: r.id,
    displayId: r.custom_finatrades_id || r.finatrades_id || `FT-${String(r.id).slice(0, 8).toUpperCase()}`,
    country: r.country ?? null,
    completedTrades: Number(r.completed_trades_count ?? 0),
    ratingAvg: r.rating_avg != null ? Number(r.rating_avg) : null,
    tier: (r.tier as TierSlug) || "bronze",
  }));
}

/**
 * Compute leaderboard rank for a single user (for profile display).
 */
export async function leaderboardRankForUser(userId: string, userType: string | null): Promise<number | null> {
  if (userType !== "exporter" && userType !== "importer") return null;
  const result: any = await db.execute(sql`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY completed_trades_count DESC NULLS LAST,
                                          rating_avg DESC NULLS LAST) AS rnk
      FROM users
      WHERE user_type = ${userType}
        AND COALESCE(completed_trades_count, 0) > 0
    )
    SELECT rnk FROM ranked WHERE id = ${userId}
  `);
  const rows = result.rows || result;
  if (!rows || rows.length === 0) return null;
  return Number(rows[0].rnk);
}
