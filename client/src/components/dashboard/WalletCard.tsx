import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

interface WalletCardProps {
  goldGrams?: number;
  usdBalance?: number;
  goldPrice?: number;
}

const USD_TO_AED = 3.67;

export default function WalletCard({ goldGrams = 0, usdBalance = 0, goldPrice = 85 }: WalletCardProps) {
  const goldValueUsd = goldGrams * goldPrice;
  const goldValueAed = goldValueUsd * USD_TO_AED;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 border border-transparent shadow-md relative overflow-hidden group text-white">
       <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-white/20 transition-colors duration-500" />

       <div className="relative z-10 flex flex-col h-full justify-between">
         <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">FinaPay Wallet</h3>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Available Balance</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
         </div>

         <div className="mb-8">
           <p className="text-3xl font-bold text-white mb-2" data-testid="text-wallet-gold-balance">
             {goldGrams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg text-white/80">g</span>
           </p>
           <div className="flex gap-4 text-sm text-white/70">
             <span data-testid="text-wallet-usd-value">≈ ${goldValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             <span>≈ AED {goldValueAed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
           </div>
           {usdBalance > 0 && (
             <p className="text-xs text-white/60 mt-1">+ ${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD cash</p>
           )}
         </div>

         <div className="flex gap-3">
           <Link href="/finapay?action=deposit" className="flex-1">
             <Button className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/10" data-testid="button-add-funds">
               <Plus className="w-4 h-4 mr-2" /> Add Funds
             </Button>
           </Link>
           <Link href="/finapay" className="flex-1">
             <Button className="w-full bg-white text-primary hover:bg-white/90" data-testid="button-open-wallet">
               Open Wallet <ArrowRight className="w-4 h-4 ml-2" />
             </Button>
           </Link>
         </div>
       </div>
    </Card>
  );
}
