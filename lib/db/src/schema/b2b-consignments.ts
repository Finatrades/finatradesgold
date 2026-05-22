import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bConsignmentsTable = pgTable("b2b_consignments", {
  id: text("id").primaryKey(),
  consignmentRef: text("consignment_ref").notNull().unique(),
  sellerId: text("seller_id").notNull(),
  commodityType: text("commodity_type").notNull(),
  grade: text("grade"),
  quantity: real("quantity").notNull(),
  unit: text("unit", { enum: ["MT", "KG", "Liters", "Barrels"] }).notNull(),
  packaging: text("packaging"),
  warehouseId: text("warehouse_id").notNull(),
  originCountry: text("origin_country").notNull(),
  incoterms: text("incoterms").notNull(),
  transportMode: text("transport_mode", { enum: ["sea_freight", "air_cargo", "road", "rail"] }),
  expectedArrival: text("expected_arrival").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["draft", "submitted", "awaiting_verification", "compliance_check", "booking_confirmed", "in_transit", "arrived", "verified", "ready_for_trade"],
  }).notNull().default("draft"),
  documents: text("documents").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertB2bConsignmentSchema = createInsertSchema(b2bConsignmentsTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bConsignment = z.infer<typeof insertB2bConsignmentSchema>;
export type B2bConsignment = typeof b2bConsignmentsTable.$inferSelect;
