import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface UseIdleTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onIdle?: () => void;
}

export function useIdleTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onIdle,
}: UseIdleTimeoutOptions = {}) {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    toast.info('Session expired due to inactivity');
    if (onIdle) {
      onIdle();
    } else {
      logout();
    }
  }, [clearAllTimers, logout, onIdle]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    
    if (!user) return;

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(warningMinutes * 60);
      
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningMs);

    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [user, timeoutMs, warningMs, warningMinutes, clearAllTimers, handleLogout]);

  const stayActive = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (showWarning) return;
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [user, resetTimer, clearAllTimers, showWarning]);

  return {
    showWarning,
    remainingSeconds,
    stayActive,
    logout: handleLogout,
  };
}
