import { createContext, useContext, useState, ReactNode } from 'react';

type Mode = 'personal' | 'business';

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isPersonal: boolean;
  isBusiness: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('business');

  return (
    <ModeContext.Provider value={{ 
      mode, 
      setMode, 
      isPersonal: mode === 'personal',
      isBusiness: mode === 'business'
    }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
