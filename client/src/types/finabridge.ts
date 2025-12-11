
export type TradeCaseStatus =
  | "Draft"
  | "Awaiting Funding"
  | "Funded – Docs Pending"
  | "Under Review"
  | "Approved – Ready to Release"
  | "Released"
  | "Closed"
  | "Rejected";

export type TradeRole = "Importer" | "Exporter";

export type TradeCase = {
  id: string;
  name: string;
  role: TradeRole;
  buyer: { company: string; country: string; contactName: string; email: string; };
  seller: { 
    company: string; 
    country: string; 
    contactName: string; 
    email: string;
    mobile?: string;
    bankName?: string;
    address?: string;
  };
  commodityDescription: string;
  valueUsd: number;
  valueGoldGrams: number;
  paymentTerms: string;
  deliveryTerms: string;
  shipmentMethod: string;
  loadingPort?: string;
  destinationPort?: string;
  deliveryTimeframe?: string;
  items?: TradeItem[];
  expectedDeliveryDate: string;
  lockedGoldGrams: number;
  status: TradeCaseStatus;
  createdAt: string;
  updatedAt: string;
  // Risk fields
  riskLevel?: 'Low' | 'Medium' | 'High';
  amlStatus?: 'Clear' | 'Flagged';
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

export type TradeDocument = {
  id: string;
  caseId: string;
  type: string;
  fileName: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  digitalSignatureStatus?: "Unsigned" | "Signed" | "Rejected";
};

export type ApprovalStepStatus = "Pending" | "In Review" | "Approved" | "Rejected";

export type ApprovalStep = {
  id: string;
  caseId: string;
  name: string; // "Importer Verification", etc.
  role: string; // "Importer", "Exporter", "Compliance"
  status: ApprovalStepStatus;
  approverName?: string;
  decisionAt?: string;
  notes?: string;
};

export type AuditLogEntry = {
  id: string;
  caseId: string;
  actorName: string;
  actorRole: string;
  actionType: string; // "Create Case", "Lock Gold", "Release Gold", "Upload Document", "Approve", etc.
  timestamp: string;
  ipAddress?: string;
  deviceId?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
};
