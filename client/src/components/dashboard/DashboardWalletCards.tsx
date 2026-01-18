import React from 'react';
import { Card } from '@/components/ui/card';
import { Wallet, CreditCard, TrendingUp, ArrowRight, Briefcase } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

interface WalletData {
  mpgwGrams?: number;
  fpgwGrams?: number;
  goldGrams: number;
  usdValue: number;
  pending?: number;
  transactions?: number;
}

interface BnslData {
  goldGrams: number;
  usdValue: number;
  lockedGrams: number;
  activePlans: number;
}

interface FinaBridgeData {
  goldGrams: number;
  usdValue: number;
  activeCases: number;
  tradeVolume: number;
}

interface DashboardWalletCardsProps {
  finaPayWallet: WalletData;
  bnslData: BnslData;
  finaBridgeData?: FinaBridgeData;
  userName?: string;
  isBusinessUser?: boolean;
}

export default function DashboardWalletCards({ 
  finaPayWallet, 
  bnslData,
  finaBridgeData,
  userName = 'User',
  isBusinessUser = false 
}: DashboardWalletCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* FinaPay Wallet - PhonePe Style */}
      <Card className="group relative p-7 bg-white/90 backdrop-blur-xl border border-emerald-200/50 shadow-lg shadow-emerald-100/30 rounded-3xl hover:shadow-xl hover:shadow-emerald-100/50 hover:-translate-y-1 transition-all duration-300">
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-emerald-200/40 to-green-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">FinaPay Wallet</span>
            </div>
            <Link href="/finapay">
              <span className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer font-semibold hover:bg-purple-50 rounded-xl px-4 py-2 transition-colors">
                View <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        
          <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-2 font-medium">Available Balance</p>
            <p className="text-4xl font-bold text-amber-600 animate-count gold-shimmer tracking-tight">
              {finaPayWallet.goldGrams.toFixed(4)}g
            </p>
            <p className="text-sm text-muted-foreground mt-1">≈ ${finaPayWallet.usdValue.toFixed(2)} USD</p>
          </div>
          
          {/* LGPW/FGPW Dual Wallet Breakdown */}
          {(finaPayWallet.mpgwGrams || finaPayWallet.fpgwGrams) ? (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 bg-gradient-to-r from-purple-50 to-fuchsia-50 p-3 rounded-xl">
            <div>
              <p className="text-sm text-purple-500 font-medium">LGPW (Market)</p>
              <p className="text-lg font-bold text-gray-900">{(finaPayWallet.mpgwGrams || 0).toFixed(4)}g</p>
              <p className="text-xs text-gray-500">Live price</p>
            </div>
            <div>
              <p className="text-sm text-amber-500 font-medium">FGPW (Fixed)</p>
              <p className="text-lg font-bold text-gray-900">{(finaPayWallet.fpgwGrams || 0).toFixed(4)}g</p>
              <p className="text-xs text-gray-500">Locked price</p>
            </div>
          </div>
          ) : null}
          
          <div className="flex justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending</p>
              <p className="text-lg font-semibold text-purple-500">{(finaPayWallet.pending || 0).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Transactions</p>
              <p className="text-lg font-semibold text-gray-900">{finaPayWallet.transactions || 0}</p>
            </div>
          </div>
          </div>
        </div>
      </Card>

      {/* FinaCard (Personal) or FinaBridge (Business) - PhonePe Style */}
      {isBusinessUser ? (
        <Card className="group relative p-7 bg-white/90 backdrop-blur-xl border border-blue-200/50 shadow-lg shadow-blue-100/30 rounded-3xl hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">FinaBridge</span>
              </div>
              <Link href="/finabridge">
                <span className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer font-semibold hover:bg-purple-50 rounded-xl px-4 py-2 transition-colors">
                  View <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">Available Balance</p>
                <p className="text-4xl font-bold text-amber-600 gold-shimmer tracking-tight">
                  {(finaBridgeData?.goldGrams || 0).toFixed(4)}g
                </p>
                <p className="text-sm text-muted-foreground mt-1">≈ ${(finaBridgeData?.usdValue || 0).toFixed(2)} USD</p>
              </div>
            
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Cases</p>
                  <p className="text-lg font-semibold text-blue-600">{finaBridgeData?.activeCases || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Trade Volume</p>
                  <p className="text-lg font-semibold text-gray-900">${(finaBridgeData?.tradeVolume || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="group relative p-7 bg-white/90 backdrop-blur-xl border border-pink-200/50 shadow-lg shadow-pink-100/30 rounded-3xl hover:shadow-xl hover:shadow-pink-100/50 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-pink-200/40 to-rose-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">FinaCard</span>
              </div>
              <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 text-sm font-semibold px-3 py-1">
                Coming Soon
              </Badge>
            </div>
          
            <div className="space-y-4 opacity-70">
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">Available Balance</p>
                <p className="text-4xl font-bold text-gray-900 tracking-tight">
                  0.00g
                </p>
                <p className="text-sm text-muted-foreground mt-1">≈ $0.00 USD</p>
              </div>
            
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Card Status</p>
                  <p className="text-lg font-semibold text-red-500">Not Activated</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Rewards</p>
                  <p className="text-lg font-semibold text-gray-900">0 pts</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* BNSL Wallet - PhonePe Style */}
      <Card className="group relative p-7 bg-white/90 backdrop-blur-xl border border-amber-200/50 shadow-lg shadow-amber-100/30 rounded-3xl hover:shadow-xl hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300">
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">BNSL Wallet</span>
            </div>
            <Link href="/bnsl">
              <span className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer font-semibold hover:bg-purple-50 rounded-xl px-4 py-2 transition-colors">
                View <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2 font-medium">Available Balance</p>
              <p className="text-4xl font-bold text-amber-600 animate-count gold-shimmer tracking-tight">
                {bnslData.goldGrams.toFixed(4)}g
              </p>
              <p className="text-sm text-muted-foreground mt-1">≈ ${bnslData.usdValue.toFixed(2)} USD</p>
            </div>
          
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">Locked</p>
                <p className="text-lg font-semibold text-fuchsia-600">{bnslData.lockedGrams.toFixed(4)}g</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Active Plans</p>
                <p className="text-lg font-semibold text-gray-900">{bnslData.activePlans}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
