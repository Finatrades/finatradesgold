/**
 * Gold Conversion Utility
 * 
 * Single source of truth for USD ↔ Gold conversion calculations.
 * Gold (grams) is the real balance - USD is always computed dynamically.
 * 
 * Rules:
 * - All financial calculations use gold grams as the base
 * - USD values are computed on-the-fly using the live gold price
 * - Precision: 6 decimals for gold grams, 2 decimals for USD
 * - Fees and margins are applied to gold amounts, not USD
 */

export interface GoldPrice {
  pricePerGram: number;
  pricePerOunce?: number;
  currency: string;
  timestamp: string;
  source: string;
}

export interface ConversionResult {
  goldGrams: number;
  usdValue: number;
  pricePerGram: number;
  timestamp: string;
}

export interface ConversionWithFees extends ConversionResult {
  feeGrams: number;
  feeUsd: number;
  netGoldGrams: number;
  netUsdValue: number;
}

// Constants
export const GOLD_PRECISION = 6; // Decimal places for gold grams
export const USD_PRECISION = 2; // Decimal places for USD
export const TROY_OUNCE_IN_GRAMS = 31.1035;

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Round gold grams to standard precision (6 decimals)
 */
export function roundGold(grams: number): number {
  return roundTo(grams, GOLD_PRECISION);
}

/**
 * Round USD to standard precision (2 decimals)
 */
export function roundUsd(usd: number): number {
  return roundTo(usd, USD_PRECISION);
}

/**
 * Convert USD amount to gold grams
 * Formula: goldGrams = usdAmount / pricePerGram
 */
export function usdToGold(usdAmount: number, pricePerGram: number): number {
  if (!pricePerGram || pricePerGram <= 0) return 0;
  if (!usdAmount || usdAmount <= 0) return 0;
  return roundGold(usdAmount / pricePerGram);
}

/**
 * Convert gold grams to USD value
 * Formula: usdAmount = goldGrams * pricePerGram
 */
export function goldToUsd(goldGrams: number, pricePerGram: number): number {
  if (!pricePerGram || pricePerGram <= 0) return 0;
  if (!goldGrams || goldGrams <= 0) return 0;
  return roundUsd(goldGrams * pricePerGram);
}

/**
 * Get full conversion result from USD input
 */
export function convertFromUsd(usdAmount: number, goldPrice: GoldPrice): ConversionResult {
  const goldGrams = usdToGold(usdAmount, goldPrice.pricePerGram);
  return {
    goldGrams,
    usdValue: roundUsd(usdAmount),
    pricePerGram: goldPrice.pricePerGram,
    timestamp: goldPrice.timestamp,
  };
}

/**
 * Get full conversion result from gold grams input
 */
export function convertFromGold(goldGrams: number, goldPrice: GoldPrice): ConversionResult {
  const usdValue = goldToUsd(goldGrams, goldPrice.pricePerGram);
  return {
    goldGrams: roundGold(goldGrams),
    usdValue,
    pricePerGram: goldPrice.pricePerGram,
    timestamp: goldPrice.timestamp,
  };
}

/**
 * Calculate fee in gold grams
 */
export function calculateFeeGrams(
  goldGrams: number,
  feeType: 'percentage' | 'flat',
  feeValue: number,
  pricePerGram: number,
  minFee?: number,
  maxFee?: number
): number {
  let feeGrams: number;
  
  if (feeType === 'percentage') {
    feeGrams = goldGrams * (feeValue / 100);
  } else {
    // Flat fee is in USD, convert to gold
    feeGrams = usdToGold(feeValue, pricePerGram);
  }
  
  // Apply min/max constraints (in USD, convert to gold)
  if (minFee !== undefined) {
    const minFeeGrams = usdToGold(minFee, pricePerGram);
    feeGrams = Math.max(feeGrams, minFeeGrams);
  }
  if (maxFee !== undefined) {
    const maxFeeGrams = usdToGold(maxFee, pricePerGram);
    feeGrams = Math.min(feeGrams, maxFeeGrams);
  }
  
  return roundGold(feeGrams);
}

/**
 * Convert with fees applied (for deposits - fee is deducted)
 * Input: USD or Gold amount
 * Output: Net gold after fees
 */
export function convertWithDepositFee(
  inputAmount: number,
  inputMode: 'usd' | 'gold',
  goldPrice: GoldPrice,
  feeType: 'percentage' | 'flat',
  feeValue: number,
  minFee?: number,
  maxFee?: number
): ConversionWithFees {
  const pricePerGram = goldPrice.pricePerGram;
  
  // Convert input to gold grams
  const grossGoldGrams = inputMode === 'usd' 
    ? usdToGold(inputAmount, pricePerGram)
    : roundGold(inputAmount);
  
  const grossUsdValue = goldToUsd(grossGoldGrams, pricePerGram);
  
  // Calculate fee in gold
  const feeGrams = calculateFeeGrams(grossGoldGrams, feeType, feeValue, pricePerGram, minFee, maxFee);
  const feeUsd = goldToUsd(feeGrams, pricePerGram);
  
  // Net after fee deduction
  const netGoldGrams = roundGold(grossGoldGrams - feeGrams);
  const netUsdValue = goldToUsd(netGoldGrams, pricePerGram);
  
  return {
    goldGrams: grossGoldGrams,
    usdValue: grossUsdValue,
    pricePerGram,
    timestamp: goldPrice.timestamp,
    feeGrams,
    feeUsd,
    netGoldGrams,
    netUsdValue,
  };
}

/**
 * Convert with fees added (for withdrawals - user pays gross, receives net)
 * Input: Gold grams user wants to receive
 * Output: Total gold needed including fees
 */
export function convertWithWithdrawalFee(
  goldGramsToReceive: number,
  goldPrice: GoldPrice,
  feeType: 'percentage' | 'flat',
  feeValue: number,
  minFee?: number,
  maxFee?: number
): ConversionWithFees {
  const pricePerGram = goldPrice.pricePerGram;
  const netGoldGrams = roundGold(goldGramsToReceive);
  
  // Calculate fee in gold
  const feeGrams = calculateFeeGrams(netGoldGrams, feeType, feeValue, pricePerGram, minFee, maxFee);
  const feeUsd = goldToUsd(feeGrams, pricePerGram);
  
  // Total gold needed (net + fee)
  const grossGoldGrams = roundGold(netGoldGrams + feeGrams);
  const grossUsdValue = goldToUsd(grossGoldGrams, pricePerGram);
  const netUsdValue = goldToUsd(netGoldGrams, pricePerGram);
  
  return {
    goldGrams: grossGoldGrams,
    usdValue: grossUsdValue,
    pricePerGram,
    timestamp: goldPrice.timestamp,
    feeGrams,
    feeUsd,
    netGoldGrams,
    netUsdValue,
  };
}

/**
 * Format gold grams for display
 */
export function formatGold(grams: number, showUnit = true): string {
  const formatted = roundGold(grams).toFixed(GOLD_PRECISION);
  return showUnit ? `${formatted}g` : formatted;
}

/**
 * Format USD for display
 */
export function formatUsd(usd: number, showSymbol = true): string {
  const formatted = roundUsd(usd).toLocaleString('en-US', {
    minimumFractionDigits: USD_PRECISION,
    maximumFractionDigits: USD_PRECISION,
  });
  return showSymbol ? `$${formatted}` : formatted;
}

/**
 * Parse string to number, handling various formats
 */
export function parseAmount(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = value.replace(/[,$]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate if user has sufficient gold balance
 */
export function hasSufficientBalance(
  requiredGoldGrams: number,
  availableGoldGrams: number
): boolean {
  return roundGold(availableGoldGrams) >= roundGold(requiredGoldGrams);
}

/**
 * Calculate gold amount for a target USD value
 * Used when user wants to send/withdraw a specific USD amount
 */
export function goldForTargetUsd(
  targetUsd: number,
  pricePerGram: number,
  feeType?: 'percentage' | 'flat',
  feeValue?: number
): { goldNeeded: number; feeGrams: number; totalGold: number } {
  const baseGold = usdToGold(targetUsd, pricePerGram);
  
  if (!feeType || !feeValue) {
    return { goldNeeded: baseGold, feeGrams: 0, totalGold: baseGold };
  }
  
  const feeGrams = calculateFeeGrams(baseGold, feeType, feeValue, pricePerGram);
  const totalGold = roundGold(baseGold + feeGrams);
  
  return { goldNeeded: baseGold, feeGrams, totalGold };
}

/**
 * Create a price snapshot for storing with transactions
 */
export function createPriceSnapshot(goldPrice: GoldPrice): {
  pricePerGramAtTxn: string;
  priceTimestamp: string;
  priceSource: string;
} {
  return {
    pricePerGramAtTxn: goldPrice.pricePerGram.toFixed(USD_PRECISION),
    priceTimestamp: goldPrice.timestamp,
    priceSource: goldPrice.source,
  };
}

/**
 * Compute USD from stored gold and price snapshot (for historical display)
 */
export function computeHistoricalUsd(
  goldGrams: number | string,
  pricePerGramAtTxn: number | string
): number {
  const grams = typeof goldGrams === 'string' ? parseFloat(goldGrams) : goldGrams;
  const price = typeof pricePerGramAtTxn === 'string' ? parseFloat(pricePerGramAtTxn) : pricePerGramAtTxn;
  return goldToUsd(grams, price);
}

/**
 * Display message explaining gold-backed system
 */
export const GOLD_BALANCE_DISCLAIMER = "USD is an equivalent value. Your real balance is gold.";
export const GOLD_INPUT_HELPER = "You can enter either USD or Gold. USD is automatically converted into gold at the current gold price. Your actual balance is always held in gold.";
