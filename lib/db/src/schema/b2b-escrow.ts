import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bEscrowAccountsTable = pgTable("b2b_escrow_accounts", {
  id: text("id").primaryKey(),
  escrowRef: text("escrow_ref").notNull().unique(),
  orderId: text("order_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("FUSD"),
  fusdLockId: text("fusd_lock_id"),
  status: text("status", {
    enum: ["pending", "locked", "conditions_pending", "released", "settled", "disputed"],
  }).notNull().default("pending"),
  lockDate: text("lock_date"),
  releaseDate: text("release_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const b2bEscrowMilestonesTable = pgTable("b2b_escrow_milestones", {
  id: text("id").primaryKey(),
  escrowId: text("escrow_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "verified", "completed"] }).notNull().default("pending"),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertB2bEscrowAccountSchema = createInsertSchema(b2bEscrowAccountsTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bEscrowAccount = z.infer<typeof insertB2bEscrowAccountSchema>;
export type B2bEscrowAccount = typeof b2bEscrowAccountsTable.$inferSelect;

export const insertB2bEscrowMilestoneSchema = createInsertSchema(b2bEscrowMilestonesTable).omit({ createdAt: true });
export type InsertB2bEscrowMilestone = z.infer<typeof insertB2bEscrowMilestoneSchema>;
export type B2bEscrowMilestone = typeof b2bEscrowMilestonesTable.$inferSelect;
