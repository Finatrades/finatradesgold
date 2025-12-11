import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AccountType = 'personal' | 'business';

interface AccountTypeContextType {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  toggleAccountType: () => void;
}

const defaultValue: AccountTypeContextType = { 
  accountType: 'personal', 
  setAccountType: () => {}, 
  toggleAccountType: () => {} 
};

const AccountTypeContext = createContext<AccountTypeContextType>(defaultValue);

export function AccountTypeProvider({ children }: { children: ReactNode }) {
  const [accountType, setAccountType] = useState<AccountType>('personal');
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('finatrades_account_type');
      if (stored === 'personal' || stored === 'business') {
        setAccountType(stored as AccountType);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('finatrades_account_type', accountType);
    } catch (e) {
      // localStorage not available
    }
  }, [accountType]);

  const toggleAccountType = () => {
    setAccountType(prev => prev === 'personal' ? 'business' : 'personal');
  };

  return (
    <AccountTypeContext.Provider value={{ accountType, setAccountType, toggleAccountType }}>
      {children}
    </AccountTypeContext.Provider>
  );
}

export function useAccountType() {
  const context = useContext(AccountTypeContext);
  if (!context) {
    return defaultValue;
  }
  return context;
}

export default AccountTypeContext;
