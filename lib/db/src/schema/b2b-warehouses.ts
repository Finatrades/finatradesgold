import { pgTable, text, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bWarehousesTable = pgTable("b2b_warehouses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  totalCapacity: real("total_capacity").notNull(),
  availableCapacity: real("available_capacity").notNull(),
  storageType: text("storage_type", { enum: ["bulk_silo", "cold_storage", "bonded", "general"] }).notNull(),
  operator: text("operator").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  commodities: text("commodities").array().notNull().default([]),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertB2bWarehouseSchema = createInsertSchema(b2bWarehousesTable).omit({ createdAt: true });
export type InsertB2bWarehouse = z.infer<typeof insertB2bWarehouseSchema>;
export type B2bWarehouse = typeof b2bWarehousesTable.$inferSelect;
