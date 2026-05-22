import { Router } from "express";
import { db } from "@workspace/db";
import {
  b2bUsersTable,
  b2bCompanyProfilesTable,
  b2bOnboardingDocumentsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function getB2bUserId(req: any): string | null {
  const s = req.session?.userId as string | undefined;
  if (!s?.startsWith("b2b:")) return null;
  return s.replace("b2b:", "");
}

router.get("/api/b2b/onboarding/status", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const docs = await db.select().from(b2bOnboardingDocumentsTable).where(eq(b2bOnboardingDocumentsTable.userId, userId));
    const completedSteps: number[] = [];
    if (user.onboardingStep > 1) completedSteps.push(1, 2, 3);
    if (user.onboardingStep > 4) completedSteps.push(4);
    if (docs.length > 0) completedSteps.push(5);

    return res.json({
      currentStep: user.onboardingStep,
      totalSteps: 6,
      completedSteps,
      kycStatus: user.kycStatus,
      approvalDate: user.approvalDate?.toISOString() ?? null,
      rejectionReason: user.rejectionReason ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get onboarding status" });
  }
});

router.post("/api/b2b/onboarding/company-profile", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { companyName, registrationNumber, country, address, website, taxId, businessType } = req.body;

    const existing = await db.select().from(b2bCompanyProfilesTable).where(eq(b2bCompanyProfilesTable.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(b2bCompanyProfilesTable).set({ companyName, registrationNumber, country, address, website, taxId, businessType }).where(eq(b2bCompanyProfilesTable.userId, userId));
    } else {
      await db.insert(b2bCompanyProfilesTable).values({
        id: randomUUID(),
        userId,
        companyName,
        registrationNumber,
        country,
        address,
        website,
        taxId,
        businessType,
      });
    }

    await db.update(b2bUsersTable).set({
      companyName,
      onboardingStep: 5,
      kycStatus: "under_review",
    }).where(eq(b2bUsersTable.id, userId));

    return res.json({
      currentStep: 5,
      totalSteps: 6,
      completedSteps: [1, 2, 3, 4],
      kycStatus: "under_review",
      approvalDate: null,
      rejectionReason: null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save company profile" });
  }
});

router.get("/api/b2b/onboarding/documents", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const docs = await db.select().from(b2bOnboardingDocumentsTable).where(eq(b2bOnboardingDocumentsTable.userId, userId));
    return res.json(docs.map(d => ({
      id: d.id,
      documentType: d.documentType,
      status: d.status,
      uploadedAt: d.uploadedAt.toISOString(),
      notes: d.notes ?? null,
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to get documents" });
  }
});

router.post("/api/b2b/onboarding/documents", async (req, res) => {
  try {
    const userId = getB2bUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { documentType, documentUrl, notes } = req.body;

    await db.insert(b2bOnboardingDocumentsTable).values({
      id: randomUUID(),
      userId,
      documentType,
      documentUrl,
      notes: notes ?? null,
    });

    await db.update(b2bUsersTable).set({ onboardingStep: 6 }).where(eq(b2bUsersTable.id, userId));

    return res.json({
      currentStep: 6,
      totalSteps: 6,
      completedSteps: [1, 2, 3, 4, 5],
      kycStatus: "under_review",
      approvalDate: null,
      rejectionReason: null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit document" });
  }
});

export default router;
