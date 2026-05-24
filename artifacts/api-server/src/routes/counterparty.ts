import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  dealRooms,
  tradeReviews,
  tradeIdentityConsents,
} from "@shared/schema";
import {
  loadCounterpartyByUserId,
  loadRecentReviewSnippets,
  recomputeUserRatingAggregate,
  hasMutualIdentityConsent,
} from "../lib/counterparty";

const router = Router();

function ensureAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  next();
}

// ─── Public FT-ID lookup ──────────────────────────────────────────────────
router.get("/finatrades-id/:ftId", async (req: Request, res: Response): Promise<void> => {
  try {
    const ftId = String(req.params.ftId || "").trim();
    if (!ftId) { res.status(400).json({ message: "Missing FT-ID" }); return; }

    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.customFinatradesId, ftId), eq(users.finatradesId, ftId)))
      .limit(1);
    if (!u) { res.status(404).json({ message: "Finatrades ID not found" }); return; }

    const counterparty = await loadCounterpartyByUserId(u.id);
    if (!counterparty) { res.status(404).json({ message: "Counterparty not found" }); return; }

    const reviews = await loadRecentReviewSnippets(u.id, 5);
    res.json({ counterparty, reviews });
  } catch (e: any) {
    console.error("[counterparty.public-lookup]", e?.message || e);
    res.status(500).json({ message: "Failed to load Finatrades ID" });
  }
});

// ─── Trade context (deal-room based) ──────────────────────────────────────
// `:caseId` resolves to a deal room — the canonical container that ties an
// importer and exporter together. Both parties + completion status are
// derived server-side; the client cannot influence who the counterparty is.
type TradeCtx = {
  dealRoomId: string;
  requesterUserId: string;
  counterpartyUserId: string;
  isCompleted: boolean;
};

async function loadTradeCtxForUser(dealRoomId: string, uid: string): Promise<TradeCtx | { error: string; status: number }> {
  const [dr] = await db.select().from(dealRooms).where(eq(dealRooms.id, dealRoomId)).limit(1);
  if (!dr) return { error: "Trade case not found", status: 404 };
  let counterpartyUserId: string;
  if (dr.importerUserId === uid) counterpartyUserId = dr.exporterUserId;
  else if (dr.exporterUserId === uid) counterpartyUserId = dr.importerUserId;
  else return { error: "Only a party to this trade can perform this action", status: 403 };
  if (counterpartyUserId === uid) return { error: "Counterparty cannot equal requester", status: 400 };
  const isCompleted = dr.isClosed === true || dr.status === "completed" || dr.lcLifecycleStatus === "Closed";
  return { dealRoomId: dr.id, requesterUserId: uid, counterpartyUserId, isCompleted };
}

// ─── Review eligibility ───────────────────────────────────────────────────
router.get("/trade/:caseId/review-eligibility", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const caseId = req.params.caseId;
    const ctx = await loadTradeCtxForUser(caseId, uid);
    if ("error" in ctx) { res.status(ctx.status).json({ message: ctx.error }); return; }
    if (!ctx.isCompleted) {
      res.json({ eligible: false, reason: "trade_not_completed", hasReviewed: false, counterpartyUserId: ctx.counterpartyUserId });
      return;
    }
    const [existing] = await db
      .select({ id: tradeReviews.id })
      .from(tradeReviews)
      .where(and(eq(tradeReviews.tradeCaseId, caseId), eq(tradeReviews.reviewerUserId, uid)))
      .limit(1);
    res.json({
      eligible: !existing,
      reason: existing ? "already_reviewed" : null,
      hasReviewed: !!existing,
      counterpartyUserId: ctx.counterpartyUserId,
    });
  } catch (e: any) {
    console.error("[counterparty.review-eligibility]", e?.message || e);
    res.status(500).json({ message: "Failed to check review eligibility" });
  }
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().max(500).optional(),
});

router.post("/trade/:caseId/review", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const caseId = req.params.caseId;
    const parse = reviewSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ message: "Invalid input", errors: parse.error.errors }); return; }
    const d = parse.data;

    const ctx = await loadTradeCtxForUser(caseId, uid);
    if ("error" in ctx) { res.status(ctx.status).json({ message: ctx.error }); return; }
    if (!ctx.isCompleted) {
      res.status(400).json({ message: "Reviews can only be submitted after the trade is completed" });
      return;
    }

    // Reviewee is always the server-derived counterparty — never client-supplied.
    try {
      await db.insert(tradeReviews).values({
        tradeCaseId: caseId,
        reviewerUserId: uid,
        revieweeUserId: ctx.counterpartyUserId,
        rating: d.rating,
        reviewText: d.reviewText ?? null,
      });
    } catch (insErr: any) {
      if (/duplicate|unique/i.test(String(insErr?.message || ""))) {
        res.status(409).json({ message: "You have already reviewed this trade" });
        return;
      }
      throw insErr;
    }

    await recomputeUserRatingAggregate(ctx.counterpartyUserId);
    res.status(201).json({ ok: true });
  } catch (e: any) {
    console.error("[counterparty.review.create]", e?.message || e);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

// ─── Identity reveal consent ──────────────────────────────────────────────
router.post("/trade/:caseId/identity-consent", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const caseId = req.params.caseId;
    const ctx = await loadTradeCtxForUser(caseId, uid);
    if ("error" in ctx) { res.status(ctx.status).json({ message: ctx.error }); return; }
    if (!ctx.isCompleted) {
      res.status(400).json({ message: "Identity consent only applies to completed trades" });
      return;
    }

    try {
      await db.insert(tradeIdentityConsents).values({ tradeCaseId: caseId, userId: uid });
    } catch (insErr: any) {
      if (!/duplicate|unique/i.test(String(insErr?.message || ""))) throw insErr;
    }

    const mutual = await hasMutualIdentityConsent({
      tradeCaseId: caseId,
      partyAUserId: uid,
      partyBUserId: ctx.counterpartyUserId,
    });
    res.json({ ok: true, mutualConsent: mutual.both, you: true, them: mutual.b });
  } catch (e: any) {
    console.error("[counterparty.identity-consent]", e?.message || e);
    res.status(500).json({ message: "Failed to record consent" });
  }
});

// ─── Gated settlement contract metadata ───────────────────────────────────
router.get("/trade/:caseId/settlement-contract", ensureAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.session!.userId!;
    const caseId = req.params.caseId;
    const ctx = await loadTradeCtxForUser(caseId, uid);
    if ("error" in ctx) { res.status(ctx.status).json({ message: ctx.error }); return; }
    if (!ctx.isCompleted) {
      res.json({ available: false, reason: "trade_not_completed", yourConsent: false, counterpartyConsent: false, downloadUrl: null });
      return;
    }

    const mutual = await hasMutualIdentityConsent({
      tradeCaseId: caseId,
      partyAUserId: uid,
      partyBUserId: ctx.counterpartyUserId,
    });
    res.json({
      available: mutual.both,
      reason: mutual.both ? null : "mutual_identity_consent_required",
      yourConsent: mutual.a,
      counterpartyConsent: mutual.b,
      downloadUrl: mutual.both ? `/api/trade/cases/${caseId}/settlement-contract.pdf` : null,
    });
  } catch (e: any) {
    console.error("[counterparty.settlement-contract]", e?.message || e);
    res.status(500).json({ message: "Failed to check settlement contract" });
  }
});

export default router;
