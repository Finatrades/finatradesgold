import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2,
  ArrowLeftRight, Landmark, CreditCard, Lock, Zap, Weight
} from 'lucide-react';

interface Wallet {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  requiresKyc?: boolean;
  requiresBusiness?: boolean;
}

const WALLETS: Wallet[] = [
  {
    id: 'bnsl',
    label: 'BNSL Wallet',
    sublabel: 'Gold Yield Plans escrow',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    border: 'border-teal-200 dark:border-teal-800/40',
  },
  {
    id: 'finabridge',
    label: 'FinaBridge Wallet',
    sublabel: 'Trade finance escrow',
    icon: <ArrowLeftRight className="w-4 h-4" />,
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    requiresBusiness: true,
  },
  {
    id: 'fpgw',
    label: 'Fixed Price Wallet',
    sublabel: 'Lock gold at today\'s price',
    icon: <Lock className="w-4 h-4" />,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  {
    id: 'finacard',
    label: 'FinaCard',
    sublabel: 'Gold-backed virtual card',
    icon: <CreditCard className="w-4 h-4" />,
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-800/40',
  },
];

interface InternalTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableGoldGrams: number;
  currentGoldPrice: number;
  isBusinessUser?: boolean;
}

export default function InternalTransferModal({
  open,
  onOpenChange,
  availableGoldGrams,
  currentGoldPrice,
  isBusinessUser = false,
}: InternalTransferModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * currentGoldPrice;
  const isAmountValid = amountNum > 0 && amountNum <= availableGoldGrams;

  const visibleWallets = WALLETS.filter(w => {
    if (w.requiresBusiness && !isBusinessUser) return false;
    return true;
  });

  function reset() {
    setStep(1);
    setSelectedWallet(null);
    setAmount('');
    setIsDone(false);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  async function handleTransfer() {
    if (!user?.id || !selectedWallet || !isAmountValid) return;
    setIsSubmitting(true);
    try {
      if (selectedWallet === 'bnsl') {
        await apiRequest('POST', '/api/bnsl/wallet/transfer', {
          userId: user.id,
          goldGrams: amountNum.toFixed(6),
        });
      } else if (selectedWallet === 'finabridge') {
        await apiRequest('POST', `/api/finabridge/wallet/${user.id}/fund`, {
          amountGrams: amountNum.toFixed(6),
          goldPricePerGram: currentGoldPrice.toFixed(6),
        });
      } else if (selectedWallet === 'fpgw') {
        await apiRequest('POST', '/api/dual-wallet/transfer', {
          userId: user.id,
          goldGrams: amountNum,
          fromWalletType: 'LGPW',
          toWalletType: 'FGPW',
        });
      } else if (selectedWallet === 'finacard') {
        await apiRequest('POST', '/api/finacard/fund', {
          goldGrams: amountNum.toFixed(6),
          goldPricePerGram: currentGoldPrice.toFixed(6),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['dual-wallet'] });
      setIsDone(true);
    } catch (err: any) {
      toast({
        title: 'Transfer failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selected = WALLETS.find(w => w.id === selectedWallet);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div
          className="relative p-5 pb-4"
          style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 60%, #7c3aed 100%)' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-card/15 flex items-center justify-center border border-white/20">
                <ArrowLeftRight className="w-4 h-4 text-violet-200" />
              </div>
              <div>
                <DialogTitle className="text-white font-extrabold text-[15px] leading-tight">
                  Internal Transfer
                </DialogTitle>
                <p className="text-violet-200/80 text-[10px] mt-0.5">From FinaPay wallet</p>
              </div>
            </div>
            {!isDone && (
              <span className="text-[10px] text-violet-200/70 font-semibold">Step {step} of 2</span>
            )}
          </div>

          {!isDone && (
            <div className="relative z-10 flex gap-1.5 mt-4">
              {[1, 2].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-violet-300' : 'bg-card/20'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 bg-card">

          {/* Available balance pill */}
          {!isDone && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950/20 rounded-lg border border-slate-100 mb-4">
              <Weight className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] text-slate-500">Available:</span>
              <span className="text-[11px] font-extrabold text-slate-700">{availableGoldGrams.toFixed(4)}g</span>
              <span className="text-[10px] text-slate-400 ml-1">≈ ${(availableGoldGrams * currentGoldPrice).toFixed(2)}</span>
            </div>
          )}

          {/* DONE */}
          {isDone && (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-[16px]">Transfer Complete!</p>
                <p className="text-[12px] text-slate-500 mt-1">
                  <span className="font-bold text-slate-700">{amountNum.toFixed(4)}g</span> sent to{' '}
                  <span className="font-bold text-slate-700">{selected?.label}</span>
                </p>
              </div>
              <Button onClick={handleClose} className="w-full bg-violet-700 hover:bg-violet-800 text-[13px] h-10">
                Done
              </Button>
            </div>
          )}

          {/* STEP 1: Pick destination */}
          {!isDone && step === 1 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Select destination wallet</p>
              {visibleWallets.map(wallet => (
                <button
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left ${
                    selectedWallet === wallet.id
                      ? `${wallet.bg} ${wallet.border} border-2`
                      : 'bg-card border-slate-200 dark:border-slate-800/40 hover:border-slate-300'
                  }`}
                  data-testid={`option-transfer-${wallet.id}`}
                >
                  <div className={`w-8 h-8 rounded-lg ${wallet.bg} ${wallet.color} flex items-center justify-center shrink-0 border ${wallet.border}`}>
                    {wallet.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold ${selectedWallet === wallet.id ? wallet.color : 'text-slate-800'}`}>
                      {wallet.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{wallet.sublabel}</p>
                  </div>
                  {selectedWallet === wallet.id && (
                    <div className={`w-4 h-4 rounded-full ${wallet.bg} ${wallet.color} flex items-center justify-center border ${wallet.border}`}>
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                  )}
                </button>
              ))}

              <Button
                onClick={() => setStep(2)}
                disabled={!selectedWallet}
                className="w-full bg-violet-700 hover:bg-violet-800 text-[13px] h-10 font-bold mt-1"
                data-testid="button-transfer-next"
              >
                Next: Enter Amount <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* STEP 2: Enter amount */}
          {!isDone && step === 2 && selected && (
            <div className="space-y-4">
              {/* Destination reminder */}
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${selected.bg} border ${selected.border}`}>
                <div className={`w-7 h-7 rounded-lg ${selected.bg} ${selected.color} flex items-center justify-center border ${selected.border}`}>
                  {selected.icon}
                </div>
                <div>
                  <p className={`text-[12px] font-bold ${selected.color}`}>{selected.label}</p>
                  <p className="text-[10px] text-slate-500">{selected.sublabel}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-600">Amount (grams)</Label>
                  <button
                    onClick={() => setAmount(availableGoldGrams.toFixed(6))}
                    className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                    data-testid="button-transfer-max"
                  >
                    Use Max
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.000000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    step="0.000001"
                    min="0"
                    max={availableGoldGrams}
                    className="pr-8 text-[13px] h-10 font-semibold"
                    data-testid="input-transfer-amount"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-semibold">g</span>
                </div>

                {amountNum > 0 && (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] text-slate-400">≈ USD value</span>
                    <span className="text-[11px] font-bold text-slate-700">${usdValue.toFixed(2)}</span>
                  </div>
                )}

                {amountNum > availableGoldGrams && (
                  <p className="text-[10px] text-red-500 font-medium">Exceeds available balance</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 text-[12px] h-10"
                  data-testid="button-transfer-back"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={!isAmountValid || isSubmitting}
                  className="flex-1 bg-violet-700 hover:bg-violet-800 text-[13px] h-10 font-bold"
                  data-testid="button-transfer-confirm"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Sending…</>
                  ) : (
                    <>Transfer <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
