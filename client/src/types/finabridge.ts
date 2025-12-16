export type TradeCaseStatus =
  | "Draft"
  | "Funding Pending"
  | "Funded – Docs Pending"
  | "Under Review"
  | "Approved – Ready to Release"
  | "Released"
  | "Closed"
  | "Rejected"
  | "On Hold";

export type Role = "Importer" | "Exporter";

export type KycStatus = "Not Started" | "In Progress" | "Approved" | "Rejected";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type TradeParty = {
  id: string;
  name: string;
  role: Role;                // Importer / Exporter (per case)
  country: string;
  kycStatus: KycStatus;
  riskLevel: RiskLevel;
};

export type LockStatus = "Not Locked" | "Lock Pending" | "Locked" | "Released" | "Partially Released";

export type TradeCase = {
  id: string;
  reference: string;         // TF-2025-0007
  importer: TradeParty;
  exporter: TradeParty;
  contractNumber: string;
  commodityDescription: string;
  valueUsd: number;
  valueGoldGrams: number;
  lockedGoldGrams: number;   // in FinaFinance / FinaVault
  lockStatus: LockStatus;
  status: TradeCaseStatus;

  paymentTerms: string;      // e.g. "90 days after BL"
  deliveryTerms: string;     // FOB / CIF / EXW etc.
  shipmentMethod: string;    // Sea / Air / Land
  expectedDeliveryDate: string;

  createdAt: string;
  updatedAt: string;
  amlFlags: string[];        // e.g. ["High-risk jurisdiction"]
  jurisdictionRisk: RiskLevel;
};

export type DocumentType =
  | "Invoice"
  | "Bill of Lading"
  | "Packing List"
  | "Certificate of Origin"
  | "Insurance Certificate"
  | "Inspection Report"
  | "Other";

export type DocumentStatus =
  | "Missing"
  | "Uploaded"
  | "Under Review"
  | "Approved"
  | "Rejected";

export type TradeDocument = {
  id: string;
  caseId: string;
  type: DocumentType;
  fileName: string;
  status: DocumentStatus;
  uploadedBy: string;        // importer/exporter user
  uploadedAt: string;
  remarks?: string;
};

export type ApprovalStepStatus = "Pending" | "In Review" | "Approved" | "Rejected";

export type ApprovalStep = {
  id: string;
  caseId: string;
  name: string;              // "Importer Verification", "Compliance Review"
  role: string;              // "Importer", "Compliance", "Ops"
  status: ApprovalStepStatus;
  approverName?: string;
  decisionAt?: string;
  notes?: string;
};

export type AuditActionType =
  | "CaseCreated"
  | "CaseUpdated"
  | "FundingLocked"
  | "DocumentUploaded"
  | "DocumentReviewed"
  | "ApprovalUpdated"
  | "FundsReleased"
  | "CaseClosed"
  | "StatusChanged"
  | "RiskUpdated"; // Added RiskUpdated as it's used in the prompt's logic

export type AuditLogEntry = {
  id: string;
  caseId?: string;
  actorName: string;
  actorRole: string;         // "Admin", "Compliance", "System"
  actionType: AuditActionType;
  timestamp: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
};

export type LockedFundsSummary = {
  totalLockedGoldGrams: number;
  totalLockedUsdEquivalent: number;
  totalReleasedGoldGrams: number;
  activeCasesCount: number;
};

export type FinaBridgeWalletBalance = {
  availableGoldGrams: number;
  lockedGoldGrams: number;
  incomingLockedGoldGrams?: number;
};

export type FinaBridgeWallet = {
  importer: FinaBridgeWalletBalance;
  exporter: FinaBridgeWalletBalance;
};
