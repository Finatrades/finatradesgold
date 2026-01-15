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
    "emailVerified": true,
    "tier": "tier_1_basic"
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
| `kyc.tier` | KYC verification tier (`tier_1_basic`, `tier_2_enhanced`, `tier_3_corporate`) |
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

## 9. Admin Approval Webhook (Wingold → Finatrades)

For orders requiring admin approval (BANK/CRYPTO payments), Wingold should send a webhook to Finatrades when the order is approved.

### Endpoint

```
POST https://finatrades.com/api/unified/callback/wingold-order
```

### Headers

| Header | Description |
|--------|-------------|
| `X-WINGOLD-SIGNATURE` | HMAC-SHA256 signature of `rawBody + timestamp` using the shared webhook secret |
| `X-WINGOLD-TIMESTAMP` | Unix timestamp in milliseconds (must be within 5 minutes of server time) |
| `Content-Type` | `application/json` |

### Signature Generation (Node.js)

```javascript
const crypto = require('crypto');

function generateWebhookSignature(payload, timestamp, secret) {
  const rawBody = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody + timestamp)
    .digest('hex');
}

// Example usage
const timestamp = Date.now().toString();
const signature = generateWebhookSignature(payload, timestamp, WEBHOOK_SECRET);
```

### Payload Schema

```json
{
  "event": "WINGOLD_ORDER_APPROVED",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "wingold_order_id": "WG-2026-12345",
  "finatrades_user_id": "f6a6e447-4770-4d09-9de3-da28fed67875",
  "amount": 172689.15,
  "currency": "AED",
  "gold_items": [
    {
      "sku": "GOLD-BAR-10G-999",
      "weight_g": 10,
      "purity": "999.9",
      "qty": 1
    }
  ],
  "payment_method": "BANK",
  "payment_status": "VERIFIED",
  "bank_reference": "TRN-2026-001234",
  "crypto_tx_hash": null,
  "gateway_ref": null,
  "timestamps": {
    "order_created_at": "2026-01-15T10:00:00Z",
    "payment_confirmed_at": "2026-01-15T11:30:00Z",
    "approved_at": "2026-01-15T12:00:00Z"
  }
}
```

### Payment Method Behavior

| Payment Method | Finatrades Action |
|----------------|-------------------|
| `BANK` | Credit user's wallet with gold grams (if status is PAID/VERIFIED) |
| `CRYPTO` | Credit user's wallet with gold grams (if status is PAID/VERIFIED) |
| `CARD` | Store reference only - NO wallet credit (handled by payment gateway) |

### Responses

**Success (200):**
```json
{
  "status": "processed",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "order_id": "WG-2026-12345",
  "wallet_credited": true,
  "credited_grams": 10,
  "processing_time_ms": 45
}
```

**Already Processed (200):**
```json
{
  "status": "already_processed",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "processed_at": "2026-01-15T12:00:05Z"
}
```

**Error Responses:**
- `401` - Invalid or missing signature
- `400` - Invalid payload schema
- `500` - Server error

### Idempotency

The webhook is idempotent via `event_id`. Sending the same event multiple times will return `200 already_processed` after the first successful processing.

### Retry Recommendations

If Finatrades returns a non-2xx response:
1. Retry with exponential backoff (e.g., 1s, 2s, 4s, 8s...)
2. Maximum 5 retries
3. Log failures for manual review

---

## 7. Partner KYC API (Wingold → Finatrades)

For compliance verification or enhanced due diligence, Wingold can fetch full KYC details via the Partner KYC API.

### Endpoint

```
GET https://finatrades.com/api/partner/kyc/{finatradesId}
Authorization: Bearer {WINGOLD_PARTNER_API_KEY}
```

### Request Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {WINGOLD_PARTNER_API_KEY}` |
| `Content-Type` | `application/json` |

### Response (Personal Account)

```json
{
  "finatradesId": "f6a6e447-4770-4d09-9de3-da28fed67875",
  "email": "user@example.com",
  "accountType": "personal",
  "kycStatus": "Approved",
  "kycTier": "tier_2_enhanced",
  "emailVerified": true,
  "createdAt": "2026-01-10T08:00:00Z",
  "personal": {
    "fullName": "John Doe",
    "dateOfBirth": "1990-05-15",
    "nationality": "UAE",
    "country": "AE",
    "city": "Dubai",
    "address": "123 Business Bay",
    "postalCode": "00000",
    "phone": "+971501234567",
    "occupation": "Software Engineer",
    "sourceOfFunds": "Employment",
    "livenessVerified": true,
    "livenessVerifiedAt": "2026-01-10T10:00:00Z",
    "status": "Approved",
    "documents": {
      "hasIdFront": true,
      "hasIdBack": true,
      "hasPassport": true,
      "hasAddressProof": true
    },
    "documentExpiry": {
      "passportExpiryDate": "2030-05-15"
    }
  },
  "verifiableCredential": {
    "id": "vc-123456",
    "statusEndpoint": "https://finatrades.com/api/vc/status/vc-123456",
    "fetchEndpoint": "https://finatrades.com/api/vc/partner/credential/vc-123456"
  }
}
```

### Response (Business Account)

```json
{
  "finatradesId": "b7a8c447-5880-5e19-0ef4-eb39gfe78986",
  "email": "company@example.com",
  "accountType": "business",
  "kycStatus": "Approved",
  "kycTier": "tier_3_corporate",
  "emailVerified": true,
  "createdAt": "2026-01-05T08:00:00Z",
  "corporate": {
    "companyName": "Acme Trading LLC",
    "registrationNumber": "LLC-12345",
    "incorporationDate": "2020-01-15",
    "countryOfIncorporation": "UAE",
    "companyType": "private",
    "natureOfBusiness": "Gold Trading",
    "numberOfEmployees": "10-50",
    "headOfficeAddress": "Business Bay Tower, Dubai",
    "telephoneNumber": "+97142345678",
    "website": "https://acmetrading.com",
    "emailAddress": "info@acmetrading.com",
    "tradingContact": {
      "name": "Jane Smith",
      "email": "jane@acmetrading.com",
      "phone": "+971501234567"
    },
    "financeContact": {
      "name": "Bob Johnson",
      "email": "bob@acmetrading.com",
      "phone": "+971509876543"
    },
    "beneficialOwners": [
      {
        "name": "Owner 1",
        "passportNumber": "A12345678",
        "emailId": "owner1@example.com",
        "shareholdingPercentage": 60
      }
    ],
    "hasPepOwners": false,
    "livenessVerified": true,
    "status": "Approved",
    "documents": {
      "hasTradeLicense": true,
      "hasCertificateOfIncorporation": true,
      "hasShareholderList": true,
      "hasUboPassports": true,
      "hasBankReferenceLetter": false
    },
    "documentExpiry": {
      "tradeLicenseExpiryDate": "2027-01-15",
      "directorPassportExpiryDate": "2030-06-20"
    }
  }
}
```

### KYC Tiers

| Tier | Description | Limits |
|------|-------------|--------|
| `tier_1_basic` | Basic verification (email + phone) | Lower transaction limits |
| `tier_2_enhanced` | Full ID + address verification | Standard limits |
| `tier_3_corporate` | Corporate verification with UBO | Enterprise limits |

### Error Responses

| Code | Description |
|------|-------------|
| `401` | Invalid or missing API key |
| `404` | User not found |
| `500` | Server error |

### Security Notes

1. **API Key Protection**: Store `WINGOLD_PARTNER_API_KEY` securely - it grants read access to all user KYC data
2. **Audit Logging**: All API calls are logged with finatradesId and timestamp
3. **No Document URLs**: Actual document URLs are never exposed - only boolean flags for document presence
4. **Approved Only**: kycTier only reflects approved KYC submissions

---

## Contact

For integration support, contact: blockchain@finatrades.com
