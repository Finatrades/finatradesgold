import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface SmartPollingConfig {
  activeInterval: number;      // Refresh rate when user is active (ms)
  idleInterval: number;        // Refresh rate when user is idle (ms)
  idleThreshold: number;       // Time before considering user idle (ms)
  pauseInBackground: boolean;  // Whether to pause polling when tab is hidden
}

interface SmartPollingState {
  interval: number;
  isIdle: boolean;
  isVisible: boolean;
  lastActivity: Date;
}

const DEFAULT_CONFIG: SmartPollingConfig = {
  activeInterval: 15000,      // 15 seconds when active
  idleInterval: 60000,        // 60 seconds when idle
  idleThreshold: 60000,       // 1 minute to become idle
  pauseInBackground: true,    // Pause when tab is hidden
};

export function useSmartPolling(config: Partial<SmartPollingConfig> = {}) {
  // Memoize config to prevent effect re-runs on every render
  const mergedConfig = useMemo(() => ({
    activeInterval: config.activeInterval ?? DEFAULT_CONFIG.activeInterval,
    idleInterval: config.idleInterval ?? DEFAULT_CONFIG.idleInterval,
    idleThreshold: config.idleThreshold ?? DEFAULT_CONFIG.idleThreshold,
    pauseInBackground: config.pauseInBackground ?? DEFAULT_CONFIG.pauseInBackground,
  }), [config.activeInterval, config.idleInterval, config.idleThreshold, config.pauseInBackground]);
  
  const [state, setState] = useState<SmartPollingState>({
    interval: mergedConfig.activeInterval,
    isIdle: false,
    isVisible: true,
    lastActivity: new Date(),
  });
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    
    setState(prev => {
      if (prev.isIdle) {
        return {
          ...prev,
          isIdle: false,
          interval: mergedConfig.activeInterval,
          lastActivity: new Date(),
        };
      }
      return { ...prev, lastActivity: new Date() };
    });

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    idleTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isIdle: true,
        interval: mergedConfig.idleInterval,
      }));
    }, mergedConfig.idleThreshold);
  }, [mergedConfig.activeInterval, mergedConfig.idleInterval, mergedConfig.idleThreshold]);

  // Track page visibility
  const handleVisibilityChange = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    
    setState(prev => ({
      ...prev,
      isVisible,
      // Reset to active interval when becoming visible
      interval: isVisible ? mergedConfig.activeInterval : prev.interval,
      isIdle: isVisible ? false : prev.isIdle,
    }));

    // Trigger activity on becoming visible
    if (isVisible) {
      handleActivity();
    }
  }, [mergedConfig.activeInterval, handleActivity]);

  useEffect(() => {
    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add activity listeners (throttled)
    let lastEventTime = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastEventTime > 1000) { // Throttle to once per second
        lastEventTime = now;
        handleActivity();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledHandler, { passive: true });
    });

    // Add visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial idle timer
    idleTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isIdle: true,
        interval: mergedConfig.idleInterval,
      }));
    }, mergedConfig.idleThreshold);

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledHandler);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [handleActivity, handleVisibilityChange, mergedConfig.idleInterval, mergedConfig.idleThreshold]);

  // Calculate effective polling interval
  const getEffectiveInterval = useCallback((): number | false => {
    // Pause polling if in background and configured to do so
    if (!state.isVisible && mergedConfig.pauseInBackground) {
      return false;
    }
    
    return state.interval;
  }, [state.isVisible, state.interval, mergedConfig.pauseInBackground]);

  return {
    interval: getEffectiveInterval(),
    isIdle: state.isIdle,
    isVisible: state.isVisible,
    lastActivity: state.lastActivity,
    triggerActivity: handleActivity,
  };
}

export function useSyncIndicator() {
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'stale' | 'paused'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const updateSyncState = useCallback((state: 'synced' | 'syncing' | 'stale' | 'paused') => {
    setSyncState(state);
    if (state === 'synced') {
      setLastSyncTime(new Date());
    }
  }, []);

  const getSyncLabel = useCallback(() => {
    switch (syncState) {
      case 'synced':
        return 'Up to date';
      case 'syncing':
        return 'Syncing...';
      case 'stale':
        return 'Updating...';
      case 'paused':
        return 'Paused';
      default:
        return 'Unknown';
    }
  }, [syncState]);

  const getTimeSinceSync = useCallback(() => {
    if (!lastSyncTime) return null;
    const seconds = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }, [lastSyncTime]);

  return {
    syncState,
    lastSyncTime,
    updateSyncState,
    getSyncLabel,
    getTimeSinceSync,
  };
}
