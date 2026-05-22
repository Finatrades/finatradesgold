import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const b2bCompanyProfilesTable = pgTable("b2b_company_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  companyName: text("company_name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  country: text("country").notNull(),
  address: text("address").notNull(),
  website: text("website"),
  taxId: text("tax_id"),
  businessType: text("business_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const b2bOnboardingDocumentsTable = pgTable("b2b_onboarding_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  documentType: text("document_type", {
    enum: ["government_id", "proof_of_address", "business_registration", "tax_id", "bank_statement", "shareholder_details", "beneficial_ownership", "authority_letter"],
  }).notNull(),
  documentUrl: text("document_url").notNull(),
  status: text("status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertB2bCompanyProfileSchema = createInsertSchema(b2bCompanyProfilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertB2bCompanyProfile = z.infer<typeof insertB2bCompanyProfileSchema>;
export type B2bCompanyProfile = typeof b2bCompanyProfilesTable.$inferSelect;

export const insertB2bOnboardingDocumentSchema = createInsertSchema(b2bOnboardingDocumentsTable).omit({ uploadedAt: true });
export type InsertB2bOnboardingDocument = z.infer<typeof insertB2bOnboardingDocumentSchema>;
export type B2bOnboardingDocument = typeof b2bOnboardingDocumentsTable.$inferSelect;
