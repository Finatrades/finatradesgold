import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bOrdersTable = pgTable("b2b_trade_orders", {
  id: text("id").primaryKey(),
  orderRef: text("order_ref").notNull().unique(),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  listingId: text("listing_id"),
  rfqId: text("rfq_id"),
  commodity: text("commodity").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalValue: real("total_value").notNull(),
  currency: text("currency").notNull().default("FUSD"),
  warehouseId: text("warehouse_id").notNull(),
  fundingMethod: text("funding_method", {
    enum: ["bank_transfer", "stablecoin", "corporate_account", "escrow_deposit"],
  }),
  incoterms: text("incoterms"),
  deliveryWindow: text("delivery_window"),
  status: text("status", {
    enum: ["pending", "terms_agreed", "payment_pending", "payment_confirmed", "inventory_reserved", "escrow_locked", "delivery_in_progress", "delivered", "completed", "cancelled"],
  }).notNull().default("pending"),
  escrowId: text("escrow_id"),
  fusdReference: text("fusd_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertB2bOrderSchema = createInsertSchema(b2bOrdersTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bOrder = z.infer<typeof insertB2bOrderSchema>;
export type B2bOrder = typeof b2bOrdersTable.$inferSelect;
