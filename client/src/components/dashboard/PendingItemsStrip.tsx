import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDownLeft, DollarSign, Package, ChevronRight, Send } from 'lucide-react';

interface PendingCategory {
  key: string;
  label: string;
  count: number;
  href: string;
  icon: React.ReactNode;
}

export default function PendingItemsStrip() {
  const { user } = useAuth();

  const { data: incomingData } = useQuery({
    queryKey: ['pendingTransfers', 'incoming', user?.id],
    queryFn: async () => {
      if (!user?.id) return { transfers: [] };
      const res = await apiRequest('GET', `/api/finapay/pending/incoming/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: outgoingData } = useQuery({
    queryKey: ['pendingTransfers', 'outgoing', user?.id],
    queryFn: async () => {
      if (!user?.id) return { transfers: [] };
      const res = await apiRequest('GET', `/api/finapay/pending/outgoing/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: requestsData } = useQuery({
    queryKey: ['paymentRequests', 'received', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await apiRequest('GET', `/api/finapay/requests/received/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: depositRequestsData } = useQuery({
    queryKey: ['depositRequests', 'pending', user?.id],
    queryFn: async () => {
      if (!user?.id) return { requests: [] };
      const res = await apiRequest('GET', `/api/deposit-requests/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const { data: physicalDepositsData } = useQuery({
    queryKey: ['physical-deposits', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/physical-deposits/deposits');
      if (!res.ok) return { deposits: [] };
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const incomingCount = (incomingData?.transfers || []).length;
  const outgoingCount = (outgoingData?.transfers || []).length;
  const paymentRequestCount = (requestsData?.requests || []).filter(
    (r: { status: string }) => r.status === 'Pending'
  ).length;
  const depositPendingCount = (depositRequestsData?.requests || []).filter(
    (d: { status: string }) => d.status === 'Pending'
  ).length;
  const physicalPendingCount = (physicalDepositsData?.deposits || []).filter(
    (d: { status: string }) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'RECEIVED', 'INSPECTION', 'NEGOTIATION', 'AGREED', 'READY_FOR_PAYMENT'].includes(d.status)
  ).length;

  const categories: PendingCategory[] = [
    {
      key: 'incoming',
      label: 'Transfers awaiting your response',
      count: incomingCount,
      href: '/finapay',
      icon: <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />,
    },
    {
      key: 'outgoing',
      label: 'Sent transfers awaiting acceptance',
      count: outgoingCount,
      href: '/finapay',
      icon: <Send className="w-3.5 h-3.5 text-amber-700" />,
    },
    {
      key: 'requests',
      label: 'Payment requests to review',
      count: paymentRequestCount,
      href: '/finapay',
      icon: <DollarSign className="w-3.5 h-3.5 text-amber-700" />,
    },
    {
      key: 'deposits',
      label: 'Deposits pending verification',
      count: depositPendingCount,
      href: '/finapay',
      icon: <Clock className="w-3.5 h-3.5 text-amber-700" />,
    },
    {
      key: 'physical',
      label: 'Physical gold deposits in progress',
      count: physicalPendingCount,
      href: '/finavault',
      icon: <Package className="w-3.5 h-3.5 text-amber-700" />,
    },
  ].filter(c => c.count > 0);

  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  if (totalCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pending-strip"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[20px] overflow-hidden"
        style={{
          background: 'rgba(255,251,235,0.85)',
          border: '1px solid rgba(251,191,36,0.30)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 16px rgba(217,119,6,0.10)',
        }}
        data-testid="card-pending-items-strip"
      >
        {/* Amber top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]"
          style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)' }}
        />

        {/* Subtle amber mesh */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 90% 0%, rgba(251,191,36,0.08) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}
            >
              <Clock className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <span className="text-[13px] font-bold text-gray-800">Pending Actions</span>
            <span
              className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
              data-testid="badge-pending-total"
            >
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          </div>

          {/* Category rows */}
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <Link key={cat.key} href={cat.href}>
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-amber-50/70 transition-all cursor-pointer group"
                  style={{ border: '1px solid rgba(251,191,36,0.15)' }}
                  data-testid={`pending-row-${cat.key}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(251,191,36,0.12)' }}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-[12px] font-medium text-gray-700 truncate">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span
                      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-amber-800"
                      style={{ background: 'rgba(251,191,36,0.20)', border: '1px solid rgba(251,191,36,0.25)' }}
                      data-testid={`badge-count-${cat.key}`}
                    >
                      {cat.count}
                    </span>
                    <ChevronRight
                      className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
