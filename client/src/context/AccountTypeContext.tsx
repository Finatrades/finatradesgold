import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  
  // Sync with logged-in user's account type from database
  useEffect(() => {
    if (user && user.accountType) {
      const userAccountType = user.accountType === 'business' ? 'business' : 'personal';
      setAccountType(userAccountType);
      try {
        localStorage.setItem('finatrades_account_type', userAccountType);
      } catch (e) {
        // localStorage not available
      }
    }
  }, [user]);
  
  // Initialize from localStorage only when not logged in
  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('finatrades_account_type');
        if (stored === 'personal' || stored === 'business') {
          setAccountType(stored as AccountType);
        }
      } catch (e) {
        // localStorage not available
      }
    }
  }, [user]);

  // Save to localStorage when account type changes (for non-logged-in state)
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('finatrades_account_type', accountType);
      } catch (e) {
        // localStorage not available
      }
    }
  }, [accountType, user]);

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
