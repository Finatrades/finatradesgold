import React from 'react';

function SkeletonPulse({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-purple-100/60 via-white/80 to-purple-100/60 rounded ${className}`} style={style} />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="glass-panel p-5 rounded-[20px]">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-3 w-16 rounded-full" />
          <SkeletonPulse className="h-7 w-28 rounded-lg" />
          <SkeletonPulse className="h-3 w-20 rounded-full" />
        </div>
        <SkeletonPulse className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.50)' }}>
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-3 w-24" />
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
    <div className="glass-panel p-6 min-h-[300px] rounded-[20px]">
      <div className="flex justify-between items-center mb-6">
        <SkeletonPulse className="h-5 w-36 rounded-lg" />
        <SkeletonPulse className="h-4 w-16 rounded-full" />
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
    <div className="glass-panel p-6 rounded-[20px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonPulse className="h-5 w-24 rounded-lg" />
          <SkeletonPulse className="w-8 h-8 rounded-full" />
        </div>
        <SkeletonPulse className="h-8 w-32 rounded-lg" />
        <div className="flex gap-2">
          <SkeletonPulse className="h-9 w-20 rounded-xl" />
          <SkeletonPulse className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CreditCardSkeleton() {
  return (
    <div className="p-6 rounded-[20px] h-full min-h-[180px]" style={{ background: 'linear-gradient(135deg, #1a0e35, #0d0820)', backdropFilter: 'blur(24px)' }}>
      <div className="flex flex-col justify-between h-full">
        <div className="flex justify-between">
          <SkeletonPulse className="h-6 w-20 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' } as React.CSSProperties} />
          <SkeletonPulse className="h-6 w-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' } as React.CSSProperties} />
        </div>
        <div className="space-y-2">
          <SkeletonPulse className="h-5 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' } as React.CSSProperties} />
          <div className="flex justify-between">
            <SkeletonPulse className="h-4 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' } as React.CSSProperties} />
            <SkeletonPulse className="h-4 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' } as React.CSSProperties} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SkeletonPulse className="h-10 w-48 mb-2" />
      <SkeletonPulse className="h-4 w-64" />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <div className="lg:col-span-1">
          <CreditCardSkeleton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WalletCardSkeleton />
        <WalletCardSkeleton />
      </div>

      <TransactionsTableSkeleton />
    </div>
  );
}

export default DashboardSkeleton;
