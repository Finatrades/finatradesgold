# Wingold & Metals Integration Guide

This document explains the SSO integration between Finatrades and Wingold & Metals for the redirect-based checkout flow.

## Overview

Finatrades users can purchase physical gold bars through Wingold checkout. The flow uses:
- JWT tokens (RS256) for secure authentication
- Full-page redirect for checkout (user goes to Wingold, then returns to Finatrades)
- HMAC-SHA256 signed callback for secure return verification

---

## 1. Token Generation (Finatrades → Wingold)

When a Finatrades user initiates checkout, we generate a JWT token and redirect to:

```
https://wingoldandmetals.com/checkout?token=<JWT_TOKEN>
```

### JWT Token Structure

**Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "f6a6e447-4770-4d09-9de3-da28fed67875",
  "jti": "acdda530-4fbd-4ca7-8782-8f647286911b",
  "nonce": "09e2c39e7b75195cd5ebdb34d77c967a",
  "aud": "wingoldandmetals.com",
  "iss": "finatrades.com",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "finatradesId": "f6a6e447-4770-4d09-9de3-da28fed67875",
  "accountType": "personal",
  "phone": "971501234567",
  "country": "AE",
  "kyc": {
    "status": "Approved",
    "isApproved": true,
    "emailVerified": true
  },
  "permitted_delivery": ["SECURE_VAULT"],
  "source": "finatrades_redirect_checkout",
  "embedded": false,
  "callbackUrl": "https://finatrades.com/api/sso/wingold/callback",
  "cart": {
    "items": [
      {
        "barSize": "10g",
        "grams": 10,
        "quantity": 1,
        "priceUsd": 47054.26,
        "priceAed": 172689.15
      }
    ],
    "vaultLocationId": "cfcea5e3-3b7a-4f56-8e93-dcd03c13a1cc",
    "totalGrams": 10,
    "totalUsd": 47054.26,
    "totalAed": 172689.15,
    "goldPricePerGram": 4613.16,
    "calculatedAt": "2026-01-15T13:08:31.574Z"
  },
  "iat": 1768482511,
  "exp": 1768484311
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| `sub` | Finatrades user ID |
| `jti` | Order/session ID (use this as orderId in callback) |
| `nonce` | **Security token - MUST be used to generate callback signature** |
| `callbackUrl` | **URL to redirect back to after payment (use for callback redirect)** |
| `email` | User's verified email |
| `kyc.isApproved` | Whether KYC is verified |
| `cart` | Pre-calculated cart with items, prices, and vault location |
| `embedded` | Always `false` for redirect checkout |

---

## 2. Token Verification (Wingold)

Wingold must verify the JWT token using Finatrades' public key.

### Get Public Key

**Endpoint:** `GET https://finatrades.com/api/sso/public-key`

**Response:**
```json
{
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq...\n-----END PUBLIC KEY-----",
  "algorithm": "RS256",
  "issuer": "finatrades.com"
}
```

### Verification Code (Node.js)

```javascript
const jwt = require('jsonwebtoken');

// Fetch public key once and cache it
const FINATRADES_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

function verifyFinatradesToken(token) {
  try {
    const payload = jwt.verify(token, FINATRADES_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'finatrades.com',
      audience: 'wingoldandmetals.com'
    });
    
    // Extract important fields
    const nonce = payload.nonce;      // REQUIRED for postMessage
    const orderId = payload.jti;      // REQUIRED for postMessage
    const user = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      kycApproved: payload.kyc?.isApproved
    };
    const cart = payload.cart;
    
    return { valid: true, nonce, orderId, user, cart };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

---

## 3. Redirect Callback (Wingold → Finatrades)

After processing the order, Wingold redirects the user back to Finatrades with the result.

### Callback URL Format

The callback URL is provided in the JWT token payload as `callbackUrl`. Wingold should redirect to this URL with query parameters.

### Callback Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `orderId` | Yes | The order ID from the JWT token (`jti` field) |
| `status` | Yes | One of: `success`, `cancelled`, `failed` |
| `signature` | Yes | HMAC-SHA256 signature for verification |
| `referenceNumber` | For success | Wingold's internal order reference |
| `error` | For failed | Error message describing the failure |

### Signature Generation

The signature MUST be generated using HMAC-SHA256 with the shared webhook secret:

```javascript
const crypto = require('crypto');

// Use the shared webhook secret (provided by Finatrades)
const WEBHOOK_SECRET = process.env.FINATRADES_WEBHOOK_SECRET;

// Generate signature: orderId:status:nonce
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${orderId}:${status}:${nonce}`)
  .digest('hex');
```

### Example: Payment Success Redirect

```javascript
const payload = verifyFinatradesToken(token);
const callbackUrl = payload.callbackUrl;

// Generate signature
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${payload.jti}:success:${payload.nonce}`)
  .digest('hex');

// Redirect user back to Finatrades
const returnUrl = new URL(callbackUrl);
returnUrl.searchParams.set('orderId', payload.jti);
returnUrl.searchParams.set('status', 'success');
returnUrl.searchParams.set('signature', signature);
returnUrl.searchParams.set('referenceNumber', 'WG-20260115-ABC');

window.location.href = returnUrl.toString();
```

### Example: Payment Cancelled Redirect

```javascript
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${payload.jti}:cancelled:${payload.nonce}`)
  .digest('hex');

const returnUrl = new URL(callbackUrl);
returnUrl.searchParams.set('orderId', payload.jti);
returnUrl.searchParams.set('status', 'cancelled');
returnUrl.searchParams.set('signature', signature);

window.location.href = returnUrl.toString();
```

### Example: Payment Failed Redirect

```javascript
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${payload.jti}:failed:${payload.nonce}`)
  .digest('hex');

const returnUrl = new URL(callbackUrl);
returnUrl.searchParams.set('orderId', payload.jti);
returnUrl.searchParams.set('status', 'failed');
returnUrl.searchParams.set('signature', signature);
returnUrl.searchParams.set('error', 'Payment declined by bank');

window.location.href = returnUrl.toString();
```

---

## 4. Security Requirements

### Signature Verification

The `signature` parameter is an HMAC-SHA256 hash that Finatrades uses to verify:

1. The callback came from Wingold (only Wingold has the webhook secret)
2. The parameters haven't been tampered with
3. The callback is for a valid pending order

Format: `HMAC-SHA256(orderId:status:nonce, WEBHOOK_SECRET)`

### Nonce Validation

The `nonce` is a cryptographically random string in the JWT token. It:
- Prevents replay attacks
- Ties the callback to a specific checkout session
- Is required for signature generation

---

## 5. Testing

### Test Token Verification Endpoint

**Endpoint:** `POST https://finatrades.com/api/sso/verify-token`

**Request:**
```json
{
  "token": "<JWT_TOKEN>"
}
```

**Success Response:**
```json
{
  "valid": true,
  "payload": {
    "sub": "user-id",
    "jti": "order-id",
    "nonce": "nonce-value",
    "email": "user@example.com",
    ...
  },
  "message": "Token is valid"
}
```

**Error Response:**
```json
{
  "valid": false,
  "error": "TokenExpiredError",
  "message": "Token has expired"
}
```

---

## 6. Complete Flow Diagram

```
┌─────────────────┐                           ┌─────────────────┐
│   Finatrades    │                           │    Wingold      │
│   (User Browser)│                           │    (Checkout)   │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │  1. User clicks "Proceed to Payment"        │
         │     Generate JWT with nonce + orderId       │
         │     Store pending order                     │
         │                                             │
         │  2. Redirect to Wingold                     │
         │────────────────────────────────────────────>│
         │     /checkout?token=eyJhbGciOiJSUzI1NiI...  │
         │                                             │
         │                    3. Verify JWT with       │
         │                       public key            │
         │                       Extract cart, user    │
         │                                             │
         │                    4. Display checkout      │
         │                       Process payment       │
         │                                             │
         │  5. Redirect back with signed callback      │
         │<────────────────────────────────────────────│
         │     /wingold/callback?orderId=...           │
         │     &status=success&signature=...           │
         │                                             │
         │  6. Verify signature                        │
         │     Update order status                     │
         │     Show success page                       │
         │                                             │
```

---

## 7. Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid or expired token" | Wrong public key or expired token | Fetch fresh key from `/api/sso/public-key` |
| "Order not found" | Order expired or invalid orderId | Ensure orderId matches the `jti` from the token |
| "Invalid signature" | Wrong webhook secret or signature format | Verify HMAC format: `orderId:status:nonce` |
| 404 on `/checkout` | Checkout page not created | Create the `/checkout` route on Wingold app |

## 8. Wingold Checkout Page Requirements

Your `/checkout` page should:

1. **Extract token** from URL: `?token=<JWT>`
2. **Verify the token** using Finatrades public key
3. **Display the cart** from `payload.cart`
4. **Show user info** from `payload.email`, `payload.firstName`, etc.
5. **Process payment** through your payment gateway
6. **Redirect back** to `payload.callbackUrl` with signed parameters

### Minimal Checkout Page Example (React)

```jsx
import { useEffect, useState } from 'react';
import jwt from 'jsonwebtoken';

export default function Checkout() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
      setError('Missing token');
      return;
    }

    try {
      // Verify token with Finatrades public key
      const decoded = jwt.verify(token, FINATRADES_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'finatrades.com'
      });
      setPayload(decoded);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const handlePaymentComplete = (referenceNumber) => {
    const signature = generateSignature(payload.jti, 'success', payload.nonce);
    const returnUrl = new URL(payload.callbackUrl);
    returnUrl.searchParams.set('orderId', payload.jti);
    returnUrl.searchParams.set('status', 'success');
    returnUrl.searchParams.set('signature', signature);
    returnUrl.searchParams.set('referenceNumber', referenceNumber);
    window.location.href = returnUrl.toString();
  };

  if (error) return <div>Error: {error}</div>;
  if (!payload) return <div>Loading...</div>;

  return (
    <div>
      <h1>Checkout</h1>
      <p>Customer: {payload.firstName} {payload.lastName}</p>
      <p>Email: {payload.email}</p>
      <h2>Cart</h2>
      {payload.cart.items.map((item, i) => (
        <div key={i}>
          {item.barSize} x {item.quantity} = ${item.priceUsd.toFixed(2)}
        </div>
      ))}
      <p>Total: ${payload.cart.totalUsd.toFixed(2)}</p>
      {/* Your payment form here */}
      <button onClick={() => handlePaymentComplete('WG-123')}>
        Complete Payment
      </button>
    </div>
  );
}
```

---

## Contact

For integration support, contact: blockchain@finatrades.com
