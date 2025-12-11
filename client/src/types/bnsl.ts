
export type BnslTenor = 12 | 24 | 36;

export type BnslPlanStatus =
  | "Pending Activation"
  | "Active"
  | "Maturing"
  | "Completed"
  | "Early Termination Requested"
  | "Early Terminated"
  | "Defaulted"
  | "Cancelled";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type BnslParticipant = {
  id: string;
  name: string;
  kycStatus: "Not Started" | "In Progress" | "Approved" | "Rejected";
  country: string;
  riskLevel: RiskLevel;
};

export type BnslMarginPayoutStatus = "Scheduled" | "Processing" | "Paid" | "Failed" | "Cancelled";

export type BnslMarginPayout = {
  id: string;
  planId: string;
  sequence: number;               // 1..4 / 8 / 12
  scheduledDate: string;
  monetaryAmountUsd: number;      // fixed per quarter
  marketPriceUsdPerGram?: number; // set when paid
  gramsCredited?: number;         // monetaryAmount / price
  status: BnslMarginPayoutStatus;
  paidAt?: string;
};

export type BnslEarlyTerminationStatus =
  | "None"
  | "Requested"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Settled";

export type BnslEarlyTerminationRequest = {
  id: string;
  planId: string;
  requestedAt: string;
  reason: string;
  currentMarketPriceUsdPerGram: number;
  adminFeePercent: number;        // X% of Total Sale Proceeds
  penaltyPercent: number;         // Y% of Total Sale Proceeds
  totalDisbursedMarginUsd: number;
  // Computed simulation fields:
  basePriceComponentValueUsd: number;
  totalSaleProceedsUsd: number;
  totalDeductionsUsd: number;
  netValueUsd: number;
  finalGoldGrams: number;
  status: BnslEarlyTerminationStatus;
  decidedBy?: string;
  decidedAt?: string;
  decisionNotes?: string;
};

export type BnslPlan = {
  id: string;
  contractId: string;             // e.g. BNSL-2025-0012
  participant: BnslParticipant;
  tenorMonths: BnslTenor;         // 12 / 24 / 36
  agreedMarginAnnualPercent: number; // 8 / 10 / 12

  goldSoldGrams: number;          // [XXXX] grams sold
  enrollmentPriceUsdPerGram: number; // "Price at Enrollment"
  basePriceComponentUsd: number;  // goldSoldGrams * enrollmentPrice
  totalMarginComponentUsd: number;// Base * rate * (tenor/12)
  quarterlyMarginUsd: number;     // totalMargin / numDisbursements
  totalSaleProceedsUsd: number;   // base + totalMargin

  startDate: string;
  maturityDate: string;
  status: BnslPlanStatus;

  payouts: BnslMarginPayout[];
  earlyTermination?: BnslEarlyTerminationRequest;

  // tracking:
  paidMarginUsd: number;
  paidMarginGrams: number;
  remainingMarginUsd: number;

  // risk:
  planRiskLevel: RiskLevel;
  notes?: string;
};

export type AuditActionType =
  | "PlanCreated"
  | "PlanActivated"
  | "PayoutScheduled"
  | "PayoutPaid"
  | "EarlyTerminationRequested"
  | "EarlyTerminationSimulated"
  | "EarlyTerminationApproved"
  | "EarlyTerminationRejected"
  | "PlanCompleted"
  | "PlanCancelled"
  | "RiskUpdated";

export type AuditLogEntry = {
  id: string;
  planId?: string;
  actor: string;                  // "Admin Name"
  actorRole: string;              // "Ops", "Compliance", "System"
  actionType: AuditActionType;
  timestamp: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
};

export type BnslExposureSummary = {
  totalActiveBasePriceUsd: number;
  totalMarginLiabilityUsd: number;
  totalQuarterlyOutflowUsd: number;
  totalParticipants: number;
  plansByStatus: Record<BnslPlanStatus, number>;
  highRiskPlansCount: number;
};
