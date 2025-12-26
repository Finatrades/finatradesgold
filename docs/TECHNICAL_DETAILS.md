# Finatrades Technical Details Report

## Author
**Charan Pratap Singh**  
Contact: +971568474843

---

## Table of Contents
1. [Notification System](#notification-system)
   - [Email Notifications](#email-notifications)
   - [Bell/In-App Notifications](#bellin-app-notifications)
   - [Push Notifications](#push-notifications)
2. [Additional Details](#additional-details) *(To be added)*

---

## Notification System

### Email Notifications (55 Templates)

The platform sends 55 different email templates organized into the following categories:

#### Authentication & Security (7 templates)
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

#### FinaBridge Trade Finance (~8 templates)
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

#### Marketing (~5 templates)
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
   - `transactionAlerts` - Transaction-related emails
   - `securityAlerts` - Security-related emails
   - `marketingEmails` - Marketing and promotional emails

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

## Additional Details

*(To be added in future updates)*

- Fee Structure
- Transaction Limits
- KYC Tiers and Requirements
- Vault Inventory Management
- Payment Method Configuration
- Platform Configuration Settings

---

*Last Updated: December 26, 2025*
