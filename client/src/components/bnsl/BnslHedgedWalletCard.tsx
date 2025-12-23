import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Lock, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Info, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

interface BnslPosition {
  id: string;
  depositUsd: string;
  entryPriceUsdPerGram: string;
  gramsLocked: string;
  gramsRemaining: string;
  status: string;
  depositNarration?: string;
  withdrawalNarration?: string;
  createdAt: string;
}

interface BnslWalletSummary {
  lockedGoldGrams: number;
  fixedPrincipalUsd: number;
  entryPriceWeightedAvg: number;
  currentPricePerGram: number;
  withdrawValueTodayUsd: number;
  unrealizedGainLossUsd: number;
  notice: string;
}

interface BnslHedgedWalletCardProps {
  finaPayBalanceGold: number;
  currentGoldPrice: number;
  onRefresh?: () => void;
}

export default function BnslHedgedWalletCard({ 
  finaPayBalanceGold, 
  currentGoldPrice,
  onRefresh
}: BnslHedgedWalletCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [summary, setSummary] = useState<BnslWalletSummary | null>(null);
  const [positions, setPositions] = useState<BnslPosition[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<BnslPosition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [summaryRes, positionsRes] = await Promise.all([
        fetch(`/api/bnsl/wallet/summary/${user.id}`),
        fetch(`/api/bnsl/positions/${user.id}`)
      ]);
      
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary);
      }
      
      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Failed to fetch BNSL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user?.id || !depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    const requiredGrams = amount / currentGoldPrice;
    if (requiredGrams > finaPayBalanceGold) {
      toast({ 
        title: "Insufficient Balance", 
        description: `You need ${requiredGrams.toFixed(4)}g but have ${finaPayBalanceGold.toFixed(4)}g in FinaPay.`, 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bnsl/hedged/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amount })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({ 
          title: data.narration?.title || "Gold Locked", 
          description: data.narration?.body || `Locked $${amount.toFixed(2)} worth of gold from FinaPay` 
        });
        setIsDepositModalOpen(false);
        setDepositAmount('');
        fetchData();
        onRefresh?.();
      } else {
        toast({ title: "Lock Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to lock gold", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (positionId: string, mode: 'FULL' | 'PARTIAL', amountGrams?: number) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/bnsl/hedged/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId, withdrawMode: mode, amountGrams })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({ 
          title: data.narration?.title || "Gold Unlocked", 
          description: data.narration?.body || `Gold unlocked to FinaPay successfully` 
        });
        setIsWithdrawModalOpen(false);
        setSelectedPosition(null);
        fetchData();
        onRefresh?.();
      } else {
        toast({ title: "Unlock Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to unlock gold", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const activePositions = positions.filter(p => p.status === 'Active' || p.status === 'PartiallyWithdrawn');
  const gainLoss = summary ? summary.unrealizedGainLossUsd : 0;
  const isProfit = gainLoss >= 0;

  if (loading) {
    return (
      <Card className="bg-white shadow-sm border border-border">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white shadow-sm border border-border overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Lock className="w-32 h-32 text-primary" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Lock className="w-5 h-5" />
              </div>
              BNSL Positions
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right border-r border-border pr-4">
                <p className="text-xs text-muted-foreground">FinaPay Available</p>
                <p className="font-bold text-primary">{finaPayBalanceGold.toFixed(4)} g</p>
              </div>
              <div className="flex gap-2">
                {activePositions.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10 font-bold"
                    onClick={() => setIsWithdrawModalOpen(true)}
                    data-testid="button-bnsl-withdraw"
                  >
                    <ArrowDownToLine className="w-4 h-4 mr-2" /> Unlock to FinaPay
                  </Button>
                )}
                <Button 
                  size="sm" 
                  className="bg-primary text-white hover:bg-primary/90 font-bold"
                  onClick={() => setIsDepositModalOpen(true)}
                  data-testid="button-bnsl-deposit"
                >
                  <Lock className="w-4 h-4 mr-2" /> Lock from FinaPay
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-800">
                <strong>Lock gold from your FinaPay wallet</strong> at today's price. When you unlock, 
                gold returns to FinaPay at current market price. Simple and direct.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Locked Gold</p>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-foreground">
                  {summary?.lockedGoldGrams.toFixed(4) || '0.0000'} g
                </span>
                <p className="text-xs text-muted-foreground">
                  Entry Price: ${summary?.entryPriceWeightedAvg.toFixed(2) || '0.00'}/g
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Fixed Principal (USD)</p>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-purple-600">
                  ${summary?.fixedPrincipalUsd.toFixed(2) || '0.00'}
                </span>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Based on entry price (constant)
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Withdraw Value Today</p>
              <div className="space-y-1">
                <span className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                  ${summary?.withdrawValueTodayUsd.toFixed(2) || '0.00'}
                </span>
                <div className="flex items-center gap-2">
                  {isProfit ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                    {isProfit ? '+' : ''}{gainLoss.toFixed(2)} USD
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: ${currentGoldPrice.toFixed(2)}/g
                </p>
              </div>
            </div>
          </div>

          {activePositions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">Active Positions</h4>
              <div className="space-y-2">
                {activePositions.map((position) => {
                  const entryPrice = parseFloat(position.entryPriceUsdPerGram);
                  const gramsRemaining = parseFloat(position.gramsRemaining);
                  const currentValue = gramsRemaining * currentGoldPrice;
                  const entryValue = gramsRemaining * entryPrice;
                  const positionGainLoss = currentValue - entryValue;
                  
                  return (
                    <div 
                      key={position.id}
                      className="bg-muted/50 border border-border rounded-lg p-3 hover:border-primary/50 transition-colors"
                      data-testid={`row-position-${position.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {gramsRemaining.toFixed(4)}g locked
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Entry: ${entryPrice.toFixed(2)}/g | Value: ${currentValue.toFixed(2)}
                            <span className={`ml-2 ${positionGainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              ({positionGainLoss >= 0 ? '+' : ''}{positionGainLoss.toFixed(2)})
                            </span>
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedPosition(position);
                            setIsWithdrawModalOpen(true);
                          }}
                          data-testid={`button-withdraw-position-${position.id}`}
                        >
                          Unlock
                        </Button>
                      </div>
                      {position.depositNarration && (
                        <p className="text-xs text-muted-foreground mt-2 italic border-t border-border pt-2">
                          {position.depositNarration}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
        <DialogContent className="bg-white border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Lock Gold from FinaPay</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Lock gold from your FinaPay wallet at today's price. Enter the USD value you want to lock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">FinaPay Gold Balance:</span>
                <span className="text-primary font-bold">{finaPayBalanceGold.toFixed(4)} g</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Gold Price:</span>
                <span className="text-foreground font-bold">${currentGoldPrice.toFixed(2)}/g</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input 
                type="number" 
                placeholder="Enter USD amount" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                data-testid="input-deposit-amount"
              />
              {depositAmount && !isNaN(parseFloat(depositAmount)) && (
                <p className="text-xs text-muted-foreground">
                  This will lock approximately <strong>{(parseFloat(depositAmount) / currentGoldPrice).toFixed(4)}g</strong> at entry price ${currentGoldPrice.toFixed(2)}/g
                </p>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Your grams will be locked at the current gold price (${currentGoldPrice.toFixed(2)}/g). 
                  When you withdraw, you'll receive value based on the gold price at that time.
                </p>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleDeposit}
              disabled={isProcessing || !depositAmount}
              data-testid="button-confirm-deposit"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isProcessing ? 'Processing...' : 'Lock Gold'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawModalOpen} onOpenChange={(open) => {
        setIsWithdrawModalOpen(open);
        if (!open) setSelectedPosition(null);
      }}>
        <DialogContent className="bg-white border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock Gold to FinaPay</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Unlock your gold and return it to your FinaPay wallet at today's market price.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPosition ? (
              <>
                <div className="p-4 bg-muted rounded-lg border border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Position Gold:</span>
                    <span className="text-foreground font-bold">{parseFloat(selectedPosition.gramsRemaining).toFixed(4)} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry Price:</span>
                    <span className="text-foreground font-bold">${parseFloat(selectedPosition.entryPriceUsdPerGram).toFixed(2)}/g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Price:</span>
                    <span className="text-foreground font-bold">${currentGoldPrice.toFixed(2)}/g</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="text-muted-foreground">Withdraw Value:</span>
                    <span className="text-green-600 font-bold">
                      ${(parseFloat(selectedPosition.gramsRemaining) * currentGoldPrice).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => handleWithdraw(selectedPosition.id, 'FULL')}
                  disabled={isProcessing}
                  data-testid="button-confirm-withdraw"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isProcessing ? 'Processing...' : 'Unlock to FinaPay'}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select a position to withdraw from:</p>
                {activePositions.map((position) => (
                  <div 
                    key={position.id}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedPosition(position)}
                    data-testid={`select-position-${position.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">{parseFloat(position.gramsRemaining).toFixed(4)}g</p>
                        <p className="text-xs text-muted-foreground">Entry: ${parseFloat(position.entryPriceUsdPerGram).toFixed(2)}/g</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          ${(parseFloat(position.gramsRemaining) * currentGoldPrice).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">today's value</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
