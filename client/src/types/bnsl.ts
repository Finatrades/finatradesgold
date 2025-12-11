export type BnslTenor = 12 | 24 | 36;

export type BnslPlanStatus =
  | "Pending Acceptance"
  | "Active"
  | "Maturing"
  | "Completed"
  | "Early Terminated";

export type BnslPayoutStatus = "Scheduled" | "Paid" | "Cancelled";

export type BnslPayout = {
  id: string;
  planId: string;
  sequence: number; // 1..4 / 8 / 12
  scheduledDate: string;
  monetaryAmountUsd: number;      // fixed margin per quarter
  marketPriceUsdPerGramAtPayout?: number; // when paid
  gramsCredited?: number;         // computed = monetaryAmountUsd / price
  status: BnslPayoutStatus;
};

export type BnslPlan = {
  id: string;
  tenorMonths: BnslTenor;         // 12 / 24 / 36
  marginRateAnnualPercent: number;// 8 / 10 / 12
  goldSoldGrams: number;          // e.g. 100g
  enrollmentPriceUsdPerGram: number; // price at sale
  basePriceComponentUsd: number;  // goldSoldGrams * enrollment price
  totalMarginComponentUsd: number;// base * annual rate * (tenorMonths / 12)
  quarterlyMarginUsd: number;     // totalMargin / numDisbursements
  startDate: string;
  maturityDate: string;
  status: BnslPlanStatus;
  payouts: BnslPayout[];
  // derived/info
  totalPaidMarginUsd: number;
  totalPaidMarginGrams: number;
  earlyTerminationAllowed: boolean;
};
