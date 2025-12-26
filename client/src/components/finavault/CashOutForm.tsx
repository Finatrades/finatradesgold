import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, DollarSign, Building, AlertCircle, RefreshCw, CheckCircle2, Bitcoin, Clock, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useFees, FEE_KEYS } from '@/context/FeeContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface CashOutFormProps {
  vaultBalance?: number;
}

export default function CashOutForm({ vaultBalance = 0 }: CashOutFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getFeeValue } = useFees();
  const queryClient = useQueryClient();
  
  // Fetch live gold price
  const { data: goldPriceData } = useQuery({
    queryKey: ['gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price', { credentials: 'include' });
      if (!res.ok) return { pricePerGram: 145, priceChange24h: 0 };
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const goldPriceUsd = goldPriceData?.pricePerGram || 145;
  const priceChange24h = goldPriceData?.priceChange24h || 0;
  
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [amountGrams, setAmountGrams] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<'Bank Transfer' | 'Crypto'>('Bank Transfer');
  const [isLoading, setIsLoading] = useState(false);
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [bankCountry, setBankCountry] = useState('');
  
  // Crypto details
  const [cryptoNetwork, setCryptoNetwork] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  
  const [notes, setNotes] = useState('');

  const cashoutFeePercent = getFeeValue(FEE_KEYS.FINAVAULT_CASHOUT, 1.5);
  
  const grams = parseFloat(amountGrams) || 0;
  const grossAmount = grams * goldPriceUsd;
  const fee = grossAmount * (cashoutFeePercent / 100);
  const netAmount = grossAmount - fee;

  const handleProceed = () => {
    if (grams <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid weight to withdraw.", variant: "destructive" });
      return;
    }
    if (grams > vaultBalance) {
      toast({ title: "Insufficient Balance", description: `You only have ${vaultBalance.toFixed(3)}g available.`, variant: "destructive" });
      return;
    }
    
    // Validate method-specific fields
    if (withdrawalMethod === 'Bank Transfer') {
      if (!bankName || !accountName || !accountNumber) {
        toast({ title: "Missing Information", description: "Please fill in all bank details.", variant: "destructive" });
        return;
      }
    } else {
      if (!cryptoNetwork || !cryptoCurrency || !walletAddress) {
        toast({ title: "Missing Information", description: "Please fill in all crypto details.", variant: "destructive" });
        return;
      }
    }
    
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/vault/withdrawal', {
        userId: user.id,
        goldGrams: grams.toString(),
        goldPriceUsdPerGram: goldPriceUsd.toString(),
        withdrawalMethod,
        bankName: withdrawalMethod === 'Bank Transfer' ? bankName : null,
        accountName: withdrawalMethod === 'Bank Transfer' ? accountName : null,
        accountNumber: withdrawalMethod === 'Bank Transfer' ? accountNumber : null,
        iban: withdrawalMethod === 'Bank Transfer' ? iban : null,
        swiftCode: withdrawalMethod === 'Bank Transfer' ? swiftCode : null,
        bankCountry: withdrawalMethod === 'Bank Transfer' ? bankCountry : null,
        cryptoNetwork: withdrawalMethod === 'Crypto' ? cryptoNetwork : null,
        cryptoCurrency: withdrawalMethod === 'Crypto' ? cryptoCurrency : null,
        walletAddress: withdrawalMethod === 'Crypto' ? walletAddress : null,
        notes,
      });
      
      queryClient.invalidateQueries({ queryKey: ['vault-withdrawals'] });
      setStep('success');
      toast({
        title: "Withdrawal Request Submitted",
        description: `Your request to withdraw ${grams}g ($${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}) has been submitted for admin approval.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep('input');
    setAmountGrams('');
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setIban('');
    setSwiftCode('');
    setBankCountry('');
    setCryptoNetwork('');
    setCryptoCurrency('');
    setWalletAddress('');
    setNotes('');
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
                    Cash Out Gold
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Amount Input */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                       <Label className="text-foreground">Amount to Withdraw (Grams)</Label>
                       <span 
                         className="text-xs text-secondary cursor-pointer hover:underline" 
                         onClick={() => setAmountGrams(vaultBalance.toFixed(3))}
                       >
                         Max: {vaultBalance.toFixed(3)}g
                       </span>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="bg-background border-input text-foreground h-14 text-lg pl-4 pr-12 font-bold"
                        value={amountGrams}
                        onChange={(e) => setAmountGrams(e.target.value)}
                        data-testid="input-withdrawal-amount"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">g</div>
                    </div>
                    
                    {/* Insufficient Balance Warning */}
                    {grams > vaultBalance && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-sm text-red-700">
                          Insufficient balance. You only have <strong>{vaultBalance.toFixed(3)}g</strong> available.
                        </span>
                      </div>
                    )}
                    
                    {/* Live Conversion Preview */}
                    {grams > 0 && grams <= vaultBalance && (
                      <div className="p-4 bg-muted/30 border border-border rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                         <span className="text-muted-foreground text-sm">Estimated Value</span>
                         <span className="text-xl font-bold text-primary">${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  {/* Withdrawal Method */}
                  <div className="space-y-4">
                    <Label className="text-foreground">Withdrawal Method</Label>
                    <RadioGroup 
                      value={withdrawalMethod} 
                      onValueChange={(v) => setWithdrawalMethod(v as 'Bank Transfer' | 'Crypto')} 
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="Bank Transfer" id="bank" className="peer sr-only" />
                        <Label
                          htmlFor="bank"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border bg-muted/10 hover:bg-muted/30 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 text-foreground transition-all"
                        >
                          <Building className="w-6 h-6 mb-2" />
                          <span className="font-semibold">Bank Transfer</span>
                          <span className="text-xs text-muted-foreground mt-1">2-3 Business Days</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="Crypto" id="crypto" className="peer sr-only" />
                        <Label
                          htmlFor="crypto"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border bg-muted/10 hover:bg-muted/30 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 text-foreground transition-all"
                        >
                          <Bitcoin className="w-6 h-6 mb-2" />
                          <span className="font-semibold">Crypto</span>
                          <span className="text-xs text-muted-foreground mt-1">1-24 Hours</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator className="bg-border" />

                  {/* Method-specific fields */}
                  {withdrawalMethod === 'Bank Transfer' ? (
                    <div className="space-y-4">
                      <Label className="text-foreground font-medium">Bank Details</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Bank Name *</Label>
                          <Input 
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g. Emirates NBD"
                            data-testid="input-bank-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Account Name *</Label>
                          <Input 
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="Name on account"
                            data-testid="input-account-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Account Number *</Label>
                          <Input 
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Account number"
                            data-testid="input-account-number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">IBAN</Label>
                          <Input 
                            value={iban}
                            onChange={(e) => setIban(e.target.value)}
                            placeholder="IBAN (optional)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">SWIFT/BIC Code</Label>
                          <Input 
                            value={swiftCode}
                            onChange={(e) => setSwiftCode(e.target.value)}
                            placeholder="SWIFT code (optional)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Bank Country</Label>
                          <Input 
                            value={bankCountry}
                            onChange={(e) => setBankCountry(e.target.value)}
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Label className="text-foreground font-medium">Crypto Details</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Network *</Label>
                          <Input 
                            value={cryptoNetwork}
                            onChange={(e) => setCryptoNetwork(e.target.value)}
                            placeholder="e.g. Ethereum, Bitcoin, TRON"
                            data-testid="input-crypto-network"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Currency *</Label>
                          <Input 
                            value={cryptoCurrency}
                            onChange={(e) => setCryptoCurrency(e.target.value)}
                            placeholder="e.g. USDT, USDC, BTC"
                            data-testid="input-crypto-currency"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Wallet Address *</Label>
                        <Input 
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          placeholder="Your wallet address"
                          className="font-mono text-sm"
                          data-testid="input-wallet-address"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Notes (Optional)</Label>
                    <Textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes for your withdrawal..."
                      rows={2}
                    />
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex gap-3 items-start">
                    <Clock className="w-5 h-5 text-fuchsia-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-fuchsia-800">
                      <p className="font-medium">Admin Approval Required</p>
                      <p className="text-xs mt-1 opacity-80">Your withdrawal request will be reviewed by our team before processing.</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleProceed}
                    className="w-full h-12 bg-primary text-white hover:bg-primary/90 font-bold text-lg"
                    disabled={grams <= 0 || grams > vaultBalance}
                    data-testid="button-review-withdrawal"
                  >
                    Review Withdrawal Request
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
                   <CardTitle className="text-lg font-medium text-foreground">Confirm Withdrawal Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-fuchsia-700 text-sm flex gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>You are requesting to withdraw {grams}g of gold via {withdrawalMethod}. This request will be reviewed by our admin team.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Withdrawal Method</span>
                      <span className="text-foreground font-medium">{withdrawalMethod}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Weight</span>
                      <span className="text-foreground font-medium">{grams.toFixed(3)} g</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Gold Price</span>
                      <span className="text-foreground">${goldPriceUsd.toFixed(2)}/g</span>
                    </div>
                    <Separator className="bg-border" />
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Gross Amount</span>
                      <span className="text-foreground">${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Service Fee ({cashoutFeePercent}%)</span>
                      <span className="text-red-500">-${fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Separator className="bg-border" />
                    <div className="flex justify-between items-end">
                      <span className="text-foreground/80 font-medium">Net Payout</span>
                      <span className="text-2xl font-bold text-secondary">${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {withdrawalMethod === 'Bank Transfer' ? (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                      <p className="font-medium text-foreground">Bank Details</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Bank:</span><span className="text-foreground">{bankName}</span>
                        <span>Account:</span><span className="text-foreground">{accountName}</span>
                        <span>Number:</span><span className="text-foreground">{accountNumber}</span>
                        {iban && <><span>IBAN:</span><span className="text-foreground">{iban}</span></>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                      <p className="font-medium text-foreground">Crypto Details</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Network:</span><span className="text-foreground">{cryptoNetwork}</span>
                        <span>Currency:</span><span className="text-foreground">{cryptoCurrency}</span>
                        <span>Address:</span><span className="text-foreground font-mono text-xs break-all">{walletAddress}</span>
                      </div>
                    </div>
                  )}

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
                      className="flex-1 bg-primary text-white hover:bg-primary/90 font-bold h-12"
                      disabled={isLoading}
                      data-testid="button-submit-withdrawal"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                        </>
                      ) : (
                        'Submit Request'
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
              <h3 className="text-2xl font-bold text-foreground mb-2">Request Submitted!</h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Your withdrawal request for {grams}g of gold has been submitted. <br />
                <span className="text-secondary font-bold">${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> will be sent via {withdrawalMethod} once approved.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                <Clock className="w-4 h-4 inline mr-1" />
                Expected processing time: {withdrawalMethod === 'Bank Transfer' ? '2-3 business days' : '1-24 hours'}
              </p>
              <Button 
                onClick={reset}
                className="bg-muted hover:bg-muted/80 text-foreground font-medium px-8"
              >
                Make Another Request
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
                <span className="text-3xl font-bold text-foreground">${goldPriceUsd.toFixed(2)}</span>
                <span className="text-sm text-green-600 font-medium">/ gram</span>
              </div>
              <p className={`text-xs mt-1 flex items-center gap-1 ${priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`w-3 h-3 ${priceChange24h < 0 ? 'rotate-180' : ''}`} />
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(1)}% (24h)
              </p>
            </div>
            
            <Separator className="bg-secondary/20" />
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Vault Balance</span>
                <span className="text-foreground font-bold">{vaultBalance.toFixed(3)}g</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value (USD)</span>
                <span className="text-secondary font-bold">${(vaultBalance * goldPriceUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground leading-relaxed">
              <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
              All withdrawal requests require admin approval. Processing times vary by method.
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
