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
      {/* FinaPay Wallet - Compact Style */}
      <Card className="group relative p-4 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">FinaPay Wallet</span>
            </div>
            <Link href="/finapay">
              <span className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-0.5 cursor-pointer font-medium">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Available Balance</p>
            <p className="text-xl font-bold text-gray-900">
              {finaPayWallet.goldGrams.toFixed(2)} <span className="text-base text-gray-600">g</span>
            </p>
            <p className="text-xs text-muted-foreground">≈ ${finaPayWallet.usdValue.toFixed(2)} USD</p>
          </div>
          
          <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-sm font-semibold text-purple-600">{(finaPayWallet.pending || 0).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="text-sm font-semibold text-gray-900">{finaPayWallet.transactions || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* FinaCard (Personal) or FinaBridge (Business) - Compact Style */}
      {isBusinessUser ? (
        <Card className="group relative p-4 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-all duration-200">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">FinaBridge</span>
              </div>
              <Link href="/finabridge">
                <span className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-0.5 cursor-pointer font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Available Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {(finaBridgeData?.goldGrams || 0).toFixed(2)} <span className="text-base text-gray-600">g</span>
              </p>
              <p className="text-xs text-muted-foreground">≈ ${(finaBridgeData?.usdValue || 0).toFixed(2)} USD</p>
            </div>
            
            <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
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
        <Card className="group relative p-4 bg-white border border-pink-100 shadow-sm rounded-xl hover:shadow-md transition-all duration-200">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">FinaCard</span>
              </div>
              <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-200 text-xs font-medium px-2 py-0.5">
                Coming Soon
              </Badge>
            </div>
          
            <div className="opacity-60">
              <p className="text-xs text-gray-500 mb-0.5">Available Balance</p>
              <p className="text-xl font-bold text-gray-900">
                0.00 <span className="text-base text-gray-600">g</span>
              </p>
              <p className="text-xs text-muted-foreground">≈ $0.00 USD</p>
            </div>
            
            <div className="flex justify-between pt-3 mt-3 border-t border-gray-100 opacity-60">
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

      {/* BNSL Wallet - Compact Style */}
      <Card className="group relative p-4 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">BNSL Wallet</span>
            </div>
            <Link href="/bnsl">
              <span className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-0.5 cursor-pointer font-medium">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Available Balance</p>
            <p className="text-xl font-bold text-gray-900">
              {bnslData.goldGrams.toFixed(2)} <span className="text-base text-gray-600">g</span>
            </p>
            <p className="text-xs text-muted-foreground">≈ ${bnslData.usdValue.toFixed(2)} USD</p>
          </div>
          
          <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Locked</p>
              <p className="text-sm font-semibold text-fuchsia-600">{bnslData.lockedGrams.toFixed(2)}g</p>
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
