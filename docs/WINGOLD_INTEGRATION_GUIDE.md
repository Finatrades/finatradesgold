# Wingold & Metals Integration Guide

This document explains the SSO integration between Finatrades and Wingold & Metals for the embedded checkout flow.

## Overview

Finatrades users can purchase physical gold bars through an embedded Wingold checkout. The flow uses JWT tokens for secure authentication and postMessage for iframe communication.

---

## 1. Token Generation (Finatrades → Wingold)

When a Finatrades user initiates checkout, we generate a JWT token and redirect to:

```
https://wingoldandmetals.com/embedded-checkout?token=<JWT_TOKEN>
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
  "source": "finatrades_embedded_checkout",
  "embedded": true,
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
| `jti` | Order/session ID (use this as orderId in responses) |
| `nonce` | **Security token - MUST be included in all postMessage responses** |
| `email` | User's verified email |
| `kyc.isApproved` | Whether KYC is verified |
| `cart` | Pre-calculated cart with items, prices, and vault location |
| `embedded` | Always `true` for iframe checkout |

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

## 3. PostMessage Communication (Wingold → Finatrades)

After processing the order, Wingold MUST send postMessage events back to Finatrades with the nonce and orderId.

### Message Format

```javascript
window.parent.postMessage({
  type: '<EVENT_TYPE>',
  data: {
    nonce: '<nonce from JWT token>',      // REQUIRED
    orderId: '<jti from JWT token>',      // REQUIRED
    referenceNumber: '<Wingold order ref>', // Optional
    message: '<error message>'             // For errors only
  }
}, 'https://finatrades.com');  // Or the origin from window.location
```

### Event Types

| Event Type | When to Send |
|------------|--------------|
| `WINGOLD_PAYMENT_SUCCESS` | Payment completed successfully |
| `WINGOLD_PAYMENT_CANCELLED` | User cancelled the checkout |
| `WINGOLD_PAYMENT_ERROR` | Payment failed |

### Example: Payment Success

```javascript
// After successful payment
const payload = verifyFinatradesToken(token);

window.parent.postMessage({
  type: 'WINGOLD_PAYMENT_SUCCESS',
  data: {
    nonce: payload.nonce,              // e.g., "09e2c39e7b75195cd5ebdb34d77c967a"
    orderId: payload.orderId,          // e.g., "acdda530-4fbd-4ca7-8782-8f647286911b"
    referenceNumber: 'WG-20260115-ABC' // Wingold's internal order reference
  }
}, '*');  // Or specify the Finatrades origin
```

### Example: Payment Cancelled

```javascript
window.parent.postMessage({
  type: 'WINGOLD_PAYMENT_CANCELLED',
  data: {
    nonce: payload.nonce,
    orderId: payload.orderId
  }
}, '*');
```

### Example: Payment Error

```javascript
window.parent.postMessage({
  type: 'WINGOLD_PAYMENT_ERROR',
  data: {
    nonce: payload.nonce,
    orderId: payload.orderId,
    message: 'Payment declined by bank'
  }
}, '*');
```

---

## 4. Security Requirements

### Nonce Validation

The `nonce` is a cryptographically random string generated per checkout session. Finatrades validates that:

1. Every postMessage includes `data.nonce`
2. The nonce matches the one from the original token
3. Messages without matching nonce are **rejected**

This prevents replay attacks and ensures messages are from the authenticated session.

### Origin Validation

Finatrades only accepts postMessage from allowed origins:
- `https://wingoldandmetals.com`
- `https://www.wingoldandmetals.com`
- Development URLs as configured

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
│   (Parent)      │                           │    (Iframe)     │
└────────┬────────┘                           └────────┬────────┘
         │                                             │
         │  1. Generate JWT with nonce + orderId       │
         │────────────────────────────────────────────>│
         │     ?token=eyJhbGciOiJSUzI1NiI...          │
         │                                             │
         │                    2. Verify JWT with       │
         │                       public key            │
         │                       Extract nonce, orderId│
         │                                             │
         │                    3. Process checkout      │
         │                                             │
         │  4. postMessage with nonce + orderId        │
         │<────────────────────────────────────────────│
         │     {type: 'WINGOLD_PAYMENT_SUCCESS',       │
         │      data: {nonce: '...', orderId: '...'}}  │
         │                                             │
         │  5. Validate nonce matches                  │
         │     Show success/update wallet              │
         │                                             │
```

---

## 7. Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid or expired token" | Wrong public key or expired token | Fetch fresh key from `/api/sso/public-key` |
| "Missing or mismatched nonce" | Nonce not included in postMessage | Extract nonce from JWT and include in all messages |
| "Rejected message from unknown origin" | Origin not in allowlist | Contact Finatrades to add your origin |

---

## Contact

For integration support, contact: blockchain@finatrades.com
