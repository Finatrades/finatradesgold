import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, Lock, Info, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function BNSLTransferModal({ open, onClose, finaPayBalance, goldPrice, onContinue }) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const ozEquivalent = (amountNum / 31.1035).toFixed(4);
  const usdValue = (amountNum * goldPrice).toFixed(2);

  const handleContinue = async () => {
    if (amountNum <= 0 || amountNum > finaPayBalance) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    onContinue(amountNum);
    setIsLoading(false);
    setAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-[#0a0a1a] to-[#1a0a2e] border-[#D1A954]/30 shadow-[0_0_60px_rgba(209,169,84,0.1)]">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#D1A954] to-[#B8963E] flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-black" />
            </div>
            Transfer Gold to BNSL Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Source Balance */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-pink-400" />
                <span className="text-white/60 text-sm">FinaPay Available Balance</span>
              </div>
              <span className="text-white font-bold">{finaPayBalance.toFixed(3)} g</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-[#D1A954] text-sm mb-2 block font-medium">Amount to Lock (g)</label>
            <Input
              type="number"
              placeholder="0.000"
              max={finaPayBalance}
              step="0.001"
              className="h-14 bg-white/5 border-[#D1A954]/30 text-white text-2xl font-bold rounded-xl focus:border-[#D1A954] text-center"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amountNum > 0 && (
              <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                <span className="text-white/50">≈ {ozEquivalent} oz</span>
                <span className="text-[#D1A954]">≈ ${parseFloat(usdValue).toLocaleString()} USD (current market)</span>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-[#D1A954]/10 rounded-xl border border-[#D1A954]/20 flex gap-3">
            <Info className="w-5 h-5 text-[#D1A954] flex-shrink-0 mt-0.5" />
            <p className="text-white/70 text-sm leading-relaxed">
              This gold will be moved from your FinaPay Wallet to your BNSL Wallet and locked once you select and confirm a BNSL plan. 
              <strong className="text-[#D1A954]"> Locked gold cannot be sold, sent, or staked until maturity or early termination (with penalties).</strong>
            </p>
          </div>

          {/* Warning if amount exceeds balance */}
          {amountNum > finaPayBalance && (
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">Amount exceeds available balance</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 border border-white/20 text-white/70 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={isLoading || amountNum <= 0 || amountNum > finaPayBalance}
              className="flex-1 bg-gradient-to-r from-[#D1A954] to-[#B8963E] text-black font-bold hover:opacity-90"
            >
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
              Continue to Plan Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}