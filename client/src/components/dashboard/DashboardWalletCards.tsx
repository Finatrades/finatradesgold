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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* FinaPay Wallet - Modern Glassmorphism */}
      <Card className="group relative p-6 bg-white/80 backdrop-blur-xl border border-emerald-200/50 shadow-lg shadow-emerald-100/30 rounded-2xl hover:shadow-xl hover:shadow-emerald-100/50 hover:-translate-y-1 transition-all duration-300">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-emerald-200/40 to-green-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">FinaPay</span>
            </div>
            <Link href="/finapay">
              <span className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer font-semibold hover:bg-purple-50 rounded-lg px-3 py-1.5 transition-colors">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        
          <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-amber-600 animate-count gold-shimmer">
              {finaPayWallet.goldGrams.toFixed(4)}g
            </p>
            <p className="text-xs text-muted-foreground">≈ ${finaPayWallet.usdValue.toFixed(2)} <span className="text-[10px]">(Reference)</span></p>
          </div>
          
          {/* LGPW/FGPW Dual Wallet Breakdown */}
          {(finaPayWallet.mpgwGrams || finaPayWallet.fpgwGrams) ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 bg-gradient-to-r from-purple-50 to-fuchsia-50 p-2 rounded-lg">
            <div>
              <p className="text-xs text-purple-500 font-medium">LGPW (Market)</p>
              <p className="text-sm font-bold text-gray-900">{(finaPayWallet.mpgwGrams || 0).toFixed(4)}g</p>
              <p className="text-xs text-gray-500">Live price</p>
            </div>
            <div>
              <p className="text-xs text-amber-500 font-medium">FGPW (Fixed)</p>
              <p className="text-sm font-bold text-gray-900">{(finaPayWallet.fpgwGrams || 0).toFixed(4)}g</p>
              <p className="text-xs text-gray-500">Locked price</p>
            </div>
          </div>
          ) : null}
          
          <div className="flex justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-sm font-semibold text-purple-500">{(finaPayWallet.pending || 0).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="text-sm font-semibold text-gray-900">{finaPayWallet.transactions || 0}</p>
            </div>
          </div>
          </div>
        </div>
      </Card>

      {/* FinaCard (Personal) or FinaBridge (Business) - Modern Design */}
      {isBusinessUser ? (
        <Card className="group relative p-6 bg-white/80 backdrop-blur-xl border border-blue-200/50 shadow-lg shadow-blue-100/30 rounded-2xl hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-900">FinaBridge</span>
              </div>
              <Link href="/finabridge">
                <span className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer font-semibold hover:bg-purple-50 rounded-lg px-3 py-1.5 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-amber-600 gold-shimmer">
                  {(finaBridgeData?.goldGrams || 0).toFixed(4)}g
                </p>
                <p className="text-xs text-muted-foreground">≈ ${(finaBridgeData?.usdValue || 0).toFixed(2)} <span className="text-[10px]">(Reference)</span></p>
              </div>
            
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Active Cases</p>
                  <p className="text-sm font-semibold text-blue-600">{finaBridgeData?.activeCases || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Trade Volume</p>
                  <p className="text-sm font-semibold text-gray-900">${(finaBridgeData?.tradeVolume || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="group relative p-6 bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-lg shadow-purple-100/30 rounded-2xl hover:shadow-xl hover:shadow-purple-100/50 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-purple-200/40 to-fuchsia-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-900">FinaCard</span>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs font-semibold">
                Coming Soon
              </Badge>
            </div>
          
            <div className="space-y-3 opacity-60">
              <div>
                <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  $0.00
                </p>
                <p className="text-xs text-fuchsia-600 font-medium">~0.00g gold</p>
              </div>
            
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Card Status</p>
                  <p className="text-sm font-semibold text-red-500">Not Activated</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Rewards</p>
                  <p className="text-sm font-semibold text-gray-900">0 pts</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* BNSL Wallet - Modern Design */}
      <Card className="group relative p-6 bg-white/80 backdrop-blur-xl border border-amber-200/50 shadow-lg shadow-amber-100/30 rounded-2xl hover:shadow-xl hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">BNSL</span>
            </div>
            <Link href="/bnsl">
              <span className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer font-semibold hover:bg-purple-50 rounded-lg px-3 py-1.5 transition-colors">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-amber-600 animate-count gold-shimmer">
                {bnslData.goldGrams.toFixed(4)}g
              </p>
              <p className="text-xs text-muted-foreground">≈ ${bnslData.usdValue.toFixed(2)} <span className="text-[10px]">(Reference)</span></p>
            </div>
          
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Locked</p>
                <p className="text-sm font-semibold text-fuchsia-600">{bnslData.lockedGrams.toFixed(4)}g</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Active Plans</p>
                <p className="text-sm font-semibold text-gray-900">{bnslData.activePlans}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
