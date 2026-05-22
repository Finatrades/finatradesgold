import { Router } from "express";
import { db } from "@workspace/db";
import {
  b2bUsersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const router = Router();

router.post("/api/b2b/auth/register", async (req, res) => {
  try {
    const { email, password, fullName, role, phone, companyName } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: "email, password, fullName, and role are required" });
    }
    const existing = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const id = randomUUID();
    const [user] = await db.insert(b2bUsersTable).values({
      id,
      email,
      passwordHash,
      fullName,
      role,
      phone: phone ?? null,
      companyName: companyName ?? null,
    }).returning();

    req.session.userId = `b2b:${user.id}`;
    req.session.userRole = "user";

    const { passwordHash: _ph, ...safeUser } = user;
    return res.status(201).json({
      user: { ...safeUser, onboardingStep: safeUser.onboardingStep, onboardingComplete: safeUser.onboardingComplete },
      token: `b2b_session_${user.id}`,
      message: "Registration successful",
    });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/api/b2b/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.userId = `b2b:${user.id}`;
    req.session.userRole = "user";

    const { passwordHash: _ph, ...safeUser } = user;
    return res.json({
      user: safeUser,
      token: `b2b_session_${user.id}`,
      message: "Login successful",
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/api/b2b/auth/logout", (req, res) => {
  req.session.destroy(() => {});
  return res.json({ message: "Logged out successfully" });
});

router.get("/api/b2b/auth/me", async (req, res) => {
  try {
    const sessionUserId = req.session?.userId;
    if (!sessionUserId?.startsWith("b2b:")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const userId = sessionUserId.replace("b2b:", "");
    const [user] = await db.select().from(b2bUsersTable).where(eq(b2bUsersTable.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { passwordHash: _ph, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
