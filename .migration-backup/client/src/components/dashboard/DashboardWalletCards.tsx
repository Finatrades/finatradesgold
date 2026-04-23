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
      <Card className="group relative p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 dark:border-emerald-800/40 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[14px] text-foreground">FinaPay Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center cursor-pointer hover:bg-emerald-300 transition-colors">
                      <Info className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-sm">
                    <p>Your liquid gold balance for payments & transfers.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link href="/finapay">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        
          <div>
            <p className="text-[12px] text-muted-foreground mb-0.5">Available Balance</p>
            <p className="text-[24px] font-bold text-foreground">
              {Number(finaPayWallet.goldGrams).toFixed(2)} <span className="text-base text-muted-foreground">g</span>
            </p>
            <p className="text-[12px] text-muted-foreground/70">≈ ${Number(finaPayWallet.usdValue).toFixed(2)} USD</p>
          </div>
          
          <div className="flex justify-between pt-3 mt-3 border-t border-emerald-200 dark:border-emerald-800/40">
            <div>
              <p className="text-[12px] text-muted-foreground">Pending</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{Number(finaPayWallet.pending || 0).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted-foreground">Transactions</p>
              <p className="text-sm font-semibold text-foreground">{finaPayWallet.transactions || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      {isBusinessUser ? (
        <Card className="group relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 dark:border-blue-800/40 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-[14px] text-foreground">FinaBridge</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center cursor-pointer hover:bg-blue-300 transition-colors">
                        <Info className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Gold held for trade finance settlements.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Link href="/finabridge">
                  <span className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center gap-0.5 cursor-pointer font-medium">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            </div>
          
            <div>
              <p className="text-[12px] text-muted-foreground mb-0.5">Available Balance</p>
              <p className="text-[24px] font-bold text-foreground">
                {(finaBridgeData?.goldGrams || 0).toFixed(2)} <span className="text-base text-muted-foreground">g</span>
              </p>
              <p className="text-[12px] text-muted-foreground/70">≈ ${(finaBridgeData?.usdValue || 0).toFixed(2)} USD</p>
            </div>
            
            <div className="flex justify-between pt-3 mt-3 border-t border-blue-200 dark:border-blue-800/40">
              <div>
                <p className="text-[12px] text-muted-foreground">Active Cases</p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{finaBridgeData?.activeCases || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-muted-foreground">Trade Volume</p>
                <p className="text-sm font-semibold text-foreground">${(finaBridgeData?.tradeVolume || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="group relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-border rounded-xl shadow-sm opacity-75" data-testid="finacard-coming-soon">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-[14px] text-muted-foreground">FinaCard</span>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px] text-sm">
                      <p>Gold-backed debit card. Spend your gold anywhere, anytime.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge className="bg-muted text-muted-foreground border-0 text-xs font-medium px-2 py-0.5">
                  Coming Soon
                </Badge>
              </div>
            </div>
          
            <div className="text-center py-3">
              <p className="text-muted-foreground text-sm font-medium mb-4">Gold-backed debit card</p>
              <Button
                size="sm"
                variant="outline"
                className="border-violet-200 dark:border-violet-800/40 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:bg-violet-950/20 text-xs font-semibold"
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

      <Card className="group relative p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 dark:border-violet-800/40 rounded-xl shadow-sm hover:shadow-md hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[14px] text-foreground">BNSL Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center cursor-pointer hover:bg-violet-300 transition-colors">
                      <Info className="w-4 h-4 text-violet-700 dark:text-violet-300" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-sm">
                    <p>Gold locked in investment plans for returns.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Link href="/bnsl">
                <span className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:text-violet-300 flex items-center gap-0.5 cursor-pointer font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        
          <div>
            <p className="text-[12px] text-muted-foreground mb-0.5">Available Balance</p>
            <p className="text-[24px] font-bold text-foreground">
              {Number(bnslData.goldGrams).toFixed(2)} <span className="text-base text-muted-foreground">g</span>
            </p>
            <p className="text-[12px] text-muted-foreground/70">≈ ${Number(bnslData.usdValue).toFixed(2)} USD</p>
          </div>
          
          <div className="flex justify-between pt-3 mt-3 border-t border-violet-200 dark:border-violet-800/40">
            <div>
              <p className="text-[12px] text-muted-foreground">Locked</p>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{Number(bnslData.lockedGrams).toFixed(2)}g</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted-foreground">Active Plans</p>
              <p className="text-sm font-semibold text-foreground">{bnslData.activePlans}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
