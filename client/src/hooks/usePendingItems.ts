import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export interface PendingItem {
  key: string;
  label: string;
  count: number;
  href: string;
}

const REFETCH_INTERVAL = 30000;
const STALE_TIME = 20000;

export function usePendingItems(): { items: PendingItem[]; total: number } {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: incomingData } = useQuery({
    queryKey: ['pendingTransfers', 'incoming', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finapay/pending/incoming/${userId}`);
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  });

  const { data: requestsData } = useQuery({
    queryKey: ['paymentRequests', 'received', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finapay/requests/received/${userId}`);
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  });

  const { data: depositRequestsData } = useQuery({
    queryKey: ['depositRequests', 'pending', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/deposit-requests/${userId}`);
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  });

  const { data: physicalDepositsData } = useQuery({
    queryKey: ['physical-deposits', userId],
    queryFn: async () => {
      const res = await fetch('/api/physical-deposits/deposits');
      if (!res.ok) return { deposits: [] };
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  });

  const incomingCount = (incomingData?.transfers || []).length;

  const paymentRequestCount = (requestsData?.requests || []).filter(
    (r: { status: string }) => r.status === 'Pending'
  ).length;

  const depositPendingCount = (depositRequestsData?.requests || []).filter(
    (d: { status: string }) => d.status === 'Pending'
  ).length;

  const physicalPendingCount = (physicalDepositsData?.deposits || []).filter(
    (d: { status: string }) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'RECEIVED', 'INSPECTION', 'NEGOTIATION'].includes(d.status)
  ).length;

  const rawItems: PendingItem[] = [
    {
      key: 'transfers',
      label: 'Transfers awaiting your response',
      count: incomingCount,
      href: '/finapay',
    },
    {
      key: 'payments',
      label: 'Payment requests to fulfil',
      count: paymentRequestCount,
      href: '/finapay',
    },
    {
      key: 'deposits',
      label: 'Deposits pending verification',
      count: depositPendingCount,
      href: '/finapay',
    },
    {
      key: 'physical',
      label: 'Physical gold — awaiting vault inspection',
      count: physicalPendingCount,
      href: '/finavault',
    },
  ];

  const items = rawItems.filter(item => item.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return { items, total };
}
