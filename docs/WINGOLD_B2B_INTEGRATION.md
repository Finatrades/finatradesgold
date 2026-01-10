# Wingold B2B Integration Guide

## Overview

This document explains how the Finatrades ↔ Wingold B2B integration works for physical gold bar purchases.

## How It Works

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FINATRADES PLATFORM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1️⃣ CUSTOMER                    2️⃣ FINATRADES BACKEND                │
│  ┌──────────────┐               ┌─────────────────────────────┐    │
│  │ Buys 2x 10g  │               │ WingoldIntegrationService   │    │
│  │ Gold Bars    │──────────────>│                             │    │
│  │ in FinaVault │               │ • createPurchaseOrder()     │    │
│  └──────────────┘               │ • submitOrderToWingold()    │    │
│                                 └──────────────┬──────────────┘    │
│                                                │                    │
└────────────────────────────────────────────────┼────────────────────┘
                                                 │
                                                 │ POST /api/b2b/orders
                                                 │ (with API Key)
                                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         WINGOLD PLATFORM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  3️⃣ B2B ORDER SERVICE                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Receives order                                             │   │
│  │ • Allocates gold bars (WG-10G-xxx-1, WG-10G-xxx-2)          │   │
│  │ • Generates certificates                                     │   │
│  │ • Assigns to Dubai vault (DXB-1)                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                 │                                   │
│                                 │ Sends Webhooks                    │
│                                 ▼                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                                  │ POST /api/wingold/webhooks
                                  │ (with HMAC signature)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FINATRADES PLATFORM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  4️⃣ WEBHOOK HANDLER                 5️⃣ CUSTOMER ACCOUNT              │
│  ┌──────────────────────┐           ┌─────────────────────────┐    │
│  │ handleOrderFulfilled │           │                         │    │
│  │                      │──────────>│ FinaVault: +2 bars      │    │
│  │ • Verify signature   │           │ LGPW Wallet: +20g       │    │
│  │ • Update vault       │           │ Certificates: 3 added   │    │
│  └──────────────────────┘           └─────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Process

| Step | What Happens | Code Location |
|------|--------------|---------------|
| 1 | Customer clicks "Buy Gold Bars" | Frontend UI |
| 2 | `createPurchaseOrder()` saves order to database | `wingold-integration-service.ts` |
| 3 | `submitOrderToWingold()` sends order to Wingold API | `wingold-integration-service.ts` |
| 4 | Order stored with status `submitted` | `wingold_purchase_orders` table |
| 5 | Wingold processes and sends webhooks back | External |
| 6 | `handleWebhook()` receives and verifies signature | `wingold-routes.ts` |
| 7 | `handleOrderFulfilled()` updates customer account | `wingold-integration-service.ts` |
| 8 | Customer sees gold in FinaVault | Frontend UI |

## API Endpoints

### Finatrades → Wingold (Outbound)

**Create Order:**
```
POST https://wingoldandmetals--imcharanpratap.replit.app/api/b2b/orders
Headers:
  X-API-Key: [WINGOLD_API_KEY]
  Content-Type: application/json
```

**Request Body:**
```json
{
  "referenceNumber": "WG-ABC123-XYZ",
  "barSize": "10g",
  "barCount": 2,
  "totalGrams": "20.000000",
  "usdAmount": "2850.00",
  "goldPricePerGram": "142.50",
  "preferredVaultLocation": "DXB-1",
  "customer": {
    "externalId": "user-abc123",
    "email": "customer@example.com",
    "name": "John Smith"
  },
  "webhookUrl": "https://finatrades.replit.app/api/wingold/webhooks",
  "timestamp": "2026-01-08T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "2cf5b649-56ed-464d-bc95-89d0ea064747",
  "estimatedFulfillmentTime": "2026-01-08T16:30:00Z"
}
```

### Wingold → Finatrades (Webhooks)

**Webhook Events:**

| Event | When Sent | Description |
|-------|-----------|-------------|
| `order.confirmed` | Order accepted | Order validated and processing started |
| `bar.allocated` | Bar assigned | Each gold bar gets a serial number |
| `certificate.issued` | Certificate ready | PDF certificate generated |
| `order.fulfilled` | All complete | All bars allocated and ready |
| `order.cancelled` | Order failed | Order could not be fulfilled |

**Webhook Payload Example:**
```json
{
  "event": "order.fulfilled",
  "orderId": "2cf5b649-56ed-464d-bc95-89d0ea064747",
  "referenceNumber": "WG-ABC123-XYZ",
  "status": "fulfilled",
  "bars": [
    {"barId": "WG-10G-1767882069079-1", "grams": "10.000000"},
    {"barId": "WG-10G-1767882069442-2", "grams": "10.000000"}
  ],
  "totalGrams": "20.000000",
  "certificates": ["WG-CERT-2026-001", "WG-CERT-2026-002"],
  "timestamp": "2026-01-08T14:35:00Z",
  "signature": "abc123..."
}
```

## Available Options

### Bar Sizes

| Size | Weight | Estimated Fulfillment |
|------|--------|----------------------|
| 1g | 1 gram | 2 hours |
| 10g | 10 grams | 2 hours |
| 100g | 100 grams | 12 hours |
| 1kg | 1000 grams | 24 hours |

### Vault Locations

| Code | Location | Country |
|------|----------|---------|
| DXB-1 | Dubai Vault | UAE |
| SIN-1 | Singapore Vault | Singapore |
| ZRH-1 | Zurich Vault | Switzerland |
| LON-1 | London Vault | UK |

## Database Tables

### Finatrades Side

| Table | Purpose |
|-------|---------|
| `wingold_purchase_orders` | Tracks order status and details |
| `wingold_bar_lots` | Stores allocated bar information |
| `wingold_certificates` | Stores certificate data and PDFs |
| `wingold_vault_locations` | Available vault locations |
| `wingold_reconciliations` | Daily reconciliation reports |

### Wingold Side (B2B Receiver)

| Table | Purpose |
|-------|---------|
| `b2b_orders` | Incoming orders from Finatrades |
| `b2b_order_bars` | Bar allocations per order |
| `b2b_certificates` | Generated certificates |
| `b2b_vault_locations` | Vault locations |
| `b2b_webhook_logs` | Webhook delivery audit trail |

## Security

### Authentication

- **API Key**: All requests include `X-API-Key` header
- **HMAC Signature**: Webhooks signed with shared secret

### Secrets Configuration

**On Finatrades:**
| Secret | Purpose |
|--------|---------|
| `WINGOLD_API_KEY` | Authenticate with Wingold API |
| `WINGOLD_WEBHOOK_SECRET` | Verify incoming webhooks from Wingold |
| `WINGOLD_SYNC_SECRET` | Sign outgoing sync webhooks |

**On Wingold:**
| Secret | Purpose |
|--------|---------|
| `FINATRADES_API_KEY` | Authenticate incoming orders |
| `FINATRADES_WEBHOOK_SECRET` | Verify incoming webhooks from Finatrades |
| `WINGOLD_WEBHOOK_SECRET` | Sign outgoing webhooks |

### Signature Verification

```typescript
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Code Examples

### Create Order (Finatrades)

```typescript
import { WingoldIntegrationService } from './wingold-integration-service';

// 1. Create order in database
const { orderId, referenceNumber } = await WingoldIntegrationService.createPurchaseOrder({
  userId: "customer-123",
  barSize: "10g",
  barCount: 2,
  totalGrams: "20.000000",
  usdAmount: "2850.00",
  goldPricePerGram: "142.50",
  preferredVaultLocation: "DXB-1"
});

// 2. Submit to Wingold API
const response = await WingoldIntegrationService.submitOrderToWingold(orderId);

console.log(`Order submitted: ${response.orderId}`);
console.log(`Estimated fulfillment: ${response.estimatedFulfillmentTime}`);
```

### Handle Webhook (Finatrades)

```typescript
// In wingold-routes.ts
router.post('/webhooks', async (req, res) => {
  const { event, orderId, signature } = req.body;
  
  // Verify signature
  if (!verifySignature(JSON.stringify(req.body), signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process event
  switch (event) {
    case 'order.fulfilled':
      await WingoldIntegrationService.handleOrderFulfilled(orderId, req.body);
      break;
    case 'bar.allocated':
      await WingoldIntegrationService.handleBarAllocated(orderId, req.body.bar);
      break;
    // ... other events
  }
  
  res.json({ received: true });
});
```

## Testing

### Test Order Creation

```bash
curl -X POST http://localhost:5000/api/b2b/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "referenceNumber": "TEST-001",
    "barSize": "10g",
    "barCount": 2,
    "totalGrams": "20.000000",
    "usdAmount": "2850.00",
    "goldPricePerGram": "142.50",
    "preferredVaultLocation": "DXB-1",
    "customer": {
      "externalId": "test-user",
      "email": "test@example.com",
      "name": "Test User"
    },
    "webhookUrl": "https://httpbin.org/post",
    "timestamp": "2026-01-08T12:00:00Z"
  }'
```

### Test Reconciliation

```bash
curl "http://localhost:5000/api/b2b/reconciliation?date=2026-01-08" \
  -H "X-API-Key: YOUR_API_KEY"
```

## Files Reference

| File | Description |
|------|-------------|
| `server/wingold-integration-service.ts` | Finatrades → Wingold service |
| `server/wingold-user-sync-service.ts` | User/KYC synchronization |
| `server/wingold-routes.ts` | Webhook handlers (Finatrades) |
| `server/b2b-order-service.ts` | Order processing (Wingold) |
| `server/b2b-routes.ts` | B2B API endpoints (Wingold) |
| `shared/schema.ts` | Database schema definitions |
