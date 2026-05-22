import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bCommoditiesTable = pgTable("b2b_commodities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: ["grains", "oil_gas", "minerals", "food", "fertilizer", "other"] }).notNull(),
  unit: text("unit").notNull(),
  hsCode: text("hs_code").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertB2bCommoditySchema = createInsertSchema(b2bCommoditiesTable).omit({ createdAt: true });
export type InsertB2bCommodity = z.infer<typeof insertB2bCommoditySchema>;
export type B2bCommodity = typeof b2bCommoditiesTable.$inferSelect;
