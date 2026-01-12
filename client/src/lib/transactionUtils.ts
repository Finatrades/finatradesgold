export const normalizeStatus = (status: string): string => {
  const s = status?.toLowerCase() || '';
  if (s === 'completed' || s === 'complete' || s === 'confirmed' || s === 'approved') return 'Completed';
  if (s === 'pending' || s === 'processing') return 'Pending';
  if (s === 'cancelled' || s === 'rejected' || s === 'failed') return 'Failed';
  return status;
};

export const getTransactionLabel = (actionType: string): string => {
  const action = actionType?.toUpperCase() || '';
  const labelMap: Record<string, string> = {
    'ADD_FUNDS': 'Deposit',
    'BUY': 'Buy',
    'SELL': 'Sell',
    'SEND': 'Send',
    'RECEIVE': 'Receive',
    'DEPOSIT_PHYSICAL_GOLD': 'Deposit Physical Gold',
    'DEPOSIT': 'Deposit',
    'WITHDRAWAL': 'Withdrawal',
    'TRANSFER': 'Transfer',
    'LOCK': 'Lock',
    'UNLOCK': 'Unlock',
    'SWAP': 'Swap',
  };
  return labelMap[action] || actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const getVaultTransactionType = (actionType: string): 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal' | 'Vault Deposit' | 'Vault Withdrawal' | 'Swap' | 'Bank Deposit' => {
  const action = actionType?.toUpperCase() || '';
  const map: Record<string, 'Buy' | 'Sell' | 'Send' | 'Receive' | 'Deposit' | 'Withdrawal' | 'Vault Deposit' | 'Vault Withdrawal' | 'Swap' | 'Bank Deposit'> = {
    'ADD_FUNDS': 'Buy',
    'BUY': 'Buy',
    'SELL': 'Sell',
    'SEND': 'Send',
    'RECEIVE': 'Receive',
    'DEPOSIT': 'Deposit',
    'DEPOSIT_PHYSICAL_GOLD': 'Vault Deposit',
    'WITHDRAWAL': 'Withdrawal',
    'LOCK': 'Vault Deposit',
    'UNLOCK': 'Vault Withdrawal',
    'TRANSFER': 'Swap',
    'SWAP': 'Swap',
  };
  return map[action] || 'Buy';
};

export const isCompletedStatus = (status: string): boolean => {
  const s = status?.toLowerCase() || '';
  return s === 'completed' || s === 'complete' || s === 'confirmed' || s === 'approved';
};
