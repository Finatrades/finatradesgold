import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, TrendingUp, ArrowRight, Briefcase, Bell, Info } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <Card className="group relative p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[14px] text-gray-900">FinaPay Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center cursor-pointer hover:bg-emerald-300 transition-colors">
                      <Info className="w-4 h-4 text-emerald-700" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-sm">
                    <p>Your liquid gold balance for payments & transfers.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link href="/finapay">
                <span className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        
          <div>
            <p className="text-[12px] text-gray-500 mb-0.5">Available Balance</p>
            <p className="text-[24px] font-bold text-gray-900">
              {Number(finaPayWallet.goldGrams).toFixed(2)} <span className="text-base text-gray-500">g</span>
            </p>
            <p className="text-[12px] text-gray-400">≈ ${Number(finaPayWallet.usdValue).toFixed(2)} USD</p>
          </div>
          
          <div className="flex justify-between pt-3 mt-3 border-t border-emerald-200">
            <div>
              <p className="text-[12px] text-gray-500">Pending</p>
              <p className="text-sm font-semibold text-emerald-600">{Number(finaPayWallet.pending || 0).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-gray-500">Transactions</p>
              <p className="text-sm font-semibold text-gray-900">{finaPayWallet.transactions || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      {isBusinessUser ? (
        <Card className="group relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-[14px] text-gray-900">FinaBridge</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center cursor-pointer hover:bg-blue-300 transition-colors">
                        <Info className="w-4 h-4 text-blue-700" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Gold held for trade finance settlements.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Link href="/finabridge">
                  <span className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer font-medium">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </div>
          
            <div>
              <p className="text-[12px] text-gray-500 mb-0.5">Available Balance</p>
              <p className="text-[24px] font-bold text-gray-900">
                {(finaBridgeData?.goldGrams || 0).toFixed(2)} <span className="text-base text-gray-500">g</span>
              </p>
              <p className="text-[12px] text-gray-400">≈ ${(finaBridgeData?.usdValue || 0).toFixed(2)} USD</p>
            </div>
            
            <div className="flex justify-between pt-3 mt-3 border-t border-blue-200">
              <div>
                <p className="text-[12px] text-gray-500">Active Cases</p>
                <p className="text-sm font-semibold text-blue-600">{finaBridgeData?.activeCases || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-gray-500">Trade Volume</p>
                <p className="text-sm font-semibold text-gray-900">${(finaBridgeData?.tradeVolume || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="group relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl shadow-sm opacity-75" data-testid="finacard-coming-soon">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-[14px] text-gray-500">FinaCard</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
                        <Info className="w-4 h-4 text-gray-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Gold-backed debit card. Spend your gold anywhere, anytime.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge className="bg-gray-200 text-gray-600 border-0 text-xs font-medium px-2 py-0.5">
                  Coming Soon
                </Badge>
              </div>
            </div>
          
            <div className="text-center py-3">
              <p className="text-gray-500 text-sm font-medium mb-4">Gold-backed debit card</p>
              <Button
                size="sm"
                variant="outline"
                className="border-violet-200 text-violet-600 hover:bg-violet-50 text-xs font-semibold"
                onClick={() => toast.success('You will be notified when FinaCard launches!')}
                data-testid="button-notify-finacard"
              >
                <Bell className="w-3 h-3 mr-1.5" />
                Notify Me
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="group relative p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl shadow-sm hover:shadow-md hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[14px] text-gray-900">BNSL Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center cursor-pointer hover:bg-violet-300 transition-colors">
                      <Info className="w-4 h-4 text-violet-700" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-sm">
                    <p>Gold locked in investment plans for returns.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link href="/bnsl">
                <span className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-0.5 cursor-pointer font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        
          <div>
            <p className="text-[12px] text-gray-500 mb-0.5">Available Balance</p>
            <p className="text-[24px] font-bold text-gray-900">
              {Number(bnslData.goldGrams).toFixed(2)} <span className="text-base text-gray-500">g</span>
            </p>
            <p className="text-[12px] text-gray-400">≈ ${Number(bnslData.usdValue).toFixed(2)} USD</p>
          </div>
          
          <div className="flex justify-between pt-3 mt-3 border-t border-violet-200">
            <div>
              <p className="text-[12px] text-gray-500">Locked</p>
              <p className="text-sm font-semibold text-violet-600">{Number(bnslData.lockedGrams).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-gray-500">Active Plans</p>
              <p className="text-sm font-semibold text-gray-900">{bnslData.activePlans}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
