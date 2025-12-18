# Finatrades Admin Manual

## Table of Contents
1. [Payment Methods Comparison](#payment-methods-comparison)
2. [Admin Approval Workflows](#admin-approval-workflows)
3. [Payment Operations Guide](#payment-operations-guide)
4. [System Architecture](#system-architecture)

---

## Payment Methods Comparison

### Overview

| Method | Purpose | End Result | Processing |
|--------|---------|------------|------------|
| **Card Payment** | Deposit USD via credit/debit card | USD → Wallet (auto) | **Automatic** (NGenius) |
| **Crypto Payment** | Deposit USD via cryptocurrency | USD → Wallet | **Manual** (Admin) |
| **Bank Transfer** | Deposit USD via bank wire | USD → Wallet | **Manual** (Admin) |
| **Buy Gold Bar** | Purchase physical gold from Wingold | Gold + Vault + Certificates | **Manual** (Admin) |

---

### User Side - Step by Step

#### Card Payment (NGenius)
| Step | Action |
|------|--------|
| 1 | Click "Add Funds" → Choose "Card" |
| 2 | Enter amount in USD |
| 3 | Card form loads (NGenius SDK) |
| 4 | Enter card details (Visa/Mastercard) |
| 5 | 3D Secure verification (if required) |
| 6 | **Auto-processed** - No wait |
| 7 | **Instant**: USD credited to wallet |

#### Crypto Payment
| Step | Action |
|------|--------|
| 1 | Click "Add Funds" → Choose "Crypto" |
| 2 | Enter amount in USD |
| 3 | Select network (BTC, ETH, USDT, etc.) |
| 4 | View wallet address + QR code |
| 5 | Send crypto from external wallet |
| 6 | Enter Transaction Hash (TX ID) |
| 7 | Upload receipt (optional) |
| 8 | Submit → Status: "Pending" |
| 9 | **Wait for admin** verification |
| 10 | **Result**: USD credited to wallet |

#### Bank Transfer
| Step | Action |
|------|--------|
| 1 | Click "Add Funds" → Choose "Bank Transfer" |
| 2 | Select company bank account |
| 3 | View bank details (IBAN, SWIFT, etc.) |
| 4 | Make wire transfer from your bank |
| 5 | Enter amount transferred |
| 6 | Enter sender bank name + account name |
| 7 | Upload proof of payment (receipt) |
| 8 | Submit → Status: "Pending" |
| 9 | **Wait for admin** verification |
| 10 | **Result**: USD credited to wallet |

#### Buy Gold Bar (Wingold)
| Step | Action |
|------|--------|
| 1 | Click "Buy Gold Bar" |
| 2 | View compliance notice (Wingold partner) |
| 3 | Open Wingold website to purchase |
| 4 | Complete purchase on Wingold |
| 5 | Click "I've Completed My Purchase" |
| 6 | Enter: Amount USD, Wingold Reference ID |
| 7 | Upload Wingold receipt |
| 8 | Submit → Status: "Pending" |
| 9 | **Wait for admin** to enter gold grams & price |
| 10 | **Result**: Gold + Vault + 2 Certificates |

---

### Admin Side - Approval Process

#### Card Payment
| Aspect | Details |
|--------|---------|
| **Admin Action** | **NONE REQUIRED** |
| **Processing** | Automatic via NGenius gateway |
| **Verification** | NGenius handles fraud/3DS |
| **Wallet Credit** | Instant (on payment success) |
| **Admin View** | Can see in transaction history |

#### Crypto Payment
| Aspect | Details |
|--------|---------|
| **Location** | Payment Operations → Crypto Payments |
| **Admin Sees** | Amount, Network, TX Hash, Receipt |
| **Admin Verifies** | Check TX hash on blockchain (manual) |
| **Admin Action** | Click "Approve & Credit" or "Reject" |
| **On Approve** | Credits USD to wallet, Creates audit log |
| **Not Created** | No vault holding, No certificates |

#### Bank Transfer
| Aspect | Details |
|--------|---------|
| **Location** | Payment Operations → Deposit Requests |
| **Admin Sees** | Amount, Bank details, Reference, Receipt |
| **Admin Verifies** | Check bank statement (manual) |
| **Admin Action** | Click "Confirm" or "Reject" |
| **On Confirm** | Credits USD to wallet, Creates transaction record, Creates audit log |
| **Not Created** | No vault holding, No certificates |

#### Buy Gold Bar
| Aspect | Details |
|--------|---------|
| **Location** | Payment Operations → Buy Gold Requests |
| **Admin Sees** | Amount USD, Wingold Ref, Receipt |
| **Admin Enters** | Gold Grams + Gold Price per gram |
| **Admin Action** | Click "Approve & Credit" or "Reject" |
| **On Approve** | Credits GOLD to wallet (not USD), Creates vault holding, Issues Digital Ownership Certificate, Issues Physical Storage Certificate, Records vault ledger entry, Creates completed transaction, Creates audit log, Real-time socket update |

---

### Key Differences Summary

| Feature | Card | Crypto | Bank | Gold Bar |
|---------|------|--------|------|----------|
| **Processing** | Auto | Manual | Manual | Manual |
| **Admin Required** | No | Yes | Yes | Yes |
| **Admin Input** | None | None | None | Grams + Price |
| **Wallet Credit** | USD | USD | USD | **GOLD** |
| **Vault Holding** | No | No | No | Yes |
| **Certificates** | No | No | No | Yes (2) |
| **Ledger Entry** | No | No | No | Yes |
| **OTP Required** | No | Yes | Yes | Yes |
| **Speed** | Instant | 1-24h | 1-3 days | 1-3 days |
| **Fees** | Gateway fee | Network fee | Bank fee | Wingold fee |

---

### Where User Sees Result

| Method | FinaPay Wallet | FinaVault | Certificates | Transactions |
|--------|---------------|-----------|--------------|--------------|
| Card | USD balance | - | - | Deposit |
| Crypto | USD balance | - | - | Deposit |
| Bank | USD balance | - | - | Deposit |
| Gold Bar | **GOLD grams** | Holding | 2 certs | Buy |

---

## Admin Approval Workflows

### Buy Gold Bar Approval (Full Flow)

When admin approves a Buy Gold Bar request, the system performs these actions atomically:

1. **Credit Wallet**: Adds gold grams to user's FinaPay wallet
2. **Create Transaction**: Records a "Buy" transaction with status "Completed"
3. **Create Vault Holding**: Creates entry with Wingold storage reference
4. **Issue Digital Ownership Certificate**: From Finatrades
5. **Issue Physical Storage Certificate**: From Wingold & Metals DMCC
6. **Record Vault Ledger Entry**: "Deposit" action logged
7. **Update Request Status**: Changes to "Credited"
8. **Create Audit Log**: Records admin action
9. **Emit Socket Events**: Real-time updates to user dashboard

### Crypto Payment Approval (Full Flow)

When admin approves a Crypto payment:

1. **Update Request Status**: Changes to "Approved"
2. **Credit Wallet**: Adds USD to user's wallet balance
3. **Create Audit Log**: Records admin action

### Bank Transfer Approval (Full Flow)

When admin confirms a Bank deposit:

1. **Update Request Status**: Changes to "Confirmed"
2. **Credit Wallet**: Adds USD to user's wallet balance
3. **Create Transaction Record**: "Deposit" type transaction
4. **Create Audit Log**: Records admin action

---

## Payment Operations Guide

### Accessing Payment Operations

Navigate to: **Admin Panel → FinaPay** or **/admin/finapay**

### Tabs Available

1. **Deposit Requests** - Bank transfer deposits pending approval
2. **Withdrawal Requests** - User withdrawal requests
3. **Crypto Payments** - Cryptocurrency deposits pending approval
4. **Buy Gold Requests** - Wingold gold bar purchases pending approval
5. **Bank Accounts** - Manage company bank accounts
6. **Crypto Wallets** - Manage company crypto wallets

### Processing a Buy Gold Bar Request

1. Go to **Buy Gold Requests** tab
2. Find pending request and click **Review**
3. Verify:
   - Wingold Reference ID matches receipt
   - Amount USD is correct
   - Receipt document is valid
4. Enter:
   - **Gold Amount (grams)**: Actual gold purchased
   - **Gold Price ($/g)**: Price at time of purchase
5. Click **Approve & Credit**
6. System will:
   - Credit gold to user's wallet
   - Create vault holding
   - Issue 2 certificates
   - Record ledger entry

### Processing a Crypto Payment

1. Go to **Crypto Payments** tab
2. Find pending request and click **Review**
3. Verify:
   - Transaction Hash on blockchain explorer
   - Amount matches expected
   - Receipt if provided
4. Add admin notes (optional)
5. Click **Approve & Credit**
6. System will credit USD to user's wallet

### Processing a Bank Deposit

1. Go to **Deposit Requests** tab
2. Find pending request and click **Review**
3. Verify:
   - Payment received in company bank account
   - Reference number matches
   - Amount matches
4. Add admin notes (optional)
5. Click **Confirm**
6. System will credit USD to user's wallet

---

## System Architecture

### Core Calculation Rule

All financial calculations are performed in **USD value**, while the underlying asset is **gold (grams)**:
- USD is used for user input, transaction calculations, and reporting
- Gold grams represent the actual owned asset

### Partner Integration

**Wingold & Metals DMCC**
- Physical gold storage partner
- Located in Dubai
- Issues Physical Storage Certificates
- Referenced by Wingold Storage Reference IDs

### Certificate Types

| Certificate Type | Issuer | Purpose |
|-----------------|--------|---------|
| Digital Ownership | Finatrades | Proves ownership of gold |
| Physical Storage | Wingold & Metals DMCC | Proves physical storage |
| Trade Release | Finatrades | FinaBridge trade settlements |
| BNSL Certificate | Finatrades | Buy Now Sell Later plans |

### Vault Ledger Actions

- **Deposit**: Gold added to vault (Buy Gold Bar, Physical Deposit)
- **Withdrawal**: Gold removed from vault
- **Transfer**: Gold moved between users
- **Lock**: Gold locked for BNSL or FinaBridge
- **Unlock**: Gold released from lock

---

## Contact

**Platform Author**: Charan Pratap Singh  
**Contact**: +971568474843

---

*Last Updated: December 2024*
