import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowRightLeft, Lock, ArrowDownLeft } from 'lucide-react';
import { FinaBridgeWallet } from '@/types/finabridge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface FinaBridgeWalletCardProps {
  wallet: FinaBridgeWallet;
  role: 'Importer' | 'Exporter';
  finaPayBalanceGold: number;
  onTransferFromFinaPay: (amount: number) => void;
}

export default function FinaBridgeWalletCard({ wallet, role, finaPayBalanceGold, onTransferFromFinaPay }: FinaBridgeWalletCardProps) {
  const { toast } = useToast();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  const currentWallet = role === 'Importer' ? wallet.importer : wallet.exporter;

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }
    if (amount > finaPayBalanceGold) {
      toast({ title: "Insufficient Balance", description: "Not enough gold in FinaPay wallet.", variant: "destructive" });
      return;
    }
    
    onTransferFromFinaPay(amount);
    setIsTransferModalOpen(false);
    setTransferAmount('');
    toast({ title: "Transfer Successful", description: `Transferred ${amount.toFixed(2)}g from FinaPay to FinaBridge Wallet.` });
  };

  return (
    <>
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32 text-[#D4AF37]" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <div className={`p-2 rounded-lg ${role === 'Importer' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              FinaBridge Wallet <span className="text-white/40 font-normal text-sm ml-1">({role})</span>
            </CardTitle>
            {role === 'Importer' && (
              <Button 
                size="sm" 
                className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
                onClick={() => setIsTransferModalOpen(true)}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer from FinaPay
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Available Balance */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Available Balance</p>
              <div className="text-2xl font-bold text-white">
                {currentWallet.availableGoldGrams.toFixed(3)} <span className="text-sm font-normal text-white/40">g</span>
              </div>
              <p className="text-[10px] text-white/40 mt-2">
                {role === 'Importer' 
                  ? "Funds available for locking in trade cases." 
                  : "Funds released to you, ready for withdrawal."}
              </p>
            </div>

            {/* Locked Funds */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">
                {role === 'Importer' ? "Locked in Trades" : "Incoming Locked Funds"}
              </p>
              <div className={`text-2xl font-bold ${role === 'Importer' ? 'text-amber-500' : 'text-blue-400'}`}>
                {role === 'Importer' 
                  ? currentWallet.lockedGoldGrams.toFixed(3) 
                  : currentWallet.incomingLockedGoldGrams?.toFixed(3)} <span className="text-sm font-normal text-white/40">g</span>
              </div>
              <p className="text-[10px] text-white/40 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {role === 'Importer' 
                  ? "Reserved as collateral for active trades." 
                  : "Reserved by importers. Not yet released."}
              </p>
            </div>

            {/* Pending / Total */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
               <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Total Value (Est.)</p>
               <div className="text-2xl font-bold text-[#D4AF37]">
                 ${((currentWallet.availableGoldGrams + (currentWallet.lockedGoldGrams || 0) + (currentWallet.incomingLockedGoldGrams || 0)) * 85.22).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
               </div>
               <p className="text-[10px] text-white/40 mt-2">
                 @ $85.22 / g
               </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="bg-[#1A0A2E] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transfer Gold from FinaPay</DialogTitle>
            <DialogDescription className="text-white/60">
              Move gold from your main FinaPay wallet to your Trade Finance wallet to fund trade cases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-white/60">Available in FinaPay:</span>
                 <span className="text-[#D4AF37] font-bold">{finaPayBalanceGold.toFixed(3)} g</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-white/60">Current Trade Wallet:</span>
                 <span className="text-white font-bold">{currentWallet.availableGoldGrams.toFixed(3)} g</span>
               </div>
             </div>

             <div className="space-y-2">
               <Label>Amount to Transfer (g)</Label>
               <div className="relative">
                 <Input 
                   type="number" 
                   placeholder="0.00" 
                   className="bg-black/20 border-white/10 pl-4 pr-12 text-lg"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                 />
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">g</span>
               </div>
             </div>

             <Button 
               className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold"
               onClick={handleTransfer}
             >
               Confirm Transfer
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
