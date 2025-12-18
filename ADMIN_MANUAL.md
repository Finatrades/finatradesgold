# Finatrades Admin Panel Manual

**Version:** 1.0  
**Last Updated:** December 2024  
**Platform Author:** Charan Pratap Singh | +971568474843

---

## Table of Contents

1. [Quick Start Guide](#1-quick-start-guide)
2. [Admin Login & Security](#2-admin-login--security)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Daily Admin Tasks](#4-daily-admin-tasks)
5. [User Management](#5-user-management)
6. [KYC Review](#6-kyc-review)
7. [Payment Operations](#7-payment-operations)
8. [FinaVault Management](#8-finavault-management)
9. [BNSL Plans](#9-bnsl-plans)
10. [FinaBridge Trade Finance](#10-finabridge-trade-finance)
11. [Certificates](#11-certificates)
12. [Audit Logs](#12-audit-logs)
13. [System Settings](#13-system-settings)
14. [Emergency Actions](#14-emergency-actions)
15. [Do's and Don'ts](#15-dos-and-donts)
16. [Common Mistakes & Fixes](#16-common-mistakes--fixes)
17. [Payment Methods Comparison](#17-payment-methods-comparison)
18. [Glossary](#18-glossary)

---

## 1. Quick Start Guide

### What You Need to Know

As an admin, you are responsible for:
- Approving/rejecting user requests (KYC, deposits, withdrawals, gold purchases)
- Managing user accounts
- Monitoring platform activity
- Ensuring compliance and security

### First Steps After Login

1. Check the **Dashboard** for pending items
2. Review **Pending KYC** requests
3. Check **Payment Operations** for pending deposits/withdrawals
4. Review **Buy Gold Requests** waiting for approval

---

## 2. Admin Login & Security

### How to Log In

1. Go to `/admin/login`
2. Enter your **admin email** and **password**
3. If MFA is enabled, enter the **6-digit code** from your authenticator app
4. Click **Login**

### Security Features

| Feature | Description |
|---------|-------------|
| **Role-Based Access** | Only users with `admin` role can access admin pages |
| **Session Protection** | Unauthorized users are redirected to login page |
| **MFA (Two-Factor Auth)** | Optional authenticator app verification |
| **OTP for Actions** | Sensitive actions require email OTP verification |
| **Activity Logging** | All admin actions are recorded in audit logs |

### Protected Actions (Require OTP)

These actions may require email OTP verification:
- KYC Approval / Rejection
- Deposit Approval / Rejection
- Withdrawal Approval / Rejection
- BNSL Plan Approval / Rejection
- Trade Case Approval / Rejection
- User Suspension / Activation

### Session Security

- Your session is stored securely on the server
- Session ends when you log out or close the browser
- Unauthorized access attempts are blocked automatically

---

## 3. Dashboard Overview

**Location:** `/admin/dashboard`

The dashboard shows everything you need at a glance:

### Key Metrics (Top Cards)

| Card | What It Shows |
|------|---------------|
| **Total Users** | Number of registered accounts |
| **Total Volume** | All-time transaction value (USD + AED) |
| **Pending KYC** | Users waiting for identity verification |
| **Revenue** | Platform earnings from fees |

### Pending Items (Quick Action Cards)

| Card | What It Means |
|------|---------------|
| **Pending Deposits** | Bank/crypto deposits waiting for approval |
| **Pending Withdrawals** | Withdrawal requests needing processing |
| **Pending Transactions** | Other transactions requiring attention |

### Operations Overview

Shows counts for:
- Pending Deposits
- Pending Withdrawals
- Total Deposits (all-time)
- Total Withdrawals (all-time)
- All Requests

### Recent Activity Sections

- **Pending KYC Requests** - Quick list of users needing verification
- **Recent Transactions** - Latest platform transactions
- **Critical Events** - Important system events needing attention

### Understanding the Dashboard

**If you see:**
- **High Pending Deposits** → Go to Payment Operations immediately
- **High Pending KYC** → Users are waiting for account verification
- **Critical Events** → Check for security or compliance issues

---

## 4. Daily Admin Tasks

### Morning Checklist

1. **Login** to admin panel
2. **Check Dashboard** for pending counts
3. **Review KYC** submissions from overnight
4. **Process Deposits** waiting for approval
5. **Check Withdrawals** that need processing

### Priority Order

1. **Urgent:** Withdrawal requests (users waiting for money)
2. **High:** Buy Gold Bar requests (users made payment)
3. **Medium:** Deposit requests (users adding funds)
4. **Normal:** KYC reviews (new user onboarding)

### End of Day

1. Ensure all **urgent requests** are processed
2. Check **Audit Logs** for any unusual activity
3. Log out of admin panel

---

## 5. User Management

**Location:** `/admin/users`

### Viewing Users

1. Go to **User Management**
2. See list of all users with:
   - Name and email
   - Account type (Personal/Business)
   - KYC status
   - Email verification status
   - Registration date

### User Actions

| Action | How to Do It |
|--------|--------------|
| **View Details** | Click the eye icon → See full profile |
| **Verify Email** | Click menu → "Verify Email" (manual verification) |
| **Suspend User** | Click menu → "Suspend" → OTP verification if required |
| **Activate User** | Click menu → "Activate" → OTP verification if required |

### Searching Users

- Use the search box to find users by name or email
- Results update automatically as you type

### User Profile Details

When you click on a user, you can see:
- Personal information
- KYC status and documents
- Wallet balances (USD + Gold)
- Transaction history
- Certificates owned
- BNSL plans

---

## 6. KYC Review

**Location:** `/admin/kyc`

### KYC Types

| Type | Description |
|------|-------------|
| **Finatrades Personal** | Individual user verification |
| **Finatrades Corporate** | Business/company verification |

### KYC Status Meanings

| Status | Meaning |
|--------|---------|
| **Pending** | User submitted, waiting for review |
| **In Review** | Admin is currently reviewing |
| **Approved** | Verified successfully |
| **Rejected** | Documents/info not acceptable |

### How to Review KYC

1. Go to **KYC Reviews**
2. Click on a **Pending** submission
3. Review the following:
   - Personal information (name, DOB, nationality)
   - ID document (front and back)
   - Passport photo
   - Address proof
   - Selfie/liveness check (if required)
4. Click **Approve** if everything is correct
5. Click **Reject** if there are issues (you MUST provide a reason)

### Viewing Documents

- Click on any document thumbnail to view full size
- Use **Print** or **Download** buttons
- Documents can be viewed in a new tab

### Important Rules

- **Always verify** the photo matches the ID
- **Check expiry dates** on documents
- **Rejection reason is mandatory** - be specific
- User receives email notification of the decision

---

## 7. Payment Operations

**Location:** `/admin/finapay`

### Tabs Available

1. **Deposit Requests** - Bank transfer deposits
2. **Withdrawal Requests** - User withdrawal requests
3. **Crypto Payments** - Cryptocurrency deposits
4. **Buy Gold Requests** - Wingold gold bar purchases
5. **Bank Accounts** - Company bank accounts
6. **Crypto Wallets** - Company crypto wallet addresses

---

### 7.1 Bank Transfer Deposits

**User Flow:**
1. User selects "Add Funds" → "Bank Transfer"
2. User sends money to company bank account
3. User uploads proof of payment
4. Request appears in your panel

**Admin Review:**
1. Go to **Deposit Requests** tab
2. Click **Review** on pending request
3. Check:
   - Amount matches proof of payment
   - Reference number visible
   - Payment received in company bank
4. Click **Confirm** to credit user's wallet
5. Click **Reject** if payment not received

**What Happens on Approval:**
- USD balance credited to user's wallet
- Transaction record created
- User receives notification

---

### 7.2 Crypto Deposits

**User Flow:**
1. User selects "Add Funds" → "Crypto"
2. User sees wallet address and QR code
3. User sends crypto from external wallet
4. User submits transaction hash (TX ID)

**Admin Review:**
1. Go to **Crypto Payments** tab
2. Click **Review** on pending request
3. Check:
   - Transaction hash on blockchain explorer
   - Amount matches expected
   - Receipt if uploaded
4. Click **Approve & Credit** to confirm
5. Click **Reject** if transaction not found

**What Happens on Approval:**
- USD balance credited to user's wallet
- Audit log created

---

### 7.3 Buy Gold Bar (Wingold)

**User Flow:**
1. User clicks "Buy Gold Bar"
2. User purchases gold from Wingold website
3. User uploads Wingold receipt
4. User enters reference ID

**Admin Review:**
1. Go to **Buy Gold Requests** tab
2. Click **Review** on pending request
3. Verify:
   - Wingold Reference ID matches receipt
   - Amount USD is correct
   - Receipt is valid
4. **IMPORTANT:** Enter:
   - **Gold Amount (grams)** - actual gold purchased
   - **Gold Price ($/g)** - price at time of purchase
5. Click **Approve & Credit**

**What Happens on Approval:**
- Gold grams credited to user's wallet (NOT USD)
- Vault holding created
- Digital Ownership Certificate issued (Finatrades)
- Physical Storage Certificate issued (Wingold)
- Vault ledger entry recorded
- Transaction record created
- User receives real-time notification

---

### 7.4 Withdrawals

**User Flow:**
1. User requests withdrawal (bank or crypto)
2. Request appears in your panel

**Admin Review:**
1. Go to **Withdrawal Requests** tab
2. Click **Review** on pending request
3. Verify user has sufficient balance
4. Process the actual withdrawal (bank transfer or crypto send)
5. Click **Complete** when funds sent
6. Click **Reject** if cannot process

---

## 8. FinaVault Management

**Location:** `/admin/vault`

### What is FinaVault?

FinaVault is where users' physical gold is tracked. Every gram of gold in a user's wallet has a corresponding vault record.

### Vault Information

| Field | Description |
|-------|-------------|
| **Gold Grams** | Amount of gold stored |
| **Vault Location** | Physical storage location (e.g., Dubai - Wingold) |
| **Wingold Reference** | Storage partner's reference ID |
| **Created Date** | When the holding was created |

### Key Rules

- Gold in wallet MUST have a vault holding
- Each vault holding is linked to certificates
- Vault ledger tracks all gold movements

### Vault Ledger Actions

| Action | Description |
|--------|-------------|
| **Deposit** | Gold added to vault (Buy Gold Bar, Physical Deposit) |
| **Withdrawal** | Gold removed from vault |
| **Transfer** | Gold moved between users |
| **Lock** | Gold locked for BNSL or FinaBridge |
| **Unlock** | Gold released from lock |

---

## 9. BNSL Plans

**Location:** `/admin/bnsl`

### What is BNSL?

BNSL = "Buy Now Sell Later"
Users lock their gold for a period and receive margin payments.

### BNSL Status Types

| Status | Meaning |
|--------|---------|
| **Active** | Plan is running, user receiving payouts |
| **Pending** | Waiting for admin approval |
| **Completed** | Plan finished, gold released |
| **Early Terminated** | User exited early |

### Admin Tasks

1. **View Active Plans** - See all running BNSL plans
2. **Review Termination Requests** - Users wanting to exit early
3. **Manage Templates** - Set plan terms and rates

### Plan Details to Check

- Locked gold amount
- Tenor (lock period in months)
- Margin rate percentage
- Payout schedule
- Maturity date

### Early Termination

When a user requests early termination:
1. Review the request
2. Calculate early termination fee
3. Approve or reject
4. On approval: gold unlocked, fee deducted

---

## 10. FinaBridge Trade Finance

**Location:** `/admin/finabridge`

### What is FinaBridge?

Trade finance service where gold is locked as collateral for import/export trades.

### Trade Case Information

| Field | Description |
|-------|-------------|
| **Importer/Exporter** | User role in the trade |
| **Locked Gold** | Gold amount used as collateral |
| **Trade Amount** | USD value of the trade |
| **Status** | Current stage of the trade |
| **Documents** | Trade-related documents |

### Trade Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | New case awaiting review |
| **Under Review** | Admin is reviewing |
| **Approved** | Trade approved, gold locked |
| **Documents Required** | Waiting for user documents |
| **Completed** | Trade finished, gold released |
| **Rejected** | Trade not approved |

### Important Rule

**No gold should move without admin approval**

---

## 11. Certificates

### Certificate Types

| Type | Issuer | Purpose |
|------|--------|---------|
| **Digital Ownership** | Finatrades | Proves user owns the gold |
| **Physical Storage** | Wingold & Metals DMCC | Proves gold is physically stored |
| **Trade Release** | Finatrades | FinaBridge trade settlements |
| **BNSL Certificate** | Finatrades | BNSL plan confirmation |

### Certificate Features

- **Unique ID** - Each certificate has a unique number
- **Auto-Generated** - Created automatically on approval
- **Downloadable** - Users can download as PDF
- **Updated** - Changes when balance changes

---

## 12. Audit Logs

**Location:** `/admin/audit-logs`

### What is Logged

Every admin action is recorded with:

| Field | Description |
|-------|-------------|
| **Who** | Admin who performed the action |
| **What** | Action type (create, update, approve, reject) |
| **When** | Date and time |
| **Entity** | What was affected (user, transaction, KYC) |
| **Details** | Specific information about the change |

### How to Use Audit Logs

1. Go to **Audit Logs**
2. Use filters to narrow down:
   - Entity type (user, transaction, KYC)
   - Action type (approve, reject, update)
   - Search by ID or email
3. Click **View Details** on any log for full information

### Statistics Shown

- Total logs
- Today's activity
- Unique users
- Entity types

---

## 13. System Settings

### Available Settings Pages

| Page | What It Controls |
|------|------------------|
| **Platform Configuration** | Fees, limits, system settings |
| **Payment Gateways** | NGenius, crypto wallets, bank accounts |
| **Security Settings** | OTP requirements, session settings |
| **Email Notifications** | Email templates and settings |
| **CMS Management** | Website content pages |

### Important Settings

- **Transaction Limits** - Min/max deposit and withdrawal
- **Fees** - Trading fees, storage fees
- **KYC Settings** - Verification requirements
- **OTP Settings** - Which actions require OTP

---

## 14. Emergency Actions

### User Locked Out

1. Go to **User Management**
2. Find the user
3. Click **Verify Email** (if email issue)
4. Click **Activate** (if suspended)

### Suspicious Activity

1. Check **Audit Logs** for unusual actions
2. Suspend user if needed
3. Contact platform owner

### System Issues

1. Check **System Health** page
2. Look for error messages
3. Contact technical support if needed

### Wrong Approval

If you approved something by mistake:
- **Document the error** in admin notes
- **Contact platform owner** immediately
- Check if transaction can be reversed

---

## 15. Do's and Don'ts

### DO

- **Verify documents carefully** before KYC approval
- **Check blockchain** for crypto payments
- **Enter correct gold amount** for Buy Gold Bar approvals
- **Add admin notes** to explain decisions
- **Log out** when finished
- **Report** suspicious activity

### DON'T

- **Don't approve** without checking documents
- **Don't share** admin login credentials
- **Don't skip** OTP verification
- **Don't ignore** pending requests for too long
- **Don't approve** your own requests
- **Don't make changes** without proper verification

---

## 16. Common Mistakes & Fixes

### Mistake: Approved wrong gold amount

**Fix:**
1. Note the error
2. Contact platform owner
3. Manual adjustment may be needed in database

### Mistake: Rejected valid KYC

**Fix:**
1. User can resubmit
2. Apologize to user via support
3. Approve on resubmission

### Mistake: Can't find a user

**Fix:**
1. Check search spelling
2. Try searching by email instead of name
3. Check if user account was deleted

### Mistake: OTP not arriving

**Fix:**
1. Check spam folder
2. Wait 60 seconds and click "Resend"
3. Verify admin email is correct in settings

### Mistake: Dashboard not loading

**Fix:**
1. Refresh the page
2. Clear browser cache
3. Log out and log in again

---

## 17. Payment Methods Comparison

### Overview

| Method | Purpose | End Result | Processing |
|--------|---------|------------|------------|
| **Card Payment** | Deposit USD via card | USD → Wallet | **Automatic** |
| **Crypto Payment** | Deposit USD via crypto | USD → Wallet | **Manual** |
| **Bank Transfer** | Deposit USD via bank | USD → Wallet | **Manual** |
| **Buy Gold Bar** | Purchase gold from Wingold | Gold + Vault + Certs | **Manual** |

### Admin Actions Required

| Method | Admin Action | What Admin Enters |
|--------|--------------|-------------------|
| **Card Payment** | None (automatic) | Nothing |
| **Crypto Payment** | Approve/Reject | Admin notes only |
| **Bank Transfer** | Confirm/Reject | Admin notes only |
| **Buy Gold Bar** | Approve/Reject | **Gold grams + Price** |

### What Gets Created on Approval

| Method | Wallet | Vault | Certificates | Ledger |
|--------|--------|-------|--------------|--------|
| Card | USD | No | No | No |
| Crypto | USD | No | No | No |
| Bank | USD | No | No | No |
| Gold Bar | **GOLD** | **Yes** | **2 certs** | **Yes** |

---

## 18. Glossary

| Term | Meaning |
|------|---------|
| **KYC** | Know Your Customer - identity verification |
| **KYB** | Know Your Business - business verification |
| **MFA** | Multi-Factor Authentication |
| **OTP** | One-Time Password |
| **BNSL** | Buy Now Sell Later |
| **FinaPay** | Digital wallet for USD and gold |
| **FinaVault** | Gold storage and ownership |
| **FinaBridge** | Trade finance service |
| **Wingold** | Wingold & Metals DMCC (gold storage partner) |
| **Vault Holding** | Record of physical gold storage |
| **Ledger Entry** | Record of gold movement |
| **Certificate** | Proof of ownership document |
| **Tenor** | Lock period for BNSL plans |
| **Margin Rate** | Interest rate for BNSL payouts |

---

## QA Audit Findings

### Security Check Results

| Check | Status | Notes |
|-------|--------|-------|
| Admin login works | PASS | Email + password + optional MFA |
| Role separation | PASS | Only admin role can access admin pages |
| Unauthorized access blocked | PASS | Redirects to login page |
| OTP for sensitive actions | PASS | Configurable per action type |
| Activity logging | PASS | All actions logged with details |

### Dashboard Review

| Check | Status | Notes |
|-------|--------|-------|
| Total users visible | PASS | Shows count |
| Total gold visible | PASS | Volume includes gold value |
| Pending approvals | PASS | Shown prominently |
| Alerts/flags | PASS | Critical events section |
| Recent activities | PASS | Recent transactions shown |
| Understandable in 10 sec | PASS | Clear layout with labels |

### User & KYC Management

| Check | Status | Notes |
|-------|--------|-------|
| Full profile view | PASS | Click to see details |
| KYC status visible | PASS | Badge on user list |
| Approve/Reject flow | PASS | Dialog with options |
| Rejection reason required | PASS | Text field mandatory |
| Actions logged | PASS | Audit log created |

### Payment Operations

| Check | Status | Notes |
|-------|--------|-------|
| All methods available | PASS | Bank, Crypto, Gold Bar tabs |
| Receipt viewing | PASS | Document viewer included |
| Admin input fields | PASS | Gold grams + price for Buy Gold |
| Approval logging | PASS | Audit trail created |

### Audit Logs

| Check | Status | Notes |
|-------|--------|-------|
| Who logged | PASS | Performer ID stored |
| What logged | PASS | Action type stored |
| When logged | PASS | Timestamp stored |
| Before/After values | PARTIAL | Details field stores info |
| Searchable | PASS | Filter by entity/action |

### Recommendations

1. Consider adding "before/after" value columns in audit log view
2. Add session timeout notification
3. Consider adding admin activity dashboard with charts
4. Add bulk action capability for KYC reviews

---

**End of Admin Manual**

*For technical support, contact the platform development team.*
