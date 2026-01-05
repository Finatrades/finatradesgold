import React, { useState, useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Check, RefreshCw, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SyncStatusIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isSyncing = isFetching > 0 || isMutating > 0;

  if (isOffline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium" data-testid="sync-status-offline">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No internet connection. Changes will sync when online.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isSyncing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-medium" data-testid="sync-status-syncing">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Syncing</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Updating data...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium" data-testid="sync-status-uptodate">
            <Check className="w-3 h-3" />
            <span className="hidden sm:inline">Up to date</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>All data is synchronized</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
