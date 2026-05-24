/**
 * Trade Finance service (Task #146).
 *
 * Covers:
 *  - Multi-currency wallet balances (USD/EUR/GBP) — atomic place/release helpers.
 *  - FX rate snapshots + conversion helpers.
 *  - Trade case settlement currency + milestone schedule materialisation.
 *  - Milestone-based escrow release with idempotent payouts.
 *  - Letter of Credit lifecycle event logger.
 *
 * All amounts are integer cents (bigint in SQL).
 */
import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  walletBalances,
  walletBalanceTransactions,
  currencyRates,
  tradeCases,
  tradeMilestones,
  lettersOfCredit,
  lcEvents,
  dealRooms,
  tradeProposals,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  type WalletBalance,
  type WalletBalanceTransaction,
  type TradeMilestone,
  type LetterOfCredit,
  type TradeCase,
} from "@shared/schema";

export type WalletTxType =
  | "deposit"
  | "withdrawal"
  | "hold_placed"
  | "hold_released"
  | "escrow_funded"
  | "escrow_released"
  | "fx_conversion"
  | "fee";

export function isSupportedCurrency(c: string): c is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
}

/** Ensure a per-currency balance row exists for the user. */
export async function getOrCreateBalance(
  userId: string,
  currency: string,
): Promise<WalletBalance> {
  if (!isSupportedCurrency(currency)) {
    const e: any = new Error(`Unsupported currency: ${currency}`);
    e.status = 400;
    throw e;
  }
  const [existing] = await db
    .select()
    .from(walletBalances)
    .where(and(eq(walletBalances.userId, userId), eq(walletBalances.currency, currency)))
    .limit(1);
  if (existing) return existing;
  try {
    const [created] = await db
      .insert(walletBalances)
      .values({ userId, currency, availableCents: 0, lockedCents: 0 })
      .returning();
    return created;
  } catch {
    const [again] = await db
      .select()
      .from(walletBalances)
      .where(and(eq(walletBalances.userId, userId), eq(walletBalances.currency, currency)))
      .limit(1);
    if (!again) throw new Error("Failed to create wallet balance");
    return again;
  }
}

/** Load balances for all supported currencies for a user (creates missing rows). */
export async function listUserBalances(userId: string): Promise<WalletBalance[]> {
  const out: WalletBalance[] = [];
  for (const c of SUPPORTED_CURRENCIES) {
    out.push(await getOrCreateBalance(userId, c));
  }
  return out;
}

interface WriteBalanceTxOpts {
  userId: string;
  balanceId: string;
  currency: string;
  type: WalletTxType;
  amountCents: number;
  lockedDelta?: number;
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

async function writeBalanceTx(
  tx: any,
  opts: WriteBalanceTxOpts,
): Promise<WalletBalanceTransaction> {
  const row = await tx.execute(
    sql`SELECT * FROM wallet_balances WHERE id = ${opts.balanceId} FOR UPDATE`,
  );
  const w = row.rows[0] as any;
  if (!w) throw Object.assign(new Error("Balance not found"), { status: 404 });
  const newAvailable = Number(w.available_cents) + opts.amountCents;
  const newLocked = Number(w.locked_cents) + (opts.lockedDelta || 0);
  if (newAvailable < 0) {
    const e: any = new Error("Insufficient available balance");
    e.code = "INSUFFICIENT_FUNDS";
    e.status = 402;
    throw e;
  }
  if (newLocked < 0) throw new Error("Locked balance underflow");
  await tx
    .update(walletBalances)
    .set({ availableCents: newAvailable, lockedCents: newLocked, updatedAt: new Date() })
    .where(eq(walletBalances.id, opts.balanceId));
  try {
    const [inserted] = await tx
      .insert(walletBalanceTransactions)
      .values({
        balanceId: opts.balanceId,
        userId: opts.userId,
        currency: opts.currency,
        type: opts.type,
        amountCents: opts.amountCents,
        balanceAfterCents: newAvailable,
        lockedAfterCents: newLocked,
        referenceType: opts.referenceType || null,
        referenceId: opts.referenceId || null,
        idempotencyKey: opts.idempotencyKey || null,
        description: opts.description || null,
        metadata: opts.metadata || null,
      })
      .returning();
    return inserted;
  } catch (err: any) {
    if (err?.code === "23505" && opts.idempotencyKey) {
      const [prev] = await tx
        .select()
        .from(walletBalanceTransactions)
        .where(eq(walletBalanceTransactions.idempotencyKey, opts.idempotencyKey))
        .limit(1);
      if (prev) {
        const replay: any = new Error("Idempotent replay");
        replay.code = "IDEMPOTENT_REPLAY";
        replay.existing = prev;
        throw replay;
      }
    }
    throw err;
  }
}

export async function creditBalance(input: {
  userId: string;
  currency: string;
  amountCents: number;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, any>;
  referenceType?: string;
  referenceId?: string;
}): Promise<{ transaction: WalletBalanceTransaction; balance: WalletBalance }> {
  if (input.amountCents <= 0) throw new Error("Amount must be positive");
  const balance = await getOrCreateBalance(input.userId, input.currency);
  const tx = await db
    .transaction(async (t) =>
      writeBalanceTx(t, {
        userId: input.userId,
        balanceId: balance.id,
        currency: input.currency,
        type: "deposit",
        amountCents: input.amountCents,
        referenceType: input.referenceType || "deposit",
        referenceId: input.referenceId || null,
        idempotencyKey: input.idempotencyKey,
        description: input.description || null,
        metadata: input.metadata || null,
      }),
    )
    .catch(async (err: any) => {
      if (err?.code === "IDEMPOTENT_REPLAY") return err.existing as WalletBalanceTransaction;
      throw err;
    });
  const [refreshed] = await db.select().from(walletBalances).where(eq(walletBalances.id, balance.id)).limit(1);
  return { transaction: tx, balance: refreshed };
}

export async function placeBalanceHold(input: {
  userId: string;
  currency: string;
  amountCents: number;
  referenceType: string;
  referenceId?: string;
  idempotencyKey?: string;
}): Promise<WalletBalanceTransaction> {
  if (input.amountCents <= 0) throw new Error("Amount must be positive");
  const balance = await getOrCreateBalance(input.userId, input.currency);
  return db
    .transaction((t) =>
      writeBalanceTx(t, {
        userId: input.userId,
        balanceId: balance.id,
        currency: input.currency,
        type: "hold_placed",
        amountCents: -input.amountCents,
        lockedDelta: +input.amountCents,
        referenceType: input.referenceType,
        referenceId: input.referenceId || null,
        idempotencyKey: input.idempotencyKey || `hold:${input.referenceType}:${input.referenceId || ""}`,
        description: `Hold for ${input.referenceType}`,
      }),
    )
    .catch((err: any) => {
      // ROUND-5 FIX: treat idempotent replays as success so dispute / escrow
      // orchestrators can be retried safely without leaving partial state.
      if (err?.code === "IDEMPOTENT_REPLAY") return err.existing as WalletBalanceTransaction;
      throw err;
    });
}

export async function releaseBalanceHold(input: {
  userId: string;
  currency: string;
  amountCents: number;
  referenceType: string;
  referenceId?: string;
  idempotencyKey?: string;
}): Promise<WalletBalanceTransaction> {
  const balance = await getOrCreateBalance(input.userId, input.currency);
  return db
    .transaction((t) =>
      writeBalanceTx(t, {
        userId: input.userId,
        balanceId: balance.id,
        currency: input.currency,
        type: "hold_released",
        amountCents: +input.amountCents,
        lockedDelta: -input.amountCents,
        referenceType: input.referenceType,
        referenceId: input.referenceId || null,
        idempotencyKey: input.idempotencyKey || `release:${input.referenceType}:${input.referenceId || ""}`,
        description: `Hold released for ${input.referenceType}`,
      }),
    )
    .catch((err: any) => {
      if (err?.code === "IDEMPOTENT_REPLAY") return err.existing as WalletBalanceTransaction;
      throw err;
    });
}

/** Move funds from importer's locked balance into exporter's available balance. */
export async function payoutEscrow(input: {
  importerUserId: string;
  exporterUserId: string;
  currency: string;
  amountCents: number;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  description?: string;
}): Promise<{ debit: WalletBalanceTransaction; credit: WalletBalanceTransaction }> {
  if (input.amountCents <= 0) throw new Error("Amount must be positive");
  const importerBal = await getOrCreateBalance(input.importerUserId, input.currency);
  const exporterBal = await getOrCreateBalance(input.exporterUserId, input.currency);
  const debitKey = `${input.idempotencyKey}:debit`;
  const creditKey = `${input.idempotencyKey}:credit`;
  try {
    return await db.transaction(async (t) => {
      const debit = await writeBalanceTx(t, {
        userId: input.importerUserId,
        balanceId: importerBal.id,
        currency: input.currency,
        type: "escrow_released",
        amountCents: 0, // available unchanged — funds were locked
        lockedDelta: -input.amountCents,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: debitKey,
        description: input.description || `Escrow released for ${input.referenceType}`,
      });
      const credit = await writeBalanceTx(t, {
        userId: input.exporterUserId,
        balanceId: exporterBal.id,
        currency: input.currency,
        type: "escrow_released",
        amountCents: +input.amountCents,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: creditKey,
        description: input.description || `Escrow received for ${input.referenceType}`,
      });
      return { debit, credit };
    });
  } catch (err: any) {
    // ROUND-5 FIX: idempotent replay → both legs were already committed in
    // an earlier successful run. Re-fetch and return them so callers
    // (dispute decision, milestone release) can safely retry.
    if (err?.code === "IDEMPOTENT_REPLAY") {
      const [debit] = await db
        .select()
        .from(walletBalanceTransactions)
        .where(eq(walletBalanceTransactions.idempotencyKey, debitKey))
        .limit(1);
      const [credit] = await db
        .select()
        .from(walletBalanceTransactions)
        .where(eq(walletBalanceTransactions.idempotencyKey, creditKey))
        .limit(1);
      if (debit && credit) return { debit, credit };
    }
    throw err;
  }
}

// ─────────────────────────── FX RATES ───────────────────────────

export async function getLatestRate(base: string, quote: string): Promise<number> {
  if (base === quote) return 1;
  const [row] = await db
    .select()
    .from(currencyRates)
    .where(and(eq(currencyRates.baseCurrency, base), eq(currencyRates.quoteCurrency, quote)))
    .orderBy(desc(currencyRates.effectiveDate))
    .limit(1);
  if (!row) {
    const e: any = new Error(`No FX rate for ${base}->${quote}`);
    e.status = 422;
    throw e;
  }
  return Number(row.rate);
}

export async function convertCents(
  amountCents: number,
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return amountCents;
  const rate = await getLatestRate(from, to);
  return Math.round(amountCents * rate);
}

export async function upsertRate(input: {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source?: string;
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO currency_rates (base_currency, quote_currency, rate, source, effective_date)
    VALUES (${input.baseCurrency}, ${input.quoteCurrency}, ${input.rate}, ${input.source || 'manual'}, CURRENT_DATE)
    ON CONFLICT (base_currency, quote_currency, effective_date)
    DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source
  `);
}

// ─────────────────────── TRADE MILESTONES ───────────────────────

export interface MilestoneSpec {
  sequence: number;
  label: string;
  trigger: string; // 'lc_issued' | 'shipment_dispatched' | 'goods_received' | 'manual'
  percent: number; // 0..100
}

/**
 * Canonical milestone triggers (task #146 spec). Event sources:
 *   * `shipment_documents_uploaded` — BL/shipping doc upload in the Deal Room.
 *   * `customs_cleared`             — admin marks customs cleared.
 *   * `goods_received`              — importer confirms delivery.
 *   * `manual_admin_release`        — admin force-release.
 *   * `lc_issued`                   — LC marked Compliant by admin.
 */
export const SUPPORTED_TRIGGERS = [
  "lc_issued",
  "shipment_documents_uploaded",
  "customs_cleared",
  "goods_received",
  "manual_admin_release",
] as const;
export type MilestoneTrigger = typeof SUPPORTED_TRIGGERS[number];

export const DEFAULT_MILESTONE_SCHEDULE: MilestoneSpec[] = [
  { sequence: 1, label: "Shipment Documents Uploaded", trigger: "shipment_documents_uploaded", percent: 30 },
  { sequence: 2, label: "Customs Cleared", trigger: "customs_cleared", percent: 30 },
  { sequence: 3, label: "Goods Received", trigger: "goods_received", percent: 40 },
];

/**
 * Look up the milestone schedule preset for a commodity (Task #172).
 * Resolution order:
 *   1. Active preset matching the commodity name → category lookup.
 *   2. Active preset with commodity_category = <category>.
 *   3. The active is_default preset (commodity_category IS NULL).
 *   4. Hardcoded `DEFAULT_MILESTONE_SCHEDULE` fallback.
 */
export async function getDefaultScheduleForCommodity(
  commodity: string | null | undefined,
): Promise<MilestoneSpec[]> {
  try {
    // Try to resolve the commodity name to a category via the commodities table.
    let category: string | null = null;
    if (commodity && commodity !== "Unspecified") {
      const r = await db.execute(
        sql`SELECT category FROM commodities WHERE LOWER(name) = LOWER(${commodity}) LIMIT 1`,
      );
      const row = r.rows[0] as any;
      if (row?.category) category = String(row.category);
    }
    // Try a commodity-specific preset first (matches the raw commodity
    // string admins enter, e.g. "Cocoa", "Crude Oil"), then fall back to
    // the resolved category. Both are case-insensitive so free-text
    // entries in the admin UI behave predictably.
    const candidates = [commodity, category].filter((s): s is string => !!s);
    for (const cand of candidates) {
      const r = await db.execute(
        sql`SELECT schedule FROM milestone_presets
            WHERE status='active' AND LOWER(commodity_category) = LOWER(${cand})
            ORDER BY is_default DESC, updated_at DESC LIMIT 1`,
      );
      const row = r.rows[0] as any;
      if (row?.schedule) return row.schedule as MilestoneSpec[];
    }
    // Fall back to the wildcard default preset.
    const fallback = await db.execute(
      sql`SELECT schedule FROM milestone_presets WHERE status='active' AND commodity_category IS NULL AND is_default = true ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = fallback.rows[0] as any;
    if (row?.schedule) return row.schedule as MilestoneSpec[];
  } catch {
    /* swallow – use hardcoded fallback */
  }
  return DEFAULT_MILESTONE_SCHEDULE;
}

/**
 * Materialise a milestone schedule for a case. Returns the inserted rows.
 * Skips if milestones already exist for the case.
 */
export async function materialiseMilestones(input: {
  tradeCaseId: string;
  schedule: MilestoneSpec[];
  amountCents: number;
  currency: string;
}): Promise<TradeMilestone[]> {
  const total = input.schedule.reduce((s, m) => s + m.percent, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Milestone percentages must sum to 100 (got ${total})`);
  }
  const existing = await db
    .select()
    .from(tradeMilestones)
    .where(eq(tradeMilestones.tradeCaseId, input.tradeCaseId));
  if (existing.length > 0) return existing;

  const rows = input.schedule.map((m) => ({
    tradeCaseId: input.tradeCaseId,
    sequence: m.sequence,
    label: m.label,
    trigger: m.trigger,
    percent: m.percent.toFixed(2),
    amountCents: Math.round((input.amountCents * m.percent) / 100),
    currency: input.currency,
    status: "pending",
  }));
  const inserted = await db.insert(tradeMilestones).values(rows).returning();
  return inserted;
}

/** Release a milestone — atomically marks it released and pays out from escrow. */
export async function releaseMilestone(input: {
  tradeCaseId: string;
  milestoneId: string;
  releasedBy: string;
  reason: string;
  evidenceDocumentIds?: string[];
}): Promise<{ milestone: TradeMilestone; payout: { debit: any; credit: any } }> {
  const [tc] = await db.select().from(tradeCases).where(eq(tradeCases.id, input.tradeCaseId)).limit(1);
  if (!tc) throw Object.assign(new Error("Trade case not found"), { status: 404 });
  const [m] = await db.select().from(tradeMilestones).where(eq(tradeMilestones.id, input.milestoneId)).limit(1);
  if (!m) throw Object.assign(new Error("Milestone not found"), { status: 404 });
  if (m.tradeCaseId !== input.tradeCaseId) {
    throw Object.assign(new Error("Milestone does not belong to case"), { status: 400 });
  }
  if (m.status === "released") {
    throw Object.assign(new Error("Milestone already released"), { status: 409 });
  }

  // Resolve counterparties — for now we use tradeCases.userId as the importer
  // and look for a paired exporter from the case metadata. In the absence of
  // an explicit exporter on the case, callers may pass through a dealRoom that
  // owns the importer/exporter mapping. We rely on `tc.userId` as the importer
  // (payer) and require the route handler to supply the exporter id via the
  // case's settlement contract — here we read from notes JSON if present.
  const importerUserId = tc.userId;
  // Convention: exporter user id stored in tradeCases.notes JSON `{ exporterUserId }`
  // or derived from the paired deal room. Routes that release milestones must
  // ensure the case has a counterparty resolved.
  let exporterUserId: string | null = null;
  try {
    const meta = tc.notes ? JSON.parse(tc.notes) : null;
    if (meta && typeof meta.exporterUserId === "string") exporterUserId = meta.exporterUserId;
  } catch { /* notes is plain text */ }
  if (!exporterUserId) {
    throw Object.assign(
      new Error("No exporter resolved for case; set exporterUserId via the deal room before releasing milestones"),
      { status: 400 },
    );
  }

  // ROUND-4 FIX: `goods_received` does NOT immediately payout. Instead the
  // funds remain locked in escrow as a "dispute reserve" for the 30-day
  // dispute window. They are paid to the exporter only when:
  //   * the window closes and `POST /api/trade/cases/:id/finalize` runs, OR
  //   * a tribunal decision spends the reserve per its split.
  // Other triggers (lc_issued, shipment_documents_uploaded, customs_cleared,
  // manual_admin_release) payout immediately as before.
  const isGoodsReceived = m.trigger === "goods_received";
  let payout: { debit: any; credit: any } | null = null;
  if (!isGoodsReceived) {
    payout = await payoutEscrow({
      importerUserId,
      exporterUserId,
      currency: m.currency,
      amountCents: Number(m.amountCents),
      referenceType: "milestone",
      referenceId: m.id,
      idempotencyKey: `milestone:${m.id}`,
      description: `Milestone #${m.sequence} (${m.label}) for case ${tc.caseNumber}`,
    });
  } else {
    // Increment the case's dispute reserve so the tribunal / finalize flow
    // knows how much is held back. Funds stay locked on the importer balance.
    await db
      .update(tradeCases)
      .set({
        disputeReserveCents: sql`${tradeCases.disputeReserveCents} + ${Number(m.amountCents)}`,
        updatedAt: new Date(),
      })
      .where(eq(tradeCases.id, input.tradeCaseId));
  }

  const [updated] = await db
    .update(tradeMilestones)
    .set({
      status: isGoodsReceived ? "released_reserved" : "released",
      releasedAmountCents: Number(m.amountCents),
      releasedAt: new Date(),
      releasedBy: input.releasedBy,
      releaseReason: input.reason,
      evidenceDocumentIds: input.evidenceDocumentIds || null,
      updatedAt: new Date(),
    })
    .where(eq(tradeMilestones.id, m.id))
    .returning();

  // If all milestones are out of `pending` AND nothing is held in reserve,
  // mark the case Settled. With a goods_received milestone, the reserve will
  // hold the case open until `finalizeGoodsReceivedReserve` runs.
  const remaining = await db
    .select({ id: tradeMilestones.id })
    .from(tradeMilestones)
    .where(and(eq(tradeMilestones.tradeCaseId, input.tradeCaseId), eq(tradeMilestones.status, "pending")));
  if (remaining.length === 0 && !isGoodsReceived) {
    await db
      .update(tradeCases)
      .set({ status: "Settled", escrowReleasedAt: new Date(), updatedAt: new Date() })
      .where(eq(tradeCases.id, input.tradeCaseId));
  }

  return { milestone: updated, payout: payout ?? { debit: null, credit: null } };
}

/**
 * Finalize the post-`goods_received` dispute reserve: pay it out to the
 * exporter and mark the case Settled. Caller must enforce that either the
 * 30-day dispute window has elapsed or the call is an admin override.
 *
 * Idempotent on `case:<caseId>:reserve-finalize`.
 */
export async function finalizeGoodsReceivedReserve(input: {
  tradeCaseId: string;
  actorUserId: string;
}): Promise<{ amountCents: number; currency: string }> {
  const [tc] = await db.select().from(tradeCases).where(eq(tradeCases.id, input.tradeCaseId)).limit(1);
  if (!tc) throw Object.assign(new Error("Trade case not found"), { status: 404 });
  const reserve = Number(tc.disputeReserveCents || 0);
  const currency = tc.settlementCurrency || "USD";
  if (reserve <= 0) {
    return { amountCents: 0, currency };
  }
  let exporterUserId: string | null = null;
  try {
    const meta = tc.notes ? JSON.parse(tc.notes) : null;
    if (meta?.exporterUserId) exporterUserId = String(meta.exporterUserId);
  } catch { /* notes plain text */ }
  if (!exporterUserId) {
    throw Object.assign(new Error("No exporter resolved for case"), { status: 400 });
  }
  await payoutEscrow({
    importerUserId: tc.userId,
    exporterUserId,
    currency,
    amountCents: reserve,
    referenceType: "dispute_reserve_finalize",
    referenceId: tc.id,
    idempotencyKey: `case:${tc.id}:reserve-finalize`,
    description: `Goods received reserve released to exporter for case ${tc.caseNumber}`,
  });
  await db
    .update(tradeCases)
    .set({
      disputeReserveCents: 0,
      status: "Settled",
      escrowReleasedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tradeCases.id, tc.id));
  return { amountCents: reserve, currency };
}

// ─────────────────────────── LC LIFECYCLE ───────────────────────────

export async function logLcEvent(input: {
  lcId: string;
  eventType: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  payload?: Record<string, any> | null;
  notes?: string | null;
}): Promise<void> {
  await db.insert(lcEvents).values({
    lcId: input.lcId,
    eventType: input.eventType,
    actorUserId: input.actorUserId || null,
    actorRole: input.actorRole || null,
    payload: input.payload || null,
    notes: input.notes || null,
  });
}

export function generateLcRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LC-${ts}-${rnd}`;
}

export async function getLcOrThrow(lcId: string): Promise<LetterOfCredit> {
  const [lc] = await db.select().from(lettersOfCredit).where(eq(lettersOfCredit.id, lcId)).limit(1);
  if (!lc) throw Object.assign(new Error("LC not found"), { status: 404 });
  return lc;
}

// ─────────────────────── CASE KEY RESOLUTION ───────────────────────

/**
 * Resolve a "case key" — which may be either a `trade_cases.id` or a
 * `deal_rooms.id` — to a concrete tradeCase row. If the key matches a deal
 * room that doesn't yet have a trade case attached, one is created
 * idempotently and the exporter/dealRoom mapping is stored on `notes` JSON.
 *
 * Returns `null` when neither lookup matches.
 */
export async function resolveCaseKey(
  key: string,
): Promise<{ case: TradeCase; dealRoomId: string | null; exporterUserId: string | null }> {
  // 1) Direct trade_cases.id match
  const [direct] = await db.select().from(tradeCases).where(eq(tradeCases.id, key)).limit(1);
  if (direct) {
    let exporterUserId: string | null = null;
    let dealRoomId: string | null = null;
    try {
      const meta = direct.notes ? JSON.parse(direct.notes) : null;
      if (meta?.exporterUserId) exporterUserId = String(meta.exporterUserId);
      if (meta?.dealRoomId) dealRoomId = String(meta.dealRoomId);
    } catch { /* notes plain text */ }
    return { case: direct, dealRoomId, exporterUserId };
  }
  // 2) deal_rooms.id match → find or create a trade case for the deal
  const [dr] = await db.select().from(dealRooms).where(eq(dealRooms.id, key)).limit(1);
  if (!dr) {
    throw Object.assign(new Error("Trade case not found"), { status: 404 });
  }
  // Look for any tradeCase whose notes carry this dealRoomId
  const candidates = await db
    .select()
    .from(tradeCases)
    .where(eq(tradeCases.userId, dr.importerUserId));
  for (const c of candidates) {
    try {
      const meta = c.notes ? JSON.parse(c.notes) : null;
      if (meta?.dealRoomId === dr.id) {
        return { case: c, dealRoomId: dr.id, exporterUserId: dr.exporterUserId };
      }
    } catch { /* ignore */ }
  }
  // ROUND-5 FIX: derive settlement amount from the accepted proposal so
  // escrow funding doesn't dead-end on `0`. Falls back to 0 only when the
  // proposal is missing or unparseable; the fund-escrow endpoint will then
  // require an explicit amount in the request body.
  let derivedValueUsd = "0";
  let derivedAmountCents: number | null = null;
  try {
    const [proposal] = await db
      .select({ quotePrice: tradeProposals.quotePrice })
      .from(tradeProposals)
      .where(eq(tradeProposals.id, dr.acceptedProposalId))
      .limit(1);
    if (proposal?.quotePrice) {
      const n = Number(proposal.quotePrice);
      if (Number.isFinite(n) && n > 0) {
        derivedValueUsd = n.toFixed(2);
        derivedAmountCents = Math.round(n * 100);
      }
    }
  } catch { /* fall through with zero — fund-escrow will require explicit amount */ }

  const caseNumber = `DR-${dr.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const notes = JSON.stringify({ dealRoomId: dr.id, exporterUserId: dr.exporterUserId });
  const [created] = await db
    .insert(tradeCases)
    .values({
      caseNumber,
      userId: dr.importerUserId,
      companyName: "Deal Room",
      tradeType: "Import",
      commodityType: "Unspecified",
      tradeValueUsd: derivedValueUsd,
      settlementAmountCents: derivedAmountCents,
      status: "Draft",
      settlementCurrency: "USD",
      notes,
    } as any)
    .returning();
  return { case: created, dealRoomId: dr.id, exporterUserId: dr.exporterUserId };
}

/** Update tradeCases.notes JSON merging in additional fields. */
export async function mergeCaseNotes(caseId: string, patch: Record<string, any>): Promise<void> {
  const [c] = await db.select().from(tradeCases).where(eq(tradeCases.id, caseId)).limit(1);
  if (!c) return;
  let meta: any = {};
  try { meta = c.notes ? JSON.parse(c.notes) : {}; } catch { meta = {}; }
  const next = { ...meta, ...patch };
  await db.update(tradeCases).set({ notes: JSON.stringify(next), updatedAt: new Date() }).where(eq(tradeCases.id, caseId));
}

// ─────────────────────── TRIGGER-BASED RELEASES ───────────────────────

/**
 * Release every pending milestone on a case whose `trigger` matches.
 * Used by event sources (LC compliant decision, shipment_dispatched event,
 * goods_received confirmation, etc.). Errors on individual milestone payouts
 * are swallowed and returned in `errors` so a partial trigger never blocks
 * the originating event.
 */
export async function triggerMilestones(input: {
  tradeCaseId: string;
  trigger: string;
  releasedBy: string;
  reason: string;
}): Promise<{ released: TradeMilestone[]; errors: Array<{ milestoneId: string; message: string }> }> {
  const pending = await db
    .select()
    .from(tradeMilestones)
    .where(and(
      eq(tradeMilestones.tradeCaseId, input.tradeCaseId),
      eq(tradeMilestones.trigger, input.trigger),
      eq(tradeMilestones.status, "pending"),
    ));
  const released: TradeMilestone[] = [];
  const errors: Array<{ milestoneId: string; message: string }> = [];
  for (const m of pending) {
    try {
      const r = await releaseMilestone({
        tradeCaseId: input.tradeCaseId,
        milestoneId: m.id,
        releasedBy: input.releasedBy,
        reason: input.reason,
      });
      released.push(r.milestone);
    } catch (e: any) {
      errors.push({ milestoneId: m.id, message: e?.message || "release failed" });
    }
  }
  return { released, errors };
}

// ─────────────────────── FX CONVERSION ───────────────────────

/**
 * Convert funds between two of the user's currency balances atomically.
 * Debits `from` available, credits `to` available using the latest FX rate.
 */
export async function fxConvert(input: {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  amountCents: number;
  idempotencyKey: string;
}): Promise<{
  debit: WalletBalanceTransaction;
  credit: WalletBalanceTransaction;
  rate: number;
  convertedCents: number;
}> {
  if (input.amountCents <= 0) throw new Error("Amount must be positive");
  if (input.fromCurrency === input.toCurrency) throw new Error("From and to currencies must differ");
  if (!isSupportedCurrency(input.fromCurrency) || !isSupportedCurrency(input.toCurrency)) {
    throw Object.assign(new Error("Unsupported currency"), { status: 400 });
  }
  const rate = await getLatestRate(input.fromCurrency, input.toCurrency);
  const convertedCents = Math.round(input.amountCents * rate);
  const fromBal = await getOrCreateBalance(input.userId, input.fromCurrency);
  const toBal = await getOrCreateBalance(input.userId, input.toCurrency);
  return db.transaction(async (t) => {
    const debit = await writeBalanceTx(t, {
      userId: input.userId,
      balanceId: fromBal.id,
      currency: input.fromCurrency,
      type: "fx_conversion",
      amountCents: -input.amountCents,
      referenceType: "fx_conversion",
      referenceId: input.idempotencyKey,
      idempotencyKey: `${input.idempotencyKey}:debit`,
      description: `FX ${input.fromCurrency}→${input.toCurrency} @ ${rate}`,
      metadata: { rate, toCurrency: input.toCurrency, convertedCents },
    });
    const credit = await writeBalanceTx(t, {
      userId: input.userId,
      balanceId: toBal.id,
      currency: input.toCurrency,
      type: "fx_conversion",
      amountCents: +convertedCents,
      referenceType: "fx_conversion",
      referenceId: input.idempotencyKey,
      idempotencyKey: `${input.idempotencyKey}:credit`,
      description: `FX ${input.fromCurrency}→${input.toCurrency} @ ${rate}`,
      metadata: { rate, fromCurrency: input.fromCurrency, sourceCents: input.amountCents },
    });
    return { debit, credit, rate, convertedCents };
  });
}
