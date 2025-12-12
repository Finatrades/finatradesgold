
export type Currency = "USD" | "AED";

export type WalletTier = "Standard" | "Gold" | "Platinum";

export type TransactionType =
  | "BuyGold"
  | "SellGold"
  | "SendGold"
  | "ReceiveGold"
  | "RequestGold"
  | "BNSLJoin"
  | "BNSLReward"
  | "TradeLock"
  | "CardTopUp"
  | "Fee";

export type TransactionStatus = "Pending" | "Completed" | "Failed" | "Reversed";

export type CounterpartyType = "InternalUser" | "ExternalWallet" | "System";

export type FundingMethod = "BankTransfer" | "Card" | "Crypto";
export type PayoutMethod = "BankTransfer" | "CardRefund" | "CryptoPayout";

export type FinaPayWallet = {
  userId: string;
  walletId: string;
  tier: WalletTier;
  goldBalanceGrams: number;     // live from FinaVault (mock)
  goldValueUsd: number;
  goldValueAed: number;
  availableGoldGrams: number;   // free (not locked in BNSL / Trade)
  lockedForBnslGrams: number;
  lockedForTradeGrams: number;
  pendingSettlementGrams: number;
  lastUpdated: string;
};

export type GoldPricePoint = {
  timestamp: string;
  priceUsd: number;
};

export type FinaPayTransaction = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;

  goldGrams?: number;
  amountUsd?: number;
  amountAed?: number;

  fromWalletId?: string;
  toWalletId?: string;
  counterpartyLabel?: string;
  counterpartyType?: CounterpartyType;

  reference?: string;          // external ref / case ID
  note?: string;
  feeUsd?: number;
};

export type QuickAction =
  | "BuyGold"
  | "SellGold"
  | "SendGold"
  | "RequestGold"
  | "MoveToBnsl"
  | "MoveToTrade"
  | "TopUpCard";

export type LimitsConfig = {
  dailyBuyUsd: number;
  dailySellUsd: number;
  dailySendGoldGrams: number;
  remainingBuyUsdToday: number;
  remainingSellUsdToday: number;
  remainingSendGoldGramsToday: number;
};

export type AmlFlag = {
  id: string;
  level: "Info" | "Review" | "Block";
  reason: string;
  createdAt: string;
};

export type FinaPayContextType = {
  wallet: FinaPayWallet;
  goldPriceHistory: GoldPricePoint[];
  transactions: FinaPayTransaction[];
  limits: LimitsConfig;
  amlFlags: AmlFlag[];
  currentGoldPriceUsdPerGram: number;
  addTransaction: (tx: FinaPayTransaction) => void;
  updateWallet: (updates: Partial<FinaPayWallet>) => void;
};

export type Transaction = {
  id: string;
  type: string;
  amountGrams?: number;
  amountUsd: number;
  feeUsd?: number;
  timestamp: string;
  referenceId: string;
  status: string;
  assetType?: string;
  description?: string;
};

export type Wallet = {
  goldBalanceGrams: number;
  usdBalance: number;
  goldPriceUsdPerGram: number;
  usdAedRate: number;
  bnslLockedUsd: number;
  finaBridgeLockedUsd: number;
};
