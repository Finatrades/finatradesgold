import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultValue = { 
  accountType: 'personal', 
  setAccountType: () => {}, 
  toggleAccountType: () => {} 
};

const AccountTypeContext = createContext(defaultValue);

export function AccountTypeProvider({ children }) {
  const [accountType, setAccountType] = useState('personal');
  
  useEffect(() => {
    // Load from localStorage on mount (client-side only)
    try {
      const stored = localStorage.getItem('finatrades_account_type');
      if (stored === 'personal' || stored === 'business') {
        setAccountType(stored);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    // Save to localStorage when changed
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
    // Return default values instead of throwing to handle cases where provider might not be ready
    return { 
      accountType: 'personal', 
      setAccountType: () => {}, 
      toggleAccountType: () => {} 
    };
  }
  return context;
}

export default AccountTypeContext;