/**
 * Gold Conversion Utilities
 * 
 * SINGLE SOURCE OF TRUTH: Gold (grams) is the only real balance.
 * USD is always computed dynamically from gold at the current price.
 * 
 * Core Principle:
 * - All ledgers, locks, reserves, and certificates record gold grams ONLY
 * - USD values are computed on-the-fly and never stored as source of truth
 * - Historical records preserve gold quantity, not USD
 */

export const GOLD_PRECISION = 6; // Up to 6 decimal places for gold grams
export const USD_PRECISION = 2;  // 2 decimal places for USD display

/**
 * Convert USD amount to gold grams
 * Formula: goldGrams = usdAmount / goldPricePerGram
 */
export function usdToGold(usdAmount: number, goldPricePerGram: number): number {
  if (!goldPricePerGram || goldPricePerGram <= 0) {
    throw new Error('Invalid gold price: must be greater than 0');
  }
  return usdAmount / goldPricePerGram;
}

/**
 * Convert gold grams to USD equivalent
 * Formula: usdAmount = goldGrams * goldPricePerGram
 */
export function goldToUsd(goldGrams: number, goldPricePerGram: number): number {
  if (!goldPricePerGram || goldPricePerGram <= 0) {
    return 0;
  }
  return goldGrams * goldPricePerGram;
}

/**
 * Format gold grams for display (up to 6 decimals)
 */
export function formatGoldGrams(grams: number, precision: number = 4): string {
  return grams.toFixed(Math.min(precision, GOLD_PRECISION));
}

/**
 * Format USD for display (2 decimals)
 */
export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: USD_PRECISION,
    maximumFractionDigits: USD_PRECISION,
  });
}

/**
 * Format gold with USD equivalent for display
 * Returns: "X.XXXX g (≈ $Y,YYY.YY)"
 */
export function formatGoldWithUsdEquivalent(
  goldGrams: number,
  goldPricePerGram: number,
  goldPrecision: number = 4
): string {
  const usdEquivalent = goldToUsd(goldGrams, goldPricePerGram);
  return `${formatGoldGrams(goldGrams, goldPrecision)} g (≈ $${formatUsd(usdEquivalent)})`;
}

/**
 * Parse string amount to number with validation
 */
export function parseAmount(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Round gold grams to storage precision (6 decimals)
 */
export function roundGoldForStorage(grams: number): string {
  return grams.toFixed(GOLD_PRECISION);
}

/**
 * Validate that an amount is within acceptable range
 */
export function isValidGoldAmount(grams: number): boolean {
  return grams > 0 && grams < 1000000000; // Max 1 billion grams
}

/**
 * Calculate fee in gold (not USD)
 * Fees should always be calculated on gold amount, not USD
 */
export function calculateFeeInGold(goldGrams: number, feePercent: number): number {
  return goldGrams * (feePercent / 100);
}

/**
 * Calculate net gold after fee deduction
 */
export function calculateNetGoldAfterFee(goldGrams: number, feePercent: number): number {
  const fee = calculateFeeInGold(goldGrams, feePercent);
  return goldGrams - fee;
}

/**
 * USD to AED conversion rate
 */
export const USD_TO_AED = 3.67;

/**
 * Convert USD to AED
 */
export function usdToAed(usdAmount: number): number {
  return usdAmount * USD_TO_AED;
}

/**
 * Gold-backed balance disclosure message
 */
export const GOLD_BALANCE_DISCLAIMER = "USD is an equivalent value. Your real balance is gold.";
export const GOLD_BALANCE_EXPLANATION = "Your balance represents physical gold grams. The USD value shown is calculated at the current gold price and may change.";
