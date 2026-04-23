import React from 'react';
import { ShieldCheck, ShieldOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Lock {
  id: string;
  goldGrams: number;
  lockedPriceUsd: number;
}

interface Balance {
  goldPricePerGram: number;
}

interface PriceProtectionBatchesProps {
  activeLocks: Lock[];
  balance: Balance;
  fpgwGrams: number;
  isTransferPending: boolean;
  onRemoveLock: (lock: { id: string; goldGrams: number; lockedPriceUsd: number }) => void;
}

export function PriceProtectionBatches({
  activeLocks,
  balance,
  fpgwGrams,
  isTransferPending,
  onRemoveLock,
}: PriceProtectionBatchesProps) {
  if (activeLocks.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-indigo-100 shadow-sm overflow-hidden" data-testid="price-protection-section">
      <div className="px-6 pt-5 pb-4 border-b border-indigo-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-indigo-900">Price Protection</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-indigo-400 hover:text-indigo-600 dark:text-indigo-400 transition-colors" data-testid="btn-price-protection-tooltip">
                <Info className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Price protection locks in a gold value — if the market drops, your gold is still worth the locked amount. Your total gold grams never change.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-indigo-500 mt-1">
          {activeLocks.length} active lock{activeLocks.length !== 1 ? 's' : ''} · {fpgwGrams.toFixed(4)}g total protected
        </p>
      </div>

      <div className="divide-y divide-indigo-50">
        {activeLocks.map((lock) => {
          const lockedValue = lock.goldGrams * lock.lockedPriceUsd;
          const marketValue = lock.goldGrams * balance.goldPricePerGram;
          const isAhead = lock.lockedPriceUsd > balance.goldPricePerGram;
          const isSame = Math.abs(lock.lockedPriceUsd - balance.goldPricePerGram) < 0.01;

          return (
            <div key={lock.id} className="px-6 py-4" data-testid={`lock-row-${lock.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Price Protection Active</span>
                  </div>
                  <p className="text-sm text-foreground font-medium">
                    {lock.goldGrams.toFixed(4)}g protected at ${lock.lockedPriceUsd.toFixed(2)}/g
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Current market: ${balance.goldPricePerGram.toFixed(2)}/g
                    {!isSame && (
                      <span className={`ml-1 font-medium ${isAhead ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        ({isAhead ? 'your protection is ahead of market' : 'market is above your locked price'})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Protected value: <span className="font-semibold text-indigo-700 dark:text-indigo-300">${lockedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    <span>·</span>
                    <span>Market value: <span className="font-semibold text-foreground">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:bg-indigo-950/20 shrink-0"
                  onClick={() => onRemoveLock({ id: lock.id, goldGrams: lock.goldGrams, lockedPriceUsd: lock.lockedPriceUsd })}
                  disabled={isTransferPending}
                  data-testid={`button-unlock-lock-${lock.id}`}
                >
                  <ShieldOff className="w-3 h-3 mr-1" /> Remove Protection
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
