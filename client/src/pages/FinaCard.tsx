import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreditCard, Shield, Globe, Zap, ArrowDownToLine, ArrowUpFromLine, Wallet, History, Sparkles, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface FinacardTransfer {
  id: string;
  userId: string;
  type: 'fund' | 'withdraw';
  goldGrams: string;
  goldPriceUsdPerGram: string | null;
  usdEquivalent: string | null;
  note: string | null;
  createdAt: string;
}

export default function FinaCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const { data: goldPriceData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/gold-price');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const goldPrice = goldPriceData?.pricePerGram || 0;

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/finacard/balance', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finacard/balance/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const { data: transfersData } = useQuery<{ transfers: FinacardTransfer[] }>({
    queryKey: ['/api/finacard/transfers', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/finacard/transfers/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const fundMutation = useMutation({
    mutationFn: async (grams: number) => {
      const res = await apiRequest('POST', '/api/finacard/fund', { goldGrams: grams, goldPricePerGram: goldPrice });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fund FinaCard');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setFundAmount('');
      setShowFundDialog(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (grams: number) => {
      const res = await apiRequest('POST', '/api/finacard/withdraw', { goldGrams: grams, goldPricePerGram: goldPrice });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to withdraw from FinaCard');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finacard/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setWithdrawAmount('');
      setShowWithdrawDialog(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!user) return null;

  const finacardGrams = parseFloat(balanceData?.finacardGoldGrams || '0');
  const walletGrams = parseFloat(balanceData?.walletGoldGrams || '0');
  const finacardUsd = finacardGrams * goldPrice;
  const transfers = transfersData?.transfers || [];

  const fundAmountNum = parseFloat(fundAmount || '0');
  const withdrawAmountNum = parseFloat(withdrawAmount || '0');

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">

        {/* Card Visual + Balance */}
        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* Card Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-900 shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden border border-white/10 group hover:scale-[1.01] transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-pink-600" />
                  <span className="text-white font-bold tracking-tight">Finatrades</span>
                </div>
                <CreditCard className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-yellow-200 to-yellow-500 rounded-md opacity-80" />
                  <Zap className="w-6 h-6 text-white/50 rotate-90" />
                </div>
                <p className="font-mono text-xl md:text-2xl text-white tracking-widest">
                  •••• •••• •••• 9012
                </p>
                <div className="flex justify-between items-end text-white/90">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Card Holder</p>
                    <p className="font-medium tracking-wide uppercase text-sm">{user.firstName} {user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Expires</p>
                    <p className="font-medium tracking-wide text-sm">12/28</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-4 right-4 h-8 bg-black/15 blur-xl rounded-full" />
          </motion.div>

          {/* Balance + Actions */}
          <div className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-0 text-white rounded-2xl" data-testid="card-finacard-balance">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-white/60" />
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">FinaCard Balance</p>
              </div>
              <p className="text-4xl font-bold tracking-tight" data-testid="text-finacard-gold">
                {balanceLoading ? '...' : `${finacardGrams.toFixed(4)}g`}
              </p>
              <p className="text-white/50 text-sm mt-1" data-testid="text-finacard-usd">
                ≈ ${finacardUsd.toFixed(2)} USD
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-white/40 text-xs">
                <Wallet className="w-3 h-3" />
                <span>FinaPay Wallet: {walletGrams.toFixed(4)}g available</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowFundDialog(true)}
                className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
                disabled={walletGrams <= 0}
                data-testid="button-fund-finacard"
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Fund Card
              </Button>
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                className="h-14 bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold"
                disabled={finacardGrams <= 0}
                data-testid="button-withdraw-finacard"
              >
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                Return Gold
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center bg-blue-50 border-blue-200">
                <Globe className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <p className="text-[10px] font-medium text-blue-700">40M+ Merchants</p>
              </Card>
              <Card className="p-3 text-center bg-green-50 border-green-200">
                <Shield className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-[10px] font-medium text-green-700">Bank-Grade Security</p>
              </Card>
              <Card className="p-3 text-center bg-purple-50 border-purple-200">
                <Sparkles className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <p className="text-[10px] font-medium text-purple-700">0% FX Fee</p>
              </Card>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <Card className="p-6 border-dashed border-2 border-purple-200 bg-purple-50/30 rounded-2xl">
          <h3 className="font-bold text-lg text-gray-900 mb-4">How FinaCard Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-sm">1</div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Fund Your Card</p>
                <p className="text-xs text-gray-500 mt-0.5">Transfer gold from your FinaPay wallet to FinaCard. Gold is instantly available for spending.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-700 font-bold text-sm">2</div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Spend Anywhere</p>
                <p className="text-xs text-gray-500 mt-0.5">Use your card at any merchant worldwide. Gold is converted to local currency at spot price.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-purple-700 font-bold text-sm">3</div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Return Anytime</p>
                <p className="text-xs text-gray-500 mt-0.5">Don't need the balance? Move gold back to your FinaPay wallet instantly, no fees.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Transfer History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Transfer History
            </h3>
          </div>
          {transfers.length === 0 ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No transfers yet</p>
              <p className="text-gray-400 text-sm mt-1">Fund your FinaCard to start using it</p>
            </Card>
          ) : (
            <Card className="divide-y divide-gray-100 overflow-hidden">
              {transfers.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors" data-testid={`row-transfer-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.type === 'fund' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                      {t.type === 'fund' ? (
                        <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowUpFromLine className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {t.type === 'fund' ? 'Funded FinaCard' : 'Returned to Wallet'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${t.type === 'fund' ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {t.type === 'fund' ? '+' : '-'}{Number(t.goldGrams).toFixed(4)}g
                    </p>
                    {t.usdEquivalent && (
                      <p className="text-xs text-gray-400">≈ ${Number(t.usdEquivalent).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Fund Dialog */}
        <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                Fund FinaCard
              </DialogTitle>
              <DialogDescription>
                Transfer gold from your FinaPay wallet to your FinaCard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (grams)</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.001"
                  max={walletGrams}
                  placeholder="e.g. 1.0000"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  data-testid="input-fund-amount"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-gray-400">Available: {walletGrams.toFixed(4)}g</p>
                  <button
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    onClick={() => setFundAmount(walletGrams.toFixed(6))}
                    data-testid="button-fund-max"
                  >
                    Use Max
                  </button>
                </div>
              </div>
              {fundAmountNum > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gold to transfer</span>
                    <span className="font-medium">{fundAmountNum.toFixed(4)}g</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">≈ USD value</span>
                    <span className="font-medium">${(fundAmountNum * goldPrice).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFundDialog(false)}>Cancel</Button>
              <Button
                onClick={() => fundMutation.mutate(fundAmountNum)}
                disabled={fundAmountNum <= 0 || fundAmountNum > walletGrams || fundMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-confirm-fund"
              >
                {fundMutation.isPending ? 'Transferring...' : 'Fund FinaCard'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-orange-600" />
                Return Gold to Wallet
              </DialogTitle>
              <DialogDescription>
                Move gold from your FinaCard back to your FinaPay wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount (grams)</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.001"
                  max={finacardGrams}
                  placeholder="e.g. 1.0000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  data-testid="input-withdraw-amount"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-gray-400">FinaCard Balance: {finacardGrams.toFixed(4)}g</p>
                  <button
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    onClick={() => setWithdrawAmount(finacardGrams.toFixed(6))}
                    data-testid="button-withdraw-max"
                  >
                    Use Max
                  </button>
                </div>
              </div>
              {withdrawAmountNum > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gold to return</span>
                    <span className="font-medium">{withdrawAmountNum.toFixed(4)}g</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">≈ USD value</span>
                    <span className="font-medium">${(withdrawAmountNum * goldPrice).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
              <Button
                onClick={() => withdrawMutation.mutate(withdrawAmountNum)}
                disabled={withdrawAmountNum <= 0 || withdrawAmountNum > finacardGrams || withdrawMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-confirm-withdraw"
              >
                {withdrawMutation.isPending ? 'Transferring...' : 'Return to Wallet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
