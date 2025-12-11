export interface Wallet {
  goldBalanceGrams: number;
  usdBalance: number;
  goldPriceUsdPerGram: number;
  usdAedRate: number;
}

export type TransactionType = 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Request';

export type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Declined';

export interface Transaction {
  id: string;
  type: TransactionType;
  amountGrams?: number;
  amountUsd: number;
  feeUsd: number;
  timestamp: string;
  referenceId: string;
  status: TransactionStatus;
  description?: string;
  assetType?: 'GOLD' | 'USD';
}
