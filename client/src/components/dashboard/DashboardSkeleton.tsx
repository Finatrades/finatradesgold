import React from 'react';
import { Card } from '@/components/ui/card';

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 rounded ${className}`} />
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="p-4 bg-white border border-orange-200 shadow-sm rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-3 w-16" />
          <SkeletonPulse className="h-6 w-24" />
          <SkeletonPulse className="h-3 w-20" />
        </div>
        <SkeletonPulse className="w-10 h-10 rounded-lg" />
      </div>
    </Card>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
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
    <Card className="p-6 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-lg border border-white/50 dark:border-zinc-800/50 min-h-[300px] rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <SkeletonPulse className="h-5 w-36" />
        <SkeletonPulse className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    </Card>
  );
}

export function WalletCardSkeleton() {
  return (
    <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/50 rounded-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonPulse className="h-5 w-24" />
          <SkeletonPulse className="w-8 h-8 rounded-full" />
        </div>
        <SkeletonPulse className="h-8 w-32" />
        <div className="flex gap-2">
          <SkeletonPulse className="h-9 w-20 rounded-lg" />
          <SkeletonPulse className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

export function CreditCardSkeleton() {
  return (
    <Card className="p-6 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl h-full min-h-[180px]">
      <div className="flex flex-col justify-between h-full">
        <div className="flex justify-between">
          <SkeletonPulse className="h-6 w-20 bg-zinc-700" />
          <SkeletonPulse className="h-6 w-10 bg-zinc-700" />
        </div>
        <div className="space-y-2">
          <SkeletonPulse className="h-5 w-48 bg-zinc-700" />
          <div className="flex justify-between">
            <SkeletonPulse className="h-4 w-24 bg-zinc-700" />
            <SkeletonPulse className="h-4 w-12 bg-zinc-700" />
          </div>
        </div>
      </div>
    </Card>
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
