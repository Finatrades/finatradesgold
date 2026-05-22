import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bListingsTable = pgTable("b2b_listings", {
  id: text("id").primaryKey(),
  inventoryId: text("inventory_id").notNull(),
  commodityType: text("commodity_type").notNull(),
  grade: text("grade"),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  pricePerUnit: real("price_per_unit").notNull(),
  currency: text("currency").notNull().default("FUSD"),
  hubId: text("hub_id").notNull(),
  sellerId: text("seller_id").notNull(),
  incoterms: text("incoterms").notNull(),
  status: text("status", { enum: ["active", "reserved", "sold", "expired"] }).notNull().default("active"),
  certifications: text("certifications").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertB2bListingSchema = createInsertSchema(b2bListingsTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bListing = z.infer<typeof insertB2bListingSchema>;
export type B2bListing = typeof b2bListingsTable.$inferSelect;
