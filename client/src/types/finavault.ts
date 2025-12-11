export interface DepositItem {
  id: string;
  itemType: 'Bar' | 'Coin';
  quantity: number;
  weightPerUnitGrams: number;
  totalWeightGrams: number;
  purity: '999.9' | '999.5' | '995' | 'Other';
  brand: string;
  notes?: string;
}

export type DepositRequestStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Approved – Awaiting Delivery'
  | 'Received at Vault'
  | 'Stored in Vault'
  | 'Rejected'
  | 'Cancelled';

export interface DepositRequest {
  id: string;
  userId: string;
  vaultLocation: string;
  depositType: 'Bars' | 'Coins' | 'Mixed';
  totalDeclaredWeightGrams: number;
  items: DepositItem[];
  deliveryMethod: 'Walk-in' | 'Courier' | 'Pickup';
  pickupDetails?: {
    address: string;
    contactName: string;
    contactMobile: string;
    date: string;
    timeSlot: string;
  };
  documents: {
    id: string;
    type: string;
    name: string;
  }[];
  status: DepositRequestStatus;
  submittedAt: string;
  rejectionReason?: string;
  storageStartDate?: string;
  vaultInternalReference?: string;
}
