import React from 'react';
import { Banknote, Lock, Briefcase, Database, TrendingUp } from 'lucide-react';

export interface VaultOwnershipSummary {
  totalGoldGrams: string | null;
  availableGrams: string | null;
  lockedBnslGrams: string | null;
  reservedTradeGrams: string | null;
  mpgwAvailableGrams: string | null;
  fpgwAvailableGrams: string | null;
  finaPayGrams?: string | null;
  bnslAvailableGrams?: string | null;
  finaBridgeAvailableGrams?: string | null;
  [key: string]: string | null | undefined;
}

interface GoldOverviewProps {
  ownership: VaultOwnershipSummary | null | undefined;
  goldPricePerGram: number;
}

function fmt(grams: number): string {
  return grams.toFixed(4);
}

function usd(grams: number, price: number): string {
  return (grams * price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function sp(val: string | null | undefined): number {
  if (!val) return 0;
  const p = parseFloat(val);
  return isNaN(p) ? 0 : p;
}

interface TileProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  grams: number;
  goldPricePerGram: number;
  accent: string;
  bg: string;
  border: string;
  primary?: boolean;
  testId?: string;
}

function Tile({ icon, label, sub, grams, goldPricePerGram, accent, bg, border, primary, testId }: TileProps) {
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-1 ${bg} ${border} ${primary ? 'shadow-md' : ''}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold ${primary ? 'text-amber-800 dark:text-amber-200' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <p className={`font-bold ${primary ? 'text-2xl text-amber-700 dark:text-amber-300' : 'text-lg text-foreground'}`}>
        {fmt(grams)}<span className="text-sm font-medium ml-0.5">g</span>
      </p>
      <p className={`text-xs ${primary ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
        ≈ ${usd(grams, goldPricePerGram)} USD
      </p>
      <p className={`text-[10px] leading-snug mt-0.5 ${primary ? 'text-amber-700 dark:text-amber-300/80' : 'text-muted-foreground'}`}>{sub}</p>
    </div>
  );
}

export default function GoldOverviewCard({ ownership, goldPricePerGram }: GoldOverviewProps) {
  if (!ownership) return null;

  const mpgw = sp(ownership.mpgwAvailableGrams);
  const fpgw = sp(ownership.fpgwAvailableGrams);
  const bnsl = sp(ownership.lockedBnslGrams);
  const trade = sp(ownership.reservedTradeGrams);
  const total = sp(ownership.totalGoldGrams);

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5" data-testid="gold-overview-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-500" />
            Your Gold Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live breakdown of all your gold across the platform</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/40 border border-border/60 px-2 py-1 rounded-full">
          ${goldPricePerGram.toFixed(2)}/g
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tile
          icon={<Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          label="Available to Spend"
          sub="Send, trade, or lock a price today"
          grams={mpgw}
          goldPricePerGram={goldPricePerGram}
          accent="bg-amber-100 dark:bg-amber-900/30"
          bg="bg-amber-50 dark:bg-amber-950/20"
          border="border-amber-200 dark:border-amber-800/40"
          primary
          testId="tile-available-to-spend"
        />
        <Tile
          icon={<Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          label="Price-Locked"
          sub="Protected from drops, convertible back"
          grams={fpgw}
          goldPricePerGram={goldPricePerGram}
          accent="bg-blue-100 dark:bg-blue-900/30"
          bg="bg-blue-50 dark:bg-blue-950/20"
          border="border-blue-200 dark:border-blue-800/40"
          testId="tile-price-locked"
        />
        <Tile
          icon={<TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          label="In BNSL Plans"
          sub="Earning returns, releases at maturity"
          grams={bnsl}
          goldPricePerGram={goldPricePerGram}
          accent="bg-indigo-100 dark:bg-indigo-900/30"
          bg="bg-indigo-50 dark:bg-indigo-950/20"
          border="border-indigo-200 dark:border-indigo-800/40"
          testId="tile-bnsl-plans"
        />
        <Tile
          icon={<Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
          label="Trade Collateral"
          sub="Tied to active trade deals"
          grams={trade}
          goldPricePerGram={goldPricePerGram}
          accent="bg-teal-100 dark:bg-teal-900/30"
          bg="bg-teal-50 dark:bg-teal-950/20"
          border="border-teal-200 dark:border-teal-800/40"
          testId="tile-trade-collateral"
        />
        <Tile
          icon={<Database className="w-4 h-4 text-muted-foreground" />}
          label="Total in Vault"
          sub="All gold backing the above"
          grams={total}
          goldPricePerGram={goldPricePerGram}
          accent="bg-muted"
          bg="bg-muted/40"
          border="border-border"
          testId="tile-total-vault"
        />
      </div>
    </div>
  );
}
