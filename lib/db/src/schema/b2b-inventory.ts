import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bInventoryTable = pgTable("b2b_inventory", {
  id: text("id").primaryKey(),
  inventoryRef: text("inventory_ref").notNull().unique(),
  consignmentId: text("consignment_id").notNull(),
  ownerId: text("owner_id").notNull(),
  commodityType: text("commodity_type").notNull(),
  grade: text("grade"),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  grossWeight: real("gross_weight"),
  netWeight: real("net_weight"),
  warehouseId: text("warehouse_id").notNull(),
  status: text("status", { enum: ["available", "reserved", "pledged", "released", "sold"] }).notNull().default("available"),
  fusdValue: real("fusd_value").notNull().default(0),
  fusdPerUnit: real("fusd_per_unit").notNull().default(0),
  inspectionStatus: text("inspection_status", { enum: ["pending", "passed", "failed"] }).notNull().default("pending"),
  moisturePercent: real("moisture_percent"),
  qualityGrade: text("quality_grade"),
  warehouseReceiptUrl: text("warehouse_receipt_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertB2bInventorySchema = createInsertSchema(b2bInventoryTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bInventory = z.infer<typeof insertB2bInventorySchema>;
export type B2bInventory = typeof b2bInventoryTable.$inferSelect;
