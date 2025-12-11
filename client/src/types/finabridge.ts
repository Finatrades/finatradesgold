
export type TradeCaseStatus =
  | "Draft"
  | "Awaiting Funding"
  | "Funded – Docs Pending"
  | "Under Review"
  | "Approved – Ready to Release"
  | "Released"
  | "Closed"
  | "Rejected"
  | "On Hold";

export type TradeRole = "Importer" | "Exporter";

export type PartyKycStatus = "Not Started" | "In Progress" | "Approved" | "Rejected";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type TradeParty = {
  id: string;
  name: string;
  role: TradeRole;            // importer or exporter in that case
  country: string;
  kycStatus: PartyKycStatus;
  riskLevel: RiskLevel;
  sanctionsFlag: boolean;
  contactName?: string;
  email?: string;
};

export type TradeCase = {
  id: string;
  reference: string;          // e.g. TF-2025-0007
  name: string;
  role: TradeRole; // Kept for compatibility, but mainly derived from importer/exporter now
  
  // New Party Structures
  importer: TradeParty;
  exporter: TradeParty;
  
  // Legacy fields kept for compatibility with existing code if needed, but should migrate to new structure
  buyer?: { company: string; country: string; contactName: string; email: string; };
  seller?: { company: string; country: string; contactName: string; email: string; };

  commodityDescription: string;
  valueUsd: number;
  valueGoldGrams: number;
  lockedGoldGrams: number;    // reserved settlement amount
  status: TradeCaseStatus;
  createdAt: string;
  updatedAt: string;
  
  incoterm: string;           // FOB, CIF, etc.
  shipmentMethod: string;     // Air, Sea, Land
  expectedDeliveryDate: string;
  
  jurisdictionRisk: RiskLevel;
  amlFlags: string[];         // e.g. ["High invoice value", "High-risk country"]
  
  // Additional fields from previous definition
  paymentTerms?: string;
  deliveryTerms?: string; // alias for incoterm usually
  items?: TradeItem[];
  
  // Professional Services
  insuranceOption?: 'Finatrades Premium' | 'Self-Arranged';
  inspectionRequired?: boolean;
  logisticsOption?: 'Finatrades Secure' | 'Self-Arranged';
  
  // Financials
  platformFee?: number;
  insuranceFee?: number;
  totalPayable?: number;
};

export type TradeItem = {
  id: string;
  description: string;
  hsCode: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  currency: string;
};

export type FinaBridgeWalletSide = {
  availableGoldGrams: number;
  lockedGoldGrams: number;
  incomingLockedGoldGrams?: number; // mainly for exporter
};

export type FinaBridgeWallet = {
  importer: FinaBridgeWalletSide;
  exporter: FinaBridgeWalletSide;
};

export type DocumentStatus = "Missing" | "Uploaded" | "Under Review" | "Approved" | "Rejected";

export type TradeDocument = {
  id: string;
  caseId: string;
  type: string;               // Invoice, BL, CO, Insurance, etc.
  fileName: string;
  status: DocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
  version?: number;
  digitalSignatureStatus?: "Unsigned" | "Signed" | "Rejected";
};

export type ApprovalStepStatus = "Pending" | "In Review" | "Approved" | "Rejected";

export type ApprovalStep = {
  id: string;
  caseId: string;
  name: string;               // "Importer Verification", "Compliance Review", etc.
  role: string;               // "Ops", "Compliance", "Risk"
  status: ApprovalStepStatus;
  approverName?: string;
  decisionAt?: string;
  notes?: string;
};

export type AuditLogEntry = {
  id: string;
  caseId?: string;
  actorName: string;
  actorRole: string;          // "Admin", "Compliance", "System"
  actionType: string;         // "StatusChange", "DocumentReview", "ReleaseFunds", etc.
  timestamp: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  deviceId?: string;
};

export type LockedFundsSummary = {
  totalLockedGoldGrams: number;
  totalReleasedGoldGrams: number;
  lockedByStatus: Record<TradeCaseStatus, number>;
};
