# Fee Management System Documentation

## Overview

Finatrades platform has **two separate fee configuration systems** that manage transaction fees and spreads across different modules.

---

## 1. Platform Config (Gold Pricing Settings)

**Admin Location:** Admin → Platform Settings → Pricing tab

**Database Table:** `platform_config`

**Purpose:** Centralized system settings for gold pricing, transaction limits, and system-wide configurations.

### Gold Pricing Configuration

| Config Key | Display Name | Description | Data Type |
|------------|--------------|-------------|-----------|
| `buy_spread_percent` | Buy Spread % | Markup added to spot gold price for user purchases | number |
| `sell_spread_percent` | Sell Spread % | Markdown deducted from spot gold price for user sales | number |
| `storage_fee_percent` | Storage Fee (Annual %) | Annual custody fee for vault holdings | number |
| `gold_price_cache_minutes` | Price Cache Duration | How long to cache API gold price (minutes) | number |
| `min_trade_amount` | Minimum Trade Amount | Minimum amount for any buy/sell transaction (USD) | number |

### How It Works

1. Settings are stored in `platform_config` table with category `gold_pricing`
2. Frontend loads these via `PlatformContext` from `/api/platform-config`
3. Backend accesses via `storage.getAllPlatformConfigs()`
4. Used primarily in **financial reports** for revenue calculations

### Code References

- **Frontend Context:** `client/src/context/PlatformContext.tsx`
- **Admin UI:** `client/src/pages/admin/AdminSettings.tsx`
- **Backend Storage:** `server/storage.ts` (getAllPlatformConfigs, updatePlatformConfig)
- **API Endpoints:**
  - `GET /api/platform-config` - Get all config
  - `PUT /api/admin/platform-config/:key` - Update config value

---

## 2. Platform Fees (Module-Specific Fees)

**Admin Location:** Admin → Fee Management

**Database Table:** `platform_fees`

**Purpose:** Granular fee configuration per module with support for percentage/fixed fees and min/max limits.

### Fee Structure

Each fee record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `module` | enum | FinaPay, FinaVault, BNSL, FinaBridge |
| `feeKey` | string | Unique key for the fee type |
| `feeName` | string | Display name |
| `description` | string | Fee description |
| `feeType` | enum | `percentage` or `fixed` |
| `feeValue` | decimal | Fee amount (% or USD) |
| `minAmount` | decimal | Minimum fee amount (optional) |
| `maxAmount` | decimal | Maximum fee amount (optional) |
| `isActive` | boolean | Whether fee is currently active |
| `displayOrder` | integer | Sort order in UI |

### Current Fee Configuration

#### FinaPay Module
| Fee Key | Fee Name | Type | Value |
|---------|----------|------|-------|
| `buy_gold_spread` | Buy Gold Spread | percentage | 0.50% |
| `sell_gold_spread` | Sell Gold Spread | percentage | 1.50% |
| `deposit_fee` | Deposit Fee | percentage | 0.50% |
| `withdrawal_fee` | Withdrawal Fee | percentage | 1.50% |
| `p2p_transfer_fee` | P2P Transfer Fee | percentage | 0.00% |

#### FinaVault Module
| Fee Key | Fee Name | Type | Value |
|---------|----------|------|-------|
| `annual_storage_fee` | Annual Storage Fee | percentage | 0.50% |
| `cashout_bank_fee` | Cash Out to Bank Fee | percentage | 1.50% |
| `cashout_wallet_fee` | Cash Out to Wallet Fee | percentage | 0.00% |

#### BNSL Module
| Fee Key | Fee Name | Type | Value |
|---------|----------|------|-------|
| `early_termination_admin_fee` | Early Termination Admin Fee | percentage | 1.00% |
| `early_termination_penalty` | Early Termination Penalty | percentage | 5.00% |

#### FinaBridge Module
| Fee Key | Fee Name | Type | Value |
|---------|----------|------|-------|
| `platform_service_fee` | Platform Service Fee | percentage | 0.50% |

### How It Works

1. Fees are stored in `platform_fees` table
2. Frontend loads via `FeeContext` from `/api/fees`
3. Components use `useFees()` hook to access fee functions
4. `calculateFee(feeKey, amount)` applies the fee to transactions

### Code References

- **Frontend Context:** `client/src/context/FeeContext.tsx`
- **Admin UI:** `client/src/pages/admin/FeeManagement.tsx`
- **Backend Storage:** `server/storage.ts` (getAllPlatformFees, createPlatformFee, etc.)
- **API Endpoints:**
  - `GET /api/fees` - Get active fees (public)
  - `GET /api/admin/fees` - Get all fees (admin)
  - `POST /api/admin/fees` - Create fee
  - `PUT /api/admin/fees/:id` - Update fee
  - `DELETE /api/admin/fees/:id` - Delete fee
  - `POST /api/admin/fees/seed` - Seed default fees

### Fee Key Constants

```typescript
// From FeeContext.tsx
export const FEE_KEYS = {
  FINAPAY_BUY_GOLD: 'buy_gold_spread',
  FINAPAY_SELL_GOLD: 'sell_gold_spread',
  FINAPAY_DEPOSIT: 'deposit_fee',
  FINAPAY_WITHDRAW: 'withdrawal_fee',
  FINAPAY_TRANSFER: 'p2p_transfer_fee',
  
  FINAVAULT_STORAGE: 'annual_storage_fee',
  FINAVAULT_CASHOUT: 'cashout_bank_fee',
  FINAVAULT_CASHOUT_WALLET: 'cashout_wallet_fee',
  
  BNSL_ADMIN_FEE: 'early_termination_admin_fee',
  BNSL_EARLY_TERMINATION_PENALTY: 'early_termination_penalty',
  
  FINABRIDGE_SERVICE_FEE: 'platform_service_fee',
};
```

---

## 3. System Comparison

### Overlap Between Systems

Both systems define similar fees but serve different purposes:

| Fee Type | Platform Config Key | Platform Fees Key | Notes |
|----------|--------------------|--------------------|-------|
| Buy Spread | `buy_spread_percent` | `buy_gold_spread` | Different systems |
| Sell Spread | `sell_spread_percent` | `sell_gold_spread` | Different systems |
| Storage Fee | `storage_fee_percent` | `annual_storage_fee` | Different systems |

### Recommended Usage

| Use Case | Which System |
|----------|--------------|
| Financial reports & analytics | Platform Config |
| Transaction fee calculations | Platform Fees |
| Admin dashboard displays | Platform Config |
| Module-specific fee logic | Platform Fees |

---

## 4. Fee Calculation Logic

### Percentage Fee Calculation

```typescript
function calculateFee(feeKey: string, amount: number): number {
  const feeInfo = getFee(feeKey);
  if (!feeInfo) return 0;
  
  const feeValue = parseFloat(feeInfo.feeValue);
  let fee = amount * (feeValue / 100);
  
  // Apply min/max limits if defined
  if (feeInfo.minAmount) {
    fee = Math.max(fee, parseFloat(feeInfo.minAmount));
  }
  if (feeInfo.maxAmount) {
    fee = Math.min(fee, parseFloat(feeInfo.maxAmount));
  }
  
  return fee;
}
```

### Fixed Fee Calculation

```typescript
function calculateFee(feeKey: string, amount: number): number {
  const feeInfo = getFee(feeKey);
  if (!feeInfo || feeInfo.feeType !== 'fixed') return 0;
  
  return parseFloat(feeInfo.feeValue);
}
```

---

## 5. Admin Management

### Platform Config (Pricing)
- Navigate to: Admin → Platform Settings → Pricing tab
- Edit values directly in the form
- Click "Save Changes" to persist

### Platform Fees
- Navigate to: Admin → Fee Management
- View all fees grouped by module
- Edit individual fee values, types, and limits
- Toggle fees active/inactive
- Seed default fees if needed

---

## 6. Best Practices

1. **Keep systems in sync** - Ensure Platform Config and Platform Fees have consistent values for overlapping fees
2. **Use Platform Fees for transactions** - Always use `FeeContext` for actual fee calculations
3. **Use Platform Config for reporting** - Financial reports should reference platform_config
4. **Test fee changes** - Verify fee calculations after any changes
5. **Document fee changes** - Log any fee adjustments for audit purposes

---

## Author

**Charan Pratap Singh**  
Contact: +971568474843
