import React from 'react';
import { Banknote, Lock, Briefcase, Database, TrendingUp } from 'lucide-react';

interface GoldOverviewProps {
  ownership: Record<string, any> | null | undefined;
  goldPricePerGram: number;
}

function fmt(grams: number) {
  return grams.toFixed(4);
}

function usd(grams: number, price: number) {
  return (grams * price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function sp(val: any): number {
  const p = parseFloat(val);
  return isNaN(p) ? 0 : p;
}

interface TileProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  grams: number;
  usdValue: number;
  accent: string;
  bg: string;
  border: string;
  primary?: boolean;
  testId?: string;
}

function Tile({ icon, label, sub, grams, usdValue, accent, bg, border, primary, testId }: TileProps) {
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-1 ${bg} ${border} ${primary ? 'shadow-md' : ''}`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold ${primary ? 'text-amber-800' : 'text-gray-600'}`}>{label}</span>
      </div>
      <p className={`font-bold ${primary ? 'text-2xl text-amber-700' : 'text-lg text-gray-800'}`}>
        {fmt(grams)}<span className="text-sm font-medium ml-0.5">g</span>
      </p>
      <p className={`text-xs ${primary ? 'text-amber-600' : 'text-muted-foreground'}`}>
        ≈ ${usd(grams, usdValue)} USD
      </p>
      <p className={`text-[10px] leading-snug mt-0.5 ${primary ? 'text-amber-700/80' : 'text-gray-500'}`}>{sub}</p>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid="gold-overview-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-500" />
            Your Gold Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live breakdown of all your gold across the platform</p>
        </div>
        <span className="text-xs text-muted-foreground bg-gray-50 border border-gray-100 px-2 py-1 rounded-full">
          ${goldPricePerGram.toFixed(2)}/g
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tile
          icon={<Banknote className="w-4 h-4 text-amber-600" />}
          label="Available to Spend"
          sub="Send, trade, or lock a price today"
          grams={mpgw}
          usdValue={goldPricePerGram}
          accent="bg-amber-100"
          bg="bg-amber-50"
          border="border-amber-200"
          primary
          testId="tile-available-to-spend"
        />
        <Tile
          icon={<Lock className="w-4 h-4 text-blue-600" />}
          label="Price-Locked"
          sub="Protected from drops, convertible back"
          grams={fpgw}
          usdValue={goldPricePerGram}
          accent="bg-blue-100"
          bg="bg-blue-50"
          border="border-blue-200"
          testId="tile-price-locked"
        />
        <Tile
          icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
          label="In BNSL Plans"
          sub="Earning returns, releases at maturity"
          grams={bnsl}
          usdValue={goldPricePerGram}
          accent="bg-indigo-100"
          bg="bg-indigo-50"
          border="border-indigo-200"
          testId="tile-bnsl-plans"
        />
        <Tile
          icon={<Briefcase className="w-4 h-4 text-teal-600" />}
          label="Trade Collateral"
          sub="Tied to active trade deals"
          grams={trade}
          usdValue={goldPricePerGram}
          accent="bg-teal-100"
          bg="bg-teal-50"
          border="border-teal-200"
          testId="tile-trade-collateral"
        />
        <Tile
          icon={<Database className="w-4 h-4 text-gray-600" />}
          label="Total in Vault"
          sub="All gold backing the above"
          grams={total}
          usdValue={goldPricePerGram}
          accent="bg-gray-100"
          bg="bg-gray-50"
          border="border-gray-200"
          testId="tile-total-vault"
        />
      </div>
    </div>
  );
}
