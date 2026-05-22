import { pgTable, text, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bRfqsTable = pgTable("b2b_rfqs", {
  id: text("id").primaryKey(),
  rfqRef: text("rfq_ref").notNull().unique(),
  buyerId: text("buyer_id").notNull(),
  commodityType: text("commodity_type").notNull(),
  grade: text("grade"),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  hubId: text("hub_id").notNull(),
  targetPricePerUnit: real("target_price_per_unit"),
  currency: text("currency").notNull().default("FUSD"),
  deliveryTerms: text("delivery_terms").notNull(),
  attachments: text("attachments"),
  status: text("status", {
    enum: ["open", "offers_received", "negotiating", "confirmed", "converted", "expired", "cancelled"],
  }).notNull().default("open"),
  expiresAt: text("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const b2bOffersTable = pgTable("b2b_offers", {
  id: text("id").primaryKey(),
  rfqId: text("rfq_id").notNull(),
  sellerId: text("seller_id").notNull(),
  pricePerUnit: real("price_per_unit").notNull(),
  currency: text("currency").notNull().default("FUSD"),
  availableQuantity: real("available_quantity").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  inventoryId: text("inventory_id"),
  terms: text("terms"),
  validUntil: text("valid_until"),
  status: text("status", { enum: ["pending", "accepted", "rejected", "expired"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertB2bRfqSchema = createInsertSchema(b2bRfqsTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bRfq = z.infer<typeof insertB2bRfqSchema>;
export type B2bRfq = typeof b2bRfqsTable.$inferSelect;

export const insertB2bOfferSchema = createInsertSchema(b2bOffersTable).omit({ createdAt: true });
export type InsertB2bOffer = z.infer<typeof insertB2bOfferSchema>;
export type B2bOffer = typeof b2bOffersTable.$inferSelect;
