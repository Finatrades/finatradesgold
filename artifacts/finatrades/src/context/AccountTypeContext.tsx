import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type AccountType = 'personal' | 'business';

interface AccountTypeContextType {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  toggleAccountType: () => void;
  isModeLocked: boolean;
  domainMode: AccountType;
}

export function getDomainMode(): AccountType {
  if (typeof window === 'undefined') return 'personal';
  
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('finagold')) {
    return 'personal';
  }
  if (hostname.includes('finatrades')) {
    return 'business';
  }
  
  return 'personal';
}

const domainMode = getDomainMode();

const defaultValue: AccountTypeContextType = { 
  accountType: domainMode, 
  setAccountType: () => {}, 
  toggleAccountType: () => {},
  isModeLocked: true,
  domainMode: domainMode
};

const AccountTypeContext = createContext<AccountTypeContextType>(defaultValue);

export function AccountTypeProvider({ children }: { children: ReactNode }) {
  const detectedMode = getDomainMode();
  const [accountType, setAccountTypeInternal] = useState<AccountType>(detectedMode);
  const { user } = useAuth();
  
  useEffect(() => {
    if (user && user.accountType) {
      const userAccountType = user.accountType === 'business' ? 'business' : 'personal';
      setAccountTypeInternal(userAccountType);
    } else {
      setAccountTypeInternal(detectedMode);
    }
  }, [user, detectedMode]);
  
  const setAccountType = (_type: AccountType) => {
  };
  
  const toggleAccountType = () => {
  };

  return (
    <AccountTypeContext.Provider value={{ 
      accountType, 
      setAccountType, 
      toggleAccountType,
      isModeLocked: true,
      domainMode: detectedMode
    }}>
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
