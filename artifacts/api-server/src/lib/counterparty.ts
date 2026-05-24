import { db } from "../db";
import { users, finatradesCorporateKyc, finatradesPersonalKyc, tradeReviews, tradeIdentityConsents } from "@shared/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";

export interface CounterpartySnapshot {
  finatradesId: string | null;
  displayId: string;
  kycStatus: string;
  kycType: "corporate" | "personal" | "none";
  memberSince: string | null;
  completedTrades: number;
  ratingAvg: number | null;
  ratingCount: number;
  country: string | null;
  userType: string | null;
}

export interface CounterpartyReviewSnippet {
  rating: number;
  text: string | null;
  createdAt: string;
  reviewerDisplayId: string;
}

type UserLike = {
  id: string;
  finatradesId: string | null;
  customFinatradesId?: string | null;
  kycStatus: string | null;
  country: string | null;
  userType: string | null;
  createdAt: Date | string | null;
  ratingAvg: string | null;
  ratingCount: number | null;
  completedTradesCount: number | null;
};

function pickDisplayId(u: { finatradesId: string | null; customFinatradesId?: string | null; id: string }): string {
  return u.customFinatradesId || u.finatradesId || `FT-${u.id.slice(0, 8).toUpperCase()}`;
}

/**
 * Build the anonymised counterparty snapshot. Caller must already have looked
 * up KYC type (or pass null and we'll resolve it). Never returns name/email/phone/address.
 */
export function buildCounterpartySnapshot(
  user: UserLike,
  kycType: "corporate" | "personal" | "none",
): CounterpartySnapshot {
  const ratingAvg = user.ratingAvg ? Number(user.ratingAvg) : null;
  return {
    finatradesId: user.finatradesId,
    displayId: pickDisplayId(user),
    kycStatus: user.kycStatus || "Not Started",
    kycType,
    memberSince: user.createdAt
      ? (user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)).toISOString()
      : null,
    completedTrades: user.completedTradesCount ?? 0,
    ratingAvg: Number.isFinite(ratingAvg as number) ? ratingAvg : null,
    ratingCount: user.ratingCount ?? 0,
    country: user.country,
    userType: user.userType,
  };
}

async function resolveKycType(userId: string): Promise<"corporate" | "personal" | "none"> {
  const [corp] = await db
    .select({ id: finatradesCorporateKyc.id })
    .from(finatradesCorporateKyc)
    .where(eq(finatradesCorporateKyc.userId, userId))
    .limit(1);
  if (corp) return "corporate";
  const [pers] = await db
    .select({ id: finatradesPersonalKyc.id })
    .from(finatradesPersonalKyc)
    .where(eq(finatradesPersonalKyc.userId, userId))
    .limit(1);
  if (pers) return "personal";
  return "none";
}

export async function loadCounterpartyByUserId(userId: string): Promise<CounterpartySnapshot | null> {
  const [u] = await db
    .select({
      id: users.id,
      finatradesId: users.finatradesId,
      customFinatradesId: users.customFinatradesId,
      kycStatus: users.kycStatus,
      country: users.country,
      userType: users.userType,
      createdAt: users.createdAt,
      ratingAvg: users.ratingAvg,
      ratingCount: users.ratingCount,
      completedTradesCount: users.completedTradesCount,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return null;
  const kycType = await resolveKycType(userId);
  return buildCounterpartySnapshot(u as UserLike, kycType);
}

export async function loadCounterpartiesByUserIds(ids: string[]): Promise<Map<string, CounterpartySnapshot>> {
  const out = new Map<string, CounterpartySnapshot>();
  if (ids.length === 0) return out;
  const unique = Array.from(new Set(ids));
  const rows = await db
    .select({
      id: users.id,
      finatradesId: users.finatradesId,
      customFinatradesId: users.customFinatradesId,
      kycStatus: users.kycStatus,
      country: users.country,
      userType: users.userType,
      createdAt: users.createdAt,
      ratingAvg: users.ratingAvg,
      ratingCount: users.ratingCount,
      completedTradesCount: users.completedTradesCount,
    })
    .from(users)
    .where(inArray(users.id, unique));
  const corp = await db
    .select({ userId: finatradesCorporateKyc.userId })
    .from(finatradesCorporateKyc)
    .where(inArray(finatradesCorporateKyc.userId, unique));
  const pers = await db
    .select({ userId: finatradesPersonalKyc.userId })
    .from(finatradesPersonalKyc)
    .where(inArray(finatradesPersonalKyc.userId, unique));
  const corpSet = new Set(corp.map(c => c.userId));
  const persSet = new Set(pers.map(p => p.userId));
  for (const u of rows) {
    const kycType = corpSet.has(u.id) ? "corporate" : persSet.has(u.id) ? "personal" : "none";
    out.set(u.id, buildCounterpartySnapshot(u as UserLike, kycType));
  }
  return out;
}

export async function loadRecentReviewSnippets(userId: string, limit = 5): Promise<CounterpartyReviewSnippet[]> {
  const rows = await db
    .select({
      rating: tradeReviews.rating,
      reviewText: tradeReviews.reviewText,
      createdAt: tradeReviews.createdAt,
      reviewerId: tradeReviews.reviewerUserId,
      reviewerFt: users.finatradesId,
      reviewerCustomFt: users.customFinatradesId,
    })
    .from(tradeReviews)
    .leftJoin(users, eq(users.id, tradeReviews.reviewerUserId))
    .where(eq(tradeReviews.revieweeUserId, userId))
    .orderBy(desc(tradeReviews.createdAt))
    .limit(limit);
  return rows.map(r => ({
    rating: r.rating,
    text: r.reviewText,
    createdAt: r.createdAt.toISOString(),
    reviewerDisplayId: r.reviewerCustomFt || r.reviewerFt || `FT-${r.reviewerId.slice(0, 8).toUpperCase()}`,
  }));
}

/**
 * Recompute aggregate rating fields for a user after a new review.
 */
export async function recomputeUserRatingAggregate(userId: string): Promise<void> {
  const rows = await db
    .select({ rating: tradeReviews.rating })
    .from(tradeReviews)
    .where(eq(tradeReviews.revieweeUserId, userId));
  const count = rows.length;
  if (count === 0) {
    await db.update(users)
      .set({ ratingAvg: null, ratingCount: 0 })
      .where(eq(users.id, userId));
    return;
  }
  const avg = rows.reduce((s, r) => s + r.rating, 0) / count;
  await db.update(users)
    .set({ ratingAvg: avg.toFixed(1), ratingCount: count })
    .where(eq(users.id, userId));
  // Task #197 — refresh tier/badges after rating change (best-effort)
  try {
    const { reconcileUserReputation } = await import("./reputation");
    await reconcileUserReputation(userId);
  } catch (e) {
    console.error("[counterparty.reputation-hook]", (e as Error)?.message);
  }
}

/**
 * Bump completedTradesCount for a user (idempotent — caller should ensure this
 * only fires once per finalised trade by checking case status before calling).
 */
export async function incrementCompletedTrades(userId: string, by = 1): Promise<void> {
  const [row] = await db
    .select({ count: users.completedTradesCount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return;
  const next = (row.count ?? 0) + by;
  await db.update(users)
    .set({ completedTradesCount: next })
    .where(eq(users.id, userId));
  // Task #197 — refresh tier/badges after a completed trade (best-effort)
  try {
    const { reconcileUserReputation } = await import("./reputation");
    await reconcileUserReputation(userId);
  } catch (e) {
    console.error("[counterparty.reputation-hook]", (e as Error)?.message);
  }
}

export async function hasMutualIdentityConsent(params: {
  tradeCaseId?: string;
  tradeRequestId?: string;
  partyAUserId: string;
  partyBUserId: string;
}): Promise<{ a: boolean; b: boolean; both: boolean }> {
  const conds = [] as any[];
  if (params.tradeCaseId) conds.push(eq(tradeIdentityConsents.tradeCaseId, params.tradeCaseId));
  if (params.tradeRequestId) conds.push(eq(tradeIdentityConsents.tradeRequestId, params.tradeRequestId));
  if (conds.length === 0) return { a: false, b: false, both: false };
  const rows = await db
    .select({ userId: tradeIdentityConsents.userId })
    .from(tradeIdentityConsents)
    .where(and(or(...conds), inArray(tradeIdentityConsents.userId, [params.partyAUserId, params.partyBUserId])));
  const ids = new Set(rows.map(r => r.userId));
  const a = ids.has(params.partyAUserId);
  const b = ids.has(params.partyBUserId);
  return { a, b, both: a && b };
}
