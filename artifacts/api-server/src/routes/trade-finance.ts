/**
 * Trade Finance routes (Task #146).
 *
 * Mount under /api at server startup via registerTradeFinanceRoutes(app).
 * Endpoints:
 *   GET    /api/wallet/balances
 *   POST   /api/wallet/balances/:currency/deposit
 *   GET    /api/wallet/fx/rates
 *   POST   /api/wallet/fx/quote
 *   PUT    /api/admin/wallet/fx/rates
 *
 *   GET    /api/trade/cases/:caseId/milestones
 *   PUT    /api/trade/cases/:caseId/milestones
 *   POST   /api/trade/cases/:caseId/milestones/:milestoneId/release
 *   POST   /api/trade/cases/:caseId/escrow/fund
 *
 *   GET    /api/trade/cases/:caseId/lc
 *   POST   /api/trade/cases/:caseId/lc
 *   POST   /api/lc/:lcId/amend
 *   POST   /api/lc/:lcId/present
 *   POST   /api/lc/:lcId/presentations/:presentationId/decision
 *   GET    /api/admin/lc/queue
 *
 *   POST   /api/trade/cases/:caseId/dispute
 *   POST   /api/dispute/:disputeId/evidence
 *   POST   /api/dispute/:disputeId/decision
 *   GET    /api/admin/disputes/queue
 *
 * All counterparty payloads pass through serializeCounterparty (FT-ID only,
 * no PII) per Task #145.
 */
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  tradeCases,
  tradeMilestones,
  lettersOfCredit,
  lcEvents,
  lcPresentations,
  tradeDisputes,
  dealRooms,
  dealRoomDocuments,
  tradeDisputeEvidence,
  SUPPORTED_CURRENCIES,
} from "@shared/schema";
import { randomUUID } from "crypto";
import {
  getOrCreateBalance,
  listUserBalances,
  creditBalance,
  placeBalanceHold,
  payoutEscrow,
  releaseBalanceHold,
  getLatestRate,
  convertCents,
  upsertRate,
  materialiseMilestones,
  releaseMilestone,
  finalizeGoodsReceivedReserve,
  triggerMilestones,
  fxConvert,
  resolveCaseKey,
  mergeCaseNotes,
  SUPPORTED_TRIGGERS,
  DEFAULT_MILESTONE_SCHEDULE,
  generateLcRef,
  getLcOrThrow,
  logLcEvent,
  isSupportedCurrency,
  type MilestoneSpec,
} from "../trade-finance-service";
import { storage } from "../storage";
import { loadCounterpartyByUserId } from "../lib/counterparty";
import { sendEmailDirect } from "../email";

/**
 * Fire-and-forget notification for trade-finance lifecycle events. Pulls
 * email addresses for the named parties and renders a minimal inline HTML
 * body via `sendEmailDirect` (which wraps with brand chrome and respects
 * the SMTP-not-configured preview mode). Never throws; failures are logged
 * by the email layer.
 */
type TradeFinanceEventKind =
  | "lc_issued"
  | "lc_compliant"
  | "lc_discrepant"
  | "escrow_funded"
  | "milestone_released"
  | "dispute_opened"
  | "dispute_resolved";

const TRADE_EVENT_TITLES: Record<TradeFinanceEventKind, string> = {
  lc_issued: "Letter of Credit issued",
  lc_compliant: "Letter of Credit documents Compliant",
  lc_discrepant: "Letter of Credit documents Discrepant",
  escrow_funded: "Escrow funded",
  milestone_released: "Escrow milestone released",
  dispute_opened: "Trade dispute opened",
  dispute_resolved: "Trade dispute resolved",
};

async function notifyTradeFinanceEvent(input: {
  kind: TradeFinanceEventKind;
  caseId: string | null;
  importerUserId: string | null;
  exporterUserId: string | null;
  /** Optional actor (user who triggered the event). Excluded from notifications. */
  actorUserId?: string | null;
  payload: Record<string, any>;
  /** Optional deep link path (e.g. `/trade/cases/<id>`). */
  link?: string | null;
}): Promise<void> {
  try {
    const recipientIds = Array.from(
      new Set(
        [input.importerUserId, input.exporterUserId].filter(
          (x): x is string => !!x && x !== input.actorUserId,
        ),
      ),
    );
    if (recipientIds.length === 0) return;
    const title = TRADE_EVENT_TITLES[input.kind];
    // FT-ID-safe payload: counterparty.ts guarantees no PII.
    const payloadForBody = { caseId: input.caseId, ...input.payload };
    const message = `${title} on your trade case.`;
    const link = input.link ?? (input.caseId ? `/trade/cases/${input.caseId}` : null);

    // 1. In-app notifications (one row per recipient).
    await Promise.all(
      recipientIds.map((userId) =>
        storage
          .createNotification({
            userId,
            title,
            message,
            type: "trade",
            link,
            read: false,
          })
          .catch(() => undefined),
      ),
    );

    // 2. Email notifications.
    const users = await Promise.all(recipientIds.map((id) => storage.getUser(id)));
    const emails = users.map((u) => u?.email).filter((e): e is string => !!e);
    if (emails.length === 0) return;
    const subject = `[Finatrades] ${title}`;
    const body = `
      <h2 style="margin:0 0 12px;font:600 18px sans-serif;">${title}</h2>
      <p style="margin:0 0 8px;font:14px sans-serif;">A trade-finance event has occurred on your case.</p>
      <pre style="background:#f6f6f4;padding:12px;border-radius:6px;font:12px monospace;white-space:pre-wrap;">${
        JSON.stringify(payloadForBody, null, 2)
      }</pre>
      <p style="margin:12px 0 0;font:12px sans-serif;color:#666;">Open Finatrades to review and respond.</p>
    `;
    await Promise.all(
      emails.map((to) => sendEmailDirect(to, subject, body).catch(() => undefined)),
    );
  } catch {
    /* notifications never block the request path */
  }
}

function ensureAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  next();
}

async function ensureAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sid = req.session?.userId;
  if (!sid) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  const u = await storage.getUser(sid);
  if (!u || u.role !== "admin") {
    res.status(403).json({ message: "Admin required" });
    return;
  }
  (req as any).adminUser = u;
  next();
}

const currencyParam = z.enum(SUPPORTED_CURRENCIES);

const depositSchema = z.object({
  amountCents: z.number().int().positive(),
  reference: z.string().min(1),
  description: z.string().optional(),
});

const fxQuoteSchema = z.object({
  amountCents: z.number().int().positive(),
  from: z.string(),
  to: z.string(),
});

const fxRateSchema = z.object({
  baseCurrency: z.string(),
  quoteCurrency: z.string(),
  rate: z.number().positive(),
  source: z.string().optional(),
});

const milestoneSpec = z.object({
  sequence: z.number().int().positive(),
  label: z.string().min(1),
  trigger: z.enum([
    "lc_issued",
    "shipment_documents_uploaded",
    "customs_cleared",
    "goods_received",
    "manual_admin_release",
  ]),
  percent: z.number().min(0).max(100),
});

const milestoneScheduleSchema = z.object({
  schedule: z.array(milestoneSpec).min(1),
});

const milestoneReleaseSchema = z.object({
  reason: z.string().min(1),
  evidenceDocumentIds: z.array(z.string()).optional(),
});

const escrowFundSchema = z.object({
  amountCents: z.number().int().positive().optional(),
});

const lcCreateSchema = z.object({
  beneficiaryUserId: z.string().min(1),
  issuingBankName: z.string().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  amountCents: z.number().int().positive(),
  incoterms: z.string().optional(),
  expiryDate: z.string().optional(),
  latestShipmentDate: z.string().optional(),
  requiredDocuments: z.array(z.string()).optional(),
  termsJson: z.record(z.any()).optional(),
  draftUrl: z.string().optional(),
});

const lcAmendSchema = z.object({
  changes: z.record(z.any()),
  notes: z.string().optional(),
});

const lcPresentSchema = z.object({
  documentIds: z.array(z.string()).min(1),
  notes: z.string().optional(),
});

const lcDecisionSchema = z.object({
  decision: z.enum(["approve", "discrepancy", "reject"]),
  discrepancies: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const disputeOpenSchema = z.object({
  disputeType: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().min(1),
  evidenceUrls: z.array(z.string()).optional(),
  requestedResolution: z.string().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

const disputeEvidenceSchema = z.object({
  evidenceUrls: z.array(z.string()).min(1),
  notes: z.string().optional(),
});

const disputeDecisionSchema = z.object({
  resolution: z.string().min(1),
  importerAllocationCents: z.number().int().nonnegative(),
  exporterAllocationCents: z.number().int().nonnegative(),
  panelMemberIds: z.array(z.string()).optional(),
  appealDays: z.number().int().min(0).max(30).optional(),
});

/**
 * Resolve the trade case for a given route param. Accepts either a
 * `trade_cases.id` OR a `deal_rooms.id` so that Deal Room callers (which
 * track the deal by dealRoomId) and direct callers both work.
 * Returns null when neither lookup matches.
 */
async function caseParties(caseId: string): Promise<{
  importerUserId: string | null;
  exporterUserId: string | null;
  currency: string;
  amountCents: number;
  case: typeof tradeCases.$inferSelect | null;
  resolvedCaseId: string | null;
  dealRoomId: string | null;
}> {
  try {
    const r = await resolveCaseKey(caseId);
    const amountCents = r.case.settlementAmountCents
      ? Number(r.case.settlementAmountCents)
      : Math.round(Number(r.case.tradeValueUsd) * 100);
    return {
      importerUserId: r.case.userId,
      exporterUserId: r.exporterUserId,
      currency: r.case.settlementCurrency || "USD",
      amountCents,
      case: r.case,
      resolvedCaseId: r.case.id,
      dealRoomId: r.dealRoomId,
    };
  } catch {
    return { importerUserId: null, exporterUserId: null, currency: "USD", amountCents: 0, case: null, resolvedCaseId: null, dealRoomId: null };
  }
}

/** Returns true when the session user is importer/exporter on the case or an admin. */
async function isCaseParty(
  parties: { importerUserId: string | null; exporterUserId: string | null },
  sessionUserId: string,
): Promise<boolean> {
  if (parties.importerUserId === sessionUserId) return true;
  if (parties.exporterUserId === sessionUserId) return true;
  const u = await storage.getUser(sessionUserId);
  return u?.role === "admin";
}

async function buildCounterpartyResponse(userId: string | null) {
  if (!userId) return null;
  return loadCounterpartyByUserId(userId);
}

export function registerTradeFinanceRoutes(app: Express): void {
  // ────────────────────────── WALLET BALANCES ──────────────────────────
  app.get("/api/wallet/balances", ensureAuth, async (req, res) => {
    try {
      const balances = await listUserBalances(req.session!.userId!);
      res.json({ balances });
    } catch (err: any) {
      /* logged */
      res.status(err?.status || 500).json({ message: err?.message || "Failed to load balances" });
    }
  });

  // Admin-only credit rail. Self-service deposits MUST flow through verified
  // payment rails (Stripe / bank webhook / stablecoin on-chain confirmation);
  // leaving this open to authenticated users would allow self-minting funds
  // straight into the multi-currency wallet.
  app.post("/api/wallet/balances/:currency/deposit", ensureAdmin, async (req, res) => {
    const parsedCur = currencyParam.safeParse(req.params.currency);
    if (!parsedCur.success) return void res.status(400).json({ message: "Unsupported currency" });
    const parsed = z.object({
      userId: z.string().min(1),
      amountCents: z.number().int().positive(),
      reference: z.string().min(1),
      description: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const result = await creditBalance({
        userId: parsed.data.userId,
        currency: parsedCur.data,
        amountCents: parsed.data.amountCents,
        idempotencyKey: `admin-deposit:${parsed.data.reference}`,
        description: parsed.data.description ?? `Admin credit ref ${parsed.data.reference}`,
      });
      res.status(201).json(result);
    } catch (err: any) {
      /* logged */
      res.status(err?.status || 500).json({ message: err?.message || "Failed to deposit" });
    }
  });

  // ────────────────────────── FX RATES ──────────────────────────
  app.get("/api/wallet/fx/rates", ensureAuth, async (_req, res) => {
    try {
      const pairs: Array<{ base: string; quote: string; rate: number }> = [];
      for (const base of SUPPORTED_CURRENCIES) {
        for (const quote of SUPPORTED_CURRENCIES) {
          if (base === quote) continue;
          const rate = await getLatestRate(base, quote);
          pairs.push({ base, quote, rate });
        }
      }
      res.json({ rates: pairs });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to load FX rates" });
    }
  });

  app.post("/api/wallet/fx/quote", ensureAuth, async (req, res) => {
    const parsed = fxQuoteSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input" });
    try {
      const converted = await convertCents(parsed.data.amountCents, parsed.data.from, parsed.data.to);
      const rate = await getLatestRate(parsed.data.from, parsed.data.to);
      res.json({
        from: parsed.data.from,
        to: parsed.data.to,
        amountCents: parsed.data.amountCents,
        convertedCents: converted,
        rate,
      });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "FX quote failed" });
    }
  });

  app.post("/api/wallet/fx", ensureAuth, async (req, res) => {
    const parsed = z.object({
      from: z.enum(SUPPORTED_CURRENCIES),
      to: z.enum(SUPPORTED_CURRENCIES),
      amountCents: z.number().int().positive(),
      idempotencyKey: z.string().min(1),
    }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const result = await fxConvert({
        userId: req.session!.userId!,
        fromCurrency: parsed.data.from,
        toCurrency: parsed.data.to,
        amountCents: parsed.data.amountCents,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      res.status(201).json(result);
    } catch (err: any) {
      if (err?.code === "INSUFFICIENT_FUNDS") {
        return void res.status(402).json({ message: "Insufficient balance for conversion", code: "INSUFFICIENT_FUNDS" });
      }
      res.status(err?.status || 500).json({ message: err?.message || "FX conversion failed" });
    }
  });

  app.put("/api/admin/wallet/fx/rates", ensureAdmin, async (req, res) => {
    const parsed = fxRateSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input" });
    try {
      await upsertRate(parsed.data);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to update FX rate" });
    }
  });

  // ────────────────────────── MILESTONES & ESCROW ──────────────────────────
  app.get("/api/trade/cases/:caseId/milestones", ensureAuth, async (req, res) => {
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case || !parties.resolvedCaseId) return void res.status(404).json({ message: "Trade case not found" });
      if (!(await isCaseParty(parties, req.session!.userId!))) {
        return void res.status(403).json({ message: "Not a party to this trade" });
      }
      const rows = await db
        .select()
        .from(tradeMilestones)
        .where(eq(tradeMilestones.tradeCaseId, parties.resolvedCaseId))
        .orderBy(tradeMilestones.sequence);
      res.json({ milestones: rows, caseId: parties.resolvedCaseId });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load milestones" });
    }
  });

  app.put("/api/trade/cases/:caseId/milestones", ensureAuth, async (req, res) => {
    const parsed = milestoneScheduleSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case) return void res.status(404).json({ message: "Trade case not found" });
      if (parties.case.userId !== req.session!.userId!) {
        const u = await storage.getUser(req.session!.userId!);
        if (!u || u.role !== "admin") return void res.status(403).json({ message: "Only the importer or admin can set milestones" });
      }
      // Save the schedule on the case (jsonb) plus materialise rows.
      await db
        .update(tradeCases)
        .set({ milestoneSchedule: parsed.data.schedule as any, updatedAt: new Date() })
        .where(eq(tradeCases.id, parties.resolvedCaseId!));
      const milestones = await materialiseMilestones({
        tradeCaseId: parties.resolvedCaseId!,
        schedule: parsed.data.schedule as MilestoneSpec[],
        amountCents: parties.amountCents,
        currency: parties.currency,
      });
      res.json({ milestones });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to set milestones" });
    }
  });

  app.post("/api/trade/cases/:caseId/escrow/fund", ensureAuth, async (req, res) => {
    const parsed = escrowFundSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input" });
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case) return void res.status(404).json({ message: "Trade case not found" });
      if (parties.case.userId !== req.session!.userId!) {
        return void res.status(403).json({ message: "Only the importer (case owner) can fund escrow" });
      }
      // Ensure milestones materialised first (use default schedule if none set yet).
      const existing = await db
        .select()
        .from(tradeMilestones)
        .where(eq(tradeMilestones.tradeCaseId, parties.resolvedCaseId!));
      const amount = parsed.data.amountCents || parties.amountCents;
      if (amount <= 0) return void res.status(400).json({ message: "Settlement amount unknown — set milestones first" });
      if (existing.length === 0) {
        const schedule = (parties.case.milestoneSchedule as MilestoneSpec[] | null) || DEFAULT_MILESTONE_SCHEDULE;
        await materialiseMilestones({
          tradeCaseId: parties.resolvedCaseId!,
          schedule,
          amountCents: amount,
          currency: parties.currency,
        });
      }
      const tx = await placeBalanceHold({
        userId: req.session!.userId!,
        currency: parties.currency,
        amountCents: amount,
        referenceType: "trade_case_escrow",
        referenceId: parties.resolvedCaseId!,
        idempotencyKey: `escrow-fund:${parties.resolvedCaseId!}`,
      });
      await db
        .update(tradeCases)
        .set({
          escrowHoldId: tx.id,
          escrowFundedAt: new Date(),
          settlementAmountCents: amount,
          status: "Active",
          updatedAt: new Date(),
        })
        .where(eq(tradeCases.id, parties.resolvedCaseId!));
      void notifyTradeFinanceEvent({
        kind: "escrow_funded",
        caseId: parties.resolvedCaseId,
        importerUserId: parties.importerUserId,
        exporterUserId: parties.exporterUserId,
        actorUserId: req.session!.userId!,
        payload: {
          amountCents: amount,
          currency: parties.currency,
          caseNumber: parties.case.caseNumber,
        },
      });
      res.status(201).json({ ok: true, transaction: tx });
    } catch (err: any) {
      if (err?.code === "INSUFFICIENT_FUNDS") {
        return void res.status(402).json({ message: "Insufficient balance to fund escrow", code: "INSUFFICIENT_FUNDS" });
      }
      res.status(err?.status || 500).json({ message: err?.message || "Failed to fund escrow" });
    }
  });

  // Trigger-based milestone release. Admin-only entry point that event sources
  // (LC compliant decision is auto-wired, shipment_dispatched / goods_received
  // events flow through here) can call to release every pending milestone whose
  // `trigger` matches.
  app.post("/api/trade/cases/:caseId/milestones/trigger/:trigger", ensureAdmin, async (req, res) => {
    const trigger = String(req.params.trigger || "");
    if (!(SUPPORTED_TRIGGERS as readonly string[]).includes(trigger)) {
      return void res.status(400).json({ message: "Unsupported trigger" });
    }
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case || !parties.resolvedCaseId) return void res.status(404).json({ message: "Trade case not found" });
      const result = await triggerMilestones({
        tradeCaseId: parties.resolvedCaseId,
        trigger,
        releasedBy: req.session!.userId!,
        reason: `Trigger event: ${trigger}`,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Trigger failed" });
    }
  });

  app.post("/api/trade/cases/:caseId/milestones/:milestoneId/release", ensureAuth, async (req, res) => {
    const parsed = milestoneReleaseSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case) return void res.status(404).json({ message: "Trade case not found" });
      // Only importer (case owner) or admin can release. Exporters request, importer approves.
      const sid = req.session!.userId!;
      const u = await storage.getUser(sid);
      const isOwner = parties.case.userId === sid;
      const isAdmin = u?.role === "admin";
      if (!isOwner && !isAdmin) {
        return void res.status(403).json({ message: "Only the importer or admin can release a milestone" });
      }
      const result = await releaseMilestone({
        tradeCaseId: parties.resolvedCaseId!,
        milestoneId: req.params.milestoneId,
        releasedBy: sid,
        reason: parsed.data.reason,
        evidenceDocumentIds: parsed.data.evidenceDocumentIds,
      });
      void notifyTradeFinanceEvent({
        kind: "milestone_released",
        caseId: parties.resolvedCaseId,
        importerUserId: parties.importerUserId,
        exporterUserId: parties.exporterUserId,
        payload: {
          milestoneId: result.milestone?.id,
          label: result.milestone?.label,
          trigger: result.milestone?.trigger,
          status: result.milestone?.status,
          amountCents: result.milestone?.releasedAmountCents,
          currency: result.milestone?.currency,
        },
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to release milestone" });
    }
  });

  // Importer-facing buyer-confirm of delivery. Fires the canonical
  // `goods_received` milestone trigger, which releases matching milestones
  // into the dispute-window reserve. Idempotent: repeated calls only
  // affect milestones still in `pending`. ROUND-5 FIX: required by spec —
  // admin-only generic trigger is not equivalent to buyer auto-confirm.
  app.post("/api/trade/cases/:caseId/goods-received", ensureAuth, async (req, res) => {
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case || !parties.resolvedCaseId) {
        return void res.status(404).json({ message: "Trade case not found" });
      }
      const sid = req.session!.userId!;
      const u = await storage.getUser(sid);
      const isOwner = parties.case.userId === sid;
      const isAdmin = u?.role === "admin";
      if (!isOwner && !isAdmin) {
        return void res.status(403).json({
          message: "Only the importer (buyer) or admin can confirm goods received",
        });
      }
      const result = await triggerMilestones({
        tradeCaseId: parties.resolvedCaseId,
        trigger: "goods_received",
        releasedBy: sid,
        reason: typeof req.body?.reason === "string"
          ? req.body.reason
          : `Buyer confirmed goods received`,
      });
      for (const m of result.released) {
        void notifyTradeFinanceEvent({
          kind: "milestone_released",
          caseId: parties.resolvedCaseId,
          importerUserId: parties.importerUserId,
          exporterUserId: parties.exporterUserId,
          payload: {
            milestoneId: m.id,
            label: m.label,
            trigger: m.trigger,
            status: m.status,
            amountCents: m.releasedAmountCents,
            currency: m.currency,
          },
        });
      }
      res.json({ released: result.released, errors: result.errors });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to confirm delivery" });
    }
  });

  // Finalize the post-goods-received reserve: pays held-back funds to the
  // exporter and marks the case Settled. Permitted after the 30-day dispute
  // window OR by an admin override at any time. Refuses if any unresolved
  // dispute exists on the case.
  app.post("/api/trade/cases/:caseId/finalize", ensureAuth, async (req, res) => {
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case || !parties.resolvedCaseId) {
        return void res.status(404).json({ message: "Trade case not found" });
      }
      const sid = req.session!.userId!;
      const u = await storage.getUser(sid);
      const isAdmin = u?.role === "admin";
      const isParty = await isCaseParty(parties, sid);
      if (!isAdmin && !isParty) {
        return void res.status(403).json({ message: "Forbidden" });
      }
      // No outstanding dispute may exist on the case.
      const open = await db
        .select({ id: tradeDisputes.id })
        .from(tradeDisputes)
        .where(and(
          eq(tradeDisputes.tradeCaseId, parties.resolvedCaseId),
          inArray(tradeDisputes.status, ["Open", "Under Review", "Pending Resolution"] as any),
        ));
      if (open.length > 0) {
        return void res.status(409).json({
          message: "Cannot finalize while a dispute is open on this case",
          code: "DISPUTE_OPEN",
        });
      }
      // Locate the goods_received milestone to enforce the 30-day window.
      const [gr] = await db
        .select()
        .from(tradeMilestones)
        .where(and(
          eq(tradeMilestones.tradeCaseId, parties.resolvedCaseId),
          eq(tradeMilestones.trigger, "goods_received"),
          inArray(tradeMilestones.status, ["released", "released_reserved"]),
        ))
        .limit(1);
      if (!gr?.releasedAt) {
        return void res.status(409).json({
          message: "Goods Received milestone has not been released",
          code: "GOODS_RECEIVED_NOT_RELEASED",
        });
      }
      const elapsedDays = (Date.now() - new Date(gr.releasedAt).getTime()) / 86400000;
      if (!isAdmin && elapsedDays < 30) {
        return void res.status(409).json({
          message: "Dispute window is still open; finalize available after 30 days or by an admin",
          code: "DISPUTE_WINDOW_OPEN",
          daysRemaining: Math.ceil(30 - elapsedDays),
        });
      }
      const result = await finalizeGoodsReceivedReserve({
        tradeCaseId: parties.resolvedCaseId,
        actorUserId: sid,
      });
      res.json({ finalized: true, ...result });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to finalize case" });
    }
  });

  // ────────────────────────── LETTERS OF CREDIT ──────────────────────────
  app.get("/api/trade/cases/:caseId/lc", ensureAuth, async (req, res) => {
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case || !parties.resolvedCaseId) return void res.status(404).json({ message: "Trade case not found" });
      if (!(await isCaseParty(parties, req.session!.userId!))) {
        return void res.status(403).json({ message: "Not a party to this trade" });
      }
      const rows = await db
        .select()
        .from(lettersOfCredit)
        .where(eq(lettersOfCredit.tradeCaseId, parties.resolvedCaseId))
        .orderBy(desc(lettersOfCredit.createdAt));
      const ids = rows.map((r) => r.id);
      const events = ids.length
        ? await db.select().from(lcEvents).where(inArray(lcEvents.lcId, ids)).orderBy(desc(lcEvents.createdAt))
        : [];
      const presentations = ids.length
        ? await db.select().from(lcPresentations).where(inArray(lcPresentations.lcId, ids)).orderBy(desc(lcPresentations.createdAt))
        : [];
      // Strip PII by replacing applicant/beneficiary names with FT-ID snapshots.
      const applicants = await Promise.all(rows.map((r) => buildCounterpartyResponse(r.applicantUserId)));
      const beneficiaries = await Promise.all(rows.map((r) => buildCounterpartyResponse(r.beneficiaryUserId)));
      const decorated = rows.map((r, idx) => ({
        ...r,
        applicantCounterparty: applicants[idx],
        beneficiaryCounterparty: beneficiaries[idx],
      }));
      res.json({ lcs: decorated, events, presentations });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load LCs" });
    }
  });

  app.post("/api/trade/cases/:caseId/lc", ensureAuth, async (req, res) => {
    const parsed = lcCreateSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case) return void res.status(404).json({ message: "Trade case not found" });
      if (parties.case.userId !== req.session!.userId!) {
        return void res.status(403).json({ message: "Only the importer (applicant) can request an LC" });
      }
      // Record the beneficiary on the case so milestone payouts can resolve it.
      if (!parties.exporterUserId) {
        await mergeCaseNotes(parties.resolvedCaseId!, { exporterUserId: parsed.data.beneficiaryUserId });
      }
      // Spec: "Issue LC" holds 100% of the LC amount in escrow against it.
      // Place the hold FIRST so a funding failure aborts the LC issuance.
      const lcId = randomUUID();
      let hold: Awaited<ReturnType<typeof placeBalanceHold>> | null = null;
      try {
        hold = await placeBalanceHold({
          userId: req.session!.userId!,
          currency: parsed.data.currency,
          amountCents: parsed.data.amountCents,
          referenceType: "lc_escrow",
          referenceId: lcId,
          idempotencyKey: `lc-hold:${lcId}`,
        });
      } catch (err: any) {
        if (err?.code === "INSUFFICIENT_FUNDS") {
          return void res.status(402).json({ message: "Insufficient balance to issue LC", code: "INSUFFICIENT_FUNDS" });
        }
        throw err;
      }
      let lc;
      try {
        [lc] = await db
          .insert(lettersOfCredit)
          .values({
            id: lcId,
            lcRef: generateLcRef(),
            tradeCaseId: parties.resolvedCaseId!,
            dealRoomId: parties.dealRoomId,
            issuingBankName: parsed.data.issuingBankName ?? null,
            applicantUserId: req.session!.userId!,
            beneficiaryUserId: parsed.data.beneficiaryUserId,
            currency: parsed.data.currency,
            amountCents: parsed.data.amountCents,
            incoterms: parsed.data.incoterms ?? null,
            expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
            latestShipmentDate: parsed.data.latestShipmentDate ? new Date(parsed.data.latestShipmentDate) : null,
            requiredDocuments: parsed.data.requiredDocuments ?? null,
            draftUrl: parsed.data.draftUrl ?? null,
            termsJson: (parsed.data.termsJson as any) ?? null,
            status: "Issued",
          })
          .returning();
      } catch (err) {
        // Compensating release if the LC row could not be persisted.
        await releaseBalanceHold({
          userId: req.session!.userId!,
          currency: parsed.data.currency,
          amountCents: parsed.data.amountCents,
          referenceType: "lc_escrow",
          referenceId: lcId,
          idempotencyKey: `lc-hold-rollback:${lcId}`,
        }).catch(() => undefined);
        throw err;
      }
      // Reflect escrow state on the trade case.
      await db
        .update(tradeCases)
        .set({
          escrowHoldId: hold.id,
          escrowFundedAt: new Date(),
          settlementAmountCents: parsed.data.amountCents,
          settlementCurrency: parsed.data.currency,
          status: "Active",
          updatedAt: new Date(),
        })
        .where(eq(tradeCases.id, parties.resolvedCaseId!));
      void notifyTradeFinanceEvent({
        kind: "lc_issued",
        caseId: parties.resolvedCaseId,
        importerUserId: parties.importerUserId,
        exporterUserId: parsed.data.beneficiaryUserId,
        payload: {
          lcRef: lc.lcRef,
          currency: parsed.data.currency,
          amountCents: parsed.data.amountCents,
          issuingBank: parsed.data.issuingBankName ?? null,
        },
      });
      await logLcEvent({
        lcId: lc.id,
        eventType: "issued",
        actorUserId: req.session!.userId!,
        actorRole: "applicant",
        payload: {
          lcRef: lc.lcRef,
          amountCents: lc.amountCents,
          currency: lc.currency,
          holdTxId: hold.id,
        },
      });
      res.status(201).json({ lc, hold });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to create LC" });
    }
  });

  app.post("/api/lc/:lcId/amend", ensureAuth, async (req, res) => {
    const parsed = lcAmendSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input" });
    try {
      const lc = await getLcOrThrow(req.params.lcId);
      const sid = req.session!.userId!;
      if (lc.applicantUserId !== sid && lc.beneficiaryUserId !== sid) {
        const u = await storage.getUser(sid);
        if (!u || u.role !== "admin") return void res.status(403).json({ message: "Not authorised" });
      }
      const merged = { ...(lc.termsJson as any || {}), ...parsed.data.changes };
      const [updated] = await db
        .update(lettersOfCredit)
        .set({ termsJson: merged, status: "Amended", updatedAt: new Date() })
        .where(eq(lettersOfCredit.id, lc.id))
        .returning();
      await logLcEvent({
        lcId: lc.id,
        eventType: "amended",
        actorUserId: sid,
        payload: { changes: parsed.data.changes },
        notes: parsed.data.notes ?? null,
      });
      res.json({ lc: updated });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to amend LC" });
    }
  });

  app.post("/api/lc/:lcId/present", ensureAuth, async (req, res) => {
    const parsed = lcPresentSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input" });
    try {
      const lc = await getLcOrThrow(req.params.lcId);
      if (lc.beneficiaryUserId !== req.session!.userId!) {
        return void res.status(403).json({ message: "Only the beneficiary can present documents" });
      }
      // Validate every document is scoped to this LC's deal room.
      if (!lc.dealRoomId) {
        return void res.status(400).json({ message: "LC has no deal room — cannot validate documents" });
      }
      const docs = await db
        .select()
        .from(dealRoomDocuments)
        .where(and(
          inArray(dealRoomDocuments.id, parsed.data.documentIds),
          eq(dealRoomDocuments.dealRoomId, lc.dealRoomId),
        ));
      if (docs.length !== parsed.data.documentIds.length) {
        return void res.status(400).json({ message: "One or more documents do not belong to this LC's deal room" });
      }
      const [pres] = await db
        .insert(lcPresentations)
        .values({
          lcId: lc.id,
          presentedByUserId: req.session!.userId!,
          documentIds: parsed.data.documentIds,
          status: "Pending Review",
        })
        .returning();
      await db
        .update(lettersOfCredit)
        .set({ status: "Documents Presented", updatedAt: new Date() })
        .where(eq(lettersOfCredit.id, lc.id));
      await logLcEvent({
        lcId: lc.id,
        eventType: "presented",
        actorUserId: req.session!.userId!,
        actorRole: "beneficiary",
        payload: { presentationId: pres.id, documentCount: parsed.data.documentIds.length },
        notes: parsed.data.notes ?? null,
      });
      res.status(201).json({ presentation: pres });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to present documents" });
    }
  });

  app.post("/api/lc/:lcId/presentations/:presentationId/decision", ensureAdmin, async (req, res) => {
    const parsed = lcDecisionSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input" });
    try {
      const lc = await getLcOrThrow(req.params.lcId);
      const sid = req.session!.userId!;
      const [pres] = await db
        .update(lcPresentations)
        .set({
          decision: parsed.data.decision,
          discrepancies: parsed.data.discrepancies ?? null,
          decisionNotes: parsed.data.notes ?? null,
          reviewedBy: sid,
          reviewedAt: new Date(),
          status:
            parsed.data.decision === "approve"
              ? "Approved"
              : parsed.data.decision === "discrepancy"
                ? "Discrepancies Noted"
                : "Rejected",
        })
        // SECURITY: constrain by both lcId AND presentationId so an admin
        // can never cross-mutate a presentation that belongs to a different
        // LC via a copy-paste mistake in the URL.
        .where(and(
          eq(lcPresentations.id, req.params.presentationId),
          eq(lcPresentations.lcId, lc.id),
        ))
        .returning();
      if (!pres) return void res.status(404).json({ message: "Presentation not found" });
      const newLcStatus =
        parsed.data.decision === "approve"
          ? "Compliant"
          : parsed.data.decision === "discrepancy"
            ? "Discrepant"
            : "Rejected";
      await db
        .update(lettersOfCredit)
        .set({ status: newLcStatus, updatedAt: new Date() })
        .where(eq(lettersOfCredit.id, lc.id));
      await logLcEvent({
        lcId: lc.id,
        eventType: `decision:${parsed.data.decision}`,
        actorUserId: sid,
        actorRole: "admin",
        payload: {
          presentationId: pres.id,
          discrepancies: parsed.data.discrepancies ?? null,
        },
        notes: parsed.data.notes ?? null,
      });
      // Notify counterparties when admin records a Compliant or Discrepant
      // decision. (Rejected is treated as terminal discrepancy for parties.)
      {
        const kind: TradeFinanceEventKind =
          parsed.data.decision === "approve"
            ? "lc_compliant"
            : "lc_discrepant";
        let importerUserId: string | null = lc.applicantUserId;
        let exporterUserId: string | null = lc.beneficiaryUserId;
        let caseIdForLink: string | null = lc.tradeCaseId;
        if (lc.tradeCaseId) {
          const parties = await caseParties(lc.tradeCaseId);
          importerUserId = parties.importerUserId ?? importerUserId;
          exporterUserId = parties.exporterUserId ?? exporterUserId;
          caseIdForLink = parties.resolvedCaseId ?? caseIdForLink;
        }
        void notifyTradeFinanceEvent({
          kind,
          caseId: caseIdForLink,
          importerUserId,
          exporterUserId,
          actorUserId: sid,
          payload: {
            lcRef: lc.lcRef,
            presentationId: pres.id,
            decision: parsed.data.decision,
            discrepancies: parsed.data.discrepancies ?? null,
            lcStatus: newLcStatus,
          },
        });
      }
      // On compliant decision auto-release any pending `lc_issued` milestones.
      let triggerResult: any = null;
      if (parsed.data.decision === "approve" && lc.tradeCaseId) {
        try {
          triggerResult = await triggerMilestones({
            tradeCaseId: lc.tradeCaseId,
            trigger: "lc_issued",
            releasedBy: sid,
            reason: `LC ${lc.lcRef} marked Compliant by admin`,
          });
        } catch (e: any) {
          triggerResult = { released: [], errors: [{ milestoneId: null, message: e?.message }] };
        }
      }
      res.json({ presentation: pres, lcStatus: newLcStatus, triggerResult });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to record decision" });
    }
  });

  app.get("/api/admin/lc/queue", ensureAdmin, async (_req, res) => {
    try {
      const lcs = await db
        .select()
        .from(lettersOfCredit)
        .orderBy(desc(lettersOfCredit.createdAt))
        .limit(200);
      const ids = lcs.map((l) => l.id);
      const pendingPresentations = ids.length
        ? await db
            .select()
            .from(lcPresentations)
            .where(and(inArray(lcPresentations.lcId, ids), eq(lcPresentations.status, "Pending Review")))
        : [];
      res.json({ lcs, pendingPresentations });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load LC queue" });
    }
  });

  // ────────────────────────── DISPUTE TRIBUNAL ──────────────────────────
  app.post("/api/trade/cases/:caseId/dispute", ensureAuth, async (req, res) => {
    const parsed = disputeOpenSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const parties = await caseParties(req.params.caseId);
      if (!parties.case) return void res.status(404).json({ message: "Trade case not found" });
      const sid = req.session!.userId!;
      const isImporter = parties.case.userId === sid;
      const isExporter = parties.exporterUserId === sid;
      if (!isImporter && !isExporter) {
        return void res.status(403).json({ message: "Only parties to the trade may raise a dispute" });
      }
      // Spec: dispute window is 0–30 days AFTER `goods_received` is released.
      const [goodsReceived] = await db
        .select()
        .from(tradeMilestones)
        .where(and(
          eq(tradeMilestones.tradeCaseId, parties.resolvedCaseId!),
          eq(tradeMilestones.trigger, "goods_received"),
          inArray(tradeMilestones.status, ["released", "released_reserved"]),
        ))
        .limit(1);
      if (!goodsReceived?.releasedAt) {
        return void res.status(409).json({
          message: "Disputes can only be raised after the Goods Received milestone is released",
          code: "DISPUTE_WINDOW_NOT_OPEN",
        });
      }
      // Once the reserve has been finalized (window closed + funds disbursed),
      // there is nothing left to dispute against.
      if (Number(parties.case?.disputeReserveCents || 0) <= 0) {
        return void res.status(409).json({
          message: "Dispute reserve has already been released; no escrow available to dispute",
          code: "DISPUTE_RESERVE_EMPTY",
        });
      }
      const elapsedDays = (Date.now() - new Date(goodsReceived.releasedAt).getTime()) / 86400000;
      if (elapsedDays > 30) {
        return void res.status(409).json({
          message: "Dispute window closed (30 days after goods received)",
          code: "DISPUTE_WINDOW_CLOSED",
        });
      }
      // tribunal disputes are scoped to the case; tradeRequestId is now optional.
      const ref = `DSP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      // Counter-evidence deadline: 7 days from open.
      const counterEvidenceDeadline = new Date(Date.now() + 7 * 86400000);
      const [d] = await db
        .insert(tradeDisputes)
        .values({
          disputeRefId: ref,
          tradeCaseId: parties.resolvedCaseId!,
          tradeRequestId: null as any,
          raisedByUserId: sid,
          raisedByRole: isImporter ? "importer" : "exporter",
          disputeType: parsed.data.disputeType,
          subject: parsed.data.subject,
          description: parsed.data.description,
          evidenceUrls: parsed.data.evidenceUrls ?? null,
          requestedResolution: parsed.data.requestedResolution ?? null,
          currency: parsed.data.currency ?? parties.currency,
          appealDeadline: counterEvidenceDeadline,
          status: "Open",
        })
        .returning();
      void notifyTradeFinanceEvent({
        kind: "dispute_opened",
        caseId: parties.resolvedCaseId,
        importerUserId: parties.importerUserId,
        exporterUserId: parties.exporterUserId,
        payload: {
          disputeRefId: d.disputeRefId,
          raisedByRole: d.raisedByRole,
          disputeType: d.disputeType,
          subject: d.subject,
          counterEvidenceDeadline,
        },
      });
      res.status(201).json({ dispute: d });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to open dispute" });
    }
  });

  app.post("/api/dispute/:disputeId/evidence", ensureAuth, async (req, res) => {
    const parsed = z.object({
      evidence: z.array(z.object({
        fileUrl: z.string().min(1),
        fileName: z.string().optional(),
        description: z.string().optional(),
      })).min(1),
    }).safeParse(req.body);
    if (!parsed.success) {
      // Backwards-compat: accept the legacy `{ evidenceUrls: string[] }` shape.
      const legacy = disputeEvidenceSchema.safeParse(req.body);
      if (!legacy.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      (req.body as any) = { evidence: legacy.data.evidenceUrls.map((u: string) => ({ fileUrl: u })) };
    }
    const evidence = ((req.body as any).evidence ?? parsed.data?.evidence ?? []) as Array<{ fileUrl: string; fileName?: string; description?: string }>;
    try {
      const [d] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.disputeId)).limit(1);
      if (!d) return void res.status(404).json({ message: "Dispute not found" });
      const sid = req.session!.userId!;
      // Authorise: importer/exporter on the case, raiser, or admin.
      let role: "importer" | "exporter" | "admin" | null = null;
      if (d.raisedByUserId === sid) role = (d.raisedByRole as any) || null;
      if (!role && d.tradeCaseId) {
        const parties = await caseParties(d.tradeCaseId);
        if (parties.importerUserId === sid) role = "importer";
        else if (parties.exporterUserId === sid) role = "exporter";
      }
      if (!role) {
        const u = await storage.getUser(sid);
        if (u?.role !== "admin") return void res.status(403).json({ message: "Not a party to this dispute" });
        role = "admin";
      }
      // 7-day counter-evidence window (appealDeadline set at open).
      if (d.appealDeadline && new Date(d.appealDeadline).getTime() < Date.now() && role !== "admin") {
        return void res.status(409).json({
          message: "Counter-evidence window has closed",
          code: "EVIDENCE_WINDOW_CLOSED",
        });
      }
      // Insert structured evidence rows.
      const inserted = await db
        .insert(tradeDisputeEvidence)
        .values(evidence.map((e) => ({
          disputeId: d.id,
          uploadedByUserId: sid,
          uploadedByRole: role!,
          fileUrl: e.fileUrl,
          fileName: e.fileName ?? null,
          description: e.description ?? null,
        })))
        .returning();
      // Maintain the legacy `evidenceUrls` array for back-compat readers.
      const merged = [...(d.evidenceUrls || []), ...evidence.map((e) => e.fileUrl)];
      const [updated] = await db
        .update(tradeDisputes)
        .set({ evidenceUrls: merged, status: "Under Review", updatedAt: new Date() })
        .where(eq(tradeDisputes.id, d.id))
        .returning();
      res.json({ dispute: updated, evidence: inserted });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to add evidence" });
    }
  });

  // List structured evidence for a dispute (parties + admin).
  app.get("/api/dispute/:disputeId/evidence", ensureAuth, async (req, res) => {
    try {
      const [d] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.disputeId)).limit(1);
      if (!d) return void res.status(404).json({ message: "Dispute not found" });
      const sid = req.session!.userId!;
      let isParty = d.raisedByUserId === sid;
      if (!isParty && d.tradeCaseId) {
        const parties = await caseParties(d.tradeCaseId);
        if (parties.importerUserId === sid || parties.exporterUserId === sid) isParty = true;
      }
      if (!isParty) {
        const u = await storage.getUser(sid);
        if (u?.role !== "admin") return void res.status(403).json({ message: "Not a party to this dispute" });
      }
      const rows = await db
        .select()
        .from(tradeDisputeEvidence)
        .where(eq(tradeDisputeEvidence.disputeId, d.id))
        .orderBy(desc(tradeDisputeEvidence.createdAt));
      res.json({ evidence: rows });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load evidence" });
    }
  });

  // Spec contract: tribunal decision is one of `release_to_seller`,
  // `refund_to_buyer`, or `split` with `splitBps` (basis points to the
  // exporter, 0..10000). Allocations are derived from the case's settlement
  // amount, then executed against the case escrow hold.
  app.post("/api/dispute/:disputeId/decision", ensureAdmin, async (req, res) => {
    const parsed = z.object({
      decision: z.enum(["release_to_seller", "refund_to_buyer", "split"]),
      splitBps: z.number().int().min(0).max(10_000).optional(),
      decisionNotes: z.string().optional(),
      panelMemberIds: z.array(z.string()).optional(),
    }).safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    if (parsed.data.decision === "split" && parsed.data.splitBps === undefined) {
      return void res.status(400).json({ message: "splitBps is required for `split` decisions" });
    }
    try {
      const [d] = await db.select().from(tradeDisputes).where(eq(tradeDisputes.id, req.params.disputeId)).limit(1);
      if (!d) return void res.status(404).json({ message: "Dispute not found" });
      if (!d.tradeCaseId) {
        return void res.status(400).json({ message: "Dispute is not scoped to a trade case" });
      }
      const parties = await caseParties(d.tradeCaseId);
      if (!parties.case || !parties.importerUserId || !parties.exporterUserId) {
        return void res.status(400).json({ message: "Cannot resolve dispute without both parties" });
      }
      const currency = d.currency || parties.currency;
      // ROUND-4 FIX: disburse the actually-held dispute reserve, not the full
      // settlement amount. Earlier milestones (LC issuance, docs, customs)
      // have already been paid; only the goods_received tranche remains
      // locked. Re-fetch the case for a fresh disputeReserveCents value.
      const [caseRow] = await db
        .select()
        .from(tradeCases)
        .where(eq(tradeCases.id, d.tradeCaseId))
        .limit(1);
      const total = Number(caseRow?.disputeReserveCents || 0);
      if (total <= 0) {
        return void res.status(409).json({
          message: "No escrow reserve to disburse; reserve already released",
          code: "DISPUTE_RESERVE_EMPTY",
        });
      }
      let exporterAllocationCents = 0;
      let importerAllocationCents = 0;
      switch (parsed.data.decision) {
        case "release_to_seller":
          exporterAllocationCents = total;
          break;
        case "refund_to_buyer":
          importerAllocationCents = total;
          break;
        case "split":
          exporterAllocationCents = Math.floor((total * parsed.data.splitBps!) / 10_000);
          importerAllocationCents = total - exporterAllocationCents;
          break;
      }
      const sid = req.session!.userId!;
      // Refund importer's share (release locked → available).
      if (importerAllocationCents > 0) {
        await releaseBalanceHold({
          userId: parties.importerUserId,
          currency,
          amountCents: importerAllocationCents,
          referenceType: "dispute_refund",
          referenceId: d.id,
          idempotencyKey: `dispute-refund:${d.id}`,
        });
      }
      // Pay exporter's share (move locked → exporter available).
      if (exporterAllocationCents > 0) {
        await payoutEscrow({
          importerUserId: parties.importerUserId,
          exporterUserId: parties.exporterUserId,
          currency,
          amountCents: exporterAllocationCents,
          referenceType: "dispute_payout",
          referenceId: d.id,
          idempotencyKey: `dispute-payout:${d.id}`,
          description: `Tribunal payout to exporter on dispute ${d.disputeRefId}`,
        });
      }
      const [updated] = await db
        .update(tradeDisputes)
        .set({
          decision: parsed.data.decision,
          splitBps: parsed.data.splitBps ?? null,
          decisionNotes: parsed.data.decisionNotes ?? null,
          resolution: parsed.data.decisionNotes ?? `Tribunal decision: ${parsed.data.decision}`,
          importerAllocationCents,
          exporterAllocationCents,
          panelMemberIds: parsed.data.panelMemberIds ?? null,
          resolvedBy: sid,
          resolvedAt: new Date(),
          finalizedAt: new Date(),
          status: "Resolved",
          updatedAt: new Date(),
        })
        .where(eq(tradeDisputes.id, d.id))
        .returning();
      // Mark case Settled (closest terminal status in the enum) per spec's
      // "Resolved" outcome — disbursement is complete, reserve drained.
      await db
        .update(tradeCases)
        .set({
          status: "Settled",
          disputeReserveCents: 0,
          escrowReleasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tradeCases.id, d.tradeCaseId));
      void notifyTradeFinanceEvent({
        kind: "dispute_resolved",
        caseId: d.tradeCaseId,
        importerUserId: parties.importerUserId,
        exporterUserId: parties.exporterUserId,
        payload: {
          disputeRefId: d.disputeRefId,
          decision: parsed.data.decision,
          importerAllocationCents,
          exporterAllocationCents,
          currency,
        },
      });
      res.json({
        dispute: updated,
        disbursement: { importerAllocationCents, exporterAllocationCents, currency },
      });
    } catch (err: any) {
      res.status(err?.status || 500).json({ message: err?.message || "Failed to record decision" });
    }
  });

  app.get("/api/admin/disputes/queue", ensureAdmin, async (req, res) => {
    try {
      const status = (req.query.status as string) || "open";
      let where;
      if (status === "all") {
        where = undefined;
      } else if (status === "open") {
        where = inArray(tradeDisputes.status, ["Open", "Under Review", "Pending Resolution"] as any);
      } else {
        where = eq(tradeDisputes.status, status as any);
      }
      const rows = where
        ? await db.select().from(tradeDisputes).where(where).orderBy(desc(tradeDisputes.createdAt)).limit(200)
        : await db.select().from(tradeDisputes).orderBy(desc(tradeDisputes.createdAt)).limit(200);
      res.json({ disputes: rows });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to load disputes" });
    }
  });
}
