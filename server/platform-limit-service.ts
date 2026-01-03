import { storage } from "./storage";
import type { PlatformConfig, User, Referral } from "@shared/schema";

interface ConfigCache {
  configs: Map<string, string>;
  loadedAt: number;
}

interface LimitValidationResult {
  valid: boolean;
  message?: string;
  limit?: number;
  current?: number;
}

interface FeeCalculation {
  feePercent: number;
  feeFixed: number;
  totalFee: number;
  netAmount: number;
}

interface TransactionTotals {
  dailyTotal: number;
  monthlyTotal: number;
}

const CACHE_TTL_MS = 60 * 1000;
let configCache: ConfigCache | null = null;

export class PlatformLimitService {
  private static async loadConfigs(): Promise<Map<string, string>> {
    if (configCache && Date.now() - configCache.loadedAt < CACHE_TTL_MS) {
      return configCache.configs;
    }

    const allConfigs = await storage.getAllPlatformConfigs();
    const configMap = new Map<string, string>();
    
    for (const config of allConfigs) {
      configMap.set(config.configKey, config.configValue);
    }

    configCache = {
      configs: configMap,
      loadedAt: Date.now()
    };

    return configMap;
  }

  static invalidateCache(): void {
    configCache = null;
  }

  static async getConfig(key: string, defaultValue: string = "0"): Promise<string> {
    const configs = await this.loadConfigs();
    return configs.get(key) || defaultValue;
  }

  static async getNumericConfig(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getConfig(key, String(defaultValue));
    return parseFloat(value) || defaultValue;
  }

  static async getBooleanConfig(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getConfig(key, String(defaultValue));
    return value === "true";
  }

  static async getJsonConfig<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.getConfig(key, JSON.stringify(defaultValue));
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  static getUserTier(user: User): 1 | 2 | 3 {
    if (user.kycStatus === "Approved") {
      return 3;
    }
    if (user.kycStatus === "In Progress" || user.kycStatus === "Pending Review") {
      return 2;
    }
    return 1;
  }

  static async validateSingleTransactionLimit(
    amountUsd: number,
    user: User
  ): Promise<LimitValidationResult> {
    const tier = this.getUserTier(user);
    const limitKey = `tier${tier}_single_max`;
    const limit = await this.getNumericConfig(limitKey, tier === 1 ? 2000 : tier === 2 ? 25000 : 500000);

    if (limit > 0 && amountUsd > limit) {
      return {
        valid: false,
        message: `Transaction exceeds your single transaction limit of $${limit.toLocaleString()}`,
        limit,
        current: amountUsd
      };
    }

    return { valid: true };
  }

  static async validateDailyTransactionLimit(
    amountUsd: number,
    user: User,
    currentDailyTotal: number
  ): Promise<LimitValidationResult> {
    const tier = this.getUserTier(user);
    const limitKey = `tier${tier}_daily_limit`;
    const limit = await this.getNumericConfig(limitKey, tier === 1 ? 5000 : tier === 2 ? 50000 : 500000);

    if (limit > 0 && currentDailyTotal + amountUsd > limit) {
      const remaining = Math.max(0, limit - currentDailyTotal);
      return {
        valid: false,
        message: `Transaction would exceed your daily limit of $${limit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining today.`,
        limit,
        current: currentDailyTotal
      };
    }

    return { valid: true };
  }

  static async validateMonthlyTransactionLimit(
    amountUsd: number,
    user: User,
    currentMonthlyTotal: number
  ): Promise<LimitValidationResult> {
    const tier = this.getUserTier(user);
    const limitKey = `tier${tier}_monthly_limit`;
    const defaultLimit = tier === 1 ? 20000 : tier === 2 ? 250000 : 0;
    const limit = await this.getNumericConfig(limitKey, defaultLimit);

    if (limit > 0 && currentMonthlyTotal + amountUsd > limit) {
      const remaining = Math.max(0, limit - currentMonthlyTotal);
      return {
        valid: false,
        message: `Transaction would exceed your monthly limit of $${limit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining this month.`,
        limit,
        current: currentMonthlyTotal
      };
    }

    return { valid: true };
  }

  static async validateMinTradeAmount(amountUsd: number): Promise<LimitValidationResult> {
    const minAmount = await this.getNumericConfig("min_trade_amount", 50);
    
    if (amountUsd < minAmount) {
      return {
        valid: false,
        message: `Minimum transaction amount is $${minAmount}`,
        limit: minAmount,
        current: amountUsd
      };
    }

    return { valid: true };
  }

  static async validateDepositLimits(
    amountUsd: number,
    currentDailyTotal: number = 0,
    currentMonthlyTotal: number = 0
  ): Promise<LimitValidationResult> {
    const minDeposit = await this.getNumericConfig("min_deposit", 50);
    const maxDeposit = await this.getNumericConfig("max_deposit_single", 100000);
    const dailyLimit = await this.getNumericConfig("daily_deposit_limit", 250000);
    const monthlyLimit = await this.getNumericConfig("monthly_deposit_limit", 1000000);

    if (amountUsd < minDeposit) {
      return {
        valid: false,
        message: `Minimum deposit amount is $${minDeposit}`,
        limit: minDeposit,
        current: amountUsd
      };
    }

    if (amountUsd > maxDeposit) {
      return {
        valid: false,
        message: `Maximum single deposit is $${maxDeposit.toLocaleString()}`,
        limit: maxDeposit,
        current: amountUsd
      };
    }

    if (dailyLimit > 0 && currentDailyTotal + amountUsd > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - currentDailyTotal);
      return {
        valid: false,
        message: `Daily deposit limit is $${dailyLimit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining today.`,
        limit: dailyLimit,
        current: currentDailyTotal
      };
    }

    if (monthlyLimit > 0 && currentMonthlyTotal + amountUsd > monthlyLimit) {
      const remaining = Math.max(0, monthlyLimit - currentMonthlyTotal);
      return {
        valid: false,
        message: `Monthly deposit limit is $${monthlyLimit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining this month.`,
        limit: monthlyLimit,
        current: currentMonthlyTotal
      };
    }

    return { valid: true };
  }

  static async validateWithdrawalLimits(
    amountUsd: number,
    currentDailyTotal: number = 0
  ): Promise<LimitValidationResult> {
    const minWithdrawal = await this.getNumericConfig("min_withdrawal", 100);
    const maxWithdrawal = await this.getNumericConfig("max_withdrawal_single", 50000);
    const dailyLimit = await this.getNumericConfig("daily_withdrawal_limit", 100000);

    if (amountUsd < minWithdrawal) {
      return {
        valid: false,
        message: `Minimum withdrawal amount is $${minWithdrawal}`,
        limit: minWithdrawal,
        current: amountUsd
      };
    }

    if (amountUsd > maxWithdrawal) {
      return {
        valid: false,
        message: `Maximum single withdrawal is $${maxWithdrawal.toLocaleString()}`,
        limit: maxWithdrawal,
        current: amountUsd
      };
    }

    if (dailyLimit > 0 && currentDailyTotal + amountUsd > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - currentDailyTotal);
      return {
        valid: false,
        message: `Daily withdrawal limit is $${dailyLimit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining today.`,
        limit: dailyLimit,
        current: currentDailyTotal
      };
    }

    return { valid: true };
  }

  static async calculateWithdrawalFees(amountUsd: number): Promise<FeeCalculation> {
    const feePercent = await this.getNumericConfig("withdrawal_fee_percent", 0);
    const feeFixed = await this.getNumericConfig("withdrawal_fee_fixed", 0);
    
    const percentFee = amountUsd * (feePercent / 100);
    const totalFee = percentFee + feeFixed;
    const netAmount = amountUsd - totalFee;

    return {
      feePercent,
      feeFixed,
      totalFee,
      netAmount
    };
  }

  static async validateP2PLimits(
    amountUsd: number,
    currentDailyTotal: number = 0,
    currentMonthlyTotal: number = 0
  ): Promise<LimitValidationResult> {
    const minTransfer = await this.getNumericConfig("min_p2p_transfer", 10);
    const maxTransfer = await this.getNumericConfig("max_p2p_transfer", 10000);
    const dailyLimit = await this.getNumericConfig("daily_p2p_limit", 25000);
    const monthlyLimit = await this.getNumericConfig("monthly_p2p_limit", 100000);

    if (amountUsd < minTransfer) {
      return {
        valid: false,
        message: `Minimum P2P transfer amount is $${minTransfer}`,
        limit: minTransfer,
        current: amountUsd
      };
    }

    if (amountUsd > maxTransfer) {
      return {
        valid: false,
        message: `Maximum single P2P transfer is $${maxTransfer.toLocaleString()}`,
        limit: maxTransfer,
        current: amountUsd
      };
    }

    if (dailyLimit > 0 && currentDailyTotal + amountUsd > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - currentDailyTotal);
      return {
        valid: false,
        message: `Daily P2P transfer limit is $${dailyLimit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining today.`,
        limit: dailyLimit,
        current: currentDailyTotal
      };
    }

    if (monthlyLimit > 0 && currentMonthlyTotal + amountUsd > monthlyLimit) {
      const remaining = Math.max(0, monthlyLimit - currentMonthlyTotal);
      return {
        valid: false,
        message: `Monthly P2P transfer limit is $${monthlyLimit.toLocaleString()}. You have $${remaining.toLocaleString()} remaining this month.`,
        limit: monthlyLimit,
        current: currentMonthlyTotal
      };
    }

    return { valid: true };
  }

  static async calculateP2PFees(amountUsd: number): Promise<FeeCalculation> {
    const feePercent = await this.getNumericConfig("p2p_fee_percent", 0);
    
    const totalFee = amountUsd * (feePercent / 100);
    const netAmount = amountUsd - totalFee;

    return {
      feePercent,
      feeFixed: 0,
      totalFee,
      netAmount
    };
  }

  static async calculatePaymentFees(
    amountUsd: number,
    paymentMethod: "bank" | "card" | "crypto"
  ): Promise<FeeCalculation> {
    let feePercent: number;
    let feeFixed: number;

    switch (paymentMethod) {
      case "card":
        feePercent = await this.getNumericConfig("card_fee_percent", 2.9);
        feeFixed = await this.getNumericConfig("card_fee_fixed", 0.30);
        break;
      case "crypto":
        feePercent = await this.getNumericConfig("crypto_fee_percent", 0.5);
        feeFixed = 0;
        break;
      case "bank":
      default:
        feePercent = await this.getNumericConfig("bank_transfer_fee_percent", 0);
        feeFixed = await this.getNumericConfig("bank_transfer_fee_fixed", 0);
        break;
    }

    const percentFee = amountUsd * (feePercent / 100);
    const totalFee = percentFee + feeFixed;
    const netAmount = amountUsd - totalFee;

    return {
      feePercent,
      feeFixed,
      totalFee,
      netAmount
    };
  }

  static async isMaintenanceMode(): Promise<boolean> {
    return this.getBooleanConfig("maintenance_mode", false);
  }

  static async isRegistrationEnabled(): Promise<boolean> {
    return this.getBooleanConfig("registrations_enabled", true);
  }

  static async is2FARequired(): Promise<boolean> {
    return this.getBooleanConfig("require_2fa", false);
  }

  static async getSessionTimeoutMinutes(): Promise<number> {
    return this.getNumericConfig("session_timeout_minutes", 30);
  }

  static async getBlockedCountries(): Promise<string[]> {
    return this.getJsonConfig<string[]>("blocked_countries", []);
  }

  static async isCountryBlocked(countryCode: string): Promise<boolean> {
    const blockedCountries = await this.getBlockedCountries();
    return blockedCountries.includes(countryCode.toUpperCase());
  }

  static async validateBNSLAmount(amountUsd: number): Promise<LimitValidationResult> {
    const minAmount = await this.getNumericConfig("bnsl_min_amount", 500);
    
    if (amountUsd < minAmount) {
      return {
        valid: false,
        message: `Minimum BNSL agreement amount is $${minAmount}`,
        limit: minAmount,
        current: amountUsd
      };
    }

    return { valid: true };
  }

  static async getBNSLMaxTermMonths(): Promise<number> {
    return this.getNumericConfig("bnsl_max_term_months", 24);
  }

  static async getBNSLAgreementFeePercent(): Promise<number> {
    return this.getNumericConfig("bnsl_agreement_fee_percent", 1.0);
  }

  static async getBNSLEarlyExitPenaltyPercent(): Promise<number> {
    return this.getNumericConfig("bnsl_early_exit_penalty", 5.0);
  }

  static async validateTradeCaseValue(amountUsd: number): Promise<LimitValidationResult> {
    const maxValue = await this.getNumericConfig("max_trade_case_value", 1000000);
    
    if (maxValue > 0 && amountUsd > maxValue) {
      return {
        valid: false,
        message: `Maximum trade case value is $${maxValue.toLocaleString()}`,
        limit: maxValue,
        current: amountUsd
      };
    }

    return { valid: true };
  }

  static async getTradeFinanceFeePercent(): Promise<number> {
    return this.getNumericConfig("trade_finance_fee_percent", 1.5);
  }

  static async getVaultInventoryStatus(): Promise<{
    inventoryGrams: number;
    reservedGrams: number;
    availableGrams: number;
    lowStockAlertGrams: number;
    isLowStock: boolean;
  }> {
    const inventoryGrams = await this.getNumericConfig("vault_inventory_grams", 125000);
    const reservedGrams = await this.getNumericConfig("reserved_gold_grams", 118450);
    const lowStockAlertGrams = await this.getNumericConfig("low_stock_alert_grams", 1000);
    
    const availableGrams = inventoryGrams - reservedGrams;
    const isLowStock = availableGrams < lowStockAlertGrams;

    return {
      inventoryGrams,
      reservedGrams,
      availableGrams,
      lowStockAlertGrams,
      isLowStock
    };
  }

  static async validatePhysicalRedemption(goldGrams: number): Promise<LimitValidationResult> {
    const minGrams = await this.getNumericConfig("min_physical_redemption_grams", 10);
    
    if (goldGrams < minGrams) {
      return {
        valid: false,
        message: `Minimum physical gold redemption is ${minGrams}g`,
        limit: minGrams,
        current: goldGrams
      };
    }

    const vaultStatus = await this.getVaultInventoryStatus();
    if (goldGrams > vaultStatus.availableGrams) {
      return {
        valid: false,
        message: `Insufficient vault inventory for physical redemption`,
        limit: vaultStatus.availableGrams,
        current: goldGrams
      };
    }

    return { valid: true };
  }

  static async validateReferralBonus(
    referrerId: string,
    depositAmountUsd: number
  ): Promise<{ eligible: boolean; referrerBonus: number; refereeBonus: number; message?: string }> {
    const minDepositForBonus = await this.getNumericConfig("min_deposit_for_bonus", 100);
    const maxReferralsPerUser = await this.getNumericConfig("max_referrals_per_user", 50);
    const referrerBonusUsd = await this.getNumericConfig("referrer_bonus_usd", 10);
    const refereeBonusUsd = await this.getNumericConfig("referee_bonus_usd", 5);

    if (depositAmountUsd < minDepositForBonus) {
      return {
        eligible: false,
        referrerBonus: 0,
        refereeBonus: 0,
        message: `Minimum deposit of $${minDepositForBonus} required for referral bonus`
      };
    }

    const referrals = await storage.getUserReferrals(referrerId);
    const successfulReferrals = referrals.filter((r: Referral) => r.status === "Completed" || r.status === "Active");
    
    if (successfulReferrals.length >= maxReferralsPerUser) {
      return {
        eligible: false,
        referrerBonus: 0,
        refereeBonus: refereeBonusUsd,
        message: `Referrer has reached maximum referral limit`
      };
    }

    return {
      eligible: true,
      referrerBonus: referrerBonusUsd,
      refereeBonus: refereeBonusUsd
    };
  }

  static async getGoldPriceWithSpread(
    basePrice: number,
    type: "buy" | "sell"
  ): Promise<{ price: number; spreadPercent: number }> {
    const spreadKey = type === "buy" ? "buy_spread_percent" : "sell_spread_percent";
    const spreadPercent = await this.getNumericConfig(spreadKey, type === "buy" ? 1.5 : 1.0);
    
    const spreadMultiplier = type === "buy" 
      ? 1 + (spreadPercent / 100)
      : 1 - (spreadPercent / 100);
    
    return {
      price: basePrice * spreadMultiplier,
      spreadPercent
    };
  }

  static async getStorageFeePercent(): Promise<number> {
    return this.getNumericConfig("storage_fee_percent", 0.5);
  }

  static async getAllLimitsForUser(user: User): Promise<{
    tier: number;
    singleMax: number;
    dailyLimit: number;
    monthlyLimit: number;
    minTrade: number;
    deposit: { min: number; max: number; dailyLimit: number; monthlyLimit: number };
    withdrawal: { min: number; max: number; dailyLimit: number };
    p2p: { min: number; max: number; dailyLimit: number; monthlyLimit: number };
  }> {
    const tier = this.getUserTier(user);
    
    const [
      singleMax,
      dailyLimit,
      monthlyLimit,
      minTrade,
      minDeposit,
      maxDeposit,
      dailyDepositLimit,
      monthlyDepositLimit,
      minWithdrawal,
      maxWithdrawal,
      dailyWithdrawalLimit,
      minP2p,
      maxP2p,
      dailyP2pLimit,
      monthlyP2pLimit
    ] = await Promise.all([
      this.getNumericConfig(`tier${tier}_single_max`),
      this.getNumericConfig(`tier${tier}_daily_limit`),
      this.getNumericConfig(`tier${tier}_monthly_limit`),
      this.getNumericConfig("min_trade_amount", 50),
      this.getNumericConfig("min_deposit", 50),
      this.getNumericConfig("max_deposit_single", 100000),
      this.getNumericConfig("daily_deposit_limit", 250000),
      this.getNumericConfig("monthly_deposit_limit", 1000000),
      this.getNumericConfig("min_withdrawal", 100),
      this.getNumericConfig("max_withdrawal_single", 50000),
      this.getNumericConfig("daily_withdrawal_limit", 100000),
      this.getNumericConfig("min_p2p_transfer", 10),
      this.getNumericConfig("max_p2p_transfer", 10000),
      this.getNumericConfig("daily_p2p_limit", 25000),
      this.getNumericConfig("monthly_p2p_limit", 100000)
    ]);

    return {
      tier,
      singleMax,
      dailyLimit,
      monthlyLimit,
      minTrade,
      deposit: {
        min: minDeposit,
        max: maxDeposit,
        dailyLimit: dailyDepositLimit,
        monthlyLimit: monthlyDepositLimit
      },
      withdrawal: {
        min: minWithdrawal,
        max: maxWithdrawal,
        dailyLimit: dailyWithdrawalLimit
      },
      p2p: {
        min: minP2p,
        max: maxP2p,
        dailyLimit: dailyP2pLimit,
        monthlyLimit: monthlyP2pLimit
      }
    };
  }

  static async getUserTransactionTotals(
    userId: string,
    transactionTypes: string[] = ["Buy", "Sell"]
  ): Promise<TransactionTotals> {
    const transactions = await storage.getUserTransactions(userId);
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let dailyTotal = 0;
    let monthlyTotal = 0;
    
    for (const tx of transactions) {
      if (!transactionTypes.includes(tx.type)) continue;
      if (tx.status !== "Completed" && tx.status !== "Approved") continue;
      
      const txDate = new Date(tx.createdAt);
      const amount = parseFloat(tx.amountUsd || "0");
      
      if (txDate >= startOfDay) {
        dailyTotal += amount;
      }
      if (txDate >= startOfMonth) {
        monthlyTotal += amount;
      }
    }
    
    return { dailyTotal, monthlyTotal };
  }

  static async getUserDepositTotals(userId: string): Promise<TransactionTotals> {
    const deposits = await storage.getUserDepositRequests(userId);
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let dailyTotal = 0;
    let monthlyTotal = 0;
    
    for (const deposit of deposits) {
      if (deposit.status !== "Confirmed") continue;
      
      const depDate = new Date(deposit.createdAt);
      const amount = parseFloat(deposit.amountUsd || "0");
      
      if (depDate >= startOfDay) {
        dailyTotal += amount;
      }
      if (depDate >= startOfMonth) {
        monthlyTotal += amount;
      }
    }
    
    return { dailyTotal, monthlyTotal };
  }

  static async getUserWithdrawalTotals(userId: string): Promise<{ dailyTotal: number }> {
    const withdrawals = await storage.getUserWithdrawalRequests(userId);
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let dailyTotal = 0;
    
    for (const withdrawal of withdrawals) {
      if (withdrawal.status === "Rejected" || withdrawal.status === "Cancelled") continue;
      
      const wdDate = new Date(withdrawal.createdAt);
      const amount = parseFloat(withdrawal.amountUsd || "0");
      
      if (wdDate >= startOfDay) {
        dailyTotal += amount;
      }
    }
    
    return { dailyTotal };
  }

  static async getUserP2PTotals(userId: string): Promise<TransactionTotals> {
    const transactions = await storage.getUserTransactions(userId);
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let dailyTotal = 0;
    let monthlyTotal = 0;
    
    for (const tx of transactions) {
      if (tx.type !== "Send") continue;
      if (tx.status !== "Completed" && tx.status !== "Approved") continue;
      
      const txDate = new Date(tx.createdAt);
      const amount = parseFloat(tx.amountUsd || "0");
      
      if (txDate >= startOfDay) {
        dailyTotal += amount;
      }
      if (txDate >= startOfMonth) {
        monthlyTotal += amount;
      }
    }
    
    return { dailyTotal, monthlyTotal };
  }

  static async validateFullTransactionLimits(
    amountUsd: number,
    user: User,
    transactionType: "Buy" | "Sell" | "Send" | "Deposit" | "Withdrawal"
  ): Promise<LimitValidationResult> {
    // Validate minimum trade amount (applies to all transactions)
    const minTradeResult = await this.validateMinTradeAmount(amountUsd);
    if (!minTradeResult.valid) return minTradeResult;

    // NOTE: KYC tier-based limits (single/daily/monthly) have been removed
    // All users now have the same transaction limits regardless of KYC status

    if (transactionType === "Send") {
      const totals = await this.getUserP2PTotals(user.id);
      const p2pResult = await this.validateP2PLimits(amountUsd, totals.dailyTotal, totals.monthlyTotal);
      if (!p2pResult.valid) return p2pResult;
    }

    if (transactionType === "Deposit") {
      const totals = await this.getUserDepositTotals(user.id);
      const depositResult = await this.validateDepositLimits(amountUsd, totals.dailyTotal, totals.monthlyTotal);
      if (!depositResult.valid) return depositResult;
    }

    if (transactionType === "Withdrawal") {
      const totals = await this.getUserWithdrawalTotals(user.id);
      const withdrawalResult = await this.validateWithdrawalLimits(amountUsd, totals.dailyTotal);
      if (!withdrawalResult.valid) return withdrawalResult;
    }

    return { valid: true };
  }

  // ============================================================================
  // SYSTEM STATUS CHECKS
  // ============================================================================

  static async isMaintenanceMode(): Promise<boolean> {
    return await this.getBooleanConfig("maintenance_mode", false);
  }

  static async areRegistrationsEnabled(): Promise<boolean> {
    return await this.getBooleanConfig("registrations_enabled", true);
  }

  static async getBlockedCountries(): Promise<string[]> {
    return await this.getJsonConfig<string[]>("blocked_countries", []);
  }

  static async isCountryBlocked(countryCode: string): Promise<boolean> {
    if (!countryCode) return false;
    const blockedCountries = await this.getBlockedCountries();
    return blockedCountries.includes(countryCode.toUpperCase());
  }

  static async getSystemStatus(): Promise<{
    maintenanceMode: boolean;
    registrationsEnabled: boolean;
    blockedCountries: string[];
  }> {
    const [maintenanceMode, registrationsEnabled, blockedCountries] = await Promise.all([
      this.isMaintenanceMode(),
      this.areRegistrationsEnabled(),
      this.getBlockedCountries()
    ]);

    return {
      maintenanceMode,
      registrationsEnabled,
      blockedCountries
    };
  }
}

export const platformLimits = PlatformLimitService;
