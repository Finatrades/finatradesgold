import { createContext, useContext, useState, ReactNode } from 'react';

type Mode = 'personal' | 'business';

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  isPersonal: boolean;
  isBusiness: boolean;
}

interface ModeProviderProps {
  children: ReactNode;
  defaultMode?: Mode;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children, defaultMode = 'personal' }: ModeProviderProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

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
