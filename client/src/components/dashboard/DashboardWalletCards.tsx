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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* FinaPay Wallet */}
      <Card className="p-5 bg-white border border-gray-100 shadow-sm hover-lift glass-card fade-in stagger-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center pulse-glow">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-900">FinaPay Wallet</span>
          </div>
          <Link href="/finapay">
            <span className="text-sm text-purple-500 hover:text-purple-600 flex items-center gap-1 cursor-pointer btn-interactive rounded px-2 py-1">
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
          
          {/* MPGW/FPGW Dual Wallet Breakdown */}
          {(finaPayWallet.mpgwGrams || finaPayWallet.fpgwGrams) ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 bg-gradient-to-r from-purple-50 to-fuchsia-50 p-2 rounded-lg">
            <div>
              <p className="text-xs text-purple-500 font-medium">MPGW (Market)</p>
              <p className="text-sm font-bold text-gray-900">{(finaPayWallet.mpgwGrams || 0).toFixed(4)}g</p>
              <p className="text-xs text-gray-500">Live price</p>
            </div>
            <div>
              <p className="text-xs text-amber-500 font-medium">FPGW (Fixed)</p>
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
      </Card>

      {/* FinaCard (Personal) or FinaBridge (Business) */}
      {isBusinessUser ? (
        <Card className="p-5 bg-white border border-gray-100 shadow-sm hover-lift glass-card fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">FinaBridge Wallet</span>
            </div>
            <Link href="/finabridge">
              <span className="text-sm text-purple-500 hover:text-purple-600 flex items-center gap-1 cursor-pointer">
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
        </Card>
      ) : (
        <Card className="p-5 bg-white border border-gray-100 shadow-sm relative overflow-hidden hover-lift glass-card fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-fuchsia-600" />
              </div>
              <span className="font-semibold text-gray-900">FinaCard</span>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
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
        </Card>
      )}

      {/* BNSL Wallet */}
      <Card className="p-5 bg-white border border-gray-100 shadow-sm hover-lift glass-card fade-in stagger-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center float">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <span className="font-semibold text-gray-900">BNSL Wallet</span>
          </div>
          <Link href="/bnsl">
            <span className="text-sm text-purple-500 hover:text-purple-600 flex items-center gap-1 cursor-pointer btn-interactive rounded px-2 py-1">
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
      </Card>
    </div>
  );
}
