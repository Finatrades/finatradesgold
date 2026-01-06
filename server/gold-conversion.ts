/**
 * Server-side Gold Conversion Utility
 * 
 * Single source of truth for USD ↔ Gold conversion calculations.
 * Gold (grams) is the real balance - USD is always computed dynamically.
 * 
 * This mirrors the client-side utility for consistency.
 */

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
 * Parse numeric string to number safely
 */
export function parseNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
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
  if (minFee !== undefined && minFee > 0) {
    const minFeeGrams = usdToGold(minFee, pricePerGram);
    feeGrams = Math.max(feeGrams, minFeeGrams);
  }
  if (maxFee !== undefined && maxFee > 0) {
    const maxFeeGrams = usdToGold(maxFee, pricePerGram);
    feeGrams = Math.min(feeGrams, maxFeeGrams);
  }
  
  return roundGold(feeGrams);
}

/**
 * Create a price snapshot for storing with transactions
 */
export function createPriceSnapshot(pricePerGram: number, source: string = 'system'): {
  pricePerGramAtTxn: string;
  priceTimestamp: string;
  priceSource: string;
} {
  return {
    pricePerGramAtTxn: pricePerGram.toFixed(USD_PRECISION),
    priceTimestamp: new Date().toISOString(),
    priceSource: source,
  };
}

/**
 * Compute USD from stored gold and price snapshot (for historical accuracy)
 */
export function computeHistoricalUsd(
  goldGrams: number | string,
  pricePerGramAtTxn: number | string
): number {
  const grams = parseNumeric(goldGrams);
  const price = parseNumeric(pricePerGramAtTxn);
  return goldToUsd(grams, price);
}

/**
 * Compute USD from gold using current price (for display)
 */
export function computeCurrentUsd(
  goldGrams: number | string,
  currentPricePerGram: number
): number {
  const grams = parseNumeric(goldGrams);
  return goldToUsd(grams, currentPricePerGram);
}

/**
 * Validate transaction amounts
 */
export function validateTransactionAmounts(
  goldGrams: number,
  pricePerGram: number,
  minUsd?: number,
  maxUsd?: number
): { valid: boolean; error?: string } {
  if (goldGrams <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  const usdValue = goldToUsd(goldGrams, pricePerGram);
  
  if (minUsd && usdValue < minUsd) {
    return { valid: false, error: `Minimum amount is $${minUsd}` };
  }
  
  if (maxUsd && usdValue > maxUsd) {
    return { valid: false, error: `Maximum amount is $${maxUsd}` };
  }
  
  return { valid: true };
}

/**
 * Calculate net gold after fees for deposits
 */
export function calculateDepositNet(
  grossGoldGrams: number,
  pricePerGram: number,
  feeType: 'percentage' | 'flat',
  feeValue: number,
  minFee?: number,
  maxFee?: number
): {
  grossGoldGrams: number;
  feeGrams: number;
  netGoldGrams: number;
  feeUsd: number;
  netUsd: number;
} {
  const feeGrams = calculateFeeGrams(grossGoldGrams, feeType, feeValue, pricePerGram, minFee, maxFee);
  const netGoldGrams = roundGold(grossGoldGrams - feeGrams);
  
  return {
    grossGoldGrams: roundGold(grossGoldGrams),
    feeGrams,
    netGoldGrams,
    feeUsd: goldToUsd(feeGrams, pricePerGram),
    netUsd: goldToUsd(netGoldGrams, pricePerGram),
  };
}

/**
 * Calculate total gold needed for withdrawal (including fees)
 */
export function calculateWithdrawalTotal(
  netGoldGrams: number,
  pricePerGram: number,
  feeType: 'percentage' | 'flat',
  feeValue: number,
  minFee?: number,
  maxFee?: number
): {
  netGoldGrams: number;
  feeGrams: number;
  totalGoldRequired: number;
  feeUsd: number;
  totalUsd: number;
} {
  const feeGrams = calculateFeeGrams(netGoldGrams, feeType, feeValue, pricePerGram, minFee, maxFee);
  const totalGoldRequired = roundGold(netGoldGrams + feeGrams);
  
  return {
    netGoldGrams: roundGold(netGoldGrams),
    feeGrams,
    totalGoldRequired,
    feeUsd: goldToUsd(feeGrams, pricePerGram),
    totalUsd: goldToUsd(totalGoldRequired, pricePerGram),
  };
}

/**
 * Format for database storage (as string with proper precision)
 */
export function formatForDb(goldGrams: number): string {
  return roundGold(goldGrams).toFixed(GOLD_PRECISION);
}

/**
 * Format USD for database storage
 */
export function formatUsdForDb(usd: number): string {
  return roundUsd(usd).toFixed(USD_PRECISION);
}
