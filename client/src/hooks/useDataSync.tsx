import { useEffect, useCallback, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface LedgerEvent {
  type: 'balance_update' | 'transaction' | 'certificate' | 'notification' | 'gold_price' | 'admin_update' | 'deposit_rejected' | 'withdrawal_rejected' | 'crypto_rejected' | 'pending_transfer';
  module: 'finapay' | 'finavault' | 'bnsl' | 'finabridge' | 'system' | 'admin';
  action: string;
  data?: any;
  timestamp: string;
  syncVersion: number;
}

const QUERY_KEY_MAP: Record<string, string[][]> = {
  'balance_update': [['dashboard'], ['wallet'], ['user']],
  'transaction': [['dashboard'], ['transactions'], ['wallet']],
  'certificate': [['dashboard'], ['certificates'], ['vault-deposits']],
  'notification': [['notifications']],
  'gold_price': [['gold-price'], ['dashboard']],
  'deposit_rejected': [['dashboard'], ['transactions'], ['notifications'], ['deposit-requests']],
  'withdrawal_rejected': [['dashboard'], ['transactions'], ['notifications'], ['withdrawal-requests']],
  'crypto_rejected': [['dashboard'], ['transactions'], ['notifications'], ['crypto-payments']],
  'pending_transfer': [['pendingTransfers'], ['notifications'], ['dashboard'], ['wallet']],
  'admin_update': [
    ['admin-users'],
    ['admin-transactions'],
    ['admin-kyc-submissions'],
    ['admin-vault'],
    ['admin-bnsl'],
    ['/api/admin/transactions'],
    ['/api/admin/users'],
  ],
};

const MODULE_QUERY_MAP: Record<string, string[][]> = {
  'finapay': [['dashboard'], ['wallet'], ['transactions']],
  'finavault': [['vault-deposits'], ['vault-withdrawals'], ['certificates'], ['dashboard']],
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

  useEffect(() => {
    if (isConnected) {
      processedEvents.current.clear();
      console.log('[DataSync] Cleared event cache on reconnect');
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
