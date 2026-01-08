# Wingold SSO Integration Guide

This guide explains how to add SSO login support to the Wingold platform so users from Finatrades can seamlessly log in.

## Step 1: Install jsonwebtoken

In your Wingold Replit, run:
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

## Step 2: Add SSO Route to Wingold

Create a new file `server/sso-routes.ts` (or add to your existing routes):

```typescript
/**
 * SSO Routes - Accept login from Finatrades
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

const router = Router();

// IMPORTANT: SSO_SHARED_SECRET is REQUIRED - SSO will not work without it
// This MUST match the secret set in Finatrades
function getSsoSecret(): string {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) {
    throw new Error("SSO_SHARED_SECRET environment variable is required");
  }
  return secret;
}

const FINATRADES_URL = "https://yourfinatradesreplit.replit.app";

interface SSOPayload {
  sub: string;           // Finatrades user ID
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  accountType: string;
  source: string;        // Always "finatrades"
  iat: number;
}

// SSO Login endpoint - Finatrades redirects users here
router.get("/sso-login", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.redirect("/login?error=missing_token");
    }

    // Verify the token
    let payload: SSOPayload;
    try {
      payload = jwt.verify(token, getSsoSecret(), {
        issuer: "finatrades.com",
        audience: "wingoldandmetals.com"
      }) as SSOPayload;
    } catch (err: any) {
      console.error("SSO token verification failed:", err.message);
      if (err.name === 'TokenExpiredError') {
        return res.redirect("/login?error=token_expired");
      }
      return res.redirect("/login?error=invalid_token");
    }

    // Verify source
    if (payload.source !== "finatrades") {
      return res.redirect("/login?error=invalid_source");
    }

    // Find or create user by email
    let user = await db.query.users.findFirst({
      where: eq(users.email, payload.email),
    });

    if (!user) {
      // Create new user from Finatrades data
      const [newUser] = await db.insert(users).values({
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        password: "", // SSO users don't need password
        finatradesId: payload.sub, // Link to Finatrades account
        accountType: payload.accountType,
        ssoProvider: "finatrades",
        emailVerified: true, // Already verified on Finatrades
      }).returning();
      user = newUser;
    } else {
      // Update finatradesId if not set
      if (!user.finatradesId) {
        await db.update(users)
          .set({ finatradesId: payload.sub })
          .where(eq(users.id, user.id));
      }
    }

    // Create session for the user
    (req as any).session.userId = user.id;
    (req as any).session.userEmail = user.email;
    (req as any).session.userRole = user.role || "user";
    
    await new Promise((resolve, reject) => {
      (req as any).session.save((err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    console.log(`SSO login successful for ${payload.email} from Finatrades`);
    
    // Redirect to dashboard
    res.redirect("/dashboard");
    
  } catch (error: any) {
    console.error("SSO login error:", error);
    res.redirect("/login?error=sso_failed");
  }
});

// Optional: API endpoint to verify SSO status
router.get("/api/sso/status", (req, res) => {
  const session = (req as any).session;
  res.json({
    authenticated: !!session?.userId,
    ssoEnabled: true,
    providers: ["finatrades"]
  });
});

export function registerSsoRoutes(app: any) {
  app.use(router);
}
```

## Step 3: Register SSO Routes

In your main routes file (e.g., `server/routes.ts` or `server/index.ts`), add:

```typescript
import { registerSsoRoutes } from "./sso-routes";

// In your registerRoutes function:
registerSsoRoutes(app);
```

## Step 4: Add Schema Fields (if needed)

If your users table doesn't have these fields, add them to `shared/schema.ts`:

```typescript
// Add to your users table definition
finatradesId: text("finatrades_id"),
ssoProvider: text("sso_provider"),
```

Then run migrations:
```bash
npx drizzle-kit push
```

## Step 5: Environment Variable (REQUIRED)

**CRITICAL SECURITY REQUIREMENT:** You MUST set the shared secret in Wingold's Secrets.

**Do NOT use hardcoded fallback values - the SSO will fail without this secret.**

Set the shared secret in Wingold's Secrets:
- **Key:** `SSO_SHARED_SECRET`
- **Value:** Generate a secure random string (minimum 32 characters)

Example to generate a secure secret:
```bash
openssl rand -base64 32
```

**IMPORTANT:** Use the SAME secret value on both Finatrades and Wingold platforms.

## Step 6: Handle Login Page Errors (Optional)

Update your login page to show SSO error messages:

```tsx
// In your login component
const searchParams = new URLSearchParams(window.location.search);
const error = searchParams.get('error');

if (error === 'token_expired') {
  toast.error('Session expired. Please log in from Finatrades again.');
} else if (error === 'invalid_token') {
  toast.error('Invalid authentication. Please try again.');
}
```

## Testing

1. Log into Finatrades
2. Click "Wingold Portal" button on Dashboard
3. You should be automatically logged into Wingold

## Security Notes

- Tokens expire after 5 minutes
- Always use HTTPS in production
- Change the SSO_SHARED_SECRET to a strong random value
- Consider IP validation for additional security
