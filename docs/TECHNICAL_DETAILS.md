# Finatrades Technical Details Report

## Author
**Charan Pratap Singh**  
Contact: +971568474843

---

## Table of Contents
1. [Dashboard](#dashboard)
2. [Notification System](#notification-system)
3. [Platform Configuration](#platform-configuration)
4. [User Preferences System](#user-preferences-system)
5. [KYC Verification System](#kyc-verification-system)
6. [FinaPay - Digital Wallet System](#finapay---digital-wallet-system)
7. [FinaVault - Gold Storage System](#finavault---gold-storage-system)
8. [BNSL - Buy Now Sell Later](#bnsl---buy-now-sell-later)
9. [FinaBridge - Trade Finance](#finabridge---trade-finance)
10. [Payment Integrations](#payment-integrations)
11. [Security Features](#security-features)
12. [Certificate System](#certificate-system)
13. [Database Schema Overview](#database-schema-overview)

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

---

## FinaPay - Digital Wallet System

### Wallet Structure
Each user has a single wallet with:
| Field | Description |
|-------|-------------|
| `goldGrams` | Gold balance in grams (6 decimal precision) |
| `usdBalance` | USD fiat balance |
| `eurBalance` | EUR fiat balance |

### Transaction Types
| Type | Description |
|------|-------------|
| `Buy` | Purchase gold with fiat |
| `Sell` | Sell gold for fiat |
| `Send` | Send gold to another user |
| `Receive` | Receive gold from another user |
| `Swap` | Currency swap |
| `Deposit` | Add fiat to wallet |
| `Withdrawal` | Withdraw fiat from wallet |

### Transaction Statuses
| Status | Description |
|--------|-------------|
| `Draft` | Transaction not yet submitted |
| `Pending` | Awaiting processing |
| `Pending Verification` | Requires additional verification |
| `Approved` | Approved by admin |
| `Processing` | Being processed |
| `Completed` | Successfully completed |
| `Failed` | Transaction failed |
| `Cancelled` | Cancelled by user |
| `Rejected` | Rejected by admin |

### P2P Transfer Features
- **Accept/Reject**: Users can require approval for incoming transfers
- **Auto-Accept Timeout**: Configurable hours before auto-accept
- **Transfer Limits**: Configurable min/max amounts
- **Fee Structure**: Percentage-based fees

---

## FinaVault - Gold Storage System

### Vault Holding Types
| Type | Description |
|------|-------------|
| Digital Ownership | Gold owned digitally (Finatrades custody) |
| Physical Storage | Physical gold stored in vault (Wingold custody) |

### Vault Holding Fields
| Field | Description |
|-------|-------------|
| `goldGrams` | Amount of gold in grams |
| `vaultLocation` | Physical vault location |
| `wingoldStorageRef` | Wingold storage reference |
| `storageType` | 'allocated' or 'pooled' |
| `status` | 'active', 'pending_withdrawal', 'withdrawn' |

### Default Vault Location
**Dubai - Wingold & Metals DMCC**

---

## BNSL - Buy Now Sell Later

### Overview
BNSL allows users to lock gold for a fixed term and earn guaranteed returns.

### Plan Terms and Returns
| Term | Annual Margin |
|------|---------------|
| 12 months | 10% |
| 24 months | 11% |
| 36 months | 12% |

### BNSL Plan Structure
| Field | Description |
|-------|-------------|
| `contractId` | Unique contract identifier |
| `tenorMonths` | Lock period in months |
| `agreedMarginAnnualPercent` | Agreed annual return percentage |
| `goldSoldGrams` | Amount of gold locked |
| `enrollmentPriceUsdPerGram` | Gold price at enrollment |
| `basePriceComponentUsd` | Base value in USD |
| `startDate` | Plan start date |
| `maturityDate` | Plan maturity date |

### BNSL Plan Statuses
| Status | Description |
|--------|-------------|
| `Pending Activation` | Plan created, awaiting activation |
| `Active` | Plan is active, returns accruing |
| `Maturing` | Approaching maturity |
| `Completed` | Plan completed successfully |
| `Early Termination Requested` | User requested early exit |
| `Early Terminated` | Early exit processed |
| `Defaulted` | Plan defaulted |
| `Cancelled` | Plan cancelled |

### Payout Structure
- **Accrual**: Returns accrue daily
- **Payout Frequency**: Quarterly payouts
- **Payout Method**: Credited as gold grams to wallet

### Early Termination
| Field | Description |
|-------|-------------|
| `adminFeePercent` | Administrative fee percentage |
| `penaltyPercent` | Early exit penalty percentage |
| `totalDeductionsUsd` | Total deductions applied |
| `netValueUsd` | Net value after deductions |
| `finalGoldGrams` | Gold returned to user |

### Eligibility Requirements
- Minimum gold: 1 gram
- Completed KYC verification (Tier 1 or higher)
- Account in good standing
- No active disputes

---

## FinaBridge - Trade Finance

### Overview
FinaBridge facilitates gold-backed trade finance between importers and exporters.

### Trade Case Structure
| Field | Description |
|-------|-------------|
| `caseNumber` | Unique case identifier |
| `companyName` | Trading company name |
| `tradeType` | Import or Export |
| `commodityType` | Type of commodity |
| `tradeValueUsd` | Total trade value in USD |
| `buyerName` | Buyer company name |
| `sellerName` | Seller company name |
| `originCountry` | Origin country |
| `destinationCountry` | Destination country |

### Trade Case Statuses
| Status | Description |
|--------|-------------|
| `Draft` | Case in draft mode |
| `Submitted` | Case submitted for review |
| `Under Review` | Being reviewed by operations |
| `Approved` | Approved by compliance |
| `Active` | Trade is active |
| `Settled` | Trade completed and settled |
| `Cancelled` | Trade cancelled |
| `Rejected` | Trade rejected |

### Approval Workflow
1. **Operations Approval**: Initial review by operations team
2. **Compliance Approval**: Compliance team review
3. **Final Approval**: Trade becomes active

### Risk Levels
| Level | Description |
|-------|-------------|
| `Low` | Low risk trade |
| `Medium` | Medium risk, standard monitoring |
| `High` | High risk, enhanced monitoring |
| `Critical` | Critical risk, escalated review |

### Deal Room Features
- **Participants**: Buyer, seller, and intermediaries
- **Document Sharing**: Secure document upload/download
- **Chat**: Real-time messaging between participants
- **Agreement Acceptance**: Digital agreement signing
- **Dispute Resolution**: Formal dispute process

### Trade Documents
| Document Type | Description |
|---------------|-------------|
| Invoice | Commercial invoice |
| Bill of Lading | Shipping document |
| Certificate of Origin | Country of origin certificate |
| Insurance Certificate | Cargo insurance |
| Packing List | Detailed packing information |
| Quality Certificate | Quality inspection certificate |

### Shipment Tracking
| Status | Description |
|--------|-------------|
| `Pending` | Shipment not started |
| `Picked Up` | Cargo picked up |
| `In Transit` | Cargo in transit |
| `Customs` | At customs clearance |
| `Delivered` | Delivered to destination |

### Settlement Process
1. **Gold Lock**: Gold locked in escrow at trade initiation
2. **Document Verification**: All documents verified
3. **Shipment Confirmation**: Shipment delivered and confirmed
4. **Gold Release**: Gold released to appropriate party

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
