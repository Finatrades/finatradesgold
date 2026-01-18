import { useEffect, useCallback, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface LedgerEvent {
  type: 'balance_update' | 'transaction' | 'certificate' | 'notification' | 'gold_price' | 'admin_update' | 'deposit_rejected' | 'withdrawal_rejected' | 'crypto_rejected' | 'pending_transfer' | 'physical_deposit_update' | 'negotiation_message';
  module: 'finapay' | 'finavault' | 'bnsl' | 'finabridge' | 'system' | 'admin';
  action: string;
  data?: any;
  timestamp: string;
  syncVersion: number;
}

// Enterprise-optimized query key mapping - balanced between performance and real-time accuracy
const QUERY_KEY_MAP: Record<string, string[][]> = {
  'balance_update': [['wallet'], ['dashboard']], // Essential for financial accuracy
  'transaction': [['transactions'], ['dashboard']], // Transactions update dashboard totals
  'certificate': [['certificates']], // Only certificates
  'notification': [['notifications']], // Only notifications
  'gold_price': [['gold-price']], // Only gold price - dashboard has longer staleTime
  'deposit_rejected': [['deposit-requests'], ['notifications'], ['dashboard']],
  'withdrawal_rejected': [['withdrawal-requests'], ['notifications'], ['dashboard']],
  'crypto_rejected': [['crypto-payments'], ['notifications']],
  'pending_transfer': [['pendingTransfers'], ['wallet']], // Pending affects wallet
  'admin_update': [['admin-transactions'], ['admin-users']], // Minimal admin updates
  'physical_deposit_update': [['physical-deposits'], ['user-physical-deposits']], // Physical deposit status updates
  'negotiation_message': [['physical-deposits'], ['user-physical-deposits']], // Negotiation messages
};

const MODULE_QUERY_MAP: Record<string, string[][]> = {
  'finapay': [['dashboard'], ['wallet'], ['transactions']],
  'finavault': [['vault-deposits'], ['vault-withdrawals'], ['certificates'], ['dashboard'], ['physical-deposits'], ['user-physical-deposits']],
  'bnsl': [['bnsl-plans'], ['bnsl-payouts'], ['dashboard']],
  'finabridge': [['trade-cases'], ['trade-documents']],
  'system': [['notifications'], ['platform-config']],
  'admin': [
    ['admin-users'],
    ['admin-transactions'],
    ['/api/admin/transactions'],
  ],
};

export function useDataSync() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const processedEvents = useRef<Set<string>>(new Set());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReconnectRef = useRef<number>(0);
  const reconnectCooldown = 5000; // 5 seconds cooldown between reconnection syncs

  useEffect(() => {
    if (isConnected) {
      const now = Date.now();
      const timeSinceLastReconnect = now - lastReconnectRef.current;
      
      // Only clear cache if enough time has passed since last reconnect (prevents mobile flicker)
      if (timeSinceLastReconnect > reconnectCooldown) {
        processedEvents.current.clear();
        lastReconnectRef.current = now;
        console.log('[DataSync] Cleared event cache on reconnect');
      } else {
        console.log('[DataSync] Skipping cache clear - reconnected too quickly (mobile network)');
      }
    }
  }, [isConnected]);

  const invalidateQueriesForEvent = useCallback((event: LedgerEvent) => {
    const eventKey = `${event.type}-${event.module}-${event.action}-${event.syncVersion}`;
    if (processedEvents.current.has(eventKey)) {
      console.log('[DataSync] Skipping duplicate event', eventKey);
      return;
    }
    processedEvents.current.add(eventKey);
    if (processedEvents.current.size > 100) {
      const entries = Array.from(processedEvents.current);
      processedEvents.current = new Set(entries.slice(-50));
    }

    const queriesToInvalidate: string[][] = [];

    const typeQueries = QUERY_KEY_MAP[event.type] || [];
    queriesToInvalidate.push(...typeQueries);

    const moduleQueries = MODULE_QUERY_MAP[event.module] || [];
    queriesToInvalidate.push(...moduleQueries);

    const uniqueQueries = Array.from(
      new Set(queriesToInvalidate.map(q => JSON.stringify(q)))
    ).map(q => JSON.parse(q));

    console.log('[DataSync] Invalidating queries:', uniqueQueries, 'for event:', event.type, event.module, event.action);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      uniqueQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    }, 100);
  }, [queryClient]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLedgerSync = (event: LedgerEvent) => {
      console.log('[DataSync] Received ledger:sync event:', event);
      invalidateQueriesForEvent(event);
    };

    const handleGoldPriceUpdate = (data: { price: number; currency: string }) => {
      console.log('[DataSync] Received gold:price:update:', data);
      queryClient.invalidateQueries({ queryKey: ['gold-price'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleAdminUpdate = (data: { entity: string; action: string }) => {
      console.log('[DataSync] Received admin:update:', data);
      const adminQueries = [
        ['admin-' + data.entity],
        ['/api/admin/' + data.entity],
      ];
      adminQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    };

    socket.on('ledger:sync', handleLedgerSync);
    socket.on('gold:price:update', handleGoldPriceUpdate);
    socket.on('admin:update', handleAdminUpdate);

    return () => {
      socket.off('ledger:sync', handleLedgerSync);
      socket.off('gold:price:update', handleGoldPriceUpdate);
      socket.off('admin:update', handleAdminUpdate);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [socket, isConnected, invalidateQueriesForEvent, queryClient]);

  const requestSync = useCallback((modules?: string[]) => {
    if (!socket || !isConnected) return;
    
    console.log('[DataSync] Requesting sync for modules:', modules || 'all');
    socket.emit('sync:request', { modules, userId: user?.id });
  }, [socket, isConnected, user?.id]);

  const forceRefresh = useCallback((queryKeys?: string[][]) => {
    const keysToRefresh = queryKeys || [
      ['dashboard'],
      ['wallet'],
      ['transactions'],
      ['notifications'],
    ];
    
    console.log('[DataSync] Force refreshing queries:', keysToRefresh);
    keysToRefresh.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient]);

  return {
    isConnected,
    requestSync,
    forceRefresh,
    processedEventCount: processedEvents.current.size,
  };
}

export function DataSyncProvider({ children }: { children: ReactNode }) {
  useDataSync();
  return <>{children}</>;
}
