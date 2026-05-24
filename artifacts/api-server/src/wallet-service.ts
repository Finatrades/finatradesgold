/**
 * B2B USD Wallet service.
 *
 * All money is integer cents (bigint at the SQL layer, JS number here — safe to ~9 trillion cents).
 * Every mutation goes through these helpers inside a DB transaction; route handlers must NOT
 * touch balance columns directly.
 *
 * Idempotency is enforced by (idempotency_key) unique index on b2b_wallet_transactions.
 */
import crypto from "crypto";
import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  b2bWallets,
  b2bWalletTransactions,
  b2bWalletHolds,
  type B2bWallet,
  type B2bWalletTransaction,
  type B2bWalletHold,
} from "@shared/schema";

export type TxType =
  | "deposit"
  | "withdrawal"
  | "withdrawal_refund"
  | "hold_placed"
  | "hold_released"
  | "hold_converted_to_escrow"
  | "escrow_released"
  | "fee";

export type DepositRail = "bank" | "stablecoin" | "card";

function shortId(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function allocateVirtualAccount(userId: string) {
  const short = shortId(userId);
  return {
    virtualAccountNumber: `FT-VA-${short}`,
    virtualAccountBank: "Finatrades Settlement Bank (v1 manual reconcile)",
    virtualAccountReference: `REF-${short}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
  };
}

function allocateStablecoinAddress(userId: string): string {
  // V1: deterministic display-only address derived from userId + platform secret.
  // Real HD-wallet derivation requires a Polygon key; documented as out-of-scope for v1.
  const secret = process.env.STABLECOIN_HD_SEED || "finatrades-dev-stablecoin-seed";
  const h = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `0x${h.slice(0, 40)}`;
}

/** Ensure a wallet row exists for a user. Cheap upsert; safe to call on every login. */
export async function getOrCreateWallet(userId: string): Promise<B2bWallet> {
  const existing = await db.select().from(b2bWallets).where(eq(b2bWallets.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  const va = allocateVirtualAccount(userId);
  const addr = allocateStablecoinAddress(userId);

  try {
    const [created] = await db
      .insert(b2bWallets)
      .values({
        userId,
        currency: "USD",
        availableCents: 0,
        lockedCents: 0,
        pendingCents: 0,
        ...va,
        stablecoinAddress: addr,
        stablecoinNetwork: "polygon",
      })
      .returning();
    return created;
  } catch (err) {
    // Race condition: another request created it; re-fetch.
    const again = await db.select().from(b2bWallets).where(eq(b2bWallets.userId, userId)).limit(1);
    if (again.length > 0) return again[0];
    throw err;
  }
}

/** Recompute pending_cents from any open deposit_intents owned by this wallet. Best-effort. */
async function refreshPendingForWallet(tx: any, walletId: string): Promise<number> {
  const rows = await tx.execute(sql`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS s
    FROM b2b_deposit_intents
    WHERE wallet_id = ${walletId} AND status = 'pending'
  `);
  const pending = Number(rows.rows[0]?.s || 0);
  await tx.update(b2bWallets).set({ pendingCents: pending, updatedAt: new Date() }).where(eq(b2bWallets.id, walletId));
  return pending;
}

interface WriteTxOpts {
  userId: string;
  walletId: string;
  type: TxType;
  amountCents: number; // positive = credit available; negative = debit available
  lockedDelta?: number; // positive = increase locked; negative = release locked
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

/** Write a wallet transaction atomically. Caller must already be inside a tx (provided). */
async function writeTransaction(tx: any, opts: WriteTxOpts): Promise<B2bWalletTransaction> {
  // Lock the wallet row to serialize concurrent updates.
  const lockedRow = await tx.execute(sql`SELECT * FROM b2b_wallets WHERE id = ${opts.walletId} FOR UPDATE`);
  if (!lockedRow.rows[0]) throw new Error("Wallet not found");
  const wallet = lockedRow.rows[0] as any;

  const newAvailable = Number(wallet.available_cents) + opts.amountCents;
  const newLocked = Number(wallet.locked_cents) + (opts.lockedDelta || 0);

  if (newAvailable < 0) {
    const e: any = new Error("Insufficient available balance");
    e.code = "INSUFFICIENT_FUNDS";
    e.status = 402;
    throw e;
  }
  if (newLocked < 0) {
    throw new Error("Locked balance underflow");
  }

  await tx
    .update(b2bWallets)
    .set({
      availableCents: newAvailable,
      lockedCents: newLocked,
      updatedAt: new Date(),
    })
    .where(eq(b2bWallets.id, opts.walletId));

  try {
    const [row] = await tx
      .insert(b2bWalletTransactions)
      .values({
        walletId: opts.walletId,
        userId: opts.userId,
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
    return row;
  } catch (err: any) {
    // Unique violation on idempotency_key — replay; load and return the existing row.
    if (err?.code === "23505" && opts.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(b2bWalletTransactions)
        .where(eq(b2bWalletTransactions.idempotencyKey, opts.idempotencyKey))
        .limit(1);
      if (existing) {
        // We already incremented the wallet above; roll back our increment by re-fetching original.
        // Safer: throw a special signal and let the caller handle it. But because tx is open,
        // we throw and let outer .transaction() roll back, then caller calls a separate
        // idempotency lookup path. Simpler: throw a typed error.
        const replay: any = new Error("Idempotent replay");
        replay.code = "IDEMPOTENT_REPLAY";
        replay.existing = existing;
        throw replay;
      }
    }
    throw err;
  }
}

/**
 * Credit a deposit to the wallet. Idempotent via idempotencyKey (use stripe pi id, tx hash,
 * or admin-supplied reference). Returns the transaction row.
 */
export async function creditDeposit(input: {
  userId: string;
  amountCents: number;
  rail: DepositRail;
  idempotencyKey: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<{ transaction: B2bWalletTransaction; wallet: B2bWallet; replayed: boolean }> {
  if (input.amountCents <= 0) throw new Error("Deposit amount must be positive");

  // First check for idempotent replay outside the tx for a fast path.
  const existing = await db
    .select()
    .from(b2bWalletTransactions)
    .where(eq(b2bWalletTransactions.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing.length > 0) {
    const wallet = await getOrCreateWallet(input.userId);
    return { transaction: existing[0], wallet, replayed: true };
  }

  const wallet = await getOrCreateWallet(input.userId);

  const result = await db.transaction(async (tx) => {
    return writeTransaction(tx, {
      userId: input.userId,
      walletId: wallet.id,
      type: "deposit",
      amountCents: input.amountCents,
      referenceType: input.rail,
      referenceId: input.referenceId || null,
      idempotencyKey: input.idempotencyKey,
      description: input.description || `Deposit via ${input.rail}`,
      metadata: input.metadata || null,
    });
  }).catch(async (err: any) => {
    if (err?.code === "IDEMPOTENT_REPLAY") return err.existing as B2bWalletTransaction;
    throw err;
  });

  const refreshed = await db.select().from(b2bWallets).where(eq(b2bWallets.id, wallet.id)).limit(1);
  return { transaction: result, wallet: refreshed[0], replayed: false };
}

/**
 * Place a hold: atomically debit available_cents and credit locked_cents.
 * Returns 402 INSUFFICIENT_FUNDS if available is too low.
 */
export async function placeHold(input: {
  userId: string;
  amountCents: number;
  referenceType: string;
  referenceId?: string;
  expiresInHours?: number;
  metadata?: Record<string, any>;
}): Promise<{ hold: B2bWalletHold; transaction: B2bWalletTransaction }> {
  if (input.amountCents <= 0) throw new Error("Hold amount must be positive");

  const wallet = await getOrCreateWallet(input.userId);
  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 3600 * 1000)
    : null;

  return await db.transaction(async (tx) => {
    const [hold] = await tx
      .insert(b2bWalletHolds)
      .values({
        walletId: wallet.id,
        userId: input.userId,
        amountCents: input.amountCents,
        status: "open",
        referenceType: input.referenceType,
        referenceId: input.referenceId || null,
        expiresAt: expiresAt as any,
        metadata: input.metadata || null,
      })
      .returning();

    const transaction = await writeTransaction(tx, {
      userId: input.userId,
      walletId: wallet.id,
      type: "hold_placed",
      amountCents: -input.amountCents,
      lockedDelta: +input.amountCents,
      referenceType: "hold",
      referenceId: hold.id,
      idempotencyKey: `hold:${hold.id}`,
      description: `Hold placed for ${input.referenceType}${input.referenceId ? " #" + input.referenceId : ""}`,
    });

    return { hold, transaction };
  });
}

export async function releaseHold(input: {
  userId: string;
  holdId: string;
}): Promise<{ hold: B2bWalletHold; transaction: B2bWalletTransaction }> {
  return await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`SELECT * FROM b2b_wallet_holds WHERE id = ${input.holdId} FOR UPDATE`);
    const hold = rows.rows[0] as any;
    if (!hold) throw Object.assign(new Error("Hold not found"), { status: 404 });
    if (hold.user_id !== input.userId) {
      throw Object.assign(new Error("Hold does not belong to caller"), { status: 403 });
    }
    if (hold.status !== "open") {
      throw Object.assign(new Error(`Hold is ${hold.status}`), { status: 409 });
    }

    const amount = Number(hold.amount_cents);
    const transaction = await writeTransaction(tx, {
      userId: input.userId,
      walletId: hold.wallet_id,
      type: "hold_released",
      amountCents: +amount,
      lockedDelta: -amount,
      referenceType: "hold",
      referenceId: hold.id,
      idempotencyKey: `hold-release:${hold.id}`,
      description: `Hold released`,
    });

    const [updatedHold] = await tx
      .update(b2bWalletHolds)
      .set({ status: "released", releasedAt: new Date(), updatedAt: new Date() })
      .where(eq(b2bWalletHolds.id, hold.id))
      .returning();

    return { hold: updatedHold, transaction };
  });
}

export async function convertHoldToEscrow(input: {
  userId: string;
  holdId: string;
  escrowId: string;
}): Promise<{ hold: B2bWalletHold; transaction: B2bWalletTransaction }> {
  return await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`SELECT * FROM b2b_wallet_holds WHERE id = ${input.holdId} FOR UPDATE`);
    const hold = rows.rows[0] as any;
    if (!hold) throw Object.assign(new Error("Hold not found"), { status: 404 });
    if (hold.user_id !== input.userId) {
      throw Object.assign(new Error("Hold does not belong to caller"), { status: 403 });
    }
    if (hold.status !== "open") {
      throw Object.assign(new Error(`Hold is ${hold.status}`), { status: 409 });
    }

    const amount = Number(hold.amount_cents);
    // Convert: drain locked_cents (it stays out of available — escrow is off-wallet).
    const transaction = await writeTransaction(tx, {
      userId: input.userId,
      walletId: hold.wallet_id,
      type: "hold_converted_to_escrow",
      amountCents: 0, // available unchanged
      lockedDelta: -amount, // locked released; the amount now lives in escrow record
      referenceType: "escrow",
      referenceId: input.escrowId,
      idempotencyKey: `hold-convert:${hold.id}:${input.escrowId}`,
      description: `Hold converted to escrow`,
      metadata: { holdId: hold.id, escrowId: input.escrowId, amountCents: amount },
    });

    const [updatedHold] = await tx
      .update(b2bWalletHolds)
      .set({
        status: "converted",
        releasedAt: new Date(),
        convertedEscrowId: input.escrowId,
        updatedAt: new Date(),
      })
      .where(eq(b2bWalletHolds.id, hold.id))
      .returning();

    return { hold: updatedHold, transaction };
  });
}

export async function adminCreditReconcile(input: {
  targetUserId: string;
  adminId: string;
  amountCents: number;
  reference: string;
  proofObjectKey?: string;
  note?: string;
}): Promise<B2bWalletTransaction> {
  if (input.amountCents <= 0) throw new Error("Amount must be positive");
  const wallet = await getOrCreateWallet(input.targetUserId);
  const idem = `admin-recon:${input.reference}`;
  const result = await creditDeposit({
    userId: input.targetUserId,
    amountCents: input.amountCents,
    rail: "bank",
    idempotencyKey: idem,
    referenceId: input.reference,
    description: `Admin reconciled bank deposit: ${input.reference}`,
    metadata: {
      adminId: input.adminId,
      reference: input.reference,
      proofObjectKey: input.proofObjectKey || null,
      note: input.note || null,
      reconciledAt: new Date().toISOString(),
    },
  });
  void wallet;
  return result.transaction;
}

/** Approve a withdrawal: debit available (no refund). Idempotent on withdrawal id. */
export async function approveWithdrawal(input: {
  userId: string;
  withdrawalId: string;
  amountCents: number;
  adminId: string;
}): Promise<B2bWalletTransaction> {
  const wallet = await getOrCreateWallet(input.userId);
  return await db.transaction(async (tx) => {
    return writeTransaction(tx, {
      userId: input.userId,
      walletId: wallet.id,
      type: "withdrawal",
      amountCents: -input.amountCents,
      referenceType: "withdrawal",
      referenceId: input.withdrawalId,
      idempotencyKey: `withdrawal-approve:${input.withdrawalId}`,
      description: `Withdrawal paid out`,
      metadata: { adminId: input.adminId },
    });
  });
}

/** Bank-detail encryption helpers (AES-256-GCM). */
const ENC_SECRET = (() => {
  const raw = process.env.WALLET_BANK_DETAILS_KEY || process.env.SESSION_SECRET || "dev-wallet-bank-key-do-not-use-in-prod";
  return crypto.createHash("sha256").update(raw).digest();
})();

export function encryptBankDetails(plain: Record<string, any>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_SECRET, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptBankDetails(payload: string): Record<string, any> {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_SECRET, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  return JSON.parse(dec);
}

export { refreshPendingForWallet };
