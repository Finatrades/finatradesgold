import { useState, useEffect } from 'react';

const getInitialValue = (breakpoint: number): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
};

export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => getInitialValue(breakpoint));

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    
    setIsMobile(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
