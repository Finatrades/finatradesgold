import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bUsersTable = pgTable("b2b_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["exporter", "importer", "government"] }).notNull(),
  companyName: text("company_name"),
  phone: text("phone"),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  kycStatus: text("kyc_status", { enum: ["pending", "under_review", "approved", "rejected"] }).notNull().default("pending"),
  approvalDate: timestamp("approval_date", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertB2bUserSchema = createInsertSchema(b2bUsersTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bUser = z.infer<typeof insertB2bUserSchema>;
export type B2bUser = typeof b2bUsersTable.$inferSelect;
