import React from 'react';

function SkeletonPulse({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`skeleton-shimmer rounded ${className}`} style={style} />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="glass-card rounded-[20px] p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2.5">
          <SkeletonPulse className="h-3 w-16" />
          <SkeletonPulse className="h-7 w-28" />
          <SkeletonPulse className="h-3 w-20" />
        </div>
        <SkeletonPulse className="w-10 h-10 rounded-xl flex-shrink-0 ml-3" />
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.03)' }}>
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right space-y-1.5">
        <SkeletonPulse className="h-4 w-16 ml-auto" />
        <SkeletonPulse className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}

export function TransactionsTableSkeleton() {
  return (
    <div className="glass-card-elevated rounded-[20px] p-6 min-h-[300px]">
      <div className="flex justify-between items-center mb-6">
        <SkeletonPulse className="h-5 w-40" />
        <SkeletonPulse className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function WalletCardSkeleton() {
  return (
    <div className="glass-hero rounded-[28px] p-7 relative overflow-hidden">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <SkeletonPulse className="h-3 w-28" />
            <SkeletonPulse className="h-10 w-44" />
          </div>
          <SkeletonPulse className="w-[152px] h-[88px] rounded-xl" />
        </div>
        <div className="flex gap-2">
          <SkeletonPulse className="h-10 flex-1 rounded-xl" />
          <SkeletonPulse className="h-10 flex-1 rounded-xl" />
          <SkeletonPulse className="h-10 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CreditCardSkeleton() {
  return (
    <div className="rounded-[20px] p-6 h-full min-h-[180px]" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex flex-col justify-between h-full">
        <div className="flex justify-between">
          <SkeletonPulse className="h-6 w-24" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <SkeletonPulse className="h-6 w-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="space-y-2 mt-auto">
          <SkeletonPulse className="h-5 w-48" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex justify-between">
            <SkeletonPulse className="h-4 w-24" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <SkeletonPulse className="h-4 w-12" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-[1420px] mx-auto px-6 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="space-y-2">
          <SkeletonPulse className="h-8 w-52" />
          <SkeletonPulse className="h-4 w-72" />
        </div>
        <SkeletonPulse className="h-9 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-5 flex flex-col gap-4">
          <WalletCardSkeleton />
          <div className="glass-card-elevated rounded-[20px] p-5 space-y-3">
            <SkeletonPulse className="h-4 w-36" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <SkeletonPulse key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="glass-card-elevated rounded-[20px] p-5 space-y-3">
            <SkeletonPulse className="h-4 w-28" />
            <SkeletonPulse className="h-20 rounded-xl" />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
          <div className="glass-card-elevated rounded-[20px] p-6 space-y-3">
            <SkeletonPulse className="h-4 w-32" />
            <SkeletonPulse className="h-24 rounded-xl" />
            <SkeletonPulse className="h-10 w-full rounded-xl" />
          </div>
          <div className="glass-card-elevated rounded-[20px] p-6 space-y-3">
            <SkeletonPulse className="h-4 w-40" />
            <SkeletonPulse className="h-28 rounded-xl" />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-3 flex flex-col gap-4">
          <CreditCardSkeleton />
          <div className="glass-indigo rounded-[20px] p-6 space-y-3">
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-8 w-36" />
            <SkeletonPulse className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <TransactionsTableSkeleton />
    </div>
  );
}

export default DashboardSkeleton;
