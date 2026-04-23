# Wingold SSO Integration Guide

This guide explains how to add SSO login support to the Wingold platform so users from Finatrades can seamlessly log in.

**Security Model:** RSA Asymmetric Cryptography (RS256)
- Finatrades holds the PRIVATE key (signs tokens)
- Wingold only needs the PUBLIC key (verifies tokens)
- Wingold CANNOT forge tokens even if compromised

## Finatrades Public Key

Copy this public key and save it as `SSO_PUBLIC_KEY` in Wingold's Secrets:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1nNPcfGib5JbG9a9N7p/
KAvw3T06h4Xe3GZSey0kgW2c6EGSKSeu5w2xtdxyE27wZ18H9QXgQeorFcbqUDXI
qyLLnaa07fqBVTezQyrjg1m0pPrpfdky7WiVwnGfzSWOTpMTa9Ytgk6LtIlJtWh2
Lr8r7pGmjqSfuiv859IKFRZGXgE12sWGaPq5AazeK0EcM6JgPv2OK4+pU3z7Lrdz
UUtHoXeeTNv8xU/Alt/z0w2JUiK11lKgFgANaPIakkQI9vPLtWLIhWsplhIVHVCY
s821vOPZRLIeVeknNw9bM592n3F/KDAdYVbFWLS5RL8BdZG4GArambNXVqZWzSNk
BQIDAQAB
-----END PUBLIC KEY-----
```

## Step 1: Install jsonwebtoken

In your Wingold Replit, run:
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

## Step 2: Set Environment Variable

In Wingold's Secrets tab, add:
- **Key:** `SSO_PUBLIC_KEY`
- **Value:** The public key above (copy the entire block including BEGIN/END lines)

**TIP:** When pasting multi-line keys in Replit secrets, replace newlines with `\n`:
```
-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1nNPcfGib5JbG9a9N7p/\nKAvw3T06h4Xe3GZSey0kgW2c6EGSKSeu5w2xtdxyE27wZ18H9QXgQeorFcbqUDXI\nqyLLnaa07fqBVTezQyrjg1m0pPrpfdky7WiVwnGfzSWOTpMTa9Ytgk6LtIlJtWh2\nLr8r7pGmjqSfuiv859IKFRZGXgE12sWGaPq5AazeK0EcM6JgPv2OK4+pU3z7Lrdz\nUUtHoXeeTNv8xU/Alt/z0w2JUiK11lKgFgANaPIakkQI9vPLtWLIhWsplhIVHVCY\ns821vOPZRLIeVeknNw9bM592n3F/KDAdYVbFWLS5RL8BdZG4GArambNXVqZWzSNk\nBQIDAQAB\n-----END PUBLIC KEY-----
```

## Step 3: Add SSO Route to Wingold

Create a new file `server/sso-routes.ts`:

```typescript
/**
 * SSO Routes - Accept login from Finatrades
 * Uses RSA public key verification (RS256)
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";

const router = Router();

function getPublicKey(): string {
  const publicKey = process.env.SSO_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("SSO_PUBLIC_KEY environment variable is required");
  }
  return publicKey.replace(/\\n/g, '\n');
}

interface SSOPayload {
  sub: string;           // Finatrades user ID
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  accountType: string;
  source: string;        // Always "finatrades"
  iat: number;
  exp: number;
}

// SSO Login endpoint - Finatrades redirects users here
router.get("/sso-login", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.redirect("/login?error=missing_token");
    }

    // Verify the token using PUBLIC key (RS256)
    let payload: SSOPayload;
    try {
      payload = jwt.verify(token, getPublicKey(), {
        algorithms: ["RS256"],
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

## Step 4: Register SSO Routes

In your main routes file (e.g., `server/routes.ts` or `server/index.ts`), add:

```typescript
import { registerSsoRoutes } from "./sso-routes";

// In your registerRoutes function:
registerSsoRoutes(app);
```

## Step 5: Add Schema Fields (if needed)

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
- Uses RS256 asymmetric encryption (Wingold cannot forge tokens)
- Always use HTTPS in production
- Public key can be safely shared - only Finatrades can sign tokens
