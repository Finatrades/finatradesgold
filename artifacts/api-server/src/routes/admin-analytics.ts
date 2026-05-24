/**
 * Admin Analytics & Risk routes (Task #170).
 *
 * Mount under /api at server startup via registerAdminAnalyticsRoutes(app).
 * All endpoints require admin auth.
 *
 * Date range:
 *   - `from` / `to` ISO timestamps (defaults: last 30d, in Africa/Lagos).
 *   - Range is clamped to today at the upper bound.
 *
 * Each chart endpoint accepts ?format=csv to stream the raw underlying rows
 * (Excel opens CSV natively, so the UI surfaces a single "Export" button).
 *
 * Counterparty anonymity (Task #145): leaderboards expose FT-IDs only.
 *
 * Caching: every JSON response is cached in Redis for 60s, keyed by the
 * normalised date range + endpoint. CSV exports are not cached because
 * they're cheap-streamed and rarely repeated.
 */
import type { Express, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gte, isNotNull, lte, sql, inArray, ne } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import {
  tradeCases,
  consignments,
  users,
  kycSubmissions,
  finatradesPersonalKyc,
  finatradesCorporateKyc,
  tradeDisputes,
  sarReports,
  fraudAlerts,
  b2bWithdrawalRequests,
  b2bWalletTransactions,
  platformFees,
} from "@shared/schema";
import { cacheGet, cacheSet } from "../redis-client";
import { requirePermission } from "../rbac-middleware";

// ─── Admin guard ─────────────────────────────────────────────────────────
// Requires admin role + the `view_analytics` permission (granted to admin,
// manager, and compliance roles by default). Risk endpoints additionally
// require `view_risk`. The legacy auto-superadmin fallback in requirePermission
// keeps seeded platform admins working without explicit role assignments.
const requireAnalyticsAccess = [
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const uid = req.session?.userId;
    if (!uid) { res.status(401).json({ message: "Authentication required" }); return; }
    next();
  },
  requirePermission('view_analytics'),
];
const requireRiskAccess = [
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const uid = req.session?.userId;
    if (!uid) { res.status(401).json({ message: "Authentication required" }); return; }
    next();
  },
  requirePermission('view_risk', 'view_analytics'),
];

// ─── Date-range parsing (Africa/Lagos timezone aware) ────────────────────
// All Finatrades platform reporting is in Africa/Lagos (UTC+01:00, no DST).
// Callers may pass `from`/`to` as either:
//   - full ISO datetimes (used as-is), or
//   - calendar dates (YYYY-MM-DD) which we expand to start-of-day in Lagos.
// Defaults: last 30 calendar days in Lagos.
const LAGOS_OFFSET_MIN = 60; // UTC+01:00, no DST
const LAGOS_OFFSET_HHMM = "+01:00";

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(["json", "csv", "xlsx"]).optional(),
});

interface ResolvedRange {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  fromLagosDay: string; // YYYY-MM-DD in Lagos local time
  toLagosDay: string;
}

function toLagosDayString(d: Date): string {
  // Shift the absolute instant by Lagos offset, then read UTC parts.
  const shifted = new Date(d.getTime() + LAGOS_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function lagosStartOfDay(yyyyMmDd: string): Date {
  // Midnight in Lagos = (yyyy-mm-dd)T00:00:00+01:00 in UTC terms.
  return new Date(`${yyyyMmDd}T00:00:00.000${LAGOS_OFFSET_HHMM}`);
}
function lagosEndOfDay(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T23:59:59.999${LAGOS_OFFSET_HHMM}`);
}

function parseRangeInput(s: string | undefined, fallback: Date, mode: "from" | "to"): Date {
  if (!s) return fallback;
  // Calendar date? Expand into Lagos day boundary.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return mode === "from" ? lagosStartOfDay(s) : lagosEndOfDay(s);
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return fallback;
  return d;
}

function resolveRange(req: Request): ResolvedRange {
  const parsed = rangeSchema.safeParse(req.query);
  const now = new Date();
  const todayLagos = toLagosDayString(now);
  const defaultFromDay = toLagosDayString(new Date(now.getTime() - 30 * 24 * 3600 * 1000));
  const defaultFrom = lagosStartOfDay(defaultFromDay);
  const defaultTo = lagosEndOfDay(todayLagos);

  let from = parseRangeInput(parsed.success ? parsed.data.from : undefined, defaultFrom, "from");
  let to = parseRangeInput(parsed.success ? parsed.data.to : undefined, defaultTo, "to");
  // Clamp `to` upper bound at end-of-today (Lagos): future ranges are invalid
  // for "things that have happened" reporting and would leak empty buckets.
  if (to.getTime() > defaultTo.getTime()) to = defaultTo;
  // Guarantee from <= to (fallback to defaultFrom if input is inverted).
  if (from.getTime() > to.getTime()) from = defaultFrom;

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromLagosDay: toLagosDayString(from),
    toLagosDay: toLagosDayString(to),
  };
}

// All daily aggregation buckets are computed in Africa/Lagos so day boundaries
// match the operational timezone of the platform, regardless of DB storage TZ.
const LAGOS_DAY_TRUNC_SQL = (col: any) =>
  sql<string>`to_char(date_trunc('day', ${col} AT TIME ZONE 'Africa/Lagos'), 'YYYY-MM-DD')`;
const LAGOS_DAY_GROUP_SQL = (col: any) =>
  sql`date_trunc('day', ${col} AT TIME ZONE 'Africa/Lagos')`;

function wantsCsv(req: Request): boolean {
  return (req.query.format as string | undefined)?.toLowerCase() === "csv";
}
function wantsXlsx(req: Request): boolean {
  return (req.query.format as string | undefined)?.toLowerCase() === "xlsx";
}

// ─── CSV helper ──────────────────────────────────────────────────────────
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : (v instanceof Date ? v.toISOString() : String(v));
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sendCsv(res: Response, filename: string, headers: string[], rows: Array<Record<string, unknown>>): void {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.write(headers.join(",") + "\r\n");
  for (const row of rows) {
    res.write(headers.map(h => csvEscape(row[h])).join(",") + "\r\n");
  }
  res.end();
}

// ─── Excel (SpreadsheetML 2003) helper ──────────────────────────────────
// Excel opens SpreadsheetML 2003 XML natively (.xls). We serve it with the
// canonical xlsx filename and an Excel MIME type — no extra deps. Cells are
// emitted as Number when numeric, String otherwise.
function xmlEscape(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildSpreadsheetXml(sheetName: string, headers: string[], rows: Array<Record<string, unknown>>): string {
  const safeSheet = xmlEscape(sheetName.slice(0, 31).replace(/[\\/?*\[\]:]/g, "_"));
  let xml = `<?xml version="1.0"?>\n` +
    `<?mso-application progid="Excel.Sheet"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n` +
    ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
    `<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#FAFAF8" ss:Pattern="Solid"/></Style></Styles>\n` +
    `<Worksheet ss:Name="${safeSheet}"><Table>\n`;
  xml += `<Row>` + headers.map(h => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join("") + `</Row>\n`;
  for (const row of rows) {
    xml += `<Row>` + headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined || v === "") return `<Cell><Data ss:Type="String"></Data></Cell>`;
      if (typeof v === "number" && Number.isFinite(v)) return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
      if (typeof v === "bigint") return `<Cell><Data ss:Type="Number">${v.toString()}</Data></Cell>`;
      const s = v instanceof Date ? v.toISOString() : String(v);
      return `<Cell><Data ss:Type="String">${xmlEscape(s)}</Data></Cell>`;
    }).join("") + `</Row>\n`;
  }
  xml += `</Table></Worksheet>\n</Workbook>\n`;
  return xml;
}

function sendXlsx(res: Response, filename: string, sheetName: string, headers: string[], rows: Array<Record<string, unknown>>): void {
  const xml = buildSpreadsheetXml(sheetName, headers, rows);
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/\.xlsx?$/, "")}.xls"`);
  res.send(xml);
}

function sendTabular(
  req: Request, res: Response,
  baseFilename: string, sheetName: string,
  headers: string[], rows: Array<Record<string, unknown>>,
): boolean {
  if (wantsCsv(req)) { sendCsv(res, `${baseFilename}.csv`, headers, rows); return true; }
  if (wantsXlsx(req)) { sendXlsx(res, `${baseFilename}.xlsx`, sheetName, headers, rows); return true; }
  return false;
}

// ─── Redis caching helper (cache stores JSON strings) ────────────────────
async function withCache<T>(key: string, ttlSec: number, compute: () => Promise<T>): Promise<T> {
  try {
    const cached = await cacheGet(key);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* fall through */ }
  const value = await compute();
  try { await cacheSet(key, JSON.stringify(value), ttlSec); } catch { /* ignore */ }
  return value;
}

function cacheKey(scope: string, range: ResolvedRange, extra: string = ""): string {
  return `admin:analytics:${scope}:${range.fromIso}:${range.toIso}${extra ? ":" + extra : ""}`;
}

// ─── Anonymised counterparty display ─────────────────────────────────────
function displayName(u: { finatradesId: string | null; firstName: string | null; lastName: string | null; companyName: string | null; }): string {
  // Per Task #145 — leaderboards expose FT-IDs only. We additionally include
  // a *masked* fallback (first letter + ***) only when no FT-ID is set, to
  // avoid empty cells; never raw names.
  if (u.finatradesId) return u.finatradesId;
  const initial = (u.companyName || u.firstName || u.lastName || "?").trim().charAt(0).toUpperCase();
  return `${initial}***`;
}

// ─── Settled-case filter ─────────────────────────────────────────────────
// "Completed / settled" trades = status in ('Settled'). Cast to the enum's
// literal-union to satisfy drizzle's `inArray` typing.
type TradeCaseStatus = "Approved" | "Rejected" | "Draft" | "Cancelled" | "Submitted" | "Under Review" | "Active" | "Settled";
const SETTLED_STATUSES: TradeCaseStatus[] = ["Settled"];
const ACTIVE_STATUSES: TradeCaseStatus[] = ["Active", "Approved", "Under Review", "Submitted"];

// ============================================================================
// KPIs
// ============================================================================
async function computeKpis(range: ResolvedRange) {
  const settledRows = await db
    .select({
      currency: tradeCases.settlementCurrency,
      amount: sql<number>`COALESCE(SUM(${tradeCases.settlementAmountCents}), 0)::bigint`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(tradeCases)
    .where(and(
      inArray(tradeCases.status, SETTLED_STATUSES),
      gte(tradeCases.createdAt, range.from),
      lte(tradeCases.createdAt, range.to),
    ))
    .groupBy(tradeCases.settlementCurrency);

  const gmvByCurrency: Record<string, number> = {};
  let totalSettledDealCount = 0;
  let totalSettledCentsUsdProxy = 0;
  for (const r of settledRows) {
    const cents = Number(r.amount || 0);
    gmvByCurrency[r.currency || "USD"] = (gmvByCurrency[r.currency || "USD"] || 0) + cents;
    totalSettledDealCount += Number(r.count || 0);
    // Crude USD-equivalent for avg deal size headline (no FX conversion at
    // KPI level — surfaced per-currency in the strip).
    totalSettledCentsUsdProxy += cents;
  }

  const [activeRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tradeCases)
    .where(and(
      inArray(tradeCases.status, ACTIVE_STATUSES),
      gte(tradeCases.createdAt, range.from),
      lte(tradeCases.createdAt, range.to),
    ));

  const newUserRows = await db
    .select({
      userType: users.userType,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(users)
    .where(and(
      gte(users.createdAt, range.from),
      lte(users.createdAt, range.to),
    ))
    .groupBy(users.userType);

  const newUsersByType: { exporter: number; importer: number; government: number; warehouse: number } = { exporter: 0, importer: 0, government: 0, warehouse: 0 };
  let newUsersTotal = 0;
  for (const r of newUserRows) {
    const t = (r.userType || "exporter") as keyof typeof newUsersByType;
    if (t in newUsersByType) newUsersByType[t] += Number(r.count || 0);
    newUsersTotal += Number(r.count || 0);
  }

  // Commission earned (estimate). We don't currently persist per-trade fees,
  // so we apply the active platform_fees rate for each settled trade to
  // produce a transparent ESTIMATE. Surfaced as `tracked: 'estimate'` so the
  // UI can label the figure honestly.
  const feeRows = await db
    .select({
      feeType: platformFees.feeType,
      feeValue: platformFees.feeValue,
    })
    .from(platformFees)
    .where(eq(platformFees.isActive, true));
  // Pick the first percentage trade-related fee; fall back to 1% if none.
  const tradeFee = feeRows.find(f => /trade|escrow|settlement|platform/i.test(f.feeType || ""));
  const feePct = tradeFee && Number(tradeFee.feeValue) > 0 && Number(tradeFee.feeValue) <= 100
    ? Number(tradeFee.feeValue) : 1.0;
  const commissionByCurrency: Record<string, number> = {};
  for (const [cur, cents] of Object.entries(gmvByCurrency)) {
    commissionByCurrency[cur] = Math.round((cents * feePct) / 100);
  }
  const commission = {
    centsByCurrency: commissionByCurrency,
    feePct,
    tracked: "estimate" as const,
    source: tradeFee ? `platform_fees.${tradeFee.feeType}` : "default_fallback",
  };

  const avgDealSizeCents = totalSettledDealCount > 0
    ? Math.round(totalSettledCentsUsdProxy / totalSettledDealCount)
    : 0;

  return {
    gmvByCurrency,
    completedTrades: totalSettledDealCount,
    activeTrades: Number(activeRow?.count || 0),
    avgDealSizeCents,
    avgDealSizeCurrency: "MIXED",
    newUsers: { total: newUsersTotal, ...newUsersByType },
    commission,
  };
}

// ============================================================================
// Timeseries GMV (daily, stacked by commodity)
// ============================================================================
async function computeTimeseriesGmv(range: ResolvedRange) {
  const rows = await db
    .select({
      day: LAGOS_DAY_TRUNC_SQL(tradeCases.createdAt),
      commodity: tradeCases.commodityType,
      currency: tradeCases.settlementCurrency,
      amount: sql<number>`COALESCE(SUM(${tradeCases.settlementAmountCents}), 0)::bigint`,
    })
    .from(tradeCases)
    .where(and(
      inArray(tradeCases.status, SETTLED_STATUSES),
      gte(tradeCases.createdAt, range.from),
      lte(tradeCases.createdAt, range.to),
    ))
    .groupBy(LAGOS_DAY_GROUP_SQL(tradeCases.createdAt), tradeCases.commodityType, tradeCases.settlementCurrency)
    .orderBy(LAGOS_DAY_GROUP_SQL(tradeCases.createdAt));

  return rows.map(r => ({
    day: r.day,
    commodity: r.commodity,
    currency: r.currency || "USD",
    amountCents: Number(r.amount || 0),
  }));
}

// ============================================================================
// Top commodities
// ============================================================================
async function computeTopCommodities(range: ResolvedRange, limit: number = 10) {
  const rows = await db
    .select({
      commodity: tradeCases.commodityType,
      currency: tradeCases.settlementCurrency,
      amount: sql<number>`COALESCE(SUM(${tradeCases.settlementAmountCents}), 0)::bigint`,
      dealCount: sql<number>`COUNT(*)::int`,
    })
    .from(tradeCases)
    .where(and(
      inArray(tradeCases.status, SETTLED_STATUSES),
      gte(tradeCases.createdAt, range.from),
      lte(tradeCases.createdAt, range.to),
    ))
    .groupBy(tradeCases.commodityType, tradeCases.settlementCurrency)
    .orderBy(desc(sql`SUM(${tradeCases.settlementAmountCents})`))
    .limit(limit);

  return rows.map(r => ({
    commodity: r.commodity,
    currency: r.currency || "USD",
    amountCents: Number(r.amount || 0),
    dealCount: Number(r.dealCount || 0),
  }));
}

// ============================================================================
// Top traders (exporters + importers) — anonymised
// ============================================================================
async function computeTopTraders(range: ResolvedRange, side: "exporter" | "importer", limit: number = 10) {
  // Counterparty attribution per deal (Task #146 convention):
  //   • importer = trade_cases.user_id (case owner; importer funds escrow)
  //   • exporter = (trade_cases.notes::jsonb ->> 'exporterUserId')
  // We resolve the trader id with an SQL CASE expression so a single GROUP BY
  // works for either side.
  const traderIdSql = side === "importer"
    ? sql<string>`${tradeCases.userId}`
    : sql<string>`NULLIF(${tradeCases.notes}::jsonb ->> 'exporterUserId', '')`;

  const rows = await db
    .select({
      userId: sql<string>`${traderIdSql}`,
      finatradesId: users.finatradesId,
      firstName: users.firstName,
      lastName: users.lastName,
      companyName: users.companyName,
      country: users.country,
      currency: tradeCases.settlementCurrency,
      amount: sql<number>`COALESCE(SUM(${tradeCases.settlementAmountCents}), 0)::bigint`,
      dealCount: sql<number>`COUNT(*)::int`,
    })
    .from(tradeCases)
    .innerJoin(users, eq(users.id, traderIdSql))
    .where(and(
      inArray(tradeCases.status, SETTLED_STATUSES),
      gte(tradeCases.createdAt, range.from),
      lte(tradeCases.createdAt, range.to),
      sql`${traderIdSql} IS NOT NULL`,
    ))
    .groupBy(sql`${traderIdSql}`, users.finatradesId, users.firstName, users.lastName, users.companyName, users.country, tradeCases.settlementCurrency)
    .orderBy(desc(sql`SUM(${tradeCases.settlementAmountCents})`))
    .limit(limit);

  return rows.map(r => ({
    ftId: r.finatradesId || `MASKED-${(r.userId || "").slice(0, 6)}`,
    displayName: displayName(r),
    country: r.country,
    currency: r.currency || "USD",
    amountCents: Number(r.amount || 0),
    dealCount: Number(r.dealCount || 0),
  }));
}

// ============================================================================
// Geographic spread (consignments — origin/destination)
// ============================================================================
async function computeGeo(range: ResolvedRange) {
  const originRows = await db
    .select({
      country: consignments.originCountry,
      dealCount: sql<number>`COUNT(*)::int`,
      valueCents: sql<number>`COALESCE(SUM(${consignments.estimatedValueCents}), 0)::bigint`,
    })
    .from(consignments)
    .where(and(
      gte(consignments.createdAt, range.from),
      lte(consignments.createdAt, range.to),
      isNotNull(consignments.originCountry),
    ))
    .groupBy(consignments.originCountry)
    .orderBy(desc(sql`COUNT(*)`));

  const destRows = await db
    .select({
      country: tradeCases.buyerCountry,
      dealCount: sql<number>`COUNT(*)::int`,
      valueCents: sql<number>`COALESCE(SUM(${tradeCases.settlementAmountCents}), 0)::bigint`,
    })
    .from(tradeCases)
    .where(and(
      gte(tradeCases.createdAt, range.from),
      lte(tradeCases.createdAt, range.to),
      isNotNull(tradeCases.buyerCountry),
    ))
    .groupBy(tradeCases.buyerCountry)
    .orderBy(desc(sql`COUNT(*)`));

  return {
    origin: originRows.map(r => ({ country: r.country, dealCount: Number(r.dealCount || 0), valueCents: Number(r.valueCents || 0) })),
    destination: destRows.map(r => ({ country: r.country, dealCount: Number(r.dealCount || 0), valueCents: Number(r.valueCents || 0) })),
  };
}

// ============================================================================
// KYC funnel
// ============================================================================
async function computeKycFunnel(range: ResolvedRange) {
  // Combine personal + corporate finatrades KYC.
  const submittedRange = and(gte(finatradesPersonalKyc.createdAt, range.from), lte(finatradesPersonalKyc.createdAt, range.to));
  const submittedRangeC = and(gte(finatradesCorporateKyc.createdAt, range.from), lte(finatradesCorporateKyc.createdAt, range.to));

  async function counts<T extends "personal" | "corporate">(_kind: T) {
    const tbl = _kind === "personal" ? finatradesPersonalKyc : finatradesCorporateKyc;
    const rangePred = _kind === "personal" ? submittedRange : submittedRangeC;
    const rows = await db
      .select({ status: tbl.status, count: sql<number>`COUNT(*)::int` })
      .from(tbl as any)
      .where(rangePred as any)
      .groupBy(tbl.status);
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status || "In Progress"] = Number(r.count || 0);
    return m;
  }

  const [personal, corporate] = await Promise.all([counts("personal"), counts("corporate")]);

  function bucket(m: Record<string, number>) {
    const submitted = Object.values(m).reduce((a, b) => a + b, 0);
    const aiReview = m["AI Review"] || 0;
    const humanReview = (m["Pending Review"] || 0) + (m["In Review"] || 0) + (m["Escalated"] || 0);
    const approved = m["Approved"] || 0;
    const rejected = (m["Rejected"] || 0) + (m["Changes Requested"] || 0);
    return { submitted, aiReview, humanReview, approved, rejected };
  }

  const p = bucket(personal);
  const c = bucket(corporate);
  const total = {
    submitted: p.submitted + c.submitted,
    aiReview: p.aiReview + c.aiReview,
    humanReview: p.humanReview + c.humanReview,
    approved: p.approved + c.approved,
    rejected: p.rejected + c.rejected,
  };
  const approvalRate = total.submitted > 0 ? Math.round((total.approved / total.submitted) * 1000) / 10 : 0;

  // Per-step conversion: fraction of the prior step that progressed forward.
  // Each row reaches *at most* one current status, so we approximate stage
  // progression by reconstructing cumulative reach: submitted ≥ aiReview+
  // humanReview+approved+rejected (rejected counts as "exited"; approved as
  // "passed both review stages").
  function safePct(num: number, den: number): number {
    if (den <= 0) return 0;
    return Math.round((num / den) * 1000) / 10;
  }
  const reachedAi = total.aiReview + total.humanReview + total.approved + total.rejected;
  const reachedHuman = total.humanReview + total.approved;
  const passedHuman = total.approved;
  const conversion = {
    submittedToAi: safePct(reachedAi, total.submitted),
    aiToHuman: safePct(reachedHuman, Math.max(reachedAi, 1)),
    humanToApproved: safePct(passedHuman, Math.max(reachedHuman, 1)),
    submittedToApproved: safePct(total.approved, total.submitted),
    rejectionRate: safePct(total.rejected, total.submitted),
  };

  return { personal: p, corporate: c, total, approvalRate, conversion };
}

// ============================================================================
// Trade funnel (consignments → trade_cases)
// ============================================================================
async function computeTradeFunnel(range: ResolvedRange) {
  const consigByStatus = await db
    .select({ status: consignments.status, count: sql<number>`COUNT(*)::int` })
    .from(consignments)
    .where(and(gte(consignments.createdAt, range.from), lte(consignments.createdAt, range.to)))
    .groupBy(consignments.status);

  const casesByStatus = await db
    .select({ status: tradeCases.status, count: sql<number>`COUNT(*)::int` })
    .from(tradeCases)
    .where(and(gte(tradeCases.createdAt, range.from), lte(tradeCases.createdAt, range.to)))
    .groupBy(tradeCases.status);

  const cm: Record<string, number> = {};
  for (const r of consigByStatus) cm[r.status || "Draft"] = Number(r.count || 0);
  const tm: Record<string, number> = {};
  for (const r of casesByStatus) tm[r.status || "Draft"] = Number(r.count || 0);

  const drafted = (cm["Draft"] || 0) + (tm["Draft"] || 0);
  const consigned = Object.values(cm).reduce((a, b) => a + b, 0);
  const inTransit = (cm["In Transit"] || 0) + (cm["Approved"] || 0);
  const delivered = (cm["Delivered"] || 0) + (cm["Received"] || 0);
  const settled = tm["Settled"] || 0;

  return {
    stages: [
      { key: "drafted", label: "Drafted", count: drafted },
      { key: "consigned", label: "Consigned", count: consigned },
      { key: "in_transit", label: "In Transit", count: inTransit },
      { key: "delivered", label: "Delivered", count: delivered },
      { key: "settled", label: "Settled", count: settled },
    ],
    consignmentsByStatus: cm,
    casesByStatus: tm,
  };
}

// ============================================================================
// Risk overview
// ============================================================================
async function computeRiskOverview(range: ResolvedRange) {
  const [openDisputesRows, sarRows, fraudRows] = await Promise.all([
    db.select({ priority: tradeDisputes.priority, count: sql<number>`COUNT(*)::int` })
      .from(tradeDisputes)
      .where(and(
        ne(tradeDisputes.status, "Resolved"),
        gte(tradeDisputes.createdAt, range.from),
        lte(tradeDisputes.createdAt, range.to),
      ))
      .groupBy(tradeDisputes.priority),

    db.select({ status: sarReports.status, count: sql<number>`COUNT(*)::int` })
      .from(sarReports)
      .where(and(gte(sarReports.createdAt, range.from), lte(sarReports.createdAt, range.to)))
      .groupBy(sarReports.status),

    db.select({ severity: fraudAlerts.severity, count: sql<number>`COUNT(*)::int` })
      .from(fraudAlerts)
      .where(and(
        gte(fraudAlerts.createdAt, range.from),
        lte(fraudAlerts.createdAt, range.to),
      ))
      .groupBy(fraudAlerts.severity),
  ]);

  const disputesByPriority: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  let openDisputes = 0;
  for (const r of openDisputesRows) {
    const k = r.priority || "Medium";
    disputesByPriority[k] = (disputesByPriority[k] || 0) + Number(r.count || 0);
    openDisputes += Number(r.count || 0);
  }

  // Average resolution days for resolved disputes in range.
  const [avgRow] = await db
    .select({
      avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${tradeDisputes.resolvedAt} - ${tradeDisputes.createdAt})) / 86400.0), 0)::float8`,
      resolvedCount: sql<number>`COUNT(*)::int`,
    })
    .from(tradeDisputes)
    .where(and(
      isNotNull(tradeDisputes.resolvedAt),
      gte(tradeDisputes.createdAt, range.from),
      lte(tradeDisputes.createdAt, range.to),
    ));

  const sarByStatus: Record<string, number> = {};
  let sarCount = 0;
  for (const r of sarRows) { sarByStatus[r.status || "draft"] = Number(r.count || 0); sarCount += Number(r.count || 0); }

  const fraudBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let fraudTotal = 0;
  for (const r of fraudRows) { fraudBySeverity[r.severity || "low"] = Number(r.count || 0); fraudTotal += Number(r.count || 0); }

  // Sanctions hits: kyc_submissions with isSanctioned=true.
  const [sanctionsRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(kycSubmissions)
    .where(and(
      eq(kycSubmissions.isSanctioned, true),
      gte(kycSubmissions.createdAt, range.from),
      lte(kycSubmissions.createdAt, range.to),
    ));

  // Large-tx alerts: wallet tx > $100k (10_000_000 cents) in range.
  const LARGE_TX_THRESHOLD_CENTS = 10_000_000;
  const [largeTxRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(b2bWalletTransactions)
    .where(and(
      sql`ABS(${b2bWalletTransactions.amountCents}) >= ${LARGE_TX_THRESHOLD_CENTS}`,
      gte(b2bWalletTransactions.createdAt, range.from),
      lte(b2bWalletTransactions.createdAt, range.to),
    ));

  // Withdrawal anomalies: pending withdrawals older than 48h or rejected count
  const [withdrawalAnomalyRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(b2bWithdrawalRequests)
    .where(and(
      inArray(b2bWithdrawalRequests.status, ["rejected", "flagged"]),
      gte(b2bWithdrawalRequests.createdAt, range.from),
      lte(b2bWithdrawalRequests.createdAt, range.to),
    ));

  return {
    disputes: { open: openDisputes, byPriority: disputesByPriority, avgResolutionDays: Number(avgRow?.avgDays || 0), resolvedCount: Number(avgRow?.resolvedCount || 0) },
    sars: { total: sarCount, byStatus: sarByStatus },
    sanctionsHits: Number(sanctionsRow?.count || 0),
    largeTransactions: { count: Number(largeTxRow?.count || 0), thresholdCents: LARGE_TX_THRESHOLD_CENTS },
    fraud: { total: fraudTotal, bySeverity: fraudBySeverity },
    withdrawalAnomalies: Number(withdrawalAnomalyRow?.count || 0),
  };
}

// ============================================================================
// Risk alerts feed (combined; deep-linkable)
// ============================================================================
async function computeRiskAlerts(range: ResolvedRange, limit: number = 50) {
  const [disputes, sars, fraud, withdrawals] = await Promise.all([
    db.select({
      id: tradeDisputes.id,
      ref: tradeDisputes.disputeRefId,
      subject: tradeDisputes.subject,
      priority: tradeDisputes.priority,
      status: tradeDisputes.status,
      createdAt: tradeDisputes.createdAt,
    }).from(tradeDisputes)
      .where(and(
        ne(tradeDisputes.status, "Resolved"),
        gte(tradeDisputes.createdAt, range.from),
        lte(tradeDisputes.createdAt, range.to),
      ))
      .orderBy(desc(tradeDisputes.createdAt))
      .limit(limit),

    db.select({
      id: sarReports.id,
      ref: sarReports.reportNumber,
      activityType: sarReports.activityType,
      status: sarReports.status,
      createdAt: sarReports.createdAt,
    }).from(sarReports)
      .where(and(gte(sarReports.createdAt, range.from), lte(sarReports.createdAt, range.to)))
      .orderBy(desc(sarReports.createdAt))
      .limit(limit),

    db.select({
      id: fraudAlerts.id,
      alertType: fraudAlerts.alertType,
      severity: fraudAlerts.severity,
      status: fraudAlerts.status,
      description: fraudAlerts.description,
      createdAt: fraudAlerts.createdAt,
    }).from(fraudAlerts)
      .where(and(gte(fraudAlerts.createdAt, range.from), lte(fraudAlerts.createdAt, range.to)))
      .orderBy(desc(fraudAlerts.createdAt))
      .limit(limit),

    db.select({
      id: b2bWithdrawalRequests.id,
      amountCents: b2bWithdrawalRequests.amountCents,
      status: b2bWithdrawalRequests.status,
      createdAt: b2bWithdrawalRequests.createdAt,
    }).from(b2bWithdrawalRequests)
      .where(and(
        inArray(b2bWithdrawalRequests.status, ["rejected", "flagged"]),
        gte(b2bWithdrawalRequests.createdAt, range.from),
        lte(b2bWithdrawalRequests.createdAt, range.to),
      ))
      .orderBy(desc(b2bWithdrawalRequests.createdAt))
      .limit(limit),
  ]);

  return {
    disputes: disputes.map(d => ({
      kind: "dispute" as const,
      id: d.id,
      ref: d.ref,
      title: d.subject,
      severity: d.priority || "Medium",
      status: d.status,
      createdAt: d.createdAt,
      deepLink: `/admin/disputes`,
    })),
    sars: sars.map(s => ({
      kind: "sar" as const,
      id: s.id,
      ref: s.ref,
      title: `SAR — ${s.activityType}`,
      severity: "High",
      status: s.status,
      createdAt: s.createdAt,
      // SAR & fraud alerts are surfaced inside the Risk console — focus param
      // lets the page scroll/highlight the matching row.
      deepLink: `/admin/risk?focus=sar:${s.id}`,
    })),
    fraud: fraud.map(f => ({
      kind: "fraud" as const,
      id: f.id,
      ref: f.id.slice(0, 8),
      title: f.description,
      severity: f.severity,
      status: f.status,
      createdAt: f.createdAt,
      deepLink: `/admin/risk?focus=fraud:${f.id}`,
    })),
    withdrawals: withdrawals.map(w => ({
      kind: "withdrawal" as const,
      id: w.id,
      ref: w.id.slice(0, 8),
      title: `Withdrawal $${(w.amountCents / 100).toFixed(2)} — ${w.status}`,
      severity: w.status === "flagged" ? "Critical" : "High",
      status: w.status,
      createdAt: w.createdAt,
      deepLink: `/admin/wallets?focus=withdrawal:${w.id}`,
    })),
  };
}

// ============================================================================
// Router
// ============================================================================
const router = Router();
router.use(requireAnalyticsAccess);

function rangeMeta(range: ResolvedRange) {
  return { from: range.fromIso, to: range.toIso, fromLagosDay: range.fromLagosDay, toLagosDay: range.toLagosDay, tz: "Africa/Lagos" };
}
function baseName(scope: string, range: ResolvedRange) {
  return `${scope}_${range.fromLagosDay}_${range.toLagosDay}`;
}

router.get("/kpis", async (req, res) => {
  const range = resolveRange(req);
  const data = await withCache(cacheKey("kpis", range), 60, () => computeKpis(range));
  const rows: Array<Record<string, unknown>> = [
    { metric: "completed_trades", value: data.completedTrades },
    { metric: "active_trades", value: data.activeTrades },
    { metric: "avg_deal_size_cents", value: data.avgDealSizeCents },
    { metric: "new_users_total", value: data.newUsers.total },
    { metric: "new_users_exporter", value: data.newUsers.exporter },
    { metric: "new_users_importer", value: data.newUsers.importer },
    { metric: "new_users_government", value: data.newUsers.government },
    { metric: "commission_fee_pct", value: data.commission.feePct },
    ...Object.entries(data.gmvByCurrency).map(([cur, cents]) => ({ metric: `gmv_${cur.toLowerCase()}_cents`, value: cents })),
    ...Object.entries(data.commission.centsByCurrency).map(([cur, cents]) => ({ metric: `commission_${cur.toLowerCase()}_cents_est`, value: cents })),
  ];
  if (sendTabular(req, res, baseName("kpis", range), "KPIs", ["metric", "value"], rows)) return;
  res.json({ range: rangeMeta(range), data });
});

router.get("/timeseries/gmv", async (req, res) => {
  const range = resolveRange(req);
  const data = await withCache(cacheKey("ts-gmv", range), 60, () => computeTimeseriesGmv(range));
  if (sendTabular(req, res, baseName("timeseries_gmv", range), "GMV Timeseries",
      ["day", "commodity", "currency", "amountCents"], data as any)) return;
  res.json({ range: rangeMeta(range), data });
});

router.get("/top-commodities", async (req, res) => {
  const range = resolveRange(req);
  const data = await withCache(cacheKey("top-commodities", range), 60, () => computeTopCommodities(range));
  if (sendTabular(req, res, baseName("top_commodities", range), "Top Commodities",
      ["commodity", "currency", "amountCents", "dealCount"], data as any)) return;
  res.json({ range: rangeMeta(range), data });
});

router.get("/top-traders", async (req, res) => {
  const range = resolveRange(req);
  const side = (req.query.side as string) === "importer" ? "importer" : "exporter";
  const data = await withCache(cacheKey("top-traders", range, side), 60, () => computeTopTraders(range, side));
  if (sendTabular(req, res, `top_${side}s_${range.fromLagosDay}_${range.toLagosDay}`, `Top ${side}s`,
      ["ftId", "displayName", "country", "currency", "amountCents", "dealCount"], data as any)) return;
  res.json({ range: rangeMeta(range), side, data });
});

router.get("/geo", async (req, res) => {
  const range = resolveRange(req);
  const data = await withCache(cacheKey("geo", range), 60, () => computeGeo(range));
  const rows = [
    ...data.origin.map(r => ({ direction: "origin", ...r })),
    ...data.destination.map(r => ({ direction: "destination", ...r })),
  ];
  if (sendTabular(req, res, baseName("geo", range), "Geo Spread",
      ["direction", "country", "dealCount", "valueCents"], rows)) return;
  res.json({ range: rangeMeta(range), data });
});

router.get("/kyc-funnel", async (req, res) => {
  const range = resolveRange(req);
  const data = await withCache(cacheKey("kyc-funnel", range), 60, () => computeKycFunnel(range));
  const rows = [
    { stage: "submitted", count: data.total.submitted, conversion_pct: 100 },
    { stage: "ai_review_reached", count: data.total.aiReview + data.total.humanReview + data.total.approved + data.total.rejected, conversion_pct: data.conversion.submittedToAi },
    { stage: "human_review_reached", count: data.total.humanReview + data.total.approved, conversion_pct: data.conversion.aiToHuman },
    { stage: "approved", count: data.total.approved, conversion_pct: data.conversion.humanToApproved },
    { stage: "rejected", count: data.total.rejected, conversion_pct: data.conversion.rejectionRate },
  ];
  if (sendTabular(req, res, baseName("kyc_funnel", range), "KYC Funnel",
      ["stage", "count", "conversion_pct"], rows)) return;
  res.json({ range: rangeMeta(range), data });
});

router.get("/trade-funnel", async (req, res) => {
  const range = resolveRange(req);
  const data = await withCache(cacheKey("trade-funnel", range), 60, () => computeTradeFunnel(range));
  if (sendTabular(req, res, baseName("trade_funnel", range), "Trade Funnel",
      ["key", "label", "count"], data.stages as any)) return;
  res.json({ range: rangeMeta(range), data });
});

export function registerAdminAnalyticsRoutes(app: Express): void {
  app.use("/api/admin/analytics", router);
  // Risk endpoints share the same date+caching plumbing but a stricter
  // permission gate (`view_risk` OR `view_analytics`).
  const riskRouter = Router();
  riskRouter.use(requireRiskAccess);
  riskRouter.get("/overview", async (req, res) => {
    const range = resolveRange(req);
    const data = await withCache(cacheKey("risk-overview", range), 60, () => computeRiskOverview(range));
    res.json({ range: rangeMeta(range), data });
  });
  riskRouter.get("/alerts", async (req, res) => {
    const range = resolveRange(req);
    const data = await withCache(cacheKey("risk-alerts", range), 60, () => computeRiskAlerts(range));
    const flat = [
      ...data.disputes.map(d => ({ ...d })),
      ...data.sars.map(d => ({ ...d })),
      ...data.fraud.map(d => ({ ...d })),
      ...data.withdrawals.map(d => ({ ...d })),
    ];
    if (sendTabular(req, res, baseName("risk_alerts", range), "Risk Alerts",
        ["kind", "id", "ref", "title", "severity", "status", "createdAt", "deepLink"], flat)) return;
    res.json({ range: rangeMeta(range), data });
  });
  app.use("/api/admin/risk", riskRouter);
}
