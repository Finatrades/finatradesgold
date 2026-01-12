# Finatrades Core Business Logic

## The Golden Principle: GOLD IS THE ONLY TRUTH

Think of it like a bank that only stores gold bars, not cash.

---

## 1. What the User Sees vs What's Actually Stored

```
USER SEES:        $20,000.00 balance
SYSTEM STORES:    134.2735 grams of gold
HOW IT WORKS:     134.2735g × $148.20/g = $19,893.31 (calculated live)
```

**USD is never stored** - it's always calculated from gold × live price.

---

## 2. The Add Funds Journey (Step by Step)

```
STEP 1: User clicks "Add Funds"
        ↓
STEP 2: User enters amount (USD or Gold grams)
        → If USD: System calculates gold equivalent
        → If Gold: System calculates USD equivalent
        ↓
STEP 3: User selects payment method (Bank/Crypto/Card)
        ↓
STEP 4: User completes payment
        ↓
STEP 5: System creates ONE PENDING REQUEST
        → This SAME request shows in:
           • FinaPay Wallet
           • FinaVault (Gold Storage)
           • Transaction History
           • Storage History
        ↓
STEP 6: Admin reviews and APPROVES
        ↓
STEP 7: System does ATOMIC UPDATE (all at once):
           ① Physical gold allocated at Wingold warehouse
           ② Physical Storage Certificate created
           ③ Digital Ownership Certificate created  
           ④ Vault ledger entry recorded
           ⑤ Wallet credited with gold grams
```

---

## 3. The Chain of Custody (2 Steps)

When gold is deposited, it follows this chain:

```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Physical Storage                           │
│  Wingold & Metals → FinaVault                       │
│  "Gold bar physically stored in vault"              │
│  Certificate: Physical Storage Certificate          │
├─────────────────────────────────────────────────────┤
│  STEP 2: Digital Recording                          │
│  FinaVault → FinaPay Wallet (LGPW)                  │
│  "Ownership recorded in digital ledger"             │
│  Certificate: Digital Ownership Certificate         │
└─────────────────────────────────────────────────────┘
```

---

## 4. The Golden Rule (CRITICAL)

**No wallet credit happens until:**
1. ✅ Physical gold is allocated (`physicalGoldAllocatedG > 0`)
2. ✅ Storage certificate exists (`storageCertificateId` is set)

This prevents "fake" gold from appearing in wallets.

---

## 5. The Wallet Types

| Wallet | Full Name | Purpose |
|--------|-----------|---------|
| **LGPW** | Live Gold Price Wallet | Gold valued at current market price |
| **FGPW** | Fixed Gold Price Wallet | Gold locked at a specific price |

---

## 6. Universal Bank Rule (Fee Handling)

**Fees are ALWAYS deducted from the deposit, never added to payment.**

```
User pays:     $20,000.00
Fee (0.5%):    $100.00 (deducted from deposit)
Net deposit:   $19,900.00 → converted to gold grams
```

---

## 7. Data Flow Summary

```
USER DEPOSITS $20,000
        ↓
Admin approves payment
        ↓
System calculates: $20,000 ÷ $148.20/g = 134.9527g
        ↓
Fee deducted (0.5%): 134.9527g × 0.995 = 134.2735g NET
        ↓
Wingold allocates 134.2735g physical gold
        ↓
Certificates issued (Physical + Digital)
        ↓
Vault ledger records 2 entries:
   1. Vault_Transfer (Physical Storage)
   2. Deposit (Digital Recording)
        ↓
Wallet shows: 134.2735g (≈ $19,919.33 at current price)
```

---

## 8. Ledger Entry Types

| Action | Description | From | To |
|--------|-------------|------|-----|
| `Vault_Transfer` | Physical gold moved to vault | Wingold & Metals | FinaVault |
| `Deposit` | Ownership recorded digitally | FinaVault | FinaPay (LGPW/FGPW) |
| `Withdrawal` | Gold removed from wallet | FinaPay | External |
| `Transfer_Send` | Gold sent to another user | FinaPay | FinaPay (other user) |
| `Transfer_Receive` | Gold received from user | FinaPay (other user) | FinaPay |
| `LGPW_To_FGPW` | Swap to fixed price | LGPW | FGPW |
| `FGPW_To_LGPW` | Swap to market price | FGPW | LGPW |
| `FinaPay_To_BNSL` | Move to BNSL plan | FinaPay | BNSL |
| `BNSL_To_FinaPay` | Return from BNSL | BNSL | FinaPay |

---

## 9. Certificate Types

| Certificate | Issuer | Purpose |
|-------------|--------|---------|
| **Physical Storage Certificate** | Wingold & Metals | Proves gold is physically stored in vault |
| **Digital Ownership Certificate** | Finatrades | Proves user owns the gold digitally |

Both certificates are:
- Linked to transaction ID
- Linked to gold weight (grams)
- Linked to user
- Viewable and downloadable

---

## 10. Display Rules

### Accordion Chain-of-Custody Display

When viewing a deposit in any history page, show collapsible accordion with 2 steps:

```
▼ Deposit - 134.2735g - Completed
  ┌──────────────────────────────────────────┐
  │ Step 1: Physical Storage                 │
  │ From: Wingold & Metals                   │
  │ To: FinaVault                            │
  │ Action: Vault_Transfer                   │
  │ Value: $0.00 (physical movement only)    │
  └──────────────────────────────────────────┘
  ┌──────────────────────────────────────────┐
  │ Step 2: Recorded                         │
  │ From: FinaVault                          │
  │ To: FinaPay-LGPW                         │
  │ Action: Deposit                          │
  │ Value: $19,919.33                        │
  └──────────────────────────────────────────┘
```

### Sorting Priority

Entries within a group are sorted by action type:
1. `Vault_Transfer` (priority 0) - shows first
2. `Deposit` (priority 1) - shows second
3. Other actions (priority 2+)

---

## 11. Reconciliation Rules

At any time, the following must be true:

1. **Wallet Balance** = Sum of all vault ledger entries for user
2. **Vault Holdings** = Sum of all active certificates
3. **Transaction Count** = Ledger entry groups count

If these don't match, there's a data integrity issue.

---

## 12. Admin Approval Atomic Steps

When admin approves a deposit request, these happen in ONE transaction:

1. ✅ Verify payment proof
2. ✅ Calculate gold grams from USD
3. ✅ Deduct fee from gold amount
4. ✅ Create Physical Storage Certificate (Wingold)
5. ✅ Create Digital Ownership Certificate (Finatrades)
6. ✅ Record Vault_Transfer ledger entry
7. ✅ Record Deposit ledger entry
8. ✅ Update wallet balance (gold grams)
9. ✅ Mark deposit request as Confirmed
10. ✅ Send notification to user

If ANY step fails, ALL steps roll back.
