import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, DollarSign, Wallet, Building, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Gold Price
const GOLD_PRICE_USD = 85.22;

export default function CashOutForm() {
  const { toast } = useToast();
  
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [selectedVault, setSelectedVault] = useState('Dubai Vault');
  const [amountGrams, setAmountGrams] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('finapay');
  const [isLoading, setIsLoading] = useState(false);

  // Derived values
  const grams = parseFloat(amountGrams) || 0;
  const grossAmount = grams * GOLD_PRICE_USD;
  const fee = grossAmount * 0.015; // 1.5% fee
  const netAmount = grossAmount - fee;

  const handleProceed = () => {
    if (grams <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid weight to sell.", variant: "destructive" });
      return;
    }
    if (grams > 1500) {
      toast({ title: "Insufficient Balance", description: "You only have 1,500g available.", variant: "destructive" });
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('success');
      toast({
        title: "Cash Out Successful",
        description: `Sold ${grams}g of gold for $${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      });
    }, 2000);
  };

  const reset = () => {
    setStep('input');
    setAmountGrams('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: Form */}
      <div className="lg:col-span-2 space-y-6">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <Card className="bg-white shadow-sm border border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-secondary" />
                    Sell Gold
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Vault Selection */}
                  <div className="space-y-2">
                    <Label className="text-foreground">Source Vault</Label>
                    <Select value={selectedVault} onValueChange={setSelectedVault}>
                      <SelectTrigger className="bg-background border-input text-foreground h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-foreground">
                        <SelectItem value="Dubai Vault">Dubai Vault (Available: 1,000.00g)</SelectItem>
                        <SelectItem value="Swiss Vault">Swiss Vault (Available: 500.00g)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                       <Label className="text-foreground">Amount to Sell (Grams)</Label>
                       <span className="text-xs text-secondary cursor-pointer hover:underline" onClick={() => setAmountGrams('1000')}>Max: 1,000.00g</span>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="bg-background border-input text-foreground h-14 text-lg pl-4 pr-12 font-bold"
                        value={amountGrams}
                        onChange={(e) => setAmountGrams(e.target.value)}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">g</div>
                    </div>
                    
                    {/* Live Conversion Preview */}
                    {grams > 0 && (
                      <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                         <span className="text-muted-foreground text-sm">Estimated Value</span>
                         <span className="text-xl font-bold text-secondary">${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  {/* Payout Method */}
                  <div className="space-y-4">
                    <Label className="text-foreground">Payout Method</Label>
                    <RadioGroup value={payoutMethod} onValueChange={setPayoutMethod} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <RadioGroupItem value="finapay" id="finapay" className="peer sr-only" />
                        <Label
                          htmlFor="finapay"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border bg-muted/10 hover:bg-muted/30 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary text-foreground transition-all"
                        >
                          <Wallet className="w-6 h-6 mb-2" />
                          <span className="font-semibold">FinaPay Wallet</span>
                          <span className="text-xs opacity-60 mt-1">Instant • No Fees</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                        <Label
                          htmlFor="bank"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border bg-muted/10 hover:bg-muted/30 cursor-pointer peer-data-[state=checked]:border-secondary peer-data-[state=checked]:text-secondary text-foreground transition-all"
                        >
                          <Building className="w-6 h-6 mb-2" />
                          <span className="font-semibold">Bank Transfer</span>
                          <span className="text-xs opacity-60 mt-1">2-3 Business Days</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button 
                    onClick={handleProceed}
                    className="w-full h-12 bg-secondary text-white hover:bg-secondary/90 font-bold text-lg"
                  >
                    Review Cash Out
                  </Button>

                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className="bg-white shadow-sm border border-border">
                <CardHeader>
                   <CardTitle className="text-lg font-medium text-foreground">Confirm Transaction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 text-sm flex gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>You are about to sell {grams}g of gold. This action cannot be undone. Funds will be credited to your {payoutMethod === 'finapay' ? 'FinaPay Wallet' : 'Bank Account'}.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Source</span>
                      <span className="text-foreground">{selectedVault}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Weight</span>
                      <span className="text-foreground font-medium">{grams.toFixed(2)} g</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Gold Price</span>
                      <span className="text-foreground">${GOLD_PRICE_USD}/g</span>
                    </div>
                    <Separator className="bg-border" />
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Gross Amount</span>
                      <span className="text-foreground">${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Service Fee (1.5%)</span>
                      <span className="text-red-500">-${fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="bg-border" />
                    <div className="flex justify-between items-end">
                      <span className="text-foreground/80 font-medium">Net Payout</span>
                      <span className="text-2xl font-bold text-secondary">${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('input')}
                      className="flex-1 border-border hover:bg-muted text-foreground h-12"
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleConfirm}
                      className="flex-1 bg-secondary text-white hover:bg-secondary/90 font-bold h-12"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...
                        </>
                      ) : (
                        'Confirm Sale'
                      )}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Transaction Successful!</h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                You have successfully sold {grams}g of gold. <br />
                <span className="text-secondary font-bold">${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> has been credited to your wallet.
              </p>
              <Button 
                onClick={reset}
                className="bg-muted hover:bg-muted/80 text-foreground font-medium px-8"
              >
                Make Another Transaction
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Market Info */}
      <div className="space-y-6">
        <Card className="bg-secondary/5 border-secondary/20 backdrop-blur-sm sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-secondary">Market Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Live Gold Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">${GOLD_PRICE_USD}</span>
                <span className="text-sm text-green-600 font-medium">/ gram</span>
              </div>
              <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <ArrowRight className="w-3 h-3 -rotate-45" /> +1.2% (24h)
              </p>
            </div>
            
            <Separator className="bg-secondary/20" />
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Buy Price</span>
                <span className="text-foreground font-medium">${(GOLD_PRICE_USD * 1.02).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sell Price</span>
                <span className="text-secondary font-bold">${GOLD_PRICE_USD.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3 bg-white/50 rounded text-xs text-muted-foreground leading-relaxed">
              <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
              Sell prices are updated every 60 seconds based on global spot rates. Final execution price may vary slightly.
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
