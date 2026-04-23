/**
 * FinaTrades Chart of Accounts (GL Code Mapping)
 *
 * Maps every FinaTrades transaction type and vault ledger action to a
 * debit account and credit account in a numbered general-ledger scheme.
 *
 * Account number ranges:
 *   1000–1999  Assets
 *   2000–2999  Liabilities
 *   3000–3999  Equity
 *   4000–4999  Revenue
 *   5000–5999  Cost of Revenue
 *   6000–6999  Operating Expenses
 */

export interface GlAccount {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'CostOfRevenue' | 'Expense';
}

export interface GlEntry {
  debit: GlAccount;
  credit: GlAccount;
  description: string;
}

// ============================================================
// ACCOUNT DEFINITIONS
// ============================================================

export const GL_ACCOUNTS: Record<string, GlAccount> = {
  // Assets
  USER_GOLD_HOLDINGS: { code: '1010', name: 'User Gold Holdings (Asset)', type: 'Asset' },
  PLATFORM_CASH_IN_TRANSIT: { code: '1020', name: 'Platform Cash-in-Transit', type: 'Asset' },
  PENDING_DEPOSITS: { code: '1030', name: 'Pending Deposits Receivable', type: 'Asset' },
  BNSL_GOLD_RESERVE: { code: '1040', name: 'BNSL Gold Reserve', type: 'Asset' },
  FINABRIDGE_GOLD_RESERVE: { code: '1050', name: 'FinaBridge Gold Reserve', type: 'Asset' },
  PLATFORM_GOLD_INVENTORY: { code: '1060', name: 'Platform Gold Inventory', type: 'Asset' },
  STORAGE_ESCROW: { code: '1070', name: 'Storage Escrow (Wingold)', type: 'Asset' },

  // Liabilities
  USER_GOLD_LIABILITY: { code: '2010', name: 'User Gold Holdings Liability', type: 'Liability' },
  PENDING_WITHDRAWALS_PAYABLE: { code: '2020', name: 'Pending Withdrawals Payable', type: 'Liability' },
  BNSL_PAYOUT_OBLIGATION: { code: '2030', name: 'BNSL Payout Obligation', type: 'Liability' },

  // Revenue
  GOLD_TRADING_REVENUE: { code: '4001', name: 'Gold Trading Revenue (Spread)', type: 'Revenue' },
  BNSL_MARGIN_INCOME: { code: '4002', name: 'BNSL Margin Income', type: 'Revenue' },
  TRANSFER_FEE_INCOME: { code: '4003', name: 'Transfer Fee Income', type: 'Revenue' },
  STORAGE_FEE_INCOME: { code: '4004', name: 'Storage Fee Income (Collected)', type: 'Revenue' },
  OTHER_FEE_INCOME: { code: '4005', name: 'Other Fee / Service Income', type: 'Revenue' },
  GIFT_SERVICE_INCOME: { code: '4006', name: 'Gift Transfer Service Income', type: 'Revenue' },

  // Cost of Revenue
  STORAGE_FEE_PAID: { code: '5001', name: 'Storage Fees Paid (Wingold)', type: 'CostOfRevenue' },
  GOLD_PURCHASE_COST: { code: '5002', name: 'Gold Purchase Cost', type: 'CostOfRevenue' },
  BNSL_PAYOUT_COST: { code: '5003', name: 'BNSL Payout Cost', type: 'CostOfRevenue' },

  // Operating Expenses
  ADJUSTMENT_EXPENSE: { code: '6001', name: 'Adjustment / Write-off Expense', type: 'Expense' },
  PHYSICAL_DELIVERY_COST: { code: '6002', name: 'Physical Delivery Cost', type: 'Expense' },
};

// ============================================================
// TRANSACTION TYPE → GL ENTRY MAPPING
// (FinaTrades transaction types: Buy, Sell, Send, Receive, Swap, Deposit, Withdrawal)
// ============================================================

export const TRANSACTION_GL_MAP: Record<string, GlEntry> = {
  // ── Core FinaTrades transaction types (DB enum values) ─────────────────────
  Deposit: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.GOLD_TRADING_REVENUE,
    description: 'User deposits gold — increases holdings asset, recognises revenue',
  },
  Withdrawal: {
    debit: GL_ACCOUNTS.PENDING_WITHDRAWALS_PAYABLE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'User withdraws gold — reduces liability (payment due) and holdings',
  },
  Buy: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.GOLD_TRADING_REVENUE,
    description: 'User buys gold — increases holdings asset, recognises spread revenue',
  },
  Sell: {
    debit: GL_ACCOUNTS.GOLD_TRADING_REVENUE,
    credit: GL_ACCOUNTS.USER_GOLD_LIABILITY,
    description: 'User sells gold — reduces holdings, creates cash obligation',
  },
  Send: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.TRANSFER_FEE_INCOME,
    description: 'Peer gold transfer sent — may attract transfer fee revenue',
  },
  Receive: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.USER_GOLD_LIABILITY,
    description: 'Peer gold transfer received — increases recipient holdings',
  },
  Swap: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.OTHER_FEE_INCOME,
    description: 'Gold swap — recognised at fair value, spread is fee income',
  },

  // ── Business-term aliases (auditor-facing names → GL entries) ─────────────
  // These cover required terminology: Fee, Transfer, Storage Fee, Payout, Adjustment, BNSL Lock/Unlock
  Fee: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.OTHER_FEE_INCOME,
    description: 'General fee deduction from user holding',
  },
  Transfer: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.TRANSFER_FEE_INCOME,
    description: 'Gold transfer — alias for Send; may attract transfer fee revenue',
  },
  'Storage Fee': {
    debit: GL_ACCOUNTS.STORAGE_FEE_PAID,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Storage fee collected from user / paid to Wingold custodian',
  },
  'Storage_Fee': {
    debit: GL_ACCOUNTS.STORAGE_FEE_PAID,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Storage fee collected from user / paid to Wingold custodian',
  },
  Payout: {
    debit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    credit: GL_ACCOUNTS.BNSL_PAYOUT_COST,
    description: 'BNSL or plan payout disbursed to user — cost of revenue',
  },
  Adjustment: {
    debit: GL_ACCOUNTS.ADJUSTMENT_EXPENSE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Balance adjustment or write-off entry',
  },
  'BNSL Lock': {
    debit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    credit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    description: 'BNSL plan gold locked — obligation created for payout schedule',
  },
  'BNSL_Lock': {
    debit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    credit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    description: 'BNSL plan gold locked — obligation created for payout schedule',
  },
  'BNSL Unlock': {
    debit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    credit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    description: 'BNSL plan gold unlocked — obligation released on termination',
  },
  'BNSL_Unlock': {
    debit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    credit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    description: 'BNSL plan gold unlocked — obligation released on termination',
  },
};

// ============================================================
// VAULT LEDGER ACTION → GL ENTRY MAPPING
// (LedgerAction types from vault-ledger-service.ts)
// ============================================================

export const LEDGER_ACTION_GL_MAP: Record<string, GlEntry> = {
  Deposit: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.GOLD_TRADING_REVENUE,
    description: 'Vault deposit — gold credited to user holding',
  },
  Withdrawal: {
    debit: GL_ACCOUNTS.PENDING_WITHDRAWALS_PAYABLE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Vault withdrawal — gold debited from user holding',
  },
  Transfer_Send: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.TRANSFER_FEE_INCOME,
    description: 'Internal transfer sent',
  },
  Transfer_Receive: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.USER_GOLD_LIABILITY,
    description: 'Internal transfer received',
  },
  FinaPay_To_BNSL: {
    debit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Gold moved to BNSL reserve',
  },
  BNSL_To_FinaPay: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    description: 'Gold returned from BNSL reserve',
  },
  BNSL_Lock: {
    debit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    credit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    description: 'BNSL plan gold locked — obligation created',
  },
  BNSL_Unlock: {
    debit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    credit: GL_ACCOUNTS.BNSL_GOLD_RESERVE,
    description: 'BNSL plan gold unlocked — obligation released',
  },
  FinaPay_To_FinaBridge: {
    debit: GL_ACCOUNTS.FINABRIDGE_GOLD_RESERVE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Gold moved to FinaBridge reserve',
  },
  FinaBridge_To_FinaPay: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.FINABRIDGE_GOLD_RESERVE,
    description: 'Gold returned from FinaBridge reserve',
  },
  Trade_Reserve: {
    debit: GL_ACCOUNTS.FINABRIDGE_GOLD_RESERVE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Gold reserved for trade execution',
  },
  Trade_Release: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.FINABRIDGE_GOLD_RESERVE,
    description: 'Trade gold reserve released',
  },
  Payout_Credit: {
    debit: GL_ACCOUNTS.BNSL_PAYOUT_OBLIGATION,
    credit: GL_ACCOUNTS.BNSL_PAYOUT_COST,
    description: 'BNSL payout credited to user — cost of revenue',
  },
  Fee_Deduction: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.OTHER_FEE_INCOME,
    description: 'Fee deducted from user holding',
  },
  Storage_Fee: {
    debit: GL_ACCOUNTS.STORAGE_FEE_PAID,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Storage fee collected / paid to custodian',
  },
  Adjustment: {
    debit: GL_ACCOUNTS.ADJUSTMENT_EXPENSE,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Balance adjustment or write-off',
  },
  Physical_Delivery: {
    debit: GL_ACCOUNTS.PHYSICAL_DELIVERY_COST,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Physical gold delivered — removed from digital ledger',
  },
  Gift_Send: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.GIFT_SERVICE_INCOME,
    description: 'Gift gold transfer sent',
  },
  Gift_Receive: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.USER_GOLD_LIABILITY,
    description: 'Gift gold transfer received',
  },
  Pending_Deposit: {
    debit: GL_ACCOUNTS.PENDING_DEPOSITS,
    credit: GL_ACCOUNTS.USER_GOLD_LIABILITY,
    description: 'Pending deposit recorded',
  },
  Pending_Confirm: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.PENDING_DEPOSITS,
    description: 'Pending deposit confirmed and credited',
  },
  Pending_Reject: {
    debit: GL_ACCOUNTS.USER_GOLD_LIABILITY,
    credit: GL_ACCOUNTS.PENDING_DEPOSITS,
    description: 'Pending deposit rejected and reversed',
  },
  Vault_Transfer: {
    debit: GL_ACCOUNTS.PLATFORM_GOLD_INVENTORY,
    credit: GL_ACCOUNTS.STORAGE_ESCROW,
    description: 'Internal vault-to-vault transfer (no ownership change)',
  },
  LGPW_To_FGPW: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Intra-user LGPW → FGPW reclassification',
  },
  FGPW_To_LGPW: {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    description: 'Intra-user FGPW → LGPW reclassification',
  },
};

/**
 * Returns the GL entry for a given transaction type.
 * Falls back to Deposit entry if the type is not mapped.
 */
export function getTransactionGlEntry(type: string): GlEntry {
  return TRANSACTION_GL_MAP[type] ?? {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.OTHER_FEE_INCOME,
    description: `Unknown transaction type: ${type}`,
  };
}

/**
 * Returns the GL entry for a given vault ledger action.
 */
export function getLedgerActionGlEntry(action: string): GlEntry {
  return LEDGER_ACTION_GL_MAP[action] ?? {
    debit: GL_ACCOUNTS.USER_GOLD_HOLDINGS,
    credit: GL_ACCOUNTS.OTHER_FEE_INCOME,
    description: `Unknown ledger action: ${action}`,
  };
}

/**
 * Revenue-bearing transaction types (used for P&L grouping)
 */
export const REVENUE_TRANSACTION_TYPES = ['Deposit', 'Buy', 'Send', 'Swap'];

/**
 * Cost-bearing transaction types (used for P&L grouping)
 */
export const COST_TRANSACTION_TYPES = ['Withdrawal', 'Sell'];
