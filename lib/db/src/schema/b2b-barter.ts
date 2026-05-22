import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bBarterRequestsTable = pgTable("b2b_barter_requests", {
  id: text("id").primaryKey(),
  barterRef: text("barter_ref").notNull().unique(),
  requesterId: text("requester_id").notNull(),
  governmentEntity: text("government_entity").notNull(),
  offeredCommodity: text("offered_commodity").notNull(),
  offeredQuantity: real("offered_quantity").notNull(),
  offeredUnit: text("offered_unit").notNull().default("MT"),
  offeredFusdValue: real("offered_fusd_value"),
  requiredCommodity: text("required_commodity").notNull(),
  requiredQuantity: real("required_quantity").notNull(),
  requiredUnit: text("required_unit").notNull().default("MT"),
  requiredFusdValue: real("required_fusd_value"),
  settlementGap: real("settlement_gap"),
  mandate: text("mandate"),
  deliveryTerms: text("delivery_terms").notNull(),
  objectives: text("objectives"),
  expectedSettlementDate: text("expected_settlement_date"),
  status: text("status", {
    enum: ["draft", "submitted", "sovereign_verified", "counterparty_matching", "negotiating", "terms_agreed", "execution", "monitoring", "completed", "cancelled"],
  }).notNull().default("draft"),
  approvalStatus: text("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertB2bBarterRequestSchema = createInsertSchema(b2bBarterRequestsTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bBarterRequest = z.infer<typeof insertB2bBarterRequestSchema>;
export type B2bBarterRequest = typeof b2bBarterRequestsTable.$inferSelect;
