# Finatrades Technical Details Report

## Author
**Charan Pratap Singh**  
Contact: +971568474843

---

## Table of Contents
1. [Platform Overview (Simple Explanation)](#platform-overview-simple-explanation)
2. [Dashboard](#dashboard)
3. [Notification System](#notification-system)
4. [Platform Configuration](#platform-configuration)
5. [User Preferences System](#user-preferences-system)
6. [KYC Verification System](#kyc-verification-system)
7. [FinaPay - Digital Wallet System](#finapay---digital-wallet-system)
8. [FinaVault - Gold Storage System](#finavault---gold-storage-system)
9. [BNSL - Buy Now Sell Later](#bnsl---buy-now-sell-later)
10. [FinaBridge - Trade Finance](#finabridge---trade-finance)
11. [Payment Integrations](#payment-integrations)
12. [Security Features](#security-features)
13. [Certificate System](#certificate-system)
14. [Database Schema Overview](#database-schema-overview)

---

## Platform Overview (Simple Explanation)

This section explains how Finatrades works in simple, everyday language with practical examples.

### What is Finatrades?

Finatrades is a **digital bank for gold**. Instead of keeping money in a traditional bank account, users keep gold. They can buy gold, sell gold, send gold to others, store physical gold in vaults, and invest gold to earn returns.

### The 4 Core Modules

#### 1. FinaPay - Your Gold Wallet

**Simple Explanation:** A digital wallet where gold is stored, similar to a bank account but holding gold instead of cash.

**How it works:**
1. User deposits money (bank transfer, card, or crypto)
2. User buys gold at current market price
3. Gold balance shown in grams (e.g., 5.25 grams)
4. User can send gold to others, sell gold, or withdraw cash

**Practical Example:**
```
Ahmed deposits $500 into his FinaPay wallet
  ↓
Gold price is $100 per gram
  ↓
Ahmed buys 5 grams of gold ($500 ÷ $100)
  ↓
His wallet shows: 5.000000 grams
  ↓
Later, gold price rises to $120 per gram
  ↓
Ahmed sells 5 grams and gets $600 (profit: $100)
```

**Database Tables Involved:** `wallets`, `transactions`, `deposit_requests`, `withdrawal_requests`

---

#### 2. FinaVault - Gold Storage

**Simple Explanation:** A secure vault in Dubai where physical gold bars are stored and insured.

**How it works:**
1. Gold purchased through FinaPay is stored in a real vault
2. Users receive certificates proving ownership
3. Two storage options: Pooled (shared, cheaper) or Allocated (specific bars, expensive)
4. Users can request physical delivery of gold bars

**Practical Example:**
```
Sarah buys 100 grams of gold
  ↓
Gold is stored at Wingold & Metals DMCC vault in Dubai
  ↓
Sarah receives a Digital Ownership Certificate
  ↓
She chooses "Allocated Storage" - gets bar serial number: WG-2024-00123
  ↓
5 years later, Sarah requests physical delivery
  ↓
Gold bar is shipped to her home via insured courier
```

**Database Tables Involved:** `vault_holdings`, `gold_bars`, `vault_deposits`, `vault_withdrawals`, `physical_delivery_requests`

---

#### 3. BNSL - Buy Now Sell Later (Investment)

**Simple Explanation:** Lock your gold for 1-3 years and earn guaranteed returns, like a fixed deposit but with gold.

**How it works:**
1. User locks gold in their wallet for a fixed term
2. Returns are guaranteed:
   - 12 months = 10% per year
   - 24 months = 11% per year
   - 36 months = 12% per year
3. Profits paid quarterly (every 3 months)
4. At maturity, original gold + all profits returned

**Practical Example:**
```
Mohammed has 10 grams of gold in his wallet
  ↓
He enrolls in a 12-month BNSL plan
  ↓
Gold is locked (cannot be sold or transferred)
  ↓
Every 3 months, he receives profit:
  - Month 3: +0.25 grams
  - Month 6: +0.25 grams
  - Month 9: +0.25 grams
  - Month 12: +0.25 grams (final payment)
  ↓
Total received: 10 + 1 = 11 grams (10% return)
```

**Early Exit Example:**
```
Mohammed needs money after 6 months
  ↓
He requests early termination
  ↓
Penalty: 5% of remaining value
  ↓
He receives: ~9.75 grams (original minus penalty)
```

**Database Tables Involved:** `bnsl_plans`, `bnsl_wallets`, `bnsl_payouts`, `bnsl_early_termination_requests`, `bnsl_agreements`

---

#### 4. FinaBridge - Business Trade Finance

**Simple Explanation:** For businesses doing international trade. Gold is used as collateral to protect both buyer and seller.

**How it works:**
1. Importer (buyer) wants to purchase goods from another country
2. Exporter (seller) is worried about not getting paid
3. Importer locks gold as collateral on Finatrades
4. Exporter ships the goods
5. When buyer confirms delivery, gold is released to seller
6. Both parties protected - no one gets cheated

**Practical Example:**
```
Company A (Dubai) wants to buy machinery from Company B (Germany)
Trade value: $50,000
  ↓
Step 1: Company A locks $50,000 worth of gold (500 grams at $100/gram)
  ↓
Step 2: Company B ships machinery to Dubai
  ↓
Step 3: Shipment tracked: Picked Up → In Transit → Customs → Delivered
  ↓
Step 4: Company A inspects and confirms delivery
  ↓
Step 5: Finatrades releases 500 grams to Company B
  ↓
Trade completed successfully!
```

**Dispute Example:**
```
Company A receives damaged goods
  ↓
Company A raises a dispute on Finatrades
  ↓
Gold remains locked in escrow
  ↓
Both parties submit evidence
  ↓
Finatrades mediates and decides:
  - Option A: Full refund to buyer (gold returned)
  - Option B: Partial payment to seller
  - Option C: Arbitration
```

**Database Tables Involved:** `trade_cases`, `trade_documents`, `trade_requests`, `exporter_proposals`, `finabridge_wallets`, `settlement_holds`, `disputes`

---

### Money Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BANK                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Deposit via Bank/Card/Crypto)
┌─────────────────────────────────────────────────────────────────┐
│                      FINAPAY WALLET                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ USD Balance │    │ EUR Balance │    │ Gold (grams)│         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          │                    │                    │
          ▼                    ▼                    ▼
    ┌───────────┐      ┌─────────────┐      ┌─────────────┐
    │  CONVERT  │      │    SEND     │      │   INVEST    │
    │  Buy/Sell │      │  P2P Gold   │      │   in BNSL   │
    └───────────┘      └─────────────┘      └─────────────┘
                              │                    │
                              ▼                    ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │ Other User's    │    │   BNSL WALLET   │
                    │ FinaPay Wallet  │    │ (Locked Gold)   │
                    └─────────────────┘    └─────────────────┘
                                                   │
                                                   ▼
                                           ┌─────────────────┐
                                           │ Quarterly       │
                                           │ Profit Payouts  │
                                           └─────────────────┘
```

---

### Platform Comparison with Traditional Banking

| Feature | Traditional Bank | Finatrades |
|---------|------------------|------------|
| Account | Bank account | FinaPay wallet |
| Currency | Cash (USD, EUR) | Gold (grams) |
| Storage | Safe deposit box | FinaVault (Dubai) |
| Investment | Fixed deposit (3-5% interest) | BNSL (10-12% returns) |
| Transfer | Wire transfer | P2P gold transfer |
| Business loans | Trade finance with cash | FinaBridge with gold collateral |

---

### Security Layers

| Layer | What It Protects | How It Works |
|-------|------------------|--------------|
| **Password** | Account access | Minimum 8 characters, special chars required |
| **2FA (Two-Factor)** | Login security | Code from authenticator app |
| **Transaction PIN** | All transactions | 4-6 digit PIN for buy/sell/transfer |
| **KYC Verification** | Identity fraud | Upload ID, selfie, liveness check |
| **Session Timeout** | Unattended access | Auto logout after 30 minutes |
| **Email Alerts** | Account monitoring | Notifications for all activities |

---

### Gold Price Example

Gold prices change constantly based on global markets.

**Real-time Price Display:**
```
Gold Price: $143.92 per gram
Gold Price: $4,476.70 per ounce (31.1 grams)
Gold Price: AED 528.59 per gram (at 3.67 exchange rate)
```

**Transaction Calculation Example:**
```
User wants to buy $1,000 worth of gold
Current price: $143.92 per gram

Calculation:
  Gold amount = $1,000 ÷ $143.92 = 6.948276 grams
  
User's wallet updated:
  Before: 0.000000 grams
  After:  6.948276 grams
```

---

### Fee Structure Overview

| Transaction Type | Fee | Example |
|------------------|-----|---------|
| Buy Gold | 0.5% | Buy $1,000 → Fee: $5 |
| Sell Gold | 0.5% | Sell $1,000 → Fee: $5 |
| P2P Transfer | 0.25% | Send $500 → Fee: $1.25 |
| Bank Withdrawal | 1% + $25 | Withdraw $1,000 → Fee: $35 |
| Card Deposit | 2.5% | Deposit $500 → Fee: $12.50 |
| Crypto Deposit | Network fee | Varies by blockchain |
| Vault Storage | 0.1%/year | 100g stored → 0.1g/year |

---

## Dashboard

The user dashboard provides a comprehensive real-time view of the user's gold portfolio and financial activity.

### Dashboard API Endpoint

**Endpoint:** `GET /api/dashboard/:userId`  
**Authorization:** Owner or Admin only  
**Response Time:** Optimized single-call architecture (replaces 7 separate API calls)

### KPI Cards (6 Main Cards)

#### Row 1 - Gold Holdings

| Card | Data Field | Description | Display Format |
|------|------------|-------------|----------------|
| **Gold Storage** | `totals.walletGoldGrams` | Available gold in FinaPay wallet | Grams, Kilograms, Troy Ounces |
| **Total Gold Value (USD/EUR/AED)** | `walletGoldGrams * goldPrice` | Gold holdings in preferred currency | User's display currency |
| **Total Gold Value (AED)** | `walletGoldGrams * goldPrice * 3.67` | Gold holdings in UAE Dirhams | AED format |

#### Row 2 - Portfolio & Investments

| Card | Data Field | Description | Display Format |
|------|------------|-------------|----------------|
| **Total Portfolio** | `totals.totalPortfolioUsd` | Overall investment value (wallet gold + USD balance + FinaBridge) | Currency format |
| **BNSL Invested** | `totals.bnslLockedGrams` | Gold locked in Buy Now Sell Later plans | Grams/Kilograms |
| **Total Profit** | `totals.bnslTotalProfit` | ROI earned from BNSL plans | Green currency format |

### Wallet Cards Section (3 Cards)

| Wallet | Fields | Description |
|--------|--------|-------------|
| **FinaPay Wallet** | `goldGrams`, `usdValue`, `pending`, `transactions` | Digital gold wallet for buying/selling/transferring |
| **BNSL Wallet** | `goldGrams`, `usdValue`, `lockedGrams`, `activePlans` | Gold locked in BNSL investment plans |
| **FinaBridge Wallet** | `goldGrams`, `usdValue`, `activeCases`, `tradeVolume` | Trade finance wallet for business users |

### Credit Card Preview

Visual debit card mockup displayed on the dashboard:
- Shows user's full name (uppercase)
- Card type: Personal or Business (based on `accountType` or `finabridgeRole`)
- Mock card number: `4789 •••• •••• 3456`
- Expiry: `12/28`

### Banners & Status Indicators

| Banner | Condition | Purpose |
|--------|-----------|---------|
| **Settlement Assurance** | Always visible | Shows platform's gold reserve backing ($42.134B in geological reserves) |
| **2FA Reminder** | `!user.mfaEnabled && prefs.twoFactorReminder` | Prompts users to enable two-factor authentication |
| **Gold Price Status** | Always visible | Shows live gold price per gram with source indicator |
| **Balance Hidden** | `prefs.showBalance === false` | Indicates balances are hidden |

### Dashboard Data Sources

The dashboard fetches all data in a single optimized API call:

```javascript
// Parallel data fetching
const [
  wallet,           // User's FinaPay wallet
  vaultHoldings,    // Physical vault holdings
  transactions,     // Transaction history
  depositRequests,  // Pending bank transfers
  cryptoPayments,   // Crypto payment requests
  bnslPlans,        // BNSL investment plans
  priceData,        // Live gold price
  notifications,    // User notifications
  tradeCases,       // FinaBridge trade cases
  certificates,     // Gold certificates
  finabridgeWallet, // FinaBridge wallet
  buyGoldRequests   // Wingold buy requests
] = await Promise.all([...]);
```

### Dashboard Totals Calculation

| Field | Calculation |
|-------|-------------|
| `vaultGoldGrams` | Sum of all vault holdings |
| `vaultGoldValueUsd` | `vaultGoldGrams * goldPrice` |
| `vaultGoldValueAed` | `vaultGoldValueUsd * 3.67` |
| `walletGoldGrams` | `wallet.goldGrams` |
| `walletUsdBalance` | `wallet.usdBalance` |
| `totalPortfolioUsd` | `(walletGoldGrams * goldPrice) + walletUsdBalance + finabridgeGoldValueUsd` |
| `bnslLockedGrams` | Sum of `goldSoldGrams` from active BNSL plans |
| `bnslTotalProfit` | Sum of `paidMarginUsd` from active BNSL plans |
| `pendingGoldGrams` | `pendingDepositUsd / goldPrice` |
| `pendingDepositUsd` | Sum of pending deposits (bank + crypto) |

### Transactions Display

- Combined transactions from: Regular transactions, Deposit requests, Crypto payments, Buy gold requests
- Sorted by `createdAt` descending
- Limited to 20 most recent for dashboard
- Excludes already-credited transactions to prevent duplicates

### User Preferences Integration

| Preference | Effect |
|------------|--------|
| `showBalance` | Hides/shows all monetary values (displays `••••••` when hidden) |
| `compactMode` | Reduces padding and font sizes for compact display |
| `displayCurrency` | Converts values to USD, EUR, or AED |
| `twoFactorReminder` | Shows/hides 2FA reminder banner |

### Real-time Updates

The dashboard integrates with Socket.IO for real-time updates:
- `DataSyncProvider` listens for `ledger:sync` events
- Query cache is invalidated on relevant events (`balance_update`, `transaction`, etc.)
- Uses `syncVersion` timestamps to prevent duplicate invalidations

---

## Notification System

### Email Notifications (55 Templates)

The platform sends 55 different email templates organized into the following categories:

#### Authentication & Security (8 templates)
| Template Slug | Description |
|---------------|-------------|
| `welcome_email` | Welcome email sent after registration |
| `email_verification` | Email verification link |
| `password_reset` | Password reset request |
| `password_changed` | Password change confirmation |
| `new_device_login` | New device login alert |
| `account_locked` | Account locked notification |
| `suspicious_activity` | Suspicious activity alert |
| `mfa_enabled` | Two-factor authentication enabled confirmation |

#### KYC Verification (4 templates)
| Template Slug | Description |
|---------------|-------------|
| `kyc_submitted` | KYC documents submitted confirmation |
| `kyc_approved` | KYC verification approved |
| `kyc_rejected` | KYC verification rejected with reason |
| `kyc_document_expiry` | Document expiry reminder |

#### Transactions (10 templates)
| Template Slug | Description |
|---------------|-------------|
| `gold_purchase` | Gold purchase confirmation |
| `gold_sale` | Gold sale confirmation |
| `card_payment_receipt` | Card payment receipt |
| `deposit_received` | Deposit received confirmation |
| `deposit_processing` | Deposit processing notification |
| `withdrawal_requested` | Withdrawal request confirmation |
| `withdrawal_processing` | Withdrawal processing notification |
| `withdrawal_completed` | Withdrawal completed confirmation |
| `transaction_failed` | Transaction failure notification |
| `low_balance_alert` | Low balance warning |

#### P2P Transfers (5 templates)
| Template Slug | Description |
|---------------|-------------|
| `transfer_sent` | Transfer sent confirmation |
| `transfer_received` | Transfer received notification |
| `transfer_pending` | Transfer pending approval |
| `transfer_completed` | Transfer completed confirmation |
| `transfer_cancelled` | Transfer cancelled notification |

#### BNSL Plans (4 templates)
| Template Slug | Description |
|---------------|-------------|
| `bnsl_payment_received` | BNSL payment received |
| `bnsl_payment_reminder` | BNSL payment due reminder |
| `bnsl_plan_completed` | BNSL plan completed |
| `bnsl_early_exit` | BNSL early exit processed |

#### FinaBridge Trade Finance (8 templates)
| Template Slug | Description |
|---------------|-------------|
| `trade_proposal` | New trade proposal notification |
| `proposal_accepted` | Trade proposal accepted |
| `proposal_declined` | Trade proposal declined |
| `shipment_update` | Shipment status update |
| `settlement_locked` | Gold locked in escrow |
| `settlement_released` | Gold released from escrow |
| `dispute_raised` | Trade dispute raised |
| `dispute_resolved` | Trade dispute resolved |

#### Certificates (6 templates)
| Template Slug | Description |
|---------------|-------------|
| `certificate_digital_ownership` | Digital ownership certificate |
| `certificate_physical_storage` | Physical storage certificate |
| `certificate_transfer` | Transfer certificate |
| `certificate_bnsl_lock` | BNSL lock certificate |
| `certificate_trade_lock` | Trade finance lock certificate |
| `certificate_trade_release` | Trade finance release certificate |

#### Documents (3 templates)
| Template Slug | Description |
|---------------|-------------|
| `invoice_gold_purchase` | Gold purchase invoice |
| `monthly_account_statement` | Monthly account statement |

#### Marketing (5 templates)
| Template Slug | Description |
|---------------|-------------|
| `newsletter` | Newsletter subscription |
| `promotion` | Promotional offers |
| `marketing` | Marketing communications |
| `announcement` | Platform announcements |
| `invitation` | Referral invitations |

### Email Preference Controls

Email notifications are controlled at three levels:

1. **Global Admin Toggle**: `emailNotificationsEnabled` in system settings
2. **Per-Type Admin Toggle**: `email_notification_settings` table allows enabling/disabling specific notification types
3. **User Preferences**: Users can control their own email preferences:
   - `emailNotifications` - Master toggle for all emails
   - `transactionAlerts` - Transaction-related emails (19 slugs)
   - `securityAlerts` - Security-related emails (7 slugs)
   - `marketingEmails` - Marketing and promotional emails (5 slugs)

#### Transaction Email Slugs (checked against `transactionAlerts`)
```
gold_purchase, gold_sale, card_payment_receipt, deposit_received, 
deposit_processing, withdrawal_requested, withdrawal_processing, 
withdrawal_completed, transaction_failed, low_balance_alert,
transfer_sent, transfer_received, transfer_pending, transfer_completed,
transfer_cancelled, bnsl_payment_received, bnsl_payment_reminder,
bnsl_plan_completed, bnsl_early_exit
```

#### Security Email Slugs (checked against `securityAlerts`)
```
password_reset, password_changed, new_device_login, account_locked,
suspicious_activity, mfa_enabled, email_verification
```

#### Marketing Email Slugs (checked against `marketingEmails`)
```
newsletter, promotion, marketing, announcement, invitation
```

---

### Bell/In-App Notifications (25+ Types)

In-app notifications appear in the notification bell and are stored in the `notifications` table.

#### Notification Types

| Type | Purpose | Usage Count |
|------|---------|-------------|
| `success` | Positive confirmations | 11 |
| `error` | Failures and rejections | 3 |
| `warning` | Alerts needing attention | 5 |
| `info` | General information | 10 |
| `transaction` | Transaction updates | 4 |
| `balance_update` | Wallet balance changes | 26 |
| `referral` | Referral rewards | 1 |
| `deposit` / `Deposit` | Deposit status updates | 11 |
| `Withdrawal` | Withdrawal status updates | 5 |
| `pending_transfer` | P2P transfer pending | 2 |
| `transfer_accepted` | P2P transfer accepted | 2 |
| `Buy` | Gold purchase transactions | 10 |
| `Send` | Gold sent transactions | 8 |
| `Receive` | Gold received transactions | 16 |
| `Digital Ownership` | Vault digital holdings | 15 |
| `Physical Storage` | Vault physical holdings | 14 |
| `Trade Finance` | FinaBridge trade updates | 2 |
| `BNSL` | BNSL plan updates | 2 |
| `BNSL Interest` | BNSL interest accrual | 1 |
| `Vault Deposit` | Vault deposit updates | 2 |
| `Vault Withdrawal` | Vault withdrawal updates | 1 |
| `Refund` | Refund notifications | 2 |
| `Storage Fees` | Storage fee notifications | 1 |
| `Withdrawal Fees` | Withdrawal fee notifications | 1 |
| `crypto_rejected` | Crypto deposit rejected | 1 |
| `deposit_rejected` | Deposit rejected | 1 |
| `withdrawal_rejected` | Withdrawal rejected | 1 |

#### User Preference Control

Bell notifications are controlled by user preferences:
- `pushNotifications` - Master toggle for in-app notifications

---

### Push Notifications (FinaBridge - 10 Event Types)

Push notifications are sent to mobile devices for FinaBridge trade finance events.

| Event Type | Title | Description |
|------------|-------|-------------|
| `new_proposal` | New Trade Proposal | User receives a new trade proposal |
| `proposal_accepted` | Proposal Accepted | Trade proposal has been accepted |
| `proposal_declined` | Proposal Declined | Trade proposal has been declined |
| `shipment_update` | Shipment Update | Shipment status has changed |
| `settlement_locked` | Gold Locked in Escrow | Gold has been locked for trade |
| `settlement_released` | Gold Released | Gold has been released from escrow |
| `dispute_raised` | Dispute Raised | A dispute has been raised |
| `dispute_resolved` | Dispute Resolved | Dispute has been resolved |
| `document_uploaded` | New Document | New document uploaded to deal room |
| `deal_room_message` | New Message | New message in deal room chat |

#### Push Notification Infrastructure

- **Device Token Storage**: `push_device_tokens` table
- **Platforms Supported**: iOS, Android, Web
- **User Preference Control**: `pushNotifications` toggle in user preferences

---

## Platform Configuration

All platform settings are managed via the `platform_config` database table with 13 categories:

### Configuration Categories

| Category | Description |
|----------|-------------|
| `gold_pricing` | Buy/sell spreads, storage fees, minimum trade amounts |
| `transaction_limits` | Daily/monthly limits by KYC tier |
| `deposit_limits` | Minimum/maximum deposit amounts |
| `withdrawal_limits` | Minimum/maximum withdrawal amounts, fees |
| `p2p_limits` | P2P transfer limits and fees |
| `bnsl_settings` | BNSL minimum amounts, max terms, early exit penalties |
| `finabridge_settings` | Trade finance configuration |
| `payment_fees` | Card, bank transfer, crypto payment fees |
| `kyc_settings` | KYC requirements and restrictions |
| `system_settings` | Global system toggles |
| `vault_settings` | Vault inventory management |
| `referral_settings` | Referral program configuration |
| `terms_conditions` | Terms and conditions content |

### Key Configuration Parameters

#### Gold Pricing
| Parameter | Description |
|-----------|-------------|
| `buySpreadPercent` | Percentage spread added to buy price |
| `sellSpreadPercent` | Percentage spread deducted from sell price |
| `storageFeePercent` | Annual vault storage fee percentage |
| `minTradeAmount` | Minimum USD amount for trades |

#### Transaction Limits by KYC Tier
| Tier | Daily Limit | Monthly Limit |
|------|-------------|---------------|
| Tier 1 (Basic) | Configurable | Configurable |
| Tier 2 (Enhanced) | Configurable | Configurable |
| Tier 3 (Maximum) | Configurable | Configurable |

#### Deposit/Withdrawal Settings
| Parameter | Description |
|-----------|-------------|
| `minDeposit` | Minimum deposit amount (USD) |
| `maxDepositSingle` | Maximum single deposit (USD) |
| `dailyDepositLimit` | Daily deposit limit (USD) |
| `minWithdrawal` | Minimum withdrawal amount (USD) |
| `maxWithdrawalSingle` | Maximum single withdrawal (USD) |
| `withdrawalFeePercent` | Percentage fee on withdrawals |
| `withdrawalFeeFixed` | Fixed fee on withdrawals (USD) |

#### P2P Transfer Settings
| Parameter | Description |
|-----------|-------------|
| `minP2pTransfer` | Minimum P2P transfer amount |
| `maxP2pTransfer` | Maximum P2P transfer amount |
| `p2pFeePercent` | P2P transfer fee percentage |

#### Payment Fees
| Payment Method | Fee Structure |
|----------------|---------------|
| Card | `cardFeePercent` + `cardFeeFixed` |
| Bank Transfer | `bankTransferFeePercent` |
| Crypto | `cryptoFeePercent` |

---

## User Preferences System

Each user has personalized preferences stored in the `user_preferences` table:

### Notification Preferences
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `emailNotifications` | boolean | true | Master toggle for all emails |
| `pushNotifications` | boolean | true | Master toggle for push/bell notifications |
| `transactionAlerts` | boolean | true | Transaction-related notifications |
| `priceAlerts` | boolean | true | Gold price alerts |
| `securityAlerts` | boolean | true | Security-related notifications |
| `marketingEmails` | boolean | false | Marketing and promotional emails |

### Display Preferences
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `displayCurrency` | string | 'USD' | Display amounts in USD/AED/EUR |
| `language` | string | 'en' | Interface language |
| `theme` | string | 'system' | Theme: light/dark/system |
| `compactMode` | boolean | false | Enable compact UI mode |

### Privacy Preferences
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showBalance` | boolean | true | Show/hide balances on dashboard |
| `twoFactorReminder` | boolean | true | Show 2FA setup reminder |

### Transfer Preferences
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `requireTransferApproval` | boolean | false | Require accept/reject for incoming transfers |
| `transferApprovalTimeout` | integer | 24 | Hours before auto-accept (0 = no auto-accept) |

### Currency Conversion Rates
| Currency | Conversion from USD |
|----------|---------------------|
| USD | 1.00 (base) |
| AED | *3.67 |
| EUR | *0.92 |

---

## KYC Verification System

### KYC Statuses
| Status | Description |
|--------|-------------|
| `Not Started` | User has not begun KYC |
| `In Progress` | KYC submission in progress |
| `Approved` | KYC verified and approved |
| `Rejected` | KYC rejected (can resubmit) |
| `Escalated` | Requires manual review |
| `Pending Review` | Awaiting admin review |

### KYC Tiers
| Tier | Name | Requirements |
|------|------|--------------|
| `tier_1_basic` | Basic | Basic identity verification |
| `tier_2_enhanced` | Enhanced | Full identity + address verification |
| `tier_3_corporate` | Corporate | Business documentation + verification |

### KYC Modes

The platform supports two KYC modes:

#### 1. kycAml Mode (Tiered Verification)
- **Basic**: Basic identity verification
- **Enhanced**: Full identity + address verification
- **Corporate**: Business documentation + verification

#### 2. Finatrades Mode
- **Personal Info**: Name, DOB, nationality, etc.
- **Documents**: ID document upload (passport, ID card, driver's license)
- **Liveness Verification**: Selfie/video verification

### KYC Documents Collected

#### Personal KYC
| Field | Description |
|-------|-------------|
| `documentType` | passport, national_id, driver_license |
| `documentNumber` | Document identification number |
| `documentExpiryDate` | Document expiry date |
| `documentFrontUrl` | Front side image URL |
| `documentBackUrl` | Back side image URL |
| `selfieUrl` | Selfie for liveness check |
| `livenessVideoUrl` | Optional liveness video |
| `livenessScore` | AI-generated liveness score |

#### Corporate KYC
| Field | Description |
|-------|-------------|
| `companyRegistrationNumber` | Company registration ID |
| `companyName` | Legal company name |
| `registrationDocumentUrl` | Company registration document |
| `memorandumUrl` | Memorandum of association |
| `boardResolutionUrl` | Board resolution document |
| `businessLicenseUrl` | Business license |
| `authorizedSignatories` | JSON array of authorized signatories |
| `ultimateBeneficialOwners` | JSON array of UBOs |

### Document Expiry Notifications

The system tracks document expiry dates and sends automatic email reminders to users before their KYC documents expire.

#### Tracked Documents
| Document Type | Table | Field |
|---------------|-------|-------|
| Passport | `finatrades_personal_kyc` | `passport_expiry_date` |
| Trade License | `finatrades_corporate_kyc` | `trade_license_expiry_date` |
| Director Passport | `finatrades_corporate_kyc` | `director_passport_expiry_date` |

#### Reminder Schedule
| Days Before Expiry | Reminder Type |
|-------------------|---------------|
| 30 days | First reminder |
| 14 days | Second reminder |
| 7 days | Urgent reminder |
| 3 days | Critical reminder |
| 1 day | Final reminder |

#### Technical Implementation
- **Scheduler**: Runs daily via `server/document-expiry.ts`
- **Email Template**: `document_expiry_reminder` with `document_type` variable
- **Admin Display**: Expiry dates shown in KYC review panel (`/admin/kyc`)

---

## FinaPay - Digital Wallet System

### Overview
FinaPay is the core digital wallet for buying, selling, storing, and transferring gold. Each user gets a wallet upon registration.

### Wallet Structure
Each user has a single wallet with:
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique wallet identifier |
| `userId` | UUID | Owner user ID |
| `goldGrams` | Decimal(18,6) | Gold balance in grams (6 decimal precision) |
| `usdBalance` | Decimal(18,2) | USD fiat balance |
| `eurBalance` | Decimal(18,2) | EUR fiat balance |
| `createdAt` | Timestamp | Wallet creation date |
| `updatedAt` | Timestamp | Last update timestamp |

### API Endpoints

#### Wallet Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet/:userId` | Owner/Admin | Get wallet balance |

#### Transaction Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/transactions/:userId` | Owner/Admin | Get user transactions |
| POST | `/api/transactions` | KYC + Idempotency | Create new transaction |
| PATCH | `/api/transactions/:id` | Authenticated | Update transaction status |

#### Deposit Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/deposit-requests/:userId` | Owner/Admin | Get deposit requests |
| POST | `/api/deposit-requests` | KYC + Idempotency | Create deposit request |

#### Withdrawal Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/withdrawal-requests/:userId` | Owner/Admin | Get withdrawal requests |
| POST | `/api/withdrawal-requests` | KYC + PIN + Idempotency | Create withdrawal request |

### Transaction Types
| Type | Description | Fee Applicable |
|------|-------------|----------------|
| `Buy` | Purchase gold with fiat | Yes |
| `Sell` | Sell gold for fiat | Yes |
| `Send` | Send gold to another user | Yes |
| `Receive` | Receive gold from another user | No |
| `Swap` | Currency swap (USD ↔ EUR) | Yes |
| `Deposit` | Add fiat to wallet | Method-dependent |
| `Withdrawal` | Withdraw fiat to bank account | Yes |

### Transaction Statuses
| Status | Description | User Action |
|--------|-------------|-------------|
| `Draft` | Transaction not yet submitted | Can edit/delete |
| `Pending` | Awaiting processing | Can cancel |
| `Pending Verification` | Requires additional verification | Upload documents |
| `Approved` | Approved by admin | None |
| `Processing` | Being processed | None |
| `Completed` | Successfully completed | None |
| `Failed` | Transaction failed | Retry/contact support |
| `Cancelled` | Cancelled by user | None |
| `Rejected` | Rejected by admin | Contact support |

### P2P Transfer Features
| Feature | Description | Configuration |
|---------|-------------|---------------|
| **Accept/Reject** | Recipients can approve incoming transfers | User preference |
| **Auto-Accept Timeout** | Hours before auto-accept | `transferApprovalTimeout` (default: 24h) |
| **Transfer Limits** | Min/max amounts per transfer | Platform config |
| **Fee Structure** | Percentage-based fees | Platform config |
| **Recipient Search** | Find users by email or Finatrades ID | Real-time search |

### Payment Request System
| Feature | Description |
|---------|-------------|
| **Create Request** | User creates payment request with amount and optional message |
| **Share Request** | Request ID/link shared with payer |
| **Notification** | Payer receives notification |
| **Fulfill/Decline** | Payer can pay or decline the request |
| **Expiry** | Requests expire after configurable period |

### Deposit Methods
| Method | Processing Time | Fees |
|--------|-----------------|------|
| Bank Transfer | 1-3 business days | Platform fee |
| Card Payment (NGenius) | Instant | Card processing fee |
| Crypto (Binance Pay) | Near-instant | Network fee |

---

## FinaVault - Gold Storage System

### Overview
FinaVault provides secure physical gold storage in certified vaults. Users can store physical gold bars with allocated or pooled storage options.

### Vault Holding Types
| Type | Description | Custody |
|------|-------------|---------|
| Digital Ownership | Gold owned digitally | Finatrades |
| Physical Storage | Physical gold bars in vault | Wingold & Metals DMCC |

### Vault Holding Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique holding identifier |
| `userId` | UUID | Owner user ID |
| `goldGrams` | Decimal(18,6) | Amount of gold in grams |
| `vaultLocation` | String | Physical vault location |
| `wingoldStorageRef` | String | Wingold storage reference number |
| `storageType` | Enum | 'allocated' or 'pooled' |
| `status` | Enum | 'active', 'pending_withdrawal', 'withdrawn' |
| `isPhysicallyDeposited` | Boolean | Whether gold is physically in vault |
| `barSerialNumber` | String | Physical bar serial (if allocated) |
| `purity` | Decimal | Gold purity (e.g., 999.9) |

### API Endpoints

#### Vault Holdings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/:userId` | Owner/Admin | Get vault holdings |
| GET | `/api/vault/ownership/:userId` | Owner/Admin | Get ownership certificates |
| GET | `/api/vault/ledger/:userId` | Owner/Admin | Get vault ledger history |
| GET | `/api/vault/activity/:userId` | Owner/Admin | Get vault activity log |
| POST | `/api/vault` | Authenticated | Create vault holding |
| PATCH | `/api/vault/:id` | Authenticated | Update vault holding |

#### Physical Deposits
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/deposits/:userId` | Owner/Admin | Get deposit requests |
| GET | `/api/vault/deposit/:id` | Authenticated | Get deposit details |
| POST | `/api/vault/deposit` | KYC | Create physical deposit request |

#### Physical Withdrawals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/withdrawals/:userId` | Owner/Admin | Get withdrawal requests |
| GET | `/api/vault/withdrawal/:id` | Authenticated | Get withdrawal details |
| POST | `/api/vault/withdrawal` | KYC | Create withdrawal request |

#### Physical Delivery
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/physical-deliveries/:userId` | Owner/Admin | Get delivery requests |
| POST | `/api/vault/physical-delivery` | KYC | Request physical delivery |

#### Gold Bars
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/gold-bars/:userId` | Owner/Admin | Get allocated gold bars |

#### Vault Transfers & Gifts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/transfers/:userId` | Owner/Admin | Get vault transfers |
| POST | `/api/vault/transfers` | KYC | Create vault transfer |
| GET | `/api/vault/gifts/:userId` | Owner/Admin | Get gold gifts |
| POST | `/api/vault/gifts` | KYC | Send gold as gift |
| POST | `/api/vault/gifts/:id/claim` | Authenticated | Claim gold gift |

#### Storage & Insurance
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vault/storage-fees/:userId` | Owner/Admin | Get storage fee history |
| GET | `/api/vault/insurance/:userId` | Owner/Admin | Get insurance coverage |
| GET | `/api/vault/locations` | Authenticated | Get available vault locations |

### Default Vault Location
**Dubai - Wingold & Metals DMCC**
- Address: Jumeirah Lakes Towers, Dubai, UAE
- Insurance: Lloyd's of London
- Security: 24/7 armed security, biometric access

### Storage Types
| Type | Description | Minimum | Fees |
|------|-------------|---------|------|
| **Allocated** | Specific bars assigned to user | 100g | Higher storage fee |
| **Pooled** | Shared pool, fractional ownership | 1g | Lower storage fee |

### Physical Delivery Options
| Option | Description | Timeframe |
|--------|-------------|-----------|
| **Vault Pickup** | Collect from vault location | Same day |
| **Insured Courier** | Delivered to address | 3-5 business days |
| **International Shipping** | Cross-border delivery | 7-14 business days |

---

## BNSL - Buy Now Sell Later

### Overview
BNSL (Buy Now Sell Later) is an investment program where users lock gold for a fixed term and earn guaranteed annual returns. The platform uses the locked gold for trade finance operations and shares profits with users.

### Plan Terms and Returns
| Term | Annual Margin | Total Return |
|------|---------------|--------------|
| 12 months | 10% | 10% |
| 24 months | 11% | 22% |
| 36 months | 12% | 36% |

### BNSL Plan Structure
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique plan identifier |
| `userId` | UUID | Owner user ID |
| `contractId` | String | Unique contract identifier (BNSL-XXXXXX) |
| `tenorMonths` | Integer | Lock period (12, 24, or 36 months) |
| `agreedMarginAnnualPercent` | Decimal | Agreed annual return percentage |
| `goldSoldGrams` | Decimal(18,6) | Amount of gold locked |
| `enrollmentPriceUsdPerGram` | Decimal | Gold price at enrollment |
| `basePriceComponentUsd` | Decimal | Base value in USD |
| `startDate` | Date | Plan start date |
| `maturityDate` | Date | Plan maturity date |
| `status` | Enum | Plan status |

### API Endpoints

#### BNSL Plans
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bnsl/plans/:userId` | Owner/Admin | Get user's BNSL plans |
| GET | `/api/bnsl/templates` | Public | Get available plan templates |
| POST | `/api/bnsl/plans` | KYC + Idempotency | Create new BNSL plan |
| PATCH | `/api/bnsl/plans/:id` | Authenticated | Update plan status |

#### BNSL Wallet
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bnsl/wallet/:userId` | Owner/Admin | Get BNSL wallet balance |
| GET | `/api/bnsl/ledger/:userId` | Owner/Admin | Get BNSL ledger history |
| POST | `/api/bnsl/wallet/transfer` | KYC + Idempotency | Transfer gold to BNSL |
| POST | `/api/bnsl/wallet/withdraw` | KYC + Idempotency | Withdraw from BNSL |

#### BNSL Payouts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bnsl/payouts/:planId` | Authenticated | Get plan payouts |
| POST | `/api/bnsl/payouts` | Authenticated | Process payout |
| PATCH | `/api/bnsl/payouts/:id` | Authenticated | Update payout status |

#### Early Termination
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bnsl/early-termination/:planId` | Authenticated | Get termination quote |
| POST | `/api/bnsl/early-termination` | KYC | Request early termination |

#### BNSL Agreements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bnsl/agreements/plan/:planId` | Authenticated | Get plan agreement |
| GET | `/api/bnsl/agreements/user/:userId` | Owner/Admin | Get user's agreements |
| POST | `/api/bnsl/agreements` | Authenticated | Create agreement |
| PATCH | `/api/bnsl/agreements/:id` | Authenticated | Sign agreement |
| POST | `/api/bnsl/agreements/:id/send-email` | Authenticated | Email agreement copy |
| GET | `/api/bnsl/agreements/:id/download` | Authenticated | Download PDF |

### BNSL Plan Statuses
| Status | Description | User Actions |
|--------|-------------|--------------|
| `Pending Activation` | Plan created, awaiting activation | Sign agreement |
| `Active` | Plan is active, returns accruing | View payouts, request early exit |
| `Maturing` | Approaching maturity (30 days) | Prepare for completion |
| `Completed` | Plan completed successfully | Gold returned to wallet |
| `Early Termination Requested` | User requested early exit | Await processing |
| `Early Terminated` | Early exit processed | Gold returned (minus penalties) |
| `Defaulted` | Plan defaulted | Contact support |
| `Cancelled` | Plan cancelled before activation | None |

### Payout Structure
| Feature | Description |
|---------|-------------|
| **Accrual Method** | Returns accrue daily based on annual rate |
| **Payout Frequency** | Quarterly payouts (every 3 months) |
| **Payout Method** | Credited as gold grams to FinaPay wallet |
| **Payout Calculation** | `(goldGrams × annualRate × daysInPeriod) / 365` |

### Early Termination Fees
| Field | Description | Typical Value |
|-------|-------------|---------------|
| `adminFeePercent` | Administrative fee | 2% |
| `penaltyPercent` | Early exit penalty | 5-10% based on time remaining |
| `totalDeductionsUsd` | Total deductions applied | Calculated |
| `netValueUsd` | Net value after deductions | Calculated |
| `finalGoldGrams` | Gold returned to user | Principal minus penalties |

### Eligibility Requirements
| Requirement | Details |
|-------------|---------|
| **Minimum Gold** | 1 gram |
| **KYC Level** | Tier 1 (Basic) or higher |
| **Account Status** | Good standing, no active disputes |
| **Wallet Balance** | Sufficient gold to transfer |

### BNSL User Interface Language

The BNSL interface uses simple, everyday language to explain gold transfers:

#### Transfer Modal (FinaPay → BNSL)
- **Title**: "Locking in Today's Price"
- **Explanation**: "When you move gold into BNSL, you secure today's USD price. This protects you from price drops, but you won't gain if prices rise while the gold is in BNSL."

#### Withdraw Modal (BNSL → FinaPay)
- **Title**: "Unlocking Your Gold"
- **Explanation**: "Withdrawing gold returns it to FinaPay at today's market price. You'll receive current market value, which may be higher or lower than your original locked price."

**Design Note**: Technical terms like "hedge" are avoided to ensure clarity for non-financial users.

### BNSL Workflow
1. **Select Plan** → Choose term (12/24/36 months)
2. **Transfer Gold** → Move gold from FinaPay to BNSL wallet
3. **Sign Agreement** → Digital signature on terms
4. **Activation** → Plan becomes active
5. **Earn Returns** → Quarterly payouts credited
6. **Maturity** → Full gold + returns returned

---

## FinaBridge - Trade Finance

### Overview
FinaBridge is a gold-backed trade finance platform connecting importers and exporters. It enables businesses to use gold as collateral for international trade transactions, reducing counterparty risk and providing secure settlement.

### User Roles
| Role | Description | Capabilities |
|------|-------------|--------------|
| **Importer** | Buys goods from exporters | Create trade requests, accept proposals |
| **Exporter** | Sells goods to importers | View requests, submit proposals |
| **Both** | Can act as either party | Full access to both sides |

### API Endpoints

#### Trade Cases
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trade/cases/:userId` | Owner/Admin | Get user's trade cases |
| POST | `/api/trade/cases` | KYC | Create trade case |
| PATCH | `/api/trade/cases/:id` | Authenticated | Update trade case |

#### Trade Documents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trade/documents/:caseId` | Authenticated | Get case documents |
| POST | `/api/trade/documents` | Authenticated | Upload document |
| PATCH | `/api/trade/documents/:id` | Authenticated | Update document |

#### Importer Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/importer/requests/:userId` | Owner/Admin | Get import requests |
| POST | `/api/finabridge/importer/requests` | KYC | Create import request |
| POST | `/api/finabridge/importer/requests/:id/submit` | Authenticated | Submit request |
| GET | `/api/finabridge/importer/requests/:id/forwarded-proposals` | Authenticated | Get received proposals |
| POST | `/api/finabridge/importer/proposals/:proposalId/accept` | Authenticated | Accept proposal |
| POST | `/api/finabridge/importer/proposals/:proposalId/decline` | Authenticated | Decline proposal |

#### Exporter Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/exporter/open-requests/:userId` | Owner/Admin | View open import requests |
| GET | `/api/finabridge/exporter/proposals/:userId` | Owner/Admin | Get submitted proposals |
| POST | `/api/finabridge/exporter/proposals` | KYC | Submit proposal |
| PUT | `/api/finabridge/exporter/proposals/:id` | Authenticated | Update proposal |

#### FinaBridge Wallet
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/wallet/:userId` | Owner/Admin | Get FinaBridge wallet |
| GET | `/api/finabridge/ledger/:userId` | Owner/Admin | Get wallet ledger |
| POST | `/api/finabridge/wallet/:userId/fund` | Owner/Admin | Fund wallet |
| POST | `/api/finabridge/wallet/:userId/withdraw` | Owner/Admin | Withdraw from wallet |

#### Settlement & Escrow
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/settlement-holds/:userId` | Owner/Admin | Get active escrow holds |

#### Disputes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/disputes/user/:userId` | Owner/Admin | Get user's disputes |
| GET | `/api/finabridge/disputes/:id` | Authenticated | Get dispute details |
| POST | `/api/finabridge/disputes` | Authenticated | Raise dispute |
| POST | `/api/finabridge/disputes/:id/comments` | Authenticated | Add dispute comment |

#### Shipments & Certificates
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/shipments/:tradeRequestId` | Authenticated | Get shipment status |
| GET | `/api/finabridge/certificates/:tradeRequestId` | Authenticated | Get trade certificates |
| POST | `/api/finabridge/certificates` | Authenticated | Generate certificate |

#### Ratings & Trust
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/exporter/:userId/trust-score` | Authenticated | Get exporter trust score |
| GET | `/api/finabridge/exporter/:userId/ratings` | Authenticated | Get exporter ratings |
| POST | `/api/finabridge/ratings` | Authenticated | Submit rating |
| GET | `/api/finabridge/risk-assessment/:tradeRequestId` | Authenticated | Get risk assessment |

#### Agreements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/finabridge/agreements/user/:userId` | Owner/Admin | Get user's agreements |
| GET | `/api/finabridge/agreements/:id` | Authenticated | Get agreement details |
| POST | `/api/finabridge/agreements` | Authenticated | Create agreement |
| POST | `/api/finabridge/accept-disclaimer/:userId` | Owner/Admin | Accept FinaBridge disclaimer |

### Trade Case Structure
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique case identifier |
| `caseNumber` | String | Human-readable case number (FB-XXXXXX) |
| `userId` | UUID | Creator user ID |
| `companyName` | String | Trading company name |
| `tradeType` | Enum | 'Import' or 'Export' |
| `commodityType` | String | Type of commodity being traded |
| `tradeValueUsd` | Decimal | Total trade value in USD |
| `buyerName` | String | Buyer company name |
| `sellerName` | String | Seller company name |
| `originCountry` | String | Origin country code |
| `destinationCountry` | String | Destination country code |
| `riskLevel` | Enum | Low, Medium, High, Critical |
| `status` | Enum | Current trade status |

### Trade Case Statuses
| Status | Description | Next Actions |
|--------|-------------|--------------|
| `Draft` | Case in draft mode | Edit, submit |
| `Submitted` | Submitted for review | Await review |
| `Under Review` | Being reviewed by operations | Await decision |
| `Approved` | Approved by compliance | Activate trade |
| `Active` | Trade is active | Monitor, upload docs |
| `Settled` | Trade completed and settled | Rate counterparty |
| `Cancelled` | Trade cancelled | None |
| `Rejected` | Trade rejected | Appeal or create new |

### Approval Workflow
| Step | Role | Actions | SLA |
|------|------|---------|-----|
| 1. **Submission** | User | Submit trade request | - |
| 2. **Operations Review** | Operations Team | Verify documents, check validity | 24 hours |
| 3. **Compliance Review** | Compliance Team | AML/KYC checks, risk assessment | 48 hours |
| 4. **Final Approval** | Authorized Signatory | Approve or reject | 24 hours |

### Risk Levels
| Level | Description | Review Requirements |
|-------|-------------|---------------------|
| `Low` | Established partners, low value | Standard review |
| `Medium` | New partners, moderate value | Enhanced due diligence |
| `High` | High value, complex structure | Senior approval required |
| `Critical` | PEP involved, high-risk jurisdiction | Executive approval required |

### Deal Room Features
| Feature | Description |
|---------|-------------|
| **Participants** | Buyer, seller, and platform intermediaries |
| **Document Sharing** | Secure upload/download with version control |
| **Real-time Chat** | Socket.IO messaging between participants |
| **Agreement Acceptance** | Digital signature on trade terms |
| **Dispute Resolution** | Formal dispute process with arbitration |
| **Activity Log** | Complete audit trail of all actions |

### Trade Documents
| Document Type | Required | Description |
|---------------|----------|-------------|
| Commercial Invoice | Yes | Detailed invoice for goods |
| Bill of Lading | Yes | Shipping document from carrier |
| Certificate of Origin | Yes | Country of origin certification |
| Insurance Certificate | Yes | Cargo insurance coverage |
| Packing List | Yes | Detailed packing information |
| Quality Certificate | Optional | Quality inspection results |
| Customs Declaration | Conditional | For cross-border trades |
| Bank Guarantee | Conditional | For high-value trades |

### Shipment Tracking
| Status | Description | Trigger |
|--------|-------------|---------|
| `Pending` | Shipment not started | Trade approved |
| `Picked Up` | Cargo picked up | Carrier confirmation |
| `In Transit` | Cargo in transit | GPS tracking update |
| `Customs` | At customs clearance | Customs notification |
| `Delivered` | Delivered to destination | Delivery confirmation |
| `Disputed` | Delivery disputed | User raises dispute |

### Settlement Process
| Step | Action | Gold Movement |
|------|--------|---------------|
| 1. **Trade Initiation** | Both parties agree to terms | Gold locked in escrow |
| 2. **Document Upload** | All required documents uploaded | No movement |
| 3. **Document Verification** | Platform verifies documents | No movement |
| 4. **Shipment** | Goods shipped to destination | No movement |
| 5. **Delivery Confirmation** | Buyer confirms receipt | No movement |
| 6. **Settlement** | Trade completed | Gold released to seller |

### FinaBridge Wallet
| Field | Description |
|-------|-------------|
| `availableGoldGrams` | Gold available for trading |
| `lockedGoldGrams` | Gold locked in active trades |
| `incomingLockedGoldGrams` | Gold pending release from completed trades |

### Trust Score System
| Factor | Weight | Description |
|--------|--------|-------------|
| **Completed Trades** | 30% | Number of successful trades |
| **Trade Volume** | 20% | Total USD volume traded |
| **Rating Average** | 25% | Average rating from counterparties |
| **Dispute Rate** | 15% | Percentage of trades with disputes |
| **Account Age** | 10% | Time since account creation |

---

## Payment Integrations

### Supported Payment Methods

#### 1. Binance Pay (Crypto)
| Feature | Description |
|---------|-------------|
| **Type** | Cryptocurrency payments |
| **API** | `bpay.binanceapi.com` |
| **Flow** | QR code or deeplink |
| **Webhook** | Real-time payment notifications |
| **Required Secrets** | `BINANCE_PAY_API_KEY`, `BINANCE_PAY_SECRET_KEY`, `BINANCE_PAY_MERCHANT_ID` |

#### 2. NGenius (Card Payments)
| Feature | Description |
|---------|-------------|
| **Type** | Credit/Debit card payments |
| **Modes** | Sandbox and Live |
| **Features** | Saved cards, 3D Secure |
| **Webhook** | Payment status updates |
| **Required Secrets** | `NGENIUS_API_KEY`, `NGENIUS_OUTLET_REF` |

#### 3. Stripe (Card Payments)
| Feature | Description |
|---------|-------------|
| **Type** | Credit/Debit card payments |
| **Webhook** | Payment events |
| **Features** | Full Stripe integration |

#### 4. Bank Transfer (Fiat)
| Feature | Description |
|---------|-------------|
| **Type** | Manual bank transfers |
| **Flow** | User submits proof of payment |
| **Verification** | Admin manual verification |

#### 5. Crypto Deposits
| Feature | Description |
|---------|-------------|
| **Type** | Direct cryptocurrency deposits |
| **Verification** | Transaction hash verification |
| **Status Tracking** | Pending, Under Review, Approved, Rejected |

---

## Security Features

### Authentication
| Feature | Description |
|---------|-------------|
| **Method** | Email/password |
| **Password Hashing** | bcrypt (10 rounds) |
| **Session Storage** | PostgreSQL with connect-pg-simple |
| **Session Expiry** | Configurable |

### Email Verification
| Feature | Description |
|---------|-------------|
| **Requirement** | Mandatory before login |
| **OTP Code** | 6-digit code sent via email |
| **Code Expiry** | 10 minutes |
| **Rate Limit** | 5 requests per 5 minutes |
| **Skip Option** | Not available (email verification is enforced) |

**Flow:**
1. User registers with email/password
2. System sends 6-digit verification code
3. User enters code on verification page
4. Only after verification can user log in

### Multi-Factor Authentication (MFA)
| Method | Description |
|--------|-------------|
| `totp` | Time-based One-Time Password (Google Authenticator) |
| `sms` | SMS-based OTP |
| `email` | Email-based OTP |

#### MFA Fields
| Field | Description |
|-------|-------------|
| `mfaEnabled` | Whether MFA is enabled |
| `mfaMethod` | Selected MFA method |
| `mfaSecret` | TOTP secret key |
| `mfaBackupCodes` | JSON array of hashed backup codes |

### Biometric Authentication
| Field | Description |
|-------|-------------|
| `biometricEnabled` | Whether biometric auth is enabled |
| `biometricDeviceId` | Device identifier for biometric auth |

### Transaction PIN
- 4-digit PIN required for sensitive operations
- PIN is hashed before storage
- Supports PIN reset via email verification

### Security Headers (Helmet.js)
| Header | Configuration |
|--------|---------------|
| CSP | Strict in production, disabled in dev |
| HSTS | 1-year max-age in production |
| X-Frame-Options | deny (clickjacking protection) |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |

### CSRF Protection
- Custom header validation: `X-Requested-With: XMLHttpRequest`
- Exempt endpoints: Authentication flows, webhooks, public info

### Idempotency Middleware
- Redis-based atomic SETNX
- 24-hour TTL
- 30-second lock
- Applied to critical payment routes

---

## Certificate System

### Certificate Types
| Type | Issuer | Description |
|------|--------|-------------|
| `Digital Ownership` | Finatrades | Issued when gold is purchased |
| `Physical Storage` | Wingold | Confirms physical gold in vault |
| `Transfer` | Finatrades | Issued when gold moves between users |
| `BNSL Lock` | Finatrades | Issued when gold is locked into BNSL plan |
| `Trade Lock` | Finatrades | Issued when FinaBridge reserve is created |
| `Trade Release` | Finatrades | Issued when FinaBridge reserve is released |

### Certificate Statuses
| Status | Description |
|--------|-------------|
| `Active` | Certificate is valid and active |
| `Superseded` | Replaced by a newer certificate |
| `Cancelled` | Certificate has been cancelled |
| `Expired` | Certificate has expired |

### Certificate Fields
| Field | Description |
|-------|-------------|
| `certificateNumber` | Unique certificate number |
| `goldGrams` | Gold amount covered |
| `goldPriceUsdPerGram` | Gold price at issuance |
| `totalValueUsd` | Total USD value |
| `issuedAt` | Issuance timestamp |
| `expiresAt` | Expiry timestamp (optional) |
| `supersededBy` | ID of superseding certificate |

### Public Certificate Verification
- Certificates can be verified publicly via certificate number
- QR code generation for easy verification
- Verification page shows certificate details and authenticity

---

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts and authentication |
| `wallets` | User wallet balances |
| `transactions` | All transaction records |
| `notifications` | In-app notifications |
| `user_preferences` | User preference settings |

### KYC Tables

| Table | Description |
|-------|-------------|
| `kyc_submissions` | Legacy KYC submissions |
| `finatrades_personal_kyc` | Personal KYC submissions |
| `finatrades_corporate_kyc` | Corporate KYC submissions |

### Vault Tables

| Table | Description |
|-------|-------------|
| `vault_holdings` | User vault holdings |
| `certificates` | Ownership certificates |

### BNSL Tables

| Table | Description |
|-------|-------------|
| `bnsl_plan_templates` | BNSL plan templates |
| `bnsl_template_variants` | Template variants |
| `bnsl_plans` | User BNSL plans |
| `bnsl_payouts` | Scheduled/paid payouts |
| `bnsl_early_terminations` | Early exit records |

### FinaBridge Tables

| Table | Description |
|-------|-------------|
| `trade_cases` | Trade finance cases |
| `trade_documents` | Trade documents |
| `deal_rooms` | Deal room instances |
| `deal_room_participants` | Deal room members |
| `deal_room_messages` | Chat messages |
| `deal_room_agreement_acceptances` | Agreement signatures |
| `trade_disputes` | Dispute records |
| `trade_shipments` | Shipment tracking |
| `trade_settlements` | Settlement records |

### Payment Tables

| Table | Description |
|-------|-------------|
| `deposit_requests` | Fiat deposit requests |
| `withdrawal_requests` | Withdrawal requests |
| `crypto_payments` | Crypto payment records |
| `card_payments` | Card payment records |

### System Tables

| Table | Description |
|-------|-------------|
| `platform_config` | Platform configuration |
| `email_notification_settings` | Email toggle settings |
| `email_logs` | Email audit logs |
| `audit_logs` | System audit trail |
| `geo_restrictions` | Country restrictions |
| `branding_settings` | Platform branding |

---

## API Architecture

### Endpoint Categories

| Category | Base Path | Description |
|----------|-----------|-------------|
| Authentication | `/api/auth/*` | Login, register, password reset |
| Users | `/api/users/*` | User management |
| Wallets | `/api/wallets/*` | Wallet operations |
| Transactions | `/api/transactions/*` | Transaction operations |
| KYC | `/api/kyc/*` | KYC submissions |
| BNSL | `/api/bnsl/*` | BNSL operations |
| FinaBridge | `/api/finabridge/*` | Trade finance |
| Admin | `/api/admin/*` | Admin operations |
| Webhooks | `/api/webhooks/*` | Payment webhooks |

### Real-time Features (Socket.IO)

| Event | Direction | Description |
|-------|-----------|-------------|
| `ledger:sync` | Server → Client | Data sync notification |
| `balance_update` | Server → Client | Balance changed |
| `notification` | Server → Client | New notification |
| `chat:message` | Bidirectional | Chat messages |

---

*Last Updated: December 26, 2025*
