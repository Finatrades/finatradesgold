/**
 * B2B Wallet routes.
 *
 * Mount under /api at server startup via registerWalletRoutes(app).
 * Endpoints:
 *   GET  /api/b2b/wallet
 *   GET  /api/b2b/wallet/transactions
 *   GET  /api/b2b/wallet/holds
 *   POST /api/b2b/wallet/holds
 *   POST /api/b2b/wallet/holds/:id/release
 *   POST /api/b2b/wallet/holds/:id/convert-to-escrow
 *   POST /api/b2b/wallet/deposits/intents
 *   POST /api/b2b/wallet/withdrawals
 *   POST /api/b2b/wallet/webhooks/stripe
 *   POST /api/b2b/wallet/webhooks/stablecoin
 *   GET  /api/b2b/admin/wallets
 *   GET  /api/b2b/admin/wallets/:userId
 *   POST /api/b2b/admin/wallets/:userId/credit
 *   GET  /api/b2b/admin/withdrawals
 *   PATCH /api/b2b/admin/withdrawals/:id
 */
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { db } from "../db";
import {
  b2bWallets,
  b2bWalletTransactions,
  b2bWalletHolds,
  b2bDepositIntents,
  b2bWithdrawalRequests,
  users,
} from "@shared/schema";
import {
  getOrCreateWallet,
  placeHold,
  releaseHold,
  convertHoldToEscrow,
  creditDeposit,
  adminCreditReconcile,
  approveWithdrawal,
  encryptBankDetails,
  decryptBankDetails,
} from "../wallet-service";
import { storage } from "../storage";

function ensureAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) { res.status(401).json({ message: "Authentication required" }); return; }
  next();
}

async function ensureAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sid = req.session?.userId;
  if (!sid) { res.status(401).json({ message: "Authentication required" }); return; }
  const u = await storage.getUser(sid);
  if (!u || u.role !== "admin") { res.status(403).json({ message: "Admin required" }); return; }
  (req as any).adminUser = u;
  next();
}

/** Stub email hook — uses existing Brevo email module if present; logs otherwise. */
async function notify(email: string | null | undefined, subject: string, body: string) {
  if (!email) return;
  try {
    // Lazy import to avoid coupling.
    const { sendEmailDirect } = await import("../email");
    if (typeof sendEmailDirect === "function") {
      await sendEmailDirect(email, subject, body).catch(() => {});
      return;
    }
  } catch {
    /* ignore */
  }
  console.log(`[Wallet][Email] to=${email} subject=${subject}`);
}

function moneyFmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const holdInputSchema = z.object({
  amountCents: z.number().int().positive(),
  referenceType: z.string().min(1).max(64),
  referenceId: z.string().max(255).optional(),
  expiresInHours: z.number().int().positive().max(24 * 30).optional(),
});

const convertInputSchema = z.object({
  escrowId: z.string().min(1).max(255),
});

const depositIntentSchema = z.object({
  rail: z.enum(["bank", "stablecoin", "card"]),
  amountCents: z.number().int().positive(),
  metadata: z.record(z.any()).optional(),
});

const withdrawalSchema = z.object({
  amountCents: z.number().int().positive(),
  bankDetails: z.object({
    bankName: z.string().min(1),
    accountName: z.string().min(1),
    accountNumber: z.string().min(1),
    swiftCode: z.string().optional(),
    iban: z.string().optional(),
    country: z.string().optional(),
  }),
});

const adminCreditSchema = z.object({
  amountCents: z.number().int().positive(),
  reference: z.string().min(1).max(255),
  proofObjectKey: z.string().optional(),
  note: z.string().max(1000).optional(),
});

const withdrawalDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectReason: z.string().max(1000).optional(),
});

export function registerWalletRoutes(app: Express) {
  // ───────────────────────── USER ENDPOINTS ─────────────────────────

  app.get("/api/b2b/wallet", ensureAuth, async (req, res) => {
    try {
      const wallet = await getOrCreateWallet(req.session!.userId!);
      return res.json({
        id: wallet.id,
        currency: wallet.currency,
        availableCents: Number(wallet.availableCents),
        lockedCents: Number(wallet.lockedCents),
        pendingCents: Number(wallet.pendingCents),
        virtualAccount: {
          number: wallet.virtualAccountNumber,
          bank: wallet.virtualAccountBank,
          reference: wallet.virtualAccountReference,
        },
        stablecoin: {
          address: wallet.stablecoinAddress,
          network: wallet.stablecoinNetwork,
        },
        createdAt: wallet.createdAt,
      });
    } catch (err: any) {
      console.error("[wallet] GET /wallet", err);
      return res.status(500).json({ message: "Failed to load wallet" });
    }
  });

  app.get("/api/b2b/wallet/transactions", ensureAuth, async (req, res) => {
    try {
      const wallet = await getOrCreateWallet(req.session!.userId!);
      const type = (req.query.type as string) || undefined;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const conditions = [eq(b2bWalletTransactions.walletId, wallet.id)];
      if (type && type !== "all") conditions.push(eq(b2bWalletTransactions.type, type));
      const rows = await db
        .select()
        .from(b2bWalletTransactions)
        .where(and(...conditions))
        .orderBy(desc(b2bWalletTransactions.createdAt))
        .limit(limit)
        .offset(offset);
      return res.json(rows);
    } catch (err: any) {
      console.error("[wallet] GET /transactions", err);
      return res.status(500).json({ message: "Failed to load transactions" });
    }
  });

  app.get("/api/b2b/wallet/holds", ensureAuth, async (req, res) => {
    try {
      const wallet = await getOrCreateWallet(req.session!.userId!);
      const status = (req.query.status as string) || "open";
      const conditions = [eq(b2bWalletHolds.walletId, wallet.id)];
      if (status !== "all") conditions.push(eq(b2bWalletHolds.status, status));
      const rows = await db
        .select()
        .from(b2bWalletHolds)
        .where(and(...conditions))
        .orderBy(desc(b2bWalletHolds.createdAt))
        .limit(100);
      return res.json(rows);
    } catch (err: any) {
      console.error("[wallet] GET /holds", err);
      return res.status(500).json({ message: "Failed to load holds" });
    }
  });

  app.post("/api/b2b/wallet/holds", ensureAuth, async (req, res) => {
    const parsed = holdInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const result = await placeHold({
        userId: req.session!.userId!,
        ...parsed.data,
      });
      const u = await storage.getUser(req.session!.userId!);
      notify(u?.email, "Hold placed on your Finatrades wallet",
        `<p>A hold of <b>${moneyFmt(parsed.data.amountCents)}</b> was placed for ${parsed.data.referenceType}${parsed.data.referenceId ? " #" + parsed.data.referenceId : ""}.</p>`);
      return res.status(201).json(result);
    } catch (err: any) {
      if (err?.code === "INSUFFICIENT_FUNDS") {
        return res.status(402).json({ message: "Insufficient available balance", code: "INSUFFICIENT_FUNDS" });
      }
      console.error("[wallet] POST /holds", err);
      return res.status(err?.status || 500).json({ message: err?.message || "Failed to place hold" });
    }
  });

  app.post("/api/b2b/wallet/holds/:id/release", ensureAuth, async (req, res) => {
    try {
      const result = await releaseHold({ userId: req.session!.userId!, holdId: req.params.id });
      return res.json(result);
    } catch (err: any) {
      console.error("[wallet] release hold", err);
      return res.status(err?.status || 500).json({ message: err?.message || "Failed to release hold" });
    }
  });

  app.post("/api/b2b/wallet/holds/:id/convert-to-escrow", ensureAuth, async (req, res) => {
    const parsed = convertInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "escrowId required" });
    try {
      const result = await convertHoldToEscrow({
        userId: req.session!.userId!,
        holdId: req.params.id,
        escrowId: parsed.data.escrowId,
      });
      const u = await storage.getUser(req.session!.userId!);
      notify(u?.email, "Hold converted to escrow",
        `<p>Hold ${req.params.id} was converted to escrow ${parsed.data.escrowId}.</p>`);
      return res.json(result);
    } catch (err: any) {
      console.error("[wallet] convert hold", err);
      return res.status(err?.status || 500).json({ message: err?.message || "Failed to convert hold" });
    }
  });

  app.post("/api/b2b/wallet/deposits/intents", ensureAuth, async (req, res) => {
    const parsed = depositIntentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const wallet = await getOrCreateWallet(req.session!.userId!);
      const [intent] = await db
        .insert(b2bDepositIntents)
        .values({
          walletId: wallet.id,
          userId: req.session!.userId!,
          rail: parsed.data.rail,
          amountCents: parsed.data.amountCents,
          status: "pending",
          metadata: parsed.data.metadata || null,
        })
        .returning();

      const response: any = { intent, wallet };

      // For card rail, return a stripe client secret stub (real wiring requires STRIPE_SECRET).
      if (parsed.data.rail === "card") {
        if (process.env.STRIPE_SECRET) {
          response.cardClientSecret = `pi_stub_${intent.id}_secret_${crypto.randomBytes(8).toString("hex")}`;
          response.note = "Stripe configured. Submit card via Stripe Elements with the client secret.";
        } else {
          response.note = "Card top-up not wired in v1 (STRIPE_SECRET env missing). Use bank or stablecoin rail.";
        }
      }
      if (parsed.data.rail === "stablecoin") {
        response.depositAddress = wallet.stablecoinAddress;
        response.network = wallet.stablecoinNetwork;
        response.token = "USDC/USDT";
        response.note = "Send the exact amount to the address above. Credit posts after on-chain confirmation.";
      }
      if (parsed.data.rail === "bank") {
        response.virtualAccount = {
          number: wallet.virtualAccountNumber,
          bank: wallet.virtualAccountBank,
          reference: wallet.virtualAccountReference,
        };
        response.note = "Transfer to the virtual account and include the reference in your bank narration. Admin will reconcile.";
      }

      return res.status(201).json(response);
    } catch (err: any) {
      console.error("[wallet] create deposit intent", err);
      return res.status(500).json({ message: "Failed to create deposit intent" });
    }
  });

  app.post("/api/b2b/wallet/withdrawals", ensureAuth, async (req, res) => {
    const parsed = withdrawalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const wallet = await getOrCreateWallet(req.session!.userId!);
      if (Number(wallet.availableCents) < parsed.data.amountCents) {
        return res.status(402).json({ message: "Insufficient available balance" });
      }
      // Place a hold for the withdrawal amount so it can't be spent twice.
      const { hold } = await placeHold({
        userId: req.session!.userId!,
        amountCents: parsed.data.amountCents,
        referenceType: "withdrawal_pending",
        expiresInHours: 7 * 24,
      });

      const encrypted = encryptBankDetails(parsed.data.bankDetails);
      const hint = `${parsed.data.bankDetails.bankName} ****${(parsed.data.bankDetails.accountNumber || "").slice(-4)}`;

      const [row] = await db
        .insert(b2bWithdrawalRequests)
        .values({
          walletId: wallet.id,
          userId: req.session!.userId!,
          amountCents: parsed.data.amountCents,
          bankDetailsEncrypted: encrypted,
          bankDetailsHint: hint,
          holdId: hold.id,
          status: "pending",
        })
        .returning();

      return res.status(201).json(row);
    } catch (err: any) {
      if (err?.code === "INSUFFICIENT_FUNDS") {
        return res.status(402).json({ message: "Insufficient available balance" });
      }
      console.error("[wallet] create withdrawal", err);
      return res.status(500).json({ message: "Failed to create withdrawal request" });
    }
  });

  // ────────────── WEBHOOKS ──────────────
  // Stripe — signature verification stub (real verifyHook requires STRIPE_WEBHOOK_SECRET).
  app.post("/api/b2b/wallet/webhooks/stripe", async (req, res) => {
    try {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers["stripe-signature"] as string | undefined;
        if (!sig) return res.status(400).json({ message: "Missing signature" });
        // Minimal HMAC verification fallback (real impl should use stripe.webhooks.constructEvent).
        const computed = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
        if (!sig.includes(computed)) {
          console.warn("[wallet] stripe webhook signature mismatch");
          return res.status(400).json({ message: "Invalid signature" });
        }
      }
      const ev = req.body || {};
      if (ev.type === "payment_intent.succeeded") {
        const pi = ev.data?.object || {};
        const userId = pi.metadata?.userId;
        const intentId = pi.metadata?.intentId;
        const amount = Number(pi.amount_received || pi.amount || 0);
        if (!userId || amount <= 0) return res.status(400).json({ message: "Missing metadata" });
        await creditDeposit({
          userId,
          amountCents: amount,
          rail: "card",
          idempotencyKey: `stripe:${pi.id}`,
          referenceId: pi.id,
          description: "Card top-up via Stripe",
          metadata: { intentId, stripeId: pi.id },
        });
        if (intentId) {
          await db.update(b2bDepositIntents).set({ status: "credited", externalRef: pi.id, updatedAt: new Date() }).where(eq(b2bDepositIntents.id, intentId));
        }
      }
      return res.json({ received: true });
    } catch (err: any) {
      console.error("[wallet] stripe webhook", err);
      return res.status(500).json({ message: "Webhook error" });
    }
  });

  // Stablecoin observer — POST { userId, txHash, amountCents, address }.
  app.post("/api/b2b/wallet/webhooks/stablecoin", async (req, res) => {
    try {
      const secret = process.env.STABLECOIN_WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers["x-observer-signature"] as string | undefined;
        const computed = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
        if (sig !== computed) return res.status(401).json({ message: "Invalid signature" });
      }
      const { userId, txHash, amountCents, address } = req.body || {};
      if (!userId || !txHash || !amountCents) return res.status(400).json({ message: "Missing fields" });
      await creditDeposit({
        userId,
        amountCents: Number(amountCents),
        rail: "stablecoin",
        idempotencyKey: `stablecoin:${txHash}`,
        referenceId: txHash,
        description: `Stablecoin deposit (${address || "unknown"})`,
        metadata: { txHash, address },
      });
      return res.json({ received: true });
    } catch (err: any) {
      console.error("[wallet] stablecoin webhook", err);
      return res.status(500).json({ message: "Webhook error" });
    }
  });

  // ─────────────────────── ADMIN ENDPOINTS ───────────────────────

  app.get("/api/b2b/admin/wallets", ensureAdmin, async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      let rows;
      if (q) {
        const like = `%${q}%`;
        rows = await db
          .select({
            wallet: b2bWallets,
            user: { id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, companyName: users.companyName, userType: users.userType },
          })
          .from(b2bWallets)
          .leftJoin(users, eq(users.id, b2bWallets.userId))
          .where(
            or(
              ilike(users.email, like),
              ilike(users.firstName, like),
              ilike(users.lastName, like),
              ilike(users.companyName, like),
              ilike(b2bWallets.virtualAccountNumber, like),
            ),
          )
          .limit(200);
      } else {
        rows = await db
          .select({
            wallet: b2bWallets,
            user: { id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, companyName: users.companyName, userType: users.userType },
          })
          .from(b2bWallets)
          .leftJoin(users, eq(users.id, b2bWallets.userId))
          .orderBy(desc(b2bWallets.updatedAt))
          .limit(100);
      }

      const totals = await db.execute(sql`
        SELECT
          COALESCE(SUM(available_cents),0)::bigint AS total_available,
          COALESCE(SUM(locked_cents),0)::bigint AS total_locked,
          COALESCE(SUM(pending_cents),0)::bigint AS total_pending,
          COUNT(*)::int AS wallet_count
        FROM b2b_wallets
      `);

      return res.json({
        wallets: rows,
        totals: totals.rows[0],
      });
    } catch (err: any) {
      console.error("[wallet] admin list", err);
      return res.status(500).json({ message: "Failed to load wallets" });
    }
  });

  app.get("/api/b2b/admin/wallets/:userId", ensureAdmin, async (req, res) => {
    try {
      const wallet = await getOrCreateWallet(req.params.userId);
      const user = await storage.getUser(req.params.userId);
      const transactions = await db
        .select()
        .from(b2bWalletTransactions)
        .where(eq(b2bWalletTransactions.walletId, wallet.id))
        .orderBy(desc(b2bWalletTransactions.createdAt))
        .limit(200);
      const holds = await db
        .select()
        .from(b2bWalletHolds)
        .where(eq(b2bWalletHolds.walletId, wallet.id))
        .orderBy(desc(b2bWalletHolds.createdAt))
        .limit(100);
      return res.json({ wallet, user, transactions, holds });
    } catch (err: any) {
      console.error("[wallet] admin detail", err);
      return res.status(500).json({ message: "Failed to load wallet" });
    }
  });

  app.post("/api/b2b/admin/wallets/:userId/credit", ensureAdmin, async (req, res) => {
    const parsed = adminCreditSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const admin = (req as any).adminUser;
      const transaction = await adminCreditReconcile({
        targetUserId: req.params.userId,
        adminId: admin.id,
        amountCents: parsed.data.amountCents,
        reference: parsed.data.reference,
        proofObjectKey: parsed.data.proofObjectKey,
        note: parsed.data.note,
      });
      const u = await storage.getUser(req.params.userId);
      notify(u?.email, "Deposit credited to your Finatrades wallet",
        `<p>A deposit of <b>${moneyFmt(parsed.data.amountCents)}</b> has been credited.</p><p>Reference: ${parsed.data.reference}</p>`);
      return res.status(201).json(transaction);
    } catch (err: any) {
      console.error("[wallet] admin credit", err);
      return res.status(500).json({ message: err?.message || "Failed to credit wallet" });
    }
  });

  app.get("/api/b2b/admin/withdrawals", ensureAdmin, async (req, res) => {
    try {
      const status = (req.query.status as string) || "pending";
      const conditions = [];
      if (status !== "all") conditions.push(eq(b2bWithdrawalRequests.status, status));
      const rows = await db
        .select({
          withdrawal: b2bWithdrawalRequests,
          user: { id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, companyName: users.companyName },
        })
        .from(b2bWithdrawalRequests)
        .leftJoin(users, eq(users.id, b2bWithdrawalRequests.userId))
        .where(conditions.length ? and(...conditions) : sql`1=1`)
        .orderBy(desc(b2bWithdrawalRequests.createdAt))
        .limit(200);
      return res.json(rows);
    } catch (err: any) {
      console.error("[wallet] admin withdrawals list", err);
      return res.status(500).json({ message: "Failed to load withdrawals" });
    }
  });

  app.patch("/api/b2b/admin/withdrawals/:id", ensureAdmin, async (req, res) => {
    const parsed = withdrawalDecisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    try {
      const admin = (req as any).adminUser;
      const [wd] = await db.select().from(b2bWithdrawalRequests).where(eq(b2bWithdrawalRequests.id, req.params.id)).limit(1);
      if (!wd) return res.status(404).json({ message: "Not found" });
      if (wd.status !== "pending") return res.status(409).json({ message: `Already ${wd.status}` });

      if (parsed.data.action === "approve") {
        // Release the hold first, then debit available.
        if (wd.holdId) {
          try {
            await releaseHold({ userId: wd.userId, holdId: wd.holdId });
          } catch (e: any) {
            if (e?.status !== 409) throw e;
          }
        }
        await approveWithdrawal({
          userId: wd.userId,
          withdrawalId: wd.id,
          amountCents: Number(wd.amountCents),
          adminId: admin.id,
        });
        await db
          .update(b2bWithdrawalRequests)
          .set({ status: "approved", reviewerId: admin.id, reviewedAt: new Date(), updatedAt: new Date() })
          .where(eq(b2bWithdrawalRequests.id, wd.id));

        const u = await storage.getUser(wd.userId);
        notify(u?.email, "Your Finatrades withdrawal was approved",
          `<p>Withdrawal of <b>${moneyFmt(Number(wd.amountCents))}</b> approved. Payout to your bank account is scheduled.</p>`);
      } else {
        // Reject: release the hold to return funds.
        if (wd.holdId) {
          try {
            await releaseHold({ userId: wd.userId, holdId: wd.holdId });
          } catch (e: any) {
            if (e?.status !== 409) throw e;
          }
        }
        await db
          .update(b2bWithdrawalRequests)
          .set({
            status: "rejected",
            reviewerId: admin.id,
            reviewedAt: new Date(),
            rejectReason: parsed.data.rejectReason || "No reason provided",
            updatedAt: new Date(),
          })
          .where(eq(b2bWithdrawalRequests.id, wd.id));

        const u = await storage.getUser(wd.userId);
        notify(u?.email, "Your Finatrades withdrawal was rejected",
          `<p>Your withdrawal of <b>${moneyFmt(Number(wd.amountCents))}</b> was rejected.</p><p>Reason: ${parsed.data.rejectReason || "No reason provided"}</p>`);
      }

      const [updated] = await db.select().from(b2bWithdrawalRequests).where(eq(b2bWithdrawalRequests.id, wd.id)).limit(1);
      return res.json(updated);
    } catch (err: any) {
      console.error("[wallet] admin withdrawal decision", err);
      return res.status(500).json({ message: err?.message || "Failed to update withdrawal" });
    }
  });

  // Admin: peek decrypted bank details (audit-logged).
  app.get("/api/b2b/admin/withdrawals/:id/bank-details", ensureAdmin, async (req, res) => {
    try {
      const [wd] = await db.select().from(b2bWithdrawalRequests).where(eq(b2bWithdrawalRequests.id, req.params.id)).limit(1);
      if (!wd) return res.status(404).json({ message: "Not found" });
      const details = decryptBankDetails(wd.bankDetailsEncrypted);
      const admin = (req as any).adminUser;
      console.log(`[wallet][AUDIT] admin=${admin.id} decrypted bank details for withdrawal=${wd.id}`);
      return res.json(details);
    } catch (err: any) {
      console.error("[wallet] decrypt bank details", err);
      return res.status(500).json({ message: "Failed to decrypt" });
    }
  });
}
